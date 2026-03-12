import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      // Auth context will update, redirect handled by effect
      const stored = sessionStorage.getItem("current_user");
      if (stored) {
        const { role_id } = JSON.parse(stored);
        const roles = JSON.parse(localStorage.getItem("app_roles") || "[]");
        const role = roles.find((r: any) => r.id === role_id);
        if (role?.name === "Admin") {
          navigate("/admin");
        } else {
          navigate("/home");
        }
      }
    } else {
      setError(result.error || "Erreur de connexion");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="admin-card">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              Connexion
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Accédez à votre espace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Entrez votre username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3 text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Login"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Compte par défaut : admin / admin
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
