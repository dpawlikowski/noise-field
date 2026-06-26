import type { WorkletName } from '../register';

export interface PropConfig {
  label: string;
  cssVar: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format?: (v: number) => string;
}

export interface WorkletConfig {
  name: WorkletName;
  title: string;
  description: string;
  cssProperties: string;
  animationCSS: string;
  props: PropConfig[];
  defaultColors?: { label: string; cssVar: string; defaultValue: string }[];
}

export const workletConfigs: WorkletConfig[] = [
  {
    name: 'noise-field',
    title: 'Noise Field',
    description: 'Organic fractional Brownian motion — layered simplex noise flowing through time.',
    cssProperties: `background: paint(noise-field);
--nf-hue: 220;
--nf-scale: 3;
--nf-saturation: 70;
--nf-lightness: 50;
animation: nf-flow 12s linear infinite;`,
    animationCSS: `@property --nf-time { syntax: '<number>'; inherits: false; initial-value: 0; }
@keyframes nf-flow { to { --nf-time: 1000; } }`,
    props: [
      { label: 'Hue',        cssVar: '--nf-hue',        min: 0,   max: 360, step: 1,   defaultValue: 220 },
      { label: 'Scale',      cssVar: '--nf-scale',      min: 0.5, max: 10,  step: 0.1, defaultValue: 3   },
      { label: 'Saturation', cssVar: '--nf-saturation', min: 0,   max: 100, step: 1,   defaultValue: 70  },
      { label: 'Lightness',  cssVar: '--nf-lightness',  min: 10,  max: 90,  step: 1,   defaultValue: 50  },
    ],
  },
  {
    name: 'plasma',
    title: 'Plasma',
    description: 'Classic demoscene plasma — interference of sine waves creating psychedelic color fields.',
    cssProperties: `background: paint(plasma);
--plasma-hue: 0;
--plasma-complexity: 3;
animation: plasma-flow 8s linear infinite;`,
    animationCSS: `@property --plasma-time { syntax: '<number>'; inherits: false; initial-value: 0; }
@keyframes plasma-flow { to { --plasma-time: 1000; } }`,
    props: [
      { label: 'Hue',        cssVar: '--plasma-hue',        min: 0,   max: 360, step: 1,   defaultValue: 0 },
      { label: 'Complexity', cssVar: '--plasma-complexity', min: 1,   max: 8,   step: 0.5, defaultValue: 3 },
    ],
  },
  {
    name: 'marble',
    title: 'Marble',
    description: 'Turbulence-distorted sine wave creates veining like natural stone. Slowly animated.',
    cssProperties: `background: paint(marble);
--marble-hue: 200;
--marble-scale: 2;
--marble-contrast: 1.2;
--marble-vein-width: 5;
animation: marble-flow 20s linear infinite;`,
    animationCSS: `@property --marble-time { syntax: '<number>'; inherits: false; initial-value: 0; }
@keyframes marble-flow { to { --marble-time: 1000; } }`,
    props: [
      { label: 'Hue',        cssVar: '--marble-hue',        min: 0,   max: 360, step: 1,   defaultValue: 200 },
      { label: 'Scale',      cssVar: '--marble-scale',      min: 0.5, max: 6,   step: 0.1, defaultValue: 2   },
      { label: 'Contrast',   cssVar: '--marble-contrast',   min: 0.2, max: 3,   step: 0.1, defaultValue: 1.2 },
      { label: 'Vein Width', cssVar: '--marble-vein-width', min: 1,   max: 15,  step: 0.5, defaultValue: 5   },
    ],
  },
  {
    name: 'grain',
    title: 'Film Grain',
    description: 'Animated static noise — dark base with randomized brightness pixels. Classically used as overlay on photographs.',
    cssProperties: `background: paint(grain);
--grain-opacity: 0.5;
--grain-size: 1;
--grain-base-hue: 0;
--grain-base-lightness: 8;
animation: grain-flicker 0.1s steps(1) infinite;`,
    animationCSS: `@property --grain-time { syntax: '<number>'; inherits: false; initial-value: 0; }
@keyframes grain-flicker { to { --grain-time: 100; } }`,
    props: [
      { label: 'Opacity',          cssVar: '--grain-opacity',         min: 0.05, max: 1,   step: 0.05, defaultValue: 0.5 },
      { label: 'Grain Size',       cssVar: '--grain-size',            min: 1,    max: 8,   step: 1,    defaultValue: 1   },
      { label: 'Base Hue',         cssVar: '--grain-base-hue',        min: 0,    max: 360, step: 1,    defaultValue: 0   },
      { label: 'Base Lightness %', cssVar: '--grain-base-lightness',  min: 0,    max: 40,  step: 1,    defaultValue: 8   },
    ],
  },
  {
    name: 'mesh-gradient',
    title: 'Mesh Gradient',
    description: 'Four color points drifting through space — inverse-distance weighted blending like Stripe.',
    cssProperties: `background: paint(mesh-gradient);
--mesh-color-1: #667eea;
--mesh-color-2: #764ba2;
--mesh-color-3: #f093fb;
--mesh-color-4: #f5576c;
animation: mesh-flow 10s linear infinite;`,
    animationCSS: `@property --mesh-time { syntax: '<number>'; inherits: false; initial-value: 0; }
@keyframes mesh-flow { to { --mesh-time: 1000; } }`,
    props: [],
    defaultColors: [
      { label: 'Color 1', cssVar: '--mesh-color-1', defaultValue: '#667eea' },
      { label: 'Color 2', cssVar: '--mesh-color-2', defaultValue: '#764ba2' },
      { label: 'Color 3', cssVar: '--mesh-color-3', defaultValue: '#f093fb' },
      { label: 'Color 4', cssVar: '--mesh-color-4', defaultValue: '#f5576c' },
    ],
  },
];
