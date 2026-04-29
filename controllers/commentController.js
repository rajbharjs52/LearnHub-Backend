// controllers/commentController.js
const mongoose = require('mongoose'); // ✅ Added
const Comment = require('../models/Comment');
const Note = require('../models/Note');

const commentController = {

  async createComment(req, res) {
    const { text, parentComment } = req.body;
    const noteId = req.params.id;

    try {
      // ✅ Validate noteId
      if (!mongoose.Types.ObjectId.isValid(noteId)) {
        return res.status(400).json({ msg: 'Invalid note ID' });
      }

      if (!text || !text.trim()) {
        return res.status(400).json({ msg: 'Comment text is required' });
      }

      const note = await Note.findById(noteId);
      if (!note) return res.status(404).json({ msg: 'Note not found' });

      const comment = new Comment({
        note: noteId,
        user: req.user.id,
        text: text.trim(),
        parentComment: parentComment || null,
      });

      await comment.save();
      await comment.populate('user', 'name profilePic');

      note.comments.push(comment._id);
      await note.save();

      res.status(201).json(comment);
    } catch (err) {
      console.error('[Comment] createComment error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  async getComments(req, res) {
    const noteId = req.params.id;
    try {
      // ✅ Validate noteId before querying
      if (!mongoose.Types.ObjectId.isValid(noteId)) {
        return res.status(400).json({ msg: 'Invalid note ID' });
      }

      const comments = await Comment.find({ note: noteId, parentComment: null })
        .populate('user', 'name profilePic')
        .sort({ createdAt: 1 });

      res.json(comments);
    } catch (err) {
      console.error('[Comment] getComments error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  async updateComment(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.commentId)) {
        return res.status(400).json({ msg: 'Invalid comment ID' });
      }

      const comment = await Comment.findById(req.params.commentId);
      if (!comment) return res.status(404).json({ msg: 'Comment not found' });
      if (comment.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'Not authorized' });
      }

      comment.text = req.body.text || comment.text;
      await comment.save();
      res.json(comment);
    } catch (err) {
      console.error('[Comment] updateComment error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  async deleteComment(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.commentId)) {
        return res.status(400).json({ msg: 'Invalid comment ID' });
      }

      const comment = await Comment.findById(req.params.commentId);
      if (!comment) return res.status(404).json({ msg: 'Comment not found' });
      if (comment.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'Not authorized' });
      }

      await Note.updateOne({ _id: comment.note }, { $pull: { comments: comment._id } });
      await Comment.deleteMany({ parentComment: comment._id });
      await comment.deleteOne();
      res.json({ msg: 'Comment deleted' });
    } catch (err) {
      console.error('[Comment] deleteComment error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },
};

module.exports = commentController;