import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <ShieldAlert className="w-16 h-16 text-danger mb-4" />
      <h1 className="text-2xl font-bold mb-2">Accès refusé</h1>
      <p className="text-text-muted mb-6 text-center max-w-md">
        Vous n'avez pas les permissions nécessaires pour accéder à cette page.
      </p>
      <Link
        to="/"
        className="px-4 py-2 bg-primary rounded hover:bg-primary/90 transition-colors"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
