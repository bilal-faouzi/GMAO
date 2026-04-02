import { create } from "zustand";
import { persist } from "zustand/middleware";

const useThemeStore = create()(
  persist(
    (set, get) => ({
      theme: "dark", // thème par défaut
      toggleTheme: () =>
        set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "gmao-theme", // clé localStorage
    },
  ),
);

export default useThemeStore;
