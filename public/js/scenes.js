/**
 * Small looping SVG "scenes" used as lightweight, offline-friendly stand-ins
 * for GIFs — a growing-plant animation, a sun/cloud weather scene, and a
 * coin/cashflow scene. Pure CSS keyframes (see style.css), so they cost
 * nothing to load and never buffer.
 */
const Scenes = {
  growingPlant() {
    return `
      <svg class="scene" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="146" rx="70" ry="8" fill="var(--parchment-deep)"/>
        <path class="stem" d="M100 140 C 100 100, 96 80, 100 50" stroke="var(--olive)" stroke-width="4" stroke-linecap="round"/>
        <path class="leaf leaf-1" d="M100 108 C 80 100, 70 82, 78 66 C 96 72, 104 90, 100 108 Z" fill="var(--olive)"/>
        <path class="leaf leaf-2" d="M100 90 C 120 84, 132 68, 126 50 C 106 54, 96 72, 100 90 Z" fill="var(--gold)"/>
        <path class="leaf leaf-3" d="M100 58 C 92 44, 94 30, 106 22 C 116 34, 112 50, 100 58 Z" fill="var(--olive-deep)"/>
        <circle class="sun" cx="164" cy="30" r="14" fill="var(--gold-soft)"/>
      </svg>
    `;
  },
  weather() {
    return `
      <svg class="scene" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle class="sun" cx="70" cy="46" r="22" fill="var(--gold-soft)"/>
        <g class="cloud">
          <ellipse cx="120" cy="60" rx="34" ry="20" fill="var(--paper-card)" stroke="var(--rule)" stroke-width="2"/>
          <ellipse cx="98" cy="66" rx="24" ry="16" fill="var(--paper-card)" stroke="var(--rule)" stroke-width="2"/>
        </g>
        <line x1="112" y1="92" x2="106" y2="106" stroke="var(--olive)" stroke-width="3" stroke-linecap="round"/>
        <line x1="128" y1="92" x2="122" y2="106" stroke="var(--olive)" stroke-width="3" stroke-linecap="round"/>
        <line x1="144" y1="92" x2="138" y2="106" stroke="var(--olive)" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `;
  },
  marketplace() {
    return `
      <svg class="scene" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="136" rx="76" ry="8" fill="var(--parchment-deep)"/>
        <rect x="52" y="70" width="96" height="54" rx="6" fill="var(--paper-card)" stroke="var(--rule)" stroke-width="2"/>
        <path d="M46 70 L60 34 H140 L154 70 Z" fill="var(--clay-soft)" opacity="0.9"/>
        <path d="M46 70 L60 34 H100 V70 Z" fill="var(--gold)" opacity="0.9"/>
        <circle class="sun" cx="168" cy="28" r="10" fill="var(--gold-soft)"/>
        <rect x="86" y="92" width="28" height="32" rx="2" fill="var(--olive)"/>
      </svg>
    `;
  },
  community() {
    return `
      <svg class="scene" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="136" rx="76" ry="8" fill="var(--parchment-deep)"/>
        <circle class="leaf leaf-1" cx="66" cy="76" r="22" fill="var(--gold-soft)"/>
        <circle class="leaf leaf-2" cx="106" cy="66" r="26" fill="var(--olive)"/>
        <circle class="leaf leaf-3" cx="146" cy="80" r="20" fill="var(--clay-soft)"/>
      </svg>
    `;
  }
};
