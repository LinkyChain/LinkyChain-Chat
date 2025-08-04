/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        linkychain: {
          'dark-300': '#111827',
          'dark-200': '#111827',
          'dark-100': '#111827',
          'gray-100': '#dcddde',
          'gray-200': '#72767d',
          'blue-500': '#5865f2',
          'green-500': '#3cb371',
          'red-500': '#ef4444',
          'blue-757': '#6AA0F1',
          'yellow-767': '#f8f7b0',
          'yellow-500': '#fee75c',
          'mention-blue': '#4752c4',
          'mention-hover': '#4f5bde',
        },
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          from: { opacity: '0', transform: 'translateX(10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        popIn: {
          from: { transform: 'scale(0.9)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        pulseLinky: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        pulseFast: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        dataFlow: {
          '0%': { transform: 'translateX(0)', opacity: '0.7' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(10px)', opacity: '0.7' },
        },
        scaleIn: {
          from: { transform: 'scale(0.9)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        messageFadeIn: {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.95)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        loadingPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in-up': 'fadeIn 0.5s ease-out forwards',
        'fade-in-left': 'fadeInLeft 0.3s ease-out forwards',
        'fade-in-right': 'fadeInRight 0.3s ease-out forwards',
        'pop-in': 'popIn 0.3s ease-out forwards',
        'pulse-linkychain': 'pulseLinky 2s infinite ease-in-out',
        'pulse-fast': 'pulseFast 1s infinite ease-in-out',
        'bounce-subtle': 'bounceSubtle 1.5s infinite ease-in-out',
        'data-flow': 'dataFlow 1.5s infinite ease-in-out',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'message-fade-in': 'messageFadeIn 0.3s ease-out forwards',
        'loading-pulse': 'loadingPulse 1.5s infinite ease-in-out',
      }
    },
  },
  plugins: [],
};