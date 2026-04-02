import useThemeStore from "@/store/themeStore";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      aria-label={
        theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"
      }
      className="
        inline-flex items-center justify-center
        w-9 h-9 rounded-[var(--radius-sm)]
        border border-[var(--color-border)]
        bg-[var(--color-elevated)]
        text-[var(--color-text-secondary)]
        hover:bg-[var(--color-hover)]
        hover:text-[var(--color-text)]
        hover:border-[var(--color-border-strong)]
        transition-all duration-[150ms]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[var(--color-primary)]
        focus-visible:ring-offset-2
        focus-visible:ring-offset-[var(--color-bg)]
      ">
      {theme === "dark" ? (
        <Sun size={16} strokeWidth={1.8} />
      ) : (
        <Moon size={16} strokeWidth={1.8} />
      )}
    </button>
  );
}
