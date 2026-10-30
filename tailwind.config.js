/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F4F7FB',
        sidebar: '#0B1F33',
        header: '#102A43',
        primary: {
          DEFAULT: '#1769AA',
          dark: '#102A43',
          hover: '#0E5288',
        },
        emergency: {
          critical: '#D92D20',
          warning: '#F79009',
          success: '#12B76A',
          info: '#1769AA',
        },
        darkText: '#172B4D',
        mutedText: '#667085',
        borderLine: '#D0D5DD',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
