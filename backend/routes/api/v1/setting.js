const express = require("express");
const router = express.Router();
const { index, getByKey, createOrUpdate, destroy, resetDatabase, getResetPassword } = require('../../../controllers/SettingController.js');
const { authenticateJWT } = require('../../../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Get all settings
router.get('/settings', index);

// Get setting by key
router.get('/settings/:key', getByKey);

// Create or update setting
router.post('/settings', createOrUpdate);

// Update setting by key
router.put('/settings/:key', createOrUpdate);

// Delete setting
router.delete('/settings/:key', destroy);

// Reset database with password confirmation
router.post('/reset-database', resetDatabase);

// Get current reset password (for admin reference)
router.get('/reset-password', getResetPassword);

module.exports = router;