// models/Note.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  college: { type: String, required: true },
  tags: [{ type: String }],
  description: { type: String },
  fileUrl: { type: String },
  originalFileName: { type: String },
  coverImage: { type: String },
  previewImage: { type: String },
  summary: { type: mongoose.Schema.Types.ObjectId, ref: 'AISummary' },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: []   // ← Important: Default empty array
  }],
  comments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Comment',
    default: []   // ← Important: Default empty array
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
noteSchema.index({ title: 'text', description: 'text', subject: 'text', tags: 'text' });
noteSchema.index({ college: 1, subject: 1 });

// Safe Virtuals (Fixed)
noteSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

noteSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

module.exports = mongoose.model('Note', noteSchema);