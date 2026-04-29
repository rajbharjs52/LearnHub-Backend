// controllers/postController.js
const Post = require('../models/Note'); // Reuse Note model for posts

const postController = {
  // Create post (quick share)
  async createPost(req, res) {
    const { content, tags } = req.body; // Short text post

    try {
      const post = new Post({
        title: 'Quick Share', // Auto-title
        description: content,
        tags: tags ? tags.split(',') : [],
        uploader: req.user.id
      });

      await post.save();
      await post.populate('uploader', 'name');

      res.status(201).json(post);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  // Get user posts
  async getUserPosts(req, res) {
    try {
      const posts = await Post.find({ uploader: req.params.userId })
        .populate('uploader', 'name')
        .sort({ createdAt: -1 });

      res.json(posts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
};

module.exports = postController;