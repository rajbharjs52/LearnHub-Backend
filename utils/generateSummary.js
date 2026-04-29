// utils/generateSummary.js
const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const AISummary = require('../models/AISummary');
const AppError = require('./errorHandler');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const generateSummary = async (noteId, noteText = '') => {
  try {
    // If no text provided, fetch from note/file
    let text = noteText;
    if (!text) {
      const Note = require('../models/Note');
      const note = await Note.findById(noteId);
      if (!note) throw new AppError('Note not found', 404);

      text = note.description || '';
      if (note.fileUrl && note.fileUrl.includes('.pdf')) {
        const response = await fetch(note.fileUrl);
        if (!response.ok) throw new AppError('Failed to fetch PDF', 500);
        const buffer = Buffer.from(await response.arrayBuffer());
        const data = await pdfParse(buffer);
        text += ` ${data.text}`;
      }
    }

    // Generate summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `Generate a concise 200-word summary of this study note. Highlight key concepts, formulas, and tips. Make it student-friendly: ${text}`
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const summaryText = completion.choices[0].message.content.trim();
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Save to DB
    const summary = new AISummary({
      note: noteId,
      content: summaryText,
      aiModel: 'gpt-3.5-turbo',
      tokensUsed,
      keywords: summaryText.match(/\b\w{4,}\b/g)?.slice(0, 10) || [] // Simple keyword extract
    });
    await summary.save();

    return summary;
  } catch (err) {
    console.error('Summary generation error:', err);
    throw new AppError('Failed to generate summary', 500);
  }
};

module.exports = generateSummary;