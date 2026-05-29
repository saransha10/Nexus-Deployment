import { useEffect } from 'react';
import KhaltiCheckout from 'khalti-checkout-web';

function KhaltiPayment({ amount, productName, onSuccess, onError, onClose }) {
  useEffect(() => {
    // Your Khalti Merchant Account Public Key
    const publicKey = import.meta.env.VITE_KHALTI_PUBLIC_KEY || "live_public_key_6e9ca4724e21479184802df086bafce5";
    
    const config = {
      publicKey: publicKey,
      productIdentity: Date.now().toString(),
      productName: productName,
      productUrl: window.location.href,
      eventHandler: {
        onSuccess(payload) {
          console.log('Khalti TEST Payment Success:', payload);
          onSuccess(payload);
        },
        onError(error) {
          console.log('Khalti Payment Error:', error);
          onError(error);
        },
        onClose() {
          console.log('Khalti Payment widget closed');
          if (onClose) onClose();
        }
      },
      paymentPreference: ["KHALTI", "EBANKING", "MOBILE_BANKING", "CONNECT_IPS", "SCT"],
    };

    try {
      const checkout = new KhaltiCheckout(config);
      // Auto-open payment widget
      checkout.show({ amount: amount * 100 }); // Amount in paisa (1 Rs = 100 paisa)
    } catch (error) {
      console.error('Khalti initialization error:', error);
      onError(error);
    }

    return () => {
      // Cleanup if needed
    };
  }, [amount, productName, onSuccess, onError, onClose]);

  return null; // Khalti opens its own modal
}

export default KhaltiPayment;
