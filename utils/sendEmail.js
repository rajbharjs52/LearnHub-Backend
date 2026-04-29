// utils/sendEmail.js
const nodemailer = require('nodemailer');
const AppError = require('./errorHandler');

// Transporter setup (e.g., Gmail)
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST, // e.g., 'smtp.gmail.com'
  port: process.env.EMAIL_PORT, // 587
  secure: false, // true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // App password for Gmail
  }
});

// Verify on startup (optional)
transporter.verify((error, success) => {
  if (error) console.error('Email transporter error:', error);
  else console.log('Email ready');
});

const sendEmail = async (to, subject, text, html = null) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html // Optional HTML version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('Email send error:', err);
    throw new AppError('Failed to send email', 500);
  }
};

module.exports = sendEmail;