// ------ Global Interceptor ------
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);
  if (
    response.status === 401 &&
    !args[0].includes("/api/me") &&
    !args[0].includes("/api/login")
  ) {
    window.location.href = "/index.html";
  }
  return response;
};

// ------ Auth ------
async function checkAuth() {
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) {
      window.location.href = "/index.html";
      return;
    }
    const data = await res.json();
    document.getElementById("userName").textContent = data.user.name;
  } catch {
    window.location.href = "/index.html";
  }
}

// ------ Settings API ------
async function loadSettings() {
  try {
    const res = await fetch("/api/settings", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        userSettings.month_start_day =
          parseInt(data.settings.month_start_day) || 1;
        userSettings.month_end_day = parseInt(data.settings.month_end_day) || 0;
        userSettings.currency = data.settings.currency || "Rs";
      }
    }
  } catch (err) {
    console.error("Failed to load settings", err);
  }
}

