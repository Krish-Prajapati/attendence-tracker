'use client';

import React, { useState } from 'react';
import { TextField, Button, MenuItem, Box, Typography, Container, FormControl, InputLabel, Select, Alert } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import { useAuth } from '@clerk/nextjs';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

const daysOfWeek = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const lectureTypes = [
  { value: 'Lecture', label: 'Lecture' },
  { value: 'Lab', label: 'Lab' },
  { value: 'Tutorial', label: 'Tutorial' },
];

export default function ScheduleLecturePage() {
  const [lecture, setLecture] = useState({
    subject: '',
    type: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { userId } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string | undefined; value: unknown }>) => {
    const { name, value } = e.target;
    setLecture({ ...lecture, [name as string]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!userId) {
      setError('User not authenticated.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lectures')
        .insert({
          user_id: userId,
          subject: lecture.subject,
          type: lecture.type,
          day_of_week: parseInt(lecture.day_of_week as string),
          start_time: lecture.start_time,
          end_time: lecture.end_time,
        });

      if (error) {
        throw error;
      }

      console.log('Lecture added:', data);
      alert('Lecture scheduled successfully!');
      router.push('/'); // Redirect to home or a dashboard after success
    } catch (err: unknown) {
      console.error('Error adding lecture:', err);
      setError((err as Error).message || 'Failed to add lecture.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Schedule Lecture
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Schedule a New Lecture
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            margin="normal"
            label="Subject"
            name="subject"
            value={lecture.subject}
            onChange={handleChange}
            required
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Type</InputLabel>
            <Select
              name="type"
              value={lecture.type}
              label="Type"
              onChange={handleChange}
            >
              {lectureTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Day of Week</InputLabel>
            <Select
              name="day_of_week"
              value={lecture.day_of_week}
              label="Day of Week"
              onChange={handleChange}
            >
              {daysOfWeek.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            label="Start Time"
            name="start_time"
            type="time"
            value={lecture.start_time}
            onChange={handleChange}
            InputLabelProps={{
              shrink: true,
            }}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="End Time"
            name="end_time"
            type="time"
            value={lecture.end_time}
            onChange={handleChange}
            InputLabelProps={{
              shrink: true,
            }}
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Lecture'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
