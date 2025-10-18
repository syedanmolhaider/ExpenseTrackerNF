/**
 * Three.js 3D Stage Manager
 * Handles WebGL rendering, scene setup, and progressive enhancement
 */

class ThreeStage {
  constructor(options = {}) {
    this.options = {
      container: options.container || document.body,
      enablePostProcessing: options.enablePostProcessing !== false,
      particleCount: options.particleCount || 500,
      ...options,
    };

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.animationId = null;
    this.particles = null;
    this.panels = [];
    this.isWebGLSupported = this.checkWebGLSupport();

    if (this.isWebGLSupported) {
      this.init();
    } else {
      this.applyFallback();
    }
  }

  checkWebGLSupport() {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupLights();
    this.setupBackground();
    this.setupParticles();

    if (this.options.enablePostProcessing) {
      this.setupPostProcessing();
    }

    this.setupEventListeners();
    this.animate();

    console.log("✨ 3D Stage initialized");
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.physicallyCorrectLights = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // Create canvas container
    const canvas = this.renderer.domElement;
    canvas.id = "three-stage";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.zIndex = "0";
    canvas.style.pointerEvents = "none";

    document.body.insertBefore(canvas, document.body.firstChild);
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05060a, 0.015);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 50;
  }

  setupLights() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x0b0f1a, 0.3);
    this.scene.add(ambientLight);

    // Neon magenta point light
    const magentaLight = new THREE.PointLight(0xff00d1, 2, 100);
    magentaLight.position.set(-30, 20, 30);
    this.scene.add(magentaLight);

    // Electric cyan point light
    const cyanLight = new THREE.PointLight(0x00e5ff, 2, 100);
    cyanLight.position.set(30, -20, 30);
    this.scene.add(cyanLight);

    // Acid lime accent light
    const limeLight = new THREE.PointLight(0xc7ff00, 1, 80);
    limeLight.position.set(0, 30, 20);
    this.scene.add(limeLight);

    // Volumetric spot light (cone effect)
    const spotLight = new THREE.SpotLight(0x00e5ff, 1);
    spotLight.position.set(0, 50, 50);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.5;
    spotLight.decay = 2;
    spotLight.distance = 200;
    this.scene.add(spotLight);
  }

  setupBackground() {
    // Procedural gradient background
    const geometry = new THREE.SphereGeometry(500, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vPosition;
        
        void main() {
          vec3 color1 = vec3(0.02, 0.024, 0.039); // #05060A
          vec3 color2 = vec3(0.043, 0.059, 0.102); // #0b0f1a
          vec3 color3 = vec3(1.0, 0.0, 0.82); // magenta
          vec3 color4 = vec3(0.0, 0.898, 1.0); // cyan
          
          float mixValue = (vPosition.y + 500.0) / 1000.0;
          vec3 gradient = mix(color1, color2, mixValue);
          
          // Add animated color spots
          float spot1 = sin(time * 0.5 + vPosition.x * 0.01) * 0.5 + 0.5;
          float spot2 = cos(time * 0.3 + vPosition.z * 0.01) * 0.5 + 0.5;
          
          gradient += color3 * spot1 * 0.1;
          gradient += color4 * spot2 * 0.1;
          
          gl_FragColor = vec4(gradient, 1.0);
        }
      `,
      side: THREE.BackSide,
    });

    this.backgroundSphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.backgroundSphere);
  }

  setupParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.options.particleCount * 3);
    const colors = new Float32Array(this.options.particleCount * 3);
    const sizes = new Float32Array(this.options.particleCount);

    const colorPalette = [
      new THREE.Color(0xff00d1), // magenta
      new THREE.Color(0x00e5ff), // cyan
      new THREE.Color(0xc7ff00), // lime
    ];

    for (let i = 0; i < this.options.particleCount; i++) {
      // Position
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

      // Color
      const color =
        colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Size
      sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  setupPostProcessing() {
    // Note: This requires importing EffectComposer and passes
    // For now, we'll skip this to keep the initial setup simple
    // Can be added later with proper imports
    console.log("Post-processing setup skipped (requires additional imports)");
  }

  createGlassPanel(width, height, depth, position, rotation) {
    const geometry = new THREE.BoxGeometry(width, height, depth);

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x0b0f1a,
      transparent: true,
      opacity: 0.3,
      metalness: 0.1,
      roughness: 0.2,
      transmission: 0.5,
      thickness: 0.5,
      envMapIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);

    // Add neon edge glow
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.6,
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(wireframe);

    this.panels.push(mesh);
    this.scene.add(mesh);

    return mesh;
  }

  setupEventListeners() {
    window.addEventListener("resize", () => this.handleResize(), false);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.0001;

    // Rotate particles slowly
    if (this.particles) {
      this.particles.rotation.y = time * 0.5;
      this.particles.rotation.x = time * 0.3;
    }

    // Update background shader time
    if (this.backgroundSphere) {
      this.backgroundSphere.material.uniforms.time.value = time;
    }

    // Render scene
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  applyFallback() {
    console.log("⚠️ WebGL not supported, applying CSS fallback");
    document.documentElement.classList.add("no-webgl");
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(
          this.renderer.domElement
        );
      }
    }

    window.removeEventListener("resize", this.handleResize);
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ThreeStage;
}
