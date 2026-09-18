/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#000000",
          bgDark: "#020503",
          bgAlt: "#030805",
          surface: "#050B07",
          surfaceAlt: "#07120B",
          card: "#0A160E",
          cardHover: "#0E2014",
          border: "#003B1F",
          borderBright: "#00FF41",
          borderMuted: "#062B18",
          primary: "#00FF41",
          secondary: "#00D94F",
          bright: "#39FF88",
          dark: "#003B1F",
          darker: "#062B18",
          dim: "#0A1A10",
          muted: "#5FBF7F",
          textMuted: "#9BE7B4",
          text: "#D7FFE6",
          white: "#FFFFFF",
          warning: "#FFD600",
          error: "#FF3B30",
          success: "#00FF41",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        cyber: ['"Share Tech Mono"', '"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'terminal-glow': '0 0 10px rgba(0, 255, 65, 0.35), 0 0 20px rgba(0, 255, 65, 0.15)',
        'terminal-glow-sm': '0 0 6px rgba(0, 255, 65, 0.25)',
        'terminal-glow-lg': '0 0 25px rgba(0, 255, 65, 0.45), 0 0 50px rgba(0, 255, 65, 0.15)',
        'hud-panel': '0 12px 40px 0 rgba(0, 0, 0, 0.95), 0 0 25px rgba(0, 255, 65, 0.12), 0 0 1px 1px rgba(0, 255, 65, 0.35)',
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2.5s infinite ease-in-out',
        'flicker': 'screenFlicker 0.15s infinite',
        'scan': 'scanlineSweep 10s linear infinite',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
        screenFlicker: {
          '0%': { opacity: '0.98' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.99' },
        },
        scanlineSweep: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
    },
  },
  plugins: [],
}
