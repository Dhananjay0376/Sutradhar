/**
 * Ollama Backend API for Sutradhar
 * Provides real AI generation using Ollama (runs natively, much faster than browser WASM)
 */

import express from 'express';
import cors from 'cors';
import { Readable } from 'stream';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/**
 * POST /api/generate-calendar
 * Generate calendar titles using Ollama
 */
app.post('/api/generate-calendar', async (req, res) => {
  const { niche, numPosts, platform, language, tone } = req.body;

  console.log('[API] Generating calendar titles:', { niche, numPosts, platform });

  const prompt = `Generate ${numPosts} ${tone.toLowerCase()} ${platform} post titles about ${niche} in ${language}.
Return ONLY a JSON array of strings. No explanation.

Example: ["Title 1", "Title 2", "Title 3"]

Your response:`;

  try {
    // Call Ollama API with streaming
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:1b',
        prompt: prompt,
        stream: true,
        options: {
          temperature: 0.7,
          num_predict: 150, // Max tokens
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    // Set up SSE streaming to frontend
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let accumulated = '';

    // Stream chunks from Ollama to frontend
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) {
            accumulated += json.response;
            
            // Send token to frontend
            res.write(`data: ${JSON.stringify({ token: json.response, accumulated })}\n\n`);
          }

          if (json.done) {
            console.log('[API] Generation complete:', accumulated.length, 'chars');
            res.write(`data: ${JSON.stringify({ done: true, text: accumulated })}\n\n`);
            res.end();
            return;
          }
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health
 * Check if Ollama is running
 */
app.get('/api/health', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      res.json({ status: 'ok', ollama: 'running' });
    } else {
      res.status(503).json({ status: 'error', message: 'Ollama not responding' });
    }
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Ollama not running' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Sutradhar API running on http://localhost:${PORT}`);
  console.log('✅ Ollama backend enabled');
  console.log('📡 Endpoints:');
  console.log('   POST /api/generate-calendar');
  console.log('   GET  /api/health');
});
