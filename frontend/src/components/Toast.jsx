import { Alert, Snackbar, Slide } from '@mui/material';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const SlideTransition = (props) => {
  return <Slide {...props} direction="down" />;
};

const Toast = ({ open, message, severity = 'info', onClose, autoHideDuration = 6000 }) => {
  const getIcon = () => {
    const iconProps = { size: 20, strokeWidth: 2.5 };
    switch (severity) {
      case 'success':
        return <CheckCircle {...iconProps} />;
      case 'error':
        return <XCircle {...iconProps} />;
      case 'warning':
        return <AlertTriangle {...iconProps} />;
      case 'info':
      default:
        return <Info {...iconProps} />;
    }
  };

  const getColors = () => {
    switch (severity) {
      case 'success':
        return {
          bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          border: '#059669',
          shadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
        };
      case 'error':
        return {
          bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          border: '#dc2626',
          shadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
        };
      case 'warning':
        return {
          bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          border: '#d97706',
          shadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
        };
      case 'info':
      default:
        return {
          bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          border: '#2563eb',
          shadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
        };
    }
  };

  const colors = getColors();

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      TransitionComponent={SlideTransition}
      sx={{ mt: 2 }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        icon={getIcon()}
        sx={{
          width: '100%',
          minWidth: '320px',
          maxWidth: '500px',
          background: colors.bg,
          color: 'white',
          border: `1px solid ${colors.border}`,
          boxShadow: colors.shadow,
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
          '& .MuiAlert-icon': {
            color: 'white',
            opacity: 1,
            display: 'flex',
            alignItems: 'center',
            mr: 1.5
          },
          '& .MuiAlert-message': {
            color: 'white',
            fontSize: '0.95rem',
            fontWeight: 500,
            py: 0.5
          },
          '& .MuiAlert-action': {
            color: 'white',
            pt: 0,
            '& .MuiIconButton-root': {
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.15)'
              }
            }
          }
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Toast;
