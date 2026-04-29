// controllers/notesController.js
const mongoose = require('mongoose');
const Note = require('../models/Note');
const User = require('../models/User');
const https = require('https');
const http = require('http');
const { getSignedUrl } = require('../config/cloudinary');

const notesController = {

  async getNotes(req, res) {
    try {
      const { subject, college, tags, search } = req.query;
      let query = {};

      if (subject) query.subject = subject;
      if (college) query.college = college;
      if (tags) query.tags = { $in: tags.split(',') };
      if (search) query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];

      const notes = await Note.find(query)
        .populate('uploader', 'name college')
        .populate('summary', 'content')
        .sort({ createdAt: -1 })
        .limit(20);

      const notesWithTags = notes.map(note => {
        const noteObj = note.toObject();
        if (!noteObj.tags) noteObj.tags = [];
        else if (typeof noteObj.tags === 'string') {
          noteObj.tags = noteObj.tags.split(',').map(t => t.trim()).filter(Boolean);
        } else if (!Array.isArray(noteObj.tags)) {
          noteObj.tags = [];
        }
        return noteObj;
      });

      res.json({ notes: notesWithTags });
    } catch (err) {
      console.error('Get notes error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

async getNote(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ msg: 'Invalid note ID' });
    }

    const note = await Note.findById(req.params.id)
      .populate('uploader', 'name college profilePic')
      .populate('summary', 'content');
      // ✅ Removed .populate('comments') — comments fetched separately
      // via GET /api/notes/:id/comments to avoid the 500 crash

    if (!note) return res.status(404).json({ msg: 'Note not found' });

    const noteObj = note.toObject();

    if (!noteObj.tags) noteObj.tags = [];
    else if (typeof noteObj.tags === 'string') {
      noteObj.tags = noteObj.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // ✅ Send empty array — frontend loads comments via separate endpoint
    noteObj.comments = [];

    res.json(noteObj);
  } catch (err) {
    console.error('Get note error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
},

  // ✅ Updated createNote — handles 3 file fields
  async createNote(req, res) {
    try {
      const { title, subject, college, tags: tagsString, description } = req.body;
      const uploader = req.user.id;

      let tags = [];
      if (tagsString && typeof tagsString === 'string') {
        tags = [...new Set(
          tagsString.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
        )];
      }

      // ✅ req.files is an object when using .fields()
      // req.files.file[0]         — main note file
      // req.files.coverImage[0]   — cover thumbnail
      // req.files.previewImage[0] — preview image
      const noteFile = req.files?.file?.[0];
      const coverFile = req.files?.coverImage?.[0];
      const previewFile = req.files?.previewImage?.[0];

      if (!noteFile) {
        return res.status(400).json({ msg: 'Note file is required' });
      }

      const fileUrl = noteFile.path;
      const originalFileName = noteFile.originalname;

      // Cloudinary puts the URL in .path for CloudinaryStorage
      const coverImage = coverFile ? coverFile.path : null;
      const previewImage = previewFile ? previewFile.path : null;

      console.log('[createNote] fileUrl:', fileUrl);
      console.log('[createNote] coverImage:', coverImage);
      console.log('[createNote] previewImage:', previewImage);

      const note = new Note({
        title,
        subject,
        college,
        tags,
        description,
        uploader,
        fileUrl,
        originalFileName,
        coverImage,    // ✅ user-uploaded cover
        previewImage,  // ✅ user-uploaded preview
      });

      await note.save();
      const savedNote = await Note.findById(note._id).populate('uploader', 'name college');
      res.status(201).json(savedNote);

    } catch (err) {
      console.error('Create note error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  async downloadNote(req, res) {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).json({ msg: 'Note not found' });
      if (!note.fileUrl) return res.status(404).json({ msg: 'No file attached' });

      const signedUrl = getSignedUrl(note.fileUrl, 60);
      if (!signedUrl) return res.status(500).json({ msg: 'Could not generate download URL' });

      const isPdf = note.fileUrl.includes('/raw/upload/') || note.fileUrl.toLowerCase().includes('.pdf');
      const ext = isPdf ? '.pdf' : '.jpg';
      const contentType = isPdf ? 'application/pdf' : 'image/jpeg';
      const rawName = note.originalFileName || `${note.title}${ext}`;
      const filename = rawName.replace(/[^\w.\-]/g, '_');

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', contentType);

      const streamFile = (url) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (fileStream) => {
          if (fileStream.statusCode === 301 || fileStream.statusCode === 302) {
            return streamFile(fileStream.headers.location);
          }
          if (fileStream.statusCode !== 200) {
            console.error('[Download] Cloudinary returned:', fileStream.statusCode);
            if (!res.headersSent) res.status(502).json({ msg: 'Failed to fetch file from storage' });
            return;
          }
          fileStream.pipe(res);
        }).on('error', (err) => {
          console.error('[Download] Stream error:', err);
          if (!res.headersSent) res.status(500).json({ msg: 'Download stream failed' });
        });
      };

      streamFile(signedUrl);
    } catch (err) {
      console.error('[Download] Controller error:', err);
      if (!res.headersSent) res.status(500).json({ msg: 'Server error' });
    }
  },

  async getPreviewUrl(req, res) {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).json({ msg: 'Note not found' });

      // ✅ Just return the stored previewImage URL — no streaming needed
      if (note.previewImage) {
        return res.json({ previewUrl: note.previewImage });
      }

      // Fallback to coverImage if no preview
      if (note.coverImage) {
        return res.json({ previewUrl: note.coverImage });
      }

      return res.status(404).json({ msg: 'No preview available' });
    } catch (err) {
      console.error('[Preview] Error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  async updateNote(req, res) {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).json({ msg: 'Note not found' });
      if (note.uploader.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

      if (req.body.tags && typeof req.body.tags === 'string') {
        req.body.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }

      Object.assign(note, req.body);
      await note.save();
      res.json(note);
    } catch (err) {
      console.error('Update note error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  },

  async deleteNote(req, res) {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ msg: 'Note not found' });

    // ✅ Allow delete if user is the uploader OR an admin
    const isUploader = note.uploader.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isUploader && !isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to delete this note' });
    }

    await note.deleteOne();
    res.json({ msg: 'Note deleted successfully' });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
},

  async toggleLike(req, res) {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).json({ msg: 'Note not found' });

      const userId = req.user.id;
      const likeIndex = note.likes.indexOf(userId);

      if (likeIndex > -1) {
        note.likes.splice(likeIndex, 1);
      } else {
        note.likes.push(userId);
      }

      await note.save();
      res.json({ msg: likeIndex > -1 ? 'Unliked' : 'Liked', likeCount: note.likes.length });
    } catch (err) {
      console.error('Toggle like error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
};

module.exports = notesController;