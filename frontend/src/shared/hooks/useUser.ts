import { useState } from 'react';
import type { User, UserRole } from '@/shared/types/user';

// Mock user data - In production, this would come from auth context
const mockUsers: Partial<Record<UserRole, User>> = {
  admin: {
    id: '1',
    name: 'Taylor Franklin',
    email: 'taylor@unity.com',
    avatar: undefined,
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  branch_manager: {
    id: '2',
    name: 'สมศักดิ์ มีชัย',
    email: 'somsak@unity.com',
    avatar: undefined,
    role: 'branch_manager',
    branchId: 'BR001',
    branchName: 'สาขากรุงเทพ',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  loan_officer: {
    id: '3',
    name: 'Floyd Howard',
    email: 'floyd@unity.com',
    avatar: undefined,
    role: 'loan_officer',
    branchId: 'BR001',
    branchName: 'สาขากรุงเทพ',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
};

export function useUser() {
  // Default to admin for demo purposes
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const user = mockUsers[currentRole];

  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
  };

  return {
    user,
    currentRole,
    switchRole,
    isAdmin: currentRole === 'admin',
    isBranchManager: currentRole === 'branch_manager',
    isLoanOfficer: currentRole === 'loan_officer',
  };
}
