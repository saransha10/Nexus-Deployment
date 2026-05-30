import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Button, Alert } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import api from '../services/api';

const RoleSelection = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
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
      await api.put('/auth/update-role',
        { role },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      user.role = role;
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role');
      setLoading(false);
    }
  };

  const roles = [
    {
      key: 'attendee',
      icon: <PersonOutlineIcon sx={{ fontSize: 28, color: 'inherit' }} />,
      title: 'Attendee',
      description: 'Browse and attend events, purchase tickets, and participate in live activities.',
      features: ['Discover events', 'Buy tickets', 'Join live Q&A & polls'],
    },
    {
      key: 'organizer',
      icon: <BusinessCenterOutlinedIcon sx={{ fontSize: 28, color: 'inherit' }} />,
      title: 'Organizer',
      description: 'Create and manage events, track analytics, and engage with your audience.',
      features: ['Create events', 'Manage attendees', 'View analytics'],
    },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left Side - Role Selection */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#fff',
        p: 4,
      }}>
        <Box sx={{ maxWidth: 480, width: '100%' }}>
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
          }}>
            <Box sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '3px solid white',
              borderTopColor: 'transparent',
              transform: 'rotate(-45deg)',
            }} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: '#1f2937' }}>
            Welcome, {user?.name?.split(' ')[0]}!
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 4 }}>
            How would you like to use Nexus Events?
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
            {roles.map((role) => (
              <Box
                key={role.key}
                onClick={() => !loading && setSelected(role.key)}
                sx={{
                  p: 3,
                  border: '2px solid',
                  borderColor: selected === role.key ? '#0891b2' : '#e5e7eb',
                  borderRadius: 2,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  bgcolor: selected === role.key ? '#f0fdfa' : 'white',
                  transition: 'all 0.2s ease',
                  '&:hover': loading ? {} : {
                    borderColor: '#0891b2',
                    bgcolor: '#f0fdfa',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: selected === role.key ? '#0891b2' : '#f3f4f6',
                    color: selected === role.key ? 'white' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}>
                    {role.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', fontSize: '1rem' }}>
                        {role.title}
                      </Typography>
                      {selected === role.key && (
                        <Box sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: '#0891b2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}>
                          ✓
                        </Box>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1.5, lineHeight: 1.5 }}>
                      {role.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {role.features.map((f) => (
                        <Box key={f} sx={{
                          px: 1.5,
                          py: 0.25,
                          bgcolor: selected === role.key ? '#cffafe' : '#f3f4f6',
                          borderRadius: 10,
                          fontSize: '0.75rem',
                          color: selected === role.key ? '#0e7490' : '#6b7280',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                        }}>
                          {f}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>

          <Button
            fullWidth
            variant="contained"
            disabled={!selected || loading}
            onClick={() => handleRoleSelect(selected)}
            sx={{
              py: 1.5,
              bgcolor: '#0891b2',
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#0e7490', boxShadow: 'none' },
              '&:disabled': { bgcolor: '#d1d5db', color: '#9ca3af' },
            }}
          >
            {loading ? 'Setting up your account...' : selected ? `Continue as ${selected.charAt(0).toUpperCase() + selected.slice(1)}` : 'Select a role to continue'}
          </Button>
        </Box>
      </Box>

      {/* Right Side - Hero */}
      <Box sx={{
        flex: 1,
        display: { xs: 'none', md: 'flex' },
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.9) 0%, rgba(6, 182, 212, 0.8) 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
          zIndex: 0,
        },
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
          p: 6,
        }}>
          <Typography variant="h2" sx={{ fontWeight: 700, mb: 2, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            Your Role,<br />Your Experience
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: 400, opacity: 0.95, textShadow: '0 1px 2px rgba(0,0,0,0.2)', lineHeight: 1.6 }}>
            Whether you're here to discover events or create them, Nexus has everything you need.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default RoleSelection;
