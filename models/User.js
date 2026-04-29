// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed
  googleId: { type: String }, // For OAuth
  college: { type: String, required: true },
  course: { type: String, required: true },
  profilePic: { type: String }, // Cloudinary URL
  role: { 
    type: String, 
    enum: ['user', 'admin'], // Restrict to valid roles
    default: 'user' // New users are 'user' by default
  },
  savedNotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }] // For dashboard
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for note count (e.g., uploaded notes)
userSchema.virtual('uploadedNotes', {
  ref: 'Note',
  localField: '_id',
  foreignField: 'uploader'
});

// Exclude sensitive fields from JSON output (add role to safe fields)
userSchema.set('toJSON', { 
  virtuals: true, 
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    delete ret.__v;
    return ret;
  } 
});

userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);