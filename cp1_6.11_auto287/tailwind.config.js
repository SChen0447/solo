/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        linen: '#f4e8d1',
        flax: '#e0d4c0',
        wood: '#5d4037',
        'wood-light': '#8d6e63',
        'wood-dark': '#4e342e',
        indigo: '#1a237e',
        madder: '#c62828',
      },
    },
  },
  plugins: [],
};
