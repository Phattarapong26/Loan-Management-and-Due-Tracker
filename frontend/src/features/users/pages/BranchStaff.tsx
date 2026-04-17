import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { usersApi, User, UserRole } from '@/shared/lib/api-endpoints';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Users,
  UserPlus,
  MoreVertical,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  XCircle,
  Key,
  Edit,
  Search,
  Filter,
} from 'lucide-react';

type StaffMember = User;

export default function BranchStaff() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'OFFICER',
  });

  // Fetch staff in the branch
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['branchStaff', user?.branchId, roleFilter, statusFilter, searchQuery],
    queryFn: async () => {
      const result = await usersApi.list({
        branchId: user?.branchId,
        limit: 100,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      return result.data;
    },
    enabled: !!user?.branchId,
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string; phoneNumber?: string; role: string }) => {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 
                          Math.random().toString(36).slice(-4).toUpperCase();
      
      const result = await usersApi.create({
        ...data,
        branchId: user?.branchId,
        password: tempPassword,
      });
      
      if (result.error) throw result.error;
      return { ...result.data, tempPassword };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['branchStaff'] });
      toast({
        title: 'เพิ่มพนักงานสำเร็จ',
        description: `รหัสผ่านชั่วคราว: ${data.tempPassword} (ควรเปลี่ยนทันที)`,
      });
      handleCloseAddDialog();
    },
    onError: (error: unknown) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: (error as Error).message || 'ไม่สามารถเพิ่มพนักงานได้',
        variant: 'destructive',
      });
    },
  });

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { firstName?: string; lastName?: string; phoneNumber?: string; role?: string } }) => {
      const result = await usersApi.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branchStaff'] });
      toast({
        title: 'อัปเดตข้อมูลสำเร็จ',
        description: 'ข้อมูลพนักงานถูกอัปเดตแล้ว',
      });
      handleCloseEditDialog();
    },
    onError: (error: unknown) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: (error as Error).message || 'ไม่สามารถอัปเดตข้อมูลได้',
        variant: 'destructive',
      });
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await usersApi.toggleStatus(userId);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branchStaff'] });
      toast({
        title: 'เปลี่ยนสถานะสำเร็จ',
        description: 'สถานะพนักงานถูกเปลี่ยนแล้ว',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: (error as Error).message || 'ไม่สามารถเปลี่ยนสถานะได้',
        variant: 'destructive',
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const tempPassword = Math.random().toString(36).slice(-8) + 
                          Math.random().toString(36).slice(-4).toUpperCase();
      
      const result = await usersApi.resetPassword(userId, {
        newPassword: tempPassword,
        temporaryPassword: true,
      });
      
      if (result.error) throw result.error;
      return { data: result.data, tempPassword };
    },
    onSuccess: (data: { tempPassword: string }) => {
      toast({
        title: 'รีเซ็ตรหัสผ่านสำเร็จ',
        description: `รหัสผ่านชั่วคราว: ${data.tempPassword}`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: (error as Error).message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้',
        variant: 'destructive',
      });
    },
  });

  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      role: 'OFFICER',
    });
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedStaff(null);
  };

  const handleAddStaff = () => {
    createStaffMutation.mutate(formData);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsEditDialogOpen(true);
  };

  const handleUpdateStaff = () => {
    if (!selectedStaff) return;
    
    updateStaffMutation.mutate({
      id: selectedStaff.id,
      data: {
        firstName: selectedStaff.firstName,
        lastName: selectedStaff.lastName,
        phoneNumber: selectedStaff.phoneNumber,
        role: selectedStaff.role,
      },
    });
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; color: string }> = {
      MANAGER: { label: 'ผู้จัดการ', color: 'bg-purple-100 text-purple-700' },
      OFFICER: { label: 'เจ้าหน้าที่', color: 'bg-blue-100 text-blue-700' },
      ADMIN: { label: 'ผู้ดูแลระบบ', color: 'bg-rose-100 text-rose-700' },
    };
    
    const config = roleConfig[role] || { label: role, color: 'bg-gray-100 text-gray-700' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return status === 'ACTIVE' ? (
      <Badge className="bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        ใช้งาน
      </Badge>
    ) : (
      <Badge className="bg-slate-100 text-slate-700">
        <XCircle className="h-3 w-3 mr-1" />
        ระงับ
      </Badge>
    );
  };

  const staff = staffData?.users || [];
  const totalStaff = staffData?.total || 0;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'หน้าหลัก', href: '/' },
        { label: 'จัดการพนักงาน' },
      ]}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              จัดการพนักงานในสาขา
            </h1>
            <p className="text-slate-500 mt-1">
              จัดการข้อมูลพนักงานในสาขาของคุณ ({totalStaff} คน)
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            เพิ่มพนักงาน
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="ตำแหน่ง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทุกตำแหน่ง</SelectItem>
                  <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                  <SelectItem value="OFFICER">เจ้าหน้าที่</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทุกสถานะ</SelectItem>
                  <SelectItem value="ACTIVE">ใช้งาน</SelectItem>
                  <SelectItem value="INACTIVE">ระงับ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Staff List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-4 animate-pulse" />
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>ไม่พบข้อมูลพนักงาน</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      พนักงาน
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ติดต่อ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ตำแหน่ง
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      เข้าสู่ระบบล่าสุด
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((member: StaffMember) => (
                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-bold">
                              {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {member.phoneNumber ? (
                          <p className="text-sm text-slate-600 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phoneNumber}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-400">ไม่ระบุ</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(member.role)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(member.status)}
                      </td>
                      <td className="px-6 py-4">
                        {member.lastLoginAt ? (
                          <p className="text-sm text-slate-600">
                            {new Date(member.lastLoginAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-400">ยังไม่เคยเข้าสู่ระบบ</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditStaff(member)}>
                              <Edit className="h-4 w-4 mr-2" />
                              แก้ไขข้อมูล
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => resetPasswordMutation.mutate(member.id)}>
                              <Key className="h-4 w-4 mr-2" />
                              รีเซ็ตรหัสผ่าน
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatusMutation.mutate(member.id)}>
                              {member.status === 'ACTIVE' ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  ระงับการใช้งาน
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  เปิดใช้งาน
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              เพิ่มพนักงานใหม่
            </DialogTitle>
            <DialogDescription>
              กรอกข้อมูลพนักงานใหม่ในสาขา รหัสผ่านชั่วคราวจะถูกสร้างอัตโนมัติ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">ชื่อ *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="ชื่อจริง"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">นามสกุล *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="นามสกุล"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">อีเมล *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">เบอร์โทรศัพท์</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="0812345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">ตำแหน่ง *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFICER">เจ้าหน้าที่</SelectItem>
                  <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAddDialog}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleAddStaff}
              disabled={!formData.email || !formData.firstName || !formData.lastName || createStaffMutation.isPending}
            >
              {createStaffMutation.isPending ? 'กำลังเพิ่ม...' : 'เพิ่มพนักงาน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              แก้ไขข้อมูลพนักงาน
            </DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลพนักงาน (ไม่สามารถเปลี่ยนอีเมลได้)
            </DialogDescription>
          </DialogHeader>

          {selectedStaff && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">ชื่อ *</Label>
                  <Input
                    id="edit-firstName"
                    value={selectedStaff.firstName}
                    onChange={(e) => setSelectedStaff({ ...selectedStaff, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">นามสกุล *</Label>
                  <Input
                    id="edit-lastName"
                    value={selectedStaff.lastName}
                    onChange={(e) => setSelectedStaff({ ...selectedStaff, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">อีเมล</Label>
                <Input
                  id="edit-email"
                  value={selectedStaff.email}
                  disabled
                  className="bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phoneNumber">เบอร์โทรศัพท์</Label>
                <Input
                  id="edit-phoneNumber"
                  value={selectedStaff.phoneNumber || ''}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, phoneNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">ตำแหน่ง *</Label>
                <Select
                  value={selectedStaff.role}
                  onValueChange={(value) => setSelectedStaff({ ...selectedStaff, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFICER">เจ้าหน้าที่</SelectItem>
                    <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleUpdateStaff}
              disabled={updateStaffMutation.isPending}
            >
              {updateStaffMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
