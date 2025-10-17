import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import axios from "axios";
const app = express();
app.use(cors({
  origin:"http://localhost:5001"
}));
app.use(express.json());

const PORT = process.env.PORT || 5001;
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Offline mock captions
const offlineCaptions = [
  topic => `Here’s a hilarious meme about ${topic}! 😂`,
  topic => `${topic}? More like 'laugh out loud' material! 🤣`,
  topic => `When life gives you ${topic}, make memes! 😎`,
  topic =>` Just saw a meme about ${topic} and I can't stop laughing! 🤭`,
  topic => `Warning: ${topic} may cause uncontrollable laughter! 🤪`
];

// Generate Meme Caption (Gemini 2.5 Flash)
app.post("/generate", async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Topic is required" });

  // Try Gemini API if key exists
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                { text: `Write a funny meme caption about: ${topic}` }
              ]
            }
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
        },
        { headers: { "Content-Type": "application/json" } }
      );

      // Gemini returns candidates[0].content.parts[0].text
      const candidates = response.data?.candidates;
      let caption = null;
      if (
        Array.isArray(candidates) &&
        candidates[0]?.content?.parts &&
        Array.isArray(candidates[0].content.parts) &&
        candidates[0].content.parts[0]?.text
      ) {
        caption = candidates[0].content.parts[0].text;
        console.log("Caption (Gemini) sent:", caption);
        return res.json({ caption });
      } else {
        console.warn("Gemini response missing or empty:", JSON.stringify(response.data));
        const fallback = offlineCaptions[Math.floor(Math.random() * offlineCaptions.length)](topic);
        return res.json({ caption: fallback });
      }

    } catch (err) {
      console.warn("Gemini API failed, using offline caption:", err.message);
      const fallback = offlineCaptions[Math.floor(Math.random() * offlineCaptions.length)](topic);
      return res.json({ caption: fallback });
    }
  }

  // If no Gemini API key, return offline caption
  const caption = offlineCaptions[Math.floor(Math.random() * offlineCaptions.length)](topic);
  console.log("Offline caption sent:", caption);
  res.json({ caption });
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});