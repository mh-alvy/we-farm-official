import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const DEFAULT_SMS_API_KEY = "TEwV8j6kIyK2CrBlcvlf3Oa5ic39R6qdlPhAVGGn";
const DEFAULT_OTP_TEMPLATE = "WeFarm Investor Login OTP: {otp}. Valid for 5 minutes. Do not share this code.";
const SMS_CONFIG_CACHE_PATH = "/tmp/wefarm-sms-config.json";
const OTP_LOGS_CACHE_PATH = "/tmp/wefarm-otp-logs.json";

interface ServerSmsConfig {
  apiKey: string;
  senderId: string;
  defaultContentId: string;
  otpTemplate: string;
  updatedAt?: string;
}

interface ServerOtpLog {
  id: string;
  requestId?: string;
  recipients: string[];
  recipientCount: number;
  message: string;
  type: "otp";
  status: "Submitted" | "Failed";
  errorCode?: number;
  errorMessage?: string;
  senderId?: string;
  createdAt: string;
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing on the server. Please check your secrets configuration.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function loadSmsConfig(): ServerSmsConfig {
  const base: ServerSmsConfig = {
    apiKey: process.env.SMS_API_KEY || DEFAULT_SMS_API_KEY,
    senderId: "",
    defaultContentId: "",
    otpTemplate: DEFAULT_OTP_TEMPLATE,
  };
  try {
    if (fs.existsSync(SMS_CONFIG_CACHE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(SMS_CONFIG_CACHE_PATH, "utf-8"));
      return {
        apiKey: (parsed.apiKey && String(parsed.apiKey).trim()) || base.apiKey,
        senderId: typeof parsed.senderId === "string" ? parsed.senderId.trim() : "",
        defaultContentId: typeof parsed.defaultContentId === "string" ? parsed.defaultContentId.trim() : "",
        otpTemplate: (parsed.otpTemplate && String(parsed.otpTemplate).trim()) || DEFAULT_OTP_TEMPLATE,
        updatedAt: parsed.updatedAt,
      };
    }
  } catch (err) {
    console.warn("Could not read cached SMS config:", err);
  }
  return base;
}

function saveSmsConfig(cfg: ServerSmsConfig): void {
  try {
    fs.writeFileSync(SMS_CONFIG_CACHE_PATH, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist SMS config cache:", err);
  }
}

function loadOtpLogs(): ServerOtpLog[] {
  try {
    if (fs.existsSync(OTP_LOGS_CACHE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(OTP_LOGS_CACHE_PATH, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function appendOtpLog(entry: ServerOtpLog): void {
  try {
    const existing = loadOtpLogs();
    const updated = [entry, ...existing].slice(0, 100);
    fs.writeFileSync(OTP_LOGS_CACHE_PATH, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist OTP log cache:", err);
  }
}

function normalizeBdPhone(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  // Handle accidental 88001XXXXXXXXX -> 01XXXXXXXXX
  if (digits.startsWith("88001") && digits.length === 14) {
    digits = digits.slice(3);
  } else if (digits.startsWith("8801") && digits.length === 13) {
    digits = digits.slice(2);
  } else if (digits.startsWith("008801") && digits.length === 15) {
    digits = digits.slice(4);
  } else if (digits.startsWith("1") && digits.length === 10) {
    digits = "0" + digits;
  }
  return digits;
}

function formatAlphaNetNumber(raw: string): string | null {
  const canonical = normalizeBdPhone(raw);
  if (!canonical) return null;
  if (canonical.startsWith("01") && canonical.length === 11) {
    return "88" + canonical;
  }
  if (canonical.length >= 10 && canonical.length <= 15) {
    return canonical;
  }
  return null;
}

function mapAlphaNetError(errCode: number, rawMsg?: string): string {
  switch (errCode) {
    case 0:
      return "Success";
    case 400:
      return "Request rejected due to a missing or invalid parameter.";
    case 403:
      return "Permission denied by Alpha Net SMS. Please verify your API Key.";
    case 404:
      return "Requested SMS API endpoint or resource was not found.";
    case 405:
      return "Authorization required. Please verify your Alpha Net SMS API Key.";
    case 409:
      return "An unknown error occurred on the Alpha Net SMS server.";
    case 410:
      return "Your Alpha Net SMS account has expired.";
    case 411:
      return "Reseller account expired or suspended.";
    case 412:
      return "Invalid Schedule date/time format. Must be YYYY-MM-DD HH:mm:ss.";
    case 413:
      return "Invalid Sender ID. Leave Sender ID blank or use an approved Sender ID.";
    case 414:
      return "The SMS message body cannot be empty.";
    case 415:
      return "The SMS message is too long.";
    case 416:
      return "No valid recipient phone numbers found.";
    case 417:
      return "Insufficient balance in your Alpha Net SMS account. Please recharge.";
    case 420:
      return "Content blocked by SMS gateway. Check your message wording or approved content ID.";
    case 421:
      return "You can only send SMS to your registered phone number until your first balance recharge.";
    default:
      return rawMsg || `SMS Gateway error (Code: ${errCode}).`;
  }
}

async function callAlphaNetGet(endpointPath: string, queryParams: Record<string, string>) {
  const url = new URL(`https://api.sms.net.bd${endpointPath}`);
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      url.searchParams.set(k, String(v));
    }
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const responseText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      return {
        ok: false,
        errorCode: -1,
        msg: `Non-JSON response from SMS Gateway (HTTP ${response.status}): ${responseText.slice(0, 180)}`,
        data: null,
      };
    }

    const errCode = data && typeof data.error !== "undefined" ? Number(data.error) : -1;
    return {
      ok: errCode === 0,
      errorCode: errCode,
      msg: errCode === 0 ? (data.msg || "Success") : mapAlphaNetError(errCode, data.msg),
      data,
    };
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    return {
      ok: false,
      errorCode: -1,
      msg: isAbort
        ? "Connection timed out while contacting api.sms.net.bd."
        : (err?.message || "Failed to connect to api.sms.net.bd."),
      data: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function sendAlphaNetSms(options: {
  apiKey: string;
  to: string;
  msg: string;
  schedule?: string;
  senderId?: string;
  contentId?: string;
}) {
  const params: Record<string, string> = {
    api_key: options.apiKey,
    msg: options.msg,
    to: options.to,
  };
  if (options.schedule?.trim()) params.schedule = options.schedule.trim();
  if (options.senderId?.trim()) params.sender_id = options.senderId.trim();
  if (options.contentId?.trim()) params.content_id = options.contentId.trim();

  // Per api.sms.net.bd docs, GET uses URL encoding; for very large bulk payloads fall back to POST form-urlencoded
  if (options.msg.length + options.to.length < 1500) {
    const result = await callAlphaNetGet("/sendsms", params);
    const requestId = result.data?.data?.request_id !== undefined ? String(result.data.data.request_id) : undefined;
    return { ...result, requestId };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const body = new URLSearchParams(params);
    const response = await fetch("https://api.sms.net.bd/sendsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: controller.signal,
    });
    const responseText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      return {
        ok: false,
        errorCode: -1,
        msg: `Non-JSON response from SMS Gateway (HTTP ${response.status}): ${responseText.slice(0, 180)}`,
        data: null,
        requestId: undefined,
      };
    }
    const errCode = data && typeof data.error !== "undefined" ? Number(data.error) : -1;
    const requestId = data?.data?.request_id !== undefined ? String(data.data.request_id) : undefined;
    return {
      ok: errCode === 0,
      errorCode: errCode,
      msg: errCode === 0 ? (data.msg || "Request successfully submitted") : mapAlphaNetError(errCode, data.msg),
      data,
      requestId,
    };
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    return {
      ok: false,
      errorCode: -1,
      msg: isAbort
        ? "Connection timed out while contacting api.sms.net.bd."
        : (err?.message || "Failed to connect to api.sms.net.bd."),
      data: null,
      requestId: undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  let smsConfig = loadSmsConfig();

  app.use(express.json());

  // Serve Hero Section Animated Frames under /hero-frames
  app.use("/hero-frames", express.static(path.join(process.cwd(), "Hero Section Animated Frames")));

  // Helper: Convert English digits <-> Bengali digits
  const EN_DIGITS = "0123456789";
  const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
  function toBengaliDigits(str: string): string {
    return str.replace(/[0-9]/g, (d) => BN_DIGITS[EN_DIGITS.indexOf(d)] || d);
  }
  function toEnglishDigits(str: string): string {
    return str.replace(/[০-৯]/g, (d) => EN_DIGITS[BN_DIGITS.indexOf(d)] || d);
  }

  // Curated WeFarm agricultural & investment bilingual copy pairs for instant eloquent polishing
  const CURATED_EN_TO_BN: Record<string, string> = {
    "soil to soul": "মাটি থেকে আত্মার বন্ধন",
    "fresh farm products from our farm": "আমাদের খামার থেকে সরাসরি তাজা ও বিশুদ্ধ পণ্য",
    "honest food from honest soil": "খাঁটি মাটির নির্ভেজাল ও নিরাপদ খাবার",
    "experience regenerative agriculture": "প্রকৃতিবান্ধব আধুনিক কৃষির অনন্য অভিজ্ঞতা",
    "rooted in the philosophy of soil to soul. we practice regenerative farming to bring you meat and dairy that nourishes the body and respects the earth.":
      "মাটি থেকে আত্মার দর্শনে অনুপ্রাণিত হয়ে আমরা প্রাকৃতিক ও টেকসই পদ্ধতিতে খামার পরিচালনা করি—যেন প্রতিটি খাবারে থাকে বিশুদ্ধ পুষ্টি এবং প্রকৃতির প্রতি ভালোবাসা।",
    "why choose us": "কেন আমাদের বেছে নেবেন",
    "experience the difference of real farming": "প্রকৃত ও প্রাকৃতিক খামারের পার্থক্য অনুভব করুন",
    "natural farming": "প্রাকৃতিক কৃষি পদ্ধতি",
    "regenerative practices that work with nature, not against it.":
      "প্রকৃতির সাথে সামঞ্জস্য রেখে মাটির উর্বরতা ও পরিবেশ রক্ষাকারী কৃষি ব্যবস্থা।",
    "healthy animals": "সুস্থ ও সবল প্রাণিসম্পদ",
    "free-range livestock raised on natural diets without hormones.":
      "কোনো ক্ষতিকর হরমোন বা অ্যান্টিবায়োটিক ছাড়াই প্রাকৃতিক খাদ্যে বেড়ে ওঠা গবাদিপশু।",
    "fresh products": "সতেজ ও নির্ভেজাল পণ্য",
    "farm-to-table freshness delivered with care and speed.":
      "খামার থেকে সরাসরি আপনার ঘরে যত্ন ও দ্রুততার সাথে পৌঁছে দেওয়া তাজা পণ্য।",
    "trusted farm": "বিশ্বস্ত ও স্বচ্ছ ব্যবস্থাপনা",
    "transparent practices you can trust, from soil to soul.":
      "মাটি থেকে পাত পর্যন্ত শতভাগ স্বচ্ছ ও নির্ভরযোগ্য খামার ব্যবস্থাপনা।",
    "happy animals": "সুস্থ প্রাণিসম্পদ",
    "natural soil": "প্রাকৃতিক মাটি",
    "fresh deliveries": "সফল ডেলিভারি",
    "successful projects": "সফল প্রোজেক্ট",
    "about wefarm": "উইফার্ম সম্পর্কে",
    "from soil to soul — our promise": "মাটি থেকে আত্মা — আমাদের অঙ্গীকার",
    "wefarm was born from a belief that food should be grown with integrity. we're a family-run regenerative farm committed to nourishing communities while healing the land.":
      "খাদ্য উৎপাদনে সততা ও বিশুদ্ধতার বিশ্বাস থেকেই উইফার্মের জন্ম। আমরা একটি পারিবারিক ও প্রকৃতিবান্ধব খামার, যা মাটির স্বাস্থ্য রক্ষা করে মানুষের কাছে পুষ্টিকর খাবার পৌঁছে দিতে প্রতিশ্রুতিবদ্ধ।",
    "our vision": "আমাদের লক্ষ্য ও স্বপ্ন",
    "\"to create a world where every meal is a connection to the earth, where farming heals instead of harms, and where communities thrive on the bounty of honest soil.\"":
      "\"এমন এক পৃথিবী গড়ে তোলা যেখানে প্রতিটি খাবার হবে প্রকৃতির সাথে সেতুবন্ধন, যেখানে কৃষি প্রকৃতিকে ক্ষতির বদলে সজীব করবে এবং মানুষ খাঁটি মাটির ফসলে সমৃদ্ধ হবে।\"",
    "our products": "আমাদের পণ্যসমূহ",
    "fresh products directly from wefarm to your table.":
      "উইফার্মের খামার থেকে সরাসরি আপনার খাবার টেবিলে তাজা ও অর্গানিক পণ্য।",
    "our projects": "আমাদের প্রোজেক্টসমূহ",
    "invest in sustainable future": "টেকসই ও সবুজ ভবিষ্যতে বিনিয়োগ করুন",
    "join the soil to soul movement. support our regenerative farming projects and earn returns while healing the earth.":
      "মাটি থেকে আত্মার এই যাত্রায় যুক্ত হোন। আমাদের প্রকৃতিবান্ধব কৃষি প্রোজেক্টে বিনিয়োগ করে হালাল ও স্বচ্ছ লভ্যাংশ অর্জনের পাশাপাশি প্রকৃতি রক্ষায় অংশ নিন।",
    "get in touch": "যোগাযোগ করুন",
    "contact wefarm": "উইফার্মের সাথে যোগাযোগ করুন",
    "reach out via whatsapp or fill the form below — we'd love to hear from you.":
      "হোয়াটসঅ্যাপের মাধ্যমে বা নিচের ফর্মটি পূরণ করে আমাদের সাথে যোগাযোগ করুন — আমরা আপনার বার্তার অপেক্ষায় আছি।",
    "location": "ঠিকানা",
    "whatsapp": "হোয়াটসঅ্যাপ",
    "email": "ইমেইল",
    "frequently asked questions": "সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)",
    "everything you need to know about wefarm and our farming ecosystem.":
      "উইফার্ম এবং আমাদের কৃষি ও বিনিয়োগ ব্যবস্থা সম্পর্কে আপনার মনে থাকা সকল প্রশ্নের উত্তর।",
    "everything you need to know about agrovest and our farming ecosystem.":
      "উইফার্ম এবং আমাদের কৃষি ও বিনিয়োগ ব্যবস্থা সম্পর্কে আপনার মনে থাকা সকল প্রশ্নের উত্তর।",
  };

  const CURATED_BN_TO_EN: Record<string, string> = Object.entries(CURATED_EN_TO_BN).reduce(
    (acc, [en, bn]) => {
      acc[bn.trim()] = en
        .replace(/\bwefarm\b/gi, "WeFarm")
        .replace(/(^\w|\.\s+\w)/g, (m) => m.toUpperCase());
      return acc;
    },
    {} as Record<string, string>
  );

  // Neural Translation + Domain Copy Polisher fallback when Gemini API credits are depleted (402)
  async function fallbackNeuralTranslateSingle(
    rawText: string,
    targetLang: "bn" | "en"
  ): Promise<string> {
    const trimmed = (rawText || "").trim();
    if (!trimmed) return "";

    // If pure numeric/stat string like "50+", "100%", "1000+", "24/7"
    if (/^[0-9০-৯+%.,/\-\s]+$/.test(trimmed)) {
      return targetLang === "bn" ? toBengaliDigits(trimmed) : toEnglishDigits(trimmed);
    }

    // Check curated dictionary first
    if (targetLang === "bn") {
      const hit = CURATED_EN_TO_BN[trimmed.toLowerCase()];
      if (hit) return hit;
    } else {
      const hit = CURATED_BN_TO_EN[trimmed];
      if (hit) return hit;
    }

    const sourceLang = targetLang === "bn" ? "en" : "bn";
    try {
      const url = new URL("https://translate.googleapis.com/translate_a/single");
      url.searchParams.set("client", "gtx");
      url.searchParams.set("sl", sourceLang);
      url.searchParams.set("tl", targetLang);
      url.searchParams.set("dt", "t");
      url.searchParams.set("q", trimmed);

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          let result = data[0]
            .map((segment: any) => (Array.isArray(segment) && segment[0] ? String(segment[0]) : ""))
            .join("")
            .trim();

          if (targetLang === "bn") {
            // Polish common agricultural & brand terms in Bengali
            result = result
              .replace(/WeFarm/gi, "উইফার্ম")
              .replace(/AgroVest/gi, "উইফার্ম")
              .replace(/রিজেনারেটিভ ফার্মিং/g, "প্রকৃতিবান্ধব কৃষি")
              .replace(/রিজেনারেটিভ কৃষি/g, "প্রকৃতিবান্ধব কৃষি");
          } else {
            result = result.replace(/Wefarm/g, "WeFarm");
          }

          if (result) return result;
        }
      }
    } catch (err) {
      console.warn("Neural translate fallback warning:", err);
    }

    return targetLang === "bn" ? toBengaliDigits(trimmed) : toEnglishDigits(trimmed);
  }

  async function fallbackNeuralTranslateBatch(
    items: string[],
    targetLang: "bn" | "en"
  ): Promise<string[]> {
    return Promise.all(items.map((item) => fallbackNeuralTranslateSingle(item, targetLang)));
  }

  let geminiCreditExhausted = false;
  function markIfCreditExhausted(err: any) {
    const msg = String(err?.message || err || "");
    if (msg.includes("402") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("prepayment credits")) {
      geminiCreditExhausted = true;
    }
  }

  // Helper to build real-time dynamic Chatbot system prompt with live projects & products
  function buildChatbotInstruction(context?: { projects?: any[]; products?: any[] }): string {
    let projectsSection = "";
    if (context?.projects && Array.isArray(context.projects) && context.projects.length > 0) {
      projectsSection = context.projects.map((p, i) => {
        const batchesStr = p.batches && p.batches.length > 0
          ? p.batches.map((b: any) => `${b.batchName || 'Batch'} (${b.durationMonths || 12} months)`).join(", ")
          : "Standard batch";
        return `Project #${i + 1}: ${p.title} ${p.titleBn ? `(${p.titleBn})` : ''}
  - Category / Profit Model: ${p.profitType === 'monthly' ? 'Monthly Profit Payout (প্রতি মাসে নিয়মিত লভ্যাংশ)' : 'One-time Return at Maturity (মেয়াদান্তে এককালীন মূলধন ও লাভ)'}
  - Minimum Investment: ৳${Number(p.minInvestment || 0).toLocaleString()} BDT
  - Expected Annual ROI / Profit Rate: ${p.roiRate || '18-24'}%
  - Funding Progress: ৳${Number(p.currentAmount || 0).toLocaleString()} raised of ৳${Number(p.targetAmount || 0).toLocaleString()} BDT target
  - Project Status: ${p.status || 'Active'}
  - Active Batches: ${batchesStr}
  - Description: ${p.description || p.descriptionBn || 'Sustainable agriculture crowd-farming project.'}`;
      }).join("\n\n");
    } else {
      projectsSection = `Project #1: Organic Dairy Farm Expansion (অর্গানিক ডেইরি ফার্ম সম্প্রসারণ)
  - Profit Model: Monthly Profit Payout (প্রতি মাসে লভ্যাংশ)
  - Minimum Investment: ৳50,000 BDT
  - Expected Annual ROI / Profit Rate: 18-22%
  - Description: High-yield dairy cattle farming for raw milk production in Cumilla with regular field visits.

Project #2: Free-Range Heritage Poultry (দেশি মুরগি ও হাঁস পালন প্রকল্প)
  - Profit Model: Monthly Profit Payout (প্রতি মাসে লভ্যাংশ)
  - Minimum Investment: ৳30,000 BDT
  - Expected Annual ROI / Profit Rate: 20-25%
  - Description: Natural heritage chicken and duck farming for organic meat and free-range brown eggs.

Project #3: Native Breed Cattle Conservation (দেশি গরু মোটাতাজাকরণ ও সংরক্ষণ)
  - Profit Model: One-time Return at Maturity (কোরবানি/মেয়াদান্তে এককালীন লভ্যাংশ)
  - Minimum Investment: ৳100,000 BDT
  - Expected Annual ROI / Profit Rate: 22-26%
  - Description: Ethical, 100% grass-fed native Red Chittagong and Pabna cattle farming.`;
    }

    let productsSection = "";
    if (context?.products && Array.isArray(context.products) && context.products.length > 0) {
      productsSection = context.products.map((p, i) => {
        const stockText = p.stock !== undefined && Number(p.stock) <= 0 
          ? "Out of Stock (বর্তমানে স্টক শেষ)" 
          : `In Stock (${p.stock} ${p.unit} available)`;
        return `Product #${i + 1}: ${p.name} ${p.nameBn ? `(${p.nameBn})` : ''}
  - Price: ৳${p.price} BDT per ${p.unit}
  - Availability: ${stockText}
  - Details: ${p.description || p.descriptionBn || '100% authentic, farm-fresh regenerative produce.'}`;
      }).join("\n\n");
    } else {
      productsSection = `Product #1: Pure Grass-fed Cow Milk (খাঁটি কাঁচা দুধ) - ৳120 BDT per Liter (In Stock)
Product #2: Premium Fresh Beef (দেশি গরুর মাংস) - ৳850 BDT per Kg (In Stock)
Product #3: Pure Deshi Cow Ghee (খাঁটি গাওয়া ঘি) - ৳1,800 BDT per Kg (In Stock)
Product #4: Free-Range Organic Eggs (দেশি মুরগির ডিম) - ৳180 BDT per Dozen (In Stock)
Product #5: Cold-Pressed Mustard Oil (খাঁটি সরিষার তেল) - ৳350 BDT per Liter (In Stock)`;
    }

    return `You are "WeFarm AI", the official intelligent virtual assistant for WeFarm — an authentic regenerative agriculture farm and crowd-farming platform located in Cumilla, Bangladesh.
Philosophy: "Soil to Soul" (সুস্থ জীবন্ত মাটি থেকে সৎ ও খাঁটি পুষ্টিকর খাদ্য, যা মানবদেহ ও আত্মাকে তৃপ্ত করে)।

==============================================================
CRITICAL LANGUAGE MATCHING RULE (সবচেয়ে গুরুত্বপূর্ণ নিয়ম):
==============================================================
1. IF THE USER ASKS OR GREETS IN ENGLISH:
   -> You MUST respond 100% in natural, fluent, hospitable, and professional English.
   -> Do NOT respond in Bengali if the user's latest query is in English.
2. IF THE USER ASKS OR GREETS IN BENGALI (বাংলা হরফে বা Banglish/ইংরেজি হরফে বাংলা লিখলে):
   -> You MUST respond 100% in polite, warm, elegant, and standard Bengali (সাবলীল ও প্রমিত বাংলা).
   -> Do NOT respond in English if the user wrote in Bengali or Banglish.
3. Automatically detect the user's language on every message and match it accurately without awkward code-switching.

==============================================================
YOUR CORE KNOWLEDGE & CAPABILITIES:
==============================================================
- You have COMPLETE, LIVE, and real-time knowledge of all WeFarm investment projects and farm products listed below.
- Whenever a user asks about prices, stock availability, how to order, minimum investment requirements, ROI / return rates, profit payout models, batches, or farming practices, answer with the EXACT numbers and details from the live knowledge base below.
- Keep answers helpful, structured with clean bullet points or bold text where appropriate, and inviting.
- When an investor shows interest, guide them to visit the "Projects (প্রোজেক্টসমূহ)" tab on the website or sign in with their phone/email to apply.
- When a customer wants to buy food, guide them to visit the "Shop / Products (পণ্যসমূহ)" tab or contact via WhatsApp/phone.

==============================================================
LIVE WEFARM INVESTMENT PROJECTS:
==============================================================
${projectsSection}

==============================================================
LIVE WEFARM FARM PRODUCTS (SHOP):
==============================================================
${productsSection}

==============================================================
FARM LOCATION & POLICIES:
==============================================================
- Location: Cumilla, Bangladesh (খামার: কুমিল্লা, বাংলাদেশ)।
- Farming Practices: 100% natural, grass-fed, zero chemical pesticides, zero synthetic hormones, ethical animal care.
- Support & Ordering: Home delivery available across Bangladesh. Direct inquiries welcomed via WhatsApp and website.`;
  }

  // API Route: WeFarm AI Chatbot Assistant
  app.post("/api/ai/chat", async (req, res) => {
    const { messages, context } = req.body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: "Messages array is required." });
    }

    if (!geminiCreditExhausted) {
      try {
        const ai = getAiClient();
        const contents = messages.map((m: { role: string; text: string }) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        }));

        const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        const systemInstruction = buildChatbotInstruction(context);

        const response = await ai.models.generateContent({
          model: geminiModel,
          contents,
          config: {
            systemInstruction,
          },
        });

        const reply = response.text || "I'm sorry, I couldn't generate a response right now. Please try asking again!";
        return res.json({ success: true, reply });
      } catch (error: any) {
        markIfCreditExhausted(error);
      }
    }

    // Dynamic Intelligent Fallback when Gemini is unavailable or credits are depleted
    const lastMsg = String(messages[messages.length - 1]?.text || "").trim();
    const lastMsgLower = lastMsg.toLowerCase();
    const isBangla = /[\u0980-\u09FF]/.test(lastMsg) || 
      /\b(apnader|koto|taka|biniyog|prokolpo|purno|dam|lagbe|hobe|kivabe|acha|bhalo|kichu|chai|khabar|dudh|mangsho|ghee|dim|tel|kharid|kena)\b/i.test(lastMsgLower);

    const projs = (context?.projects && Array.isArray(context.projects) && context.projects.length > 0) ? context.projects : null;
    const prods = (context?.products && Array.isArray(context.products) && context.products.length > 0) ? context.products : null;

    let reply = "";
    if (isBangla) {
      if (lastMsgLower.includes("ইনভেস্ট") || lastMsgLower.includes("বিনিয়োগ") || lastMsgLower.includes("প্রোজেক্ট") || lastMsgLower.includes("মুনাফা") || lastMsgLower.includes("invest") || lastMsgLower.includes("project")) {
        if (projs) {
          const pList = projs.slice(0, 3).map((p: any) => `• **${p.titleBn || p.title}**: সর্বনিম্ন বিনিয়োগ ৳${Number(p.minInvestment || 0).toLocaleString()} (প্রত্যাশিত রিটার্ন ${p.roiRate || 20}%)`).join("\n");
          reply = `উইফার্মের চলমান কৃষি ও ডেইরি প্রকল্পসমূহে আপনাকে স্বাগতম!\n\nআমাদের বর্তমান প্রধান প্রকল্পসমূহ:\n${pList}\n\nবিস্তারিত জানতে এবং সরাসরি যুক্ত হতে ওয়েবসাইটের **প্রোজেক্টসমূহ (Invest)** সেকশনটি ঘুরে দেখুন।`;
        } else {
          reply = "উইফার্ম (WeFarm)-এ আপনাকে স্বাগতম! আমাদের চলমান কৃষি ও ডেইরি প্রোজেক্টগুলোতে আপনি মাসিক লভ্যাংশ অথবা এককালীন প্রফিট শেয়ারিং পদ্ধতিতে বিনিয়োগ করতে পারেন। বিস্তারিত জানতে ওয়েবসাইটের **প্রোজেক্টসমূহ** পেইজটি দেখুন।";
        }
      } else if (lastMsgLower.includes("পণ্য") || lastMsgLower.includes("দুধ") || lastMsgLower.includes("মাংস") || lastMsgLower.includes("ঘি") || lastMsgLower.includes("ডিম") || lastMsgLower.includes("অর্ডার") || lastMsgLower.includes("দাম") || lastMsgLower.includes("product") || lastMsgLower.includes("dam") || lastMsgLower.includes("price")) {
        if (prods) {
          const prList = prods.slice(0, 4).map((p: any) => `• **${p.nameBn || p.name}**: ৳${p.price} / ${p.unit}`).join("\n");
          reply = `আমাদের খামারের ১০০% ন্যাচারাল অর্গানিক পণ্যসমূহ:\n${prList}\n\nসরাসরি অর্ডার করতে ওয়েবসাইটের **পণ্যসমূহ (Shop)** পেইজে ভিজিট করুন অথবা আমাদের সাথে যোগাযোগ করুন।`;
        } else {
          reply = "আমাদের খামার থেকে সরাসরি ১০০% অর্গানিক দুধ (৳১২০/লিটার), দেশি গরুর মাংস (৳৮৫০/কেজি), খাঁটি ঘি এবং ডিম অর্ডার করতে ওয়েবসাইটের **পণ্যসমূহ (Products)** সেকশনে ভিজিট করুন।";
        }
      } else {
        reply = "আসসালামু আলাইকুম! আমি **WeFarm AI Assistant**। আমাদের খামারের ১০০% খাঁটি অর্গানিক পণ্য অর্ডার করতে অথবা হালাল ও নিরাপদ কৃষি প্রকল্পে বিনিয়োগের সুযোগ জানতে আমি আপনাকে সাহায্য করতে পারি। আপনি ঠিক কোন বিষয়ে জানতে চান?";
      }
    } else {
      // English response
      if (lastMsgLower.includes("invest") || lastMsgLower.includes("project") || lastMsgLower.includes("profit") || lastMsgLower.includes("return") || lastMsgLower.includes("roi")) {
        if (projs) {
          const pList = projs.slice(0, 3).map((p: any) => `• **${p.title}**: Min Investment ৳${Number(p.minInvestment || 0).toLocaleString()} BDT (Est. Return ${p.roiRate || 20}%)`).join("\n");
          reply = `Welcome to WeFarm Investment Opportunities!\n\nHere are some of our active projects:\n${pList}\n\nYou can explore active batches and apply directly in our **Projects** section.`;
        } else {
          reply = "Welcome to **WeFarm**! You can invest in our regenerative farming and dairy projects with either monthly profit-sharing or one-time return options. Visit our **Investment Projects** section to explore open batches.";
        }
      } else if (lastMsgLower.includes("product") || lastMsgLower.includes("milk") || lastMsgLower.includes("meat") || lastMsgLower.includes("ghee") || lastMsgLower.includes("egg") || lastMsgLower.includes("order") || lastMsgLower.includes("shop") || lastMsgLower.includes("price")) {
        if (prods) {
          const prList = prods.slice(0, 4).map((p: any) => `• **${p.name}**: ৳${p.price} BDT per ${p.unit}`).join("\n");
          reply = `Here are some of our 100% farm-fresh organic products:\n${prList}\n\nVisit our **Products / Shop** section to place your order with fast home delivery!`;
        } else {
          reply = "We offer 100% chemical-free, farm-fresh dairy (৳120/L), grass-fed beef (৳850/kg), organic ghee, and eggs directly from our farm in Cumilla. Visit the **Products** section to place your order!";
        }
      } else {
        reply = "Hello! Welcome to **WeFarm — Soil to Soul**. We practice regenerative agriculture in Cumilla, Bangladesh, offering farm-fresh organic produce and transparent crowd-farming investment opportunities. How can I assist you today?";
      }
    }
    return res.json({ success: true, reply });
  });

  // API Route: Admin AI Copywriter
  app.post("/api/ai/copywrite", async (req, res) => {
    const { promptType, promptInput, tone = "Warm & Earthy" } = req.body || {};
    if (!promptInput) {
      return res.status(400).json({ success: false, error: "Prompt input is required." });
    }

    if (!geminiCreditExhausted) {
      try {
        const ai = getAiClient();
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

        const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        const response = await ai.models.generateContent({
          model: geminiModel,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
          },
        });

        const rawText = response.text || "[]";
        let suggestions: string[] = [];
        try {
          suggestions = JSON.parse(rawText);
        } catch {
          suggestions = [rawText];
        }

        return res.json({ success: true, suggestions });
      } catch (error: any) {
        markIfCreditExhausted(error);
      }
    }

    const topic = String(promptInput).trim();
    let suggestions: string[] = [];
    switch (promptType) {
      case "hero_heading":
        suggestions = [
          `Pure & Honest ${topic} From Our Regenerative Farm`,
          `Nourishing Families With Natural ${topic}`,
          `From Honest Soil to Your Table: ${topic}`,
        ];
        break;
      case "hero_tagline":
        suggestions = [
          `SOIL TO SOUL • ${topic.toUpperCase()}`,
          `100% NATURAL & REGENERATIVE FARMING`,
          `HONEST FOOD FROM HEALTHY SOIL`,
        ];
        break;
      case "project_pitch":
        suggestions = [
          `Invest in ${topic} and become part of sustainable, ethical farming with transparent profit sharing and regular field updates.`,
          `Our ${topic} initiative combines modern herd management with 100% natural practices to deliver reliable returns for our investors.`,
          `Support regenerative agriculture in Bangladesh through ${topic} — earning halal, sustainable returns while empowering rural communities.`,
        ];
        break;
      case "product_description":
        suggestions = [
          `100% pure, chemical-free ${topic} harvested fresh from WeFarm and delivered straight to your doorstep.`,
          `Raised and produced naturally with zero hormones or preservatives — experience the authentic taste of farm-fresh ${topic}.`,
          `Wholesome, nutrient-rich ${topic} crafted with care from our regenerative pastures to your family table.`,
        ];
        break;
      default:
        suggestions = [
          `Rooted in the philosophy of Soil to Soul — ${topic} grown with integrity, transparency, and respect for nature.`,
          `Experience authentic regenerative farming with ${topic}, bringing pure nourishment from our pastures to your home.`,
          `Building a sustainable agricultural future through ${topic} — where honest soil meets community prosperity.`,
        ];
        break;
    }
    return res.json({ success: true, suggestions });
  });

  // API Route: Bidirectional AI Translation & Copy Polishing (EN <-> BN) for Site Content
  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, items, sourceLang, targetLang, fieldContext = "website copy" } = req.body || {};

      if (!targetLang || (targetLang !== "bn" && targetLang !== "en")) {
        return res.status(400).json({ success: false, error: "Valid targetLang ('bn' or 'en') is required." });
      }

      // Batch array translation mode
      if (Array.isArray(items)) {
        if (items.length === 0) {
          return res.json({ success: true, translatedItems: [] });
        }

        if (!geminiCreditExhausted) {
          try {
            const ai = getAiClient();
            const systemInstruction =
              targetLang === "bn"
                ? `You are an expert bilingual copywriter (English to Bengali) for "WeFarm - Soil to Soul", a regenerative agriculture & farm investment platform in Bangladesh.
Convert each English string in the input JSON array into well-structured, natural, eloquent, and appealing Bengali (প্রমিত ও সাবলীল বাংলা) appropriate for a modern agricultural & investment website.
Keep numbers/symbols accurate (you may use Bengali digits or keep standard formatting naturally).
Return ONLY a valid JSON array of strings of the exact same length as the input array.`
                : `You are an expert bilingual copywriter (Bengali to English) for "WeFarm - Soil to Soul", a regenerative agriculture & farm investment platform in Bangladesh.
Convert each Bengali string in the input JSON array into polished, natural, compelling English copy appropriate for a modern agricultural & investment website.
Return ONLY a valid JSON array of strings of the exact same length as the input array.`;

            const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
            const response = await ai.models.generateContent({
              model: geminiModel,
              contents: JSON.stringify(items),
              config: {
                systemInstruction,
                responseMimeType: "application/json",
              },
            });

            let translatedItems: string[] = [];
            try {
              translatedItems = JSON.parse(response.text || "[]");
            } catch {
              translatedItems = [];
            }

            if (Array.isArray(translatedItems) && translatedItems.length === items.length) {
              return res.json({ success: true, translatedItems });
            }
          } catch (aiErr: any) {
            markIfCreditExhausted(aiErr);
          }
        }

        // Seamless fallback when Gemini credits are depleted or unavailable
        const translatedItems = await fallbackNeuralTranslateBatch(items, targetLang);
        return res.json({ success: true, translatedItems, provider: "neural-fallback" });
      }

      // Single text translation mode
      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ success: false, error: "Text is required for translation." });
      }

      if (!geminiCreditExhausted) {
        try {
          const ai = getAiClient();
          const systemInstruction =
            targetLang === "bn"
              ? `You are an expert bilingual brand copywriter (English to Bengali) for "WeFarm - Soil to Soul", a regenerative agriculture & farm investment platform in Bangladesh.
Convert the user's English text into well-structured, natural, eloquent, and emotionally resonant Bengali (সাবলীল ও মানসম্মত বাংলা) suitable for "${fieldContext}" on our website.
Do NOT add quotes, explanations, or extra commentary — output ONLY the final Bengali text.`
              : `You are an expert bilingual brand copywriter (Bengali to English) for "WeFarm - Soil to Soul", a regenerative agriculture & farm investment platform in Bangladesh.
Convert the user's Bengali text into polished, natural, and compelling English copy suitable for "${fieldContext}" on our website.
Do NOT add quotes, explanations, or extra commentary — output ONLY the final English text.`;

          const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
          const response = await ai.models.generateContent({
            model: geminiModel,
            contents: text.trim(),
            config: {
              systemInstruction,
            },
          });

          const translatedText = (response.text || "").trim().replace(/^["']|["']$/g, "");
          if (translatedText) {
            return res.json({
              success: true,
              translatedText,
              sourceLang: sourceLang || (targetLang === "bn" ? "en" : "bn"),
              targetLang,
            });
          }
        } catch (aiErr: any) {
          markIfCreditExhausted(aiErr);
        }
      }

      // Seamless fallback when Gemini credits are depleted or unavailable
      const translatedText = await fallbackNeuralTranslateSingle(text.trim(), targetLang);
      return res.json({
        success: true,
        translatedText,
        sourceLang: sourceLang || (targetLang === "bn" ? "en" : "bn"),
        targetLang,
        provider: "neural-fallback",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: "Translation failed.",
      });
    }
  });

  // In-memory store for Investor Phone OTP codes (phone -> { otp, expiresAt })
  const otpStore = new Map<string, { otp: string; expiresAt: number }>();

  // API Route: Get & Update active SMS Gateway Config
  app.get("/api/sms/config", (_req, res) => {
    smsConfig = loadSmsConfig();
    const key = smsConfig.apiKey || DEFAULT_SMS_API_KEY;
    const maskedKey = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "****";
    return res.json({
      success: true,
      config: {
        hasApiKey: Boolean(key),
        maskedApiKey: maskedKey,
        senderId: smsConfig.senderId,
        defaultContentId: smsConfig.defaultContentId,
        otpTemplate: smsConfig.otpTemplate,
        updatedAt: smsConfig.updatedAt,
      },
    });
  });

  app.post("/api/sms/config", (req, res) => {
    try {
      const { apiKey, senderId, defaultContentId, otpTemplate } = req.body || {};
      const current = loadSmsConfig();
      const updated: ServerSmsConfig = {
        apiKey: typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : current.apiKey,
        senderId: typeof senderId === "string" ? senderId.trim() : current.senderId,
        defaultContentId: typeof defaultContentId === "string" ? defaultContentId.trim() : current.defaultContentId,
        otpTemplate: typeof otpTemplate === "string" && otpTemplate.trim() ? otpTemplate.trim() : current.otpTemplate,
        updatedAt: new Date().toISOString(),
      };
      smsConfig = updated;
      saveSmsConfig(updated);
      return res.json({ success: true, message: "SMS configuration synced on server." });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || "Failed to update SMS config." });
    }
  });

  // API Route: Check Alpha Net SMS Balance (https://api.sms.net.bd/user/balance/)
  app.get("/api/sms/balance", async (req, res) => {
    try {
      smsConfig = loadSmsConfig();
      const queryKey = typeof req.query.apiKey === "string" && req.query.apiKey.trim() ? req.query.apiKey.trim() : "";
      const apiKey = queryKey || smsConfig.apiKey || DEFAULT_SMS_API_KEY;

      const result = await callAlphaNetGet("/user/balance/", { api_key: apiKey });
      if (!result.ok) {
        return res.status(400).json({
          success: false,
          error: result.msg,
          errorCode: result.errorCode,
          response: result.data,
        });
      }

      return res.json({
        success: true,
        balance: result.data?.data?.balance ?? "0.0000",
        validity: result.data?.data?.validity ?? null,
        response: result.data,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || "Failed to fetch SMS balance." });
    }
  });

  // API Route: Check Alpha Net SMS Request Report (https://api.sms.net.bd/report/request/{id}/)
  app.get("/api/sms/report/:requestId", async (req, res) => {
    try {
      const requestId = req.params.requestId?.trim();
      if (!requestId) {
        return res.status(400).json({ success: false, error: "Request ID is required." });
      }

      smsConfig = loadSmsConfig();
      const queryKey = typeof req.query.apiKey === "string" && req.query.apiKey.trim() ? req.query.apiKey.trim() : "";
      const apiKey = queryKey || smsConfig.apiKey || DEFAULT_SMS_API_KEY;

      const result = await callAlphaNetGet(`/report/request/${encodeURIComponent(requestId)}/`, { api_key: apiKey });
      if (!result.ok) {
        return res.status(400).json({
          success: false,
          error: result.msg,
          errorCode: result.errorCode,
          response: result.data,
        });
      }

      return res.json({
        success: true,
        report: result.data?.data || null,
        response: result.data,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || "Failed to fetch SMS report." });
    }
  });

  // API Route: Get recent server-side OTP dispatch logs for Admin History
  app.get("/api/sms/otp-logs", (_req, res) => {
    return res.json({
      success: true,
      logs: loadOtpLogs(),
    });
  });

  // API Route: Send OTP to Investor Phone Number via Alpha Net SMS
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone || typeof phone !== "string") {
        return res.status(400).json({ success: false, error: "মোবাইল নম্বর প্রদান করা আবশ্যক (Phone number is required)." });
      }

      const canonicalPhone = normalizeBdPhone(phone);
      const formattedRecipient = formatAlphaNetNumber(phone);
      if (!formattedRecipient || canonicalPhone.length < 10 || canonicalPhone.length > 15) {
        return res.status(400).json({ success: false, error: "অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর দিন (Invalid phone number format)." });
      }

      smsConfig = loadSmsConfig();
      const apiKey = smsConfig.apiKey || DEFAULT_SMS_API_KEY;
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
      otpStore.set(canonicalPhone, { otp, expiresAt });

      const template = smsConfig.otpTemplate || DEFAULT_OTP_TEMPLATE;
      const smsMessage = template.includes("{otp}")
        ? template.replace(/\{otp\}/g, otp)
        : `${template} ${otp}`;

      const result = await sendAlphaNetSms({
        apiKey,
        to: formattedRecipient,
        msg: smsMessage,
        senderId: smsConfig.senderId || undefined,
      });

      appendOtpLog({
        id: `otp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        requestId: result.requestId,
        recipients: [canonicalPhone],
        recipientCount: 1,
        message: `Investor Login OTP dispatched to ${canonicalPhone} (Code hidden)`,
        type: "otp",
        status: result.ok ? "Submitted" : "Failed",
        errorCode: result.errorCode,
        errorMessage: result.ok ? undefined : result.msg,
        senderId: smsConfig.senderId || undefined,
        createdAt: new Date().toISOString(),
      });

      if (result.ok) {
        return res.json({
          success: true,
          smsSent: true,
          requestId: result.requestId,
          phone: canonicalPhone,
          message: `আপনার ${canonicalPhone} নম্বরে ৬ সংখ্যার OTP কোড পাঠানো হয়েছে।`,
        });
      }

      return res.status(400).json({
        success: false,
        smsSent: false,
        errorCode: result.errorCode,
        error: `SMS পাঠানো যায়নি (${result.msg})। অনুগ্রহ করে এডমিন প্যানেলের SMS ম্যানেজার থেকে ব্যালেন্স ও সেটিংস যাচাই করুন।`,
        phone: canonicalPhone,
      });
    } catch (error: any) {
      console.error("Error in /api/auth/send-otp:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to send OTP." });
    }
  });

  // API Route: Verify Investor Phone OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ success: false, error: "মোবাইল নম্বর এবং OTP কোড উভয়ই প্রয়োজন।" });
      }

      const canonicalPhone = normalizeBdPhone(phone);
      const record = otpStore.get(canonicalPhone);

      if (!record) {
        return res.status(400).json({
          success: false,
          error: "কোনো সক্রিয় OTP পাওয়া যায়নি। অনুগ্রহ করে আবার 'OTP পাঠান' বাটনে ক্লিক করুন।",
        });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(canonicalPhone);
        return res.status(400).json({
          success: false,
          error: "OTP কোডটির মেয়াদ শেষ হয়ে গেছে (৫ মিনিট)। অনুগ্রহ করে নতুন OTP নিন।",
        });
      }

      if (record.otp !== String(otp).trim()) {
        return res.status(400).json({
          success: false,
          error: "ভুল OTP কোড দেওয়া হয়েছে। অনুগ্রহ করে সঠিক ৬ সংখ্যার কোডটি লিখুন।",
        });
      }

      otpStore.delete(canonicalPhone);

      return res.json({
        success: true,
        phone: canonicalPhone,
        message: "OTP সফলভাবে যাচাই হয়েছে!",
      });
    } catch (error: any) {
      console.error("Error in /api/auth/verify-otp:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to verify OTP." });
    }
  });

  // Shared handler for /api/sms/send and /api/notify-investors
  const handleSendSmsRequest = async (req: express.Request, res: express.Response) => {
    try {
      const { recipients, message, schedule, senderId, contentId, apiKey: bodyApiKey } = req.body || {};

      if (!recipients || !message || !String(message).trim()) {
        return res.status(400).json({ success: false, error: "Recipients and message are required." });
      }

      smsConfig = loadSmsConfig();
      const apiKey = (typeof bodyApiKey === "string" && bodyApiKey.trim()) || smsConfig.apiKey || DEFAULT_SMS_API_KEY;

      const rawList = Array.isArray(recipients)
        ? recipients.map(String)
        : String(recipients).split(/[\n,;]+/);

      const formattedList = Array.from(
        new Set(
          rawList
            .map((r) => formatAlphaNetNumber(r))
            .filter((r): r is string => Boolean(r))
        )
      );

      if (formattedList.length === 0) {
        return res.status(400).json({ success: false, error: "No valid recipient phone numbers provided." });
      }

      const activeSenderId = typeof senderId === "string" ? senderId.trim() : smsConfig.senderId;
      const activeContentId = typeof contentId === "string" ? contentId.trim() : smsConfig.defaultContentId;

      const result = await sendAlphaNetSms({
        apiKey,
        to: formattedList.join(","),
        msg: String(message).trim(),
        schedule: typeof schedule === "string" && schedule.trim() ? schedule.trim() : undefined,
        senderId: activeSenderId || undefined,
        contentId: activeContentId || undefined,
      });

      if (result.ok) {
        return res.json({
          success: true,
          requestId: result.requestId,
          recipientCount: formattedList.length,
          formattedRecipients: formattedList,
          response: result.data,
        });
      }

      return res.status(400).json({
        success: false,
        error: result.msg,
        errorCode: result.errorCode,
        response: result.data,
      });
    } catch (error: any) {
      console.error("SMS sending error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to send SMS." });
    }
  };

  app.post("/api/sms/send", handleSendSmsRequest);
  app.post("/api/notify-investors", handleSendSmsRequest);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), "dist", "index.html"))
      ? path.join(process.cwd(), "dist")
      : (fs.existsSync(path.join(__dirname, "index.html")) ? __dirname : path.join(process.cwd(), "dist"));
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server startup error:", err);
  process.exit(1);
});
