"use server";

import { GoogleGenAI } from "@google/genai";
import { env } from "./config";

const geminiAI = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

import { logger } from "./logger";
import { Message } from "./types";

export async function generateGeminiResponse(
  prompt: string,
  chatHistory?: Message[]
) {
  try {
    const model = "gemini-2.5-pro";

    let conversationContext = "";
    if (chatHistory && chatHistory.length > 0) {
      conversationContext = "\n\nPrevious conversation context:\n";
      for (const msg of chatHistory) {
        const role = msg.role === "user" ? "User" : "Assistant";
        conversationContext += `${role}: ${msg.content}\n\n`;
      }
    }

    const enhancedPrompt = `
You are a code generation AI that creates complete, runnable, multi-file projects. Based on the user's request, generate a FULL project structure with ALL necessary files for immediate execution.

CRITICAL REQUIREMENTS:
- Generate COMPLETE, PRODUCTION-READY projects that can run immediately
- Include ALL required files - do NOT omit any essential files
- For React apps: MUST include public/index.html, src/index.js, src/App.js, src/index.css, and package.json with ALL dependencies
- For any web app: Include proper HTML entry point, CSS, JavaScript, and configuration files
- Ensure proper file structure and naming conventions
- Add modern dependencies and proper package.json scripts
- Include README.md with setup instructions

CRITICAL: Your response MUST be ONLY valid JSON with NO markdown formatting, NO code blocks, NO backticks, NO explanations, NO string escaping. Just pure, clean JSON that can be directly parsed.

DO NOT wrap your response in quotes or escape any characters. Return raw JSON directly.

Return your response in EXACTLY this JSON format:
{
  "files": [
    {
      "path": "src/App.js",
      "content": "// file content here"
    },
    {
      "path": "package.json", 
      "content": "{\n  \"name\": \"...\"\n}"
    }
  ]
}

Rules:
1. For React apps: ALWAYS include public/index.html, src/index.js (entry point), src/App.js (main component), src/index.css (styles), package.json (with react, react-dom, react-scripts), and README.md
2. For HTML projects: Include index.html, styles.css, script.js, and assets
3. For Python projects: Include main.py, requirements.txt, README.md, and modules
4. For Node.js: Include server.js, package.json, routes, and middleware
5. Always include proper project structure and ALL necessary dependencies
6. Make projects production-ready and functional
7. Include modern styling and best practices
8. Add README.md with setup instructions
9. Return ONLY valid JSON, no other text, no markdown, no explanations
10. DO NOT escape quotes or wrap the entire response in quotes
11. CRITICAL: Do NOT omit essential files like index.html, index.js, or package.json

Previous Conversation:${conversationContext}
Current User Request: ${prompt}

Based on the conversation context above, generate the COMPLETE project structure with ALL required files as clean JSON ONLY. If the user is asking to modify existing code, ensure you return the MODIFIED versions of the files with the changes applied.`;

    const response = await geminiAI.models.generateContent({
      model: model,
      contents: enhancedPrompt,
    });

    let responseText = response.text || "";

    if (responseText.includes("```json")) {
      responseText = responseText
        .replace(/```json\s*/g, "")
        .replace(/```\s*$/g, "");
    }

    if (responseText.startsWith("```")) {
      responseText = responseText
        .replace(/^```[a-zA-Z]*\n?/, "")
        .replace(/```$/, "");
    }

    responseText = responseText.trim();

    if (responseText.startsWith('"') && responseText.endsWith('"')) {
      try {
        responseText = JSON.parse(responseText);
      } catch {}
    }

    return responseText;
  } catch (error) {
    logger.error("Error generating content with Gemini", error);
    throw new Error(
      `Failed to generate content: ${
        (error as Error).message || "Unknown error"
      }`
    );
  }
}
