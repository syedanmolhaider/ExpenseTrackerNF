/**
 * Pointer Controller
 * Handles parallax tilt effects on interactive elements
 */

class PointerController {
  constructor(stage) {
    this.stage = stage;
    this.pointer = { x: 0, y: 0 };
    this.targetRotation = { x: 0, y: 0 };
    this.currentRotation = { x: 0, y: 0 };
    this.isEnabled = true;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.trackedElements = new Map();

    this.init();
  }

  init() {
    // Listen for reduced motion preference
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
        if (this.reducedMotion) {
          this.resetAllTilts();
        }
      });

    // Setup pointer tracking
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e), { passive: true });
    window.addEventListener('pointerleave', () => this.handlePointerLeave());

    // Auto-detect elements to track
    this.autoDetectElements();

    // Start animation loop
    this.animate();

    console.log('👆 Pointer controller initialized');
  }

  autoDetectElements() {
    // Auto-track common interactive elements
    const selectors = [
      '.auth-card',
      '.summary-card',
      '.expense-item',
      '.add-expense-section',
      '.modal-content'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        this.trackElement(el);
      });
    });

    // Setup mutation observer for dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            selectors.forEach(selector => {
              if (node.matches && node.matches(selector)) {
                this.trackElement(node);
              }
              node.querySelectorAll && node.querySelectorAll(selector).forEach(el => {
                this.trackElement(el);
              });
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  trackElement(element, options = {}) {
    if (this.trackedElements.has(element)) {
      return;
    }

    const config = {
      maxTilt: options.maxTilt || 3,
      speed: options.speed || 0.1,
      perspective: options.perspective || 1000,
      scale: options.scale || 1.02,
      glareEffect: options.glareEffect !== false,
      ...options
    };

    // Store original transform
    const originalTransform = window.getComputedStyle(element).transform;

    this.trackedElements.set(element, {
      config,
      originalTransform,
      currentTilt: { x: 0, y: 0 },
      glareElement: null
    });

    // Setup element
    element.style.transformStyle = 'preserve-3d';
    element.style.transition = 'transform 0.1s ease-out';

    // Add glare effect
    if (config.glareEffect && !element.querySelector('.parallax-glare')) {
      const glare = document.createElement('div');
      glare.className = 'parallax-glare';
      glare.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: inherit;
        background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        z-index: 10;
      `;
      element.appendChild(glare);
      this.trackedElements.get(element).glareElement = glare;
    }

    // Setup hover listeners
    element.addEventListener('mouseenter', () => {
      if (!this.reducedMotion) {
        gsap.to(element, {
          scale: config.scale,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    });

    element.addEventListener('mouseleave', () => {
      this.resetTilt(element);
    });
  }

  handlePointerMove(e) {
    if (this.reducedMotion || !this.isEnabled) {
      return;
    }

    // Normalize pointer position (-1 to 1)
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    // Update each tracked element
    this.trackedElements.forEach((data, element) => {
      this.updateElementTilt(element, e);
    });

    // Update camera if 3D stage exists
    if (this.stage && this.stage.camera) {
      this.targetRotation.x = this.pointer.y * 0.5;
      this.targetRotation.y = this.pointer.x * 0.5;
    }
  }

  updateElementTilt(element, event) {
    const rect = element.getBoundingClientRect();
    const data = this.trackedElements.get(element);

    if (!data) return;

    // Check if pointer is over element
    const isOver = 
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!isOver) {
      return;
    }

    // Calculate tilt based on pointer position within element
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const tiltX = ((y - 0.5) * 2) * data.config.maxTilt;
    const tiltY = ((x - 0.5) * -2) * data.config.maxTilt;

    // Apply transform
    element.style.transform = `
      perspective(${data.config.perspective}px)
      rotateX(${tiltX}deg)
      rotateY(${tiltY}deg)
      translateZ(8px)
    `;

    // Update glare position
    if (data.glareElement) {
      data.glareElement.style.background = 
        `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255, 255, 255, 0.2) 0%, transparent 50%)`;
      data.glareElement.style.opacity = '1';
    }
  }

  handlePointerLeave() {
    // Reset all tilts when pointer leaves window
    this.resetAllTilts();
  }

  resetTilt(element) {
    const data = this.trackedElements.get(element);
    if (!data) return;

    gsap.to(element, {
      scale: 1,
      duration: 0.4,
      ease: 'power2.inOut'
    });

    element.style.transform = data.originalTransform !== 'none' 
      ? data.originalTransform 
      : 'none';

    if (data.glareElement) {
      data.glareElement.style.opacity = '0';
    }
  }

  resetAllTilts() {
    this.trackedElements.forEach((data, element) => {
      this.resetTilt(element);
    });
  }

  animate() {
    // Smooth camera rotation
    if (this.stage && this.stage.camera && !this.reducedMotion) {
      this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.05;
      this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.05;

      this.stage.camera.rotation.x = this.currentRotation.x * (Math.PI / 180);
      this.stage.camera.rotation.y = this.currentRotation.y * (Math.PI / 180);
    }

    requestAnimationFrame(() => this.animate());
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
    this.resetAllTilts();
  }

  untrack(element) {
    if (this.trackedElements.has(element)) {
      this.resetTilt(element);
      this.trackedElements.delete(element);
    }
  }

  destroy() {
    this.resetAllTilts();
    this.trackedElements.clear();
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerleave', this.handlePointerLeave);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PointerController;
}
