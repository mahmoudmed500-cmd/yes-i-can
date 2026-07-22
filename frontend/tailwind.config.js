/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9ecff",
          200: "#bcdeff",
          300: "#8ecafe",
          400: "#59aefb",
          500: "#3390f7",
          600: "#1f70ec",
          700: "#1b5bd9",
          800: "#1c4bb0",
          900: "#1c428a",
        },
      },
    },
  },
  plugins: [],
};
