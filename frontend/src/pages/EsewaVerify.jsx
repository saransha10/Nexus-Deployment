import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

function EsewaVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      // Restore token from temporary storage if it was cleared
      const tempToken = localStorage.getItem('esewa_temp_token');
      const tempRefresh = localStorage.getItem('esewa_temp_refresh');
      const tempUser = localStorage.getItem('esewa_temp_user');
      
      if (tempToken && !localStorage.getItem('token')) {
        localStorage.setItem('token', tempToken);
        if (tempRefresh) localStorage.setItem('refreshToken', tempRefresh);
        if (tempUser) localStorage.setItem('user', tempUser);
        
        // Clean up temp storage
        localStorage.removeItem('esewa_temp_token');
        localStorage.removeItem('esewa_temp_refresh');
        localStorage.removeItem('esewa_temp_user');
      }
      
      // Check if user is logged in
      const token = localStorage.getItem('token');
      
      if (!token) {
        setStatus('failed');
        setMessage('You must be logged in to complete the payment. Please log in and try again.');
        return;
      }

      const status = searchParams.get('status');
      const transaction_uuid = searchParams.get('transaction_uuid');
      const transaction_code = searchParams.get('transaction_code');
      const total_amount = searchParams.get('total_amount');
      const refId = searchParams.get('refId');
      const error = searchParams.get('error');

      // Check if payment failed
      if (status === 'failed') {
        setStatus('failed');
        setMessage(error ? `Payment failed: ${error}` : 'Payment was cancelled or failed');
        return;
      }

      // Check if we have all required data
      if (!transaction_uuid || !transaction_code || !total_amount) {
        setStatus('failed');
        setMessage('Invalid payment data received');
        return;
      }

      // Payment verified by backend - create ticket
      const productId = localStorage.getItem('esewa_product_id');

      if (productId) {
        await api.post(`/tickets/register/${productId}`, {
          ticket_type_id: localStorage.getItem('esewa_ticket_type_id') || localStorage.getItem('selected_ticket_type'),
          payment_data: {
            transaction_uuid: transaction_uuid,
            transaction_id: transaction_code,
            amount: total_amount,
            status: 'COMPLETE',
            refId: refId
          }
        });

        setStatus('success');
        setMessage('Payment successful! Your ticket has been created.');

        // Clear stored data
        localStorage.removeItem('esewa_transaction_uuid');
        localStorage.removeItem('esewa_product_id');
        localStorage.removeItem('esewa_ticket_type_id');
        localStorage.removeItem('selected_ticket_type');

        setTimeout(() => navigate('/my-tickets'), 3000);
      } else {
        setStatus('failed');
        setMessage('Payment verified but ticket creation failed');
      }

    } catch (error) {
      console.error('eSewa verification error:', error);
      setStatus('failed');
      setMessage(error.response?.data?.error || 'Failed to create ticket');
    }
  };

  return (
    <div className="payment-verify-page">
      <div className="verify-container">
        {status === 'verifying' && (
          <div className="verify-status">
            <div className="spinner"></div>
            <h2>Verifying Payment</h2>
            <p>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="verify-status success">
            <div className="success-icon">✓</div>
            <h2>Payment Successful!</h2>
            <p>{message}</p>
            <p className="redirect-message">Redirecting to My Tickets...</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="verify-status failed">
            <div className="error-icon">✕</div>
            <h2>Payment Failed</h2>
            <p>{message}</p>
            <button onClick={() => navigate('/events')} className="btn-back">
              Back to Events
            </button>
          </div>
        )}
      </div>

      <style>{`
        .payment-verify-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #60bb46 0%, #4a9b34 100%);
          padding: 2rem;
        }

        .verify-container {
          background: white;
          border-radius: 16px;
          padding: 3rem;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #60bb46;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1.5rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .success-icon {
          width: 80px;
          height: 80px;
          background: #4caf50;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          margin: 0 auto 1.5rem;
        }

        .error-icon {
          width: 80px;
          height: 80px;
          background: #f44336;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          margin: 0 auto 1.5rem;
        }

        h2 {
          margin: 0 0 1rem 0;
          color: #333;
        }

        p {
          color: #666;
          margin: 0.5rem 0;
        }

        .redirect-message {
          color: #60bb46;
          font-weight: 500;
          margin-top: 1.5rem;
        }

        .btn-back {
          margin-top: 1.5rem;
          padding: 0.75rem 2rem;
          background: #60bb46;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default EsewaVerify;
