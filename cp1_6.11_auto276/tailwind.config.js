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
        primary: { DEFAULT: "#2D5A3D", light: "#3A7A50" },
        gold: { DEFAULT: "#8B6914", light: "#B8860B", dark: "#6B4F0A" },
        wood: { DEFAULT: "#3E2723", light: "#5D4037", dark: "#2C1A12" },
        paper: { DEFAULT: "#F5ECD7", dark: "#E8DCC6" },
      },
      fontFamily: {
        display: ['"ZCOOL XiaoWei"', "serif"],
        serif: ['"Noto Serif SC"', "serif"],
      },
    },
  },
  plugins: [],
};
