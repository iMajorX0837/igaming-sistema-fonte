/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          bg: '#090a0c',
          sidebar: '#0d0f12',
          panel: '#111318',
          'panel-2': '#15181e',
          'panel-3': '#1a1e25',
          border: '#232831',
          'border-strong': '#2e3540',
          foreground: '#f3f4f6',
          'foreground-soft': '#c1c6cf',
          muted: '#7f8792',
          'muted-2': '#5f6670',
          accent: '#e7e9ee',
          'accent-hover': '#ffffff',
          success: '#45b892',
          danger: '#d86a70',
          warning: '#d3a24c',
          info: '#6d8fd4',
        },
        'dark-primary': '#111318',
        'dark-secondary': '#15181e',
      },
      boxShadow: {
        admin: '0 22px 60px rgba(0, 0, 0, 0.24)',
      },
    },
  },
  plugins: [],
};
