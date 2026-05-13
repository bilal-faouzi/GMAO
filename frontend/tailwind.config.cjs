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

        warning: {
          DEFAULT: "var(--color-warning)",
          soft: "var(--color-warning-soft)",
        },

        status: {
          green: {
            DEFAULT: "var(--status-green-text)",
            bg: "var(--status-green-bg)",
            dot: "var(--status-green-dot)",
          },
          orange: {
            DEFAULT: "var(--status-orange-text)",
            bg: "var(--status-orange-bg)",
            dot: "var(--status-orange-dot)",
          },
          red: {
            DEFAULT: "var(--status-red-text)",
            bg: "var(--status-red-bg)",
            dot: "var(--status-red-dot)",
          },
          blue: {
            DEFAULT: "var(--status-blue-text)",
            bg: "var(--status-blue-bg)",
            dot: "var(--status-blue-dot)",
          },
          gray: {
            DEFAULT: "var(--status-gray-text)",
            bg: "var(--status-gray-bg)",
            dot: "var(--status-gray-dot)",
          },
          stone: {
            DEFAULT: "var(--status-stone-text)",
            bg: "var(--status-stone-bg)",
            dot: "var(--status-stone-dot)",
          },
          purple: {
            DEFAULT: "var(--status-purple-text)",
            bg: "var(--status-purple-bg)",
            dot: "var(--status-purple-dot)",
          },
          cyan: {
            DEFAULT: "var(--status-cyan-text)",
            bg: "var(--status-cyan-bg)",
            dot: "var(--status-cyan-dot)",
          },
          yellow: {
            DEFAULT: "var(--status-yellow-text)",
            bg: "var(--status-yellow-bg)",
            dot: "var(--status-yellow-dot)",
          },
        },

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

      // ✅ Custom font sizes
      fontSize: {
        xxs: ["0.565rem", { lineHeight: "0.875rem" }],
      },

      // ✅ Transitions
      transitionDuration: {
        fast: "150ms",
        default: "220ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
