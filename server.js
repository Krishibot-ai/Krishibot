// KrishiBot — Render.com Express Server
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public')); // index.html यहाँ से serve होगा

// API Route — Groq Key Safe है!
app.post('/api/chat', async (req, res) => {
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_KEY) {
    return res.status(500).json({ error: { message: 'GROQ_API_KEY not set in Render' } });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: req.body.messages,
        temperature: 0.7,
        max_tokens: 600
      })
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: { message: 'Server Error: ' + err.message } });
  }
});

// सभी routes index.html पर
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`KrishiBot चल रहा है Port ${PORT} पर! 🌾`));
