const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Grab the secret key from the GitHub environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateNews() {
  try {
    console.log("Waking up Gemini AI...");
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    
    const prompt = `You are a professional tech journalist. 
    Write 5 detailed, brand-new articles covering today's advancements in AI, LLMs, Robotics, or Silicon.
    
    IMPORTANT: You must return ONLY a raw JSON array of objects. Do not include markdown formatting like \`\`\`json.
    
    Each object must have exactly these keys: 
    "title": A catchy headline.
    "category": One of [LLMs, Computer Vision, Robotics, Hardware, Policy].
    "tags": An array of 3 relevant string tags.
    "content": The detailed, multi-paragraph text of the article. Use \\n\\n for paragraph breaks.
    "image": "https://picsum.photos/800/600?random=" plus a random number from 1 to 1000.
    "date": "August 15, 2026".`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // We strip out any accidental markdown formatting from Gemini
    const articlesJSON = result.response.text().replace(/```json\n?|```/g, '').trim();
    console.log("News generated! Updating website...");
    
    let htmlFile = fs.readFileSync('index.html', 'utf-8');
    
    const regex = /\/\/ --- BEGIN AI ARTICLES ---[\s\S]*?\/\/ --- END AI ARTICLES ---/;
    const replacement = `// --- BEGIN AI ARTICLES ---\nconst fallbackArticles = ${articlesJSON};\n// --- END AI ARTICLES ---`;
    
    htmlFile = htmlFile.replace(regex, replacement);
    
    fs.writeFileSync('index.html', htmlFile);
    console.log("Success! index.html has been updated.");

  } catch (error) {
    console.error("Error generating news:", error);
    process.exit(1); 
  }
}

generateNews();
