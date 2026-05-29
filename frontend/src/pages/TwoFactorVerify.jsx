import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, TextField, Button, Alert, Link as MuiLink } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import api from '../services/api';

function TwoFactorVerify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  
  const email = searchParams.get('email');
  const method = searchParams.get('method'); // 'password' or 'google'

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!code || (useBackupCode ? code.length !== 8 : code.length !== 6)) {
      setError(`Please enter a valid ${useBackupCode ? '8-character backup code' : '6-digit code'}`);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-2fa', { 
        email, 
        token: code,
        useBackupCode 
      });
      
      localStorage.setItem('token', response.data.token);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f9fafb' }}>
      <Box sx={{ maxWidth: 450, width: '100%', p: 4 }}>
        <Box sx={{ textAlign: 'center', bgcolor: 'white', p: 6, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#dbeafe', display: 'flex',
            alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
            <ShieldIcon sx={{ fontSize: 40, color: '#0891b2' }} />
          </Box>
          
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Two-Factor Authentication
          </Typography>
          <Typography sx={{ color: '#6b7280', mb: 4 }}>
            {method === 'google' 
              ? 'Google login detected. Enter your 2FA code to continue.'
              : 'Enter the code from your authenticator app'
            }
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              value={code}
              onChange={(e) => {
                const input = useBackupCode 
                  ? e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 8)
                  : e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(input);
              }}
              placeholder={useBackupCode ? "XXXXXXXX" : "000000"}
              inputProps={{ 
                maxLength: useBackupCode ? 8 : 6,
                style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
              }}
              sx={{ mb: 2 }}
            />

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <MuiLink
                component="button"
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setCode('');
                  setError('');
                }}
                sx={{ 
                  color: '#0891b2',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
              </MuiLink>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || (useBackupCode ? code.length !== 8 : code.length !== 6)}
              sx={{ 
                bgcolor: '#0891b2',
                textTransform: 'none',
                py: 1.5,
                fontSize: '1rem',
                '&:hover': { bgcolor: '#0e7490' }
              }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/login')}
              sx={{ textTransform: 'none', mt: 2, color: '#6b7280' }}
            >
              Back to Login
            </Button>
          </form>
        </Box>
      </Box>
    </Box>
  );
}

export default TwoFactorVerify;
