import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: Props) => {
  const { user, isAdminUser, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Chargement...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdminUser) return <Navigate to="/home" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
