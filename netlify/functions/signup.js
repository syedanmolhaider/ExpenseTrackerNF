const bcrypt = require("bcryptjs");
const { query } = require("./utils/db");
const {
  generateToken,
  setAuthCookie,
  createResponse,
  isValidEmail,
} = require("./utils/auth");

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" });
  }

  if (event.httpMethod !== "POST") {
    return createResponse(405, { error: "Method not allowed" });
  }

  try {
    const { name, email, password } = JSON.parse(event.body);

    // Validate input
    if (!name || !email || !password) {
      return createResponse(400, {
        error: "Name, email, and password are required",
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return createResponse(400, {
        error: "Please enter a valid email address",
      });
    }

    if (password.length < 6 || password.length > 72) {
      return createResponse(400, {
        error: "Password must be between 6 and 72 characters",
      });
    }

    if (name.length > 100 || email.length > 255) {
      return createResponse(400, {
        error: "Name or email exceeds maximum length",
      });
    }

    // Check if email already exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (existingUser.rows.length > 0) {
      return createResponse(400, { error: "Email already registered" });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
      [name, email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user.id);
    const authCookie = setAuthCookie(token);

    return createResponse(
      201,
      {
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.created_at,
        },
      },
      authCookie
    );
  } catch (error) {
    console.error("Signup error:", error.message);
    return createResponse(500, {
      error: "Internal server error",
    });
  }
};
