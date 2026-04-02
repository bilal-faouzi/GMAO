/** @type {import('tailwindcss').Config} */
module.exports = {
  // Active le dark mode via la classe .dark sur <html>
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // ✅ Toutes les couleurs sont branchées sur vos variables CSS
      // Utilisez bg-surface, text-primary, border-subtle... partout dans le projet
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        elevated: "var(--color-elevated)",
        hover: "var(--color-hover)",
        active: "var(--color-active)",

        border: {
          DEFAULT: "var(--color-border)",
          subtle: "var(--color-border-subtle)",
        },

        text: {
          DEFAULT: "var(--color-text)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },

        primary: {
          DEFAULT: "var(--color-primary)",
          dark: "var(--color-primary-dark)",
          soft: "var(--color-primary-soft)",
        },

        success: {
          DEFAULT: "var(--color-success)",
          soft: "var(--color-success-soft)",
        },

        warning: "var(--color-warning)",

        danger: {
          DEFAULT: "var(--color-danger)",
          soft: "var(--color-danger-soft)",
        },
      },

      // ✅ Fonts branchées sur vos variables CSS
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },

      // ✅ Border radius branché sur vos variables
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },

      // ✅ Shadows branchées sur vos variables
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },

      // ✅ Transitions
      transitionDuration: {
        fast: "150ms",
        default: "220ms",
      },
    },
  },
  plugins: [],
};
