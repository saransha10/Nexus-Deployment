import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button, Typography, Box } from '@mui/material';
import api from '../services/api';
import PasswordField from '../components/PasswordField';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, password });
      setResetSuccess(true);
      showSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Left Side - Error Message */}
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
              Invalid Reset Link
            </Typography>
            <Typography variant="body1" sx={{ color: '#6b7280', mb: 3 }}>
              Invalid or missing reset token. The link may have expired or is incorrect.
            </Typography>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
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
  }

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
            Reset Password
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 4 }}>
            Enter your new password below
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#374151', fontWeight: 500 }}>
                New Password
              </Typography>
              <PasswordField
                required
                fullWidth
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showStrength={true}
                showRequirements={true}
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

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#374151', fontWeight: 500 }}>
                Confirm Password
              </Typography>
              <PasswordField
                required
                fullWidth
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              disabled={loading || resetSuccess}
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
              {loading ? 'Resetting...' : 'Reset Password'}
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

      {/* Toast Notification */}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </Box>
  );
};

export default ResetPassword;
