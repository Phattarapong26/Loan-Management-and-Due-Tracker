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
import { Users, FileSpreadsheet, Search } from 'lucide-react';
import { toast } from 'sonner';
import { customersApi, documentsApi } from '@/shared/lib/api-endpoints';
import { useAlertDialog } from '@/shared/hooks/useAlertDialog';

interface Customer {
  id: string;
  businessName: string;
  taxId: string;
  branchId: string;
  status: string;
}

export default function DocumentUploadWithCustomer() {
  const alertDialog = useAlertDialog();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Load customers on mount
  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load selected customer details
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      setSelectedCustomer(customer || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, customers]);

  const loadCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const response = await customersApi.list({ page: 1, limit: 100 });
      if (response.data) {
        setCustomers(response.data.customers || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      alertDialog.error({
        title: 'ไม่สามารถโหลดข้อมูลได้',
        description: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        confirmText: 'ตกลง',
      });
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
  };

  const filteredCustomers = customers.filter(customer =>
    customer.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.taxId.includes(searchTerm)
  );

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
            เลือกลูกค้าและอัพโหลดเอกสารเพื่อดึงข้อมูลจากไฟล์ Excel
          </p>
        </div>
        {selectedCustomerId && (
          <Button variant="outline" onClick={handleReset}>
            เริ่มใหม่
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer Selection */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                เลือกลูกค้า
              </CardTitle>
              <CardDescription>
                เลือกลูกค้าที่ต้องการอัพโหลดเอกสาร
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่อหรือเลขประจำตัวผู้เสียภาษี..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Customer Select */}
              <div className="space-y-2">
                <Label>ลูกค้า</Label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                  disabled={isLoadingCustomers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกลูกค้า..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        ไม่พบลูกค้า
                      </div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{customer.businessName}</span>
                            <span className="text-xs text-muted-foreground">
                              เลขประจำตัวผู้เสียภาษี: {customer.taxId}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Customer Info */}
              {selectedCustomer && (
                <>
                  <Separator />
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm">ข้อมูลลูกค้าที่เลือก</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">ชื่อธุรกิจ:</span>
                        <p className="font-medium">{selectedCustomer.businessName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">เลขประจำตัวผู้เสียภาษี:</span>
                        <p className="font-medium font-mono">{selectedCustomer.taxId}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">สถานะ:</span>
                        <div className="mt-1">
                          <Badge variant={selectedCustomer.status === 'active' ? 'default' : 'secondary'}>
                            {selectedCustomer.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!selectedCustomerId && (
                <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
                  <p className="text-sm text-info-foreground">
                    💡 กรุณาเลือกลูกค้าก่อนอัพโหลดเอกสาร
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Document Upload & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Upload */}
          {selectedCustomerId ? (
            <DocumentUpload
              customerId={selectedCustomerId}
              onUploadComplete={handleUploadComplete}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">เลือกลูกค้าเพื่อเริ่มต้น</h3>
                <p className="text-muted-foreground">
                  กรุณาเลือกลูกค้าจากรายการด้านซ้ายเพื่ออัพโหลดเอกสาร
                </p>
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

      {/* Alert Dialog */}
      <alertDialog.AlertDialog />
    </DashboardLayout>
  );
}
