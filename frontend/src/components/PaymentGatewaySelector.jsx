import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// Helper function to check if user is authenticated
const checkAuthentication = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    return { isAuthenticated: false, error: 'Please log in to continue' };
  }
  
  try {
    // Check if token is expired (basic check)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return { isAuthenticated: false, error: 'Invalid token format' };
    }
    
    const payload = JSON.parse(atob(tokenParts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < currentTime) {
      return { isAuthenticated: false, error: 'Session expired. Please log in again' };
    }
    
    return { isAuthenticated: true, user: JSON.parse(user) };
  } catch (error) {
    return { isAuthenticated: false, error: 'Invalid token. Please log in again' };
  }
};

function PaymentGatewaySelector({ amount, productName, productId, ticketTypeId, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(null);

  const handleKhaltiPayment = async () => {
    setLoading(true);
    try {
      // Check authentication first
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        alert(authCheck.error);
        setLoading(false);
        navigate('/login');
        return;
      }

      const user = authCheck.user;

      const paymentData = {
        amount: amount,
        // Encode productId and ticketTypeId into purchase_order_id so they survive the redirect
        purchase_order_id: `ORDER_${productId}_${ticketTypeId}_${Date.now()}`,
        purchase_order_name: productName,
        ticket_type_id: ticketTypeId,
        customer_info: {
          name: user?.full_name || user?.name || 'Customer',
          email: user?.email || 'customer@example.com',
          phone: user?.phone || '9800000000'
        }
      };

      const response = await api.post('/khalti/initiate', paymentData);

      if (response.data.success && response.data.payment_url) {
        localStorage.setItem('khalti_pidx', response.data.pidx);
        localStorage.setItem('khalti_purchase_order_id', paymentData.purchase_order_id);
        localStorage.setItem('khalti_product_id', productId);
        localStorage.setItem('khalti_ticket_type_id', ticketTypeId);
        
        // Store token and refreshToken to restore after redirect
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        const user = localStorage.getItem('user');
        
        if (token) localStorage.setItem('khalti_temp_token', token);
        if (refreshToken) localStorage.setItem('khalti_temp_refresh', refreshToken);
        if (user) localStorage.setItem('khalti_temp_user', user);

        window.location.href = response.data.payment_url;
      }
    } catch (error) {
      console.error('Khalti payment error:', error);
      
      let errorMessage = 'Failed to initiate Khalti payment';
      if (error.response?.data?.error === 'No token provided') {
        errorMessage = 'Authentication required. Please log in and try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      alert(errorMessage);
      setLoading(false);
    }
  };

  const handleEsewaPayment = async () => {
    setLoading(true);
    try {
      // Check authentication first
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        alert(authCheck.error);
        setLoading(false);
        navigate('/login');
        return;
      }

      const paymentData = {
        amount: amount,
        purchase_order_id: `ORDER_${productId}_${Date.now()}`,
        purchase_order_name: productName,
        ticket_type_id: ticketTypeId
      };

      const response = await api.post('/esewa/initiate', paymentData);

      if (response.data.success) {
        // Store for verification INCLUDING the token
        localStorage.setItem('esewa_transaction_uuid', response.data.transaction_uuid);
        localStorage.setItem('esewa_product_id', productId);
        localStorage.setItem('esewa_ticket_type_id', ticketTypeId);
        
        // Store token and refreshToken to restore after redirect
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        const user = localStorage.getItem('user');
        
        if (token) localStorage.setItem('esewa_temp_token', token);
        if (refreshToken) localStorage.setItem('esewa_temp_refresh', refreshToken);
        if (user) localStorage.setItem('esewa_temp_user', user);

        // Debug: Log payment URL and form data
        console.log('eSewa Payment URL:', response.data.payment_url);
        console.log('eSewa Form Data:', response.data.form_data);

        // Create and submit form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = response.data.payment_url;

        Object.entries(response.data.form_data).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
          console.log(`Form field: ${key} = ${value}`);
        });

        document.body.appendChild(form);
        console.log('Submitting form to:', form.action);
        form.submit();
      }
    } catch (error) {
      console.error('eSewa payment error:', error);
      
      let errorMessage = 'Failed to initiate eSewa payment';
      if (error.response?.data?.error === 'No token provided') {
        errorMessage = 'Authentication required. Please log in and try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      alert(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="payment-gateway-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Select Payment Method</h2>
          <button onClick={onClose} className="close-btn" disabled={loading}>✕</button>
        </div>

        <div className="payment-info">
          <p className="product-name">{productName}</p>
          <p className="amount">Rs. {amount}</p>
        </div>

        <div className="payment-gateways">
          <button
            className={`gateway-btn ${selectedGateway === 'khalti' ? 'selected' : ''}`}
            onClick={() => setSelectedGateway('khalti')}
            disabled={loading}
          >
            <div className="gateway-logo khalti-logo">
              <svg viewBox="0 0 100 40" className="logo-svg">
                <text x="50" y="25" textAnchor="middle" fill="#5d2e8e" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif">
                  Khalti
                </text>
              </svg>
            </div>
            <div className="gateway-info">
              <h3>Khalti</h3>
              <p>Wallet, Banking, Cards</p>
            </div>
          </button>

          <button
            className={`gateway-btn ${selectedGateway === 'esewa' ? 'selected' : ''}`}
            onClick={() => setSelectedGateway('esewa')}
            disabled={loading}
          >
            <div className="gateway-logo esewa-logo">
              <svg viewBox="0 0 100 40" className="logo-svg">
                <text x="50" y="25" textAnchor="middle" fill="#60bb46" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif">
                  eSewa
                </text>
              </svg>
            </div>
            <div className="gateway-info">
              <h3>eSewa</h3>
              <p>Digital Wallet</p>
            </div>
          </button>
        </div>

        {selectedGateway && (
          <button
            className="proceed-btn"
            onClick={selectedGateway === 'khalti' ? handleKhaltiPayment : handleEsewaPayment}
            disabled={loading}
          >
            {loading ? 'Processing...' : `Pay Rs. ${amount} with ${selectedGateway === 'khalti' ? 'Khalti' : 'eSewa'}`}
          </button>
        )}
      </div>

      <style>{`
        .payment-gateway-modal {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
        }

        .modal-content {
          position: relative;
          background: white;
          border-radius: 16px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .modal-header h2 {
          margin: 0;
          color: #333;
          font-size: 1.5rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 32px;
          height: 32px;
        }

        .close-btn:hover {
          color: #333;
        }

        .payment-info {
          background: #f5f5f5;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .product-name {
          margin: 0 0 0.5rem 0;
          color: #666;
          font-size: 0.9rem;
        }

        .amount {
          margin: 0;
          font-size: 1.8rem;
          font-weight: bold;
          color: #333;
        }

        .payment-gateways {
          display: grid;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .gateway-btn {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 2px solid #ddd;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .gateway-btn:hover:not(:disabled) {
          border-color: #1976d2;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .gateway-btn.selected {
          border-color: #1976d2;
          background: #e3f2fd;
        }

        .gateway-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .gateway-logo {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          padding: 1rem;
          background: white;
          flex-shrink: 0;
        }

        .logo-svg {
          width: 100%;
          height: 100%;
        }

        .khalti-logo {
          border: 2px solid #5d2e8e;
          background: #f3e5f5;
        }

        .esewa-logo {
          border: 2px solid #60bb46;
          background: #e8f5e9;
        }

        .gateway-info {
          flex: 1;
          text-align: left;
        }

        .gateway-info h3 {
          margin: 0 0 0.25rem 0;
          color: #333;
          font-size: 1.1rem;
        }

        .gateway-info p {
          margin: 0;
          color: #666;
          font-size: 0.85rem;
        }

        .proceed-btn {
          width: 100%;
          padding: 1rem;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .proceed-btn:hover:not(:disabled) {
          background: #1565c0;
        }

        .proceed-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sandbox-note {
          text-align: center;
          margin: 1rem 0 0 0;
          color: #666;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}

export default PaymentGatewaySelector;
