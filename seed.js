// seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Note = require('./models/Note');
const ChatRoom = require('./models/ChatRoom');
require('dotenv').config();

const connectDB = require('./config/db');

// Sample data
const users = [
  {
    name: 'Test Student',
    email: 'student@example.com',
    password: 'password123', // Will be hashed
    college: 'Delhi University',
    course: 'BSc Computer Science',
    role: 'user'
  },
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123', // Will be hashed
    college: 'Admin College',
    course: 'Admin Course',
    role: 'admin'
  }
];

const notes = [
  {
    title: 'Calculus Basics',
    subject: 'Mathematics',
    college: 'Delhi University',
    description: 'Intro to derivatives and limits.',
    tags: ['math', 'exam', 'summary'],
    uploader: null // Will be set to first user ID
  },
  {
    title: 'Python Notes',
    subject: 'Programming',
    college: 'Delhi University',
    description: 'Basics of Python for beginners.',
    tags: ['code', 'tutorial'],
    uploader: null
  }
];

const chatRoom = {
  name: 'Math Discussion',
  subject: 'Mathematics',
  college: 'Delhi University',
  description: 'Discuss calculus doubts.',
  isPrivate: false,
  createdBy: null, // Will be set to admin ID
  participants: [] // Add users later
};

// Connect and seed
// const seedDB = async () => {
//   try {
//     await connectDB();
//     console.log('DB connected for seeding...');

//     // Clear existing data (optional—comment for prod)
//     await User.deleteMany();
//     await Note.deleteMany();
//     await ChatRoom.deleteMany();
//     console.log('Cleared existing data');

const seedDB = async () => {
  try {
    await connectDB();
    console.log('DB connected for seeding...');

    // FIXED: Clear only if needed (comment for prod)
    // await User.deleteMany(); // Comment to avoid deleting manual users

    // Create/upsert users (safe for re-run)
    const createdUsers = [];
    for (let u of users) {
      u.password = await bcrypt.hash(u.password, 12);
      const user = await User.findOneAndUpdate(
        { email: u.email },
        { $set: u }, // Upsert: Update if exists, insert if not
        { upsert: true, new: true }
      );
      createdUsers.push(user);
      console.log(`User ${u.name} (role: ${u.role}) - ${user._id}`);
    }

    // Create notes (link to first user)
    notes[0].uploader = createdUsers[0]._id;
    for (let n of notes) {
      await Note.findOneAndUpdate(
        { title: n.title },
        { $set: n },
        { upsert: true, new: true }
      );
      console.log(`Created note: ${n.title}`);
    }

    // Create chat room (link to admin)
    chatRoom.createdBy = createdUsers[1]._id;
    chatRoom.participants = [createdUsers[0]._id, createdUsers[1]._id];
    const room = new ChatRoom(chatRoom);
    await room.save();
    console.log(`Created room: ${chatRoom.name}`);

    console.log('Seeding complete! Check DB.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedDB();