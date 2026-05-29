import { useState } from 'react';
import { 
  TextField, 
  InputAdornment, 
  IconButton, 
  Box, 
  Typography,
  LinearProgress,
  Chip
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

// Password strength validation
export const validatePassword = (password) => {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const score = Object.values(requirements).filter(Boolean).length;
  const strength = score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong';
  
  return {
    requirements,
    score,
    strength,
    isValid: score >= 4 // At least 4 out of 5 requirements
  };
};

const PasswordField = ({ 
  label = "Password",
  value,
  onChange,
  showStrength = false,
  showRequirements = false,
  error,
  helperText,
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const passwordValidation = validatePassword(value || '');

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const getStrengthColor = (strength) => {
    switch (strength) {
      case 'weak': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'strong': return '#10b981';
      default: return '#e5e7eb';
    }
  };

  const getStrengthText = (strength) => {
    switch (strength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      default: return 'Very Weak';
    }
  };

  return (
    <Box>
      <TextField
        {...props}
        label={label}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        error={error}
        helperText={helperText}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowPassword}
                edge="end"
                size="small"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      {showStrength && value && (
        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Password Strength
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: getStrengthColor(passwordValidation.strength),
                fontWeight: 600
              }}
            >
              {getStrengthText(passwordValidation.strength)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(passwordValidation.score / 5) * 100}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: '#e5e7eb',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getStrengthColor(passwordValidation.strength),
                borderRadius: 2,
              },
            }}
          />
        </Box>
      )}

      {showRequirements && value && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Password Requirements:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip
              label="8+ characters"
              size="small"
              color={passwordValidation.requirements.length ? 'success' : 'default'}
              variant={passwordValidation.requirements.length ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
            <Chip
              label="Uppercase (A-Z)"
              size="small"
              color={passwordValidation.requirements.uppercase ? 'success' : 'default'}
              variant={passwordValidation.requirements.uppercase ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
            <Chip
              label="Lowercase (a-z)"
              size="small"
              color={passwordValidation.requirements.lowercase ? 'success' : 'default'}
              variant={passwordValidation.requirements.lowercase ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
            <Chip
              label="Number (0-9)"
              size="small"
              color={passwordValidation.requirements.number ? 'success' : 'default'}
              variant={passwordValidation.requirements.number ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
            <Chip
              label="Special (!@#$%)"
              size="small"
              color={passwordValidation.requirements.special ? 'success' : 'default'}
              variant={passwordValidation.requirements.special ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PasswordField;