// Simple in-memory rate limiter for Netlify Functions
// Works within warm function containers (same-process reuse)
// For distributed rate limiting, use Upstash Redis

const store = new Map();
const CLEANUP_INTERVAL = 60000; // Clean expired entries every 60s

// Auto-cleanup expired entries
let lastCleanup = Date.now();
function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, entry] of store) {
        if (now > entry.resetTime) store.delete(key);
    }
}

/**
 * Check rate limit for a given key
 * @param {string} key - Unique identifier (e.g., IP address)
 * @param {number} maxRequests - Max requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
 */
function checkRateLimit(key, maxRequests = 60, windowMs = 60000) {
    cleanup();
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now > entry.resetTime) {
        entry = { count: 0, resetTime: now + windowMs };
        store.set(key, entry);
    }

    entry.count++;

    if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return { allowed: false, remaining: 0, retryAfter };
    }

    return { allowed: true, remaining: maxRequests - entry.count, retryAfter: 0 };
}

/**
 * Get client IP from Netlify event
 */
function getClientIP(event) {
    return (
        event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        event.headers["x-real-ip"] ||
        event.headers["client-ip"] ||
        "unknown"
    );
}

/**
 * Rate limit middleware for Netlify functions
 * Returns null if allowed, or a response object if rate limited
 */
function rateLimitCheck(event, { maxRequests = 60, windowMs = 60000, prefix = "global" } = {}) {
    const ip = getClientIP(event);
    const key = `${prefix}:${ip}`;
    const result = checkRateLimit(key, maxRequests, windowMs);

    if (!result.allowed) {
        const { createResponse } = require("./auth");
        const response = createResponse(429, {
            error: "Too many requests. Please try again later.",
            retryAfter: result.retryAfter,
        });
        response.headers["Retry-After"] = String(result.retryAfter);
        response.headers["X-RateLimit-Limit"] = String(maxRequests);
        response.headers["X-RateLimit-Remaining"] = "0";
        return response;
    }

    return null; // Allowed
}

module.exports = {
    checkRateLimit,
    getClientIP,
    rateLimitCheck,
};
