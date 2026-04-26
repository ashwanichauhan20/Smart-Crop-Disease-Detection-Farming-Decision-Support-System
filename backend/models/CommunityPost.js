const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    author: { type: String, required: true },
    text: { type: String, required: true },
    image: { type: String },
    audio: { type: String },
    time: { type: Date, default: Date.now }
});

const communityPostSchema = new mongoose.Schema({
    author: { type: String, required: true },
    authorId: { type: String },
    authorRole: { type: String },
    avatar: { type: String },
    profilePic: { type: String },
    location: { type: String },
    content: { type: String, required: true },
    image: { type: String },
    audio: { type: String },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    commentList: [commentSchema],
    tags: [{ type: String }],
    expert: { type: Boolean, default: false },
    time: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommunityPost', communityPostSchema);
