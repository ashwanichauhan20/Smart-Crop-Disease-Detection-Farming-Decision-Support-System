const CommunityPost = require('../models/CommunityPost');

exports.getPosts = async (req, res) => {
    try {
        const posts = await CommunityPost.find().sort({ time: -1 });
        res.json({ success: true, data: posts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createPost = async (req, res) => {
    try {
        const newPost = new CommunityPost(req.body);
        const savedPost = await newPost.save();
        res.status(201).json({ success: true, data: savedPost });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addComment = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        
        post.comments += 1;
        post.commentList.push({
            author: req.body.author || 'User',
            text: req.body.text,
            image: req.body.image || null,
            audio: req.body.audio || null
        });
        
        await post.save();
        res.json({ success: true, data: post });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
        
        // Simplistic like approach for demo purposes, in production would link to User IDs
        post.likes += 1;
        await post.save();
        res.json({ success: true, data: post });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const post = await CommunityPost.findByIdAndDelete(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
