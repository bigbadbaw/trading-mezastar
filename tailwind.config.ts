import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#0a0c14',
          panel: '#141828',
          hairline: '#2a3048',
          gold: '#c9a84c',
          'gold-bright': '#e8c96a',
          'mono-green': '#3dd68c',
          text: '#e8eaf2',
          muted: '#a8b4c8',
          dim: '#7a8699',
        },
        status: {
          owned: '#34d399',
          wanted: '#60a5fa',
          'most-wanted': '#fbbf24',
          mine: '#34d399',
          theirs: '#f87171',
          fair: '#34d399',
          slight: '#fbbf24',
          unfair: '#f87171',
          diverge: '#60a5fa',
        },
        grade: {
          'super-rare': '#a855f7',
          classic: '#b8860b',
          'gold-star': '#e8c96a',
          featured: '#f472b6',
          'normal-5': '#e2e8f0',
          'normal-4': '#3b82f6',
          'normal-3': '#22c55e',
          'normal-2': '#94a3b8',
          special: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['var(--font-noto-sans-tc)', 'system-ui', 'sans-serif'],
        display: ['var(--font-cinzel)', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'grade-glow': '0 0 12px var(--grade-glow-color, transparent)',
        'score-higher': '0 0 16px rgba(61, 214, 140, 0.35)',
      },
      keyframes: {
        legendaryGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(168, 85, 247, 0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(232, 201, 106, 0.55)' },
        },
        verdictPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
      },
      animation: {
        legendaryGlow: 'legendaryGlow 3s ease-in-out infinite',
        verdictPulse: 'verdictPulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
