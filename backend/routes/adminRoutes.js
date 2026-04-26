const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.post('/bulk-users', adminController.bulkUserAction);
router.get('/doc-proxy', adminController.docProxy);

module.exports = router;
