const bcrypt = require("bcryptjs");
const { query } = require("./utils/db");
const {
  generateToken,
  setAuthCookie,
  createResponse,
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
    console.log("Signup request received");
    const { name, email, password } = JSON.parse(event.body);
    console.log("Parsed body:", {
      name,
      email,
      passwordLength: password?.length,
    });

    // Validate input
    if (!name || !email || !password) {
      return createResponse(400, {
        error: "Name, email, and password are required",
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
    console.log("Checking existing user for email:", email);
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (existingUser.rows.length > 0) {
      console.log("Email already exists");
      return createResponse(400, { error: "Email already registered" });
    }

    // Hash password
    console.log("Starting password hashing...");
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log("Password hashed successfully");
    console.log("Password hashed successfully");

    // Insert user
    console.log("Inserting user into database...");
    const result = await query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
      [name, email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    console.log("User created successfully:", user.id);

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
    console.error("Signup error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    return createResponse(500, {
      error: "Internal server error",
      debug: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
