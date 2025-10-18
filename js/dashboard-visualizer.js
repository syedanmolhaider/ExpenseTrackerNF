/**
 * 3D Dashboard Visualizations
 * Handles 3D gauge, donut charts, and data visualizations
 */

class DashboardVisualizer {
  constructor(stage) {
    this.stage = stage;
    this.visualizations = new Map();
    this.animationMixers = [];
  }

  /**
   * Create 3D circular gauge
   */
  createGauge(container, value, max, options = {}) {
    const config = {
      radius: options.radius || 5,
      thickness: options.thickness || 0.5,
      color: options.color || 0x00e5ff,
      emissiveIntensity: options.emissiveIntensity || 1,
      segments: options.segments || 64,
      startAngle: options.startAngle || 0,
      label: options.label || '',
      ...options
    };

    const percentage = value / max;
    const angle = percentage * Math.PI * 2;

    // Create gauge ring
    const geometry = new THREE.RingGeometry(
      config.radius - config.thickness,
      config.radius,
      config.segments,
      1,
      config.startAngle,
      angle
    );

    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });

    const gauge = new THREE.Mesh(geometry, material);

    // Add emissive glow
    const glowGeometry = geometry.clone();
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.scale.set(1.1, 1.1, 1.1);
    gauge.add(glow);

    // Background ring
    const bgGeometry = new THREE.RingGeometry(
      config.radius - config.thickness,
      config.radius,
      config.segments
    );
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x0b0f1a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    gauge.add(background);

    // Position in scene
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
      const y = -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1;
      
      gauge.position.set(x * 30, y * 30, 20);
    }

    this.stage.scene.add(gauge);
    this.visualizations.set(container, gauge);

    // Animate gauge fill
    this.animateGaugeFill(gauge, angle, config);

    return gauge;
  }

  animateGaugeFill(gauge, targetAngle, config) {
    const geometry = gauge.geometry;
    const startAngle = config.startAngle;

    gsap.to({ angle: 0 }, {
      angle: targetAngle,
      duration: 1.5,
      ease: 'power2.out',
      onUpdate: function() {
        // Recreate geometry with new angle
        const newGeometry = new THREE.RingGeometry(
          config.radius - config.thickness,
          config.radius,
          config.segments,
          1,
          startAngle,
          this.targets()[0].angle
        );
        
        gauge.geometry.dispose();
        gauge.geometry = newGeometry;
      }
    });
  }

  /**
   * Create 3D donut chart
   */
  createDonutChart(container, data, options = {}) {
    const config = {
      radius: options.radius || 6,
      thickness: options.thickness || 1.5,
      height: options.height || 0.5,
      segments: options.segments || 64,
      gap: options.gap || 0.02,
      ...options
    };

    const group = new THREE.Group();
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2; // Start at top

    data.forEach((item, index) => {
      const percentage = item.value / total;
      const angle = percentage * Math.PI * 2 - config.gap;

      // Create segment
      const geometry = new THREE.RingGeometry(
        config.radius - config.thickness,
        config.radius,
        config.segments,
        1,
        currentAngle,
        angle
      );

      const material = new THREE.MeshPhysicalMaterial({
        color: item.color || this.getCategoryColor(item.category),
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.9,
        emissive: item.color || this.getCategoryColor(item.category),
        emissiveIntensity: 0.5
      });

      const segment = new THREE.Mesh(geometry, material);

      // Extrude for 3D effect
      const shape = new THREE.Shape();
      const innerRadius = config.radius - config.thickness;
      const outerRadius = config.radius;
      
      for (let i = 0; i <= config.segments; i++) {
        const theta = currentAngle + (angle * i) / config.segments;
        const x = Math.cos(theta) * outerRadius;
        const y = Math.sin(theta) * outerRadius;
        
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      
      for (let i = config.segments; i >= 0; i--) {
        const theta = currentAngle + (angle * i) / config.segments;
        const x = Math.cos(theta) * innerRadius;
        const y = Math.sin(theta) * innerRadius;
        shape.lineTo(x, y);
      }

      const extrudeSettings = {
        depth: config.height,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 3
      };

      const extrudeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const extrudedSegment = new THREE.Mesh(extrudeGeometry, material);
      extrudedSegment.rotation.x = -Math.PI / 2;

      group.add(extrudedSegment);

      // Store for hover interaction
      extrudedSegment.userData = {
        category: item.category,
        value: item.value,
        percentage: percentage * 100
      };

      // Animate appearance
      extrudedSegment.scale.set(0, 0, 0);
      gsap.to(extrudedSegment.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.8,
        delay: index * 0.1,
        ease: 'back.out(1.7)'
      });

      currentAngle += angle + config.gap;
    });

    // Position in scene
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
      const y = -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1;
      
      group.position.set(x * 30, y * 30, 15);
    }

    // Rotate for better view
    group.rotation.x = -Math.PI / 4;

    this.stage.scene.add(group);
    this.visualizations.set(container, group);

    // Add slow rotation animation
    gsap.to(group.rotation, {
      z: Math.PI * 2,
      duration: 20,
      repeat: -1,
      ease: 'none'
    });

    return group;
  }

  /**
   * Create 3D bar chart
   */
  createBarChart(container, data, options = {}) {
    const config = {
      barWidth: options.barWidth || 0.8,
      barDepth: options.barDepth || 0.8,
      spacing: options.spacing || 0.3,
      maxHeight: options.maxHeight || 10,
      ...options
    };

    const group = new THREE.Group();
    const maxValue = Math.max(...data.map(d => d.value));

    data.forEach((item, index) => {
      const height = (item.value / maxValue) * config.maxHeight;
      
      const geometry = new THREE.BoxGeometry(
        config.barWidth,
        height,
        config.barDepth
      );

      const material = new THREE.MeshPhysicalMaterial({
        color: item.color || this.getCategoryColor(item.category),
        metalness: 0.2,
        roughness: 0.3,
        transparent: true,
        opacity: 0.9,
        emissive: item.color || this.getCategoryColor(item.category),
        emissiveIntensity: 0.3
      });

      const bar = new THREE.Mesh(geometry, material);
      bar.position.x = index * (config.barWidth + config.spacing) - (data.length * (config.barWidth + config.spacing)) / 2;
      bar.position.y = height / 2;

      // Add edge glow
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: item.color || this.getCategoryColor(item.category),
        transparent: true,
        opacity: 0.8
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      bar.add(wireframe);

      group.add(bar);

      // Animate bar growth
      bar.scale.y = 0.01;
      gsap.to(bar.scale, {
        y: 1,
        duration: 1,
        delay: index * 0.1,
        ease: 'elastic.out(1, 0.5)'
      });

      bar.userData = {
        category: item.category,
        value: item.value
      };
    });

    // Position in scene
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
      const y = -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1;
      
      group.position.set(x * 30, y * 30, 15);
    }

    group.rotation.x = -Math.PI / 6;
    group.rotation.y = -Math.PI / 6;

    this.stage.scene.add(group);
    this.visualizations.set(container, group);

    return group;
  }

  /**
   * Update existing visualization
   */
  updateVisualization(container, newData) {
    const viz = this.visualizations.get(container);
    if (!viz) return;

    // Remove old visualization
    this.stage.scene.remove(viz);
    this.visualizations.delete(container);

    // Recreate with new data
    // Type detection based on data structure
    if (Array.isArray(newData)) {
      if (newData[0].hasOwnProperty('category')) {
        this.createDonutChart(container, newData);
      } else {
        this.createBarChart(container, newData);
      }
    }
  }

  /**
   * Get category color
   */
  getCategoryColor(category) {
    const colorMap = {
      'food': 0x00e5ff,
      'transport': 0xff00d1,
      'entertainment': 0xc7ff00,
      'utilities': 0x00e5ff,
      'other': 0xff00d1
    };

    return colorMap[category?.toLowerCase()] || 0x00e5ff;
  }

  /**
   * Remove visualization
   */
  removeVisualization(container) {
    const viz = this.visualizations.get(container);
    if (viz) {
      this.stage.scene.remove(viz);
      this.visualizations.delete(container);
      
      // Dispose geometries and materials
      viz.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }

  /**
   * Clear all visualizations
   */
  clear() {
    this.visualizations.forEach((viz, container) => {
      this.removeVisualization(container);
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardVisualizer;
}
