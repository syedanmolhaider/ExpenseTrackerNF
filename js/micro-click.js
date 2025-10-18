/**
 * Micro-Click Animation System
 * Global utility for 3D button interactions with particle effects
 */

class MicroClickAnimator {
  constructor(stage) {
    this.stage = stage;
    this.particlePool = [];
    this.activeAnimations = new Set();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  init() {
    // Listen for reduced motion preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
      });

    // Register global click handler
    this.registerGlobalClickHandler();
  }

  registerGlobalClickHandler() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-3d-click], .btn, .expense-item, .filter-group select, .summary-card');
      
      if (target && !target.hasAttribute('data-3d-disabled')) {
        this.microClickAnimation(target, e);
      }
    }, true);
  }

  microClickAnimation(element, event, options = {}) {
    if (this.reducedMotion && !options.force) {
      // Skip animation for reduced motion users
      return;
    }

    const defaults = {
      duration: 0.3,
      particleCount: 8,
      particleLifetime: 0.6,
      scaleAmount: 0.96,
      glowIntensity: 1.5,
      cameraPush: 0.5
    };

    const config = { ...defaults, ...options };

    // Prevent multiple simultaneous animations on same element
    if (this.activeAnimations.has(element)) {
      return;
    }

    this.activeAnimations.add(element);

    // GSAP Timeline for element animation
    const tl = gsap.timeline({
      onComplete: () => {
        this.activeAnimations.delete(element);
      }
    });

    // Button press animation
    tl.to(element, {
      scale: config.scaleAmount,
      duration: config.duration * 0.4,
      ease: 'power2.in'
    })
    .to(element, {
      scale: 1,
      duration: config.duration * 0.6,
      ease: 'elastic.out(1, 0.3)'
    }, `-=${config.duration * 0.2}`);

    // Add glow effect if element supports it
    if (window.getComputedStyle(element).boxShadow !== 'none') {
      tl.to(element, {
        '--glow-intensity': config.glowIntensity,
        duration: config.duration * 0.5,
        ease: 'power2.out'
      }, 0)
      .to(element, {
        '--glow-intensity': 1,
        duration: config.duration * 0.5,
        ease: 'power2.in'
      }, config.duration * 0.5);
    }

    // Camera subtle push (if 3D stage available)
    if (this.stage && this.stage.camera) {
      const originalZ = this.stage.camera.position.z;
      gsap.to(this.stage.camera.position, {
        z: originalZ - config.cameraPush,
        duration: config.duration * 0.4,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(this.stage.camera.position, {
            z: originalZ,
            duration: config.duration * 0.6,
            ease: 'power2.inOut'
          });
        }
      });
    }

    // Spawn particles
    if (this.stage && this.stage.scene) {
      this.spawnParticles(event, config);
    } else {
      // DOM-based particle fallback
      this.spawnDOMParticles(event, config);
    }
  }

  spawnParticles(event, config) {
    // Convert screen coordinates to 3D space
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.stage.camera);

    // Create particle spray in 3D space
    const particleCount = config.particleCount;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = 5 + Math.random() * 10;
      
      const geometry = new THREE.SphereGeometry(0.1, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: this.getRandomNeonColor(),
        transparent: true,
        opacity: 1
      });

      const particle = new THREE.Mesh(geometry, material);
      
      // Position at click point (approximated in front of camera)
      const depth = 40;
      particle.position.set(
        mouse.x * depth,
        mouse.y * depth,
        this.stage.camera.position.z - depth
      );

      const velocityX = Math.cos(angle) * velocity;
      const velocityY = Math.sin(angle) * velocity;
      const velocityZ = (Math.random() - 0.5) * velocity;

      particle.userData = {
        velocity: new THREE.Vector3(velocityX, velocityY, velocityZ),
        lifetime: config.particleLifetime
      };

      this.stage.scene.add(particle);
      particles.push(particle);

      // Animate particle
      gsap.to(particle.material, {
        opacity: 0,
        duration: config.particleLifetime,
        ease: 'power2.out',
        onComplete: () => {
          this.stage.scene.remove(particle);
          geometry.dispose();
          material.dispose();
        }
      });

      gsap.to(particle.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: config.particleLifetime,
        ease: 'power2.in'
      });
    }

    // Update particle positions
    this.animateParticles(particles);
  }

  animateParticles(particles) {
    let frameCount = 0;
    const maxFrames = 60; // ~1 second at 60fps

    const update = () => {
      frameCount++;
      
      particles.forEach(particle => {
        if (particle.parent) {
          particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
          particle.userData.velocity.multiplyScalar(0.95); // Friction
        }
      });

      if (frameCount < maxFrames && particles.some(p => p.parent)) {
        requestAnimationFrame(update);
      }
    };

    update();
  }

  spawnDOMParticles(event, config) {
    // Fallback: Create DOM-based particles
    const container = document.createElement('div');
    container.className = 'particle-burst';
    container.style.position = 'fixed';
    container.style.left = event.clientX + 'px';
    container.style.top = event.clientY + 'px';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    document.body.appendChild(container);

    for (let i = 0; i < config.particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      const angle = (Math.PI * 2 * i) / config.particleCount;
      const velocity = 30 + Math.random() * 50;
      const size = 2 + Math.random() * 4;
      
      particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, ${this.getRandomNeonColorCSS()}, transparent);
        border-radius: 50%;
        box-shadow: 0 0 10px ${this.getRandomNeonColorCSS()};
      `;

      container.appendChild(particle);

      const moveX = Math.cos(angle) * velocity;
      const moveY = Math.sin(angle) * velocity;

      gsap.to(particle, {
        x: moveX,
        y: moveY,
        opacity: 0,
        scale: 0,
        duration: config.particleLifetime,
        ease: 'power2.out',
        onComplete: () => {
          particle.remove();
        }
      });
    }

    // Remove container after all particles are done
    setTimeout(() => {
      container.remove();
    }, config.particleLifetime * 1000 + 100);
  }

  getRandomNeonColor() {
    const colors = [0xff00d1, 0x00e5ff, 0xc7ff00];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getRandomNeonColorCSS() {
    const colors = ['rgba(255, 0, 209, 1)', 'rgba(0, 229, 255, 1)', 'rgba(199, 255, 0, 1)'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Manual trigger for programmatic animations
  trigger(element, event = null) {
    // Create synthetic event if not provided
    if (!event) {
      const rect = element.getBoundingClientRect();
      event = {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      };
    }

    this.microClickAnimation(element, event);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MicroClickAnimator;
}
