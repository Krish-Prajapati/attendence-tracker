'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '@clerk/nextjs';
import { supabase } from '../utils/supabase';

interface Lecture {
  id: string;
  subject: string;
  type: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AttendancePromptProps {
  lectures: Lecture[];
}

const AttendancePrompt: React.FC<AttendancePromptProps> = ({ lectures }) => {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceRecorded, setAttendanceRecorded] = useState(false);

  useEffect(() => {
    const checkActiveLecture = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      const activeLecture = lectures.find((lecture) => {
        return (
          lecture.day_of_week === currentDay &&
          lecture.start_time <= currentTime &&
          lecture.end_time >= currentTime
        );
      });

      if (activeLecture && !attendanceRecorded) {
        setCurrentLecture(activeLecture);
        setOpen(true);
      } else if (!activeLecture) {
        setOpen(false);
        setCurrentLecture(null);
        setAttendanceRecorded(false); // Reset when no active lecture
      }
    };

    const interval = setInterval(checkActiveLecture, 60000); // Check every minute
    checkActiveLecture(); // Initial check

    return () => clearInterval(interval);
  }, [lectures, attendanceRecorded]);

  const handleRecordAttendance = async (status: 'Present' | 'Absent') => {
    if (!currentLecture || !userId) return;

    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      // Check if attendance already recorded for this lecture today
      const { data: existingAttendance, error: fetchError } = await supabase
        .from('attendance')
        .select('id')
        .eq('lecture_id', currentLecture.id)
        .eq('user_id', userId)
        .eq('date', today);

      if (fetchError) {
        throw fetchError;
      }

      if (existingAttendance && existingAttendance.length > 0) {
        // Attendance already recorded, update it
        const { error } = await supabase
          .from('attendance')
          .update({ status: status })
          .eq('id', existingAttendance[0].id);
        if (error) throw error;
      } else {
        // Insert new attendance record
        const { error } = await supabase.from('attendance').insert({
          lecture_id: currentLecture.id,
          user_id: userId,
          date: today,
          status: status,
        });
        if (error) throw error;
      }

      setAttendanceRecorded(true);
      setOpen(false);
      alert(`Attendance recorded as ${status} for ${currentLecture.subject}`);
    } catch (err: any) {
      console.error('Error recording attendance:', err);
      setError(err.message || 'Failed to record attendance.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentLecture || !open) return null;

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>Lecture in Progress!</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="h6" gutterBottom>
          {currentLecture.subject} ({currentLecture.type})
        </Typography>
        <Typography variant="body1">
          {`Time: ${currentLecture.start_time} - ${currentLecture.end_time}`}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Please mark your attendance:
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleRecordAttendance('Absent')} color="secondary" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Absent'}
        </Button>
        <Button onClick={() => handleRecordAttendance('Present')} color="primary" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Present'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AttendancePrompt;

