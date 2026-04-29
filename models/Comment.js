// models/Comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  note: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Note', 
    required: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  text: { 
    type: String, 
    required: true, 
    trim: true 
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Comment likes
  parentComment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Comment', 
    default: null // For replies
  },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }] // Nested replies
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for note-based queries
commentSchema.index({ note: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

// Virtual for like count
commentSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for reply count
commentSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

module.exports = mongoose.model('Comment', commentSchema);