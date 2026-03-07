/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kota: {
          green: "#00C896",
          dark: "#0A0A0A",
          charcoal: "#1A1A2E",
          card: "#16213E",
          muted: "#6B7280",
          light: "#F9FAFB",
        },
      },
    },
  },
};

