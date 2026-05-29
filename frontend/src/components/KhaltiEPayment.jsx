import { useState } from 'react';
import api from '../services/api';

function KhaltiEPayment({ amount, productName, productId, onSuccess, onError, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initiatePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get user info from localStorage
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;

      // Prepare payment data
      const paymentData = {
        amount: amount, // Amount in Rs (will be converted to paisa in backend)
        purchase_order_id: `ORDER_${productId}_${Date.now()}`,
        purchase_order_name: productName,
        customer_info: {
          name: user?.full_name || 'Customer',
          email: user?.email || 'customer@example.com',
          phone: user?.phone || '9800000000'
        }
      };

      // Call backend to initiate payment
      const response = await api.post('/khalti/initiate', paymentData);

      if (response.data.success && response.data.payment_url) {
        // Store pidx for verification later
        localStorage.setItem('khalti_pidx', response.data.pidx);
        localStorage.setItem('khalti_purchase_order_id', paymentData.purchase_order_id);
        localStorage.setItem('khalti_product_id', productId);
        
        // Redirect to Khalti payment page
        window.location.href = response.data.payment_url;
      } else {
        throw new Error('Failed to get payment URL');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      setLoading(false);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to initiate payment';
      setError(errorMsg);
      if (onError) {
        onError(error.response?.data || { message: errorMsg });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Khalti Payment</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">💜</span>
              <span className="font-bold text-purple-800">Pay with Khalti</span>
            </div>
            <p className="text-sm text-purple-600">
              Secure payment gateway - Multiple payment methods available
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Product:</span>
              <span className="font-semibold">{productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-bold text-lg text-purple-600">Rs. {amount}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          <div className="text-sm text-gray-600 mb-4">
            <p className="mb-2">✅ Khalti Wallet</p>
            <p className="mb-2">✅ E-Banking</p>
            <p className="mb-2">✅ Mobile Banking</p>
            <p>✅ Cards (SCT/Connect IPS)</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={initiatePayment}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              `Pay Rs. ${amount}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default KhaltiEPayment;
