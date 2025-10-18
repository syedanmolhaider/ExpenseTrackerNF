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
    const { email, password } = JSON.parse(event.body);

    // Validate input
    if (!email || !password) {
      return createResponse(400, { error: "Email and password are required" });
    }

    // Find user by email
    const result = await query(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return createResponse(401, { error: "Invalid email or password" });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return createResponse(401, { error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = generateToken(user.id);
    const authCookie = setAuthCookie(token);

    return createResponse(
      200,
      {
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      authCookie
    );
  } catch (error) {
    console.error("Login error:", error);
    return createResponse(500, { error: "Internal server error" });
  }
};
