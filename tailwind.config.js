/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        authepay: {
          navy: "#0b1f3a",
          blue: "#123c6a",
          black: "#111827",
          green: "#16a34a",
        },
      },
    },
  },
  plugins: [],
};