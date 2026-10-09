/* Tailwind v4 through PostCSS, so `@import "tailwindcss"` in src/index.css is
   actually compiled: without this file the import resolves as plain CSS and
   every utility class silently does nothing (which is a very quiet way to lose
   a layout). */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
