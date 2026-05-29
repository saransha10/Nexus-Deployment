import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Box, CircularProgress, Typography } from '@mui/material';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const userStr = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login?error=' + error);
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        
        // Store tokens and user data
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(user));
        
        // Redirect to dashboard
        navigate('/dashboard');
      } catch (err) {
        console.error('Failed to parse user data:', err);
        navigate('/login?error=invalid_data');
      }
    } else {
      navigate('/login?error=missing_data');
    }
  }, [searchParams, navigate]);

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6">
          Completing Google Sign In...
        </Typography>
      </Box>
    </Container>
  );
};

export default AuthCallback;
