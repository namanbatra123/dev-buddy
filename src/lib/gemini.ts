"use server";

import { GoogleGenAI } from "@google/genai";

const geminiAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

import { logger } from "./logger";

export async function generateGeminiResponse(prompt: string) {
  try {
    const model = "gemini-2.5-flash";

    // Enhanced prompt to generate multi-file projects
    const enhancedPrompt = `
You are a code generation AI that creates complete, multi-file projects. Based on the user's request, generate a complete project structure with multiple files.

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
1. For React apps: Include App.js, components, package.json, README.md, and CSS files
2. For HTML projects: Include index.html, styles.css, script.js, and assets
3. For Python projects: Include main.py, requirements.txt, README.md, and modules
4. For Node.js: Include server.js, package.json, routes, and middleware
5. Always include proper project structure and dependencies
6. Make projects production-ready and functional
7. Include modern styling and best practices
8. Add README.md with setup instructions
9. Return ONLY valid JSON, no other text, no markdown, no explanations
10. DO NOT escape quotes or wrap the entire response in quotes

User Request: ${prompt}

Generate the complete project structure as clean JSON ONLY:`;

    const response = await geminiAI.models.generateContent({
      model: model,
      contents: enhancedPrompt,
    });

    let responseText = response.text || "";

    // Clean up the response - remove markdown formatting if present
    if (responseText.includes("```json")) {
      responseText = responseText
        .replace(/```json\s*/g, "")
        .replace(/```\s*$/g, "");
    }

    // Remove backticks if they exist
    if (responseText.startsWith("```")) {
      responseText = responseText
        .replace(/^```[a-zA-Z]*\n?/, "")
        .replace(/```$/, "");
    }

    // Remove any leading/trailing whitespace
    responseText = responseText.trim();

    // If the response is a string literal (starts and ends with quotes), parse it first
    if (responseText.startsWith('"') && responseText.endsWith('"')) {
      try {
        responseText = JSON.parse(responseText);
      } catch (e) {
        // Silent fail, proceed with original
      }
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
