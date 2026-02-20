const express = require('express');
const { GoogleGenAI } = require("@google/genai"); // Ensure you're using this package
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

// 1. New Initialization: Pass the API key inside an object
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/chat', async (req, res) => {
    try {
        // 2. New Calling Pattern: ai.models.generateContent
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: "user", parts: [{ text: req.body.prompt }] }]
        });

        // 3. Simpler Text Access
        const aiText = response.text; 

        console.log("Gemini says:", aiText);
        res.json({ text: aiText });
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('✅ Server running on http://localhost:3000'));