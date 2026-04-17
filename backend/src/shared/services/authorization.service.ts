import { UserRole } from '@prisma/client';

export interface AuthorizedUser {
  userId: string;
  role: UserRole;
  branchId?: string;
}

export interface DataAccessFilter {
  branchIds?: string[];
  userIds?: string[];
  allowAll?: boolean;
}

export class AuthorizationService {
  /**
   * Get data access filter based on user role and permissions
   */
  static getDataAccessFilter(user: AuthorizedUser): DataAccessFilter {
    switch (user.role) {
      case 'ADMIN':
        // Admin can see all data across all branches
        return { allowAll: true };
        
      case 'MANAGER':
        // Branch manager can see all data in their branch
        if (!user.branchId) {
          throw new Error('Branch manager must have a branch assigned');
        }
        return { branchIds: [user.branchId] };
        
      case 'OFFICER':
        // Officer can only see their own customers and loans
        return { userIds: [user.userId] };
        
      default:
        throw new Error(`Unsupported role: ${user.role}`);
    }
  }

  /**
   * Check if user can access specific branch data
   */
  static canAccessBranch(user: AuthorizedUser, branchId: string): boolean {
    switch (user.role) {
      case 'ADMIN':
        return true;
        
      case 'MANAGER':
        return user.branchId === branchId;
        
      case 'OFFICER':
        return user.branchId === branchId;
        
      default:
        return false;
    }
  }

  /**
   * Check if user can access specific customer data
   */
  static canAccessCustomer(user: AuthorizedUser, customerCreatedBy: string, customerBranchId: string): boolean {
    switch (user.role) {
      case 'ADMIN':
        return true;
        
      case 'MANAGER':
        return user.branchId === customerBranchId;
        
      case 'OFFICER':
        return user.userId === customerCreatedBy;
        
      default:
        return false;
    }
  }

  /**
   * Check if user can access specific loan data
   */
  static canAccessLoan(user: AuthorizedUser, loanCreatedBy: string, loanBranchId: string): boolean {
    switch (user.role) {
      case 'ADMIN':
        return true;
        
      case 'MANAGER':
        return user.branchId === loanBranchId;
        
      case 'OFFICER':
        return user.userId === loanCreatedBy;
        
      default:
        return false;
    }
  }

  /**
   * Get branch filter for queries
   */
  static getBranchFilter(user: AuthorizedUser): any {
    const filter = this.getDataAccessFilter(user);
    
    if (filter.allowAll) {
      return {}; // No filter - access all branches
    }
    
    if (filter.branchIds) {
      return { branchId: { in: filter.branchIds } };
    }
    
    if (filter.userIds) {
      return { createdBy: { in: filter.userIds } };
    }
    
    return { id: 'never-match' }; // No access
  }

  /**
   * Get user filter for queries (for officer-level access)
   */
  static getUserFilter(user: AuthorizedUser): any {
    const filter = this.getDataAccessFilter(user);
    
    if (filter.allowAll) {
      return {}; // No filter - access all data
    }
    
    if (filter.branchIds) {
      return { branchId: { in: filter.branchIds } };
    }
    
    if (filter.userIds) {
      return { createdBy: { in: filter.userIds } };
    }
    
    return { id: 'never-match' }; // No access
  }
}