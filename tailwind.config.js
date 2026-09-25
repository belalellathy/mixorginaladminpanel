/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        status: {
          pending: '#eab308',
          payment_review: '#3b82f6',
          confirmed: '#22c55e',
          shipped: '#a855f7',
          delivered: '#6b7280',
        }
      }
    },
  },
  plugins: [],
}
