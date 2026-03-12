import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";

const UserHome = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="admin-card max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Bienvenue, {user?.username}
        </h1>
        <p className="text-muted-foreground mb-6">
          Vous êtes connecté avec succès.
        </p>
        <Button variant="outline" onClick={logout} className="gap-2">
          <LogOut className="w-4 h-4" /> Déconnexion
        </Button>
      </div>
    </div>
  );
};
