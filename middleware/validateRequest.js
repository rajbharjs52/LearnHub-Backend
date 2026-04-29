// middleware/validateRequest.js
const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    // Validate only the keys defined in schema (ignores extras like params if not specified)
    const { error } = schema.validate(req, { abortEarly: false, allowUnknown: true });

    if (error) {
      const messages = error.details.map(detail => detail.message.replace(/["'\\]/g, ''));
      return res.status(400).json({ 
        msg: messages.join(', ') 
      });
    }

    next();
  };
};

// Signup schema (body only)
const userSignupSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({ 'string.min': 'Name must be at least 2 characters' }),
    email: Joi.string().email().required().messages({ 'string.email': 'Valid email required' }),
    password: Joi.string().min(6).required().messages({ 'string.min': 'Password must be at least 6 characters' }),
    college: Joi.string().min(2).required().messages({ 'string.min': 'College name required' }),
    course: Joi.string().min(2).required().messages({ 'string.min': 'Course name required' })
  })
});

// Note schema (body only, for create/update)
const noteSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().min(5).max(200).required().messages({ 'string.min': 'Title must be at least 5 characters' }),
    subject: Joi.string().min(2).required(),
    college: Joi.string().min(2).required(),
    description: Joi.string().max(1000).allow('').messages({ 'string.max': 'Description too long' }),
    tags: Joi.string().max(200).allow('').messages({ 'string.max': 'Tags too long' })
  })
});

// Comment schema example (add more as needed)
const commentSchema = Joi.object({
  body: Joi.object({
    text: Joi.string().min(1).max(500).required().messages({ 'string.min': 'Comment cannot be empty' }),
    parentComment: Joi.string().allow('', null).messages({ 'string.base': 'Invalid parent comment ID' })
  })
});

module.exports = { 
  validateRequest, 
  userSignupSchema, 
  noteSchema, 
  commentSchema 
};