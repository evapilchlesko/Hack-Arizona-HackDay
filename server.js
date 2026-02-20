const express = require('express');
const { GoogleGenAI } = require("@google/genai"); // Ensure you're using this package
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});


// --- 1. DATABASE CONNECTION ---
// Make sure to add MONGODB_URI to your .env file
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_app')
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Could not connect to MongoDB", err));

// --- 2. USER MODEL ---
const userSchema = new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// --- 3. MIDDLEWARE TO PROTECT AI ROUTE (Optional) ---
// Use this if you only want logged-in users to use Gemini
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied. Please login." });

    jwt.verify(token, process.env.JWT_SECRET || 'your_fallback_secret', (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.user = user;
        next();
    });
};

// --- 4. AUTH ROUTES ---

// SIGNUP
app.post('/api/signup', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ fullName, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        res.status(400).json({ error: "User already exists or invalid data" });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_fallback_secret', { expiresIn: '24h' });
        res.json({ token, user: { name: user.fullName, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
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