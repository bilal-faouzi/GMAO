import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { User, initializeStore, authenticate, isAdmin } from "../data/store";

interface AuthContextType {
  user: User | null;
  isAdminUser: boolean;
  loading: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeStore().then(() => {
      const stored = sessionStorage.getItem("current_user");
      if (stored) {
        const u = JSON.parse(stored) as User;
        setUser(u);
        setIsAdminUser(isAdmin(u));
      }
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await authenticate(username, password);
    if (!u) return { success: false, error: "Identifiants incorrects" };
    setUser(u);
    setIsAdminUser(isAdmin(u));
    sessionStorage.setItem("current_user", JSON.stringify(u));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAdminUser(false);
    sessionStorage.removeItem("current_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdminUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
