/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          ct: {
            violet: '#6359ff',
            teal: '#0bbfbf',
            yellow: '#ffc806',
            white: '#ffffff',
            earth: '#F7F2EA',
            plum: '#191741',
          }
        },
      },
    },
    plugins: [],
  }