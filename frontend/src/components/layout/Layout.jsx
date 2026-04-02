import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import useAuthStore from "@/store/authStore";
import api from "@/services/api";

export default function Layout() {
  const { isAuthenticated, setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }
    // Récupère les infos utilisateur au chargement
    api
      .get("/auth/me/")
      .then((res) => setUser(res.data))
      .catch(() => {
        navigate("/login");
      });
  }, []);

  return (
    <div className="flex min-h-screen bg-bg transition-colors duration-200">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
