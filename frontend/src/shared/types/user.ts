export type UserRole = 'ADMIN' | 'MANAGER' | 'OFFICER' | 'USER' | 'CUSTOMER' | 'admin' | 'branch_manager' | 'loan_officer' | 'customer';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'active' | 'inactive';

export interface User {
  id: string;
  name?: string; // Kept for backward compatibility
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
  role: UserRole;
  branchId?: string;
  branchName?: string;
  branch?: {
    id: string;
    name: string;
  };
  isActive?: boolean;
  status?: UserStatus;
  phoneNumber?: string;
  phone?: string;
  lastLoginAt?: string;
  createdAt: string;
  monthlyTarget?: number;
}

export interface MenuItem {
  title: string;
  url: string;
  icon: string;
  roles: UserRole[];
  badge?: number;
}

export interface MenuGroup {
  id: string;
  title: string;
  items: MenuItem[];
  roles: UserRole[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
}
