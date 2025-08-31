import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '../../../utils/supabase';
import { getAuth } from '@clerk/nextjs/server';

interface AttendanceRecordWithLecture {
  status: string;
  date: string;
  lectures: {
    id: string;
    subject: string;
    type: string;
  } | null;
}

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoISO = oneWeekAgo.toISOString().slice(0, 10);

    // Fetch attendance and lecture data
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        status,
        date,
        lectures (
          id,
          subject,
          type
        )
      `)
      .eq('user_id', userId)
      .gte('date', oneWeekAgoISO);

    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError);
      return new NextResponse(JSON.stringify({ error: attendanceError.message }), { status: 500 });
    }

    if (!attendanceData || attendanceData.length === 0) {
      return new NextResponse(JSON.stringify({ message: 'No attendance data for the last week.' }), { status: 200 });
    }

    // Aggregate data
    const aggregatedData: { [subject: string]: { [type: string]: { present: number; absent: number; totalLectures: number } } } = {};

    for (const record of attendanceData as AttendanceRecordWithLecture[]) {
      const lecture = record.lectures;
      if (lecture) {
        const subject = lecture.subject;
        const type = lecture.type;

        if (!aggregatedData[subject]) {
          aggregatedData[subject] = {};
        }
        if (!aggregatedData[subject][type]) {
          aggregatedData[subject][type] = { present: 0, absent: 0, totalLectures: 0 };
        }

        aggregatedData[subject][type].totalLectures++;
        if (record.status === 'Present') {
          aggregatedData[subject][type].present++;
        } else {
          aggregatedData[subject][type].absent++;
        }
      }
    }

    const report = Object.entries(aggregatedData).map(([subject, types]) => {
      return Object.entries(types).map(([type, data]) => {
        const attendanceScore = (data.present / data.totalLectures) * 100;
        // For 75% target, if totalLectures is 0, avoid division by zero.
        const lecturesNeededFor75 = data.totalLectures > 0 
          ? Math.max(0, Math.ceil(0.75 * data.totalLectures) - data.present)
          : 0;

        return {
          subject,
          type,
          present: data.present,
          absent: data.absent,
          totalLectures: data.totalLectures,
          attendanceScore: parseFloat(attendanceScore.toFixed(2)),
          lecturesNeededFor75: lecturesNeededFor75,
        };
      });
    }).flat();

    return NextResponse.json(report);

  } catch (error: unknown) {
    console.error('API Error:', error);
    return new NextResponse(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}

