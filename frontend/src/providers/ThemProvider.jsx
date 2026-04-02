// ============================================================
// ThemeProvider.tsx
// Wrappe l'app et applique la classe .dark sur <html>
// selon le store Zustand.
// ============================================================
import { useEffect } from "react";
import useThemeStore from "@/store/themeStore";

export default function ThemeProvider({ children }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return <>{children}</>;
}

// ============================================================
// ThemeToggle.tsx  (à copier dans src/components/ui/ThemeToggle.tsx)
// Bouton switch dark / light — branchez-le dans votre navbar
// ou sidebar avec : <ThemeToggle />
// ============================================================

/*
 */

// ============================================================
// themeStore.ts  (à copier dans src/store/themeStore.ts)
// Store Zustand persisté dans localStorage
// ============================================================

/*

*/
