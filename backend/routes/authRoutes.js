const express = require('express');
const passport = require('passport');
const { register, login, verifyEmail, resendVerification } = require('../controllers/authController');
const { forgotPassword, resetPassword } = require('../controllers/passwordController');
const { googleCallback } = require('../controllers/googleAuthController');

const router = express.Router();

// Local authentication
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/login' 
  }),
  googleCallback
);

// Update role (for Google OAuth users)
const { authenticate } = require('../middlewares/auth');
const { updateRole } = require('../controllers/googleAuthController');
router.put('/update-role', authenticate, updateRole);

module.exports = router;
