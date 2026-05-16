/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        barber: {
          bg: '#0E0E0E',       // Main dark background
          surface: '#131313',  // Bottom container background
          input: '#0A0A0A',    // Input fields background
          gold: '#F2CA50',     // Brand yellow/gold
          text: '#D0C5AF',     // Primary beige text
          light: '#F5F5F5',    // Off-white for headers
          muted: '#4D4635',    // Muted borders
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], 
      }
    },
  },
  plugins: [],
}