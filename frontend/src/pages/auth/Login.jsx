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
    <div className="min-h-screen bg-gray-300  flex items-center justify-center p-4">
      <div className="w-full bg-slate-50 shadow-lg p-6 rounded-lg max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">GMAO</h1>
          <p className="text-slate-500 mt-1">
            Gestion de Maintenance Assistée par Ordinateur
          </p>
        </div>

        {/* Card */}
        <Card className="shadow-lg border ">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-800">Connexion</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Nom d'utilisateur
                </label>
                <Input
                  placeholder="Entrez votre nom d'utilisateur"
                  className="text-black"
                  value={form.nom_utilisateur}
                  onChange={(e) =>
                    setForm({ ...form, nom_utilisateur: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Mot de passe
                </label>
                <Input
                  type="password"
                  placeholder="Entrez votre mot de passe"
                  className="text-black"
                  value={form.mot_de_passe}
                  onChange={(e) =>
                    setForm({ ...form, mot_de_passe: e.target.value })
                  }
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 text-sm mt-6">
          GMAO © 2026 — B. FAOUZI
        </p>
      </div>
    </div>
  );
}
