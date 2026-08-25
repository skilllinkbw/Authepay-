/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line import/no-anonymous-default-export
export default {
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