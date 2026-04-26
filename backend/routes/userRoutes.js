const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Stats must be before /:userId to prevent 'stats' being read as userId
router.get('/stats', userController.getSystemStats);

router.get('/all', userController.getAllUsers);

// For simplicity we use params for user identification in the current app structure
router.get('/:userId', userController.getProfile);
router.put('/:userId', userController.updateProfile);
router.delete('/:userId', userController.deleteUser);

module.exports = router;
