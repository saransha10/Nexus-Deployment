import { useState } from 'react';

function DemoPayment({ amount, productName, onSuccess, onClose }) {
  const [step, setStep] = useState('initial'); // initial, processing, success
  const [paymentMethod, setPaymentMethod] = useState('khalti');

  const handlePayment = () => {
    setStep('processing');
    
    // Simulate payment processing
    setTimeout(() => {
      setStep('success');
      
      // Simulate successful payment after 2 seconds
      setTimeout(() => {
        const mockPayload = {
          idx: 'DEMO' + Date.now(),
          token: 'demo_token_' + Date.now(),
          amount: amount * 100,
          mobile: '9800000000',
          product_identity: Date.now().toString(),
          product_name: productName,
          state: {
            name: 'Completed'
          }
        };
        
        onSuccess(mockPayload);
      }, 2000);
    }, 1500);
  };

  if (step === 'initial') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Demo Payment</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-purple-800 mb-2">
                🎭 <strong>Demo Mode</strong> - No real transaction will occur
              </p>
              <p className="text-xs text-purple-600">
                This is a simulated payment for demonstration purposes only
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="khalti"
                    checked={paymentMethod === 'khalti'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <span className="font-medium text-purple-600">💜 Khalti Wallet</span>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="ebanking"
                    checked={paymentMethod === 'ebanking'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <span className="font-medium text-blue-600">🏦 E-Banking</span>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="mobile"
                    checked={paymentMethod === 'mobile'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <span className="font-medium text-green-600">📱 Mobile Banking</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Pay Rs. {amount}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="mb-4">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Processing Payment...</h3>
          <p className="text-gray-600">Please wait while we process your payment</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
              <span className="text-4xl">✓</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
          <p className="text-gray-600 mb-4">Your ticket is being generated...</p>
          <div className="animate-pulse text-purple-600">
            <span className="inline-block">●</span>
            <span className="inline-block mx-1">●</span>
            <span className="inline-block">●</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default DemoPayment;
