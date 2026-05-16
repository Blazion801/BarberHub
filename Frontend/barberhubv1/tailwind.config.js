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
          bg: '#0F172A',       // Deep Slate
          surface: '#1E293B',  // Lighter Slate for cards/inputs
          input: '#1E293B',    // Matching surface for inputs
          accent: '#D4AF37',   // Metallic Brass/Gold
          text: '#F8FAFC',     // Ice White
          muted: '#64748B',    // Cool Gray for borders/placeholders
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],    // Clean body text
        serif: ['Playfair Display', 'serif'],  // Luxury headers
      }
    },
  },
  plugins: [],
}