import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. The token is missing.');
        setLoading(false);
        return;
      }

      try {
        const response = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
        
        // Auto-login if token is provided
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Email verification failed. The link may have expired.');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left Side - Verification Status */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#fff',
        p: 4
      }}>
        <Box sx={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          {/* Logo */}
          <Box sx={{ 
            width: 56, 
            height: 56, 
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            mx: 'auto'
          }}>
            <Box sx={{ 
              width: 32, 
              height: 32, 
              borderRadius: '50%',
              border: '3px solid white',
              borderTopColor: 'transparent',
              transform: 'rotate(-45deg)'
            }} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 600, mb: 3, color: '#1f2937' }}>
            Email Verification
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={60} sx={{ color: '#0891b2' }} />
              <Typography variant="body1" sx={{ color: '#6b7280' }}>
                Verifying your email address...
              </Typography>
            </Box>
          )}

          {!loading && status === 'success' && (
            <>
              <Box sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%',
                bgcolor: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}>
                <CheckCircle size={48} color="#10b981" />
              </Box>
              
              <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
                {message}
              </Alert>

              <Typography variant="body1" sx={{ color: '#6b7280', mb: 3 }}>
                Redirecting you to your dashboard...
              </Typography>

              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate('/dashboard')}
                sx={{ 
                  py: 1.5,
                  mb: 2,
                  bgcolor: '#0891b2',
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 500,
                  boxShadow: 'none',
                  '&:hover': { 
                    bgcolor: '#0e7490',
                    boxShadow: 'none'
                  }
                }}
              >
                Go to Dashboard
              </Button>
            </>
          )}

          {!loading && status === 'error' && (
            <>
              <Box sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%',
                bgcolor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}>
                <XCircle size={48} color="#ef4444" />
              </Box>
              
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                {message}
              </Alert>

              <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
                The verification link may have expired or is invalid. You can request a new verification email from the login page.
              </Typography>

              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{ 
                  py: 1.5,
                  mb: 2,
                  bgcolor: '#0891b2',
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 500,
                  boxShadow: 'none',
                  '&:hover': { 
                    bgcolor: '#0e7490',
                    boxShadow: 'none'
                  }
                }}
              >
                Go to Login
              </Button>
            </>
          )}

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Need help?{' '}
              <Link 
                to="/forgot-password" 
                style={{ 
                  textDecoration: 'none', 
                  color: '#0891b2',
                  fontWeight: 500
                }}
              >
                Contact Support
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right Side - Hero Image */}
      <Box sx={{ 
        flex: 1,
        display: { xs: 'none', md: 'flex' },
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.9) 0%, rgba(6, 182, 212, 0.8) 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1557683316-973673baf926?w=1200)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
          zIndex: 0
        }
      }}>
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          textAlign: 'center',
          p: 6
        }}>
          <Typography variant="h2" sx={{ fontWeight: 700, mb: 2, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Welcome to Nexus Events
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: 500, opacity: 0.95, textShadow: '0 1px 2px rgba(0,0,0,0.3)', lineHeight: 1.6 }}>
            Your journey to amazing events starts here
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default VerifyEmail;
