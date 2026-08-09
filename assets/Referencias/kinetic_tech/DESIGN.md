---
name: Kinetic Tech
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393d'
  surface-container-lowest: '#0c0e11'
  surface-container-low: '#1a1c1f'
  surface-container: '#1e2023'
  surface-container-high: '#282a2d'
  surface-container-highest: '#333538'
  on-surface: '#e2e2e6'
  on-surface-variant: '#bacac6'
  inverse-surface: '#e2e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#859490'
  outline-variant: '#3b4a47'
  surface-tint: '#36ddc8'
  primary: '#59f6e0'
  on-primary: '#003731'
  primary-container: '#2fd9c4'
  on-primary-container: '#005a50'
  inverse-primary: '#006b5f'
  secondary: '#ffb68e'
  on-secondary: '#542200'
  secondary-container: '#eb6b01'
  on-secondary-container: '#491d00'
  tertiary: '#ffd8af'
  on-tertiary: '#482900'
  tertiary-container: '#ffb358'
  on-tertiary-container: '#734500'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#5efae4'
  primary-fixed-dim: '#36ddc8'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb68e'
  on-secondary-fixed: '#331200'
  on-secondary-fixed-variant: '#773300'
  tertiary-fixed: '#ffddba'
  tertiary-fixed-dim: '#ffb866'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#111317'
  on-background: '#e2e2e6'
  surface-variant: '#333538'
  surface-card: '#171A1F'
  status-critical: '#FF4D4D'
  status-optimal: '#2ECC71'
  status-warning: '#F1C40F'
  fuel-amber: '#FF7A1A'
  electric-cyan: '#2FD9C4'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  metric-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 1rem
  gutter: 1rem
  component-gap: 0.75rem
  section-padding: 1.5rem
  map-edge-safe: 1.25rem
---

## Brand & Style

The design system is engineered for the high-stakes environment of driving, where speed of comprehension and reliability are paramount. It adopts a **Corporate / Modern** aesthetic infused with **High-Tech / Automotive** flourishes to cater to both traditional combustion-engine drivers and the "early adopter" EV community.

The brand personality is authoritative yet forward-thinking—acting as a digital co-pilot that bridges the gap between legacy fuel systems and the future of electric mobility. By utilizing a deep, atmospheric dark mode and vibrant neon accents, the UI evokes the feeling of a premium vehicle's digital dashboard (Digital Cluster), establishing immediate trust and technical sophistication.

Key visual pillars include:
- **Atmospheric Dark Mode:** Reduced eye strain for night driving and a premium "cockpit" feel.
- **Dynamic Dual-Aesthetics:** A "hybrid" interface that shifts its chromatic accent based on the user's current energy context (Combustion vs. Electric).
- **Precision Data:** Heavy emphasis on technical metrics—power, distance, and quality scores—rendered with razor-sharp clarity.

## Colors

This design system utilizes a dark-first philosophy. The primary surface is near-black to provide maximum contrast for functional accents and data. 

### Core Palette
- **Primary (Electric Cyan):** Used for EV-related interactions, charging status, and high-tech highlights. It represents clean energy and innovation.
- **Secondary (Fuel Amber):** Dedicated to traditional fuel interactions. It provides a warm, high-visibility contrast that signals energy and action.
- **Neutral Background:** A deep navy-black (`#0D0F12`) serves as the canvas, with a slightly lighter elevation (`#171A1F`) for interactive cards and containers.

### Functional Gradients
A "Quality Gradient" is used specifically for ANP (National Agency of Petroleum) scores. This 5-step scale transitions from **Status Critical (Red)** to **Status Optimal (Green)**, allowing users to instantly gauge fuel or service station reliability through color association.

### Contextual Accents
The UI should dynamically swap its primary focus color based on the selected mode. In "Combustível" mode, the Amber accent dominates. In "Elétrico" mode, the Cyan accent leads. In "Ambos" (Both), the colors coexist to differentiate pin types and data points.

## Typography

The typography strategy separates **Technical Data** from **Informational Content**.

- **Space Grotesk** is used for headings, numbers, and labels. Its geometric and slightly industrial character mimics modern automotive instrument clusters. Use the `metric-xl` role for critical values like charging power (kW) or fuel quality scores to ensure they are the first thing a user sees.
- **Inter** is the workhorse for all body text, descriptions, and addresses. It is selected for its exceptional legibility on mobile screens, even in vibrating or high-glare environments typical of driving.

**Scaling:** On mobile devices, use the `-mobile` variants for headlines to maintain a tight, functional layout that minimizes scrolling. All labels should use the `label-caps` style for a technical, "instrumentation" feel.

## Layout & Spacing

This design system utilizes a **Fluid Grid** model optimized for mobile-first interaction. 

### Spacing Philosophy
The system follows an 8px base grid to ensure consistent alignment. Given the automotive context, tap targets and margins are generous to accommodate one-handed use. 
- **Margins:** A standard 16px (`1rem`) side margin is used for all content cards.
- **Gutters:** 16px spacing between vertical elements.
- **Bottom Sheets:** All station details are housed in a dynamic bottom sheet. When collapsed, it exposes a "peek" height of 120px; when expanded, it fills up to 90% of the screen height.

### Mobile & Tablet Adaptation
- **Mobile:** Single-column layout. Map pins utilize a larger hit-box (44x44px) to ensure easy selection.
- **Tablet:** The map remains full-screen, but station details reflow into a persistent side-panel (360px width) instead of a bottom sheet, mimicking a Tesla-style dashboard layout.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Subtle Glows** rather than heavy shadows.

- **Surface Levels:** 
    - Level 0: The map and background (`#0D0F12`).
    - Level 1: Main interactive cards and Bottom Sheets (`#171A1F`).
    - Level 2: Overlay elements like pop-ups or search bars.
- **Neon Glows:** Active states and Map Pins use a `box-shadow` with high blur (12-20px) and low opacity (30%) in the accent color (Amber or Cyan). This creates a "luminescent" effect that makes critical information pop against the dark background.
- **Glassmorphism:** Navigation bars and search headers use a backdrop-blur (15px) with a semi-transparent layer of the neutral background color to maintain context of the map underneath while ensuring text legibility.

## Shapes

The shape language strikes a balance between "rugged-automotive" and "modern-tech." 

- **Primary Corners:** All cards, input fields, and buttons use a **0.5rem (8px) to 1rem (16px)** radius. This creates a soft-industrial look that feels approachable but disciplined.
- **Pill Elements:** Toggles and chips (like connector types) use fully rounded "pill" shapes to distinguish them as high-priority interactive elements.
- **Map Pins:** Custom teardrop shapes with a circular inner "lens" that houses the station icon.

## Components

### Buttons
- **Primary:** High-contrast background (Cyan or Amber) with black text.
- **Secondary:** Outline style with 1px stroke in the accent color.
- **States:** Hover/Press states should increase the neon glow intensity.

### Input Fields
- **Search Bar:** Dark background (`#171A1F`) with a thin `1px` border in a low-opacity gray. On focus, the border transitions to the active mode's accent color (Amber/Cyan).

### Chips & Badges
- **Connector Types:** Small pill-shaped chips with a subtle stroke.
- **ANP Quality Score:** A circular badge utilizing the "Red-to-Green" gradient logic with white, bold Space Grotesk text.

### Cards
- **Station Card:** Uses a 16px radius. Includes a prominent "Distance" label in the top right and a "Mode Icon" (Fuel pump or Lightning bolt) in the bottom right using a ghost-icon style.

### Map Pins
- **Combustion:** Amber pin with a fuel pump icon.
- **Electric:** Cyan pin with a lightning bolt icon.
- **Active State:** The selected pin scales up by 1.2x and emits a soft radial pulse in its respective accent color.

### Icons
- Use **Outline-style icons** with a consistent 1.5px or 2px stroke weight. Icons should never be filled unless they are active status indicators.