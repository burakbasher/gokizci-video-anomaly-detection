/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: "#212529",           // Ana renk (metin, buton)
        "primary-dark": "#000000",    // Hover veya vurgu tonu
        "primary-light": "#6C757D",   // Disabled durumlar

        background: "#E9ECEF",        // Genel sayfa arka planı
        "background-alt": "#DEE2E6",  // Alternatif arka plan (bölüm ayrımı vs.)
        "background-main": "#f9fafb",  // Alternatif arka plan (bölüm ayrımı vs.)
        "background-surface": "#FFFFFF",  // Kart, kutu gibi nesnelerin arka planı

        "text-light": "#CED4DA",      // Açık metin
        "text-muted": "#ADB5BD",      // Açıklama, ikinci derecede metin
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.hide-ms-clear-reveal': {
          '&::-ms-reveal': {
            display: 'none',
          },
          '&::-ms-clear': {
            display: 'none',
          },
        },
      });
    },
  ],
};
