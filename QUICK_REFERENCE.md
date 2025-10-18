# QUICK REFERENCE CARD - Futuristic Neon 3D UI

## 🎨 Color Palette (Hex Values)

```
Deep Space Black  : #05060A   (Primary BG)
Navy Black        : #0b0f1a   (Secondary BG)
Neon Magenta      : #ff00d1   (Primary Accent)
Electric Cyan     : #00e5ff   (Secondary Accent)
Acid Lime         : #c7ff00   (Tertiary Accent)
Ultra White       : #ffffff   (Text)
Chrome Silver     : #c0c5ce   (Borders)
```

---

## 📏 Spacing Scale

```
XS : 8px    MD : 24px    XL : 48px
SM : 16px   LG : 32px
```

---

## 🎭 Elevation (Z-depth)

```
Level 0 : 0px    (Ground)
Level 1 : 8px    (Cards rest)
Level 2 : 16px   (Cards hover)
Level 3 : 24px   (Modals)
Level 4 : 32px   (Tooltips)
```

---

## ⏱️ Animation Durations

```
Micro    : 180ms  (Button press)
Quick    : 280ms  (Input focus)
Standard : 400ms  (Card hover)
Slow     : 700ms  (Transitions)
Panel    : 900ms  (Modal slide)
```

---

## 📐 Border Radius

```
SM   : 8px   (Small elements)
MD   : 12px  (Inputs)
LG   : 16px  (Cards)
XL   : 20px  (Panels)
Pill : 24px  (Pills/Filters)
```

---

## 🌈 Glow Effects (Box Shadow)

### Magenta Glow

```css
box-shadow: 0 0 10px rgba(255, 0, 209, 0.5), 0 0 20px rgba(255, 0, 209, 0.3),
  0 0 30px rgba(255, 0, 209, 0.2);
```

### Cyan Glow

```css
box-shadow: 0 0 10px rgba(0, 229, 255, 0.5), 0 0 20px rgba(0, 229, 255, 0.3),
  0 0 30px rgba(0, 229, 255, 0.2);
```

### Lime Glow

```css
box-shadow: 0 0 10px rgba(199, 255, 0, 0.5), 0 0 20px rgba(199, 255, 0, 0.3);
```

---

## 🎯 Easing Functions

```css
Spring    : cubic-bezier(0.34, 1.56, 0.64, 1)
Ease Out  : cubic-bezier(0.33, 1, 0.68, 1)
Ease Both : cubic-bezier(0.65, 0, 0.35, 1)
```

---

## 🔧 Glass Effect (Frosted Panel)

```css
background: rgba(11, 15, 26, 0.4);
backdrop-filter: blur(20px);
border: 2px solid rgba(0, 229, 255, 0.3);
box-shadow: inset 0 0 20px rgba(0, 229, 255, 0.1);
```

---

## 📱 Breakpoints

```
Desktop : 1440px  (Full effects)
Laptop  : 1024px  (Reduced particles)
Tablet  : 768px   (Minimal 3D)
Mobile  : 375px   (Touch optimized)
```

---

## 🎨 Gradient Text

```css
background: linear-gradient(135deg, #ff00d1, #00e5ff, #c7ff00);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
text-shadow: 0 0 20px rgba(0, 229, 255, 0.5);
```

---

## 🎬 Hover State (Card)

```css
transform: perspective(800px) rotateY(-2deg) translateZ(16px) translateY(-8px);

box-shadow: 0 12px 32px rgba(255, 0, 209, 0.3), 0 24px 64px rgba(0, 229, 255, 0.2);

border-color: #00e5ff;
```

---

## 🖱️ Button Press

```css
transform: translateZ(-4px) scale(0.96);

box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(255, 0, 209, 0.3);
```

---

## 🌟 Particle Burst (JS)

```javascript
// On button click:
1. Create 5-12 particles
2. Random angles (360° / count)
3. Velocity: 30-80px
4. Duration: 300-700ms
5. Fade to opacity 0
```

---

## ✨ Input Focus

```css
border-color: #00e5ff;
background: rgba(11, 15, 26, 0.8);
box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 229, 255, 0.3),
  0 0 10px rgba(0, 229, 255, 0.5);
transform: translateY(-2px) scale(1.01);
```

---

## 🎭 Modal Animation

```css
/* Entry */
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-100px) translateZ(-200px) rotateX(20deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) translateZ(0) rotateX(0deg);
  }
}

animation: modalSlideIn 900ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## 🔤 Typography Scale

```
Heading 1 : 2.5rem  (40px)
Heading 2 : 1.75rem (28px)
Heading 3 : 1.5rem  (24px)
Body      : 1rem    (16px)
Small     : 0.875rem (14px)
Tiny      : 0.75rem  (12px)
```

---

## 📊 Font Weights

```
Regular  : 400
Medium   : 500
Semibold : 600
Bold     : 700
Extrabold: 800
```

---

## 🎨 Category Badge Colors

```css
Food          : cyan   (#00e5ff)
Transport     : magenta (#ff00d1)
Entertainment : lime   (#c7ff00)
Utilities     : cyan   (#00e5ff)
Other         : magenta (#ff00d1)
```

---

## ⚡ Performance Tips

```
✅ Use will-change on animated elements
✅ Add transform: translateZ(0) for GPU
✅ Limit backdrop-filter usage
✅ Lazy load off-screen animations
✅ Reduce particles on mobile
✅ Disable complex effects on low-end devices
```

---

## ♿ Accessibility

```css
/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* High Contrast */
@media (prefers-contrast: high) {
  .card {
    border-width: 3px;
  }
  .btn {
    border-width: 3px;
  }
}
```

---

## 🎯 Focus States

```css
*:focus-visible {
  outline: 2px solid #00e5ff;
  outline-offset: 2px;
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.5);
}
```

---

## 🔥 Common Patterns

### Neon Border

```css
border: 2px solid rgba(0, 229, 255, 0.3);
box-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
```

### Inner Glow

```css
box-shadow: inset 0 0 20px rgba(0, 229, 255, 0.1);
```

### Chrome Edge

```css
outline: 1px solid rgba(192, 197, 206, 0.1);
outline-offset: -2px;
```

### Gradient Border

```css
border: 2px solid transparent;
background: linear-gradient(135deg, #ff00d1, #00e5ff, #c7ff00) border-box;
mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
mask-composite: exclude;
```

---

## 📦 Common Class Names

```
.auth-card            : Login/signup container
.dashboard-header     : Top navigation bar
.summary-card         : Metric display cards
.expense-item         : Individual expense row
.modal-content        : Modal dialog container
.btn-primary          : Primary action button
.btn-secondary        : Secondary action button
.btn-danger           : Delete/cancel button
.form-group           : Form input wrapper
.filter-group         : Filter controls wrapper
.loading              : Loading state container
.empty-state          : No data message
```

---

## 🚀 Quick Start

1. **Import CSS**: `<link rel="stylesheet" href="css/style.css">`
2. **Add JavaScript**: Particle burst + parallax tilt
3. **Test on devices**: Desktop → Tablet → Mobile
4. **Check accessibility**: Keyboard nav + screen reader
5. **Validate contrast**: All text meets WCAG AA

---

## 📞 Need Help?

- **Design System**: See `DESIGN_SYSTEM.md`
- **Implementation**: See `IMPLEMENTATION_GUIDE.md`
- **Moodboard**: See `MOODBOARD_REFERENCE.md`
- **CSS Source**: See `css/style.css`

---

**Quick Reference v1.0.0** | Last Updated: October 19, 2025
