import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import api from '../services/api';

function PaymentVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [message, setMessage] = useState('Verifying your payment...');
  const [details, setDetails] = useState(null);

  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      // Restore token from temporary storage if it was cleared
      const tempToken = localStorage.getItem('khalti_temp_token');
      const tempRefresh = localStorage.getItem('khalti_temp_refresh');
      const tempUser = localStorage.getItem('khalti_temp_user');
      
      if (tempToken && !localStorage.getItem('token')) {
        localStorage.setItem('token', tempToken);
        if (tempRefresh) localStorage.setItem('refreshToken', tempRefresh);
        if (tempUser) localStorage.setItem('user', tempUser);
        
        // Clean up temp storage
        localStorage.removeItem('khalti_temp_token');
        localStorage.removeItem('khalti_temp_refresh');
        localStorage.removeItem('khalti_temp_user');
      }
      
      // Get parameters from URL (sent by backend after verification)
      const urlStatus = searchParams.get('status');
      const pidx = searchParams.get('pidx');
      const transaction_id = searchParams.get('transaction_id');
      const amount = searchParams.get('amount');
      const purchase_order_id = searchParams.get('purchase_order_id');
      const error = searchParams.get('error');

      // Debug: log all URL params
      console.log('=== PaymentVerify URL params ===');
      console.log('purchase_order_id:', purchase_order_id);
      console.log('khalti_product_id from localStorage:', localStorage.getItem('khalti_product_id'));
      console.log('khalti_ticket_type_id from localStorage:', localStorage.getItem('khalti_ticket_type_id'));

      // Check if payment failed
      if (urlStatus === 'failed') {
        setStatus('failed');
        setMessage(error ? `Payment failed: ${error.replace(/_/g, ' ')}` : 'Payment was cancelled or failed');
        return;
      }

      // Check if we have all required data
      if (!pidx || !transaction_id || !amount) {
        setStatus('failed');
        setMessage('Invalid payment data received');
        return;
      }

      // Payment verified by backend - create ticket
      let productId = localStorage.getItem('khalti_product_id');
      let ticketTypeId = localStorage.getItem('khalti_ticket_type_id') || localStorage.getItem('selected_ticket_type');

      // Fallback: extract from purchase_order_id in URL
      // Formats: ORDER_{productId}_{timestamp} or ORDER_{productId}_{ticketTypeId}_{timestamp}
      if (!productId && purchase_order_id) {
        console.log('localStorage empty, extracting from purchase_order_id:', purchase_order_id);
        // Remove "ORDER_" prefix then split remaining by "_"
        const withoutPrefix = purchase_order_id.replace(/^ORDER_/, '');
        const parts = withoutPrefix.split('_');
        console.log('parts after split:', parts);
        
        if (parts.length >= 3) {
          // New format: {productId}_{ticketTypeId}_{timestamp}
          productId = parts[0];
          ticketTypeId = ticketTypeId || parts[1];
        } else if (parts.length >= 1) {
          // Old format: {productId}_{timestamp}
          productId = parts[0];
        }
        console.log('Extracted productId:', productId, 'ticketTypeId:', ticketTypeId);
      }

      if (productId) {
        // Get stored quantity
        const quantity = parseInt(localStorage.getItem('selected_quantity')) || 1;
        
        // Register for event with payment data
        const response = await api.post(`/tickets/register/${productId}`, {
          ticket_type_id: ticketTypeId,
          quantity: quantity, // Add quantity to payment verification
          payment_data: {
            pidx: pidx,
            transaction_id: transaction_id,
            amount: parseFloat(amount) * 100, // Convert back to paisa
            status: 'Completed'
          }
        });

        const ticketCount = response.data.quantity || quantity;
        setStatus('success');
        setMessage(`Payment successful! ${ticketCount} ticket${ticketCount > 1 ? 's have' : ' has'} been created.`);
        setDetails({
          transaction_id: transaction_id,
          total_amount: parseFloat(amount) * 100,
          tickets_created: ticketCount
        });

        // Clear stored data
        localStorage.removeItem('khalti_pidx');
        localStorage.removeItem('khalti_purchase_order_id');
        localStorage.removeItem('khalti_product_id');
        localStorage.removeItem('khalti_ticket_type_id');
        localStorage.removeItem('selected_ticket_type');

        // Redirect to My Tickets after 3 seconds
        setTimeout(() => navigate('/my-tickets'), 3000);
      } else {
        setStatus('failed');
        setMessage(`Payment verified but ticket creation failed - could not extract event ID from: ${purchase_order_id || 'missing'}`);
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage(error.response?.data?.error || 'Failed to create ticket. Please contact support.');
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 3,
    }}>
      <Box sx={{ maxWidth: 480, width: '100%' }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box sx={{
              width: 22, height: 22, borderRadius: '50%',
              border: '2.5px solid white', borderTopColor: 'transparent',
              transform: 'rotate(-45deg)',
            }} />
          </Box>
          <Typography sx={{
            fontWeight: 700, fontSize: '1.25rem',
            background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            NEXUS
          </Typography>
        </Box>

        <Box sx={{
          bgcolor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 3,
          p: 5,
          textAlign: 'center',
        }}>
          {status === 'verifying' && (
            <>
              <Box sx={{
                width: 72, height: 72, borderRadius: '50%',
                bgcolor: '#f0fdfa', border: '2px solid #0891b2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 3,
              }}>
                <CircularProgress size={36} sx={{ color: '#0891b2' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1f2937', mb: 1 }}>
                Verifying Payment
              </Typography>
              <Typography sx={{ color: '#6b7280' }}>
                Please wait while we confirm your transaction...
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <Box sx={{
                width: 72, height: 72, borderRadius: '50%',
                bgcolor: '#d1fae5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 3,
                animation: 'scaleIn 0.4s ease-out',
                '@keyframes scaleIn': {
                  '0%': { transform: 'scale(0)' },
                  '60%': { transform: 'scale(1.1)' },
                  '100%': { transform: 'scale(1)' },
                },
              }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 40, color: '#10b981' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1f2937', mb: 1 }}>
                Payment Successful
              </Typography>
              <Typography sx={{ color: '#6b7280', mb: 3 }}>
                {message}
              </Typography>

              {details && (
                <Box sx={{
                  bgcolor: '#f9fafb', border: '1px solid #e5e7eb',
                  borderRadius: 2, p: 2.5, mb: 3, textAlign: 'left',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>Transaction ID</Typography>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', fontFamily: 'monospace' }}>
                      {details.transaction_id}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>Amount Paid</Typography>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#10b981' }}>
                      Rs. {details.total_amount / 100}
                    </Typography>
                  </Box>
                </Box>
              )}

              <Typography sx={{ fontSize: '0.875rem', color: '#0891b2', fontWeight: 500 }}>
                Redirecting to My Tickets...
              </Typography>
            </>
          )}

          {status === 'failed' && (
            <>
              <Box sx={{
                width: 72, height: 72, borderRadius: '50%',
                bgcolor: '#fee2e2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 3,
              }}>
                <ErrorOutlineIcon sx={{ fontSize: 40, color: '#ef4444' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1f2937', mb: 1 }}>
                Payment Failed
              </Typography>
              <Typography sx={{ color: '#6b7280', mb: 4 }}>
                {message}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(-1)}
                  sx={{
                    textTransform: 'none', borderColor: '#d1d5db', color: '#6b7280',
                    '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                  }}
                >
                  Go Back
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/events')}
                  sx={{
                    textTransform: 'none', bgcolor: '#0891b2', boxShadow: 'none',
                    '&:hover': { bgcolor: '#0e7490', boxShadow: 'none' },
                  }}
                >
                  Browse Events
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default PaymentVerify;
