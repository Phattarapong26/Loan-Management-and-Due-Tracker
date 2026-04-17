import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserRole } from '@/shared/types/user';
import { authApi } from '@/shared/lib/api-endpoints';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => void;
  currentRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'unity_auth_session';
const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Map backend role to frontend role
const mapBackendRoleToFrontend = (backendRole: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    'ADMIN': 'admin',
    'MANAGER': 'branch_manager',
    'OFFICER': 'loan_officer',
    'USER': 'loan_officer',
  };
  return roleMap[backendRole] || 'loan_officer';
};

// Map backend user to frontend user
const mapBackendUserToFrontend = (backendUser: any): User => {
  return {
    id: backendUser.userId || backendUser.id, // JWT payload uses 'userId', full user object uses 'id'
    name: `${backendUser.firstName || ''} ${backendUser.lastName || ''}`.trim() || backendUser.email,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    email: backendUser.email,
    avatar: backendUser.avatar || undefined,
    role: mapBackendRoleToFrontend(backendUser.role),
    branchId: backendUser.branchId || backendUser.branch?.id || undefined, // Support both direct branchId and nested branch.id
    branchName: backendUser.branchName || backendUser.branch?.name || undefined, // Support both direct branchName and nested branch.name
    isActive: backendUser.status === 'ACTIVE',
    createdAt: backendUser.createdAt || new Date().toISOString(),
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from storage and verify with backend
  useEffect(() => {
    const loadSession = async () => {
      const stored = sessionStorage.getItem(SESSION_KEY);
      const token = localStorage.getItem(TOKEN_KEY);

      // If we have a token but no stored user (e.g., new tab from LINE), fetch user from backend
      if (token && !stored) {
        try {
          const { data: currentUser, error } = await authApi.me(true); // Silent mode
          if (!error && currentUser) {
            const frontendUser = mapBackendUserToFrontend(currentUser);
            setUser(frontendUser);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(frontendUser));
          } else {
            // Token invalid, clear everything
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
          }
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
        setIsLoading(false);
        return;
      }

      // If we have both stored user and token, verify token is still valid
      if (stored && token) {
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);

          // Verify token with backend (silent mode)
          const { data: currentUser, error } = await authApi.me(true);
          
          if (error || !currentUser) {
            // Token invalid, clear session
            setUser(null);
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
          } else {
            // Update user from backend
            const frontendUser = mapBackendUserToFrontend(currentUser);
            setUser(frontendUser);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(frontendUser));
          }
        } catch {
          sessionStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      }
      setIsLoading(false);
    };

    loadSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    try {
      const { data, error } = await authApi.login(email, password);

      if (error || !data) {
        return { 
          success: false, 
          error: error?.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่' 
        };
    }

      // Store tokens
      if (data.accessToken) {
        localStorage.setItem(TOKEN_KEY, data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }

      // Map backend user to frontend user
      const frontendUser = mapBackendUserToFrontend(data.user);
      setUser(frontendUser);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(frontendUser));
    
      return { success: true, role: frontendUser.role };
    } catch (err: any) {
      return { 
        success: false, 
        error: err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' 
      };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear local storage
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      
      // Clear cookies
      document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        currentRole: user?.role ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
