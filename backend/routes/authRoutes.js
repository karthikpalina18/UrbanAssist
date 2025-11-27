const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register,
  registerProvider,
  login,
  loginProvider,
  getMe,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Invalid phone number')
];

const providerRegisterValidation = [
  ...registerValidation,
  body('category').notEmpty().withMessage('Category is required'),
  body('experience').isNumeric().withMessage('Experience must be a number')
];

router.post('/register', registerValidation, register);
router.post('/register-provider', providerRegisterValidation, registerProvider);
router.post('/login', login);
router.post('/login-provider', loginProvider);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;