import { useAuth } from '@/shared/contexts/AuthContext';
import type { UserRole } from '@/shared/types/user';

export interface PermissionCheck {
  canViewAllBranches: boolean;
  canViewBranchData: boolean;
  canViewOwnDataOnly: boolean;
  canManageUsers: boolean;
  canApproveLoans: boolean;
  canAccessReports: boolean;
}

export function usePermissions(): PermissionCheck {
  const { user } = useAuth();

  if (!user) {
    return {
      canViewAllBranches: false,
      canViewBranchData: false,
      canViewOwnDataOnly: false,
      canManageUsers: false,
      canApproveLoans: false,
      canAccessReports: false,
    };
  }

  const isAdmin = user.role === 'admin';
  const isBranchManager = user.role === 'branch_manager';
  const isLoanOfficer = user.role === 'loan_officer';

  return {
    canViewAllBranches: isAdmin,
    canViewBranchData: isAdmin || isBranchManager,
    canViewOwnDataOnly: isLoanOfficer,
    canManageUsers: isAdmin || isBranchManager,
    canApproveLoans: isAdmin || isBranchManager,
    canAccessReports: isAdmin || isBranchManager,
  };
}

export function useRoleCheck() {
  const { user } = useAuth();

  return {
    isAdmin: user?.role === 'admin',
    isBranchManager: user?.role === 'branch_manager',
    isLoanOfficer: user?.role === 'loan_officer',
    hasRole: (role: UserRole) => user?.role === role,
    hasAnyRole: (roles: UserRole[]) => roles.includes(user?.role as UserRole),
  };
}