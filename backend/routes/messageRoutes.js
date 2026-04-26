const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.post('/send', messageController.sendMessage);
router.get('/history/:userId/:otherId', messageController.getConversations);
router.get('/admin-id', messageController.getAdminId);
router.get('/expert-contacts', messageController.getExpertContacts);
router.get('/contacts/:userId', messageController.getMyContacts);
router.put('/:id/read', messageController.markAsRead);
router.delete('/:id', messageController.deleteMessage);

module.exports = router;
