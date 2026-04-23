import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { Users, FileSpreadsheet, Search, Building2, UserCheck, AlertCircle } from 'lucide-react';
import { customersApi, branchesApi, usersApi } from '@/shared/lib/api-endpoints';
import { useAlertDialog } from '@/shared/hooks/useAlertDialog';
import { useAuth } from '@/shared/contexts/AuthContext';

interface Customer {
  id: string;
  businessName: string;
  taxId: string;
  branchId: string;
  status: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Officer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function DocumentUploadWithCustomer() {
  const alertDialog = useAlertDialog();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Branch selection (admin only)
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isAdmin ? '' : (user?.branchId || '')
  );
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Officer selection (admin only)
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [isLoadingOfficers, setIsLoadingOfficers] = useState(false);

  // Customer selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);

  // Load branches for admin
  useEffect(() => {
    if (isAdmin) {
      loadBranches();
    }
  }, [isAdmin]);

  // Load officers when branch is selected (admin only)
  useEffect(() => {
    if (isAdmin && selectedBranchId) {
      loadOfficers(selectedBranchId);
      loadCustomers(selectedBranchId);
      // Reset downstream selections
      setSelectedOfficerId('');
      setSelectedCustomerId('');
      setSelectedCustomer(null);
    } else if (!isAdmin && user?.branchId) {
      loadCustomers(user.branchId);
    }
  }, [selectedBranchId, isAdmin]);

  // Sync selected customer object
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      setSelectedCustomer(customer || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, customers]);

  const loadBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const response = await branchesApi.list({ limit: 100 });
      if (response.data) {
        setBranches(response.data.branches || []);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const loadOfficers = async (branchId: string) => {
    setIsLoadingOfficers(true);
    try {
      const response = await usersApi.list({ branchId, role: 'OFFICER', limit: 100 });
      if (response.data) {
        setOfficers(response.data.users || []);
      }
    } catch (error) {
      console.error('Error loading officers:', error);
    } finally {
      setIsLoadingOfficers(false);
    }
  };

  const loadCustomers = async (branchId: string) => {
    setIsLoadingCustomers(true);
    try {
      const response = await customersApi.list({ branchId, limit: 200 });
      if (response.data) {
        setCustomers(response.data.customers || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleUploadComplete = (documentId: string) => {
    setUploadedDocumentId(documentId);
    alertDialog.success({
      title: 'อัพโหลดเอกสารสำเร็จ!',
      description: 'เอกสารถูกบันทึกเรียบร้อยแล้ว',
      confirmText: 'ตกลง',
    });
  };

  const handleReset = () => {
    setSelectedCustomerId('');
    setSelectedCustomer(null);
    setUploadedDocumentId(null);
    if (isAdmin) {
      setSelectedBranchId('');
      setSelectedOfficerId('');
      setOfficers([]);
      setCustomers([]);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.taxId.includes(searchTerm)
  );

  // Admin must select branch first
  const canSelectCustomer = isAdmin ? !!selectedBranchId : true;
  // Can upload only when customer is selected (and for admin, branch is selected)
  const canUpload = !!selectedCustomerId && canSelectCustomer;

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const selectedOfficer = officers.find(o => o.id === selectedOfficerId);

  return (
    <DashboardLayout breadcrumbs={[
      { label: 'Home' },
      { label: 'เอกสาร' },
      { label: 'อัพโหลดเอกสารลูกค้า' }
    ]}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7" />
            อัพโหลดเอกสารลูกค้า
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'เลือกสาขา พนักงาน และลูกค้าก่อนอัพโหลดเอกสาร'
              : 'เลือกลูกค้าและอัพโหลดเอกสารเพื่อดึงข้อมูลจากไฟล์ Excel'}
          </p>
        </div>
        {(selectedCustomerId || selectedBranchId) && (
          <Button variant="outline" onClick={handleReset}>
            เริ่มใหม่
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Selection Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {isAdmin ? 'ตั้งค่าการอัพโหลด' : 'เลือกลูกค้า'}
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? 'เลือกสาขา พนักงาน และลูกค้าที่ต้องการ'
                  : 'เลือกลูกค้าที่ต้องการอัพโหลดเอกสาร'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* ── ADMIN: Branch Selection ── */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    สาขา <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedBranchId}
                    onValueChange={setSelectedBranchId}
                    disabled={isLoadingBranches}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingBranches ? 'กำลังโหลด...' : 'เลือกสาขา...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{branch.name}</span>
                            <span className="text-xs text-muted-foreground">{branch.code}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* ── ADMIN: Officer Selection ── */}
              {isAdmin && selectedBranchId && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    ผูกกับพนักงาน <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span>
                  </Label>
                  <Select
                    value={selectedOfficerId}
                    onValueChange={setSelectedOfficerId}
                    disabled={isLoadingOfficers}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingOfficers ? 'กำลังโหลด...' : 'เลือกพนักงาน...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— ไม่ระบุพนักงาน —</SelectItem>
                      {officers.map((officer) => (
                        <SelectItem key={officer.id} value={officer.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{officer.firstName} {officer.lastName}</span>
                            <span className="text-xs text-muted-foreground">{officer.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* ── Admin: must pick branch first ── */}
              {isAdmin && !selectedBranchId && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-sm text-warning-foreground">
                    กรุณาเลือกสาขาก่อนเพื่อดูรายชื่อลูกค้า
                  </p>
                </div>
              )}

              {/* ── Customer Search & Select ── */}
              {canSelectCustomer && (
                <>
                  {isAdmin && <Separator />}

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหาชื่อหรือเลขประจำตัวผู้เสียภาษี..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>ลูกค้า</Label>
                    <Select
                      value={selectedCustomerId}
                      onValueChange={setSelectedCustomerId}
                      disabled={isLoadingCustomers}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingCustomers ? 'กำลังโหลด...' : 'เลือกลูกค้า...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCustomers.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {isLoadingCustomers ? 'กำลังโหลด...' : 'ไม่พบลูกค้า'}
                          </div>
                        ) : (
                          filteredCustomers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{customer.businessName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {customer.taxId}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* ── Selected Summary ── */}
              {selectedCustomer && (
                <>
                  <Separator />
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg text-sm">
                    <h4 className="font-semibold">สรุปการตั้งค่า</h4>
                    {selectedBranch && (
                      <div>
                        <span className="text-muted-foreground">สาขา:</span>
                        <p className="font-medium">{selectedBranch.name}</p>
                      </div>
                    )}
                    {selectedOfficer && selectedOfficerId !== 'none' && (
                      <div>
                        <span className="text-muted-foreground">พนักงาน:</span>
                        <p className="font-medium">{selectedOfficer.firstName} {selectedOfficer.lastName}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">ลูกค้า:</span>
                      <p className="font-medium">{selectedCustomer.businessName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">เลขประจำตัวผู้เสียภาษี:</span>
                      <p className="font-medium font-mono">{selectedCustomer.taxId}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">สถานะ:</span>
                      <div className="mt-1">
                        <Badge variant={selectedCustomer.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {selectedCustomer.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!selectedCustomerId && canSelectCustomer && (
                <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
                  <p className="text-sm text-info-foreground">
                    💡 กรุณาเลือกลูกค้าก่อนอัพโหลดเอกสาร
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Document Upload */}
        <div className="lg:col-span-2 space-y-6">
          {canUpload ? (
            <DocumentUpload
              customerId={selectedCustomerId}
              officerId={selectedOfficerId && selectedOfficerId !== 'none' ? selectedOfficerId : undefined}
              branchId={selectedBranchId || user?.branchId}
              officers={officers}
              onUploadComplete={handleUploadComplete}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                {isAdmin && !selectedBranchId ? (
                  <>
                    <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">เลือกสาขาก่อน</h3>
                    <p className="text-muted-foreground">
                      Admin ต้องเลือกสาขาก่อนเพื่อดูรายชื่อลูกค้าและอัพโหลดเอกสาร
                    </p>
                  </>
                ) : (
                  <>
                    <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">เลือกลูกค้าเพื่อเริ่มต้น</h3>
                    <p className="text-muted-foreground">
                      กรุณาเลือกลูกค้าจากรายการด้านซ้ายเพื่ออัพโหลดเอกสาร
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {uploadedDocumentId && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <p className="text-sm text-green-800">
                  ✅ อัพโหลดเอกสารสำเร็จ! เอกสารถูกบันทึกเรียบร้อยแล้ว
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <alertDialog.AlertDialog />
    </DashboardLayout>
  );
}
