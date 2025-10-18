/**
 * Main Application Entry Point
 * Initializes 3D stage, micro-interactions, and visualizations
 */

class App {
  constructor() {
    this.stage = null;
    this.microClick = null;
    this.pointer = null;
    this.visualizer = null;
    this.isInitialized = false;
    this.reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    this.init();
  }

  async init() {
    console.log("🚀 Initializing Neon 3D App...");

    // Check if mobile device
    const isMobile = this.detectMobileDevice();
    if (isMobile) {
      console.log("📱 Mobile device detected - Using lightweight mode");
      this.initFallbackMode();
      return;
    }

    // Check for WebGL support and GPU tier
    const gpuTier = await this.detectGPUTier();
    console.log("GPU Tier:", gpuTier);

    if (gpuTier === "low" || this.reducedMotion) {
      console.log("Using CSS-only fallback mode");
      this.initFallbackMode();
      return;
    }

    try {
      // Wait for dependencies to load
      await this.loadDependencies();

      // Initialize 3D stage
      this.stage = new ThreeStage({
        enablePostProcessing: gpuTier === "high",
        particleCount: gpuTier === "high" ? 500 : 200,
      });

      // Initialize micro-click animator
      this.microClick = new MicroClickAnimator(this.stage);

      // Initialize pointer controller
      this.pointer = new PointerController(this.stage);

      // Initialize dashboard visualizer
      this.visualizer = new DashboardVisualizer(this.stage);

      // Setup page-specific features
      this.setupPageFeatures();

      // Setup settings panel
      this.setupSettings();

      this.isInitialized = true;
      console.log("✅ App initialized successfully");

      // Dispatch custom event
      window.dispatchEvent(
        new CustomEvent("app:initialized", {
          detail: { stage: this.stage },
        })
      );
    } catch (error) {
      console.error("❌ Failed to initialize 3D features:", error);
      this.initFallbackMode();
    }
  }

  async loadDependencies() {
    // Check if dependencies are loaded
    if (typeof THREE === "undefined") {
      throw new Error("Three.js not loaded");
    }

    if (typeof gsap === "undefined") {
      throw new Error("GSAP not loaded");
    }

    // Check for required classes
    if (
      typeof ThreeStage === "undefined" ||
      typeof MicroClickAnimator === "undefined" ||
      typeof PointerController === "undefined" ||
      typeof DashboardVisualizer === "undefined"
    ) {
      throw new Error("Required modules not loaded");
    }
  }

  detectMobileDevice() {
    // Check for mobile/tablet devices
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    const isSmallScreen = window.innerWidth <= 768;
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    return isMobile || (isSmallScreen && isTouchDevice);
  }

  async detectGPUTier() {
    // Simple GPU tier detection
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (!gl) return "none";

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : "";

    // Basic heuristic
    if (renderer.includes("Intel HD") || renderer.includes("Mali")) {
      return "low";
    } else if (
      renderer.includes("GTX") ||
      renderer.includes("RTX") ||
      renderer.includes("Radeon") ||
      renderer.includes("Apple M")
    ) {
      return "high";
    }

    return "medium";
  }

  setupPageFeatures() {
    const path = window.location.pathname;

    if (path.includes("dashboard.html")) {
      this.setupDashboard();
    } else if (path.includes("index.html") || path === "/") {
      this.setupAuth();
    }
  }

  setupDashboard() {
    console.log("📊 Setting up dashboard features...");

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.initDashboardVisuals()
      );
    } else {
      this.initDashboardVisuals();
    }
  }

  initDashboardVisuals() {
    // Create sample visualizations
    setTimeout(() => {
      // Find summary cards and add visualizations
      const summaryCards = document.querySelectorAll(".summary-card");

      summaryCards.forEach((card, index) => {
        const value = card.querySelector(".summary-value");
        if (value) {
          const numValue = parseInt(value.textContent.replace(/\D/g, "")) || 0;
          const maxValue = 10000; // Default max

          // Add gauge visualization
          if (index === 0 && this.visualizer) {
            this.visualizer.createGauge(card, numValue, maxValue, {
              radius: 3,
              thickness: 0.3,
              color: 0xff00d1,
            });
          }
        }
      });

      // Create donut chart for categories (if data available)
      const expenseSection = document.querySelector(".expenses-section");
      if (expenseSection && this.visualizer) {
        // Sample data - replace with real data
        const categoryData = [
          { category: "Food", value: 450, color: 0x00e5ff },
          { category: "Transport", value: 300, color: 0xff00d1 },
          { category: "Entertainment", value: 200, color: 0xc7ff00 },
          { category: "Utilities", value: 150, color: 0x00e5ff },
        ];

        // Create visualization placeholder
        const vizContainer = document.createElement("div");
        vizContainer.className = "category-visualization";
        vizContainer.style.cssText = `
          width: 200px;
          height: 200px;
          position: relative;
          margin: 20px auto;
        `;
        expenseSection.insertBefore(vizContainer, expenseSection.firstChild);

        // this.visualizer.createDonutChart(vizContainer, categoryData);
      }
    }, 1000);
  }

  setupAuth() {
    console.log("🔐 Setting up auth page features...");

    // Add floating panels behind auth card
    if (this.stage) {
      setTimeout(() => {
        this.stage.createGlassPanel(
          15,
          20,
          0.5,
          { x: -10, y: 5, z: -10 },
          { x: 0.2, y: -0.3, z: 0.1 }
        );

        this.stage.createGlassPanel(
          18,
          15,
          0.5,
          { x: 12, y: -8, z: -15 },
          { x: -0.1, y: 0.2, z: -0.1 }
        );
      }, 500);
    }
  }

  setupSettings() {
    // Create settings panel
    const settings = document.createElement("div");
    settings.id = "neon-settings";
    settings.innerHTML = `
      <button id="settings-toggle" class="settings-toggle" aria-label="Settings">
        ⚙️
      </button>
      <div class="settings-panel" style="display: none;">
        <h3>Display Settings</h3>
        <label>
          <input type="checkbox" id="toggle-3d" ${
            this.isInitialized ? "checked" : ""
          }>
          Enable 3D Effects
        </label>
        <label>
          <input type="checkbox" id="toggle-particles" checked>
          Show Particles
        </label>
        <label>
          <input type="checkbox" id="toggle-animations" checked>
          Enable Animations
        </label>
        <label>
          <input type="checkbox" id="high-contrast">
          High Contrast Mode
        </label>
      </div>
    `;

    settings.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
    `;

    document.body.appendChild(settings);

    // Settings toggle
    document.getElementById("settings-toggle").addEventListener("click", () => {
      const panel = settings.querySelector(".settings-panel");
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    // Settings handlers
    document.getElementById("toggle-3d")?.addEventListener("change", (e) => {
      if (e.target.checked && !this.isInitialized) {
        this.init();
      } else if (!e.target.checked && this.isInitialized) {
        this.destroy();
      }
    });

    document
      .getElementById("toggle-particles")
      ?.addEventListener("change", (e) => {
        if (this.stage && this.stage.particles) {
          this.stage.particles.visible = e.target.checked;
        }
      });

    document
      .getElementById("toggle-animations")
      ?.addEventListener("change", (e) => {
        if (this.pointer) {
          e.target.checked ? this.pointer.enable() : this.pointer.disable();
        }
      });

    document
      .getElementById("high-contrast")
      ?.addEventListener("change", (e) => {
        document.documentElement.classList.toggle(
          "high-contrast",
          e.target.checked
        );
      });
  }

  initFallbackMode() {
    document.documentElement.classList.add("css-fallback");
    console.log("💾 Running in CSS fallback mode");

    // Still enable micro-interactions without 3D
    if (typeof MicroClickAnimator !== "undefined") {
      this.microClick = new MicroClickAnimator(null);
    }
  }

  destroy() {
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }

    if (this.pointer) {
      this.pointer.destroy();
      this.pointer = null;
    }

    if (this.visualizer) {
      this.visualizer.clear();
      this.visualizer = null;
    }

    this.isInitialized = false;
    document.documentElement.classList.add("css-fallback");
  }
}

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.neonApp = new App();
  });
} else {
  window.neonApp = new App();
}

// Export for global access
if (typeof module !== "undefined" && module.exports) {
  module.exports = App;
}
