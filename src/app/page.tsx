'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { SignInButton, UserButton, SignedIn, SignedOut, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CircularProgress, Alert } from '@mui/material';
import AttendancePrompt from '../components/AttendancePrompt';

interface Lecture {
  id: string;
  subject: string;
  type: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AttendanceRecord {
  id: string;
  lecture_id: string;
  status: string;
  date: string;
}

const daysOfWeekMap: { [key: number]: string } = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export default function Home() {
  const { userId, isLoaded } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && userId) {
      fetchLecturesAndAttendance();
    } else if (isLoaded && !userId) {
      setLoading(false);
    }
  }, [isLoaded, userId]);

  const fetchLecturesAndAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch lectures
      const { data: lectureData, error: lectureError } = await supabase
        .from('lectures')
        .select('*')
        .eq('user_id', userId);

      if (lectureError) {
        throw lectureError;
      }
      setLectures(lectureData || []);

      // Fetch attendance
      const { data: fetchedAttendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId);

      if (attendanceError) {
        throw attendanceError;
      }
      setAttendanceData(fetchedAttendance || []);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate attendance percentages and check for low attendance
  const lowAttendanceAlerts: { subject: string; type: string; percentage: string }[] = [];
  const lectureAttendance: { [key: string]: { present: number; total: number } } = {};

  lectures.forEach(lecture => {
    lectureAttendance[lecture.id] = { present: 0, total: 0 };
  });

  attendanceData.forEach(record => {
    if (lectureAttendance[record.lecture_id]) {
      lectureAttendance[record.lecture_id].total++;
      if (record.status === 'Present') {
        lectureAttendance[record.lecture_id].present++;
      }
    }
  });

  lectures.forEach(lecture => {
    const stats = lectureAttendance[lecture.id];
    if (stats && stats.total > 0) {
      const percentage = (stats.present / stats.total) * 100;
      if (percentage < 75) {
        lowAttendanceAlerts.push({
          subject: lecture.subject,
          type: lecture.type,
          percentage: percentage.toFixed(2),
        });
      }
    }
  });

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Attendance Tracker
          </Typography>
          <SignedOut>
            <SignInButton>
              <Button color="inherit">Login</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Button color="inherit" onClick={() => router.push('/schedule')}>
              Schedule Lecture
            </Button>
            <UserButton />
          </SignedIn>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to your Attendance Tracker!
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Get started by logging in or setting up your lecture schedule.
        </Typography>

        <SignedIn>
          {lowAttendanceAlerts.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="h6">Low Attendance Alert!</Typography>
              {lowAttendanceAlerts.map((alert, index) => (
                <Typography key={index} variant="body2">
                  {alert.subject} ({alert.type}): {alert.percentage}% attendance. Consider attending more classes!
                </Typography>
              ))}
            </Alert>
          )}

          <Typography variant="h5" component="h2" gutterBottom>
            Your Scheduled Lectures
          </Typography>
          {loading && <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}
          {error && <Alert severity="error">{error}</Alert>}
          {!loading && lectures.length === 0 && !error && (
            <Typography variant="body1">No lectures scheduled yet. <Link href="/schedule">Schedule one now!</Link></Typography>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {lectures.map((lecture) => (
              <Card key={lecture.id} sx={{ minWidth: 275 }}>
                <CardContent>
                  <Typography variant="h6" component="div">
                    {lecture.subject} ({lecture.type})
                  </Typography>
                  <Typography sx={{ mb: 1.5 }} color="text.secondary">
                    {daysOfWeekMap[lecture.day_of_week]} {lecture.start_time} - {lecture.end_time}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
          {/* Attendance Prompt */}
          {!loading && <AttendancePrompt lectures={lectures} />}
        </SignedIn>

        <SignedOut>
          <Typography variant="body1">Please login to view and manage your lectures.</Typography>
        </SignedOut>
      </Container>
    </Box>
  );
}
