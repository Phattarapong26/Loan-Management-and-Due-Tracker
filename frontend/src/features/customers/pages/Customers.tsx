import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { PaginationControls } from '@/shared/components/ui/pagination-controls';
import { TableSkeleton } from '@/shared/components/skeletons';
import { EmptyCustomers, EmptySearchResults } from '@/shared/components/ui/empty-state';
import { ErrorDisplay } from '@/shared/components/ui/error-display';
import { usePagination } from '@/shared/hooks/usePagination';
import { useAuth } from '@/shared/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Plus,
  Loader2,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileText,
  Phone,
  Mail,
  Building2,
  Users,
  UserPlus,
  Download,
} from 'lucide-react';
import { UserAvatar } from '@/shared/components/ui/user-avatar';
import { toast } from 'sonner';
import { customersApi, branchesApi, usersApi } from '@/shared/lib/api-endpoints';
import { useAlertDialog } from '@/shared/hooks/useAlertDialog';
import { CustomerStatsCards } from '../components/CustomerStatsCards';
import { downloadCsv, toCsv } from '@/shared/utils/csv';

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Loan {
  status: string;
  principal: number;
}

interface BackendCustomer {
  id: string;
  businessName: string;
  thaiId?: string;
  taxId: string;
  phone: string;
  email?: string;
  businessType?: string;
  status?: string;
  loans?: Loan[];
  createdAt: string;
  avatar?: string;
}

interface CustomerFormData {
  businessName: string;
  taxId: string;
  phone: string;
  address: string;
  branchId: string;
  officerId?: string;
  thaiId?: string;
  email?: string;
  businessType?: string;
}

interface ApiErrorDetail {
  path: string[];
  message: string;
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: ApiErrorDetail[];
  nextSteps?: string[];
  error?: {
    message?: string;
    details?: ApiErrorDetail[];
  };
}

interface Customer {
  id: string;
  businessName: string;
  thaiId?: string;
  taxId: string;
  phone: string;
  email?: string;
  businessType?: string;
  status: 'active' | 'inactive' | 'pending';
  loansCount?: number;
  totalCredit?: number;
  createdAt: string;
  avatar?: string;
}

const statusConfig = {
  active: { label: 'ใช้งาน', variant: 'default' as const, className: 'bg-success text-success-foreground' },
  inactive: { label: 'ไม่ใช้งาน', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' },
  pending: { label: 'รอดำเนินการ', variant: 'outline' as const, className: 'bg-warning text-warning-foreground' },
};

export default function Customers() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const alertDialog = useAlertDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectKey, setSelectKey] = useState(0);

  // Increment selectKey when modal opens to force Select remount
  const handleDialogOpenChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (open) {
      // Force Select to remount with fresh data
      setSelectKey(prev => prev + 1);
      
      // Ensure branchId is set when opening dialog
      if (!editingCustomerId && user?.branchId) {
        setFormData(prev => ({
          ...prev,
          branchId: user.branchId,
        }));
      }
    } else {
      // Reset when closing
      setEditingCustomerId(null);
      setFormData({
        businessName: '',
        thaiId: '',
        taxId: '',
        phone: '',
        email: '',
        businessType: '',
        address: '',
        branchId: user?.branchId || '',
      });
    }
  };

  const { page, pageSize, setPage, setPageSize, getPaginationParams } = usePagination();
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    thaiId: '',
    taxId: '',
    phone: '',
    email: '',
    businessType: '',
    address: '',
    branchId: user?.branchId || '',
    officerId: '',
  });

  // Fetch branches (for all roles) - Load immediately on mount
  const { data: branchesData, isLoading: isLoadingBranches, error: branchesError } = useQuery<Branch[]>({
    queryKey: ['branches-all'],
    queryFn: async () => {
      const result = await branchesApi.getAll();
      if (result.error) {
        throw result.error;
      }
      return (result.data || []) as Branch[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Fetch officers for selected branch (ADMIN/MANAGER only)
  const selectedBranchId = (currentRole === 'admin' || currentRole === 'branch_manager')
    ? formData.branchId
    : null;

  const { data: branchOfficersData, isLoading: isLoadingOfficers } = useQuery({
    queryKey: ['branch-officers', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const result = await usersApi.list({ branchId: selectedBranchId, role: 'OFFICER', status: 'ACTIVE', limit: 100 });
      return result.data?.users || [];
    },
    enabled: !!(selectedBranchId && (currentRole === 'admin' || currentRole === 'branch_manager')),
    staleTime: 2 * 60 * 1000,
  });

  // Update branchId when user data is available
  useEffect(() => {
    if (user?.branchId) {
      setFormData(prev => {
        // Only update if branchId is empty or different
        if (!prev.branchId || prev.branchId !== user.branchId) {
          return {
            ...prev,
            branchId: user.branchId,
          };
        }
        return prev;
      });
    }
  }, [user?.branchId]);

  // Fetch customers
  const { data: customersData, isLoading, error } = useQuery({
    queryKey: ['customers', { search: searchTerm, status: statusFilter, branch: branchFilter, page, pageSize }],
    queryFn: async () => {
      const result = await customersApi.list({
        ...getPaginationParams(),
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter.toUpperCase() : undefined,
        branchId: isAdmin && branchFilter !== 'all' ? branchFilter : undefined,
      });
      
      // Handle case where no customers exist (should return empty data, not error)
      if (result.error) {
        // If it's a 400 error and likely means no customers exist, return empty data
        if (result.error.status === 400) {
          return {
            customers: [],
            total: 0,
            page: 1,
            limit: pageSize,
            totalPages: 1
          };
        }
        throw result.error;
      }
      return result.data;
    },
    // Don't show error state for empty data
    retry: (failureCount, error: any) => {
      // Don't retry if it's a 400 error (likely empty data)
      if (error?.status === 400) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Create customer mutation
  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const result = await customersApi.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      alertDialog.success({
        title: 'เพิ่มลูกค้าสำเร็จ!',
        description: 'ระบบได้บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
      setIsAddDialogOpen(false);
      setEditingCustomerId(null);
      setFormData({
        businessName: '',
        thaiId: '',
        taxId: '',
        phone: '',
        email: '',
        businessType: '',
        address: '',
        branchId: user?.branchId || '',
        officerId: '',
      });
    },
    onError: (error: ApiError) => {
      const steps = Array.isArray(error.nextSteps) ? error.nextSteps : [];
      const isAdminMissingBranch = currentRole === 'admin' && error.code === 'BRANCH_ID_REQUIRED';
      const description = [
        isAdminMissingBranch ? 'กรุณาเลือกสาขาก่อนเพิ่มลูกค้า' : (error.message || 'เกิดข้อผิดพลาดในการเพิ่มลูกค้า'),
        ...steps.map((s) => `• ${s}`),
      ].join('\n');

      alertDialog.error({
        title: 'ไม่สามารถเพิ่มลูกค้าได้',
        description,
        confirmText: 'ตกลง',
      });
    },
  });

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormData }) => {
      const result = await customersApi.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      alertDialog.success({
        title: 'แก้ไขข้อมูลสำเร็จ!',
        description: 'ระบบได้บันทึกการแก้ไขข้อมูลลูกค้าเรียบร้อยแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
      setIsAddDialogOpen(false);
      setEditingCustomerId(null);
      setFormData({
        businessName: '',
        thaiId: '',
        taxId: '',
        phone: '',
        email: '',
        businessType: '',
        address: '',
        branchId: user?.branchId || '',
        officerId: '',
      });
    },
    onError: (error: ApiError) => {
      alertDialog.error({
        title: 'ไม่สามารถแก้ไขข้อมูลได้',
        description: error.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลลูกค้า',
        confirmText: 'ตกลง',
      });
    },
  });

  // Map backend customers to frontend format
  const customers: Customer[] = customersData?.customers?.map((c: BackendCustomer) => {
    // Only count ACTIVE and DISBURSED loans (exclude PENDING_APPROVAL, REJECTED, CLOSED, DEFAULTED, NPL)
    const activeLoans = c.loans?.filter((loan: Loan) =>
      loan.status === 'ACTIVE' || loan.status === 'DISBURSED'
    ) || [];

    return {
      id: c.id,
      businessName: c.businessName,
      thaiId: c.thaiId,
      taxId: c.taxId,
      phone: c.phone,
      email: c.email,
      businessType: c.businessType,
      status: (c.status?.toLowerCase() || 'active') as Customer['status'],
      loansCount: activeLoans.length,
      totalCredit: activeLoans.reduce((sum: number, loan: Loan) => sum + Number(loan.principal || 0), 0),
      createdAt: c.createdAt,
      avatar: c.avatar,
    };
  }) || [];

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Skip if customer is undefined or null
      if (!customer) return false;
      
      const matchesSearch = customer.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.taxId?.includes(searchTerm) ||
        customer.phone?.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  const handleAddCustomer = async () => {
    // Validate required fields
    if (!formData.businessName.trim()) {
      alertDialog.error({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกชื่อบริษัท/ร้านค้า',
        confirmText: 'ตกลง',
      });
      return;
    }

    // Admin must select branch
    if (!formData.branchId) {
      alertDialog.error({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณาเลือกสาขา',
        confirmText: 'ตกลง',
      });
      return;
    }

    // Validate Tax ID
    if (!formData.taxId || formData.taxId.length !== 13) {
      alertDialog.error({
        title: 'เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง',
        description: 'เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก',
        confirmText: 'ตกลง',
      });
      return;
    }

    // Validate Phone - must be 10 digits and start with 0
    if (!formData.phone || formData.phone.length !== 10) {
      alertDialog.error({
        title: 'เบอร์โทรศัพท์ไม่ถูกต้อง',
        description: 'เบอร์โทรศัพท์ต้องมี 10 หลัก',
        confirmText: 'ตกลง',
      });
      return;
    }

    if (!formData.phone.startsWith('0')) {
      alertDialog.error({
        title: 'เบอร์โทรศัพท์ไม่ถูกต้อง',
        description: 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0',
        confirmText: 'ตกลง',
      });
      return;
    }

    // Validate Address
    if (!formData.address || !formData.address.trim()) {
      alertDialog.error({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกที่อยู่ (จำเป็นสำหรับการออกเอกสาร)',
        confirmText: 'ตกลง',
      });
      return;
    }

    // Validate Thai ID if provided (optional but must be valid if entered)
    if (formData.thaiId && formData.thaiId.trim()) {
      if (formData.thaiId.length !== 13) {
        alertDialog.error({
          title: 'เลขบัตรประชาชนไม่ถูกต้อง',
          description: 'เลขบัตรประชาชนต้องมี 13 หลัก',
          confirmText: 'ตกลง',
        });
        return;
      }
      // Note: Backend will validate checksum
    }

    // Validate Email format if provided
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        alertDialog.error({
          title: 'อีเมลไม่ถูกต้อง',
          description: 'รูปแบบอีเมลไม่ถูกต้อง',
          confirmText: 'ตกลง',
        });
        return;
      }
    }

    try {
      const payload: CustomerFormData = {
        businessName: formData.businessName.trim(),
        taxId: formData.taxId,
        phone: formData.phone,
        address: formData.address.trim(),
        branchId: formData.branchId,
      };

      if (formData.thaiId && formData.thaiId.trim() && formData.thaiId.length === 13) {
        payload.thaiId = formData.thaiId.trim();
      }
      if (formData.email && formData.email.trim()) {
        payload.email = formData.email.trim();
      }
      if (formData.businessType && formData.businessType.trim()) {
        payload.businessType = formData.businessType.trim();
      }
      // Include officerId for ADMIN/MANAGER when selected
      if ((currentRole === 'admin' || currentRole === 'branch_manager') && formData.officerId) {
        payload.officerId = formData.officerId;
      }

      // Check if editing or creating
      if (editingCustomerId) {
        await updateMutation.mutateAsync({ id: editingCustomerId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      // console.error('Customer operation error:', apiError);
      // console.error('Error details:', JSON.stringify(apiError, null, 2));

      // Show detailed validation errors from backend
      let errorMessage = 'เกิดข้อผิดพลาดในการเพิ่มลูกค้า';
      
      if (apiError.details && Array.isArray(apiError.details)) {
        const messages = apiError.details.map((detail: ApiErrorDetail) => {
          const fieldName = detail.path?.join('.') || 'Unknown field';
          return `${fieldName}: ${detail.message}`;
        });
        errorMessage = messages.join('\n');
      } else if (apiError.error?.details && Array.isArray(apiError.error.details)) {
        const messages = apiError.error.details.map((detail: ApiErrorDetail) => {
          const fieldName = detail.path?.join('.') || 'Unknown field';
          return `${fieldName}: ${detail.message}`;
        });
        errorMessage = messages.join('\n');
      } else if (apiError.error?.message) {
        errorMessage = apiError.error.message;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }

      alertDialog.error({
        title: 'ไม่สามารถเพิ่มลูกค้าได้',
        description: errorMessage,
        confirmText: 'ตกลง',
      });
    }
  };

  // Memoize currency formatter
  const currencyFormatter = useMemo(() => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    });
  }, []);

  const compactNumberFormatter = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      notation: "compact",
      maximumFractionDigits: 1
    });
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return currencyFormatter.format(amount);
  }, [currencyFormatter]);

  const formatCompactNumber = useCallback((number: number) => {
    return compactNumberFormatter.format(number);
  }, [compactNumberFormatter]);

  // Get current user's branch name
  const getCurrentBranchName = useCallback(() => {
    if (currentRole === 'admin') {
      if (!formData.branchId) return 'กรุณาเลือกสาขา';
      const branch = branchesData?.find((b) => b.id === formData.branchId);
      return branch?.name || 'ไม่พบสาขา';
    }
    return user?.branchName;
  }, [currentRole, formData.branchId, branchesData, user?.branchName]);

  const getCurrentOfficerName = useCallback(() => {
    const firstName = user?.firstName || '';
    const lastName = user?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user?.email || 'ไม่ระบุ';
  }, [user?.firstName, user?.lastName, user?.email]);

  const handleViewCustomer = useCallback((customerId: string) => {
    navigate(`/customers/${customerId}`);
  }, [navigate]);

  const handleEditCustomer = useCallback((customer: Customer) => {
    setEditingCustomerId(customer.id);
    setFormData({
      businessName: customer.businessName,
      thaiId: customer.thaiId || '',
      taxId: customer.taxId,
      phone: customer.phone,
      email: customer.email || '',
      businessType: customer.businessType || '',
      address: '',
      branchId: user?.branchId || '', // Keep user's branch for edit
    });
    setIsAddDialogOpen(true);
  }, [user?.branchId]);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; customerId: string | null }>({
    isOpen: false,
    customerId: null,
  });

  const handleDeleteCustomer = useCallback((customerId: string) => {
    setDeleteConfirmation({ isOpen: true, customerId });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmation.customerId) return;

    try {
      // Call delete API
      const result = await customersApi.delete(deleteConfirmation.customerId);
      if (result.error) {
        throw new Error(result.error.message);
      }

      // Refresh customer list
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      alertDialog.success({
        title: 'ลบลูกค้าสำเร็จ!',
        description: 'ระบบได้ลบข้อมูลลูกค้าเรียบร้อยแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
    } catch (error: any) {
      alertDialog.error({
        title: 'ไม่สามารถลบลูกค้าได้',
        description: error.message || 'เกิดข้อผิดพลาดในการลบลูกค้า',
        confirmText: 'ตกลง',
      });
    } finally {
      setDeleteConfirmation({ isOpen: false, customerId: null });
    }
  }, [deleteConfirmation.customerId, alertDialog, queryClient]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmation({ isOpen: false, customerId: null });
  }, []);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);

      const limit = 200;
      let pageToFetch = 1;
      const allCustomers: any[] = [];

      const baseParams: any = {
        limit,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter.toUpperCase() : undefined,
        branchId: isAdmin && branchFilter !== 'all' ? branchFilter : undefined,
      };

      for (let guard = 0; guard < 200; guard++) {
        const result = await customersApi.list({ ...baseParams, page: pageToFetch });
        if (result.error) {
          throw new Error(result.error.message || 'ไม่สามารถดึงข้อมูลลูกค้าได้');
        }
        const chunk = result.data?.customers || [];
        allCustomers.push(...chunk);

        const total = result.data?.total ?? allCustomers.length;
        if (allCustomers.length >= total || chunk.length < limit) break;
        pageToFetch += 1;
      }

      if (allCustomers.length === 0) {
        toast.error('ไม่มีข้อมูลสำหรับส่งออก');
        return;
      }

      const headers = [
        'รหัสลูกค้า',
        'ชื่อลูกค้า',
        'เลขผู้เสียภาษี',
        'เลขบัตรประชาชน',
        'โทรศัพท์',
        'อีเมล',
        'ประเภทธุรกิจ',
        'จำนวนสินเชื่อ',
        'สถานะ',
        'เจ้าหน้าที่ผู้ดูแล',
        'วันที่สร้าง',
      ];

      const rows = allCustomers.map((c) => [
        c.customerCode || '',
        c.businessName || '',
        c.taxId || '',
        c.thaiId || '',
        c.phone || '',
        c.email || '',
        c.businessType || '',
        c?._count?.loans ?? c?.loans?.length ?? '',
        c.status || '',
        c.createdByName || '',
        c.createdAt ? new Date(c.createdAt).toLocaleDateString('th-TH') : '',
      ]);

      const csv = toCsv(headers, rows);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadCsv(`customers_${dateStr}.csv`, csv);
      toast.success(`ส่งออก CSV สำเร็จ (${allCustomers.length} รายการ)`);
    } catch (error: any) {
      toast.error(error?.message || 'ไม่สามารถส่งออกข้อมูลได้');
    } finally {
      setIsExporting(false);
    }
  }, [searchTerm, statusFilter, branchFilter, isAdmin]);

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'ลูกค้า' }]}>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">จัดการลูกค้า</h1>
          <p className="text-white">จัดการข้อมูลลูกค้า SME ทั้งหมด</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออก'}
          </Button>
          {/* Only Loan Officer and Admin can add customers */}
          {(currentRole === 'loan_officer' || currentRole === 'admin') && (
            <Dialog open={isAddDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  เพิ่มลูกค้า
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto border rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  {editingCustomerId ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {editingCustomerId 
                    ? 'แก้ไขข้อมูลลูกค้า SME ในระบบ' 
                    : 'กรอกข้อมูลลูกค้า SME เพื่อเพิ่มเข้าระบบ'
                  }<br />
                  <span className="text-xs text-muted-foreground">* = ข้อมูลที่จำเป็นต้องกรอก</span>
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2 sm:py-4">
                {/* Branch and Officer Info */}
                <div className="rounded-lg border bg-muted/50 p-3 sm:p-4 space-y-2">
                  <p className="text-sm font-medium">ข้อมูลการมอบหมาย</p>
                  <div className="grid gap-2">
                    <Label htmlFor="branchId" className="text-sm">สาขา *</Label>
                    <Select
                      key={selectKey}
                      value={formData.branchId || undefined}
                      onValueChange={(value) => setFormData({ ...formData, branchId: value, officerId: '' })}
                      disabled={currentRole !== 'admin' || isLoadingBranches}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกสาขา" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {isLoadingBranches ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : branchesData && branchesData.length > 0 ? (
                          branchesData.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{branch.name}</span>
                                <span className="text-xs text-muted-foreground">{branch.code}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="py-8 text-center text-sm text-muted-foreground">
                            ไม่พบข้อมูลสาขา
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    {currentRole === 'admin' ? (
                      <p className="text-xs text-muted-foreground">
                        เลือกสาขาที่ต้องการสร้างลูกค้า
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        ลูกค้าจะถูกสร้างในสาขา: <span className="font-medium">{getCurrentBranchName()}</span>
                        {currentRole === 'loan_officer' && ' และมอบหมายให้คุณโดยอัตโนมัติ'}
                      </p>
                    )}
                  </div>
                  {currentRole !== 'admin' && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">เจ้าหน้าที่:</span>
                      <span className="font-medium">{getCurrentOfficerName()}</span>
                    </div>
                  )}

                  {/* Officer selector for ADMIN and MANAGER */}
                  {(currentRole === 'admin' || currentRole === 'branch_manager') && formData.branchId && (
                    <div className="grid gap-2 pt-2 border-t">
                      <Label className="text-sm">เจ้าหน้าที่รับผิดชอบ *</Label>
                      <Select
                        value={formData.officerId || undefined}
                        onValueChange={(value) => setFormData({ ...formData, officerId: value })}
                        disabled={isLoadingOfficers}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={isLoadingOfficers ? 'กำลังโหลด...' : 'เลือกเจ้าหน้าที่'} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {isLoadingOfficers ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : branchOfficersData && branchOfficersData.length > 0 ? (
                            branchOfficersData.map((officer: any) => (
                              <SelectItem key={officer.id} value={officer.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{officer.firstName} {officer.lastName}</span>
                                  <span className="text-xs text-muted-foreground">{officer.email}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                              ไม่พบเจ้าหน้าที่ในสาขานี้
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        เจ้าหน้าที่ที่เลือกจะเป็นผู้รับผิดชอบลูกค้ารายนี้
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="businessName" className="text-sm">ชื่อบริษัท/ร้านค้า *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="บริษัท ตัวอย่าง จำกัด"
                    className="text-base"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="thaiId" className="text-sm">เลขบัตรประชาชน (13 หลัก)</Label>
                    <Input
                      id="thaiId"
                      value={formData.thaiId}
                      onChange={(e) => setFormData({ ...formData, thaiId: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                      placeholder="1234567890123 (ไม่บังคับ)"
                      maxLength={13}
                      className="text-base"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taxId" className="text-sm">เลขผู้เสียภาษี (13 หลัก) *</Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                      placeholder="0123456789012"
                      maxLength={13}
                      required
                      className="text-base"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-sm">เบอร์โทรศัพท์ (10 หลัก) *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="0812345678"
                      maxLength={10}
                      className="text-base"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-sm">อีเมล</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@example.com"
                      className="text-base"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address" className="text-sm">ที่อยู่ *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110"
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    ที่อยู่จะใช้ในการออกเอกสารหนังสือแจ้งการเบิกจ่ายเงินกู้
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="businessType" className="text-sm">ประเภทธุรกิจ</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="เลือกประเภทธุรกิจ (ไม่บังคับ)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="เทคโนโลยี">เทคโนโลยี</SelectItem>
                      <SelectItem value="เกษตรกรรม">เกษตรกรรม</SelectItem>
                      <SelectItem value="อาหารและเครื่องดื่ม">อาหารและเครื่องดื่ม</SelectItem>
                      <SelectItem value="บริการ">บริการ</SelectItem>
                      <SelectItem value="ค้าปลีก">ค้าปลีก</SelectItem>
                      <SelectItem value="การผลิต">การผลิต</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleAddCustomer}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    editingCustomerId ? 'บันทึกการแก้ไข' : 'บันทึก'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <CustomerStatsCards
        totalCount={customers.length}
        activeCount={customers.filter(c => c.status === 'active').length}
        pendingCount={customers.filter(c => c.status === 'pending').length}
        totalCredit={customers.reduce((sum, c) => sum + (c.totalCredit || 0), 0)}
        isLoading={isLoading}
      />

      {/* Customers Table */}
      <Card>
        <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 pb-4">
          <div>
            <CardTitle>รายชื่อลูกค้า</CardTitle>
            <CardDescription>แสดง {filteredCustomers.length} จาก {customers.length} รายการ</CardDescription>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:items-center md:gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ, เลขภาษี, เบอร์โทร..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            {isAdmin && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full md:w-[180px] bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="ทุกสาขา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสาขา</SelectItem>
                  {(branchesData || []).map((branch: Branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-primary text-white border-primary hover:bg-primary/90">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="สถานะทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                <SelectItem value="active">ใช้งาน</SelectItem>
                <SelectItem value="pending">รอดำเนินการ</SelectItem>
                <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-White">
                  <TableHead className="font-semibold">ลูกค้า</TableHead>
                  <TableHead className="font-semibold">เลขผู้เสียภาษี</TableHead>
                  <TableHead className="font-semibold">ติดต่อ</TableHead>
                  <TableHead className="font-semibold">ประเภทธุรกิจ</TableHead>
                  <TableHead className="font-semibold">สินเชื่อ</TableHead>
                  <TableHead className="font-semibold">สถานะ</TableHead>
                  <TableHead className="text-right font-semibold">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <TableSkeleton rows={pageSize} columns={7} />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <ErrorDisplay
                        error={error as any}
                        onRetry={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}
                        className="m-4"
                      />
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      {searchTerm || statusFilter !== 'all' ? (
                        <EmptySearchResults
                          searchTerm={searchTerm}
                          onClear={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                        />
                      ) : (
                        <EmptyCustomers
                          onAction={() => setIsAddDialogOpen(true)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={customer.avatar}
                            name={customer.businessName}
                            size="md"
                            className="h-10 w-10"
                          />
                          <div>
                            <p className="font-medium">{customer.businessName}</p>
                            <p className="text-xs text-muted-foreground">{customer.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{customer.taxId}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {customer.phone}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg">
                          {customer.businessType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.loansCount} รายการ</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(customer.totalCredit)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[customer.status].className}>
                          {statusConfig[customer.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleViewCustomer(customer.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              ดูรายละเอียด
                            </DropdownMenuItem>
                            
                            {/* Only Loan Officer and Admin can edit/create loan/delete */}
                            {(currentRole === 'loan_officer' || currentRole === 'admin') && (
                              <>
                                <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  แก้ไข
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <FileText className="h-4 w-4 mr-2" />
                                  สร้างคำขอสินเชื่อ
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteCustomer(customer.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  ลบ
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {customersData && customersData.total > 0 && (
              <PaginationControls
                currentPage={page}
                totalPages={customersData.totalPages || 1}
                pageSize={pageSize}
                totalItems={customersData.total || 0}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Dialog */}
      <alertDialog.AlertDialog />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">ยืนยันการลบลูกค้า</h3>
            <p className="text-gray-600 mb-6">
              คุณแน่ใจหรือไม่ที่จะลบลูกค้านี้? การดำเนินการนี้ไม่สามารถยกเลิกได้
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={cancelDelete}>
                ยกเลิก
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                ลบ
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
