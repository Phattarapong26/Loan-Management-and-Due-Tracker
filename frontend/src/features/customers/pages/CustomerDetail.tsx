
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { customersApi, contactLogsApi, lineApi, loansApi, documentsApi } from '@/shared/lib/api-endpoints';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { DetailPageSkeleton } from '@/shared/components/skeletons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText,
  MessageSquare,
  Link as LinkIcon,
  Link2,
  Calendar,
  CreditCard,
  Plus,
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Building2,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { LineAuditDialog } from '@/features/users/components/LineAuditDialog';
import { UserAvatar } from '@/shared/components/ui/user-avatar';

// Use API types as base and define UI-compatible types with index signatures
import type { Customer as APICustomer, Loan as APILoan, ContactLog as APIContactLog } from '@/shared/lib/api-endpoints';

// Import utility functions
import { normalizeExtractedData, sanitizeDates } from '../utils/normalize-customer';

// Import editable section components
import { CustomerOverviewSection } from '../components/sections/CustomerOverviewSection';
import { CompanyInfoSection } from '../components/sections/CompanyInfoSection';
import { ShareholdersSection } from '../components/sections/ShareholdersSection';
import { LoanSummarySection } from '../components/sections/LoanSummarySection';
import type { ParsedBusinessProfile } from '@/features/documents/utils/parsers/excel-parser';
import { FinancialSection } from '../components/sections/FinancialSection';
import { CreditBureauSection } from '../components/sections/CreditBureauSection';
import { BankStatementSection } from '../components/sections/BankStatementSection';
import { CollateralSection } from '../components/sections/CollateralSection';
import { ContactLogsSection } from '../components/sections/ContactLogsSection';
import { InvestmentSection } from '../components/sections/InvestmentSection';
import { WorkingCapitalSection } from '../components/sections/WorkingCapitalSection';
import { RevenueProjectionSection } from '../components/sections/RevenueProjectionSection';
import { DSCRSection } from '../components/sections/DSCRSection';
import { ProductSection } from '../components/sections/ProductSection';
import { VATSection } from '../components/sections/VATSection';
import { RecommendationSection } from '../components/sections/RecommendationSection';
import { DocumentUpload } from '../../documents/components/documents/DocumentUpload';
import { QuickStatsCards } from '../components/QuickStatsCards';

const methodIcons = { phone: Phone, line: MessageSquare, email: Mail, visit: MapPin };
const methodLabels = { phone: 'โทรศัพท์', line: 'LINE', email: 'อีเมล', visit: 'เยี่ยมเยือน' };

// Format functions - defined outside component to avoid recreation
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(num);
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLinkLineDialogOpen, setIsLinkLineDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [lineAuditDialogOpen, setLineAuditDialogOpen] = useState(false);
  const [qrData, setQrData] = useState<{ token: string; qrCode: string; expiresAt: Date } | null>(null);
  const [contactForm, setContactForm] = useState({ method: '', summary: '', result: '' });
  const [activeTab, setActiveTab] = useState('dashboard');

  // Fetch customer data
  const { data: customerData, isLoading: isLoadingCustomer, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await customersApi.getById(id || '');
      const rawData = res.data as APICustomer;
      
      // Normalize and sanitize the data
      const normalized = {
        ...rawData,
        createdAt: typeof rawData.createdAt === 'string' 
          ? rawData.createdAt
          : rawData.createdAt instanceof Date 
            ? rawData.createdAt.toISOString()
            : new Date().toISOString(),
        registrationDate: typeof rawData.registrationDate === 'string'
          ? rawData.registrationDate
          : rawData.registrationDate instanceof Date
            ? rawData.registrationDate.toISOString()
            : undefined,
        // Normalize extractedData to ensure all fields exist
        extractedData: normalizeExtractedData(rawData.aiExtractedData),
      };
      
      return sanitizeDates(normalized) as APICustomer;
    },
    enabled: !!id,
  });

  // Fetch contact logs for this customer
  const { data: contactLogsData } = useQuery({
    queryKey: ['contactLogs', id],
    queryFn: async () => {
       const res = await contactLogsApi.list({ customerId: id });
       return res.data;
    },
    enabled: !!id,
  });

  // Fetch loans for this customer
  const { data: loansData } = useQuery({
    queryKey: ['customerLoans', id],
    queryFn: async () => {
      const res = await loansApi.list({ customerId: id });
      return res.data;
    },
    enabled: !!id,
    staleTime: 0, // Always refetch when customer changes
    gcTime: 0, // Don't cache between customers
  });

  const { data: documentsData, refetch: refetchDocuments } = useQuery({
    queryKey: ['customer-documents', id],
    queryFn: async () => {
      const res = await documentsApi.list({ customerId: id || '' });
      // Handle wrapped response
      const responseData = res.data;
      if (responseData && typeof responseData === 'object' && 'documents' in responseData) {
        return responseData as { documents: any[]; total: number; page: number; limit: number; totalPages: number };
      }
      return { documents: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    },
    enabled: !!id,
  });

  // Generate QR code mutation
  const generateQRMutation = useMutation({
    mutationFn: (customerId: string) => lineApi.generateQR(customerId),
    onSuccess: (response) => {
      setQrData({
        token: response.data.token,
        qrCode: response.data.qrCodeUrl,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      });
      setIsLinkLineDialogOpen(true);
    },
    onError: (error: unknown) => {
      console.error('[generateQR] Full error:', error);
      const message = (error as Error)?.message ?? (typeof error === 'string' ? error : 'An error occurred while generating QR code');
      console.error('[generateQR] Error message:', message);
      toast.error('ไม่สามารถสร้าง QR Code ได้: ' + message);
    },
  });

  // Poll QR status
  useEffect(() => {
    if (!qrData?.token) return;

    const interval = setInterval(async () => {
      try {
        const response = await lineApi.checkQRStatus(qrData.token);

        // Check if response has data
        if (!response.data) {
          console.error('No data in QR status response');
          return;
        }

        const status = response.data;

        if (status.status === 'used') {
          toast.success('เชื่อมต่อ LINE สำเร็จ!');
          setIsLinkLineDialogOpen(false);
          setQrData(null);
          clearInterval(interval);
          // Refresh customer data
          refetch();
        } else if (status.status === 'expired') {
          toast.error('รหัสลงทะเบียนหมดอายุแล้ว');
          setQrData(null);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error checking QR status:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [qrData?.token, refetch]);

  // Use normalized customer data
  const customer = customerData;
  
  // Transform API contact logs to component format - memoized
  const contactLogsForSection = useMemo(() => 
    (contactLogsData?.contactLogs || []).map((log: APIContactLog) => ({
      id: log.id,
      date: typeof log.contactDate === 'string'
        ? new Date(log.contactDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        : log.contactDate && typeof log.contactDate === 'object' && 'toLocaleDateString' in log.contactDate
          ? (log.contactDate as Date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
          : String(log.contactDate),
      summary: log.notes,
      result: log.contactStatus,
      method: log.contactMethod,
      officer: log.officerId,
    })), [contactLogsData?.contactLogs]);
  
  const loans: APILoan[] = (loansData?.loans || []) as APILoan[];

  // Use normalized extractedData
  const extractedData = customer?.aiExtractedData as ParsedBusinessProfile | undefined;
  const hasExtractedData = !!extractedData;

  // Show loading if no customer data
  if (!customer && !isLoadingCustomer) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'ลูกค้า', href: '/customers' }, { label: 'ไม่พบข้อมูล' }]}>
        <div className="flex flex-col justify-center items-center h-96">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">ไม่พบข้อมูลลูกค้า</p>
          <Button className="mt-4" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับไปหน้ารายการลูกค้า
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate payment statistics from loans - memoized
  const paymentStats = useMemo(() => {
    const paidInstallments = loans.reduce((sum, loan) => {
      const paidCount = loan.paymentSchedule?.filter(p => p.status === 'PAID').length || 0;
      return sum + paidCount;
    }, 0);
    
    const totalInstallments = loans.reduce((sum, loan) => {
      return sum + (loan.paymentSchedule?.length || 0);
    }, 0);

    return { paidInstallments, totalInstallments };
  }, [loans]);

  // Document stats - differentiate completed vs total
  const completedDocs = documentsData?.documents?.filter(
    (d: any) => d.reviewStatus === 'APPROVED'
  ).length || 0;
  const totalDocs = documentsData?.documents?.length || 0;

  // Document type statistics - memoized because of multiple filter operations
  const documentTypeStats = useMemo(() => {
    if (!documentsData?.documents) return { businessProfile: 0, financial: 0, others: 0 };
    
    const docs = documentsData.documents;
    return {
      businessProfile: docs.filter(d => d.documentType === 'BUSINESS_PROFILE').length,
      financial: docs.filter(d => d.documentType === 'FINANCIAL').length,
      others: docs.filter(d => !['BUSINESS_PROFILE', 'FINANCIAL'].includes(d.documentType)).length,
    };
  }, [documentsData?.documents]);

  // Working capital calculations - memoized because of complex reduce operations
  const workingCapitalTotals = useMemo(() => {
    if (!extractedData?.workingCapital) return { totalAssets: 0, totalLiabilities: 0 };
    
    const wc = extractedData.workingCapital;
    const totalAssets = (wc.accountsReceivable || 0) + 
                       (wc.inventory || 0) + 
                       ((wc.assets as any[])?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0);
    
    const totalLiabilities = (wc.accountsPayable || 0) + 
                            ((wc.liabilities as any[])?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0);
    
    return { totalAssets, totalLiabilities };
  }, [extractedData?.workingCapital]);

  // Revenue projection data - memoized because of complex array operations
  const revenueProjectionData = useMemo(() => {
    if (!extractedData?.revenueProjection) return { taxYears: [], projectionYears: [], rows: [] };
    
    return {
      taxYears: extractedData.revenueProjection.taxYears || [],
      projectionYears: extractedData.revenueProjection.projectionYears || [],
      rows: extractedData.revenueProjection.rows || [],
    };
  }, [extractedData?.revenueProjection]);

  // Total loan amount - memoized
  const totalLoanAmount = useMemo(() => 
    loans.reduce((sum, loan) => sum + (Number(loan.principal) || 0), 0), 
    [loans]);



  const handleGenerateQR = useCallback(() => {
    if (id) {
      generateQRMutation.mutate(id);
    }
  }, [id, generateQRMutation]);

  const handleAddContact = useCallback(() => {
    if (!contactForm.method || !contactForm.summary) {
      toast.error('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    toast.success('บันทึกการติดต่อสำเร็จ');
    setIsContactDialogOpen(false);
    setContactForm({ method: '', summary: '', result: '' });
  }, [contactForm.method, contactForm.summary]);

  if (isLoadingCustomer) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'ลูกค้า', href: '/customers' }, { label: 'กำลังโหลด...' }]}>
        <DetailPageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'ลูกค้า', href: '/customers' }, { label: customer.businessName }]}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-5 w-5 text-white" />
        </Button>
        <UserAvatar
          src={customer.avatar}
          name={customer.businessName}
          size="lg"
          className="h-14 w-14"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl lg:text-2xl font-bold text-white truncate">{customer.businessName}</h1>
            <Badge className={customer.status === 'ACTIVE' ? 'bg-success text-success-foreground' : 'bg-gray-100 text-gray-600 border-gray-200'}>
              {customer.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
            </Badge>
          </div>
          <p className="text-white text-sm">ทะเบียนนิติบุคคล: {customer.registrationNumber} | รหัส: {id}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {customer.lineId ? (
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" size="sm">
                <MessageSquare className="h-4 w-4 text-green-500" />
                LINE: {customer.lineId}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLineAuditDialogOpen(true)}>
                <Link2 className="h-4 w-4 mr-2" />
                ประวัติ LINE
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleGenerateQR} disabled={generateQRMutation.isPending}>
              {generateQRMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  สร้าง QR Code
                </>
              )}
            </Button>
          )}
          <Button size="sm" onClick={() => setIsContactDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            บันทึกติดต่อ
          </Button>
        </div>
      </div>


      {/* Quick Stats - Wave Background Design */}
      <QuickStatsCards
        totalLoanAmount={totalLoanAmount}
        paidInstallments={paymentStats.paidInstallments}
        totalInstallments={paymentStats.totalInstallments}
        completedDocs={completedDocs}
        totalDocs={totalDocs}
        formatCurrency={formatCurrency}
      />

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex items-center gap-1 bg-gray-200/50 p-1.5 rounded-xl w-full lg:w-fit overflow-x-auto h-auto border-0 [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="dashboard" className="px-3 md:px-5 py-2 text-xs font-bold rounded-xl whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#0065FB] data-[state=active]:shadow-md data-[state=inactive]:text-gray-500">
            ภาพรวม
          </TabsTrigger>
          <TabsTrigger value="overview" className="px-3 md:px-5 py-2 text-xs font-bold rounded-xl whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#0065FB] data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 relative">
            ข้อมูลกิจการ
            {hasExtractedData && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
          </TabsTrigger>
          <TabsTrigger value="loans" className="px-3 md:px-5 py-2 text-xs font-bold rounded-xl whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#0065FB] data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 relative">
            วงเงินสินเชื่อ
            {loans.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />}
          </TabsTrigger>
          <TabsTrigger value="financial" className="px-3 md:px-5 py-2 text-xs font-bold rounded-xl whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#0065FB] data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 relative">
            งบการเงิน
            {((extractedData?.financialStatements?.length || 0) > 0 || (extractedData?.balanceSheets?.length || 0) > 0) && 
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
          </TabsTrigger>
          <TabsTrigger value="creditbureau" className="px-3 md:px-5 py-2 text-xs font-bold rounded-xl whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#0065FB] data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 relative">
            ข้อมูลบูโร
            {(extractedData?.creditBureauReports?.length || 0) > 0 && 
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
          </TabsTrigger>
          <TabsTrigger value="statement" className="px-3 md:px-5 py-2 text-xs font-bold rounded-xl whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#0065FB] data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 relative">
            เดินบัญชี
            {(extractedData?.bankStatements?.length || 0) > 0 && 
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
          </TabsTrigger>
          <TabsTrigger value="collateral" className="px-3 md:px-5 py-2 text-xs font-bold rounded-xl whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#0065FB] data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 relative">
            หลักประกัน/ผู้ค้ำ
            {(extractedData?.collaterals?.length || 0) > 0 && 
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
          </TabsTrigger>
          <TabsTrigger value="documents" className="px-3 md:px-5 py-2 text-xs font-bold rounded-xl whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#0065FB] data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 relative">
            เอกสาร
            {(documentsData?.documents?.length || 0) > 0 && 
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full" />}
          </TabsTrigger>
          <TabsTrigger value="contacts" className="px-3 md:px-5 py-2 text-xs font-bold rounded-xl whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#0065FB] data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 relative">
            ติดตามลูกค้า
            {contactLogsForSection.length > 0 && 
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />}
          </TabsTrigger>
          <TabsTrigger value="insights" className="px-3 md:px-5 py-2 text-xs font-bold rounded-xl whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#0065FB] data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 relative">
            ข้อมูลเพิ่มเติม
            {extractedData?.recommendation && <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />}
          </TabsTrigger>
        </TabsList>

        {/* Tab: ภาพรวม (Dashboard) */}
        <TabsContent value="dashboard" className="space-y-6">

          <CustomerOverviewSection
            customer={customer as any}
            loans={loans as any}
            formatCurrency={formatCurrency}
            onEditEntity={() => setActiveTab('overview')}
          />
        </TabsContent>

        {/* Tab: ข้อมูลกิจการ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Company Info (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <CompanyInfoSection customer={customer as any} customerId={id || ''} />
            </div>
            {/* Right Column - Shareholders (1/3 width) */}
            <div className="space-y-6">
              <div className="sticky top-6 space-y-6">
                <ShareholdersSection aiData={extractedData} hasAIData={hasExtractedData} customerId={id || ''} />
              </div>
            </div>
          </div>

          {/* Full Width Section - Products & Services */}
          <ProductSection aiData={extractedData} hasAIData={hasExtractedData} customerId={id || ''} />
        </TabsContent>

        {/* Tab: วงเงินสินเชื่อ */}
        <TabsContent value="loans" className="space-y-6">
          {/* Loan Summary Section - รวมข้อมูลจาก AI และ Database */}
          <LoanSummarySection 
            aiData={extractedData} 
            hasAIData={hasExtractedData} 
            customerId={id || ''} 
            formatCurrency={formatCurrency}
            databaseLoans={loans}
          />

          {/* Financial Analysis Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            <InvestmentSection aiData={extractedData} hasAIData={hasExtractedData} customerId={id || ''} formatCurrency={formatCurrency} />
            <DSCRSection aiData={extractedData} hasAIData={hasExtractedData} customerId={id || ''} formatCurrency={formatCurrency} />
          </div>
        </TabsContent>

        {/* Tab: งบการเงิน */}
        <TabsContent value="financial" className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">งบการเงินและภาษี</h3>
              <p className="text-sm text-muted-foreground">งบกำไรขาดทุน งบดุล และข้อมูลภาษีมูลค่าเพิ่ม</p>
            </div>
            {hasExtractedData && (
              <Badge variant="outline" className="gap-1.5 text-primary border-primary/20 bg-primary/5">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                วิเคราะห์โดยระบบ
              </Badge>
            )}
          </div>

          {/* Financial Statements */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-blue-500 rounded-full" />
              <h4 className="font-bold text-foreground">งบการเงิน</h4>
              <Badge variant="secondary" className="text-xs">
                {(extractedData?.financialStatements?.length || 0) + (extractedData?.balanceSheets?.length || 0)} งวด
              </Badge>
            </div>
            <FinancialSection aiData={extractedData} hasAIData={hasExtractedData} customerId={id || ''} formatCurrency={formatCurrency} />
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* VAT Records */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-amber-500 rounded-full" />
              <h4 className="font-bold text-foreground">ภาษีมูลค่าเพิ่ม (ภพ.30)</h4>
              <Badge variant="secondary" className="text-xs">
                {extractedData?.vatRecords?.length || 0} รายการ
              </Badge>
            </div>
            <VATSection aiData={extractedData} hasAIData={hasExtractedData} customerId={id || ''} formatCurrency={formatCurrency} />
          </div>

          {/* Divider */}
          <div className="border-t border-border bg-white" />

          {/* Working Capital Table */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-green-500 rounded-full" />
              <h4 className="font-bold text-foreground">เงินทุนหมุนเวียน (Working Capital)</h4>
            </div>
            
            <div className="overflow-x-auto bg-white rounded-xl border border-border bg-white">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-white">
                    <th className="border border-border p-3 text-left font-bold min-w-[200px] sticky left-0 bg-white z-10">
                      รายการ
                    </th>
                    <th className="border border-border p-3 text-center font-bold min-w-[120px]">
                      จำนวนเงิน (บาท)
                    </th>
                    <th className="border border-border p-3 text-center font-bold min-w-[120px]">
                      หมายเหตุ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Assets Section */}
                  <tr className="bg-white font-semibold">
                    <td className="border border-border p-3 font-bold sticky left-0 bg-green-100/50 z-10">
                      สินทรัพย์หมุนเวียน
                    </td>
                    <td className="border border-border p-2 text-right font-bold text-green-700">
                      {formatCurrency(workingCapitalTotals.totalAssets)}
                    </td>
                    <td className="border border-border p-2 text-center text-muted-foreground">
                      Current Assets
                    </td>
                  </tr>
                  
                  <tr className="hover:bg-green-50/30">
                    <td className="border border-border p-2 pl-8 text-sm sticky left-0 bg-background z-10">
                      • ลูกหนี้การค้า
                    </td>
                    <td className="border border-border p-2 text-right text-green-600">
                      {formatCurrency(extractedData?.workingCapital?.accountsReceivable || 0)}
                    </td>
                    <td className="border border-border p-2 text-center text-xs text-muted-foreground">
                      Accounts Receivable
                    </td>
                  </tr>
                  
                  <tr className="hover:bg-green-50/30">
                    <td className="border border-border p-2 pl-8 text-sm sticky left-0 bg-background z-10">
                      • สินค้าคงเหลือ
                    </td>
                    <td className="border border-border p-2 text-right text-green-600">
                      {formatCurrency(extractedData?.workingCapital?.inventory || 0)}
                    </td>
                    <td className="border border-border p-2 text-center text-xs text-muted-foreground">
                      Inventory
                    </td>
                  </tr>
                  
                  {/* Additional assets */}
                  {(extractedData?.workingCapital?.assets as any[] || []).map((asset: any, idx: number) => (
                    <tr key={`asset-${idx}`} className="hover:bg-white">
                      <td className="border border-border p-2 pl-8 text-sm sticky left-0 bg-white z-10">
                        • {asset.label || `รายการที่ ${idx + 1}`}
                      </td>
                      <td className="border border-border p-2 text-right text-green-600">
                        {formatCurrency(asset.amount || 0)}
                      </td>
                      <td className="border border-border p-2 text-center text-xs text-muted-foreground">
                        -
                      </td>
                    </tr>
                  ))}
                  
                  {/* Liabilities Section */}
                  <tr className="bg-red-100/50 font-semibold">
                    <td className="border border-border p-3 font-bold sticky left-0 bg-red-100/50 z-10">
                      หนี้สินหมุนเวียน
                    </td>
                    <td className="border border-border p-2 text-right font-bold text-red-700">
                      {formatCurrency(workingCapitalTotals.totalLiabilities)}
                    </td>
                    <td className="border border-border p-2 text-center text-muted-foreground">
                      Current Liabilities
                    </td>
                  </tr>
                  
                  <tr className="hover:bg-red-50/30">
                    <td className="border border-border p-2 pl-8 text-sm sticky left-0 bg-background z-10">
                      • เจ้าหนี้การค้า
                    </td>
                    <td className="border border-border p-2 text-right text-red-600">
                      {formatCurrency(extractedData?.workingCapital?.accountsPayable || 0)}
                    </td>
                    <td className="border border-border p-2 text-center text-xs text-muted-foreground">
                      Accounts Payable
                    </td>
                  </tr>
                  
                  {/* Additional liabilities */}
                  {(extractedData?.workingCapital?.liabilities as any[] || []).map((liability: any, idx: number) => (
                    <tr key={`liability-${idx}`} className="hover:bg-red-50/30">
                      <td className="border border-border p-2 pl-8 text-sm sticky left-0 bg-white z-10">
                        • {liability.label || `รายการที่ ${idx + 1}`}
                      </td>
                      <td className="border border-border p-2 text-right text-red-600">
                        {formatCurrency(liability.amount || 0)}
                      </td>
                      <td className="border border-border p-2 text-center text-xs text-muted-foreground">
                        -
                      </td>
                    </tr>
                  ))}
                  
                  {/* Total Working Capital Needed */}
                  <tr className="bg-blue-100/50 font-bold">
                    <td className="border border-border p-3 font-bold sticky left-0 bg-blue-100/50 z-10">
                      เงินทุนที่ต้องการรวม
                    </td>
                    <td className="border border-border p-2 text-right font-bold text-blue-700">
                      {formatCurrency(extractedData?.workingCapital?.totalNeeded || 0)}
                    </td>
                    <td className="border border-border p-2 text-center text-muted-foreground">
                      Total Working Capital Needed
                    </td>
                  </tr>
                  
                  {/* Funding Sources */}
                  <tr className="bg-yellow-100/50 font-semibold">
                    <td className="border border-border p-3 font-bold sticky left-0 bg-yellow-100/50 z-10">
                      แหล่งเงินทุน
                    </td>
                    <td className="border border-border p-2 text-right font-bold text-yellow-700">
                      {formatCurrency(
                        (extractedData?.workingCapital?.existingCredit || 0) +
                        (extractedData?.workingCapital?.newCredit || 0)
                      )}
                    </td>
                    <td className="border border-border p-2 text-center text-muted-foreground">
                      Funding Sources
                    </td>
                  </tr>
                  
                  <tr className="hover:bg-yellow-50/30">
                    <td className="border border-border p-2 pl-8 text-sm sticky left-0 bg-background z-10">
                      • วงเงินเดิมที่มีอยู่
                    </td>
                    <td className="border border-border p-2 text-right text-yellow-600">
                      {formatCurrency(extractedData?.workingCapital?.existingCredit || 0)}
                    </td>
                    <td className="border border-border p-2 text-center text-xs text-muted-foreground">
                      Existing Credit
                    </td>
                  </tr>
                  
                  <tr className="hover:bg-yellow-50/30">
                    <td className="border border-border p-2 pl-8 text-sm sticky left-0 bg-background z-10">
                      • วงเงินที่เสนอครั้งนี้
                    </td>
                    <td className="border border-border p-2 text-right text-yellow-600">
                      {formatCurrency(extractedData?.workingCapital?.newCredit || 0)}
                    </td>
                    <td className="border border-border p-2 text-center text-xs text-muted-foreground">
                      New Credit Proposal
                    </td>
                  </tr>
                  
                  <tr className="bg-white font-bold">
                    <td className="border border-border p-3 font-bold sticky left-0 bg-purple-100/50 z-10">
                      ส่วนต่าง/คงเหลือ
                    </td>
                    <td className="border border-border p-2 text-right font-bold text-purple-700">
                      {formatCurrency(extractedData?.workingCapital?.remaining || 0)}
                    </td>
                    <td className="border border-border p-2 text-center text-muted-foreground">
                      Remaining Balance
                    </td>
                  </tr>
                  
                  {/* Empty state for Working Capital */}
                  {(!extractedData?.workingCapital?.accountsReceivable && 
                    !extractedData?.workingCapital?.inventory && 
                    !extractedData?.workingCapital?.accountsPayable && 
                    (!extractedData?.workingCapital?.assets?.length) && 
                    (!extractedData?.workingCapital?.liabilities?.length)) && (
                    <tr>
                      <td colSpan={3} className="border border-border p-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                            <DollarSign className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground mb-1">ไม่พบข้อมูลเงินทุนหมุนเวียน</h3>
                            <p className="text-sm">ยังไม่มีข้อมูลสินทรัพย์และหนี้สินหมุนเวียน</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border my-8" />

          {/* Revenue Projection Table */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-blue-500 rounded-full" />
              <h4 className="font-bold text-foreground">งบการเงินสรรพากรประมาณการ (Revenue Projection)</h4>
            </div>
            
            {/* Check if we have detailed revenue projection data */}
            {revenueProjectionData.rows.length ? (
              <div className="overflow-x-auto rounded-xl border border-border bg-white">
                <div className="min-w-[800px]">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      {(() => {
                        const taxYears = revenueProjectionData.taxYears;
                        const projectionYears = revenueProjectionData.projectionYears;
                        
                        return (
                          <>
                            {/* Row 1: Section headers */}
                            <tr className="bg-white">
                              <th rowSpan={2} className="border border-border p-3 text-left font-bold min-w-[200px] sticky left-0 bg-white z-10">
                                รายการ
                              </th>
                              {taxYears.length > 0 && (
                                <th colSpan={taxYears.length * 2} className="border border-border p-3 text-center font-bold">
                                  งบการเงินสรรพากร
                                </th>
                              )}
                              {projectionYears.length > 0 && (
                                <th colSpan={projectionYears.length * 2} className="border border-border p-3 text-center font-bold bg-blue-50">
                                  ประมาณการ
                                </th>
                              )}
                            </tr>
                            
                            {/* Row 2: Year headers */}
                            <tr className="bg-muted/30">
                              {taxYears.map((year, idx) => (
                                <React.Fragment key={`tax-year-${idx}`}>
                                  <th className="border border-border p-2 text-center font-medium min-w-[100px]">
                                    <div>{year.year}</div>
                                    {year.period && <div className="text-[10px] text-muted-foreground">{year.period}</div>}
                                  </th>
                                  <th className="border border-border p-2 text-center font-medium min-w-[60px]">%</th>
                                </React.Fragment>
                              ))}
                              {projectionYears.map((year, idx) => (
                                <React.Fragment key={`proj-year-${idx}`}>
                                  <th className="border border-border p-2 text-center font-medium min-w-[100px] bg-blue-50">
                                    <div>{year.year}</div>
                                    {year.period && <div className="text-[10px] text-muted-foreground">{year.period}</div>}
                                  </th>
                                  <th className="border border-border p-2 text-center font-medium min-w-[60px] bg-blue-50">%</th>
                                </React.Fragment>
                              ))}
                            </tr>
                          </>
                        );
                      })()}
                    </thead>
                    
                    <tbody>
                      {revenueProjectionData.rows.map((row: any, idx: number) => (
                        <tr key={`revenue-row-${idx}`} className={`hover:bg-blue-50/30 ${
                          row.rowType === 'total' ? 'bg-yellow-50/50 font-semibold' :
                          row.rowType === 'ebitda' ? 'bg-blue-50/50 font-medium' :
                          row.rowType === 'profit' ? 'bg-green-50/50' :
                          row.rowType === 'debt' ? 'bg-red-50/30' :
                          row.rowType === 'dscr' ? 'bg-purple-50/50 font-medium' :
                          row.rowType === 'header' ? 'bg-gray-100 font-bold' : ''
                        }`}>
                          <td 
                            className="border border-border p-2 text-sm sticky left-0 bg-background z-10"
                            style={{ paddingLeft: `${(row.indent || 0) * 16 + 8}px` }}
                          >
                            {row.label}
                          </td>
                          
                          {/* Tax year data */}
                          {(row.taxData || []).map((value: number, colIdx: number) => (
                            <React.Fragment key={`tax-${idx}-${colIdx}`}>
                              <td className="border border-border p-1">
                                <div className="h-7 px-2 text-xs text-right flex items-center justify-end">
                                  {value ? formatCurrency(value) : ''}
                                </div>
                              </td>
                              <td className="border border-border p-1">
                                <div className="h-7 px-2 text-xs text-right flex items-center justify-end">
                                  {row.taxPercent && row.taxPercent[colIdx] ? 
                                    `${(row.taxPercent[colIdx] * 100).toFixed(1)}%` : ''}
                                </div>
                              </td>
                            </React.Fragment>
                          ))}
                          
                          {/* Projection data */}
                          {(row.projectionData || []).map((value: number, colIdx: number) => (
                            <React.Fragment key={`proj-${idx}-${colIdx}`}>
                              <td className="border border-border p-1 bg-blue-50/30">
                                <div className="h-7 px-2 text-xs text-right flex items-center justify-end">
                                  {value ? formatCurrency(value) : ''}
                                </div>
                              </td>
                              <td className="border border-border p-1 bg-blue-50/30">
                                <div className="h-7 px-2 text-xs text-right flex items-center justify-end">
                                  {row.projectionPercent && row.projectionPercent[colIdx] ? 
                                    `${(row.projectionPercent[colIdx] * 100).toFixed(1)}%` : ''}
                                </div>
                              </td>
                            </React.Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : extractedData?.revenueProjection?.monthlyProjections?.length ? (
              /* Legacy monthly projections table */
              <div className="overflow-x-auto rounded-xl border border-border bg-white">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border p-3 text-left font-bold min-w-[150px] sticky left-0 bg-muted/50 z-10">
                        เดือน
                      </th>
                      <th className="border border-border p-3 text-center font-bold min-w-[120px]">
                        รายได้
                      </th>
                      <th className="border border-border p-3 text-center font-bold min-w-[120px]">
                        ต้นทุน
                      </th>
                      <th className="border border-border p-3 text-center font-bold min-w-[120px]">
                        กำไร
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(extractedData?.revenueProjection?.monthlyProjections as any[] || []).map((month: any, idx: number) => {
                      const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                      return (
                        <tr key={`month-${idx}`} className="hover:bg-blue-50/30">
                          <td className="border border-border p-2 text-sm sticky left-0 bg-background z-10">
                            {monthNames[month.month - 1] || `เดือนที่ ${month.month}`}
                          </td>
                          <td className="border border-border p-2 text-right text-blue-600">
                            {formatCurrency(month.projectedRevenue || 0)}
                          </td>
                          <td className="border border-border p-2 text-right text-orange-600">
                            {formatCurrency(month.projectedCost || 0)}
                          </td>
                          <td className="border border-border p-2 text-right font-medium text-green-600">
                            {formatCurrency(month.projectedProfit || 0)}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Monthly totals */}
                    <tr className="bg-blue-100/50 font-bold">
                      <td className="border border-border p-3 font-bold sticky left-0 bg-blue-100/50 z-10">
                        รวมประมาณการทั้งปี
                      </td>
                      <td className="border border-border p-2 text-right font-bold text-blue-700">
                        {formatCurrency(extractedData?.revenueProjection?.annualTotal?.totalRevenue || 0)}
                      </td>
                      <td className="border border-border p-2 text-right font-bold text-orange-700">
                        {formatCurrency(extractedData?.revenueProjection?.annualTotal?.totalCost || 0)}
                      </td>
                      <td className="border border-border p-2 text-right font-bold text-green-700">
                        {formatCurrency(extractedData?.revenueProjection?.annualTotal?.totalProfit || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              /* Empty state for Revenue Projection */
              <div className="overflow-x-auto rounded-xl border border-border bg-white">
                <div className="p-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-1">ไม่พบข้อมูลประมาณการ</h3>
                      <p className="text-sm">ยังไม่มีข้อมูลประมาณการรายได้และงบการเงิน</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
           
        </TabsContent>

        {/* Tab: ข้อมูลบูโร */}
        <TabsContent value="creditbureau" className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">ข้อมูลเครดิตบูโร</h3>
              <p className="text-sm text-muted-foreground">ประวัติเครดิตและข้อมูลจากสำนักงานข้อมูลเครดิต</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {extractedData?.creditBureauReports?.length || 0} รายงาน
            </Badge>
          </div>

          <CreditBureauSection aiData={extractedData} hasAIData={hasExtractedData} customerId={id || ''} formatCurrency={formatCurrency} />
        </TabsContent>

        {/* Tab: เดินบัญชี */}
        <TabsContent value="statement" className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">รายการเดินบัญชี</h3>
              <p className="text-sm text-muted-foreground">ข้อมูลบัญชีธนาคารและการเคลื่อนไหวทางการเงิน</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {extractedData?.bankStatements?.length || 0} บัญชี
            </Badge>
          </div>

          <BankStatementSection aiData={extractedData} hasAIData={hasExtractedData} customerId={id || ''} formatCurrency={formatCurrency} />
        </TabsContent>

        {/* Tab: หลักประกัน/ผู้ค้ำ */}
        <TabsContent value="collateral" className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">หลักประกันและผู้ค้ำประกัน</h3>
              <p className="text-sm text-muted-foreground">ทรัพย์สินที่ใช้เป็นหลักประกันและข้อมูลผู้ค้ำ</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {extractedData?.collaterals?.length || 0} รายการ
            </Badge>
          </div>

          <CollateralSection aiData={extractedData} hasAIData={hasExtractedData} customerId={id || ''} formatCurrency={formatCurrency} />
        </TabsContent>

        {/* Tab: เอกสาร */}
        <TabsContent value="documents" className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">เอกสารทั้งหมด</h3>
              <p className="text-sm text-muted-foreground">รายการเอกสารที่อัปโหลดในระบบ</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-bold text-sm px-3 py-1">
                {completedDocs} ไฟล์
              </Badge>
              <Button size="sm" className="gap-2" onClick={() => setIsUploadDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                อัปโหลดเอกสาร
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              {documentsData?.documents && documentsData.documents.length > 0 ? (
                <div className="space-y-4">
                  {/* Document Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{documentsData.documents.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">ไฟล์ทั้งหมด</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {documentTypeStats.businessProfile}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Business Profile</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {documentTypeStats.financial}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">งบการเงิน</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {documentTypeStats.others}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">อื่นๆ</p>
                    </div>
                  </div>

                  {/* Document Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    {documentsData.documents.map((doc) => (
                      <div key={doc.id} className="p-4 rounded-xl border border-border bg-gradient-to-br from-white to-muted/5 hover:shadow-md transition-all group">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm truncate mb-1">{doc.fileName}</h4>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="text-[9px] h-5 w-fit">
                                {doc.documentType}
                              </Badge>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(doc.createdAt).toLocaleDateString('th-TH', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
                      <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                    <div>
                      <p className="font-medium text-lg mb-1">ยังไม่มีเอกสาร</p>
                      <p className="text-sm text-muted-foreground mb-6">อัปโหลดเอกสารเพื่อให้ระบบวิเคราะห์ข้อมูล</p>
                      <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        อัปโหลดเอกสารแรก
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: ติดตามลูกค้า */}
        <TabsContent value="contacts" className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">บันทึกการติดต่อ</h3>
              <p className="text-sm text-muted-foreground">ประวัติการติดต่อและติดตามลูกค้า</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-bold text-sm px-3 py-1">
                {contactLogsForSection.length} รายการ
              </Badge>
              <Button size="sm" className="gap-2" onClick={() => setIsContactDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                บันทึกการติดต่อ
              </Button>
            </div>
          </div>

          <ContactLogsSection
            contactLogs={contactLogsForSection}
            onAddContact={() => setIsContactDialogOpen(true)}
            methodIcons={methodIcons}
            methodLabels={methodLabels}
          />
        </TabsContent>
        {/* Tab: ข้อมูลเพิ่มเติม */}
        <TabsContent value="insights" className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">ข้อเสนอแนะและข้อมูลเพิ่มเติม</h3>
              <p className="text-sm text-muted-foreground">ความเห็นการอนุมัติและข้อมูลสำคัญอื่นๆ</p>
            </div>
            {extractedData?.recommendation && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                มีคำแนะนำ
              </Badge>
            )}
          </div>

          <RecommendationSection aiData={extractedData} hasAIData={hasExtractedData} customerId={id || ''} />
        </TabsContent>
      </Tabs>

      {/* Link LINE Dialog - QR Code - Kasikorn Bank Theme */}
      <Dialog open={isLinkLineDialogOpen} onOpenChange={setIsLinkLineDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#138F3E] to-[#0F7A34]">
                <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-[#138F3E]">เชื่อมต่อ LINE</DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  สแกน QR Code เพื่อเชื่อมต่อบัญชีอัตโนมัติ
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {qrData ? (
              <>
                {/* QR Code Section with K-Bank Style */}
                <div className="space-y-4">
                  {/* QR Code Container */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#138F3E]/10 to-[#0F7A34]/5 rounded-xl blur-xl"></div>
                    <div className="relative bg-white rounded-xl shadow-lg border-2 border-[#138F3E]/20 p-6">
                      <div className="flex justify-center">
                        <div className="bg-white p-4 rounded-xl shadow-inner">
                          <QRCodeSVG
                            value={qrData.qrCode}
                            size={240}
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

             

                  {/* Token Info Card */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-blue-700 mb-1">รหัสลงทะเบียน</p>
                        <p className="text-2xl font-mono font-bold text-blue-900 tracking-wider">
                          {qrData.token}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-2xl">🔐</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      ระบบจะส่งรหัสนี้อัตโนมัติเมื่อสแกน QR Code
                    </p>
                  </div>

                  {/* Status Section */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">รอการเชื่อมต่อ...</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-700">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span>หมดอายุใน 10 นาที</span>
                      </div>
                    </div>
                    <div className="text-xs text-amber-600 text-center">
                      หมดอายุ: {new Date(qrData.expiresAt).toLocaleString('th-TH', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-[#138F3E]/20 rounded-full blur-xl animate-pulse"></div>
                  <Loader2 className="relative h-12 w-12 animate-spin mx-auto text-[#138F3E]" />
                </div>
                <p className="text-sm text-gray-600 mt-4 font-medium">กำลังสร้างรหัสลงทะเบียน...</p>
                <p className="text-xs text-gray-500 mt-1">โปรดรอสักครู่</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsLinkLineDialogOpen(false);
                setQrData(null);
              }}
              className="border-gray-300 hover:bg-gray-50"
            >
              ปิด
            </Button>
            {qrData && (
              <Button 
                onClick={handleGenerateQR} 
                disabled={generateQRMutation.isPending}
                className="bg-[#138F3E] hover:bg-[#0F7A34] text-white"
              >
                {generateQRMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังสร้าง...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    สร้างรหัสใหม่
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการติดต่อ</DialogTitle>
            <DialogDescription>บันทึกรายละเอียดการติดต่อกับลูกค้า</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ช่องทางติดต่อ *</Label>
              <Select value={contactForm.method} onValueChange={(v) => setContactForm({ ...contactForm, method: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกช่องทาง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">โทรศัพท์</SelectItem>
                  <SelectItem value="line">LINE</SelectItem>
                  <SelectItem value="email">อีเมล</SelectItem>
                  <SelectItem value="visit">เยี่ยมเยือน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>สรุปการติดต่อ *</Label>
              <Textarea
                placeholder="รายละเอียดการติดต่อ..."
                value={contactForm.summary}
                onChange={(e) => setContactForm({ ...contactForm, summary: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>ผลลัพธ์</Label>
              <Textarea
                placeholder="ผลลัพธ์จากการติดต่อ..."
                value={contactForm.result}
                onChange={(e) => setContactForm({ ...contactForm, result: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleAddContact}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Upload Document Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>อัปโหลดเอกสารธุรกิจ</DialogTitle>
            <DialogDescription>
              อัปโหลดข้อมูลเกี่ยวข้องกับธุรกิจ
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <DocumentUpload 
              customerId={id} 
              onUploadComplete={() => {
                refetchDocuments();
                refetch();
                setIsUploadDialogOpen(false);
              }} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* LINE Audit Dialog */}
      <LineAuditDialog
        open={lineAuditDialogOpen}
        onOpenChange={setLineAuditDialogOpen}
        customerId={id}
        customerName={customer?.businessName}
      />
    </DashboardLayout>
  );
}
