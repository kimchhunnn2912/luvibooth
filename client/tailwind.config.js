/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          primary: '#FD9BB1',
        },
        dark: '#121C28',
      }
    },
  },
  plugins: [],
}