import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Typography, Box, Paper, Button, Card, CardContent, CardActions } from '@mui/material';
import { Person, Business } from '@mui/icons-material';
import api from '../services/api';

const RoleSelection = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const refreshToken = searchParams.get('refreshToken');
  const userStr = searchParams.get('user');

  if (!token || !userStr) {
    navigate('/login');
    return null;
  }

  const user = JSON.parse(decodeURIComponent(userStr));

  const handleRoleSelect = async (role) => {
    setLoading(true);
    setError('');

    try {
      // Update user role
      await api.put('/auth/update-role', 
        { role },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      // Update user object
      user.role = role;

      // Store tokens and user data
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 4
      }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Welcome to Nexus Events!
          </Typography>
          
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Please select your role to continue
          </Typography>

          {error && (
            <Typography color="error" align="center" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Card sx={{ width: 280, cursor: 'pointer', '&:hover': { boxShadow: 6 } }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Person sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Attendee
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Browse and attend events, purchase tickets, and participate in activities
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                <Button 
                  variant="contained" 
                  size="large"
                  disabled={loading}
                  onClick={() => handleRoleSelect('attendee')}
                >
                  {loading ? 'Selecting...' : 'Select Attendee'}
                </Button>
              </CardActions>
            </Card>

            <Card sx={{ width: 280, cursor: 'pointer', '&:hover': { boxShadow: 6 } }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Business sx={{ fontSize: 80, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Organizer
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create and manage events, track analytics, and engage with attendees
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                <Button 
                  variant="contained" 
                  size="large"
                  color="secondary"
                  disabled={loading}
                  onClick={() => handleRoleSelect('organizer')}
                >
                  {loading ? 'Selecting...' : 'Select Organizer'}
                </Button>
              </CardActions>
            </Card>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RoleSelection;
