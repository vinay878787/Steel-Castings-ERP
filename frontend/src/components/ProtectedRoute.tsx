import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { User } from '../types';

interface Props {
  children: React.ReactNode;
  roles?: User['role'][];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/home" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
