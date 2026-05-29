import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { TextField, Button, Typography, Box, Checkbox, FormControlLabel } from '@mui/material';
import { Info } from 'lucide-react';
import api from '../services/api';
import PasswordField from '../components/PasswordField';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, showError, showInfo, showSuccess, hideToast } = useToast();

  useEffect(() => {
    // Show message from registration redirect
    if (location.state?.message) {
      showInfo(location.state.message);
    }
  }, [location, showInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowResendVerification(false);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { 
        email, 
        password,
        twoFactorCode: showTwoFactor ? twoFactorCode : undefined,
        rememberMe 
      });
      
      if (response.data.requires2FA) {
        setShowTwoFactor(true);
        setLoading(false);
        return;
      }
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.code === 'ERR_NETWORK' || !err.response) {
        showError('Cannot connect to server. Please check if the backend is running.');
      } else if (err.response?.status === 403 && err.response?.data?.requiresVerification) {
        showError(err.response?.data?.error || 'Please verify your email address before logging in.');
        setShowResendVerification(true);
      } else if (err.response?.status === 401) {
        showError(err.response?.data?.error || 'Invalid email or password');
      } else if (err.response?.status === 500) {
        showError('Server error. Please try again later.');
      } else {
        showError(err.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      showError('Please enter your email address');
      return;
    }

    setResendLoading(true);

    try {
      await api.post('/auth/resend-verification', { email });
      showSuccess('Verification email sent! Please check your inbox.');
      setShowResendVerification(false);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to resend verification email');
    } finally {
      setResendLoading(false);
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
            Welcome back
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 4 }}>
            Sign in to your account to continue
          </Typography>

          {showResendVerification && (
            <Box sx={{ 
              mb: 3, 
              p: 2.5, 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)'
            }}>
              <Typography variant="body2" sx={{ mb: 1.5, color: '#92400e', fontWeight: 500 }}>
                Haven't received the verification email?
              </Typography>
              <Button
                size="small"
                onClick={handleResendVerification}
                disabled={resendLoading}
                sx={{ 
                  textTransform: 'none',
                  color: '#d97706',
                  fontWeight: 600,
                  p: 0,
                  minWidth: 'auto',
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                }}
              >
                {resendLoading ? 'Sending...' : 'Resend verification email'}
              </Button>
            </Box>
          )}
          
          {showTwoFactor && (
            <Box sx={{ 
              mb: 3, 
              p: 2.5, 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}>
              <Info size={20} style={{ color: '#1e40af', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: '#1e40af', fontWeight: 500 }}>
                Please enter the 6-digit code from your authenticator app
              </Typography>
            </Box>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {!showTwoFactor ? (
              <>
                <Box sx={{ mb: 2 }}>
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
                
                <Box sx={{ mb: 2 }}>
                  <PasswordField
                    label="Password"
                    required
                    fullWidth
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={rememberMe} 
                        onChange={(e) => setRememberMe(e.target.checked)}
                        sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#0891b2' } }}
                      />
                    }
                    label={<Typography variant="body2" sx={{ color: '#6b7280' }}>Remember me</Typography>}
                  />
                  
                  <Button 
                    onClick={() => navigate('/forgot-password')}
                    sx={{ 
                      textTransform: 'none', 
                      color: '#0891b2',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                    }}
                  >
                    Forgot password?
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="6-Digit Code"
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="off"
                  autoFocus
                  inputProps={{ 
                    maxLength: 6,
                    style: { textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }
                  }}
                />
                
                <Button
                  onClick={() => setShowTwoFactor(false)}
                  sx={{ mt: 1, textTransform: 'none' }}
                >
                  ← Back to login
                </Button>
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || (showTwoFactor && twoFactorCode.length !== 6)}
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
              {loading ? 'Signing in...' : showTwoFactor ? 'Verify Code' : 'Sign in'}
            </Button>

            {!showTwoFactor && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ flexGrow: 1, height: '1px', bgcolor: '#e5e7eb' }} />
                  <Typography variant="body2" sx={{ px: 2, color: '#9ca3af', fontSize: '0.875rem' }}>
                    Or continue with
                  </Typography>
                  <Box sx={{ flexGrow: 1, height: '1px', bgcolor: '#e5e7eb' }} />
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => window.location.href = `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'}/api/auth/google`}
                  sx={{ 
                    py: 1.5,
                    mb: 3,
                    textTransform: 'none',
                    borderColor: '#e5e7eb',
                    color: '#374151',
                    fontSize: '1rem',
                    fontWeight: 500,
                    '&:hover': {
                      borderColor: '#d1d5db',
                      bgcolor: '#f9fafb',
                    }
                  }}
                  startIcon={
                    <svg width="20" height="20" viewBox="0 0 20 20">
                      <path fill="#4285F4" d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"/>
                      <path fill="#34A853" d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"/>
                      <path fill="#FBBC05" d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"/>
                      <path fill="#EA4335" d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"/>
                    </svg>
                  }
                >
                  Sign in with Google
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Don't have an account?{' '}
                    <Link 
                      to="/register" 
                      style={{ 
                        textDecoration: 'none', 
                        color: '#0891b2',
                        fontWeight: 500
                      }}
                    >
                      Sign up for free
                    </Link>
                  </Typography>
                </Box>
              </>
            )}
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
          backgroundImage: 'url(https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
          zIndex: 0
        }
      }}>
        <Box sx={{ 
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          textAlign: 'center',
          p: 6
        }}>
          <Typography variant="h2" sx={{ fontWeight: 700, mb: 2, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            Discover Amazing Events
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: 500, opacity: 0.95, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
            Join thousands of attendees and organizers creating memorable experiences
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

export default Login;
