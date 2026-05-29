import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField, Button, Typography, Box, Alert, Select, MenuItem, FormControl, Checkbox } from '@mui/material';
import api from '../services/api';
import PasswordField, { validatePassword } from '../components/PasswordField';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'attendee',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      
      // Show success message instead of auto-login
      setSuccess(response.data.message || 'Registration successful! Please check your email to verify your account.');
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'attendee',
      });
      setAgreedToTerms(false);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { state: { message: 'Please check your email to verify your account before logging in.' } });
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left Side - Hero Image */}
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
          backgroundImage: 'url(https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200)',
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
            Start Your Journey
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: 500, opacity: 0.95, textShadow: '0 1px 2px rgba(0,0,0,0.3)', lineHeight: 1.6 }}>
            Create unforgettable events or discover experiences that inspire you
          </Typography>
        </Box>
      </Box>

      {/* Right Side - Form */}
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
            Create your account
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 4 }}>
            Join our community of event enthusiasts
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#374151', fontWeight: 500 }}>
                Full name
              </Typography>
              <TextField
                required
                fullWidth
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
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
              <Typography variant="body2" sx={{ mb: 1, color: '#374151', fontWeight: 500 }}>
                Email address
              </Typography>
              <TextField
                required
                fullWidth
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
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
              <Typography variant="body2" sx={{ mb: 1, color: '#374151', fontWeight: 500 }}>
                I want to
              </Typography>
              <FormControl fullWidth>
                <Select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  sx={{
                    bgcolor: '#fff',
                    '& fieldset': { borderColor: '#d1d5db' },
                    '&:hover fieldset': { borderColor: '#9ca3af' },
                    '&.Mui-focused fieldset': { borderColor: '#0891b2' }
                  }}
                >
                  <MenuItem value="attendee">Attend events</MenuItem>
                  <MenuItem value="organizer">Organize events</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mb: 2 }}>
              <PasswordField
                label="Password"
                required
                fullWidth
                name="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                showStrength={true}
                showRequirements={true}
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
              <PasswordField
                label="Confirm Password"
                required
                fullWidth
                name="confirmPassword"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
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

            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <Checkbox 
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                sx={{ 
                  color: '#9ca3af', 
                  '&.Mui-checked': { color: '#0891b2' },
                  p: 0,
                  mr: 1
                }}
              />
              <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5 }}>
                I agree to the Terms of Service and Privacy Policy
              </Typography>
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
              {loading ? 'Creating account...' : 'Create account'}
            </Button>

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
              Sign up with Google
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  style={{ 
                    textDecoration: 'none', 
                    color: '#0891b2',
                    fontWeight: 500
                  }}
                >
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Register;
