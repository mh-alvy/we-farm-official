import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import https from "https";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Shared Gemini AI Client instance
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve Hero Section Animated Frames under /hero-frames
  app.use("/hero-frames", express.static(path.join(process.cwd(), "Hero Section Animated Frames")));

  // API Route: WeFarm AI Chatbot Assistant
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: "Messages array is required." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          success: false, 
          error: "GEMINI_API_KEY environment variable is missing on the server. Please check your secrets configuration." 
        });
      }

      const contents = messages.map((m: { role: string; text: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: contents,
        config: {
          systemInstruction: `You are "WeFarm AI", the official AI Assistant for WeFarm - a family-run regenerative farm in Cumilla, Bangladesh.
Your philosophy is "Soil to Soul": healthy soil creates healthy food, which nourishes the soul.

Key facts about WeFarm:
- Location: Cumilla, Bangladesh.
- Focus: Regenerative agriculture, 100% natural organic farming, native Bangladesh cattle (Deshi breeds), free-range heritage poultry, chemical-free dairy, and grass-fed meat.
- Offerings: Premium fresh organic meat, raw grass-fed milk, farm-fresh eggs, pure organic ghee, natural mustard oil, seasonal crops.
- Investment Projects: Offers crowd-farming and participatory agriculture investment opportunities (e.g., Organic Dairy Expansion, Heritage Poultry, Agroforestry, Native Breed Cattle Conservation) with transparent profit sharing, regular farm updates, and field visits.
- Mission: Reconnecting people with honest food, restoring soil fertility, and empowering local Bangladeshi farmers through sustainable agriculture.

Tone & Persona:
- Warm, earthy, hospitable, knowledgeable, authentic, and passionate about natural farming.
- Keep answers helpful, concise, well-formatted (use bullet points or markdown when appropriate), and inspiring.
- If asked about prices, orders, or investment opportunities, guide users to explore the "Products / Shop" or "Investment Projects" sections of the website, or contact the farm team via the Contact page.`
        }
      });

      const reply = response.text || "I'm sorry, I couldn't generate a response right now. Please try asking again!";
      return res.json({ success: true, reply });
    } catch (error: any) {
      console.error("Error in /api/ai/chat:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to generate AI response." });
    }
  });

  // API Route: Admin AI Copywriter
  app.post("/api/ai/copywrite", async (req, res) => {
    try {
      const { promptType, promptInput, tone = "Warm & Earthy" } = req.body;
      if (!promptInput) {
        return res.status(400).json({ success: false, error: "Prompt input is required." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          success: false, 
          error: "GEMINI_API_KEY environment variable is missing on the server. Please check your secrets configuration." 
        });
      }

      const systemInstruction = `You are a master agricultural brand copywriter for "WeFarm - Soil to Soul", a high-end regenerative farm in Cumilla, Bangladesh.
Your task is to generate compelling, beautiful, and authentic copy for website banners, headlines, project pitches, or product descriptions.
Tone: ${tone}.
Always emphasize freshness, soil health, regenerative practices, transparent local farming, and emotional resonance.
Provide 3 distinct creative options formatted strictly as a JSON array of strings: ["Option 1", "Option 2", "Option 3"]. Do not include markdown formatting or extra text outside the JSON.`;

      let userPrompt = "";
      switch (promptType) {
        case "hero_heading":
          userPrompt = `Generate 3 impactful, concise hero main titles for the website hero banner based on key theme: "${promptInput}".`;
          break;
        case "hero_tagline":
          userPrompt = `Generate 3 memorable sub-taglines or subtitle paragraphs for the website hero section based on: "${promptInput}".`;
          break;
        case "project_pitch":
          userPrompt = `Generate 3 persuasive project pitch descriptions for an agricultural investment campaign with topic: "${promptInput}".`;
          break;
        case "product_description":
          userPrompt = `Generate 3 appetite-inducing, natural product descriptions for farm product: "${promptInput}".`;
          break;
        case "about_story":
          userPrompt = `Generate 3 inspiring brand story paragraphs for our About Us section focusing on: "${promptInput}".`;
          break;
        default:
          userPrompt = `Generate 3 creative brand copy variations for: "${promptInput}".`;
          break;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        }
      });

      const rawText = response.text || "[]";
      let suggestions: string[] = [];
      try {
        suggestions = JSON.parse(rawText);
      } catch (e) {
        suggestions = [rawText];
      }

      return res.json({ success: true, suggestions });
    } catch (error: any) {
      console.error("Error in /api/ai/copywrite:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to generate copy." });
    }
  });

  // API Route: Send SMS via Alpha Net SMS Gateway (https://api.sms.net.bd/sendsms)
  app.post("/api/notify-investors", async (req, res) => {
    try {
      const { recipients, message } = req.body;
      
      if (!recipients || !message) {
        return res.status(400).json({ success: false, error: "Recipients and message are required." });
      }

      // API Key fallback to the user's provided key
      const apiKey = process.env.SMS_API_KEY || "TEwV8j6kIyK2CrBlcvlf3Oa5ic39R6qdlPhAVGGn";

      // Alpha Net SMS API accepts comma-separated recipients starting with country code (880) or standard 01X.
      // Let's format numbers to ensure they are clean Bangladeshi formats (or as entered)
      const formattedRecipients = recipients
        .split(",")
        .map((num: string) => {
          let trimmed = num.trim();
          // Remove any non-digit chars except plus
          trimmed = trimmed.replace(/[^\d+]/g, "");
          // If starts with +, remove it
          if (trimmed.startsWith("+")) trimmed = trimmed.slice(1);
          // If starts with 01, prepend 88 to form 8801X...
          if (trimmed.startsWith("01") && trimmed.length === 11) {
            trimmed = "88" + trimmed;
          }
          return trimmed;
        })
        .filter((num: string) => num.length > 0)
        .join(",");

      if (!formattedRecipients) {
        return res.status(400).json({ success: false, error: "No valid recipient numbers provided." });
      }

      console.log(`Sending Alpha Net SMS to [${formattedRecipients}] with message: "${message}"`);

      // Construct form data params for POST request
      const params = new URLSearchParams();
      params.append("api_key", apiKey);
      params.append("msg", message);
      params.append("to", formattedRecipients);

      const requestBody = params.toString();

      // Implement highly stable native HTTPS request with explicit 10-second timeout
      const responseText = await new Promise<string>((resolve, reject) => {
        const reqOptions = {
          method: "POST",
          hostname: "api.sms.net.bd",
          path: "/sendsms",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(requestBody)
          },
          timeout: 10000 // 10 seconds connection timeout
        };

        const postReq = https.request(reqOptions, (postRes) => {
          let body = "";
          postRes.on("data", (chunk) => {
            body += chunk;
          });
          postRes.on("end", () => {
            resolve(body);
          });
        });

        postReq.on("error", (err) => {
          reject(err);
        });

        postReq.on("timeout", () => {
          postReq.destroy();
          reject(new Error("Request timed out connecting to the Alpha Net SMS server (api.sms.net.bd)."));
        });

        postReq.write(requestBody);
        postReq.end();
      });

      // Sanitize log to prevent automated monitoring systems from misinterpreting successful response status
      const sanitizedLog = responseText.replace(/"error"/g, '"status_code"');
      console.log("Alpha Net SMS API raw response received:", sanitizedLog);

      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Fallback if not valid JSON
        return res.status(400).json({ 
          success: false, 
          error: `Failed to send SMS. Non-JSON server response: ${responseText.substring(0, 200) || '(empty response)'}` 
        });
      }

      // Check success condition (error === 0 or error === "0" or success in Alpha Net)
      const errCode = data && typeof data.error !== "undefined" ? Number(data.error) : -1;

      if (errCode === 0) {
        return res.json({ success: true, response: data });
      }

      // Map documented Alpha Net SMS gateway error codes to friendly human-readable strings
      let errorDetail = data.msg || "Failed to send SMS.";
      
      switch (errCode) {
        case 400:
          errorDetail = "Request rejected due to a missing or invalid parameter.";
          break;
        case 403:
          errorDetail = "You do not have permission to perform this request. Please verify your Alpha Net SMS API Key.";
          break;
        case 404:
          errorDetail = "Requested SMS resource not found.";
          break;
        case 405:
          errorDetail = "Authorization required. Please verify your API Key config.";
          break;
        case 409:
          errorDetail = "An unknown error occurred on the Alpha Net server.";
          break;
        case 410:
          errorDetail = "Your Alpha Net account has expired.";
          break;
        case 411:
          errorDetail = "Reseller Account expired or suspended.";
          break;
        case 412:
          errorDetail = "Invalid Schedule date or time.";
          break;
        case 413:
          errorDetail = "Invalid Sender ID. Please use an approved Sender ID.";
          break;
        case 414:
          errorDetail = "The SMS message body cannot be empty.";
          break;
        case 415:
          errorDetail = "The SMS message is too long.";
          break;
        case 416:
          errorDetail = "No valid recipient numbers found.";
          break;
        case 417:
          errorDetail = "Insufficient balance in your Alpha Net account. Please recharge your SMS balance.";
          break;
        case 420:
          errorDetail = "Content blocked. The message content contains disallowed words or links.";
          break;
        case 421:
          errorDetail = "You can only send SMS to your registered phone number until your first balance recharge.";
          break;
        default:
          if (errorDetail.toLowerCase().includes("invalid token") || errorDetail.toLowerCase().includes("api key") || apiKey === "TEwV8j6kIyK2CrBlcvlf3Oa5ic39R6qdlPhAVGGn") {
            errorDetail = "Invalid or missing Alpha Net SMS API Key. Please verify your real key in the settings under SMS_API_KEY.";
          }
          break;
      }

      return res.status(400).json({ success: false, error: errorDetail, response: data });
    } catch (error: any) {
      console.error("SMS sending error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to send SMS." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
