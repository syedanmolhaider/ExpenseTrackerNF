# VISUAL MOODBOARD & DESIGN REFERENCES

## 🎨 Neon Cyberpunk Aesthetic Reference Guide

This document provides detailed visual references and inspiration sources for the futuristic 3D neon UI design.

---

## 1. Neon Lighting & Glow Effects

### Reference Keywords for Image Search:

- "Neon cyberpunk UI interface"
- "Blade Runner 2049 holographic interface"
- "Tron Legacy user interface"
- "Cyberpunk 2077 UI design"
- "Ghost in the Shell terminal interface"

### Color Palette Examples:

**Neon Magenta (#ff00d1):**

- Hot pink neon tubes
- Magenta accent lighting on dark surfaces
- Holographic magenta overlays
- Reference: Blade Runner replicant testing interface

**Electric Cyan (#00e5ff):**

- Bright cyan neon signs
- Tron grid lines
- Holographic data streams
- Reference: Tron Legacy light cycle trails

**Acid Lime (#c7ff00):**

- Radioactive warning signs
- Matrix-style code rain
- Biohazard indicators
- Reference: Alien franchise UI elements

### Glow Intensity Levels:

1. **Subtle Glow (Idle State):**

   - 10px blur radius
   - 50% opacity
   - Used for borders and outlines

2. **Medium Glow (Hover State):**

   - 20px blur radius
   - 70% opacity
   - Used for interactive elements

3. **Strong Glow (Active State):**
   - 30-40px blur radius
   - 100% opacity
   - Used for focus/selected states

---

## 2. Glass & Frosted Panel Aesthetics

### Material Properties:

**Frosted Glass:**

- Background opacity: 40-60%
- Backdrop blur: 20px
- Border: Semi-transparent (20-40% opacity)
- Inner glow for depth perception

**Holographic Panels:**

- Semi-transparent (30-50% opacity)
- Iridescent borders
- Gradient overlays (multi-stop)
- Scanline effects

### Reference Examples:

1. **iOS Glassmorphism:**

   - Apple Control Center blur effect
   - iOS 15+ notification cards
   - Safari tab bar transparency

2. **Windows Fluent Design:**

   - Windows 11 Acrylic material
   - Microsoft Store app backgrounds
   - Settings panel transparency

3. **Sci-Fi Interfaces:**
   - Iron Man's JARVIS holographic displays
   - Minority Report gesture UI panels
   - Ready Player One OASIS interface

---

## 3. Volumetric Lighting & Atmosphere

### Lighting Techniques:

**Radial Gradients:**

```
radial-gradient(ellipse at 20% 30%,
  rgba(255, 0, 209, 0.15) 0%,
  transparent 50%)
```

**Light Shafts (God Rays):**

- Diagonal linear gradients with low opacity
- Animated position shifts
- Layered for depth

**Ambient Occlusion:**

- Dark shadows in corners
- Inset shadows on panels
- Subtle vignette around edges

### Reference Sources:

1. **Unreal Engine 5 Volumetric Fog:**

   - Search: "UE5 volumetric lighting tutorial"
   - Key feature: Realistic light scattering

2. **Cinema 4D Light Effects:**

   - Search: "C4D neon light setup"
   - Key feature: Bloom and glow

3. **After Effects Optical Flares:**
   - Search: "AE light rays tutorial"
   - Key feature: Lens flare streaks

---

## 4. 3D Depth & Perspective

### Transform Techniques:

**Card Elevation:**

```css
transform: perspective(1000px) rotateX(2deg) rotateY(-2deg) translateZ(24px);
```

**Parallax Layers:**

- Background: translateZ(-50px)
- Midground: translateZ(0)
- Foreground: translateZ(50px)

**Micro-Interactions:**

- Button press: scale(0.96) + translateZ(-4px)
- Hover lift: translateZ(8px) + scale(1.02)

### Reference Examples:

1. **Neomorphism:**

   - Search: "Neomorphism UI design examples"
   - Key feature: Soft shadows with depth

2. **Material Design Elevation:**

   - Google Material 3 elevation system
   - Key feature: Consistent shadow levels

3. **Skeuomorphic 3D:**
   - Apple iOS 6 UI elements
   - Key feature: Realistic button press

---

## 5. Typography & Text Effects

### Font Recommendations:

**Primary (Body Text):**

- Inter (Variable)
- SF Pro Display
- Roboto

**Accent (Headings):**

- Orbitron (Futuristic)
- Exo 2 (Sci-fi)
- Rajdhani (Tech)

### Text Treatments:

**Gradient Text:**

```css
background: linear-gradient(135deg, #ff00d1, #00e5ff, #c7ff00);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

**Neon Text Glow:**

```css
text-shadow: 0 0 10px rgba(0, 229, 255, 0.5), 0 0 20px rgba(0, 229, 255, 0.3),
  0 0 30px rgba(0, 229, 255, 0.2);
```

**Scanline Effect:**

```css
background-image: repeating-linear-gradient(
  0deg,
  transparent 0px,
  rgba(255, 255, 255, 0.03) 1px,
  transparent 2px
);
```

---

## 6. Particle & Motion Graphics

### Particle Types:

1. **Ambient Drift Particles:**

   - Size: 1-3px
   - Speed: 60s per cycle
   - Colors: Magenta, cyan, lime (random)
   - Pattern: Radial gradient dots

2. **Interaction Burst Particles:**

   - Size: 2-6px
   - Speed: 300-700ms
   - Count: 5-12 per burst
   - Motion: Radial explosion from center

3. **Loading Particles:**
   - Size: 4-8px
   - Speed: 2s rotation
   - Pattern: Circular orbit

### Reference Tools:

1. **Particles.js Examples:**

   - Demo: https://vincentgarreau.com/particles.js/
   - Configuration: Cyan + magenta colors, 100 particles

2. **Three.js Point Clouds:**

   - Example: "Three.js particle system tutorial"
   - Key feature: GPU-accelerated rendering

3. **After Effects Particle World:**
   - Search: "AE Particular plugin neon particles"
   - Key feature: Complex motion paths

---

## 7. Animation Easing & Timing

### Easing Functions:

**Spring (Micro-interactions):**

```
cubic-bezier(0.34, 1.56, 0.64, 1)
```

- Overshoot for tactile feel
- Use for: Button presses, card hovers

**Ease Out (Standard):**

```
cubic-bezier(0.33, 1, 0.68, 1)
```

- Smooth deceleration
- Use for: Modals, page transitions

**Ease In-Out (Complex):**

```
cubic-bezier(0.65, 0, 0.35, 1)
```

- Symmetrical acceleration/deceleration
- Use for: Long animations, scrolling

### Duration Guidelines:

| Action          | Duration  | Easing      |
| --------------- | --------- | ----------- |
| Button press    | 180ms     | Spring      |
| Input focus     | 280ms     | Ease out    |
| Card hover      | 400ms     | Spring      |
| Modal open      | 900ms     | Spring      |
| Page transition | 700ms     | Ease in-out |
| Particle fade   | 300-700ms | Ease out    |

---

## 8. Iconography & Symbols

### Icon Style:

**Stroke-based:**

- 2px line weight
- Rounded line caps
- Neon glow on hover

**Categories:**

- Food: 🍔 → Outline fork/knife
- Transport: 🚗 → Outline car
- Entertainment: 🎬 → Outline ticket
- Utilities: 💡 → Outline lightbulb

### Icon Libraries:

1. **Feather Icons** (MIT License)

   - Style: Minimal, stroke-based
   - Perfect for: Clean, modern look

2. **Phosphor Icons** (MIT License)

   - Style: Thin, elegant
   - Perfect for: Futuristic aesthetic

3. **Heroicons** (MIT License)
   - Style: Solid + outline variants
   - Perfect for: Consistent sizing

---

## 9. Texture & Noise Overlays

### Film Grain:

**CSS Implementation:**

```css
background-image: url("data:image/svg+xml,<svg>...</svg>");
opacity: 0.03;
animation: grain 8s steps(10) infinite;
```

**Intensity Levels:**

- Subtle: 2-3% opacity
- Medium: 5-8% opacity (use for cards)
- Strong: 10-15% opacity (avoid)

### Scanlines:

```css
background-image: repeating-linear-gradient(
  0deg,
  transparent,
  transparent 2px,
  rgba(255, 255, 255, 0.02) 2px,
  rgba(255, 255, 255, 0.02) 4px
);
```

---

## 10. Loading & Transition States

### Loading Animations:

**Rotating Icon:**

```css
@keyframes rotateIcon {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

**Pulsing Glow:**

```css
@keyframes glowPulse {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(0, 229, 255, 0.8);
  }
}
```

**Shimmer Effect:**

```css
@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
```

---

## 11. Interactive State Hierarchy

### Visual Feedback Levels:

**Level 1: Idle**

- Subtle border glow (30% opacity)
- Static colors
- No movement

**Level 2: Hover**

- Border glow increases (60% opacity)
- Elevation raises (+8px Z)
- Specular highlight appears
- Scale increases (102%)

**Level 3: Active/Pressed**

- Border glow at max (100% opacity)
- Elevation lowers (-4px Z)
- Scale decreases (96%)
- Particle burst triggered

**Level 4: Focus**

- Strong border glow with pulse animation
- Accessibility outline (2px cyan)
- Inner glow effect

---

## 12. Error & Success States

### Error Styling:

**Color:** #ff0055 (danger-color)

**Visual Treatment:**

- Pulsing red glow (2s cycle)
- Shake animation (micro-vibration)
- Background: rgba(255, 0, 85, 0.15)

**Animation:**

```css
@keyframes errorShake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}
```

### Success Styling:

**Color:** #c7ff00 (acid-lime)

**Visual Treatment:**

- Expanding circle animation
- Checkmark with draw-in effect
- Green glow burst

**Animation:**

```css
@keyframes successExpand {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

---

## 13. Responsive Adaptations

### Desktop (1440px+)

- Full 3D effects enabled
- All particles visible
- Maximum glow intensity

### Laptop (1024px)

- Reduced particle count (50%)
- Simplified background gradients
- Maintained 3D transforms

### Tablet (768px)

- Minimal 3D effects (scale only)
- No background particles
- Larger tap targets (48×48px)

### Mobile (375px)

- No 3D transforms
- Solid backgrounds (no blur)
- Touch-optimized buttons
- Simplified animations

---

## 14. Color Accessibility Matrix

| Foreground            | Background | Ratio  | WCAG AA | WCAG AAA |
| --------------------- | ---------- | ------ | ------- | -------- |
| #ffffff               | #05060A    | 19.6:1 | ✅ Pass | ✅ Pass  |
| #ffffff               | #0b0f1a    | 15.8:1 | ✅ Pass | ✅ Pass  |
| #ff00d1               | #0b0f1a    | 5.2:1  | ✅ Pass | ❌ Fail  |
| #00e5ff               | #0b0f1a    | 8.7:1  | ✅ Pass | ✅ Pass  |
| #c7ff00               | #0b0f1a    | 14.3:1 | ✅ Pass | ✅ Pass  |
| rgba(255,255,255,0.7) | #0b0f1a    | 11.1:1 | ✅ Pass | ✅ Pass  |

**Notes:**

- All body text uses #ffffff (19.6:1 ratio)
- Magenta used only for headings/accents (5.2:1 ratio)
- High contrast mode increases all opacities by 20%

---

## 15. Design Token Export (JSON)

```json
{
  "colors": {
    "background": {
      "primary": "#05060A",
      "secondary": "#0b0f1a"
    },
    "accent": {
      "magenta": "#ff00d1",
      "cyan": "#00e5ff",
      "lime": "#c7ff00"
    },
    "text": {
      "primary": "#ffffff",
      "secondary": "rgba(255, 255, 255, 0.7)",
      "tertiary": "rgba(255, 255, 255, 0.5)"
    }
  },
  "spacing": {
    "xs": "8px",
    "sm": "16px",
    "md": "24px",
    "lg": "32px",
    "xl": "48px"
  },
  "elevation": {
    "0": "0px",
    "1": "8px",
    "2": "16px",
    "3": "24px",
    "4": "32px"
  },
  "borderRadius": {
    "sm": "8px",
    "md": "12px",
    "lg": "16px",
    "xl": "20px",
    "pill": "24px"
  },
  "animation": {
    "duration": {
      "micro": "180ms",
      "quick": "280ms",
      "standard": "400ms",
      "slow": "700ms",
      "panel": "900ms"
    },
    "easing": {
      "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      "easeOut": "cubic-bezier(0.33, 1, 0.68, 1)",
      "easeInOut": "cubic-bezier(0.65, 0, 0.35, 1)"
    }
  }
}
```

---

## 16. Asset Creation Checklist

### SVG Assets to Create:

- [ ] Loading spinner (rotating neon ring)
- [ ] Empty state icon (holographic circle)
- [ ] Success checkmark (animated draw-in)
- [ ] Error alert (pulsing triangle)
- [ ] Category icons (6 types, neon style)

### Texture Maps:

- [ ] Film grain (512×512, seamless)
- [ ] Particle sprite (64×64, soft gradient)
- [ ] Holographic grid (1024×1024, perspective)
- [ ] Volumetric light (2048×2048, radial)

### Animation Exports:

- [ ] Button press (Lottie JSON)
- [ ] Card hover (Lottie JSON)
- [ ] Modal slide-in (Lottie JSON)
- [ ] Particle burst (sprite sheet)

---

## 17. Figma/Framer Prototype Structure

### Artboards (Desktop 1440px):

1. **Auth Screen**

   - Login state
   - Signup state
   - Password reset state

2. **Dashboard**

   - Overview (summary cards)
   - Add expense modal (open)
   - Filter dropdown (expanded)

3. **Expenses List**

   - Full list view
   - Empty state
   - Loading state

4. **Expense Detail**
   - Edit modal (open)
   - Delete confirmation

### Responsive Variants:

- Laptop (1024px): 4 artboards
- Tablet (768px): 4 artboards
- Mobile (375px): 4 artboards

### Interactive Prototype Flow:

```
Login → Dashboard → Add Expense → Save → List Update → Edit → Delete
```

**Total Artboards:** 16 (4 states × 4 breakpoints)

---

## 18. Reference Links & Resources

### Design Inspiration:

1. **Dribbble:** Search "neon UI cyberpunk dashboard"
2. **Behance:** Search "futuristic interface design"
3. **Awwwards:** Filter by "Dark" + "3D" tags

### Code Examples:

1. **CodePen:** Search "glassmorphism CSS"
2. **CodeSandbox:** Search "Three.js particles"
3. **GitHub:** Search "neon UI kit"

### Tutorials:

1. **YouTube:** "3D CSS transforms tutorial"
2. **FreeCodeCamp:** "Advanced CSS animations"
3. **Web.dev:** "Optimizing animations for performance"

### Tools:

1. **Figma Plugins:**

   - Glassmorphism plugin
   - Neon effect plugin
   - Auto-animate plugin

2. **Chrome Extensions:**
   - ColorZilla (eyedropper)
   - WhatFont (font identifier)
   - Pesticide (layout debugger)

---

**Moodboard Version:** 1.0.0  
**Last Updated:** October 19, 2025  
**Design Reference Guide**
