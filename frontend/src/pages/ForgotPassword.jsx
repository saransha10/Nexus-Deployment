import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField, Button, Typography, Box, Alert } from '@mui/material';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('Password reset link has been sent to your email address.');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left Side - Form */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#fff',
        p: 4
      }}>
        <Box sx={{ maxWidth: 420, width: '100%' }}>
          {/* Logo */}
          <Box sx={{ 
            width: 56, 
            height: 56, 
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3
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

          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: '#1f2937' }}>
            Forgot Password?
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 4 }}>
            Enter your email address and we'll send you a link to reset your password
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#374151', fontWeight: 500 }}>
                Email address
              </Typography>
              <TextField
                required
                fullWidth
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#fff',
                    '& fieldset': { borderColor: '#d1d5db' },
                    '&:hover fieldset': { borderColor: '#9ca3af' },
                    '&.Mui-focused fieldset': { borderColor: '#0891b2' }
                  }
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ 
                py: 1.5,
                mb: 3,
                bgcolor: '#0891b2',
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                boxShadow: 'none',
                '&:hover': { 
                  bgcolor: '#0e7490',
                  boxShadow: 'none'
                },
                '&:disabled': {
                  bgcolor: '#d1d5db',
                  color: '#9ca3af'
                }
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Remember your password?{' '}
                <Link 
                  to="/login" 
                  style={{ 
                    textDecoration: 'none', 
                    color: '#0891b2',
                    fontWeight: 500
                  }}
                >
                  Back to Login
                </Link>
              </Typography>
            </Box>
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
            Reset Your Password
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: 500, opacity: 0.95, textShadow: '0 1px 2px rgba(0,0,0,0.3)', lineHeight: 1.6 }}>
            We'll help you get back to creating and discovering amazing events
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
