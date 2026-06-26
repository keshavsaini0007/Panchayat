import { Navigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import useAuthStore from "@/store/authStore";

function ProtectedRoute({ children, roles }) {
  const { user } = useAuthStore();

  if (!user) {
    toast({ title: "Login required", description: "Please login to access this page", variant: "destructive" });
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    toast({ title: "Access denied", variant: "destructive" });
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
