const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Grab the secret keys from the GitHub environment
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
    "date": "August 16, 2026".`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // Strip markdown formatting from Gemini
    const rawText = result.response.text().replace(/```json\n?|```/g, '').trim();
    const articlesArray = JSON.parse(rawText);
    
    console.log("News generated! Updating website...");
    
    // Read and update index.html
    let htmlFile = fs.readFileSync('index.html', 'utf-8');
    const regex = /\/\/ --- BEGIN AI ARTICLES ---[\s\S]*?\/\/ --- END AI ARTICLES ---/;
    const replacement = `// --- BEGIN AI ARTICLES ---\nconst fallbackArticles = ${rawText};\n// --- END AI ARTICLES ---`;
    htmlFile = htmlFile.replace(regex, replacement);
    fs.writeFileSync('index.html', htmlFile);
    console.log("Success! index.html has been updated.");

    // Send formatted drafts to Discord for Substack review
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      console.log("Sending articles to Discord for Substack review...");
      
      for (const article of articlesArray) {
        // Format the message cleanly for Discord
        const message = `📰 **[${article.category}]**\n### **${article.title}**\n\n${article.content}\n\n*Tags: ${article.tags.join(', ')}* \n----------------------------------------`;
        
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message })
        });

        // Pause for 1 second between messages to prevent Discord rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log("All articles successfully broadcasted to Discord!");
    }

  } catch (error) {
    console.error("Error generating news:", error);
    process.exit(1); 
  }
}

generateNews();
