import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    toast.error('Access denied');
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
