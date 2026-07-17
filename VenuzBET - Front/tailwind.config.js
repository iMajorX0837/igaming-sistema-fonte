import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Montserrat', 'sans-serif'],
      serif: defaultTheme.fontFamily.serif,
      mono: defaultTheme.fontFamily.mono,
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand-primary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--brand-primary-hover-rgb) / <alpha-value>)',
          light: 'rgb(var(--brand-primary-light-rgb) / <alpha-value>)',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalBackdropIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalPanelIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        modalBackdropOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        modalPanelOut: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.96) translateY(10px)' },
        },
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        loadingGlow: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.35' },
          '50%': { transform: 'scale(1.12)', opacity: '0.65' },
        },
        loadingRing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.45' },
          '50%': { transform: 'scale(1.06)', opacity: '1' },
        },
        loadingLogo: {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.05)', filter: 'brightness(1.12)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.7s ease-in-out',
        'modal-backdrop-in': 'modalBackdropIn 0.22s ease-out both',
        'modal-panel-in': 'modalPanelIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both',
        'modal-backdrop-out': 'modalBackdropOut 0.2s ease-in both',
        'modal-panel-out': 'modalPanelOut 0.28s cubic-bezier(0.4, 0, 1, 1) both',
        'page-enter': 'pageEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'loading-glow': 'loadingGlow 2.4s ease-in-out infinite',
        'loading-ring': 'loadingRing 2s ease-in-out infinite',
        'loading-logo': 'loadingLogo 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
