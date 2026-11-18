var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
import_dotenv.default.config();
var DEFAULT_SMS_API_KEY = "TEwV8j6kIyK2CrBlcvlf3Oa5ic39R6qdlPhAVGGn";
var DEFAULT_OTP_TEMPLATE = "WeFarm Investor Login OTP: {otp}. Valid for 5 minutes. Do not share this code.";
var SMS_CONFIG_CACHE_PATH = "/tmp/wefarm-sms-config.json";
var OTP_LOGS_CACHE_PATH = "/tmp/wefarm-otp-logs.json";
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing on the server. Please check your secrets configuration.");
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function loadSmsConfig() {
  const base = {
    apiKey: process.env.SMS_API_KEY || DEFAULT_SMS_API_KEY,
    senderId: "",
    defaultContentId: "",
    otpTemplate: DEFAULT_OTP_TEMPLATE
  };
  try {
    if (import_fs.default.existsSync(SMS_CONFIG_CACHE_PATH)) {
      const parsed = JSON.parse(import_fs.default.readFileSync(SMS_CONFIG_CACHE_PATH, "utf-8"));
      return {
        apiKey: parsed.apiKey && String(parsed.apiKey).trim() || base.apiKey,
        senderId: typeof parsed.senderId === "string" ? parsed.senderId.trim() : "",
        defaultContentId: typeof parsed.defaultContentId === "string" ? parsed.defaultContentId.trim() : "",
        otpTemplate: parsed.otpTemplate && String(parsed.otpTemplate).trim() || DEFAULT_OTP_TEMPLATE,
        updatedAt: parsed.updatedAt
      };
    }
  } catch (err) {
    console.warn("Could not read cached SMS config:", err);
  }
  return base;
}
function saveSmsConfig(cfg) {
  try {
    import_fs.default.writeFileSync(SMS_CONFIG_CACHE_PATH, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist SMS config cache:", err);
  }
}
function loadOtpLogs() {
  try {
    if (import_fs.default.existsSync(OTP_LOGS_CACHE_PATH)) {
      const parsed = JSON.parse(import_fs.default.readFileSync(OTP_LOGS_CACHE_PATH, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
  }
  return [];
}
function appendOtpLog(entry) {
  try {
    const existing = loadOtpLogs();
    const updated = [entry, ...existing].slice(0, 100);
    import_fs.default.writeFileSync(OTP_LOGS_CACHE_PATH, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist OTP log cache:", err);
  }
}
function normalizeBdPhone(raw) {
  let digits = (raw || "").replace(/\D/g, "");
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
function formatAlphaNetNumber(raw) {
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
function mapAlphaNetError(errCode, rawMsg) {
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
async function callAlphaNetGet(endpointPath, queryParams) {
  const url = new URL(`https://api.sms.net.bd${endpointPath}`);
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== void 0 && v !== null && String(v).trim() !== "") {
      url.searchParams.set(k, String(v));
    }
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15e3);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    const responseText = await response.text();
    let data = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      return {
        ok: false,
        errorCode: -1,
        msg: `Non-JSON response from SMS Gateway (HTTP ${response.status}): ${responseText.slice(0, 180)}`,
        data: null
      };
    }
    const errCode = data && typeof data.error !== "undefined" ? Number(data.error) : -1;
    return {
      ok: errCode === 0,
      errorCode: errCode,
      msg: errCode === 0 ? data.msg || "Success" : mapAlphaNetError(errCode, data.msg),
      data
    };
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    return {
      ok: false,
      errorCode: -1,
      msg: isAbort ? "Connection timed out while contacting api.sms.net.bd." : err?.message || "Failed to connect to api.sms.net.bd.",
      data: null
    };
  } finally {
    clearTimeout(timer);
  }
}
async function sendAlphaNetSms(options) {
  const params = {
    api_key: options.apiKey,
    msg: options.msg,
    to: options.to
  };
  if (options.schedule?.trim()) params.schedule = options.schedule.trim();
  if (options.senderId?.trim()) params.sender_id = options.senderId.trim();
  if (options.contentId?.trim()) params.content_id = options.contentId.trim();
  if (options.msg.length + options.to.length < 1500) {
    const result = await callAlphaNetGet("/sendsms", params);
    const requestId = result.data?.data?.request_id !== void 0 ? String(result.data.data.request_id) : void 0;
    return { ...result, requestId };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15e3);
  try {
    const body = new URLSearchParams(params);
    const response = await fetch("https://api.sms.net.bd/sendsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: body.toString(),
      signal: controller.signal
    });
    const responseText = await response.text();
    let data = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      return {
        ok: false,
        errorCode: -1,
        msg: `Non-JSON response from SMS Gateway (HTTP ${response.status}): ${responseText.slice(0, 180)}`,
        data: null,
        requestId: void 0
      };
    }
    const errCode = data && typeof data.error !== "undefined" ? Number(data.error) : -1;
    const requestId = data?.data?.request_id !== void 0 ? String(data.data.request_id) : void 0;
    return {
      ok: errCode === 0,
      errorCode: errCode,
      msg: errCode === 0 ? data.msg || "Request successfully submitted" : mapAlphaNetError(errCode, data.msg),
      data,
      requestId
    };
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    return {
      ok: false,
      errorCode: -1,
      msg: isAbort ? "Connection timed out while contacting api.sms.net.bd." : err?.message || "Failed to connect to api.sms.net.bd.",
      data: null,
      requestId: void 0
    };
  } finally {
    clearTimeout(timer);
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  let smsConfig = loadSmsConfig();
  app.use(import_express.default.json());
  app.use("/hero-frames", import_express.default.static(import_path.default.join(process.cwd(), "Hero Section Animated Frames")));
  const EN_DIGITS = "0123456789";
  const BN_DIGITS = "\u09E6\u09E7\u09E8\u09E9\u09EA\u09EB\u09EC\u09ED\u09EE\u09EF";
  function toBengaliDigits(str) {
    return str.replace(/[0-9]/g, (d) => BN_DIGITS[EN_DIGITS.indexOf(d)] || d);
  }
  function toEnglishDigits(str) {
    return str.replace(/[০-৯]/g, (d) => EN_DIGITS[BN_DIGITS.indexOf(d)] || d);
  }
  const CURATED_EN_TO_BN = {
    "soil to soul": "\u09AE\u09BE\u099F\u09BF \u09A5\u09C7\u0995\u09C7 \u0986\u09A4\u09CD\u09AE\u09BE\u09B0 \u09AC\u09A8\u09CD\u09A7\u09A8",
    "fresh farm products from our farm": "\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0996\u09BE\u09AE\u09BE\u09B0 \u09A5\u09C7\u0995\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u09A4\u09BE\u099C\u09BE \u0993 \u09AC\u09BF\u09B6\u09C1\u09A6\u09CD\u09A7 \u09AA\u09A3\u09CD\u09AF",
    "honest food from honest soil": "\u0996\u09BE\u0981\u099F\u09BF \u09AE\u09BE\u099F\u09BF\u09B0 \u09A8\u09BF\u09B0\u09CD\u09AD\u09C7\u099C\u09BE\u09B2 \u0993 \u09A8\u09BF\u09B0\u09BE\u09AA\u09A6 \u0996\u09BE\u09AC\u09BE\u09B0",
    "experience regenerative agriculture": "\u09AA\u09CD\u09B0\u0995\u09C3\u09A4\u09BF\u09AC\u09BE\u09A8\u09CD\u09A7\u09AC \u0986\u09A7\u09C1\u09A8\u09BF\u0995 \u0995\u09C3\u09B7\u09BF\u09B0 \u0985\u09A8\u09A8\u09CD\u09AF \u0985\u09AD\u09BF\u099C\u09CD\u099E\u09A4\u09BE",
    "rooted in the philosophy of soil to soul. we practice regenerative farming to bring you meat and dairy that nourishes the body and respects the earth.": "\u09AE\u09BE\u099F\u09BF \u09A5\u09C7\u0995\u09C7 \u0986\u09A4\u09CD\u09AE\u09BE\u09B0 \u09A6\u09B0\u09CD\u09B6\u09A8\u09C7 \u0985\u09A8\u09C1\u09AA\u09CD\u09B0\u09BE\u09A3\u09BF\u09A4 \u09B9\u09DF\u09C7 \u0986\u09AE\u09B0\u09BE \u09AA\u09CD\u09B0\u09BE\u0995\u09C3\u09A4\u09BF\u0995 \u0993 \u099F\u09C7\u0995\u09B8\u0987 \u09AA\u09A6\u09CD\u09A7\u09A4\u09BF\u09A4\u09C7 \u0996\u09BE\u09AE\u09BE\u09B0 \u09AA\u09B0\u09BF\u099A\u09BE\u09B2\u09A8\u09BE \u0995\u09B0\u09BF\u2014\u09AF\u09C7\u09A8 \u09AA\u09CD\u09B0\u09A4\u09BF\u099F\u09BF \u0996\u09BE\u09AC\u09BE\u09B0\u09C7 \u09A5\u09BE\u0995\u09C7 \u09AC\u09BF\u09B6\u09C1\u09A6\u09CD\u09A7 \u09AA\u09C1\u09B7\u09CD\u099F\u09BF \u098F\u09AC\u0982 \u09AA\u09CD\u09B0\u0995\u09C3\u09A4\u09BF\u09B0 \u09AA\u09CD\u09B0\u09A4\u09BF \u09AD\u09BE\u09B2\u09CB\u09AC\u09BE\u09B8\u09BE\u0964",
    "why choose us": "\u0995\u09C7\u09A8 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AC\u09C7\u099B\u09C7 \u09A8\u09C7\u09AC\u09C7\u09A8",
    "experience the difference of real farming": "\u09AA\u09CD\u09B0\u0995\u09C3\u09A4 \u0993 \u09AA\u09CD\u09B0\u09BE\u0995\u09C3\u09A4\u09BF\u0995 \u0996\u09BE\u09AE\u09BE\u09B0\u09C7\u09B0 \u09AA\u09BE\u09B0\u09CD\u09A5\u0995\u09CD\u09AF \u0985\u09A8\u09C1\u09AD\u09AC \u0995\u09B0\u09C1\u09A8",
    "natural farming": "\u09AA\u09CD\u09B0\u09BE\u0995\u09C3\u09A4\u09BF\u0995 \u0995\u09C3\u09B7\u09BF \u09AA\u09A6\u09CD\u09A7\u09A4\u09BF",
    "regenerative practices that work with nature, not against it.": "\u09AA\u09CD\u09B0\u0995\u09C3\u09A4\u09BF\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09B8\u09BE\u09AE\u099E\u09CD\u099C\u09B8\u09CD\u09AF \u09B0\u09C7\u0996\u09C7 \u09AE\u09BE\u099F\u09BF\u09B0 \u0989\u09B0\u09CD\u09AC\u09B0\u09A4\u09BE \u0993 \u09AA\u09B0\u09BF\u09AC\u09C7\u09B6 \u09B0\u0995\u09CD\u09B7\u09BE\u0995\u09BE\u09B0\u09C0 \u0995\u09C3\u09B7\u09BF \u09AC\u09CD\u09AF\u09AC\u09B8\u09CD\u09A5\u09BE\u0964",
    "healthy animals": "\u09B8\u09C1\u09B8\u09CD\u09A5 \u0993 \u09B8\u09AC\u09B2 \u09AA\u09CD\u09B0\u09BE\u09A3\u09BF\u09B8\u09AE\u09CD\u09AA\u09A6",
    "free-range livestock raised on natural diets without hormones.": "\u0995\u09CB\u09A8\u09CB \u0995\u09CD\u09B7\u09A4\u09BF\u0995\u09B0 \u09B9\u09B0\u09AE\u09CB\u09A8 \u09AC\u09BE \u0985\u09CD\u09AF\u09BE\u09A8\u09CD\u099F\u09BF\u09AC\u09BE\u09AF\u09BC\u09CB\u099F\u09BF\u0995 \u099B\u09BE\u09DC\u09BE\u0987 \u09AA\u09CD\u09B0\u09BE\u0995\u09C3\u09A4\u09BF\u0995 \u0996\u09BE\u09A6\u09CD\u09AF\u09C7 \u09AC\u09C7\u09DC\u09C7 \u0993\u09A0\u09BE \u0997\u09AC\u09BE\u09A6\u09BF\u09AA\u09B6\u09C1\u0964",
    "fresh products": "\u09B8\u09A4\u09C7\u099C \u0993 \u09A8\u09BF\u09B0\u09CD\u09AD\u09C7\u099C\u09BE\u09B2 \u09AA\u09A3\u09CD\u09AF",
    "farm-to-table freshness delivered with care and speed.": "\u0996\u09BE\u09AE\u09BE\u09B0 \u09A5\u09C7\u0995\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u0998\u09B0\u09C7 \u09AF\u09A4\u09CD\u09A8 \u0993 \u09A6\u09CD\u09B0\u09C1\u09A4\u09A4\u09BE\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AA\u09CC\u0981\u099B\u09C7 \u09A6\u09C7\u0993\u09DF\u09BE \u09A4\u09BE\u099C\u09BE \u09AA\u09A3\u09CD\u09AF\u0964",
    "trusted farm": "\u09AC\u09BF\u09B6\u09CD\u09AC\u09B8\u09CD\u09A4 \u0993 \u09B8\u09CD\u09AC\u099A\u09CD\u099B \u09AC\u09CD\u09AF\u09AC\u09B8\u09CD\u09A5\u09BE\u09AA\u09A8\u09BE",
    "transparent practices you can trust, from soil to soul.": "\u09AE\u09BE\u099F\u09BF \u09A5\u09C7\u0995\u09C7 \u09AA\u09BE\u09A4 \u09AA\u09B0\u09CD\u09AF\u09A8\u09CD\u09A4 \u09B6\u09A4\u09AD\u09BE\u0997 \u09B8\u09CD\u09AC\u099A\u09CD\u099B \u0993 \u09A8\u09BF\u09B0\u09CD\u09AD\u09B0\u09AF\u09CB\u0997\u09CD\u09AF \u0996\u09BE\u09AE\u09BE\u09B0 \u09AC\u09CD\u09AF\u09AC\u09B8\u09CD\u09A5\u09BE\u09AA\u09A8\u09BE\u0964",
    "happy animals": "\u09B8\u09C1\u09B8\u09CD\u09A5 \u09AA\u09CD\u09B0\u09BE\u09A3\u09BF\u09B8\u09AE\u09CD\u09AA\u09A6",
    "natural soil": "\u09AA\u09CD\u09B0\u09BE\u0995\u09C3\u09A4\u09BF\u0995 \u09AE\u09BE\u099F\u09BF",
    "fresh deliveries": "\u09B8\u09AB\u09B2 \u09A1\u09C7\u09B2\u09BF\u09AD\u09BE\u09B0\u09BF",
    "successful projects": "\u09B8\u09AB\u09B2 \u09AA\u09CD\u09B0\u09CB\u099C\u09C7\u0995\u09CD\u099F",
    "about wefarm": "\u0989\u0987\u09AB\u09BE\u09B0\u09CD\u09AE \u09B8\u09AE\u09CD\u09AA\u09B0\u09CD\u0995\u09C7",
    "from soil to soul \u2014 our promise": "\u09AE\u09BE\u099F\u09BF \u09A5\u09C7\u0995\u09C7 \u0986\u09A4\u09CD\u09AE\u09BE \u2014 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0985\u0999\u09CD\u0997\u09C0\u0995\u09BE\u09B0",
    "wefarm was born from a belief that food should be grown with integrity. we're a family-run regenerative farm committed to nourishing communities while healing the land.": "\u0996\u09BE\u09A6\u09CD\u09AF \u0989\u09CE\u09AA\u09BE\u09A6\u09A8\u09C7 \u09B8\u09A4\u09A4\u09BE \u0993 \u09AC\u09BF\u09B6\u09C1\u09A6\u09CD\u09A7\u09A4\u09BE\u09B0 \u09AC\u09BF\u09B6\u09CD\u09AC\u09BE\u09B8 \u09A5\u09C7\u0995\u09C7\u0987 \u0989\u0987\u09AB\u09BE\u09B0\u09CD\u09AE\u09C7\u09B0 \u099C\u09A8\u09CD\u09AE\u0964 \u0986\u09AE\u09B0\u09BE \u098F\u0995\u099F\u09BF \u09AA\u09BE\u09B0\u09BF\u09AC\u09BE\u09B0\u09BF\u0995 \u0993 \u09AA\u09CD\u09B0\u0995\u09C3\u09A4\u09BF\u09AC\u09BE\u09A8\u09CD\u09A7\u09AC \u0996\u09BE\u09AE\u09BE\u09B0, \u09AF\u09BE \u09AE\u09BE\u099F\u09BF\u09B0 \u09B8\u09CD\u09AC\u09BE\u09B8\u09CD\u09A5\u09CD\u09AF \u09B0\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C7 \u09AE\u09BE\u09A8\u09C1\u09B7\u09C7\u09B0 \u0995\u09BE\u099B\u09C7 \u09AA\u09C1\u09B7\u09CD\u099F\u09BF\u0995\u09B0 \u0996\u09BE\u09AC\u09BE\u09B0 \u09AA\u09CC\u0981\u099B\u09C7 \u09A6\u09BF\u09A4\u09C7 \u09AA\u09CD\u09B0\u09A4\u09BF\u09B6\u09CD\u09B0\u09C1\u09A4\u09BF\u09AC\u09A6\u09CD\u09A7\u0964",
    "our vision": "\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B2\u0995\u09CD\u09B7\u09CD\u09AF \u0993 \u09B8\u09CD\u09AC\u09AA\u09CD\u09A8",
    '"to create a world where every meal is a connection to the earth, where farming heals instead of harms, and where communities thrive on the bounty of honest soil."': '"\u098F\u09AE\u09A8 \u098F\u0995 \u09AA\u09C3\u09A5\u09BF\u09AC\u09C0 \u0997\u09DC\u09C7 \u09A4\u09CB\u09B2\u09BE \u09AF\u09C7\u0996\u09BE\u09A8\u09C7 \u09AA\u09CD\u09B0\u09A4\u09BF\u099F\u09BF \u0996\u09BE\u09AC\u09BE\u09B0 \u09B9\u09AC\u09C7 \u09AA\u09CD\u09B0\u0995\u09C3\u09A4\u09BF\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09B8\u09C7\u09A4\u09C1\u09AC\u09A8\u09CD\u09A7\u09A8, \u09AF\u09C7\u0996\u09BE\u09A8\u09C7 \u0995\u09C3\u09B7\u09BF \u09AA\u09CD\u09B0\u0995\u09C3\u09A4\u09BF\u0995\u09C7 \u0995\u09CD\u09B7\u09A4\u09BF\u09B0 \u09AC\u09A6\u09B2\u09C7 \u09B8\u099C\u09C0\u09AC \u0995\u09B0\u09AC\u09C7 \u098F\u09AC\u0982 \u09AE\u09BE\u09A8\u09C1\u09B7 \u0996\u09BE\u0981\u099F\u09BF \u09AE\u09BE\u099F\u09BF\u09B0 \u09AB\u09B8\u09B2\u09C7 \u09B8\u09AE\u09C3\u09A6\u09CD\u09A7 \u09B9\u09AC\u09C7\u0964"',
    "our products": "\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AA\u09A3\u09CD\u09AF\u09B8\u09AE\u09C2\u09B9",
    "fresh products directly from wefarm to your table.": "\u0989\u0987\u09AB\u09BE\u09B0\u09CD\u09AE\u09C7\u09B0 \u0996\u09BE\u09AE\u09BE\u09B0 \u09A5\u09C7\u0995\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u0996\u09BE\u09AC\u09BE\u09B0 \u099F\u09C7\u09AC\u09BF\u09B2\u09C7 \u09A4\u09BE\u099C\u09BE \u0993 \u0985\u09B0\u09CD\u0997\u09BE\u09A8\u09BF\u0995 \u09AA\u09A3\u09CD\u09AF\u0964",
    "our projects": "\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AA\u09CD\u09B0\u09CB\u099C\u09C7\u0995\u09CD\u099F\u09B8\u09AE\u09C2\u09B9",
    "invest in sustainable future": "\u099F\u09C7\u0995\u09B8\u0987 \u0993 \u09B8\u09AC\u09C1\u099C \u09AD\u09AC\u09BF\u09B7\u09CD\u09AF\u09A4\u09C7 \u09AC\u09BF\u09A8\u09BF\u09DF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8",
    "join the soil to soul movement. support our regenerative farming projects and earn returns while healing the earth.": "\u09AE\u09BE\u099F\u09BF \u09A5\u09C7\u0995\u09C7 \u0986\u09A4\u09CD\u09AE\u09BE\u09B0 \u098F\u0987 \u09AF\u09BE\u09A4\u09CD\u09B0\u09BE\u09DF \u09AF\u09C1\u0995\u09CD\u09A4 \u09B9\u09CB\u09A8\u0964 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AA\u09CD\u09B0\u0995\u09C3\u09A4\u09BF\u09AC\u09BE\u09A8\u09CD\u09A7\u09AC \u0995\u09C3\u09B7\u09BF \u09AA\u09CD\u09B0\u09CB\u099C\u09C7\u0995\u09CD\u099F\u09C7 \u09AC\u09BF\u09A8\u09BF\u09DF\u09CB\u0997 \u0995\u09B0\u09C7 \u09B9\u09BE\u09B2\u09BE\u09B2 \u0993 \u09B8\u09CD\u09AC\u099A\u09CD\u099B \u09B2\u09AD\u09CD\u09AF\u09BE\u0982\u09B6 \u0985\u09B0\u09CD\u099C\u09A8\u09C7\u09B0 \u09AA\u09BE\u09B6\u09BE\u09AA\u09BE\u09B6\u09BF \u09AA\u09CD\u09B0\u0995\u09C3\u09A4\u09BF \u09B0\u0995\u09CD\u09B7\u09BE\u09DF \u0985\u0982\u09B6 \u09A8\u09BF\u09A8\u0964",
    "get in touch": "\u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8",
    "contact wefarm": "\u0989\u0987\u09AB\u09BE\u09B0\u09CD\u09AE\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8",
    "reach out via whatsapp or fill the form below \u2014 we'd love to hear from you.": "\u09B9\u09CB\u09AF\u09BC\u09BE\u099F\u09B8\u0985\u09CD\u09AF\u09BE\u09AA\u09C7\u09B0 \u09AE\u09BE\u09A7\u09CD\u09AF\u09AE\u09C7 \u09AC\u09BE \u09A8\u09BF\u099A\u09C7\u09B0 \u09AB\u09B0\u09CD\u09AE\u099F\u09BF \u09AA\u09C2\u09B0\u09A3 \u0995\u09B0\u09C7 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8 \u2014 \u0986\u09AE\u09B0\u09BE \u0986\u09AA\u09A8\u09BE\u09B0 \u09AC\u09BE\u09B0\u09CD\u09A4\u09BE\u09B0 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE\u09DF \u0986\u099B\u09BF\u0964",
    "location": "\u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
    "whatsapp": "\u09B9\u09CB\u09AF\u09BC\u09BE\u099F\u09B8\u0985\u09CD\u09AF\u09BE\u09AA",
    "email": "\u0987\u09AE\u09C7\u0987\u09B2",
    "frequently asked questions": "\u09B8\u099A\u09B0\u09BE\u099A\u09B0 \u099C\u09BF\u099C\u09CD\u099E\u09BE\u09B8\u09BF\u09A4 \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8\u09BE\u09AC\u09B2\u09C0 (FAQ)",
    "everything you need to know about wefarm and our farming ecosystem.": "\u0989\u0987\u09AB\u09BE\u09B0\u09CD\u09AE \u098F\u09AC\u0982 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0995\u09C3\u09B7\u09BF \u0993 \u09AC\u09BF\u09A8\u09BF\u09DF\u09CB\u0997 \u09AC\u09CD\u09AF\u09AC\u09B8\u09CD\u09A5\u09BE \u09B8\u09AE\u09CD\u09AA\u09B0\u09CD\u0995\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u09AE\u09A8\u09C7 \u09A5\u09BE\u0995\u09BE \u09B8\u0995\u09B2 \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8\u09C7\u09B0 \u0989\u09A4\u09CD\u09A4\u09B0\u0964",
    "everything you need to know about agrovest and our farming ecosystem.": "\u0989\u0987\u09AB\u09BE\u09B0\u09CD\u09AE \u098F\u09AC\u0982 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0995\u09C3\u09B7\u09BF \u0993 \u09AC\u09BF\u09A8\u09BF\u09DF\u09CB\u0997 \u09AC\u09CD\u09AF\u09AC\u09B8\u09CD\u09A5\u09BE \u09B8\u09AE\u09CD\u09AA\u09B0\u09CD\u0995\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u09AE\u09A8\u09C7 \u09A5\u09BE\u0995\u09BE \u09B8\u0995\u09B2 \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8\u09C7\u09B0 \u0989\u09A4\u09CD\u09A4\u09B0\u0964"
  };
  const CURATED_BN_TO_EN = Object.entries(CURATED_EN_TO_BN).reduce(
    (acc, [en, bn]) => {
      acc[bn.trim()] = en.replace(/\bwefarm\b/gi, "WeFarm").replace(/(^\w|\.\s+\w)/g, (m) => m.toUpperCase());
      return acc;
    },
    {}
  );
  async function fallbackNeuralTranslateSingle(rawText, targetLang) {
    const trimmed = (rawText || "").trim();
    if (!trimmed) return "";
    if (/^[0-9০-৯+%.,/\-\s]+$/.test(trimmed)) {
      return targetLang === "bn" ? toBengaliDigits(trimmed) : toEnglishDigits(trimmed);
    }
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
          Accept: "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          let result = data[0].map((segment) => Array.isArray(segment) && segment[0] ? String(segment[0]) : "").join("").trim();
          if (targetLang === "bn") {
            result = result.replace(/WeFarm/gi, "\u0989\u0987\u09AB\u09BE\u09B0\u09CD\u09AE").replace(/AgroVest/gi, "\u0989\u0987\u09AB\u09BE\u09B0\u09CD\u09AE").replace(/রিজেনারেটিভ ফার্মিং/g, "\u09AA\u09CD\u09B0\u0995\u09C3\u09A4\u09BF\u09AC\u09BE\u09A8\u09CD\u09A7\u09AC \u0995\u09C3\u09B7\u09BF").replace(/রিজেনারেটিভ কৃষি/g, "\u09AA\u09CD\u09B0\u0995\u09C3\u09A4\u09BF\u09AC\u09BE\u09A8\u09CD\u09A7\u09AC \u0995\u09C3\u09B7\u09BF");
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
  async function fallbackNeuralTranslateBatch(items, targetLang) {
    return Promise.all(items.map((item) => fallbackNeuralTranslateSingle(item, targetLang)));
  }
  let geminiCreditExhausted = false;
  function markIfCreditExhausted(err) {
    const msg = String(err?.message || err || "");
    if (msg.includes("402") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("prepayment credits")) {
      geminiCreditExhausted = true;
    }
  }
  function buildChatbotInstruction(context) {
    let projectsSection = "";
    if (context?.projects && Array.isArray(context.projects) && context.projects.length > 0) {
      projectsSection = context.projects.map((p, i) => {
        const batchesStr = p.batches && p.batches.length > 0 ? p.batches.map((b) => `${b.batchName || "Batch"} (${b.durationMonths || 12} months)`).join(", ") : "Standard batch";
        return `Project #${i + 1}: ${p.title} ${p.titleBn ? `(${p.titleBn})` : ""}
  - Category / Profit Model: ${p.profitType === "monthly" ? "Monthly Profit Payout (\u09AA\u09CD\u09B0\u09A4\u09BF \u09AE\u09BE\u09B8\u09C7 \u09A8\u09BF\u09DF\u09AE\u09BF\u09A4 \u09B2\u09AD\u09CD\u09AF\u09BE\u0982\u09B6)" : "One-time Return at Maturity (\u09AE\u09C7\u09DF\u09BE\u09A6\u09BE\u09A8\u09CD\u09A4\u09C7 \u098F\u0995\u0995\u09BE\u09B2\u09C0\u09A8 \u09AE\u09C2\u09B2\u09A7\u09A8 \u0993 \u09B2\u09BE\u09AD)"}
  - Minimum Investment: \u09F3${Number(p.minInvestment || 0).toLocaleString()} BDT
  - Expected Annual ROI / Profit Rate: ${p.roiRate || "18-24"}%
  - Funding Progress: \u09F3${Number(p.currentAmount || 0).toLocaleString()} raised of \u09F3${Number(p.targetAmount || 0).toLocaleString()} BDT target
  - Project Status: ${p.status || "Active"}
  - Active Batches: ${batchesStr}
  - Description: ${p.description || p.descriptionBn || "Sustainable agriculture crowd-farming project."}`;
      }).join("\n\n");
    } else {
      projectsSection = `Project #1: Organic Dairy Farm Expansion (\u0985\u09B0\u09CD\u0997\u09BE\u09A8\u09BF\u0995 \u09A1\u09C7\u0987\u09B0\u09BF \u09AB\u09BE\u09B0\u09CD\u09AE \u09B8\u09AE\u09CD\u09AA\u09CD\u09B0\u09B8\u09BE\u09B0\u09A3)
  - Profit Model: Monthly Profit Payout (\u09AA\u09CD\u09B0\u09A4\u09BF \u09AE\u09BE\u09B8\u09C7 \u09B2\u09AD\u09CD\u09AF\u09BE\u0982\u09B6)
  - Minimum Investment: \u09F350,000 BDT
  - Expected Annual ROI / Profit Rate: 18-22%
  - Description: High-yield dairy cattle farming for raw milk production in Cumilla with regular field visits.

Project #2: Free-Range Heritage Poultry (\u09A6\u09C7\u09B6\u09BF \u09AE\u09C1\u09B0\u0997\u09BF \u0993 \u09B9\u09BE\u0981\u09B8 \u09AA\u09BE\u09B2\u09A8 \u09AA\u09CD\u09B0\u0995\u09B2\u09CD\u09AA)
  - Profit Model: Monthly Profit Payout (\u09AA\u09CD\u09B0\u09A4\u09BF \u09AE\u09BE\u09B8\u09C7 \u09B2\u09AD\u09CD\u09AF\u09BE\u0982\u09B6)
  - Minimum Investment: \u09F330,000 BDT
  - Expected Annual ROI / Profit Rate: 20-25%
  - Description: Natural heritage chicken and duck farming for organic meat and free-range brown eggs.

Project #3: Native Breed Cattle Conservation (\u09A6\u09C7\u09B6\u09BF \u0997\u09B0\u09C1 \u09AE\u09CB\u099F\u09BE\u09A4\u09BE\u099C\u09BE\u0995\u09B0\u09A3 \u0993 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09A3)
  - Profit Model: One-time Return at Maturity (\u0995\u09CB\u09B0\u09AC\u09BE\u09A8\u09BF/\u09AE\u09C7\u09DF\u09BE\u09A6\u09BE\u09A8\u09CD\u09A4\u09C7 \u098F\u0995\u0995\u09BE\u09B2\u09C0\u09A8 \u09B2\u09AD\u09CD\u09AF\u09BE\u0982\u09B6)
  - Minimum Investment: \u09F3100,000 BDT
  - Expected Annual ROI / Profit Rate: 22-26%
  - Description: Ethical, 100% grass-fed native Red Chittagong and Pabna cattle farming.`;
    }
    let productsSection = "";
    if (context?.products && Array.isArray(context.products) && context.products.length > 0) {
      productsSection = context.products.map((p, i) => {
        const stockText = p.stock !== void 0 && Number(p.stock) <= 0 ? "Out of Stock (\u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8\u09C7 \u09B8\u09CD\u099F\u0995 \u09B6\u09C7\u09B7)" : `In Stock (${p.stock} ${p.unit} available)`;
        return `Product #${i + 1}: ${p.name} ${p.nameBn ? `(${p.nameBn})` : ""}
  - Price: \u09F3${p.price} BDT per ${p.unit}
  - Availability: ${stockText}
  - Details: ${p.description || p.descriptionBn || "100% authentic, farm-fresh regenerative produce."}`;
      }).join("\n\n");
    } else {
      productsSection = `Product #1: Pure Grass-fed Cow Milk (\u0996\u09BE\u0981\u099F\u09BF \u0995\u09BE\u0981\u099A\u09BE \u09A6\u09C1\u09A7) - \u09F3120 BDT per Liter (In Stock)
Product #2: Premium Fresh Beef (\u09A6\u09C7\u09B6\u09BF \u0997\u09B0\u09C1\u09B0 \u09AE\u09BE\u0982\u09B8) - \u09F3850 BDT per Kg (In Stock)
Product #3: Pure Deshi Cow Ghee (\u0996\u09BE\u0981\u099F\u09BF \u0997\u09BE\u0993\u09DF\u09BE \u0998\u09BF) - \u09F31,800 BDT per Kg (In Stock)
Product #4: Free-Range Organic Eggs (\u09A6\u09C7\u09B6\u09BF \u09AE\u09C1\u09B0\u0997\u09BF\u09B0 \u09A1\u09BF\u09AE) - \u09F3180 BDT per Dozen (In Stock)
Product #5: Cold-Pressed Mustard Oil (\u0996\u09BE\u0981\u099F\u09BF \u09B8\u09B0\u09BF\u09B7\u09BE\u09B0 \u09A4\u09C7\u09B2) - \u09F3350 BDT per Liter (In Stock)`;
    }
    return `You are "WeFarm AI", the official intelligent virtual assistant for WeFarm \u2014 an authentic regenerative agriculture farm and crowd-farming platform located in Cumilla, Bangladesh.
Philosophy: "Soil to Soul" (\u09B8\u09C1\u09B8\u09CD\u09A5 \u099C\u09C0\u09AC\u09A8\u09CD\u09A4 \u09AE\u09BE\u099F\u09BF \u09A5\u09C7\u0995\u09C7 \u09B8\u09CE \u0993 \u0996\u09BE\u0981\u099F\u09BF \u09AA\u09C1\u09B7\u09CD\u099F\u09BF\u0995\u09B0 \u0996\u09BE\u09A6\u09CD\u09AF, \u09AF\u09BE \u09AE\u09BE\u09A8\u09AC\u09A6\u09C7\u09B9 \u0993 \u0986\u09A4\u09CD\u09AE\u09BE\u0995\u09C7 \u09A4\u09C3\u09AA\u09CD\u09A4 \u0995\u09B0\u09C7)\u0964

==============================================================
CRITICAL LANGUAGE MATCHING RULE (\u09B8\u09AC\u099A\u09C7\u09AF\u09BC\u09C7 \u0997\u09C1\u09B0\u09C1\u09A4\u09CD\u09AC\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A8\u09BF\u09AF\u09BC\u09AE):
==============================================================
1. IF THE USER ASKS OR GREETS IN ENGLISH:
   -> You MUST respond 100% in natural, fluent, hospitable, and professional English.
   -> Do NOT respond in Bengali if the user's latest query is in English.
2. IF THE USER ASKS OR GREETS IN BENGALI (\u09AC\u09BE\u0982\u09B2\u09BE \u09B9\u09B0\u09AB\u09C7 \u09AC\u09BE Banglish/\u0987\u0982\u09B0\u09C7\u099C\u09BF \u09B9\u09B0\u09AB\u09C7 \u09AC\u09BE\u0982\u09B2\u09BE \u09B2\u09BF\u0996\u09B2\u09C7):
   -> You MUST respond 100% in polite, warm, elegant, and standard Bengali (\u09B8\u09BE\u09AC\u09B2\u09C0\u09B2 \u0993 \u09AA\u09CD\u09B0\u09AE\u09BF\u09A4 \u09AC\u09BE\u0982\u09B2\u09BE).
   -> Do NOT respond in English if the user wrote in Bengali or Banglish.
3. Automatically detect the user's language on every message and match it accurately without awkward code-switching.

==============================================================
YOUR CORE KNOWLEDGE & CAPABILITIES:
==============================================================
- You have COMPLETE, LIVE, and real-time knowledge of all WeFarm investment projects and farm products listed below.
- Whenever a user asks about prices, stock availability, how to order, minimum investment requirements, ROI / return rates, profit payout models, batches, or farming practices, answer with the EXACT numbers and details from the live knowledge base below.
- Keep answers helpful, structured with clean bullet points or bold text where appropriate, and inviting.
- When an investor shows interest, guide them to visit the "Projects (\u09AA\u09CD\u09B0\u09CB\u099C\u09C7\u0995\u09CD\u099F\u09B8\u09AE\u09C2\u09B9)" tab on the website or sign in with their phone/email to apply.
- When a customer wants to buy food, guide them to visit the "Shop / Products (\u09AA\u09A3\u09CD\u09AF\u09B8\u09AE\u09C2\u09B9)" tab or contact via WhatsApp/phone.

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
- Location: Cumilla, Bangladesh (\u0996\u09BE\u09AE\u09BE\u09B0: \u0995\u09C1\u09AE\u09BF\u09B2\u09CD\u09B2\u09BE, \u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6)\u0964
- Farming Practices: 100% natural, grass-fed, zero chemical pesticides, zero synthetic hormones, ethical animal care.
- Support & Ordering: Home delivery available across Bangladesh. Direct inquiries welcomed via WhatsApp and website.`;
  }
  app.post("/api/ai/chat", async (req, res) => {
    const { messages, context } = req.body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: "Messages array is required." });
    }
    if (!geminiCreditExhausted) {
      try {
        const ai = getAiClient();
        const contents = messages.map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.text }]
        }));
        const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        const systemInstruction = buildChatbotInstruction(context);
        const response = await ai.models.generateContent({
          model: geminiModel,
          contents,
          config: {
            systemInstruction
          }
        });
        const reply2 = response.text || "I'm sorry, I couldn't generate a response right now. Please try asking again!";
        return res.json({ success: true, reply: reply2 });
      } catch (error) {
        markIfCreditExhausted(error);
      }
    }
    const lastMsg = String(messages[messages.length - 1]?.text || "").trim();
    const lastMsgLower = lastMsg.toLowerCase();
    const isBangla = /[\u0980-\u09FF]/.test(lastMsg) || /\b(apnader|koto|taka|biniyog|prokolpo|purno|dam|lagbe|hobe|kivabe|acha|bhalo|kichu|chai|khabar|dudh|mangsho|ghee|dim|tel|kharid|kena)\b/i.test(lastMsgLower);
    const projs = context?.projects && Array.isArray(context.projects) && context.projects.length > 0 ? context.projects : null;
    const prods = context?.products && Array.isArray(context.products) && context.products.length > 0 ? context.products : null;
    let reply = "";
    if (isBangla) {
      if (lastMsgLower.includes("\u0987\u09A8\u09AD\u09C7\u09B8\u09CD\u099F") || lastMsgLower.includes("\u09AC\u09BF\u09A8\u09BF\u09DF\u09CB\u0997") || lastMsgLower.includes("\u09AA\u09CD\u09B0\u09CB\u099C\u09C7\u0995\u09CD\u099F") || lastMsgLower.includes("\u09AE\u09C1\u09A8\u09BE\u09AB\u09BE") || lastMsgLower.includes("invest") || lastMsgLower.includes("project")) {
        if (projs) {
          const pList = projs.slice(0, 3).map((p) => `\u2022 **${p.titleBn || p.title}**: \u09B8\u09B0\u09CD\u09AC\u09A8\u09BF\u09AE\u09CD\u09A8 \u09AC\u09BF\u09A8\u09BF\u09DF\u09CB\u0997 \u09F3${Number(p.minInvestment || 0).toLocaleString()} (\u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4 \u09B0\u09BF\u099F\u09BE\u09B0\u09CD\u09A8 ${p.roiRate || 20}%)`).join("\n");
          reply = `\u0989\u0987\u09AB\u09BE\u09B0\u09CD\u09AE\u09C7\u09B0 \u099A\u09B2\u09AE\u09BE\u09A8 \u0995\u09C3\u09B7\u09BF \u0993 \u09A1\u09C7\u0987\u09B0\u09BF \u09AA\u09CD\u09B0\u0995\u09B2\u09CD\u09AA\u09B8\u09AE\u09C2\u09B9\u09C7 \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u09B8\u09CD\u09AC\u09BE\u0997\u09A4\u09AE!

\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 \u09AA\u09CD\u09B0\u09A7\u09BE\u09A8 \u09AA\u09CD\u09B0\u0995\u09B2\u09CD\u09AA\u09B8\u09AE\u09C2\u09B9:
${pList}

\u09AC\u09BF\u09B8\u09CD\u09A4\u09BE\u09B0\u09BF\u09A4 \u099C\u09BE\u09A8\u09A4\u09C7 \u098F\u09AC\u0982 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u09AF\u09C1\u0995\u09CD\u09A4 \u09B9\u09A4\u09C7 \u0993\u09DF\u09C7\u09AC\u09B8\u09BE\u0987\u099F\u09C7\u09B0 **\u09AA\u09CD\u09B0\u09CB\u099C\u09C7\u0995\u09CD\u099F\u09B8\u09AE\u09C2\u09B9 (Invest)** \u09B8\u09C7\u0995\u09B6\u09A8\u099F\u09BF \u0998\u09C1\u09B0\u09C7 \u09A6\u09C7\u0996\u09C1\u09A8\u0964`;
        } else {
          reply = "\u0989\u0987\u09AB\u09BE\u09B0\u09CD\u09AE (WeFarm)-\u098F \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u09B8\u09CD\u09AC\u09BE\u0997\u09A4\u09AE! \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u099A\u09B2\u09AE\u09BE\u09A8 \u0995\u09C3\u09B7\u09BF \u0993 \u09A1\u09C7\u0987\u09B0\u09BF \u09AA\u09CD\u09B0\u09CB\u099C\u09C7\u0995\u09CD\u099F\u0997\u09C1\u09B2\u09CB\u09A4\u09C7 \u0986\u09AA\u09A8\u09BF \u09AE\u09BE\u09B8\u09BF\u0995 \u09B2\u09AD\u09CD\u09AF\u09BE\u0982\u09B6 \u0985\u09A5\u09AC\u09BE \u098F\u0995\u0995\u09BE\u09B2\u09C0\u09A8 \u09AA\u09CD\u09B0\u09AB\u09BF\u099F \u09B6\u09C7\u09DF\u09BE\u09B0\u09BF\u0982 \u09AA\u09A6\u09CD\u09A7\u09A4\u09BF\u09A4\u09C7 \u09AC\u09BF\u09A8\u09BF\u09DF\u09CB\u0997 \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u09A8\u0964 \u09AC\u09BF\u09B8\u09CD\u09A4\u09BE\u09B0\u09BF\u09A4 \u099C\u09BE\u09A8\u09A4\u09C7 \u0993\u09DF\u09C7\u09AC\u09B8\u09BE\u0987\u099F\u09C7\u09B0 **\u09AA\u09CD\u09B0\u09CB\u099C\u09C7\u0995\u09CD\u099F\u09B8\u09AE\u09C2\u09B9** \u09AA\u09C7\u0987\u099C\u099F\u09BF \u09A6\u09C7\u0996\u09C1\u09A8\u0964";
        }
      } else if (lastMsgLower.includes("\u09AA\u09A3\u09CD\u09AF") || lastMsgLower.includes("\u09A6\u09C1\u09A7") || lastMsgLower.includes("\u09AE\u09BE\u0982\u09B8") || lastMsgLower.includes("\u0998\u09BF") || lastMsgLower.includes("\u09A1\u09BF\u09AE") || lastMsgLower.includes("\u0985\u09B0\u09CD\u09A1\u09BE\u09B0") || lastMsgLower.includes("\u09A6\u09BE\u09AE") || lastMsgLower.includes("product") || lastMsgLower.includes("dam") || lastMsgLower.includes("price")) {
        if (prods) {
          const prList = prods.slice(0, 4).map((p) => `\u2022 **${p.nameBn || p.name}**: \u09F3${p.price} / ${p.unit}`).join("\n");
          reply = `\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0996\u09BE\u09AE\u09BE\u09B0\u09C7\u09B0 \u09E7\u09E6\u09E6% \u09A8\u09CD\u09AF\u09BE\u099A\u09BE\u09B0\u09BE\u09B2 \u0985\u09B0\u09CD\u0997\u09BE\u09A8\u09BF\u0995 \u09AA\u09A3\u09CD\u09AF\u09B8\u09AE\u09C2\u09B9:
${prList}

\u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u0985\u09B0\u09CD\u09A1\u09BE\u09B0 \u0995\u09B0\u09A4\u09C7 \u0993\u09DF\u09C7\u09AC\u09B8\u09BE\u0987\u099F\u09C7\u09B0 **\u09AA\u09A3\u09CD\u09AF\u09B8\u09AE\u09C2\u09B9 (Shop)** \u09AA\u09C7\u0987\u099C\u09C7 \u09AD\u09BF\u099C\u09BF\u099F \u0995\u09B0\u09C1\u09A8 \u0985\u09A5\u09AC\u09BE \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964`;
        } else {
          reply = "\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0996\u09BE\u09AE\u09BE\u09B0 \u09A5\u09C7\u0995\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u09E7\u09E6\u09E6% \u0985\u09B0\u09CD\u0997\u09BE\u09A8\u09BF\u0995 \u09A6\u09C1\u09A7 (\u09F3\u09E7\u09E8\u09E6/\u09B2\u09BF\u099F\u09BE\u09B0), \u09A6\u09C7\u09B6\u09BF \u0997\u09B0\u09C1\u09B0 \u09AE\u09BE\u0982\u09B8 (\u09F3\u09EE\u09EB\u09E6/\u0995\u09C7\u099C\u09BF), \u0996\u09BE\u0981\u099F\u09BF \u0998\u09BF \u098F\u09AC\u0982 \u09A1\u09BF\u09AE \u0985\u09B0\u09CD\u09A1\u09BE\u09B0 \u0995\u09B0\u09A4\u09C7 \u0993\u09DF\u09C7\u09AC\u09B8\u09BE\u0987\u099F\u09C7\u09B0 **\u09AA\u09A3\u09CD\u09AF\u09B8\u09AE\u09C2\u09B9 (Products)** \u09B8\u09C7\u0995\u09B6\u09A8\u09C7 \u09AD\u09BF\u099C\u09BF\u099F \u0995\u09B0\u09C1\u09A8\u0964";
        }
      } else {
        reply = "\u0986\u09B8\u09B8\u09BE\u09B2\u09BE\u09AE\u09C1 \u0986\u09B2\u09BE\u0987\u0995\u09C1\u09AE! \u0986\u09AE\u09BF **WeFarm AI Assistant**\u0964 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0996\u09BE\u09AE\u09BE\u09B0\u09C7\u09B0 \u09E7\u09E6\u09E6% \u0996\u09BE\u0981\u099F\u09BF \u0985\u09B0\u09CD\u0997\u09BE\u09A8\u09BF\u0995 \u09AA\u09A3\u09CD\u09AF \u0985\u09B0\u09CD\u09A1\u09BE\u09B0 \u0995\u09B0\u09A4\u09C7 \u0985\u09A5\u09AC\u09BE \u09B9\u09BE\u09B2\u09BE\u09B2 \u0993 \u09A8\u09BF\u09B0\u09BE\u09AA\u09A6 \u0995\u09C3\u09B7\u09BF \u09AA\u09CD\u09B0\u0995\u09B2\u09CD\u09AA\u09C7 \u09AC\u09BF\u09A8\u09BF\u09DF\u09CB\u0997\u09C7\u09B0 \u09B8\u09C1\u09AF\u09CB\u0997 \u099C\u09BE\u09A8\u09A4\u09C7 \u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u09B8\u09BE\u09B9\u09BE\u09AF\u09CD\u09AF \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09BF\u0964 \u0986\u09AA\u09A8\u09BF \u09A0\u09BF\u0995 \u0995\u09CB\u09A8 \u09AC\u09BF\u09B7\u09DF\u09C7 \u099C\u09BE\u09A8\u09A4\u09C7 \u099A\u09BE\u09A8?";
      }
    } else {
      if (lastMsgLower.includes("invest") || lastMsgLower.includes("project") || lastMsgLower.includes("profit") || lastMsgLower.includes("return") || lastMsgLower.includes("roi")) {
        if (projs) {
          const pList = projs.slice(0, 3).map((p) => `\u2022 **${p.title}**: Min Investment \u09F3${Number(p.minInvestment || 0).toLocaleString()} BDT (Est. Return ${p.roiRate || 20}%)`).join("\n");
          reply = `Welcome to WeFarm Investment Opportunities!

Here are some of our active projects:
${pList}

You can explore active batches and apply directly in our **Projects** section.`;
        } else {
          reply = "Welcome to **WeFarm**! You can invest in our regenerative farming and dairy projects with either monthly profit-sharing or one-time return options. Visit our **Investment Projects** section to explore open batches.";
        }
      } else if (lastMsgLower.includes("product") || lastMsgLower.includes("milk") || lastMsgLower.includes("meat") || lastMsgLower.includes("ghee") || lastMsgLower.includes("egg") || lastMsgLower.includes("order") || lastMsgLower.includes("shop") || lastMsgLower.includes("price")) {
        if (prods) {
          const prList = prods.slice(0, 4).map((p) => `\u2022 **${p.name}**: \u09F3${p.price} BDT per ${p.unit}`).join("\n");
          reply = `Here are some of our 100% farm-fresh organic products:
${prList}

Visit our **Products / Shop** section to place your order with fast home delivery!`;
        } else {
          reply = "We offer 100% chemical-free, farm-fresh dairy (\u09F3120/L), grass-fed beef (\u09F3850/kg), organic ghee, and eggs directly from our farm in Cumilla. Visit the **Products** section to place your order!";
        }
      } else {
        reply = "Hello! Welcome to **WeFarm \u2014 Soil to Soul**. We practice regenerative agriculture in Cumilla, Bangladesh, offering farm-fresh organic produce and transparent crowd-farming investment opportunities. How can I assist you today?";
      }
    }
    return res.json({ success: true, reply });
  });
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
            responseMimeType: "application/json"
          }
        });
        const rawText = response.text || "[]";
        let suggestions2 = [];
        try {
          suggestions2 = JSON.parse(rawText);
        } catch {
          suggestions2 = [rawText];
        }
        return res.json({ success: true, suggestions: suggestions2 });
      } catch (error) {
        markIfCreditExhausted(error);
      }
    }
    const topic = String(promptInput).trim();
    let suggestions = [];
    switch (promptType) {
      case "hero_heading":
        suggestions = [
          `Pure & Honest ${topic} From Our Regenerative Farm`,
          `Nourishing Families With Natural ${topic}`,
          `From Honest Soil to Your Table: ${topic}`
        ];
        break;
      case "hero_tagline":
        suggestions = [
          `SOIL TO SOUL \u2022 ${topic.toUpperCase()}`,
          `100% NATURAL & REGENERATIVE FARMING`,
          `HONEST FOOD FROM HEALTHY SOIL`
        ];
        break;
      case "project_pitch":
        suggestions = [
          `Invest in ${topic} and become part of sustainable, ethical farming with transparent profit sharing and regular field updates.`,
          `Our ${topic} initiative combines modern herd management with 100% natural practices to deliver reliable returns for our investors.`,
          `Support regenerative agriculture in Bangladesh through ${topic} \u2014 earning halal, sustainable returns while empowering rural communities.`
        ];
        break;
      case "product_description":
        suggestions = [
          `100% pure, chemical-free ${topic} harvested fresh from WeFarm and delivered straight to your doorstep.`,
          `Raised and produced naturally with zero hormones or preservatives \u2014 experience the authentic taste of farm-fresh ${topic}.`,
          `Wholesome, nutrient-rich ${topic} crafted with care from our regenerative pastures to your family table.`
        ];
        break;
      default:
        suggestions = [
          `Rooted in the philosophy of Soil to Soul \u2014 ${topic} grown with integrity, transparency, and respect for nature.`,
          `Experience authentic regenerative farming with ${topic}, bringing pure nourishment from our pastures to your home.`,
          `Building a sustainable agricultural future through ${topic} \u2014 where honest soil meets community prosperity.`
        ];
        break;
    }
    return res.json({ success: true, suggestions });
  });
  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, items, sourceLang, targetLang, fieldContext = "website copy" } = req.body || {};
      if (!targetLang || targetLang !== "bn" && targetLang !== "en") {
        return res.status(400).json({ success: false, error: "Valid targetLang ('bn' or 'en') is required." });
      }
      if (Array.isArray(items)) {
        if (items.length === 0) {
          return res.json({ success: true, translatedItems: [] });
        }
        if (!geminiCreditExhausted) {
          try {
            const ai = getAiClient();
            const systemInstruction = targetLang === "bn" ? `You are an expert bilingual copywriter (English to Bengali) for "WeFarm - Soil to Soul", a regenerative agriculture & farm investment platform in Bangladesh.
Convert each English string in the input JSON array into well-structured, natural, eloquent, and appealing Bengali (\u09AA\u09CD\u09B0\u09AE\u09BF\u09A4 \u0993 \u09B8\u09BE\u09AC\u09B2\u09C0\u09B2 \u09AC\u09BE\u0982\u09B2\u09BE) appropriate for a modern agricultural & investment website.
Keep numbers/symbols accurate (you may use Bengali digits or keep standard formatting naturally).
Return ONLY a valid JSON array of strings of the exact same length as the input array.` : `You are an expert bilingual copywriter (Bengali to English) for "WeFarm - Soil to Soul", a regenerative agriculture & farm investment platform in Bangladesh.
Convert each Bengali string in the input JSON array into polished, natural, compelling English copy appropriate for a modern agricultural & investment website.
Return ONLY a valid JSON array of strings of the exact same length as the input array.`;
            const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
            const response = await ai.models.generateContent({
              model: geminiModel,
              contents: JSON.stringify(items),
              config: {
                systemInstruction,
                responseMimeType: "application/json"
              }
            });
            let translatedItems2 = [];
            try {
              translatedItems2 = JSON.parse(response.text || "[]");
            } catch {
              translatedItems2 = [];
            }
            if (Array.isArray(translatedItems2) && translatedItems2.length === items.length) {
              return res.json({ success: true, translatedItems: translatedItems2 });
            }
          } catch (aiErr) {
            markIfCreditExhausted(aiErr);
          }
        }
        const translatedItems = await fallbackNeuralTranslateBatch(items, targetLang);
        return res.json({ success: true, translatedItems, provider: "neural-fallback" });
      }
      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ success: false, error: "Text is required for translation." });
      }
      if (!geminiCreditExhausted) {
        try {
          const ai = getAiClient();
          const systemInstruction = targetLang === "bn" ? `You are an expert bilingual brand copywriter (English to Bengali) for "WeFarm - Soil to Soul", a regenerative agriculture & farm investment platform in Bangladesh.
Convert the user's English text into well-structured, natural, eloquent, and emotionally resonant Bengali (\u09B8\u09BE\u09AC\u09B2\u09C0\u09B2 \u0993 \u09AE\u09BE\u09A8\u09B8\u09AE\u09CD\u09AE\u09A4 \u09AC\u09BE\u0982\u09B2\u09BE) suitable for "${fieldContext}" on our website.
Do NOT add quotes, explanations, or extra commentary \u2014 output ONLY the final Bengali text.` : `You are an expert bilingual brand copywriter (Bengali to English) for "WeFarm - Soil to Soul", a regenerative agriculture & farm investment platform in Bangladesh.
Convert the user's Bengali text into polished, natural, and compelling English copy suitable for "${fieldContext}" on our website.
Do NOT add quotes, explanations, or extra commentary \u2014 output ONLY the final English text.`;
          const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
          const response = await ai.models.generateContent({
            model: geminiModel,
            contents: text.trim(),
            config: {
              systemInstruction
            }
          });
          const translatedText2 = (response.text || "").trim().replace(/^["']|["']$/g, "");
          if (translatedText2) {
            return res.json({
              success: true,
              translatedText: translatedText2,
              sourceLang: sourceLang || (targetLang === "bn" ? "en" : "bn"),
              targetLang
            });
          }
        } catch (aiErr) {
          markIfCreditExhausted(aiErr);
        }
      }
      const translatedText = await fallbackNeuralTranslateSingle(text.trim(), targetLang);
      return res.json({
        success: true,
        translatedText,
        sourceLang: sourceLang || (targetLang === "bn" ? "en" : "bn"),
        targetLang,
        provider: "neural-fallback"
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Translation failed."
      });
    }
  });
  const otpStore = /* @__PURE__ */ new Map();
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
        updatedAt: smsConfig.updatedAt
      }
    });
  });
  app.post("/api/sms/config", (req, res) => {
    try {
      const { apiKey, senderId, defaultContentId, otpTemplate } = req.body || {};
      const current = loadSmsConfig();
      const updated = {
        apiKey: typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : current.apiKey,
        senderId: typeof senderId === "string" ? senderId.trim() : current.senderId,
        defaultContentId: typeof defaultContentId === "string" ? defaultContentId.trim() : current.defaultContentId,
        otpTemplate: typeof otpTemplate === "string" && otpTemplate.trim() ? otpTemplate.trim() : current.otpTemplate,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      smsConfig = updated;
      saveSmsConfig(updated);
      return res.json({ success: true, message: "SMS configuration synced on server." });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message || "Failed to update SMS config." });
    }
  });
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
          response: result.data
        });
      }
      return res.json({
        success: true,
        balance: result.data?.data?.balance ?? "0.0000",
        validity: result.data?.data?.validity ?? null,
        response: result.data
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message || "Failed to fetch SMS balance." });
    }
  });
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
          response: result.data
        });
      }
      return res.json({
        success: true,
        report: result.data?.data || null,
        response: result.data
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message || "Failed to fetch SMS report." });
    }
  });
  app.get("/api/sms/otp-logs", (_req, res) => {
    return res.json({
      success: true,
      logs: loadOtpLogs()
    });
  });
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone || typeof phone !== "string") {
        return res.status(400).json({ success: false, error: "\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09AA\u09CD\u09B0\u09A6\u09BE\u09A8 \u0995\u09B0\u09BE \u0986\u09AC\u09B6\u09CD\u09AF\u0995 (Phone number is required)." });
      }
      const canonicalPhone = normalizeBdPhone(phone);
      const formattedRecipient = formatAlphaNetNumber(phone);
      if (!formattedRecipient || canonicalPhone.length < 10 || canonicalPhone.length > 15) {
        return res.status(400).json({ success: false, error: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u098F\u0995\u099F\u09BF \u09B8\u09A0\u09BF\u0995 \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09A6\u09BF\u09A8 (Invalid phone number format)." });
      }
      smsConfig = loadSmsConfig();
      const apiKey = smsConfig.apiKey || DEFAULT_SMS_API_KEY;
      const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
      const expiresAt = Date.now() + 5 * 60 * 1e3;
      otpStore.set(canonicalPhone, { otp, expiresAt });
      const template = smsConfig.otpTemplate || DEFAULT_OTP_TEMPLATE;
      const smsMessage = template.includes("{otp}") ? template.replace(/\{otp\}/g, otp) : `${template} ${otp}`;
      const result = await sendAlphaNetSms({
        apiKey,
        to: formattedRecipient,
        msg: smsMessage,
        senderId: smsConfig.senderId || void 0
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
        errorMessage: result.ok ? void 0 : result.msg,
        senderId: smsConfig.senderId || void 0,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (result.ok) {
        return res.json({
          success: true,
          smsSent: true,
          requestId: result.requestId,
          phone: canonicalPhone,
          message: `\u0986\u09AA\u09A8\u09BE\u09B0 ${canonicalPhone} \u09A8\u09AE\u09CD\u09AC\u09B0\u09C7 \u09EC \u09B8\u0982\u0996\u09CD\u09AF\u09BE\u09B0 OTP \u0995\u09CB\u09A1 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7\u0964`
        });
      }
      return res.status(400).json({
        success: false,
        smsSent: false,
        errorCode: result.errorCode,
        error: `SMS \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09AF\u09BE\u09DF\u09A8\u09BF (${result.msg})\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u098F\u09A1\u09AE\u09BF\u09A8 \u09AA\u09CD\u09AF\u09BE\u09A8\u09C7\u09B2\u09C7\u09B0 SMS \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09BE\u09B0 \u09A5\u09C7\u0995\u09C7 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u0993 \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09C1\u09A8\u0964`,
        phone: canonicalPhone
      });
    } catch (error) {
      console.error("Error in /api/auth/send-otp:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to send OTP." });
    }
  });
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ success: false, error: "\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u098F\u09AC\u0982 OTP \u0995\u09CB\u09A1 \u0989\u09AD\u09DF\u0987 \u09AA\u09CD\u09B0\u09DF\u09CB\u099C\u09A8\u0964" });
      }
      const canonicalPhone = normalizeBdPhone(phone);
      const record = otpStore.get(canonicalPhone);
      if (!record) {
        return res.status(400).json({
          success: false,
          error: "\u0995\u09CB\u09A8\u09CB \u09B8\u0995\u09CD\u09B0\u09BF\u09DF OTP \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 'OTP \u09AA\u09BE\u09A0\u09BE\u09A8' \u09AC\u09BE\u099F\u09A8\u09C7 \u0995\u09CD\u09B2\u09BF\u0995 \u0995\u09B0\u09C1\u09A8\u0964"
        });
      }
      if (Date.now() > record.expiresAt) {
        otpStore.delete(canonicalPhone);
        return res.status(400).json({
          success: false,
          error: "OTP \u0995\u09CB\u09A1\u099F\u09BF\u09B0 \u09AE\u09C7\u09DF\u09BE\u09A6 \u09B6\u09C7\u09B7 \u09B9\u09DF\u09C7 \u0997\u09C7\u099B\u09C7 (\u09EB \u09AE\u09BF\u09A8\u09BF\u099F)\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09A8\u09A4\u09C1\u09A8 OTP \u09A8\u09BF\u09A8\u0964"
        });
      }
      if (record.otp !== String(otp).trim()) {
        return res.status(400).json({
          success: false,
          error: "\u09AD\u09C1\u09B2 OTP \u0995\u09CB\u09A1 \u09A6\u09C7\u0993\u09DF\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B8\u09A0\u09BF\u0995 \u09EC \u09B8\u0982\u0996\u09CD\u09AF\u09BE\u09B0 \u0995\u09CB\u09A1\u099F\u09BF \u09B2\u09BF\u0996\u09C1\u09A8\u0964"
        });
      }
      otpStore.delete(canonicalPhone);
      return res.json({
        success: true,
        phone: canonicalPhone,
        message: "OTP \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AF\u09BE\u099A\u09BE\u0987 \u09B9\u09DF\u09C7\u099B\u09C7!"
      });
    } catch (error) {
      console.error("Error in /api/auth/verify-otp:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to verify OTP." });
    }
  });
  const handleSendSmsRequest = async (req, res) => {
    try {
      const { recipients, message, schedule, senderId, contentId, apiKey: bodyApiKey } = req.body || {};
      if (!recipients || !message || !String(message).trim()) {
        return res.status(400).json({ success: false, error: "Recipients and message are required." });
      }
      smsConfig = loadSmsConfig();
      const apiKey = typeof bodyApiKey === "string" && bodyApiKey.trim() || smsConfig.apiKey || DEFAULT_SMS_API_KEY;
      const rawList = Array.isArray(recipients) ? recipients.map(String) : String(recipients).split(/[\n,;]+/);
      const formattedList = Array.from(
        new Set(
          rawList.map((r) => formatAlphaNetNumber(r)).filter((r) => Boolean(r))
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
        schedule: typeof schedule === "string" && schedule.trim() ? schedule.trim() : void 0,
        senderId: activeSenderId || void 0,
        contentId: activeContentId || void 0
      });
      if (result.ok) {
        return res.json({
          success: true,
          requestId: result.requestId,
          recipientCount: formattedList.length,
          formattedRecipients: formattedList,
          response: result.data
        });
      }
      return res.status(400).json({
        success: false,
        error: result.msg,
        errorCode: result.errorCode,
        response: result.data
      });
    } catch (error) {
      console.error("SMS sending error:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to send SMS." });
    }
  };
  app.post("/api/sms/send", handleSendSmsRequest);
  app.post("/api/notify-investors", handleSendSmsRequest);
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_fs.default.existsSync(import_path.default.join(process.cwd(), "dist", "index.html")) ? import_path.default.join(process.cwd(), "dist") : import_fs.default.existsSync(import_path.default.join(__dirname, "index.html")) ? __dirname : import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
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
//# sourceMappingURL=server.cjs.map
