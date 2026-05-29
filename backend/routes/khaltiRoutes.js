const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middlewares/auth');
const { checkTicketAvailability } = require('../utils/ticketUtils');

// Khalti ePayment API endpoints
// Sandbox: https://dev.khalti.com/api/v2/ (for testing)
// Production: https://khalti.com/api/v2/ (for live)
const KHALTI_API_URL = process.env.KHALTI_ENV === 'production'
  ? 'https://khalti.com/api/v2'
  : 'https://dev.khalti.com/api/v2';

// Get backend URL from env or construct it
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;

// Initiate Khalti Payment
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { amount, purchase_order_id, purchase_order_name, customer_info, ticket_type_id } = req.body;

    console.log('Received payment request:', { amount, purchase_order_id, purchase_order_name, ticket_type_id });
    console.log('Amount type:', typeof amount, 'Value:', amount);

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

    // Amount must be in paisa (1 Rs = 100 paisa) and >= 1000 paisa (Rs. 10)
    // Use Number() to ensure proper conversion
    const amountInPaisa = Math.round(Number(amount) * 100);
    console.log('Amount in paisa:', amountInPaisa);

    if (amountInPaisa < 1000) {
      return res.status(400).json({
        error: 'Amount must be at least Rs. 10'
      });
    }

    // Prepare payload for Khalti - return_url points to BACKEND
    const payload = {
      return_url: `${BACKEND_URL}/api/khalti/callback`,
      website_url: process.env.FRONTEND_URL || 'http://localhost:5173',
      amount: amountInPaisa,
      purchase_order_id: purchase_order_id,
      purchase_order_name: purchase_order_name,
      customer_info: customer_info || {
        name: req.user.name || 'Customer',
        email: req.user.email,
        phone: req.user.phone || '9800000000'
      }
    };

    console.log('Sending to Khalti:', JSON.stringify(payload, null, 2));

    // Make request to Khalti
    const response = await axios.post(
      `${KHALTI_API_URL}/epayment/initiate/`,
      payload,
      {
        headers: {
          'Authorization': `Key ${process.env.KHALTI_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Return payment URL and pidx to frontend
    res.json({
      success: true,
      pidx: response.data.pidx,
      payment_url: response.data.payment_url,
      expires_at: response.data.expires_at,
      expires_in: response.data.expires_in
    });

  } catch (error) {
    console.error('Khalti initiate error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to initiate payment',
      details: error.response?.data || error.message
    });
  }
});

// Khalti Callback (NO AUTHENTICATION - Khalti redirects user here)
router.get('/callback', async (req, res) => {
  try {
    const { pidx } = req.query;

    console.log('Khalti callback received:', req.query);

    if (!pidx) {
      console.error('Khalti callback: No pidx received');
      return res.redirect(`${process.env.FRONTEND_URL}/payment/verify?status=failed&error=no_pidx`);
    }

    // Server-to-server verification with Khalti Lookup API
    try {
      const response = await axios.post(
        `${KHALTI_API_URL}/epayment/lookup/`,
        { pidx },
        {
          headers: {
            'Authorization': `Key ${process.env.KHALTI_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Khalti lookup response:', response.data);

      // Check if payment is actually completed
      if (response.data.status !== 'Completed') {
        console.error('Khalti payment not completed:', response.data.status);
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/verify?status=failed&error=payment_not_completed&payment_status=${response.data.status}`
        );
      }

      // Payment verified successfully - redirect to frontend with success data
      const successParams = new URLSearchParams({
        status: 'success',
        pidx: pidx,
        transaction_id: response.data.transaction_id,
        amount: (response.data.total_amount / 100).toFixed(2), // Convert paisa to rupees
        purchase_order_id: response.data.purchase_order_id,
        purchase_order_name: response.data.purchase_order_name
      });

      return res.redirect(`${process.env.FRONTEND_URL}/payment/verify?${successParams.toString()}`);

    } catch (lookupError) {
      console.error('Khalti lookup API error:', lookupError.response?.data || lookupError.message);
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/verify?status=failed&error=lookup_failed`
      );
    }

  } catch (error) {
    console.error('Khalti callback error:', error);
    return res.redirect(
      `${process.env.FRONTEND_URL}/payment/verify?status=failed&error=server_error`
    );
  }
});

// Verify/Lookup Khalti Payment (for frontend to check status)
// This is optional - mainly for manual checks or retries
router.post('/verify', async (req, res) => {
  try {
    const { pidx } = req.body;

    if (!pidx) {
      return res.status(400).json({ error: 'pidx is required' });
    }

    // Lookup payment status from Khalti
    const response = await axios.post(
      `${KHALTI_API_URL}/epayment/lookup/`,
      { pidx },
      {
        headers: {
          'Authorization': `Key ${process.env.KHALTI_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Check if payment is completed
    if (response.data.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        status: response.data.status,
        message: 'Payment not completed'
      });
    }

    // Return verification result
    res.json({
      success: true,
      transaction_id: response.data.transaction_id,
      amount: response.data.total_amount,
      status: response.data.status,
      purchase_order_id: response.data.purchase_order_id,
      purchase_order_name: response.data.purchase_order_name
    });

  } catch (error) {
    console.error('Khalti verify error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to verify payment',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
