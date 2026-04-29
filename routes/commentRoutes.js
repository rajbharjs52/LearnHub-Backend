// // routes/commentRoutes.js
// const express = require('express');
// const router = express.Router();
// const Comment = require('../models/Comment'); // For schema-based validation
// const authMiddleware = require('../middleware/authMiddleware');
// const { validateRequest } = require('../middleware/validateRequest');

// // Simple schema for comments
// const commentSchema = require('../middleware/validateRequest').commentSchema || {
//   body: {
//     text: { string: { min: 1, required: true } },
//     parentComment: { string: { allow: '' } }
//   }
// };

// // POST /api/comments/:noteId (protected)
// router.post('/:noteId', authMiddleware, validateRequest(commentSchema), async (req, res) => {
//   // Controller logic here or extract to commentController
//   const { text, parentComment } = req.body;
//   const comment = new Comment({
//     note: req.params.noteId,
//     user: req.user.id,
//     text,
//     parentComment: parentComment || null
//   });
//   await comment.save();
//   await comment.populate('user', 'name');
//   res.status(201).json(comment);
// });

// // GET /api/comments/:noteId (public or protected)
// router.get('/:noteId', authMiddleware, async (req, res) => {
//   const comments = await Comment.find({ note: req.params.noteId })
//     .populate('user', 'name')
//     .populate('parentComment')
//     .sort({ createdAt: -1 });
//   res.json(comments);
// });

// // PUT /api/comments/:commentId (protected, owner only)
// router.put('/:commentId', authMiddleware, async (req, res) => {
//   const comment = await Comment.findById(req.params.commentId);
//   if (comment.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
//   comment.text = req.body.text || comment.text;
//   await comment.save();
//   res.json(comment);
// });

// // DELETE /api/comments/:commentId (protected, owner only)
// router.delete('/:commentId', authMiddleware, async (req, res) => {
//   const comment = await Comment.findById(req.params.commentId);
//   if (comment.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
//   await comment.deleteOne();
//   res.json({ msg: 'Comment deleted' });
// });


// module.exports = router;

// routes/commentRoutes.js
const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Note = require('../models/Note'); // Added for linking
const {authMiddleware} = require('../middleware/authMiddleware');
const { validateRequest, commentSchema } = require('../middleware/validateRequest'); // Fixed import & schema

// POST /api/comm+ents/:noteId (protected)
router.post('/:noteId', authMiddleware, validateRequest(commentSchema), async (req, res) => {
  const { text, parentComment } = req.body;
  const noteId = req.params.noteId;

  try {
    const note = await Note.findById(noteId);
    if (!note) return res.status(404).json({ msg: 'Note not found' });

    const comment = new Comment({
      note: noteId,
      user: req.user.id,
      text,
      parentComment: parentComment || null // For replies
    });

    await comment.save();
    await comment.populate('user', 'name profilePic'); // Populate user

    // Link to note's comments array
    note.comments.push(comment._id);
    await note.save();

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/comments/:noteId (public—view all comments on note)
router.get('/:noteId', async (req, res) => { // Removed auth for public view
  const noteId = req.params.noteId;

  try {
    const comments = await Comment.find({ note: noteId })
      .populate('user', 'name profilePic')
      .populate('parentComment', 'text user') // For threading
      .sort({ createdAt: -1 }); // Newest first
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/comments/:commentId (protected, owner only)
router.put('/:commentId', authMiddleware, async (req, res) => {
  const commentId = req.params.commentId;

  try {
    const comment = await Comment.findById(commentId).populate('user', 'name');
    if (!comment) return res.status(404).json({ msg: 'Comment not found' });

    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const { text } = req.body;
    comment.text = text || comment.text;
    await comment.save();

    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE /api/comments/:commentId (protected, owner only)
router.delete('/:commentId', authMiddleware, async (req, res) => {
  const commentId = req.params.commentId;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ msg: 'Comment not found' });

    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // Remove from note's comments array
    await Note.updateOne(
      { _id: comment.note },
      { $pull: { comments: commentId } }
    );

    // Delete direct replies (simple cascade)
    await Comment.deleteMany({ parentComment: commentId });

    await comment.deleteOne();
    res.json({ msg: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;