import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { PaginationControls } from '@/shared/components/ui/pagination-controls';
import { TableSkeleton } from '@/shared/components/skeletons';
import { usePagination } from '@/shared/hooks/usePagination';
import { useAuth } from '@/shared/contexts/AuthContext';
import { LineAuditDialog } from '../components/LineAuditDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
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
  Search,
  Plus,
  UserCog,
  Users,
  MoreHorizontal,
  Edit,
  Key,
  UserX,
  UserCheck,
  Shield,
  Building2,
  Loader,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { usersApi, branchesApi, User as GlobalUser, UserRole as GlobalUserRole } from '@/shared/lib/api-endpoints';
import { useAlertDialog } from '@/shared/hooks/useAlertDialog';
import { UserStatsCards } from '../components/UserStatsCards';

type UserRole = 'admin' | 'branch_manager' | 'loan_officer' | 'customer';
type UserStatus = 'active' | 'inactive';

interface FrontendUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  branchId: string;
  branchName: string;
  phone: string;
  status: UserStatus;
  lastLogin: string | null;
  createdAt: string;
}

// Map backend role to frontend role
const mapUserRole = (role: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    'ADMIN': 'admin',
    'MANAGER': 'branch_manager',
    'OFFICER': 'loan_officer',
    'USER': 'customer',
  };
  return roleMap[role] || 'customer';
};

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  admin: { label: 'ผู้ดูแลระบบ', color: 'bg-primary text-primary-foreground' },
  branch_manager: { label: 'ผู้จัดการสาขา', color: 'bg-info/10 text-info' },
  loan_officer: { label: 'เจ้าหน้าที่สินเชื่อ', color: 'bg-success/10 text-success' },
  customer: { label: 'ลูกค้า', color: 'bg-secondary text-secondary-foreground' },
};

// Map frontend role to backend role for API calls
const mapFrontendToBackendRole = (role: string): string | undefined => {
  const roleMap: Record<string, string> = {
    'admin': 'ADMIN',
    'branch_manager': 'MANAGER',
    'loan_officer': 'OFFICER',
    'customer': 'USER',
  };
  return roleMap[role];
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const alertDialog = useAlertDialog();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { page, pageSize, setPage, setPageSize, getPaginationParams } = usePagination();

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: '' as UserRole | '',
    branchId: '',
    phone: '',
  });
  const [selectedUser, setSelectedUser] = useState<FrontendUser | null>(null);
  const [resetParams, setResetParams] = useState<{ id: string; name: string } | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [sendResetLink, setSendResetLink] = useState(false);
  const [lineAuditDialogOpen, setLineAuditDialogOpen] = useState(false);
  const [selectedUserForLineAudit, setSelectedUserForLineAudit] = useState<FrontendUser | null>(null);

  // Fetch users
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['users', { search: searchTerm, role: roleFilter, status: statusFilter, branch: branchFilter, page, pageSize }],
    queryFn: async () => {
      const result = await usersApi.list({
        ...getPaginationParams(),
        role: mapFrontendToBackendRole(roleFilter),
        status: statusFilter !== 'all' ? statusFilter.toUpperCase() : undefined,
        search: searchTerm || undefined,
        branchId: isAdmin && branchFilter !== 'all' ? branchFilter : undefined,
      });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
  });

  // Fetch branches for dropdown
  const { data: branchesData } = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: async () => {
      const result = await branchesApi.getAll();
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
  });

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setSelectedUser(null);
    setFormData({ email: '', fullName: '', role: '' as UserRole | '', branchId: '', phone: '' });
  };

  const createUserMutation = useMutation({
    mutationFn: async (data: { email: string; role: string; firstName: string; lastName: string; branchId?: string; phoneNumber?: string }) => {
      const backendRole = mapFrontendToBackendRole(data.role);

      const result = await usersApi.create({
        ...data,
        role: backendRole,
      });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alertDialog.success({
        title: 'เพิ่มผู้ใช้สำเร็จ!',
        description: 'รหัสผ่านชั่วคราวจะถูกส่งไปยังอีเมล',
        confirmText: 'เสร็จสิ้น',
      });
      handleCloseDialog();
    },
    onError: (error: unknown) => {
      alertDialog.error({
        title: 'ไม่สามารถเพิ่มผู้ใช้ได้',
        description: (error as Error).message || 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้',
        confirmText: 'ตกลง',
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { email?: string; role: string; firstName?: string; lastName?: string; branchId?: string; phoneNumber?: string }) => {
      const backendRole = mapFrontendToBackendRole(data.role);
      const updatePayload = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        role: backendRole,
        branchId: data.branchId,
      };

      const result = await usersApi.update(selectedUser!.id, updatePayload);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alertDialog.success({
        title: 'แก้ไขข้อมูลสำเร็จ!',
        description: 'ระบบได้บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
      handleCloseDialog();
    },
    onError: (error: unknown) => {
      alertDialog.error({
        title: 'ไม่สามารถแก้ไขข้อมูลได้',
        description: (error as Error).message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล',
        confirmText: 'ตกลง',
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword, sendResetLink }: { userId: string; newPassword?: string; sendResetLink?: boolean }) => {
      const result = await usersApi.resetPassword(userId, {
        newPassword,
        temporaryPassword: !newPassword && !sendResetLink,
        sendResetLink: sendResetLink
      });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: (data: { message: string }) => {
      alertDialog.success({
        title: 'รีเซ็ตรหัสผ่านสำเร็จ!',
        description: data.message || 'รหัสผ่านใหม่ถูกส่งไปยังอีเมลแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
      setResetParams(null);
      setNewResetPassword('');
      setSendResetLink(false);
    },
    onError: (error: unknown) => {
      alertDialog.error({
        title: 'ไม่สามารถรีเซ็ตรหัสผ่านได้',
        description: (error as Error).message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน',
        confirmText: 'ตกลง',
      });
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await usersApi.toggleStatus(userId);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alertDialog.success({
        title: 'เปลี่ยนสถานะสำเร็จ!',
        description: 'ระบบได้บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
    },
    onError: (error: unknown) => {
      alertDialog.error({
        title: 'ไม่สามารถเปลี่ยนสถานะได้',
        description: (error as Error).message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ',
        confirmText: 'ตกลง',
      });
    },
  });

  // Map backend users to frontend format
  const users: FrontendUser[] = usersData?.users?.map((u: GlobalUser) => ({
    id: u.id,
    email: u.email,
    fullName: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.name || '-'),
    role: mapUserRole(u.role as string),
    branchId: u.branchId || '',
    branchName: u.branch?.name || '-',
    phone: u.phoneNumber || u.phone || '-',
    status: u.status === 'ACTIVE' || u.status === 'active' ? 'active' : 'inactive',
    lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('th-TH') : null,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
  })) || [];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleEditUser = (user: FrontendUser) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      branchId: user.branchId,
      phone: user.phone === '-' ? '' : user.phone,
    });
    setIsAddDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!formData.email || !formData.fullName || !formData.role) {
      alertDialog.error({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        confirmText: 'ตกลง',
      });
      return;
    }

    const [firstName, ...lastNameParts] = formData.fullName.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    const payload = {
      email: formData.email,
      firstName,
      lastName,
      phoneNumber: formData.phone || undefined,
      role: formData.role,
      branchId: formData.branchId || undefined,
    };

    if (selectedUser) {
      await updateUserMutation.mutateAsync(payload);
    } else {
      await createUserMutation.mutateAsync(payload);
    }
  };

  const handleResetPassword = (user: FrontendUser) => {
    setResetParams({ id: user.id, name: user.fullName });
  };

  const confirmResetPassword = async () => {
    if (resetParams) {
      await resetPasswordMutation.mutateAsync({
        userId: resetParams.id,
        newPassword: newResetPassword || undefined,
        sendResetLink: sendResetLink
      });
    }
  };

  const handleToggleStatus = async (user: FrontendUser) => {
    await toggleStatusMutation.mutateAsync(user.id);
  };

  const handleViewLineAudit = (user: FrontendUser) => {
    setSelectedUserForLineAudit(user);
    setLineAuditDialogOpen(true);
  };

  // ... (counts logic - problematic if pagination is server side, as it only counts visible? No, lines 231-233)
  const adminCount = users.filter(u => u.role === 'admin').length;
  const managerCount = users.filter(u => u.role === 'branch_manager').length;
  const officerCount = users.filter(u => u.role === 'loan_officer').length;

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'จัดการผู้ใช้' }]} >
      <div className="p-6 space-y-6">
      {/* Header */}
      < div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6" >
        <div>
          <h1 className="text-2xl font-bold text-white">จัดการผู้ใช้</h1>
          <p className="text-white">จัดการบัญชีผู้ใช้งานในระบบ</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setSelectedUser(null);
              setFormData({ email: '', fullName: '', role: '' as UserRole | '', branchId: '', phone: '' });
              setIsAddDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มผู้ใช้
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto border rounded-lg">
            <DialogHeader>
              <DialogTitle>{selectedUser ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</DialogTitle>
              <DialogDescription>
                {selectedUser ? 'แก้ไขรายละเอียดบัญชีผู้ใช้งาน' : 'ระบบจะสร้างรหัสผ่านชั่วคราวและส่งไปยังอีเมล'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>อีเมล *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  disabled={selectedUser && !isAdmin}
                />
                {selectedUser && !isAdmin && (
                  <p className="text-xs text-muted-foreground">
                    * เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขอีเมลได้
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>ชื่อ-นามสกุล *</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="สมชาย ใจดี"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>บทบาท *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกบทบาท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                      <SelectItem value="branch_manager">ผู้จัดการสาขา</SelectItem>
                      <SelectItem value="loan_officer">เจ้าหน้าที่สินเชื่อ</SelectItem>
                      <SelectItem value="customer">ลูกค้า</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>สาขา</Label>
                  {/* ... */}
                  <Select
                    value={formData.branchId}
                    onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสาขา" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchesData?.map((branch: { id: string; name: string }) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                {/* ... */}
                <Label>เบอร์โทรศัพท์</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="081-234-5678"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                ยกเลิก
              </Button>
              <Button onClick={handleSaveUser} disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                {(createUserMutation.isPending || updateUserMutation.isPending) ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  selectedUser ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div >

      {/* Stats */}
      <UserStatsCards
        totalUsers={users.length}
        adminCount={adminCount}
        managerCount={managerCount}
        officerCount={officerCount}
        isLoading={isLoading}
      />

      {/* Users Table */}
      < Card >
        <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 pb-4">
          <div>
            <CardTitle>รายชื่อผู้ใช้</CardTitle>
            <CardDescription>แสดง {filteredUsers.length} รายการ</CardDescription>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:items-center md:gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ, อีเมล..."
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
                  {(branchesData || []).map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-primary text-white border-primary hover:bg-primary/90">
                <SelectValue placeholder="บทบาท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกบทบาท</SelectItem>
                <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                <SelectItem value="branch_manager">ผู้จัดการสาขา</SelectItem>
                <SelectItem value="loan_officer">เจ้าหน้าที่สินเชื่อ</SelectItem>
                <SelectItem value="customer">ลูกค้า</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-primary text-white border-primary hover:bg-primary/90">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="active">ใช้งาน</SelectItem>
                <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead>ผู้ใช้</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>สาขา</TableHead>
                  <TableHead>เข้าสู่ระบบล่าสุด</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <TableSkeleton rows={pageSize} columns={6} />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-destructive">
                      เกิดข้อผิดพลาดในการโหลดข้อมูล
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลผู้ใช้
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-medium">
                              {user.fullName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.fullName}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleConfig[user.role].color}>
                          {roleConfig[user.role].label}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.branchName}</TableCell>
                      <TableCell>
                        {user.lastLogin ? (
                          <span className="text-sm">{user.lastLogin}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">ยังไม่เคยเข้าสู่ระบบ</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={user.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                          {user.status === 'active' ? 'ใช้งาน' : 'ปิด'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              แก้ไข
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                              <Key className="h-4 w-4 mr-2" />
                              รีเซ็ตรหัสผ่าน
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem onClick={() => handleViewLineAudit(user)}>
                                <Link2 className="h-4 w-4 mr-2" />
                                ประวัติ LINE
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                              {user.status === 'active' ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  ปิดใช้งาน
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  เปิดใช้งาน
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {usersData && usersData.total > 0 && (
              <PaginationControls
                currentPage={page}
                totalPages={usersData.totalPages || 1}
                pageSize={pageSize}
                totalItems={usersData.total || 0}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </CardContent>
      </Card >

      {/* Reset Password Confirmation Dialog */}
      <Dialog open={!!resetParams} onOpenChange={(open) => !open && setResetParams(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการรีเซ็ตรหัสผ่าน</DialogTitle>
            <DialogDescription>
              คุณต้องการรีเซ็ตรหัสผ่านสำหรับผู้ใช้ <b>{resetParams?.name}</b> ใช่หรือไม่?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>รหัสผ่านใหม่ (ไม่บังคับ)</Label>
              <Input
                type="password"
                placeholder="กรอกรหัสผ่านใหม่ที่ต้องการตั้งให้"
                value={newResetPassword}
                onChange={(e) => setNewResetPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                * หากปล่อยว่างไว้ ระบบจะสร้างรหัสผ่านชั่วคราวให้โดยอัตโนมัติ
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                id="sendResetLink"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-[#5b7cfa] focus:ring-[#5b7cfa]"
                checked={sendResetLink}
                onChange={(e) => {
                  setSendResetLink(e.target.checked);
                  if (e.target.checked) setNewResetPassword('');
                }}
              />
              <Label htmlFor="sendResetLink" className="text-sm font-normal cursor-pointer">
                ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลเพื่อให้ผู้ใช้ตั้งค่าเอง
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetParams(null);
              setNewResetPassword('');
            }}>
              ยกเลิก
            </Button>
            <Button onClick={confirmResetPassword} disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  กำลังดำเนินการ...
                </>
              ) : (
                'ยืนยันรีเซ็ต'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <alertDialog.AlertDialog />

      {/* LINE Audit Dialog */}
      <LineAuditDialog
        open={lineAuditDialogOpen}
        onOpenChange={setLineAuditDialogOpen}
        userId={selectedUserForLineAudit?.id}
        userEmail={selectedUserForLineAudit?.email}
      />
      </div>
    </DashboardLayout >
  );
}
