# ELEKTRIX Design System & Motion Graphics Specification

> **Specification Standard:** OpenDesign 9-Section Design Specification  
> **Brand:** ELEKTRIX (`https://elektrix.in`)  
> **Artifact Class:** Motion Graphics Commercial & Video Design System  
> **Target Formats:** 16:9 (Landscape Display/YouTube), 9:16 (Vertical Reels/Shorts), 1:1 (Social Feed)  

---

## 1. Visual Theme & Atmosphere
- **Aesthetic Direction:** *Cyber-Luxe High-Voltage Minimalist* — fusing sleek premium consumer tech aesthetics (Apple/Sony minimalism) with dynamic energy visualizers (electric arcs, particle acceleration, neon aura glows).
- **Mood & Tone:** High-energy, authoritative, hyper-modern, trustworthy, and exhilarating.
- **Motion Character:** Snappy ease-out entrances (`cubic-bezier(0.16, 1, 0.3, 1)`), fluid camera pans with subtle parallax depth, rhythmic kinetic typography, and dramatic specular sweeps across hardware silhouettes.

---

## 2. Color Palette & Roles

| Role | Color Name | Hex Code | Purpose & Application |
|---|---|---|---|
| **Background Dark** | Obsidian Black | `#07090e` | Deep canvas foundation for high-contrast contrast ratios |
| **Surface Dark** | Carbon Glass | `#0f1420` | Semi-transparent frosted cards with 1px border highlight |
| **Primary Accent** | Electric Emerald | `#10b981` | Energy pulses, success highlights, CTA buttons, delivery badges |
| **Secondary Accent** | Cyber Amber | `#f59e0b` | Deal percentages, festive discount banners, warm glow accents |
| **Tertiary Accent** | Voltage Cyan | `#06b6d4` | Lens flares, holographic spec borders, laser grid beams |
| **Text Primary** | Pure Platinum | `#f8fafc` | Main titles, kinetic headlines, product names |
| **Text Secondary** | Titanium Muted | `#94a3b8` | Subtitles, product specs, warranty metadata |
| **Border / Stroke** | Radiant Trace | `rgba(255, 255, 255, 0.12)` | Subtle frosted glass boundaries with glow falloffs |

---

## 3. Typography Rules
- **Primary Display Font:** `Inter`, `Syne`, or system sans-serif (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`) with ultra-heavy weights (`font-weight: 800` & `900`) and tight tracking (`tracking-tight` / `-0.03em`).
- **Kinetic Accent Font:** Monospace / Tech display (`JetBrains Mono`, `ui-monospace`, `SFMono-Regular`) for numerical pricing, specs, and timing codes.
- **Hierarchy Scale:**
  - **Mega Hero Title:** 56px – 84px (clamp scale), line-height 1.05, all-caps or title case with gradient clipping.
  - **Scene Subheadline:** 24px – 36px, line-height 1.25, medium weight (`font-weight: 500`).
  - **Feature Badges:** 14px – 18px, bold (`font-weight: 700`), uppercase with letter-spacing `+0.05em`.
  - **Price / Offer Tag:** 32px – 48px, tabular figures, emerald & amber high-contrast coloring.

---

## 4. Component & Motion Stylings

### Kinetic Cards
- Frosted glass containers (`backdrop-filter: blur(16px)`, `background: rgba(15, 20, 32, 0.75)`).
- Dynamic border glow animated along the perimeter during key product reveals.
- Spec badges with pill styling (`padding: 6px 14px`, `border-radius: 9999px`, micro-gradient backgrounds).

### Electrical & Particle Effects
- High-voltage lightning bolt traces rendered along canvas vector paths.
- Floating dust motes / glowing quantum energy dots with variable opacity and sinusoidal drift.
- Specular gleam traversing diagonally across product glass fronts at transition apexes.

### Audio Synthesizer Design
- **Sub-Bass Impact:** Low-frequency sine sweep (120 Hz $\to$ 35 Hz) at scene entrances.
- **Energy Riser:** Filtered saw-wave sweeping exponentially (200 Hz $\to$ 2.4 kHz) building tension.
- **Glitch / Click:** Noise burst with 12ms exponential decay for kinetic text appearances.
- **Harmonic Chime:** Dual triangle waves tuned to E-Major chord for the Elektrix logo resolution.

---

## 5. Layout & Composition Principles
- **Safe Zones:** Central 80% bounding box for all critical typography and CTAs to accommodate 16:9, 9:16, and 1:1 crops.
- **Rule of Thirds:** Product hardware positioned on the left/center axis with kinetic spec callouts anchored opposite.
- **Depth Staging:**
  - *Layer 0 (Background):* Starfield/particle mesh with radial glow spotlight.
  - *Layer 1 (Midground):* 3D isometric floating product showcase cards.
  - *Layer 2 (Foreground):* Kinetic punchy typography and dynamic discount badges.
  - *Layer 3 (Overlay):* Vignette, film grain, and specular light flares.

---

## 6. Depth & Elevation Tokens
- **Elevation 1 (Cards):** `box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(16, 185, 129, 0.15);`
- **Elevation 2 (Featured Hero):** `box-shadow: 0 20px 50px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(6, 182, 212, 0.25);`
- **Elevation 3 (CTAs):** `box-shadow: 0 0 30px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);`

---

## 7. Strict Do's & Don'ts

### DO:
- ✅ Keep animation frame rate locked at a butter-smooth 60 FPS.
- ✅ Maintain high contrast (WCAG AAA) between text and animated backgrounds.
- ✅ Synchronize visual impacts with audio events (beats, risers, and stingers).
- ✅ Ensure branding (`ELEKTRIX` & `https://elektrix.in`) is unmistakably visible throughout and anchored in the climax.

### DON'T:
- ❌ Do not use low-contrast gray-on-gray typography during fast transitions.
- ❌ Do not crowd mobile portrait (9:16) safe margins with edge-hugging labels.
- ❌ Do not rely on external CDN dependencies that can fail offline — use self-contained Web Audio and Canvas vector graphics.

---

## 8. Multi-Format Responsive Adaptations
- **16:9 Landscape (1920×1080):** Full cinematic presentation with split product-spec layouts.
- **9:16 Vertical (1080×1920):** Optimized for Instagram Reels, YouTube Shorts, and TikTok with stacked vertical hero staging.
- **1:1 Square (1080×1080):** High-density feed promo centered on the hero product with top-and-bottom kinetic text banners.

---

## 9. Downstream Agent & Code Prompt Guide
When generating code or rendering pipelines for this system:
1. Render canvas animations via a unified `requestAnimationFrame` timeline with explicit timecode scrub capability (`currentTime / duration`).
2. Implement Web Audio API synthesis programmatically using `AudioContext`, oscillators, biquad filters, and gain ramps.
3. Provide real-time export via `MediaRecorder` connecting the canvas stream and Web Audio stream into a downloadable video container (`video/webm;codecs=vp9` or `video/mp4`).
