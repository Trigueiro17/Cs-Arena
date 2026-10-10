/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cs: {
          dark: "#0b0e14",
          card: "#121722",
          surface: "#182030",
          border: "#232f46",
          orange: "#f97316",
          "orange-hover": "#ea580c",
          amber: "#fbbf24",
          blue: "#0284c7",
          cyan: "#06b6d4",
          accent: "#ff6a00",
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Rajdhani"', '"Chakra Petch"', 'sans-serif'],
      },
      boxShadow: {
        'glow-orange': '0 0 20px -5px rgba(249, 115, 22, 0.4)',
        'glow-blue': '0 0 20px -5px rgba(6, 182, 212, 0.4)',
        'card-glow': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
