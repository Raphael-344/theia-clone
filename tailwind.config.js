/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        theia: {
          // Sidebar teal foncé
          sidebar: '#0a4a5a',
          'sidebar-hover': '#0d5c6e',
          'sidebar-active': '#0f6b80',
          // Header & accents
          teal: '#0d7a8c',
          'teal-light': '#1a9bb0',
          // Bouton orange → vert
          orange: '#e8701a',
          'orange-hover': '#d4621a',
          // Validé / correct
          green: '#2da44e',
          'green-light': '#e6f4ea',
          // Faux / discordance
          red: '#d93025',
          'red-light': '#fce8e6',
          // Rose accent CESI
          pink: '#e91e8c',
          'pink-light': '#fce4f1',
          // Neutre
          gray: '#f0f4f8',
          'gray-dark': '#4a5568',
          border: '#d1dbe3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
