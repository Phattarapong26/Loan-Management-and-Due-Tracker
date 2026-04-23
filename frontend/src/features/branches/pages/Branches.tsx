import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { PaginationControls } from '@/shared/components/ui/pagination-controls';
import { TableSkeleton } from '@/shared/components/skeletons';
import { usePagination } from '@/shared/hooks/usePagination';
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
  Building2,
  MapPin,
  Edit,
  Eye,
  Loader2,
  Power,
  PowerOff,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { branchesApi } from '@/shared/lib/api-endpoints';
import { useAlertDialog } from '@/shared/hooks/useAlertDialog';
import { BranchStatsCards } from '../components/BranchStatsCards';
import { FormattedAmount } from '@/shared/components/FormattedAmount';
import { thaiAddressApi } from '../api/thai-address.api';
import { AddressFormFields } from '../components/AddressFormFields';

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  managerName: string;
  officerCount: number;
  activeLoans: number;
  totalOutstanding: number;
  nplRatio: number;
  status: 'active' | 'inactive';
}

// Backend types to avoid `any`
type BackendLoan = {
  id?: string;
  status?: string;
  outstandingBalance?: number | string;
  principal?: number | string;
  [key: string]: unknown;
};

type BackendUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
  [key: string]: unknown;
};

type BackendBranch = {
  id: string;
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  postalCode?: string;
  users?: BackendUser[];
  loans?: BackendLoan[];
  status?: string;
  [key: string]: unknown;
};

export default function Branches() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const alertDialog = useAlertDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const { page, pageSize, setPage, setPageSize, getPaginationParams } = usePagination();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    province: '',
    district: '',
    subdistrict: '',
    postalCode: '',
    managerName: '',
  });

  // Fetch subdistricts for auto-filling postal code
  const { data: currentSubdistricts } = useQuery({
    queryKey: ['subdistricts', formData.province, formData.district],
    queryFn: async () => {
      if (!formData.province || !formData.district) return [];
      const result = await thaiAddressApi.getSubdistricts(formData.province, formData.district);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: !!formData.province && !!formData.district,
  });

  // Auto-fill postal code when subdistrict is selected
  useEffect(() => {
    if (formData.subdistrict && currentSubdistricts) {
      const selectedSubdistrict = currentSubdistricts.find(s => s.name === formData.subdistrict);
      if (selectedSubdistrict) {
        setFormData(prev => ({ ...prev, postalCode: selectedSubdistrict.postalCode }));
      }
    }
  }, [formData.subdistrict, currentSubdistricts]);

  // Fetch branches
  const { data: branchesData, isLoading, error } = useQuery({
    queryKey: ['branches', { search: searchTerm, status: statusFilter, page, pageSize }],
    queryFn: async () => {
      const result = await branchesApi.list({
        ...getPaginationParams(),
        status: statusFilter !== 'all' ? statusFilter.toUpperCase() : undefined,
        search: searchTerm || undefined,
      });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
  });

  // Create branch mutation
  const createBranchMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      code: string; 
      address?: string; 
      phone?: string;
      province?: string;
      district?: string;
      subdistrict?: string;
      postalCode?: string;
    }) => {
      const payload = {
        name: String(data.name),
        code: String(data.code),
        address: data.address ? String(data.address) : undefined,
        phone: data.phone ? String(data.phone) : undefined,
        province: data.province ? String(data.province) : undefined,
        district: data.district ? String(data.district) : undefined,
        subdistrict: data.subdistrict ? String(data.subdistrict) : undefined,
        postalCode: data.postalCode ? String(data.postalCode) : undefined,
      };
      const result = await branchesApi.create(payload);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      alertDialog.success({
        title: 'เพิ่มสาขาสำเร็จ!',
        description: 'ระบบได้บันทึกข้อมูลสาขาเรียบร้อยแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
      setIsAddDialogOpen(false);
      
      setFormData({ name: '', code: '', address: '', phone: '', province: '', district: '', subdistrict: '', postalCode: '', managerName: '' });
    },
    onError: (error: unknown) => {
      const message = (error as Error)?.message ?? (typeof error === 'string' ? error : 'เกิดข้อผิดพลาดในการเพิ่มสาขา');
      alertDialog.error({
        title: 'ไม่สามารถเพิ่มสาขาได้',
        description: message,
        confirmText: 'ตกลง',
      });
    },
  });

  // Update branch mutation
  const updateBranchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const result = await branchesApi.update(id, data);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      alertDialog.success({
        title: 'แก้ไขสาขาสำเร็จ!',
        description: 'ระบบได้บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
      setIsEditDialogOpen(false);
      setEditingBranch(null);
    },
    onError: (error: unknown) => {
      const message = (error as Error)?.message ?? (typeof error === 'string' ? error : 'เกิดข้อผิดพลาดในการแก้ไขสาขา');
      alertDialog.error({
        title: 'ไม่สามารถแก้ไขสาขาได้',
        description: message,
        confirmText: 'ตกลง',
      });
    },
  });

  // Toggle branch status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' }) => {
      const result = await branchesApi.update(id, { status: status === 'active' ? 'ACTIVE' : 'INACTIVE' });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      const statusText = variables.status === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
      alertDialog.success({
        title: `${statusText}สาขาสำเร็จ!`,
        description: 'ระบบได้บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
    },
    onError: (error: unknown) => {
      const message = (error as Error)?.message ?? (typeof error === 'string' ? error : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
      alertDialog.error({
        title: 'ไม่สามารถเปลี่ยนสถานะได้',
        description: message,
        confirmText: 'ตกลง',
      });
    },
  });

  // Map backend branches to frontend format
  const branches: Branch[] = ((branchesData?.branches as BackendBranch[]) || []).map((b) => {
    const users = Array.isArray(b.users) ? b.users : [];
    const activeUsers = users.filter((u) => String(u.status || '').toUpperCase() === 'ACTIVE');
    const manager = activeUsers.find((u) => String(u.role || '').toUpperCase() === 'MANAGER');
    const officers = activeUsers.filter((u) => String(u.role || '').toUpperCase() === 'OFFICER');

    const loans = Array.isArray(b.loans) ? b.loans : [];
    const portfolioStatuses = new Set(['DISBURSED', 'ACTIVE', 'NPL', 'DEFAULTED']);
    const portfolioLoans = loans.filter((l) => portfolioStatuses.has(String(l.status || '').toUpperCase()));
    const troubledLoans = loans.filter((l) => ['NPL', 'DEFAULTED'].includes(String(l.status || '').toUpperCase()));

    const portfolioCount = portfolioLoans.length;
    const nplRatio = portfolioCount > 0 ? (troubledLoans.length / portfolioCount) * 100 : 0;

    return {
      id: b.id,
      name: b.name || '-',
      code: b.code || '-',
      address: b.address || '-',
      phone: b.phone || '-',
      province: b.province || '-',
      district: b.district || '-',
      subdistrict: b.subdistrict || '-',
      postalCode: b.postalCode || '-',
      managerName: manager ? `${manager.firstName || ''} ${manager.lastName || ''}`.trim() : '-',
      officerCount: officers.length,
      activeLoans: portfolioLoans.length,
      totalOutstanding: portfolioLoans.reduce((sum, l) => sum + Number(l.outstandingBalance ?? l.principal ?? 0), 0),
      nplRatio,
      status: String(b.status || '').toLowerCase() === 'active' ? 'active' : 'inactive',
    };
  });

  const filteredBranches = branches.filter(branch => {
    const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || branch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const generateBranchCode = () => {
    const allCodes = ((branchesData?.branches as BackendBranch[]) || [])
      .map((b) => b.code || '')
      .filter((c) => /^BR-C\d+$/.test(c));
    const maxNum = allCodes.reduce((max, code) => {
      const num = parseInt(code.replace('BR-C', ''), 10);
      return num > max ? num : max;
    }, 0);
    return `BR-C${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleAddBranch = async () => {
    if (!formData.name || !formData.code) {
      alertDialog.error({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกชื่อสาขาและรหัสสาขา',
        confirmText: 'ตกลง',
      });
      return;
    }

    await createBranchMutation.mutateAsync({
      name: formData.name,
      code: formData.code,
      address: formData.address || undefined,
      phone: formData.phone || undefined,
      province: formData.province || undefined,
      district: formData.district || undefined,
      subdistrict: formData.subdistrict || undefined,
      postalCode: formData.postalCode || undefined,
    });
  };

  const handleViewDetail = (branch: Branch) => {
    navigate(`/branches/${branch.id}`);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      phone: branch.phone || '',
      province: branch.province || '',
      district: branch.district || '',
      subdistrict: branch.subdistrict || '',
      postalCode: branch.postalCode || '',
      managerName: branch.managerName || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch || !formData.name) {
      alertDialog.error({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกชื่อสาขา',
        confirmText: 'ตกลง',
      });
      return;
    }

    await updateBranchMutation.mutateAsync({
      id: editingBranch.id,
      data: {
        name: formData.name,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        province: formData.province || undefined,
        district: formData.district || undefined,
        subdistrict: formData.subdistrict || undefined,
        postalCode: formData.postalCode || undefined,
      },
    });
  };

  const handleToggleStatus = async (branch: Branch) => {
    const newStatus = branch.status === 'active' ? 'inactive' : 'active';
    const statusText = newStatus === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
    
    if (confirm(`คุณต้องการ${statusText}สาขา "${branch.name}" ใช่หรือไม่?`)) {
      await toggleStatusMutation.mutateAsync({
        id: branch.id,
        status: newStatus,
      });
    }
  };

  const totalOfficers = branches.reduce((sum, b) => sum + b.officerCount, 0);
  const totalLoans = branches.reduce((sum, b) => sum + b.activeLoans, 0);
  const totalOutstanding = branches.reduce((sum, b) => sum + b.totalOutstanding, 0);

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'จัดการสาขา' }]}>
      <div className="p-6 space-y-6">
        {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">จัดการสาขา</h1>
          <p className="text-white">จัดการข้อมูลสาขาทั้งหมด</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              
              setFormData(prev => ({ ...prev, code: generateBranchCode() }));
            }}>
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มสาขา
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto border rounded-lg">
            <DialogHeader>
              <DialogTitle>เพิ่มสาขาใหม่</DialogTitle>
              <DialogDescription>กรอกข้อมูลสาขาใหม่</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ชื่อสาขา *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="สาขาสีลม"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>รหัสสาขา *</Label>
                    <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">สร้างอัตโนมัติ</span>
                  </div>
                  <Input
                    value={formData.code}
                    readOnly
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                    placeholder="BR-C001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ที่อยู่</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="88 ถนนสีลม"
                />
              </div>
              <AddressFormFields
                province={formData.province}
                district={formData.district}
                subdistrict={formData.subdistrict}
                postalCode={formData.postalCode}
                onProvinceChange={(value) => {
                  setFormData({ ...formData, province: value, district: '', subdistrict: '', postalCode: '' });
                }}
                onDistrictChange={(value) => {
                  setFormData({ ...formData, district: value, subdistrict: '', postalCode: '' });
                }}
                onSubdistrictChange={(value) => {
                  const selectedSubdistrict = currentSubdistricts?.find(s => s.name === value);
                  setFormData({ 
                    ...formData, 
                    subdistrict: value, 
                    postalCode: selectedSubdistrict?.postalCode || '' 
                  });
                }}
              />
              <div className="space-y-2">
                <Label>เบอร์โทรศัพท์</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="02-234-5678"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleAddBranch} disabled={createBranchMutation.isPending}>
                {createBranchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  'บันทึก'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Branch Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto border rounded-lg">
            <DialogHeader>
              <DialogTitle>แก้ไขข้อมูลสาขา</DialogTitle>
              <DialogDescription>แก้ไขข้อมูลสาขา {editingBranch?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ชื่อสาขา *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="สาขาสีลม"
                  />
                </div>
                <div className="space-y-2">
                  <Label>รหัสสาขา</Label>
                  <Input
                    value={formData.code}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ที่อยู่</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="88 ถนนสีลม"
                />
              </div>
              <AddressFormFields
                province={formData.province}
                district={formData.district}
                subdistrict={formData.subdistrict}
                postalCode={formData.postalCode}
                onProvinceChange={(value) => {
                  setFormData({ ...formData, province: value, district: '', subdistrict: '', postalCode: '' });
                }}
                onDistrictChange={(value) => {
                  setFormData({ ...formData, district: value, subdistrict: '', postalCode: '' });
                }}
                onSubdistrictChange={(value) => {
                  const selectedSubdistrict = currentSubdistricts?.find(s => s.name === value);
                  setFormData({ 
                    ...formData, 
                    subdistrict: value, 
                    postalCode: selectedSubdistrict?.postalCode || '' 
                  });
                }}
              />
              <div className="space-y-2">
                <Label>เบอร์โทรศัพท์</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="02-234-5678"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleUpdateBranch} disabled={updateBranchMutation.isPending}>
                {updateBranchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  'บันทึก'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <BranchStatsCards
        totalBranches={branches.length}
        totalOfficers={totalOfficers}
        totalLoans={totalLoans}
        totalOutstanding={totalOutstanding}
        isLoading={isLoading}
      />

      {/* Branches Table */}
      <Card>
        <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 pb-4">
          <div>
            <CardTitle>รายชื่อสาขา</CardTitle>
            <CardDescription>แสดง {filteredBranches.length} สาขา</CardDescription>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:items-center md:gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อสาขา, รหัส..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="active">ใช้งาน</SelectItem>
                <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className=" overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead>สาขา</TableHead>
                  <TableHead>ผู้จัดการ</TableHead>
                  <TableHead className="text-center">เจ้าหน้าที่</TableHead>
                  <TableHead className="text-center">สินเชื่อ</TableHead>
                  <TableHead className="text-right">ยอดคงค้าง</TableHead>
                  <TableHead className="text-center">NPL %</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <TableSkeleton rows={pageSize} columns={8} />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-destructive">
                      เกิดข้อผิดพลาดในการโหลดข้อมูล
                    </TableCell>
                  </TableRow>
                ) : filteredBranches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลสาขา
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBranches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{branch.name}</p>
                            <p className="text-xs text-muted-foreground">{branch.code}</p>
                            {branch.province !== '-' && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                <MapPin className="h-3 w-3 inline mr-1" />
                                {branch.province}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{branch.managerName}</TableCell>
                      <TableCell className="text-center">{branch.officerCount}</TableCell>
                      <TableCell className="text-center">{branch.activeLoans}</TableCell>
                      <TableCell className="text-right font-medium">
                        <FormattedAmount amount={branch.totalOutstanding} />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs",
                          branch.nplRatio < 3 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        )}>
                          {branch.nplRatio.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={branch.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                          {branch.status === 'active' ? 'ใช้งาน' : 'ปิด'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetail(branch)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditBranch(branch)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleToggleStatus(branch)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {branch.status === 'active' ? (
                              <PowerOff className="h-4 w-4 text-destructive" />
                            ) : (
                              <Power className="h-4 w-4 text-success" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {branchesData && branchesData.total > 0 && (
              <PaginationControls
                currentPage={page}
                totalPages={branchesData.totalPages || 1}
                pageSize={pageSize}
                totalItems={branchesData.total || 0}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Dialog */}
      <alertDialog.AlertDialog />
      </div>
    </DashboardLayout>
  );
}
