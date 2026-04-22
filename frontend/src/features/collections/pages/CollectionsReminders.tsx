import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/shared/components/layout/DashboardLayout";
import { collectionsApi, CustomerDueStatus } from "../api/collections.api";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { branchesApi, usersApi, type Branch, type User as ApiUser } from "@/shared/lib/api-endpoints";
import { loanProductsApi, type LoanProduct } from "@/features/approvals/api/loan-products.api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  Search,
  Phone,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  User,
  Calendar,
  DollarSign,
  Building2,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import { FinancialContext } from "../components/FinancialContext";
import { BucketRollRatesChart } from "../components/BucketRollRatesChart";
import { RiskGauge } from "../components/RiskGauge";
import { QuickActionMenu } from "../components/QuickActionMenu";
import { CustomerTable } from "../components/CustomerTable";
import { downloadCsv, toCsv } from "@/shared/utils/csv";
import { toast } from "sonner";

export default function CollectionsReminders() {
  const { user, currentRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = currentRole === "admin";
  const [activeTab, setActiveTab] = useState("critical");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Admin filters for roll-rate analysis
  const [rollBranchId, setRollBranchId] = useState<string>("all");
  const [rollOfficerId, setRollOfficerId] = useState<string>("all");
  const [rollProductId, setRollProductId] = useState<string>("all");

  // Pagination states for each tab
  const [criticalPage, setCriticalPage] = useState(1);
  const [overduePage, setOverduePage] = useState(1);
  const [todayPage, setTodayPage] = useState(1);
  const [soonPage, setSoonPage] = useState(1);

  const ITEMS_PER_PAGE = 12; // 12 items per page (4 rows x 3 columns)

  const ROLL_INTERVAL: "week" | "month" = "week";
  const ROLL_POINTS = 8;

  const { data: branchesData } = useQuery({
    queryKey: ["branches", "all"],
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

  const { data: officersData } = useQuery({
    queryKey: ["roll-officers", rollBranchId],
    queryFn: async () => {
      if (rollBranchId !== "all") {
        const result = await branchesApi.getEmployees(rollBranchId);
        if (result.error) throw new Error(result.error.message ?? String(result.error));
        return result.data || [];
      }
      const result = await usersApi.list({ page: 1, limit: 200, role: "OFFICER", status: "ACTIVE" });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data?.users || [];
    },
    enabled: isAdmin,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const officers: ApiUser[] = Array.isArray(officersData) ? officersData : [];

  const { data: loanProductsData } = useQuery({
    queryKey: ["loan-products", "active"],
    queryFn: async () => {
      return await loanProductsApi.getAll({ status: "ACTIVE" });
    },
    enabled: isAdmin,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const loanProducts: LoanProduct[] = Array.isArray(loanProductsData) ? loanProductsData : [];

  // Fetch collections dashboard
  const { data: collectionDashboard, isLoading: isLoadingCollections } =
    useQuery({
      queryKey: ["collectionDashboard"],
      queryFn: async () => {
        const response = await collectionsApi.getCollectionDashboard();
        // console.log('[CollectionsReminders] Dashboard data:', response.data);
        // console.log('[CollectionsReminders] Critical overdue:', response.data?.criticalOverdue);
        // console.log('[CollectionsReminders] Overdue:', response.data?.overdue);
        // console.log('[CollectionsReminders] Due today:', response.data?.dueToday);
        // console.log('[CollectionsReminders] Due soon:', response.data?.dueSoon);
        // console.log('[CollectionsReminders] Upcoming:', response.data?.upcomingPayments);
        return response.data;
      },
    });

  // Fetch collection statistics
  const { data: collectionStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["collectionStats"],
    queryFn: async () => {
      const response = await collectionsApi.getCollectionStats();
      // console.log('[CollectionsReminders] Collection stats:', response.data);
      return response.data;
    },
  });

  // Fetch bucket roll rates
  const { data: bucketRollRates, isLoading: isLoadingBucketRollRates } =
    useQuery({
      queryKey: ["bucketRollRates", ROLL_INTERVAL, ROLL_POINTS, isAdmin ? rollBranchId : "na", isAdmin ? rollOfficerId : "na", isAdmin ? rollProductId : "na"],
      queryFn: async () => {
        const params: any = { interval: ROLL_INTERVAL, points: ROLL_POINTS };
        if (isAdmin && rollBranchId !== "all") params.branchId = rollBranchId;
        if (isAdmin && rollOfficerId !== "all") params.officerId = rollOfficerId;
        if (isAdmin && rollProductId !== "all") params.productId = rollProductId;
        const response = await collectionsApi.getBucketRollRates(params);
        // console.log('[CollectionsReminders] Bucket roll rates:', response.data);
        // console.log('[CollectionsReminders] Summary:', response.data?.summary);
        // console.log('[CollectionsReminders] Roll rates array:', response.data?.rollRates);
        // console.log('[CollectionsReminders] Distribution:', response.data?.distribution);
        return response.data;
      },
    });

  const getCreditHealthScore = (s: CustomerDueStatus): number => {
    if (typeof s.creditScore === "number" && Number.isFinite(s.creditScore)) {
      return s.creditScore;
    }
    // Fallback: use payment behavior only (align with backend intent: penalize only when overdue)
    if (s.daysUntilDue >= 0) return 90;
    const overdueDays = Math.abs(s.daysUntilDue);
    if (overdueDays <= 7) return 70;
    if (overdueDays <= 30) return 50;
    if (overdueDays <= 60) return 30;
    return 10;
  };

  // Sort by credit health (lowest score = most urgent)
  const sortByCreditHealth = (schedules: CustomerDueStatus[]) => {
    return [...schedules].sort((a, b) => getCreditHealthScore(a) - getCreditHealthScore(b));
  };

  // Categorized schedules
  const allOverdueSchedules: CustomerDueStatus[] = useMemo(
    () =>
      sortByCreditHealth([
        ...(collectionDashboard?.overdue || []),
        ...(collectionDashboard?.criticalOverdue || []),
      ]),
    [collectionDashboard],
  );

  const todaySchedules: CustomerDueStatus[] = useMemo(
    () => sortByCreditHealth(collectionDashboard?.dueToday || []),
    [collectionDashboard],
  );

  const dueSoonSchedules: CustomerDueStatus[] = useMemo(
    () => sortByCreditHealth(collectionDashboard?.dueSoon || []),
    [collectionDashboard],
  );

  const criticalOverdueSchedules: CustomerDueStatus[] = useMemo(
    () => sortByCreditHealth(collectionDashboard?.criticalOverdue || []),
    [collectionDashboard],
  );

  // Filter schedules
  const filterSchedules = (schedules: CustomerDueStatus[]) => {
    return schedules.filter(
      (schedule: CustomerDueStatus) =>
        !searchTerm ||
        String(schedule.customerName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        String(schedule.customerPhone || "").includes(searchTerm),
    );
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setIsSearching(value.length > 0);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setIsSearching(false);
  };

  const getSchedulesForExport = (): CustomerDueStatus[] => {
    const base =
      activeTab === "critical"
        ? criticalOverdueSchedules
        : activeTab === "overdue"
          ? allOverdueSchedules
          : activeTab === "today"
            ? todaySchedules
            : dueSoonSchedules;
    return filterSchedules(base);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const schedules = getSchedulesForExport();
      if (!schedules.length) {
        toast.error("ไม่มีข้อมูลสำหรับส่งออก");
        return;
      }

      const headers = [
        "ลูกค้า",
        "โทรศัพท์",
        "Loan ID",
        "Schedule ID",
        "งวด",
        "วันครบกำหนด",
        "อีกกี่วัน/เกินกำหนด",
        "จำนวนเงินที่ต้องชำระ",
        "สถานะ",
        "Credit Grade",
        "Credit Score",
        "เหตุผล",
        "คำแนะนำ",
      ];

      const rows = schedules.map((s) => [
        s.customerName || "",
        s.customerPhone || "",
        s.loanId || "",
        s.scheduleId || "",
        s.paymentNumber ?? "",
        s.dueDate ? format(new Date(s.dueDate as any), "yyyy-MM-dd") : "",
        s.daysUntilDue ?? "",
        s.amountDue ?? "",
        s.status || "",
        s.creditGrade || "",
        s.creditScore ?? "",
        (s.creditReasons || []).join(" | "),
        (s.creditNextActions || []).join(" | "),
      ]);

      const csv = toCsv(headers, rows);
      const dateStr = new Date().toISOString().slice(0, 10);
      const tabLabel =
        activeTab === "critical"
          ? "NPL_30+"
          : activeTab === "overdue"
            ? "Overdue"
            : activeTab === "today"
              ? "DueToday"
              : "DueSoon";
      downloadCsv(`loan_tracking_${tabLabel}_${dateStr}.csv`, csv);
      toast.success(`ส่งออก CSV สำเร็จ (${schedules.length} รายการ)`);
    } catch (error: any) {
      toast.error(error?.message || "ไม่สามารถส่งออกข้อมูลได้");
    } finally {
      setIsExporting(false);
    }
  };

  // Reset pagination when changing tabs or searching
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Reset all pagination when changing tabs
    setCriticalPage(1);
    setOverduePage(1);
    setTodayPage(1);
    setSoonPage(1);
  };

  // Pagination helper component
  const PaginationControls = ({
    currentPage,
    setPage,
    totalItems,
    itemsPerPage = ITEMS_PER_PAGE
  }: {
    currentPage: number;
    setPage: (page: number | ((prev: number) => number)) => void;
    totalItems: number;
    itemsPerPage?: number;
  }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          แสดง {startIndex + 1}-{endIndex} จาก {totalItems} รายการ
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            ก่อนหน้า
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(page)}
                    className="w-10"
                  >
                    {page}
                  </Button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="px-2">...</span>;
              }
              return null;
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="gap-1"
          >
            ถัดไป
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Get all search results across all tabs
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];

    const allSchedules = [
      ...criticalOverdueSchedules.map(s => ({ ...s, category: 'critical' as const })),
      ...(collectionDashboard?.overdue || []).map(s => ({ ...s, category: 'overdue' as const })),
      ...todaySchedules.map(s => ({ ...s, category: 'today' as const })),
      ...dueSoonSchedules.map(s => ({ ...s, category: 'soon' as const })),
    ];

    return allSchedules.filter(
      (schedule) =>
        String(schedule.customerName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        String(schedule.customerPhone || "").includes(searchTerm)
    );
  }, [searchTerm, criticalOverdueSchedules, collectionDashboard, todaySchedules, dueSoonSchedules]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate portfolio health metrics
  const portfolioRisk = useMemo(() => {
    // Use bucket roll rates distribution (unique loans) for portfolio-level counts.
    // NOTE: collectionDashboard counts are schedule-level, which can overcount accounts.
    const totalAccounts = bucketRollRates?.summary?.totalLoans || 0;
    const distribution = bucketRollRates?.distribution || [];
    const bucketCount = (bucket: string) =>
      distribution.find((b: any) => b.bucket === bucket)?.count || 0;

    const nplCount = bucketCount("NPL");
    const dpd1_30 = bucketCount("DPD_1_30");
    const dpd31_60 = bucketCount("DPD_31_60");
    const dpd61_90 = bucketCount("DPD_61_90");
    const overdueCount = dpd1_30 + dpd31_60 + dpd61_90; // 1-90 days past due (exclude NPL)

    // Calculate portfolio health score based on distribution
    // Score range: 0 (worst) to 100 (best)
    let portfolioHealthScore = 0;

    if (totalAccounts > 0) {
      const nplRate = (nplCount / totalAccounts) * 100;
      const overdueRate = (overdueCount / totalAccounts) * 100;
      const severeOverdueRate = (dpd61_90 / totalAccounts) * 100; // 61-90 days past due (pre-NPL)

      // Calculate health score:
      // - Start at 100 (perfect)
      // - Deduct based on NPL rate (up to -60)
      // - Deduct based on overdue rate (up to -30)
      // - Deduct based on severe overdue (up to -20)
      portfolioHealthScore = 100;
      portfolioHealthScore -= Math.min(nplRate * 2.5, 60); // NPL impact
      portfolioHealthScore -= Math.min(overdueRate * 1.0, 30); // Overdue impact
      portfolioHealthScore -= Math.min(severeOverdueRate * 1.5, 20); // Severe overdue impact

      // Clamp between 0 and 100
      portfolioHealthScore = Math.max(0, Math.min(100, portfolioHealthScore));
    }

    return {
      totalAccounts,
      nplCount,
      overdueCount,
      portfolioHealthScore: Math.round(portfolioHealthScore),
      nplRate: totalAccounts > 0 ? (nplCount / totalAccounts) * 100 : 0,
      predictedNPL: bucketRollRates?.summary?.rollToNPLRate || 0,
    };
  }, [collectionDashboard, bucketRollRates]);

  return (
    <DashboardLayout breadcrumbs={[{ label: "Home" }, { label: "ติดตามหนี้" }]}>
      <div className="p-6 space-y-6">
        {/* HERO SECTION - Spatial Design with Visual Hierarchy */}
        <div className="relative">
          {/* Top Bar - Title & Search */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl text-white font-bold">ระบบติดตามหนี้ (Loan tracking)</h1>
                <p className="text-white">
                  ระบบติดตามหนี้
                </p>
              </div>
              <Button
                onClick={() => navigate("/collections/debt-management-results")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                ผลบริหารหนี้
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCsv}
                disabled={isExporting}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "กำลังส่งออก..." : "ส่งออก CSV"}
              </Button>
            </div>
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
              <Input
                placeholder="ค้นหาชื่อลูกค้า หรือเบอร์โทร..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-12 pr-10 h-12 bg-background/80 backdrop-blur-sm border-2 border-border/50 rounded-2xl focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-300 text-base shadow-lg hover:shadow-xl"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:bg-muted rounded-lg transition-colors z-10"
                >
                  <svg
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Search Results - Show at top when searching */}
          {isSearching && (
            <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
              <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background shadow-2xl">
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-3 rounded-xl">
                        <Search className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">ผลการค้นหา</CardTitle>
                        <CardDescription className="text-base mt-1">
                          พบ {searchResults.length} รายการจากคำค้นหา "{searchTerm}"
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="gap-2 hover:bg-primary/10"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      ล้างการค้นหา
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="bg-muted/50 p-6 rounded-full mb-4">
                        <Search className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">ไม่พบผลการค้นหา</h3>
                      <p className="text-muted-foreground max-w-md">
                        ไม่พบลูกค้าที่ตรงกับคำค้นหา "{searchTerm}" ลองค้นหาด้วยชื่อหรือเบอร์โทรอื่น
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Group by category */}
                      {['critical', 'overdue', 'today', 'soon'].map((category) => {
                        const categoryResults = searchResults.filter(s => s.category === category);
                        if (categoryResults.length === 0) return null;

                        const categoryLabels = {
                          critical: { label: 'NPL (30+ วัน)', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', icon: AlertTriangle },
                          overdue: { label: 'เกินกำหนด', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20', icon: AlertTriangle },
                          today: { label: 'ครบกำหนดวันนี้', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20', icon: Clock },
                          soon: { label: 'ใกล้ครบ (1-7 วัน)', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', icon: Clock },
                        };

                        const config = categoryLabels[category as keyof typeof categoryLabels];
                        const Icon = config.icon;

                        return (
                          <div key={category} className="space-y-3">
                            <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", config.bg)}>
                              <Icon className={cn("h-4 w-4", config.color)} />
                              <span className={cn("font-semibold text-sm", config.color)}>
                                {config.label}
                              </span>
                              <Badge variant="secondary" className="ml-auto">
                                {categoryResults.length}
                              </Badge>
                            </div>
                            <CustomerTable
                              customers={categoryResults}
                              variant={category as any}
                              isLoading={false}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Summary Cards - Portfolio Overview - Hide when searching */}
          {!isSearching && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Total Loans Card */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
                {/* Wave Background */}
                <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                  <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                    <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-blue-500 opacity-10" />
                    <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-blue-500 opacity-20" />
                    <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-blue-500 opacity-40" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-blue-500/10 p-3 rounded-xl shadow-lg shadow-primary/20">
                      <svg
                        className="h-6 w-6 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-500 tracking-wide mb-1">
                    สินเชื่อทั้งหมด
                  </p>
                  <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {isLoadingBucketRollRates ? (
                      <span className="inline-block w-20 h-8 bg-slate-200 rounded animate-pulse" />
                    ) : (
                      bucketRollRates?.summary?.totalLoans || 0
                    )}
                  </h3>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
              </div>

              {/* Total Overdue Card */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
                {/* Wave Background */}
                <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
                  <svg viewBox="0 0 400 200" className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6" preserveAspectRatio="none">
                    <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-amber-500 opacity-10" />
                    <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-amber-500 opacity-20" />
                    <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-amber-500 opacity-40" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-amber-500/10 p-3 rounded-xl shadow-lg shadow-primary/20">
                      <Clock className="h-6 w-6 text-amber-500" strokeWidth={2} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-500 tracking-wide mb-1">
                    ค้างชำระ (รวม NPL)
                  </p>
                  <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {isLoadingBucketRollRates ? (
                      <span className="inline-block w-20 h-8 bg-slate-200 rounded animate-pulse" />
                    ) : (
                      bucketRollRates?.summary?.totalOverdue || 0
                    )}
                  </h3>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
              </div>

              {/* NPL Count Card */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
                {/* Wave Background */}
                <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                  <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                    <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-rose-500 opacity-10" />
                    <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-rose-500 opacity-20" />
                    <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-rose-500 opacity-40" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-rose-500/10 p-3 rounded-xl shadow-lg shadow-primary/20">
                      <AlertTriangle
                        className="h-6 w-6 text-rose-500"
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-500 tracking-wide mb-1">
                    NPL
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                      {isLoadingBucketRollRates ? (
                        <span className="inline-block w-20 h-8 bg-slate-200 rounded animate-pulse" />
                      ) : (
                        bucketRollRates?.summary?.nplCount || 0
                      )}
                    </h3>
                    {!isLoadingBucketRollRates && (
                      <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 backdrop-blur-sm text-xs">
                        {bucketRollRates?.summary?.nplRate?.toFixed(2) || "0.00"}%
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
              </div>

              {/* Predicted NPL Card */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
                {/* Wave Background */}
                <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
                  <svg viewBox="0 0 400 200" className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6" preserveAspectRatio="none">
                    <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-purple-500 opacity-10" />
                    <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-purple-500 opacity-20" />
                    <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-purple-500 opacity-40" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-purple-500/10 p-3 rounded-xl shadow-lg shadow-primary/20">
                      <TrendingUp
                        className="h-6 w-6 text-purple-500"
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-500 tracking-wide mb-1">
                    อัตรา Roll to NPL
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                      {isLoadingBucketRollRates ? (
                        <span className="inline-block w-20 h-8 bg-slate-200 rounded animate-pulse" />
                      ) : (
                        `${bucketRollRates?.summary?.rollToNPLRate?.toFixed(2) || "0.00"}%`
                      )}
                    </h3>
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
              </div>
            </div>
          )}

          {/* Critical Metrics Grid - Asymmetric Spatial Layout - Hide when searching */}
          {!isSearching && (
            <div className="grid grid-cols-12 gap-6">
              {/* LEFT COLUMN - Primary Focus (60% width) */}
              <div className="col-span-12 lg:col-span-7 space-y-4">
                {/* Portfolio Risk Gauge - Hero Element - Taller to match right column */}
                <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100 min-h-[280px] md:h-[362px] flex items-center justify-center">
                  {/* Wave Background */}
                  <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                    <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                      <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-blue-500 opacity-10" />
                      <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-blue-500 opacity-20" />
                      <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-blue-500 opacity-40" />
                    </svg>
                  </div>

                  <div className="relative z-10 w-full px-4 sm:px-6 md:px-8 py-6 md:py-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 items-center text-center md:text-left">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-500 tracking-wide mb-3 md:mb-4">
                          PORTFOLIO HEALTH
                        </h3>
                        <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-4 md:mb-6 tracking-tight">
                          {portfolioRisk.totalAccounts}
                          <span className="text-lg sm:text-xl md:text-2xl text-slate-500 ml-2">
                            accounts
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 md:gap-4">
                          <div className="flex items-center gap-2 bg-rose-500/10 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-rose-500/20">
                            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-xs md:text-sm text-slate-700">
                              <span className="font-bold">
                                {portfolioRisk.nplCount}
                              </span>
                              <span className="ml-1 opacity-90">NPL (90+)</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-orange-500/10 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-orange-500/20">
                            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-orange-500" />
                            <span className="text-xs md:text-sm text-slate-700">
                              <span className="font-bold">
                                {portfolioRisk.overdueCount}
                              </span>
                              <span className="ml-1 opacity-90">Overdue</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 self-center md:self-auto mt-4 md:mt-0 mb-9">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40">
                          <RiskGauge
                            score={portfolioRisk.portfolioHealthScore}
                            size="lg"
                            variant="default"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
                </div>

                {/* NPL Roll Rate Card */}
                <div className="relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
                  {/* Wave Background */}
                  <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
                    <svg viewBox="0 0 400 200" className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6" preserveAspectRatio="none">
                      <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-rose-500 opacity-10" />
                      <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-rose-500 opacity-20" />
                      <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-rose-500 opacity-40" />
                    </svg>
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-rose-500/10 backdrop-blur-sm p-2 rounded-lg">
                            <AlertTriangle
                              className="h-5 w-5 text-rose-500"
                              strokeWidth={2}
                            />
                          </div>
                          <h3 className="text-sm font-medium text-slate-500 tracking-wide">
                            NPL FORECAST
                          </h3>
                        </div>
                        <div className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">
                          {portfolioRisk.predictedNPL.toFixed(2)}%
                        </div>
                        <p className="text-sm text-slate-500">
                          อัตราการเปลี่ยนเป็น NPL (จากข้อมูลสถิติ)
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-500 mb-1">
                          Current NPL
                        </div>
                        <div className="text-3xl font-bold text-slate-900 mb-2">
                          {portfolioRisk.nplRate.toFixed(2)}%
                        </div>
                        <div
                          className={cn(
                            "inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold",
                            portfolioRisk.predictedNPL > portfolioRisk.nplRate
                              ? "bg-rose-500/10 text-rose-500 backdrop-blur-sm border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-500 backdrop-blur-sm border border-emerald-500/20",
                          )}
                        >
                          {portfolioRisk.predictedNPL > portfolioRisk.nplRate ? (
                            <>
                              <TrendingUp className="h-3 w-3" /> Rising
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3" /> Stable
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
                </div>
              </div>

              {/* RIGHT COLUMN - Secondary Metrics (40% width) */}
              <div className="col-span-12 lg:col-span-5 space-y-4">
                {/* Due Today Card */}
                <div className="relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
                  {/* Wave Background */}
                  <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                    <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                      <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-emerald-500 opacity-10" />
                      <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-emerald-500 opacity-20" />
                      <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-emerald-500 opacity-40" />
                    </svg>
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-emerald-500/10 p-3 rounded-xl shadow-lg shadow-primary/20">
                        <Clock className="h-6 w-6 text-emerald-500" strokeWidth={2} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 tracking-wide mb-1">
                      Due Today
                    </p>
                    <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                      {todaySchedules.length}
                    </h3>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
                </div>

                {/* Due Soon Card */}
                <div className="relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
                  {/* Wave Background */}
                  <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
                    <svg viewBox="0 0 400 200" className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6" preserveAspectRatio="none">
                      <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-amber-500 opacity-10" />
                      <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-amber-500 opacity-20" />
                      <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-amber-500 opacity-40" />
                    </svg>
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-amber-500/10 p-3 rounded-xl shadow-lg shadow-primary/20">
                        <Activity
                          className="h-6 w-6 text-amber-500"
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 tracking-wide mb-1">
                      Due Soon (1-7d)
                    </p>
                    <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                      {dueSoonSchedules.length}
                    </h3>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
                </div>

                {/* Total Amount Due Card */}
                <div className="relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
                  {/* Wave Background */}
                  <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                    <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                      <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-purple-500 opacity-10" />
                      <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-purple-500 opacity-20" />
                      <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-purple-500 opacity-40" />
                    </svg>
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-purple-500/10 p-3 rounded-xl shadow-lg shadow-primary/20">
                        <TrendingUp
                          className="h-6 w-6 text-purple-500"
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 tracking-wide mb-1">
                      Total Amount Due
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                      {formatCurrency(
                        collectionDashboard?.summary?.totalAmountDue || 0,
                      )}
                    </h3>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
                </div>
              </div>
            </div>
          )}


          {/* COLLECTION TABS - Spatial Grouping - Hide when searching */}
          {!isSearching && (
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="space-y-6 mt-14"
            >
              <div className="mb-2">
                <h1 className="text-3xl font-bold text-primay mb-2">
                  รายการ Due Date Loan
                </h1>
                <p className="text-gray-400 text-sm">
                  รายการสัญญาที่ครบกำหนดชำระและใกล้ถึงกำหนดชำระ
                </p>
              </div>
              <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-white rounded-lg border border-slate-200">
                <TabsTrigger
                  value="critical"
                  className="gap-2 flex-shrink-0 rounded-md px-4 py-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 transition-colors"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">NPL (30+ วัน)</span>
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-slate-100 text-slate-700 hover:bg-slate-100 border-none"
                  >
                    {criticalOverdueSchedules.length}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="overdue"
                  className="gap-2 flex-shrink-0 rounded-md px-4 py-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 transition-colors"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">เกินกำหนด</span>
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-slate-100 text-slate-700 hover:bg-slate-100 border-none"
                  >
                    {(collectionDashboard?.overdue || []).length}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="today"
                  className="gap-2 flex-shrink-0 rounded-md px-4 py-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  <span className="font-semibold">ครบกำหนดวันนี้</span>
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-slate-100 text-slate-700 hover:bg-slate-100 border-none"
                  >
                    {todaySchedules.length}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="soon"
                  className="gap-2 flex-shrink-0 rounded-md px-4 py-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  <span className="font-semibold">ใกล้ครบ (1-7 วัน)</span>
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-slate-100 text-slate-700 hover:bg-slate-100 border-none"
                  >
                    {dueSoonSchedules.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* NPL Tab */}
              <TabsContent value="critical" className="mt-0">
                <Card className="bg-white backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-6 w-6" />
                      ลูกหนี้เสีย (NPL) - เกิน 30 วัน
                    </CardTitle>
                    <CardDescription>
                      รายการที่ต้องเร่งติดตามด่วนที่สุด - เครดิตอยู่ในกลุ่มเสี่ยง/วิกฤต (แสดง {ITEMS_PER_PAGE} รายการต่อหน้า)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const filteredSchedules = filterSchedules(criticalOverdueSchedules);
                      const totalItems = filteredSchedules.length;
                      const startIndex = (criticalPage - 1) * ITEMS_PER_PAGE;
                      const endIndex = startIndex + ITEMS_PER_PAGE;
                      const paginatedSchedules = filteredSchedules.slice(startIndex, endIndex);

                      return (
                        <div className="space-y-6">
                          <CustomerTable
                            customers={paginatedSchedules}
                            variant="critical"
                            isLoading={isLoadingCollections}
                          />
                          <PaginationControls
                            currentPage={criticalPage}
                            setPage={setCriticalPage}
                            totalItems={totalItems}
                          />
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Overdue Tab */}
              <TabsContent value="overdue" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>รายการเกินกำหนดชำระ (1-29 วัน)</CardTitle>
                    <CardDescription>
                      งวดชำระที่เลยกำหนดและต้องติดตาม (แสดง {ITEMS_PER_PAGE} รายการต่อหน้า)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const filteredSchedules = filterSchedules(collectionDashboard?.overdue || []);
                      const totalItems = filteredSchedules.length;
                      const startIndex = (overduePage - 1) * ITEMS_PER_PAGE;
                      const endIndex = startIndex + ITEMS_PER_PAGE;
                      const paginatedSchedules = filteredSchedules.slice(startIndex, endIndex);

                      return (
                        <div className="space-y-6">
                          <CustomerTable
                            customers={paginatedSchedules}
                            variant="overdue"
                            isLoading={isLoadingCollections}
                          />
                          <PaginationControls
                            currentPage={overduePage}
                            setPage={setOverduePage}
                            totalItems={totalItems}
                          />
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Today Tab */}
              <TabsContent value="today" className="mt-0">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-primary flex items-center gap-2">
                      <Clock className="h-6 w-6" />
                      ครบกำหนดชำระวันนี้
                    </CardTitle>
                    <CardDescription>
                      รายการที่ต้องติดตามวันนี้ - ลูกค้าควรชำระภายในวันนี้ (แสดง {ITEMS_PER_PAGE} รายการต่อหน้า)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const filteredSchedules = filterSchedules(todaySchedules);
                      const totalItems = filteredSchedules.length;
                      const startIndex = (todayPage - 1) * ITEMS_PER_PAGE;
                      const endIndex = startIndex + ITEMS_PER_PAGE;
                      const paginatedSchedules = filteredSchedules.slice(startIndex, endIndex);

                      return (
                        <div className="space-y-6">
                          <CustomerTable
                            customers={paginatedSchedules}
                            variant="today"
                            isLoading={isLoadingCollections}
                          />
                          <PaginationControls
                            currentPage={todayPage}
                            setPage={setTodayPage}
                            totalItems={totalItems}
                          />
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Soon Tab */}
              <TabsContent value="soon" className="mt-0">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-warning flex items-center gap-2">
                      <Clock className="h-6 w-6" />
                      ใกล้ครบกำหนด (1-7 วัน)
                    </CardTitle>
                    <CardDescription>
                      รายการที่จะครบกำหนดในสัปดาห์นี้ - ควรแจ้งเตือนล่วงหน้า (แสดง {ITEMS_PER_PAGE} รายการต่อหน้า)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const filteredSchedules = filterSchedules(dueSoonSchedules);
                      const totalItems = filteredSchedules.length;
                      const startIndex = (soonPage - 1) * ITEMS_PER_PAGE;
                      const endIndex = startIndex + ITEMS_PER_PAGE;
                      const paginatedSchedules = filteredSchedules.slice(startIndex, endIndex);

                      return (
                        <div className="space-y-6">
                          <CustomerTable
                            customers={paginatedSchedules}
                            variant="soon"
                            isLoading={isLoadingCollections}
                          />
                          <PaginationControls
                            currentPage={soonPage}
                            setPage={setSoonPage}
                            totalItems={totalItems}
                          />
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          )}

          {/* Bucket Roll Rates Analysis - Hide when searching */}
          {!isSearching && bucketRollRates && (
            <div className="mt-8">
              {/* Section Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-primay mb-2">
                  Portfolio Quality & Roll Rate Analysis
                </h1>
                <p className="text-gray-400 text-sm">
                  วิเคราะห์คุณภาพพอร์ตและประเมินความเสี่ยงและแนวโน้มการชำระหนี้
                </p>
              </div>
              {isAdmin && (
                <div className="mb-4">
                  <Card className="bg-white border border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="text-sm font-semibold text-slate-900">
                          ตัวกรอง
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                          <Select
                            value={rollBranchId}
                            onValueChange={(value) => {
                              setRollBranchId(value);
                              setRollOfficerId("all");
                            }}
                          >
                            <SelectTrigger className="w-full sm:w-[260px]">
                              <Building2 className="h-4 w-4 mr-2 text-slate-500" />
                              <SelectValue placeholder="ทุกสาขา" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">ทุกสาขา</SelectItem>
                              {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select value={rollOfficerId} onValueChange={setRollOfficerId}>
                            <SelectTrigger className="w-full sm:w-[260px]">
                              <User className="h-4 w-4 mr-2 text-slate-500" />
                              <SelectValue placeholder="ทุกเจ้าหน้าที่" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">ทุกเจ้าหน้าที่</SelectItem>
                              {officers.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  {`${o.firstName || ""} ${o.lastName || ""}`.trim() || o.email || o.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select value={rollProductId} onValueChange={setRollProductId}>
                            <SelectTrigger className="w-full sm:w-[320px]">
                              <TrendingUp className="h-4 w-4 mr-2 text-slate-500" />
                              <SelectValue placeholder="ทุกผลิตภัณฑ์" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">ทุกผลิตภัณฑ์</SelectItem>
                              {loanProducts.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.productName || p.productCode || p.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        ช่วยให้ Admin วิเคราะห์ Roll Rates แยกตามสาขา/เจ้าหน้าที่/ผลิตภัณฑ์ได้ (ข้อมูลมาจาก `payment_schedules` แบบ real-time)
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <BucketRollRatesChart
                data={bucketRollRates}
                isLoading={isLoadingBucketRollRates}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
