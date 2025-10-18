const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback-secret-change-in-production";
const COOKIE_NAME = "auth_token";

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function setAuthCookie(token) {
  return cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

function clearAuthCookie() {
  return cookie.serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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

function createResponse(statusCode, body, setCookie = null) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
};
