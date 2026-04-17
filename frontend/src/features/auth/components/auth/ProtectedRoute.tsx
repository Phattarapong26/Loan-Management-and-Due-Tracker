import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import type { UserRole } from '@/shared/types/user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, currentRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    // Redirect to appropriate dashboard based on role
    const roleRedirects: Record<UserRole, string> = {
      ADMIN: '/dashboard/admin',
      admin: '/dashboard/admin',
      MANAGER: '/dashboard/branch-manager',
      branch_manager: '/dashboard/branch-manager',
      OFFICER: '/dashboard/loan-officer',
      loan_officer: '/dashboard/loan-officer',
      USER: '/dashboard/user',
      CUSTOMER: '/dashboard/customer',
      customer: '/dashboard/customer',
    };
    return <Navigate to={roleRedirects[currentRole] || '/dashboard'} replace />;
  }

  return <>{children}</>;
}
