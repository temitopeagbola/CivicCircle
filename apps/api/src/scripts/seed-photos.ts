import sharp from 'sharp';

import type { Category } from '@civiccircle/shared';

/**
 * Flat illustrations for seeded reports (no stock photos to license). Text-free on purpose:
 * container images don't ship fonts, and SVG text would render as boxes.
 */
const W = 800;
const H = 600;

const sky = (top: string, bottom: string) => `
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>`;

const road = `<rect y="330" width="${W}" height="270" fill="#4b5563"/>
  ${[0, 1, 2, 3, 4].map((i) => `<rect x="${i * 180 + 20}" y="455" width="110" height="14" rx="4" fill="#f8fafc" opacity=".85"/>`).join('')}`;

const buildings = (fill: string) =>
  [60, 210, 380, 560, 690]
    .map(
      (x, i) =>
        `<rect x="${x}" y="${120 + (i % 3) * 30}" width="${120 + (i % 2) * 30}" height="${220 - (i % 3) * 30}" fill="${fill}" opacity="${0.55 + (i % 2) * 0.2}"/>`,
    )
    .join('');

const SCENES: Record<Category, string> = {
  roads: `${sky('#bfdbfe', '#e0f2fe')}${buildings('#94a3b8')}${road}
    <ellipse cx="400" cy="420" rx="150" ry="48" fill="#1f2937"/>
    <ellipse cx="400" cy="412" rx="128" ry="34" fill="#111827"/>
    <path d="M250 420 l-30 -12 M550 420 l35 -10 M330 452 l-18 20 M470 450 l20 22" stroke="#111827" stroke-width="6"/>
    <path d="M640 470 l40 -120 l40 120 z" fill="#f97316"/><rect x="630" y="470" width="100" height="16" rx="3" fill="#f97316"/>
    <rect x="652" y="395" width="56" height="14" fill="#fff"/>`,
  lighting: `${sky('#0f172a', '#1e3a8a')}
    ${[80, 190, 330, 520, 700, 610].map((x, i) => `<circle cx="${x}" cy="${50 + (i % 3) * 40}" r="3" fill="#e2e8f0"/>`).join('')}
    <circle cx="680" cy="90" r="34" fill="#f1f5f9"/><circle cx="694" cy="80" r="30" fill="#0f172a"/>
    <rect y="460" width="${W}" height="140" fill="#1e293b"/>
    <rect x="370" y="150" width="18" height="320" fill="#334155"/>
    <path d="M379 160 q0 -40 70 -40 h40" stroke="#334155" stroke-width="16" fill="none"/>
    <path d="M455 112 h70 l-14 32 h-42 z" fill="#475569"/>
    <path d="M470 160 l40 40 M510 160 l-40 40" stroke="#f87171" stroke-width="8" stroke-linecap="round"/>`,
  waste: `${sky('#e0f2fe', '#f8fafc')}${buildings('#cbd5e1')}
    <rect y="380" width="${W}" height="220" fill="#d6d3d1"/>
    <rect x="120" y="250" width="170" height="220" rx="10" fill="#15803d"/><rect x="110" y="236" width="190" height="26" rx="6" fill="#166534"/>
    ${[
      [330, 450, 70],
      [420, 470, 62],
      [380, 400, 58],
      [490, 440, 66],
      [210, 225, 46],
    ]
      .map(
        ([x, y, r]) =>
          `<circle cx="${x}" cy="${y}" r="${r}" fill="#1f2937"/><path d="M${x! - 10} ${y! - r!} l10 -16 l10 16" fill="#111827"/>`,
      )
      .join('')}
    <rect x="560" y="300" width="190" height="200" rx="14" fill="#f5f5f4" transform="rotate(12 655 400)"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${575 + i * 45}" y="310" width="8" height="180" fill="#a8a29e" transform="rotate(12 655 400)"/>`).join('')}`,
  graffiti: `<rect width="${W}" height="${H}" fill="#b45309"/>
    ${Array.from({ length: 16 }, (_, row) =>
      Array.from(
        { length: 9 },
        (_, col) =>
          `<rect x="${col * 100 - (row % 2) * 50}" y="${row * 40}" width="96" height="36" fill="#c2410c" opacity="${0.6 + ((row + col) % 3) * 0.15}"/>`,
      ).join(''),
    ).join('')}
    <path d="M90 280 q60 -140 140 -20 t140 -30 t130 40 t140 -60" stroke="#22d3ee" stroke-width="26" fill="none" stroke-linecap="round"/>
    <path d="M130 380 q90 -90 160 10 q50 60 120 -30 q70 -80 140 20" stroke="#e879f9" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M520 160 l60 90 l40 -110 l50 120" stroke="#facc15" stroke-width="18" fill="none" stroke-linecap="round"/>
    <rect y="520" width="${W}" height="80" fill="#57534e"/>`,
  water: `${sky('#94a3b8', '#cbd5e1')}${buildings('#64748b')}${road}
    <ellipse cx="380" cy="450" rx="300" ry="90" fill="#60a5fa" opacity=".85"/>
    <ellipse cx="330" cy="430" rx="120" ry="22" fill="#bfdbfe" opacity=".7"/>
    <rect x="600" y="420" width="90" height="56" rx="6" fill="#1f2937"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="${610 + i * 16}" y="428" width="8" height="40" fill="#6b7280"/>`).join('')}
    ${Array.from({ length: 22 }, (_, i) => `<path d="M${(i * 37) % W} ${(i * 53) % 300} l-12 34" stroke="#e2e8f0" stroke-width="3"/>`).join('')}`,
  parks: `${sky('#bae6fd', '#f0f9ff')}
    <rect y="360" width="${W}" height="240" fill="#4ade80"/><rect y="360" width="${W}" height="20" fill="#22c55e"/>
    <rect x="200" y="170" width="44" height="220" fill="#78350f"/>
    <circle cx="222" cy="150" r="110" fill="#15803d"/><circle cx="150" cy="200" r="70" fill="#16a34a"/><circle cx="300" cy="190" r="80" fill="#16a34a"/>
    <path d="M300 300 l210 140" stroke="#78350f" stroke-width="22" stroke-linecap="round"/>
    <circle cx="510" cy="440" r="46" fill="#22c55e"/>
    <rect x="560" y="410" width="180" height="16" rx="4" fill="#92400e"/><rect x="560" y="440" width="180" height="16" rx="4" fill="#92400e" transform="rotate(-9 650 448)"/>
    <rect x="575" y="456" width="12" height="48" fill="#57534e"/><rect x="712" y="430" width="12" height="70" fill="#57534e"/>`,
  traffic: `${sky('#dbeafe', '#eff6ff')}${buildings('#94a3b8')}${road}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${170 + i * 80}" y="350" width="48" height="230" fill="#f8fafc"/>`).join('')}
    <rect x="660" y="140" width="14" height="250" fill="#334155"/>
    <rect x="630" y="90" width="74" height="170" rx="14" fill="#111827"/>
    <circle cx="667" cy="125" r="22" fill="#ef4444"/><circle cx="667" cy="175" r="22" fill="#374151"/><circle cx="667" cy="225" r="22" fill="#374151"/>`,
  pavements: `${sky('#e0f2fe', '#f8fafc')}${buildings('#cbd5e1')}
    <rect y="300" width="${W}" height="300" fill="#a8a29e"/>
    ${Array.from({ length: 5 }, (_, row) => Array.from({ length: 6 }, (_, col) => `<rect x="${col * 140 - (row % 2) * 70}" y="${300 + row * 62}" width="136" height="58" fill="#d6d3d1"/>`).join('')).join('')}
    <path d="M330 424 l140 -14 l6 60 l-140 14 z" fill="#e7e5e4" stroke="#57534e" stroke-width="4"/>
    <path d="M360 470 l30 -20 l20 24 l26 -30" stroke="#44403c" stroke-width="5" fill="none"/>
    <path d="M600 520 l30 -100 l30 100 z" fill="#f97316"/><rect x="590" y="520" width="80" height="14" fill="#f97316"/>`,
  other: `${sky('#e2e8f0', '#f8fafc')}${buildings('#94a3b8')}${road}
    <circle cx="400" cy="240" r="90" fill="#6366f1" opacity=".85"/>
    <path d="M370 215 q0 -36 30 -36 q30 0 30 30 q0 22 -30 32 v24" stroke="#fff" stroke-width="16" fill="none" stroke-linecap="round"/>
    <circle cx="400" cy="300" r="10" fill="#fff"/>`,
};

export async function renderSeedPhoto(category: Category): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${SCENES[category]}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}
