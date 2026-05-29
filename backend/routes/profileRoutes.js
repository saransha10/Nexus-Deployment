const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireEmailVerification } = require('../middlewares/emailVerification');
const {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
  changePassword,
  changeEmail,
  deleteAccount,
  setPassword,
  upload
} = require('../controllers/profileController');
const {
  generateTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus
} = require('../controllers/twoFactorController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/', getProfile);
router.put('/', updateProfile);

// Photo routes
router.post('/photo', upload.single('photo'), uploadProfilePhoto);
router.delete('/photo', removeProfilePhoto);

// Security routes
router.put('/change-password', changePassword);
router.post('/set-password', setPassword); // For Google OAuth users
router.put('/change-email', requireEmailVerification, changeEmail);

// 2FA routes
router.get('/2fa/status', getTwoFactorStatus);
router.post('/2fa/generate', generateTwoFactorSecret);
router.post('/2fa/enable', enableTwoFactor);
router.post('/2fa/disable', disableTwoFactor);

// Danger zone
router.delete('/account', deleteAccount);

module.exports = router;
