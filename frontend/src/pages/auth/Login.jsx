import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import useAuthStore from "@/store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ nom_utilisateur: "", mot_de_passe: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login/", form);
      login(res.data.utilisateur, res.data.access, res.data.refresh);
      navigate("/dashboard");
    } catch {
      setError("Identifiants incorrects. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full bg-surface shadow-lg p-6 rounded-lg max-w-md border border-border">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <h1 className="text-3xl font-bold text-text">GMAO</h1>
          <p className="text-text-muted mt-1">
            Gestion de Maintenance Assistée par Ordinateur
          </p>
        </div>

        {/* Card */}
        <Card className="shadow-lg border border-border bg-surface">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-text">Connexion</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Nom d'utilisateur
                </label>
                <Input
                  placeholder="Entrez votre nom d'utilisateur"
                  value={form.nom_utilisateur}
                  onChange={(e) =>
                    setForm({ ...form, nom_utilisateur: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Mot de passe
                </label>
                <Input
                  type="password"
                  placeholder="Entrez votre mot de passe"
                  value={form.mot_de_passe}
                  onChange={(e) =>
                    setForm({ ...form, mot_de_passe: e.target.value })
                  }
                  required
                />
              </div>

              {error && (
                <div className="bg-danger-soft text-danger text-sm p-3 rounded-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                variant="custom"
                disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-text-muted text-sm mt-6">
          GMAO © 2026 — B. FAOUZI
        </p>
      </div>
    </div>
  );
}
