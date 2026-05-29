import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const showToast = useCallback((message, severity = 'info') => {
    setToast({
      open: true,
      message,
      severity
    });
  }, []);

  const showSuccess = useCallback((message) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message) => {
    showToast(message, 'error');
  }, [showToast]);

  const showWarning = useCallback((message) => {
    showToast(message, 'warning');
  }, [showToast]);

  const showInfo = useCallback((message) => {
    showToast(message, 'info');
  }, [showToast]);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, open: false }));
  }, []);

  return {
    toast,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast
  };
};
