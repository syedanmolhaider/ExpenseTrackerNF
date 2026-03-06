const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const JWT_SECRET = process.env.JWT_SECRET;
// Netlify sets CONTEXT (not NODE_ENV) — check both for safety
const isProduction = process.env.CONTEXT === "production" || process.env.NODE_ENV === "production";
if (!JWT_SECRET && isProduction) {
  throw new Error("CRITICAL FATAL: JWT_SECRET environment variable is missing in production!");
}
if (!JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET not set — using fallback dev secret. Do NOT use in production!");
}
const SECRET = JWT_SECRET || "fallback-dev-secret-only";
const COOKIE_NAME = "auth_token";

function generateToken(userId) {
  return jwt.sign({ userId }, SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
}

function setAuthCookie(token) {
  return cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

function clearAuthCookie() {
  return cookie.serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}

function getUserFromRequest(event) {
  try {
    const cookies = cookie.parse(event.headers.cookie || "");
    const token = cookies[COOKIE_NAME];

    if (!token) {
      return null;
    }

    const decoded = verifyToken(token);
    return decoded;
  } catch (error) {
    return null;
  }
}

// Email format validation
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function createResponse(statusCode, body, setCookie = null) {
  const origin = process.env.URL || process.env.DEPLOY_PRIME_URL || "*";
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };

  if (setCookie) {
    headers["Set-Cookie"] = setCookie;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

module.exports = {
  generateToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  getUserFromRequest,
  createResponse,
  isValidEmail,
};
