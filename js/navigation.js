/**
 * Navigation Controller for Dashboard/Logs Sections
 * Handles switching between different views
 */

class NavigationController {
  constructor() {
    this.currentSection = "dashboard";
    this.navItems = document.querySelectorAll(".nav-item");
    this.sections = document.querySelectorAll(".content-section");

    this.init();
  }

  init() {
    // Add click handlers to navigation items
    this.navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const section = e.currentTarget.dataset.section;
        this.switchSection(section);
      });
    });

    // Handle initial section from URL hash
    const hash = window.location.hash.replace("#", "");
    if (hash === "logs" || hash === "dashboard") {
      this.switchSection(hash);
    }

    // Listen for browser back/forward
    window.addEventListener("hashchange", () => {
      const newHash = window.location.hash.replace("#", "");
      if (newHash === "logs" || newHash === "dashboard") {
        this.switchSection(newHash, false);
      }
    });
  }

  switchSection(sectionName, updateHash = true) {
    // Don't do anything if already on this section
    if (this.currentSection === sectionName) return;

    // Update current section
    this.currentSection = sectionName;

    // Update navigation active state
    this.navItems.forEach((item) => {
      if (item.dataset.section === sectionName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update section visibility with animation
    this.sections.forEach((section) => {
      if (section.id === `${sectionName}-section`) {
        section.classList.add("active");

        // Trigger custom event for other scripts
        window.dispatchEvent(
          new CustomEvent("section:changed", {
            detail: { section: sectionName },
          })
        );
      } else {
        section.classList.remove("active");
      }
    });

    // Update URL hash
    if (updateHash) {
      window.history.pushState(null, "", `#${sectionName}`);
    }

    // Scroll to top smoothly
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    console.log(`Switched to ${sectionName} section`);
  }

  getCurrentSection() {
    return this.currentSection;
  }
}

// Initialize navigation when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.navigationController = new NavigationController();
  });
} else {
  window.navigationController = new NavigationController();
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = NavigationController;
}
