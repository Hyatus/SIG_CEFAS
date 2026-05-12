/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Varela Round"', 'system-ui', 'sans-serif'],
        sans: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-in': {
          from: { transform: 'translateX(calc(100% + 1.5rem))', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
