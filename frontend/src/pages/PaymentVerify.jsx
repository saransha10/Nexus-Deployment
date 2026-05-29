import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

      // Fallback: extract from purchase_order_id in URL (format: ORDER_{productId}_{ticketTypeId}_{timestamp})
      if (!productId && purchase_order_id) {
        const parts = purchase_order_id.split('_');
        // FORMAT: ORDER_{productId}_{ticketTypeId}_{timestamp}
        if (parts.length >= 4) {
          productId = parts[1];
          ticketTypeId = ticketTypeId || parts[2];
        } else if (parts.length >= 2) {
          productId = parts[1];
        }
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
        setMessage('Payment verified but ticket creation failed - missing product ID');
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage(error.response?.data?.error || 'Failed to create ticket. Please contact support.');
    }
  };

  return (
    <div className="payment-verify-page">
      <div className="verify-container">
        {status === 'verifying' && (
          <div className="verify-status verifying">
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
            {details && (
              <div className="payment-details">
                <p><strong>Transaction ID:</strong> {details.transaction_id}</p>
                <p><strong>Amount:</strong> Rs. {details.total_amount / 100}</p>
              </div>
            )}
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }

        .verify-container {
          background: white;
          border-radius: 16px;
          padding: 3rem;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .verify-status {
          text-align: center;
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
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
          animation: scaleIn 0.5s ease-out;
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
          animation: scaleIn 0.5s ease-out;
        }

        @keyframes scaleIn {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .verify-status h2 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.8rem;
        }

        .verify-status p {
          color: #666;
          margin: 0.5rem 0;
          font-size: 1.1rem;
        }

        .payment-details {
          background: #f5f5f5;
          padding: 1.5rem;
          border-radius: 8px;
          margin: 1.5rem 0;
          text-align: left;
        }

        .payment-details p {
          margin: 0.5rem 0;
          color: #333;
          font-size: 0.95rem;
        }

        .redirect-message {
          color: #667eea;
          font-weight: 500;
          margin-top: 1.5rem;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .btn-back {
          margin-top: 1.5rem;
          padding: 0.75rem 2rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.3s;
        }

        .btn-back:hover {
          background: #5568d3;
        }
      `}</style>
    </div>
  );
}

export default PaymentVerify;
