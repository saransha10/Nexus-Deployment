const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const { authenticate } = require('../middlewares/auth');
const { checkTicketAvailability } = require('../utils/ticketUtils');

// eSewa Payment Gateway endpoints (v2 API)
// Sandbox uses rc-epay subdomain
const ESEWA_PAYMENT_URL = process.env.ESEWA_ENV === 'production'
  ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
  : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

const ESEWA_VERIFY_URL = process.env.ESEWA_ENV === 'production'
  ? 'https://epay.esewa.com.np/api/epay/transaction/status/'
  : 'https://rc-epay.esewa.com.np/api/epay/transaction/status/';

// Get backend URL from env or construct it
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;

// Generate eSewa signature
const generateSignature = (message, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(message);
  const signature = hmac.digest('base64');
  console.log('Signature generation:');
  console.log('- Message:', message);
  console.log('- Secret:', secret);
  console.log('- Signature:', signature);
  return signature;
};

// Initiate eSewa Payment
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { amount, purchase_order_id, purchase_order_name, ticket_type_id } = req.body;

    // Validate required fields
    if (!amount || !purchase_order_id || !purchase_order_name) {
      return res.status(400).json({
        error: 'Missing required fields: amount, purchase_order_id, purchase_order_name'
      });
    }

    // Check ticket availability if ticket_type_id provided
    if (ticket_type_id) {
      const availability = await checkTicketAvailability(ticket_type_id);
      if (!availability.available) {
        return res.status(400).json({ error: availability.error || 'Tickets are sold out' });
      }
    }

    // Amount must be at least Rs. 10
    if (parseFloat(amount) < 10) {
      return res.status(400).json({
        error: 'Amount must be at least Rs. 10'
      });
    }

    const transaction_uuid = `${purchase_order_id}_${Date.now()}`;
    
    // Ensure amount is a string with proper format
    const amountStr = parseFloat(amount).toString();

    // Generate signature - IMPORTANT: Order matters!
    const message = `total_amount=${amountStr},transaction_uuid=${transaction_uuid},product_code=${process.env.ESEWA_MERCHANT_ID}`;
    const signature = generateSignature(message, process.env.ESEWA_SECRET_KEY);

    console.log('eSewa Payment Initiation:');
    console.log('- Amount:', amountStr);
    console.log('- Transaction UUID:', transaction_uuid);
    console.log('- Product Code:', process.env.ESEWA_MERCHANT_ID);
    console.log('- Message for signature:', message);
    console.log('- Signature:', signature);

    // Return payment form data with BACKEND URLs for callbacks
    console.log('eSewa Payment URL:', ESEWA_PAYMENT_URL);

    res.json({
      success: true,
      payment_url: ESEWA_PAYMENT_URL,
      transaction_uuid: transaction_uuid, // Send to frontend for storage
      form_data: {
        amount: amountStr,
        tax_amount: '0',
        total_amount: amountStr,
        transaction_uuid: transaction_uuid,
        product_code: process.env.ESEWA_MERCHANT_ID,
        product_service_charge: '0',
        product_delivery_charge: '0',
        success_url: `${BACKEND_URL}/api/esewa/callback`,
        failure_url: `${BACKEND_URL}/api/esewa/callback`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature: signature
      }
    });

  } catch (error) {
    console.error('eSewa initiate error:', error);
    res.status(500).json({
      error: 'Failed to initiate payment',
      details: error.message
    });
  }
});

// eSewa Callback (NO AUTHENTICATION - eSewa server calls this)
router.get('/callback', async (req, res) => {
  try {
    const { data } = req.query;

    if (!data) {
      console.error('eSewa callback: No data received');
      return res.redirect(`${process.env.FRONTEND_URL}/payment/esewa/verify?status=failed&error=no_data`);
    }

    // Decode base64 data
    const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));

    console.log('eSewa callback data:', decodedData);

    const { transaction_uuid, total_amount, status, transaction_code } = decodedData;

    // Server-to-server verification with eSewa
    try {
      const verifyResponse = await axios.get(ESEWA_VERIFY_URL, {
        params: {
          product_code: process.env.ESEWA_MERCHANT_ID,
          transaction_uuid: transaction_uuid
        }
      });

      console.log('eSewa status API response:', verifyResponse.data);

      // Check if payment is actually complete from eSewa's server
      if (verifyResponse.data.status !== 'COMPLETE') {
        console.error('eSewa verification failed:', verifyResponse.data);
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/esewa/verify?status=failed&error=verification_failed`
        );
      }

      // Payment verified successfully - redirect to frontend with success data
      const successParams = new URLSearchParams({
        status: 'success',
        transaction_uuid: transaction_uuid,
        transaction_code: transaction_code || verifyResponse.data.ref_id,
        total_amount: total_amount,
        refId: verifyResponse.data.ref_id || transaction_code
      });

      return res.redirect(`${process.env.FRONTEND_URL}/payment/esewa/verify?${successParams.toString()}`);

    } catch (verifyError) {
      console.error('eSewa status API error:', verifyError.response?.data || verifyError.message);

      // In sandbox mode, if status API fails, trust the callback data
      if (process.env.ESEWA_ENV === 'sandbox' && status === 'COMPLETE') {
        console.log('Sandbox mode: Accepting payment despite status API failure');
        const successParams = new URLSearchParams({
          status: 'success',
          transaction_uuid: transaction_uuid,
          transaction_code: transaction_code,
          total_amount: total_amount,
          refId: decodedData.ref_id || transaction_code
        });
        return res.redirect(`${process.env.FRONTEND_URL}/payment/esewa/verify?${successParams.toString()}`);
      }

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/esewa/verify?status=failed&error=api_error`
      );
    }

  } catch (error) {
    console.error('eSewa callback error:', error);
    return res.redirect(
      `${process.env.FRONTEND_URL}/payment/esewa/verify?status=failed&error=server_error`
    );
  }
});

module.exports = router;
