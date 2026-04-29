// // controllers/likeController.js
// const Note = require('../models/Note');
// const Comment = require('../models/Comment');

// const likeController = {
//   // Like/unlike note
//   async toggleNoteLike(req, res) {
//     try {
//       const note = await Note.findById(req.params.id);
//       if (!note) return res.status(404).json({ msg: 'Note not found' });

//       const userId = req.user.id;
//       const likeIndex = note.likes.indexOf(userId);

//       if (likeIndex > -1) {
//         note.likes.splice(likeIndex, 1); // Unlike
//         await note.save();
//         res.json({ msg: 'Unliked', likeCount: note.likes.length });
//       } else {
//         note.likes.push(userId); // Like
//         await note.save();
//         res.json({ msg: 'Liked', likeCount: note.likes.length });
//       }
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ msg: 'Server error' });
//     }
//   },

//   // Like/unlike comment
//   async toggleCommentLike(req, res) {
//     try {
//       const comment = await Comment.findById(req.params.commentId);
//       if (!comment) return res.status(404).json({ msg: 'Comment not found' });

//       const userId = req.user.id;
//       const likeIndex = comment.likes.indexOf(userId);

//       if (likeIndex > -1) {
//         comment.likes.splice(likeIndex, 1);
//         await comment.save();
//         res.json({ msg: 'Unliked', likeCount: comment.likes.length });
//       } else {
//         comment.likes.push(userId);
//         await comment.save();
//         res.json({ msg: 'Liked', likeCount: comment.likes.length });
//       }
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ msg: 'Server error' });
//     }
//   }
// };

// module.exports = likeController;

// controllers/likeController.js
const Note = require('../models/Note');
const Comment = require('../models/Comment');

const likeController = {
  // Like/unlike note
  async toggleNoteLike(req, res) {
    try {
      const note = await Note.findById(req.params.id); // Fixed: Use 'id' from route param
      if (!note) return res.status(404).json({ msg: 'Note not found' });

      const userId = req.user.id;
      const likeIndex = note.likes.indexOf(userId);

      if (likeIndex > -1) {
        note.likes.splice(likeIndex, 1); // Unlike
        await note.save();
        res.json({ msg: 'Unliked', likeCount: note.likes.length });
      } else {
        note.likes.push(userId); // Like
        await note.save();
        res.json({ msg: 'Liked', likeCount: note.likes.length });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // Like/unlike comment
  async toggleCommentLike(req, res) {
    try {
      const comment = await Comment.findById(req.params.id); // Fixed: Use 'id' (adjust route if param is 'commentId')
      if (!comment) return res.status(404).json({ msg: 'Comment not found' });

      const userId = req.user.id;
      const likeIndex = comment.likes.indexOf(userId);

      if (likeIndex > -1) {
        comment.likes.splice(likeIndex, 1);
        await comment.save();
        res.json({ msg: 'Unliked', likeCount: comment.likes.length });
      } else {
        comment.likes.push(userId);
        await comment.save();
        res.json({ msg: 'Liked', likeCount: comment.likes.length });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
};

module.exports = likeController;