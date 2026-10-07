/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0B63D6',
          bright: '#1677E8',
          light: '#EAF3FF',
          soft: '#F5F9FF',
        },
        ink: {
          DEFAULT: '#172033',
          muted: '#667085',
        },
        line: '#E6EAF0',
        canvas: '#F5F7FA',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 32, 51, 0.04), 0 8px 24px rgba(23, 32, 51, 0.04)',
      },
    },
  },
  plugins: [],
}
