// models/AISummary.js
const mongoose = require('mongoose');

const aiSummarySchema = new mongoose.Schema({
  note: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Note', 
    required: true,
    unique: true // One summary per note
  },
  content: { 
    type: String, 
    required: true // The generated summary text
  },
  aiModel: { 
    type: String, 
    default: 'gpt-3.5-turbo' // e.g., 'gpt-4', 'gemini'
  },
  tokensUsed: { 
    type: Number, 
    default: 0 // For tracking costs
  },
  confidence: { 
    type: Number, // 0-1 score if available from API
    min: 0, 
    max: 1 
  },
  keywords: [{ type: String }] // Extracted key terms
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for note lookups


// Virtual for note details (if needed)
aiSummarySchema.virtual('noteDetails', {
  ref: 'Note',
  localField: 'note',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('AISummary', aiSummarySchema);