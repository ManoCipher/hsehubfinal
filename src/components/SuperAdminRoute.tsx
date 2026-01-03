import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SuperAdminRouteProps {
  children: ReactNode;
}

export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    // If not super_admin, redirect to dashboard
    if (userRole !== "super_admin") {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Check if PIN is verified in session storage
    const pinVerified = sessionStorage.getItem("superAdminPinVerified");
    
    if (pinVerified === "true") {
      setIsPinVerified(true);
      setChecking(false);
    } else {
      // Redirect to PIN verification
      navigate("/super-admin/verify", { 
        replace: true,
        state: { from: location.pathname }
      });
    }
  }, [userRole, loading, navigate, location.pathname]);

  // Show loading while checking
  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render children if PIN is verified
  if (!isPinVerified) {
    return null;
  }

  return <>{children}</>;
}
