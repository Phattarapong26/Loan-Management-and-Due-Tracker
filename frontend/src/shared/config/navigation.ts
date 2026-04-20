import type { MenuItem, MenuGroup, UserRole } from '@/shared/types/user';
import { disbursementsApi } from '@/shared/lib/api-endpoints';

// Function to get approved disbursements count
export const getApprovedDisbursementsCount = async (): Promise<number> => {
  try {
    const response = await disbursementsApi.list({ 
      status: 'APPROVED',
      page: 1,
      limit: 1 // We only need the count
    });
    return response.data?.total || 0;
  } catch (error) {
    console.error('Failed to fetch approved disbursements count:', error);
    return 0;
  }
};

// Role-based menu configuration
// Priority: Most used features first per role
// Dashboard URLs per role
export const dashboardUrlByRole: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  branch_manager: '/dashboard/branch-manager',
  loan_officer: '/dashboard/loan-officer',
};

export const navigationGroups: MenuGroup[] = [
  {
    id: 'operational',
    title: 'Menu For You',
    collapsible: false,
    defaultOpen: true,
    roles: ['admin', 'branch_manager', 'loan_officer'],
    items: [
      {
        title: 'แดชบอร์ด',
        url: '/dashboard',
        icon: 'LayoutDashboard',
        roles: ['admin', 'branch_manager', 'loan_officer'],
      },

      {
        title: 'สัญญาทั้งหมด',
        url: '/payments',
        icon: 'CreditCard',
        roles: ['admin', 'branch_manager', 'loan_officer'],
      },
      {
        title: 'คำขอสินเชื่อ',
        url: '/loans',
        icon: 'FileText',

        roles: ['admin', 'branch_manager', 'loan_officer'],
      },
      {
        title: 'เบิกจ่ายเงินกู้',
        url: '/expenses',
        icon: 'Wallet',
        roles: ['admin', 'branch_manager', 'loan_officer'],
      },
      {
        title: 'รายการรอเบิกจ่าย',
        url: '/transactions',
        icon: 'Receipt',
        roles: ['admin', 'branch_manager', 'loan_officer'],
      },

      {
        title: 'ติดตามหนี้',
        url: '/collections',
        icon: 'AlertTriangle',
        roles: ['admin', 'branch_manager', 'loan_officer'],
      },

    ],
  },
  {
    id: 'management',
    title: 'Management',
    collapsible: true,
    defaultOpen: true,
    roles: ['admin', 'branch_manager', 'loan_officer'],
    items: [
      {
        title: 'ลูกค้า',
        url: '/customers',
        icon: 'Users',
        roles: ['admin', 'branch_manager', 'loan_officer'],
      }
      ,
      {
        title: 'อัพโหลดเอกสาร',
        url: '/documents',
        icon: 'Upload',
        roles: ['admin', 'branch_manager', 'loan_officer'],
      },
      {
        title: 'ปฏิทิน',
        url: '/calendar',
        icon: 'Calendar',
        roles: ['admin', 'branch_manager', 'loan_officer'],
      },

      {
        title: 'ผลิตภัณฑ์สินเชื่อ',
        url: '/loan-products',
        icon: 'Package',
        roles: ['admin'],
      },
      {
        title: 'จัดการสาขา',
        url: '/branches',
        icon: 'Building2',
        roles: ['admin'],
      },
      {
        title: 'จัดการพนักงาน',
        url: '/staff',
        icon: 'Users',
        roles: ['branch_manager',],
      },
      {
        title: 'รายงาน',
        url: '/reports',
        icon: 'BarChart3',
        roles: ['admin', 'branch_manager'],
      },
    ],
  },
  {
    id: 'system',
    title: 'setting',
    collapsible: true,
    defaultOpen: false,
    roles: ['admin', 'branch_manager', 'loan_officer'],
    items: [

      {
        title: 'การแจ้งเตือน',
        url: '/notifications',
        icon: 'Bell',
        roles: ['admin', 'branch_manager', 'loan_officer'],
      },
      {
        title: 'เชื่อมต่อ LINE',
        url: '/line-registration',
        icon: 'MessageCircle', // This usually maps to MessageCircle in AppSidebar iconMap
        roles: ['admin', 'branch_manager', 'loan_officer'],
      },
      {
        title: 'จัดการผู้ใช้',
        url: '/users',
        icon: 'UserCog',
        roles: ['admin'],
      },
      {
        title: 'การตั้งค่าระบบ',
        url: '/settings',
        icon: 'Settings',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'security',
    title: 'Security & Monitoring',
    collapsible: true,
    defaultOpen: true,
    roles: ['admin'],
    items: [
      {
        title: 'Security Dashboard',
        url: '/monitoring/security',
        icon: 'ShieldCheck',
        roles: ['admin'],
      },
      {
        title: 'Audit Logs',
        url: '/monitoring/audit-logs',
        icon: 'History',
        roles: ['admin'],
      },
      {
        title: 'Document Backfill',
        url: '/monitoring/document-backfill',
        icon: 'FileText',
        roles: ['admin'],
      },
    ],
  },
];

export const getNavigationForRole = (role: UserRole): MenuGroup[] => {
  return navigationGroups
    .filter(group => group.roles.includes(role))
    .map(group => ({
      ...group,
      items: group.items
        .filter(item => item.roles.includes(role))
        .map(item => {
          if (item.url === '/dashboard') {
            return { ...item, url: dashboardUrlByRole[role] };
          }
          return item;
        }),
    }))
    .filter(group => group.items.length > 0);
};

export const roleLabels: Record<UserRole, string> = {
  admin: 'ผู้ดูแลระบบ',
  branch_manager: 'ผู้จัดการสาขา',
  loan_officer: 'เจ้าหน้าที่สินเชื่อ',
};
