// Check if user is already logged in
async function checkAuth() {
  try {
    const response = await fetch("/api/me", {
      credentials: "include",
    });

    if (response.ok) {
      // User is logged in, redirect to dashboard
      window.location.href = "/dashboard.html";
    }
  } catch (error) {
    console.error("Auth check error:", error);
  }
}

// Initialize
checkAuth();

// Get DOM elements
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginFormElement = document.getElementById("loginFormElement");
const signupFormElement = document.getElementById("signupFormElement");
const showSignupBtn = document.getElementById("showSignup");
const showLoginBtn = document.getElementById("showLogin");
const loginError = document.getElementById("loginError");
const signupError = document.getElementById("signupError");

// Toggle between login and signup forms
showSignupBtn.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.style.display = "none";
  signupForm.style.display = "block";
  loginError.classList.remove("show");
  loginFormElement.reset();
});

showLoginBtn.addEventListener("click", (e) => {
  e.preventDefault();
  signupForm.style.display = "none";
  loginForm.style.display = "block";
  signupError.classList.remove("show");
  signupFormElement.reset();
});

// Handle login form submission
loginFormElement.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      // Login successful, redirect to dashboard
      window.location.href = "/dashboard.html";
    } else {
      // Show error message
      loginError.textContent = result.error || "Login failed";
      loginError.classList.add("show");
    }
  } catch (error) {
    console.error("Login error:", error);
    loginError.textContent = "An error occurred. Please try again.";
    loginError.classList.add("show");
  }
});

// Handle signup form submission
signupFormElement.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  // Client-side validation
  if (data.password.length < 6) {
    signupError.textContent = "Password must be at least 6 characters";
    signupError.classList.add("show");
    return;
  }

  try {
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      // Signup successful, redirect to dashboard
      window.location.href = "/dashboard.html";
    } else {
      // Show error message
      signupError.textContent = result.error || "Signup failed";
      signupError.classList.add("show");
    }
  } catch (error) {
    console.error("Signup error:", error);
    signupError.textContent = "An error occurred. Please try again.";
    signupError.classList.add("show");
  }
});
