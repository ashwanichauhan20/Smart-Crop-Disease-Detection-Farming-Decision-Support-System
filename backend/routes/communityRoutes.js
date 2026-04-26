const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');

router.get('/posts', communityController.getPosts);
router.post('/posts', communityController.createPost);
router.post('/posts/:id/comment', communityController.addComment);
router.post('/posts/:id/like', communityController.toggleLike);
router.delete('/posts/:id', communityController.deletePost);

module.exports = router;
