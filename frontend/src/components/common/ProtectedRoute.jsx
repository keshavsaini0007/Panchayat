import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import useAuthStore from "@/store/authStore";

function ProtectedRoute({ children, roles }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();
  const toastShownRef = useRef(false);

  useEffect(() => {
    toastShownRef.current = false;
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    if (!toastShownRef.current) {
      toastShownRef.current = true;
      toast({ title: "Login required", description: "Please login to access this page", variant: "destructive" });
    }
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    if (!toastShownRef.current) {
      toastShownRef.current = true;
      toast({ title: "Access denied", description: "You do not have permission to access this page", variant: "destructive" });
    }
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
