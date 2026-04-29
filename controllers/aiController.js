// controllers/aiController.js
const { HfInference } = require('@huggingface/inference');
const AISummary = require('../models/AISummary');
const Note = require('../models/Note');

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const aiController = {

  // ✅ NEW: Called from SingleNote frontend
  // POST /api/ai/summarize
  // Body: { text: string, noteId: string }
  async summarizeText(req, res) {
    try {
      const { text, noteId } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({ msg: 'No text provided to summarize' });
      }

      if (text.trim().length < 30) {
        return res.status(400).json({ msg: 'Text too short — paste more content for a useful summary' });
      }

      // Truncate to avoid HF token overflow (BART supports ~1024 tokens)
      const inputText = text.trim().slice(0, 3000);

      let summaryText = '';

      try {
        const result = await hf.summarization({
          model: 'facebook/bart-large-cnn',
          inputs: inputText,
          parameters: {
            min_length: 40,
            max_length: 200,
            do_sample: false,
          },
        });
        summaryText = result.summary_text || '';
      } catch (hfErr) {
        console.error('[AI] HuggingFace error:', hfErr.message);
        return res.status(503).json({ msg: 'AI service unavailable — try again in a moment' });
      }

      if (!summaryText.trim()) {
        return res.status(500).json({ msg: 'Generated summary was empty — try with more text' });
      }

      // ✅ Optionally save to DB if noteId provided
      if (noteId) {
        try {
          const note = await Note.findById(noteId);
          if (note) {
            // Remove old summary if exists so we can regenerate
            const existing = await AISummary.findOne({ note: noteId });
            if (existing) {
              existing.content = summaryText;
              existing.tokensUsed = inputText.length;
              existing.aiModel = 'bart-large-cnn';
              await existing.save();
              // Make sure note points to it
              if (!note.summary) {
                note.summary = existing._id;
                await note.save();
              }
            } else {
              const summary = new AISummary({
                note: noteId,
                content: summaryText,
                aiModel: 'bart-large-cnn',
                tokensUsed: inputText.length,
              });
              await summary.save();
              note.summary = summary._id;
              await note.save();
            }
          }
        } catch (dbErr) {
          // Don't fail the request if DB save fails — still return summary
          console.error('[AI] DB save error:', dbErr.message);
        }
      }

      res.json({ summary: summaryText });

    } catch (err) {
      console.error('[AI] summarizeText error:', err);
      res.status(500).json({ msg: 'AI generation failed' });
    }
  },

  // ✅ KEPT: Old endpoint — generates summary from note's own PDF/description
  // POST /api/ai/summary/:noteId
  async generateSummary(req, res) {
    try {
      const note = await Note.findById(req.params.noteId).populate('summary');
      if (!note) return res.status(404).json({ msg: 'Note not found' });

      let text = note.description || '';

      if (!text.trim()) {
        return res.status(400).json({ msg: 'No text to summarize' });
      }

      if (text.length < 50) {
        text = `${text} This is a study note on ${note.subject} from ${note.college}. Tags: ${note.tags.join(', ')}.`;
      }

      let summaryText = '';
      try {
        const result = await hf.summarization({
          model: 'facebook/bart-large-cnn',
          inputs: text.slice(0, 1024),
          parameters: { min_length: 50, max_length: 200, do_sample: false },
        });
        summaryText = result.summary_text || '';
      } catch (hfErr) {
        console.error('[AI] HF Error:', hfErr.message);
        return res.status(503).json({ msg: 'Summarization service unavailable' });
      }

      if (!summaryText.trim()) {
        return res.status(400).json({ msg: 'Generated summary is empty — try longer text' });
      }

      // Update or create
      let summary = await AISummary.findOne({ note: note._id });
      if (summary) {
        summary.content = summaryText;
        summary.tokensUsed = text.length;
        await summary.save();
      } else {
        summary = new AISummary({
          note: note._id,
          content: summaryText,
          aiModel: 'bart-large-cnn',
          tokensUsed: text.length,
        });
        await summary.save();
        note.summary = summary._id;
        await note.save();
      }

      res.json(summary);
    } catch (err) {
      console.error('[AI] generateSummary error:', err);
      res.status(500).json({ msg: 'AI generation failed' });
    }
  },
};

module.exports = aiController;