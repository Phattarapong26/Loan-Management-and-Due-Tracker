import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';
import { Label } from '@/shared/components/ui/label';
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
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  Image,
  FileType,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  FolderOpen,
  Users,
  Building2,
  Loader,
} from 'lucide-react';
import { toast } from 'sonner';
import { documentsApi, customersApi, businessProfilesApi, branchesApi, Branch } from '@/shared/lib/api-endpoints';
import { ParsedBusinessProfile } from '../utils/parsers';
import { DocumentReviewModal } from '../components/documents/DocumentReviewModal';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { DocumentStatsCards } from '../components/DocumentStatsCards';
import { showUserFriendlyError } from '@/shared/utils/user-friendly-errors';
import { useAuth } from '@/shared/contexts/AuthContext';

interface Document {
  id: string;
  fileName: string;
  documentType: string;
  fileSize: number;
  mimeType: string;
  customerId: string;
  customer?: {
    id: string;
    businessName: string;
  };
  aiProcessed: boolean;
  reviewStatus: string;
  confidenceScore?: number;
  extractedData?: ParsedBusinessProfile;
  uploadedBy: string;
  createdAt: string;
}

interface Customer {
  id: string;
  businessName: string;
  taxId: string;
}

const statusConfig = {
  PENDING: { label: 'รอตรวจสอบ', icon: Clock, color: 'bg-muted text-muted-foreground', animate: false },
  APPROVED: { label: 'สมบูรณ์', icon: CheckCircle, color: 'bg-success text-success-foreground', animate: false },
  REJECTED: { label: 'ไม่สมบูรณ์', icon: XCircle, color: 'bg-destructive text-destructive-foreground', animate: false },
};

const fileTypeConfig = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-success', label: 'Excel' },
  'application/vnd.ms-excel': { icon: FileSpreadsheet, color: 'text-success', label: 'Excel' },
  'application/pdf': { icon: FileType, color: 'text-destructive', label: 'PDF' },
  'image/jpeg': { icon: Image, color: 'text-info', label: 'Image' },
  'image/jpg': { icon: Image, color: 'text-info', label: 'Image' },
  'image/png': { icon: Image, color: 'text-info', label: 'Image' },
};

const getFileTypeConfig = (mimeType: string) => {
  return fileTypeConfig[mimeType as keyof typeof fileTypeConfig] || { icon: FileText, color: 'text-muted-foreground', label: 'File' };
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Documents() {
  const { currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [uploadReviewData, setUploadReviewData] = useState<{ documentId: string; parsedData: ParsedBusinessProfile } | null>(null);
  const { page, pageSize, setPage, setPageSize, getPaginationParams } = usePagination();

  // Fetch documents with auto-refresh when processing
  const { data: documentsData, isLoading: isLoadingDocs, refetch: refetchDocs } = useQuery({
    queryKey: ['documents', { page, pageSize, branch: branchFilter }],
    queryFn: async () => {
      const response = await documentsApi.list({
        ...getPaginationParams(),
        branchId: isAdmin && branchFilter !== 'all' ? branchFilter : undefined,
      });
      // Handle wrapped response: { success: true, data: { documents: [], total: 0 } }
      if (response.error) {
        throw response.error;
      }
      return response.data || response;
    },
    refetchInterval: false,
  });

  // Fetch branches for admin filter
  const { data: branchesData } = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: async () => {
      const result = await branchesApi.getAll();
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: isAdmin,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const branches: Branch[] = Array.isArray(branchesData) ? branchesData : [];

  // Fetch customers for filter and upload
  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers', { branch: branchFilter }],
    queryFn: async () => {
      const response = await customersApi.list({
        page: 1,
        limit: 100,
        branchId: isAdmin && branchFilter !== 'all' ? branchFilter : undefined,
      });
      
      // Handle case where no customers exist (should return empty data, not error)
      if (response.error) {
        // If it's a 400 error and likely means no customers exist, return empty data
        if (response.error.status === 400) {
          return {
            customers: [],
            total: 0,
            page: 1,
            limit: 100,
            totalPages: 1
          };
        }
        throw response.error;
      }
      return response.data || response;
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

  const documents = (documentsData as any)?.documents || [];
  const customers = (customersData as any)?.customers || [];
  
  // Get pagination info
  const totalItems = (documentsData as any)?.total || 0;
  const totalPages = (documentsData as any)?.totalPages || 1;

  const filteredDocs = documents.filter((doc: Document) => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.customer?.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.reviewStatus === statusFilter;
    const matchesCustomer = customerFilter === 'all' || doc.customerId === customerFilter;
    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const handlePreview = async (doc: Document) => {
    if (!doc.extractedData) {
      toast.error('ไม่พบข้อมูลที่ parse จากเอกสาร');
      return;
    }
    // console.log('[Documents] Opening review modal with doc:', doc);
    // console.log('[Documents] extractedData:', doc.extractedData);
    setSelectedDoc(doc);
    setIsReviewModalOpen(true);
  };

  const handleReviewConfirm = async (
    editedData: ParsedBusinessProfile,
    action: 'create' | 'link',
    customerId?: string
  ) => {
    const documentId = selectedDoc?.id || uploadReviewData?.documentId;
    if (!documentId) return;

    try {
      let targetCustomerId = customerId;

      if (action === 'create') {
        // Validate and fix the business profile data structure
        const validatedData = {
          ...editedData,
          companyInfo: {
            ...editedData.companyInfo,
            companyName: editedData.companyInfo?.companyName || 'ไม่ระบุชื่อบริษัท',
            registrationNumber: editedData.companyInfo?.registrationNumber || editedData.companyInfo?.taxId || '0000000000000',
            taxId: editedData.companyInfo?.taxId || editedData.companyInfo?.registrationNumber || '0000000000000',
            phone: editedData.companyInfo?.phone || '-',
            address: editedData.companyInfo?.address || 'ไม่ระบุที่อยู่',
          }
        };

        const { data: newCustomer, error: customerError } = await customersApi.createFromDocument({
          documentId: documentId,
          businessProfile: validatedData,
        });

        if (customerError || !newCustomer) {
          const steps = Array.isArray(customerError?.nextSteps) ? customerError!.nextSteps : [];
          toast.error(customerError?.message || 'ไม่สามารถสร้างลูกค้าได้', {
            description: steps.length ? steps.map((s) => `• ${s}`).join('\n') : undefined,
          });
          return;
        }

        targetCustomerId = newCustomer.id;
        toast.success(`สร้างลูกค้าใหม่สำเร็จ: ${validatedData.companyInfo.companyName}`);
      } else if (action === 'link' && customerId) {
        const { error: linkError } = await documentsApi.linkToCustomer(
          documentId,
          customerId,
          editedData
        );

        if (linkError) {
          throw new Error(linkError.message);
        }

        toast.success("ผูกเอกสารกับลูกค้าสำเร็จ");
      }

      // Save business profile to new database tables
      if (targetCustomerId) {
        const { data: profileData, error: profileError } = await businessProfilesApi.create({
          customerId: targetCustomerId,
          parsedData: editedData,
          documentId: documentId,
          action,
          existingCustomerId: action === 'link' ? customerId : undefined,
        });

        if (profileError) {
          console.error('[Documents] Business profile save error:', profileError);
          // Don't throw - customer is already created, just log the error
          toast.warning("บันทึกข้อมูลลูกค้าสำเร็จ แต่ไม่สามารถบันทึก Business Profile ได้");
        } else if (profileData) {
          // console.log('[Documents] Business profile saved successfully:', profileData);
          toast.success("บันทึกข้อมูลลูกค้าและ Business Profile สำเร็จ");
        }
      }

      setIsReviewModalOpen(false);
      setSelectedDoc(null);
      setUploadReviewData(null);
      refetchDocs();
    } catch (error) {
      console.error("Review confirm error:", error);
      
      // Show user-friendly error dialog
      showUserFriendlyError(error);
    }
  };

  const handleSaveDraft = async (editedData: ParsedBusinessProfile) => {
    const documentId = selectedDoc?.id || uploadReviewData?.documentId;
    if (!documentId) return;
    
    try {
      const { error } = await documentsApi.saveParsedData(documentId, editedData);
      if (error) throw new Error(error.message);
      
      // Update local state if needed
      refetchDocs();
    } catch (error) {
      console.error("Save draft error:", error);
      throw error;
    }
  };

  const handleReviewCancel = () => {
    setIsReviewModalOpen(false);
    setSelectedDoc(null);
    setUploadReviewData(null);
  };

  const handleDownload = async (doc: Document) => {
    try {
      toast.info('กำลังดาวน์โหลด...');
      // TODO: Implement download
    } catch (error) {
      toast.error('ไม่สามารถดาวน์โหลดได้');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบเอกสารนี้?')) {
      return;
    }

    try {
      await documentsApi.delete(docId);
      toast.success('ลบเอกสารสำเร็จ');
      refetchDocs();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('ไม่สามารถลบเอกสารได้');
    }
  };

  const completedCount = (documents as any[]).filter((d: Document) => d.reviewStatus === 'APPROVED').length;
  const processingCount = 0;
  const errorCount = (documents as any[]).filter((d: Document) => d.reviewStatus === 'REJECTED').length;

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'จัดการเอกสาร' }]}>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">จัดการเอกสาร</h1>
          <p className="text-white">
            อัพโหลดเอกสารและวิเคราะห์ข้อมูลจากไฟล์ Excel
          </p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          อัพโหลดเอกสาร
        </Button>
      </div>

      {/* Stats Cards */}
      <DocumentStatsCards
        totalCount={documents.length}
        completedCount={completedCount}
        processingCount={processingCount}
        errorCount={errorCount}
        isLoading={isLoadingDocs}
      />

      {/* Documents Table */}
      <Card>
        <CardHeader className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>รายการเอกสาร</CardTitle>
              <CardDescription>
                {isLoadingDocs ? 'กำลังโหลด...' : `แสดง ${filteredDocs.length} จาก ${documents.length} รายการ`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDocs()}
              disabled={isLoadingDocs}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingDocs ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </div>
          
          <div className="flex flex-col gap-3 lg:flex-row lg:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อไฟล์, ลูกค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            {isAdmin && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full lg:w-[200px] bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="ทุกสาขา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสาขา</SelectItem>
                  {branches.map((branch: Branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-full lg:w-[200px] bg-primary text-white border-primary hover:bg-primary/90">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="ลูกค้าทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ลูกค้าทั้งหมด</SelectItem>
                {customers.map((customer: Customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px] bg-primary text-white border-primary hover:bg-primary/90">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="สถานะทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                <SelectItem value="APPROVED">สมบูรณ์</SelectItem>
                <SelectItem value="PENDING">รอตรวจสอบ</SelectItem>
                <SelectItem value="REJECTED">ไม่สมบูรณ์</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDocs ? (
            <div className="rounded-lg border overflow-hidden">
              <TableSkeleton rows={pageSize} columns={7} />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">ยังไม่มีเอกสาร</h3>
              <p className="text-muted-foreground mb-4">เริ่มต้นโดยการอัพโหลดเอกสารแรกของคุณ</p>
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                อัพโหลดเอกสาร
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead className="font-semibold">ไฟล์</TableHead>
                    <TableHead className="font-semibold">ลูกค้า</TableHead>
                    <TableHead className="font-semibold">ประเภท</TableHead>
                    <TableHead className="font-semibold">สถานะ</TableHead>
                    <TableHead className="font-semibold">ความสมบูรณ์</TableHead>
                    <TableHead className="font-semibold">วันที่อัพโหลด</TableHead>
                    <TableHead className="text-right font-semibold">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc: Document) => {
                    const fileConfig = getFileTypeConfig(doc.mimeType);
                    const FileIcon = fileConfig.icon;
                    const status = doc.reviewStatus || 'PENDING';
                    const StatusIcon = statusConfig[status as keyof typeof statusConfig]?.icon || Clock;
                    const statusStyle = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

                    return (
                      <TableRow key={doc.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                              <FileIcon className={`h-5 w-5 ${fileConfig.color}`} />
                            </div>
                            <div>
                              <p className="font-medium">{doc.fileName}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{doc.customer?.businessName || 'ไม่ระบุ'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.documentType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusStyle.color}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${statusStyle.animate ? 'animate-spin' : ''}`} />
                            {statusStyle.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {doc.confidenceScore ? (
                            <div className="flex items-center gap-2">
                              <Progress value={doc.confidenceScore} className="h-2 w-16" />
                              <span className="text-sm font-medium">{doc.confidenceScore}%</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{formatDate(doc.createdAt)}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(doc.reviewStatus === 'PENDING' || doc.extractedData) && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 border-primary text-primary hover:bg-primary/5 hidden md:flex"
                                onClick={() => handlePreview(doc)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1.5" />
                                ตรวจสอบข้อมูล
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handlePreview(doc)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  ตรวจสอบ/ดูรายละเอียด
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  ดาวน์โหลด
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(doc.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  ลบ
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {documentsData && totalItems > 0 && (
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>อัพโหลดเอกสาร</DialogTitle>
            <DialogDescription>
              เลือกลูกค้าและอัพโหลดไฟล์ Excel เพื่อ parse ข้อมูลอัตโนมัติ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer">ลูกค้า (ถ้าต้องการผูกเอกสารกับลูกค้าที่มีอยู่)</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="เลือกลูกค้า (ไม่บังคับ)" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCustomers ? (
                    <div className="p-4 text-center">
                      <Loader className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      ไม่พบลูกค้า
                    </div>
                  ) : (
                    <>
                      <SelectItem value="none">ไม่ระบุ (เลือกทีหลัง)</SelectItem>
                      {customers.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{customer.businessName}</span>
                            <span className="text-xs text-muted-foreground">
                              เลขประจำตัวผู้เสียภาษี: {customer.taxId}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                หากไม่เลือก คุณสามารถสร้างลูกค้าใหม่หรือผูกกับลูกค้าที่มีอยู่ได้หลังจาก parse เสร็จ
              </p>
            </div>

            {/* Document Upload Component */}
            <DocumentUpload
              customerId={selectedCustomerId && selectedCustomerId !== 'none' ? selectedCustomerId : undefined}
              onReviewRequest={(documentId, parsedData) => {
                // Close upload dialog and show review modal
                setIsUploadDialogOpen(false);
                setUploadReviewData({ documentId, parsedData });
                setIsReviewModalOpen(true);
              }}
              onUploadComplete={(documentId) => {
                setIsUploadDialogOpen(false);
                setSelectedCustomerId('');
                refetchDocs();
                toast.success('อัพโหลดเอกสารสำเร็จ');
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Review Modal */}
      {isReviewModalOpen && (
        <>
          {/* From document list */}
          {selectedDoc && selectedDoc.extractedData && (
            <DocumentReviewModal
              documentId={selectedDoc.id}
              parsedData={selectedDoc.extractedData}
              onConfirm={handleReviewConfirm}
              onSaveDraft={handleSaveDraft}
              onCancel={handleReviewCancel}
              existingCustomers={customers.map((c: Customer) => ({
                id: c.id,
                name: c.businessName || c.name || 'ไม่ระบุชื่อ',
                taxId: c.taxId,
              }))}
            />
          )}
          
          {/* From upload */}
          {uploadReviewData && (
            <DocumentReviewModal
              documentId={uploadReviewData.documentId}
              parsedData={uploadReviewData.parsedData}
              onConfirm={handleReviewConfirm}
              onSaveDraft={handleSaveDraft}
              onCancel={() => {
                setIsReviewModalOpen(false);
                setUploadReviewData(null);
                refetchDocs();
              }}
              existingCustomers={customers.map((c: Customer) => ({
                id: c.id,
                name: c.businessName || c.name || 'ไม่ระบุชื่อ',
                taxId: c.taxId,
              }))}
            />
          )}
        </>
      )}

      </div>
    </DashboardLayout>
  );
}
