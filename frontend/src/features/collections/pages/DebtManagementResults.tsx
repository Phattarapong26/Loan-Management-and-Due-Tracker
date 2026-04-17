import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/shared/components/layout/DashboardLayout";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { collectionsApi } from "../api/collections.api";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, FileText, PieChart, Info, ChevronDown, Layers, Home, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { downloadCsv, toCsv } from "@/shared/utils/csv";
import { toast } from "sonner";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Plugin } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

// Custom Card Header Component
const CustomCardHeader = ({ title, icon: Icon, action }: { title: string; icon: any; action?: React.ReactNode }) => (
  <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
        <Icon size={20} />
      </div>
      <h3 className="font-bold text-slate-800 tracking-tight text-lg">{title}</h3>
    </div>
    {action}
  </div>
);

// Empty State Component
const EmptyChartState = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6">
    <div className="p-6 bg-slate-100 rounded-full mb-4">
      <Icon size={48} className="text-slate-400" />
    </div>
    <h3 className="text-lg font-bold text-slate-700 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 text-center max-w-md">{subtitle}</p>
  </div>
);

// Custom Labels Plugin for Doughnut Charts with polylines
const customLabelsPlugin: Plugin<'doughnut'> = {
  id: 'customLabels',
  afterDraw(chart) {
    const { ctx, data, chartArea } = chart;
    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;

    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((datapoint: any, index) => {
        const { x, y } = datapoint.tooltipPosition();
        
        // Calculate direction from center
        const angle = Math.atan2(y - centerY, x - centerX);
        const radius = datapoint.outerRadius;

        // Start line at the edge of the donut segment
        const lineStartX = centerX + Math.cos(angle) * radius;
        const lineStartY = centerY + Math.sin(angle) * radius;

        // Break point (elbow) of the line
        const breakPointX = centerX + Math.cos(angle) * (radius + 25);
        const breakPointY = centerY + Math.sin(angle) * (radius + 25);

        // End point for the horizontal part
        const isLeft = x < centerX;
        const lineEndX = isLeft ? breakPointX - 20 : breakPointX + 20;
        const lineEndY = breakPointY;

        // Draw the Polyline
        ctx.beginPath();
        ctx.moveTo(lineStartX, lineStartY);
        ctx.lineTo(breakPointX, breakPointY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.strokeStyle = dataset.backgroundColor[index] as string;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Prepare Data
        const label = data.labels?.[index] as string;
        const value = dataset.data[index] as number;
        const total = (dataset.data as number[]).reduce((a, b) => a + b, 0);
        const percentage = ((value / total) * 100).toFixed(1) + '%';

        // Draw Text Labels
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = '#334155';
        ctx.textAlign = isLeft ? 'right' : 'left';
        ctx.textBaseline = 'bottom';

        // Primary Label (Title)
        ctx.fillText(label, isLeft ? lineEndX - 5 : lineEndX + 5, lineEndY - 2);

        // Secondary Label (Value and Percentage)
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`${value} ราย (${percentage})`, isLeft ? lineEndX - 5 : lineEndX + 5, lineEndY + 12);
      });
    });
  },
};

// สีสำหรับ charts
const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

// Chart.js options
const getDoughnutOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: 45 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      padding: 12,
      cornerRadius: 8,
      titleFont: {
        size: 14,
        weight: 'bold' as const,
      },
      bodyFont: {
        size: 13,
      },
      callbacks: {
        label: function(context: any) {
          const label = context.label || '';
          const value = context.parsed || 0;
          const dataset = context.dataset;
          const total = dataset.data.reduce((acc: number, val: number) => acc + val, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${label}: ${value} ราย (${percentage}%)`;
        }
      }
    },
  },
  cutout: '72%',
  animation: {
    animateRotate: true,
    animateScale: true,
  },
});

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        boxWidth: 6,
        padding: 15,
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value: any) {
          return value + '%';
        }
      },
      grid: {
        color: '#f1f5f9',
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
};

export default function DebtManagementResults() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const interestChartScrollRef = useRef<HTMLDivElement | null>(null);

  // Fetch filter options
  const { data: branches } = useQuery({
    queryKey: ["filterBranches"],
    queryFn: async () => {
      const response = await collectionsApi.getFilterBranches();
      return response.data;
    },
  });

  const { data: regions } = useQuery({
    queryKey: ["filterRegions"],
    queryFn: async () => {
      const response = await collectionsApi.getFilterRegions();
      return response.data;
    },
  });

  const { data: zones } = useQuery({
    queryKey: ["filterZones", selectedRegion],
    queryFn: async () => {
      const response = await collectionsApi.getFilterZones(selectedRegion !== 'all' ? selectedRegion : undefined);
      return response.data;
    },
    enabled: selectedRegion !== 'all',
  });

  const { data: availableYears } = useQuery({
    queryKey: ["filterYears"],
    queryFn: async () => {
      const response = await collectionsApi.getFilterYears();
      return response.data;
    },
  });

  // Fetch debt management data
  const { data: debtData, isLoading } = useQuery({
    queryKey: ["debtManagementSummary", selectedYear, selectedMonth, selectedRegion, selectedZone, selectedBranch],
    queryFn: async () => {
      const response = await collectionsApi.getDebtManagementSummary({
        year: selectedYear,
        month: selectedMonth,
        region: selectedRegion,
        zone: selectedZone,
        branchId: selectedBranch,
      });
      return response.data;
    },
  });

  const { data: bucketRollRates } = useQuery({
    queryKey: ["bucketRollRates"],
    queryFn: async () => {
      const response = await collectionsApi.getBucketRollRates();
      return response.data;
    },
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleExportCsv = () => {
    if (!debtData) {
      toast.error("ยังไม่มีข้อมูลสำหรับส่งออก");
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const suffix = `${selectedYear || "all"}-${selectedMonth || "all"}_${dateStr}`;

    // 1) Summary (metric/value)
    const summary = debtData.summary;
    const summaryHeaders = ["ตัวชี้วัด", "ค่า"];
    const summaryRows: any[] = [
      ["จำนวนสินเชื่อทั้งหมด", summary.totalLoans],
      ["ยอดคงค้างรวม", summary.totalOutstanding],
      ["Performing (จำนวน)", summary.performingCount],
      ["Performing (ยอด)", summary.performingAmount],
      ["Performing (%)", summary.performingPercentage],
      ["Overdue (จำนวน)", summary.overdueCount],
      ["Overdue (ยอด)", summary.overdueAmount],
      ["Overdue (%)", summary.overduePercentage],
      ["NPL (จำนวน)", summary.nplCount],
      ["NPL (ยอด)", summary.nplAmount],
      ["NPL (%)", summary.nplPercentage],
    ];
    downloadCsv(`debt_management_summary_${suffix}.csv`, toCsv(summaryHeaders, summaryRows));

    // 2) Distributions (type/label/value)
    const distHeaders = ["ประเภท", "หมวด", "ค่า"];
    const distRows: any[] = [
      ["Contract Size", "0-1 ล้านบาท", debtData.contractSizeDistribution?.small ?? 0],
      ["Contract Size", "1-3 ล้านบาท", debtData.contractSizeDistribution?.medium ?? 0],
      ["Contract Size", "5-15 ล้านบาท", debtData.contractSizeDistribution?.large ?? 0],
      ["Collateral", "ที่ดิน", debtData.collateralTypeDistribution?.land ?? 0],
      ["Collateral", "เครื่องจักร", debtData.collateralTypeDistribution?.machinery ?? 0],
      ["Collateral", "ยานพาหนะ", debtData.collateralTypeDistribution?.vehicle ?? 0],
      ["Collateral", "เงินฝาก", debtData.collateralTypeDistribution?.deposit ?? 0],
      ["Collateral", "อื่นๆ", debtData.collateralTypeDistribution?.other ?? 0],
      ...Object.entries(debtData.loanTypeDistribution || {}).map(([k, v]) => ["Loan Type", k, v]),
    ];
    downloadCsv(`debt_management_distributions_${suffix}.csv`, toCsv(distHeaders, distRows));

    // 3) Interest rate comparison
    const irHeaders = ["เดือน", "Actual", "Expected"];
    const irRows = (debtData.interestRateComparison || []).map((p) => [p.month, p.actual, p.expected]);
    downloadCsv(`debt_management_interest_rate_${suffix}.csv`, toCsv(irHeaders, irRows));

    toast.success("ส่งออก CSV สำเร็จ (3 ไฟล์)");
  };

  // Process contract size distribution from API data
  const contractSizeData = useMemo(() => {
    if (!debtData?.contractSizeDistribution) return null;

    const { small, medium, large } = debtData.contractSizeDistribution;
    return {
      labels: ['0-1 ล้านบาท', '1-3 ล้านบาท', '5-15 ล้านบาท'],
      datasets: [{
        data: [small, medium, large],
        backgroundColor: ['#93c5fd', '#60a5fa', '#3b82f6'],
        borderWidth: 0,
        hoverOffset: 15,
      }],
    };
  }, [debtData]);

  const contractSizeStats = useMemo(() => {
    if (!debtData?.contractSizeDistribution) return [];
    const { small, medium, large } = debtData.contractSizeDistribution;
    const total = small + medium + large;
    if (total === 0) return [];
    return [
      { label: '5-15 ล้านบาท', val: large, pct: `${((large / total) * 100).toFixed(1)}%`, color: '#3b82f6' },
      { label: '1-3 ล้านบาท', val: medium, pct: `${((medium / total) * 100).toFixed(1)}%`, color: '#60a5fa' },
      { label: '0-1 ล้านบาท', val: small, pct: `${((small / total) * 100).toFixed(1)}%`, color: '#93c5fd' },
    ];
  }, [debtData]);

  const totalContracts = useMemo(() => {
    if (!debtData?.contractSizeDistribution) return 0;
    const { small, medium, large } = debtData.contractSizeDistribution;
    return small + medium + large;
  }, [debtData]);

  // Process loan type distribution from API data
  const loanTypeData = useMemo(() => {
    if (!debtData?.loanTypeDistribution) return null;

    const distribution = debtData.loanTypeDistribution;
    const labels = Object.keys(distribution);
    const data = Object.values(distribution);
    
    if (labels.length === 0) return null;
    
    const colors = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 15,
      }],
    };
  }, [debtData]);

  const loanTypeStats = useMemo(() => {
    if (!debtData?.loanTypeDistribution) return [];
    const distribution = debtData.loanTypeDistribution;
    const total = Object.values(distribution).reduce((sum: number, val: unknown) => sum + Number(val), 0);
    
    if (total === 0) return [];
    
    const colors = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
    
    return Object.entries(distribution).map(([label, val]: [string, unknown], idx) => {
      const numVal = Number(val);
      return {
        label,
        val: numVal,
        pct: `${((numVal / total) * 100).toFixed(0)}%`,
        color: colors[idx % colors.length],
      };
    });
  }, [debtData]);

  const totalLoanTypes = useMemo(() => {
    if (!debtData?.loanTypeDistribution) return 0;
    return Object.keys(debtData.loanTypeDistribution).length;
  }, [debtData]);

  // Process collateral type distribution from API data
  const collateralTypeData = useMemo(() => {
    if (!debtData?.collateralTypeDistribution) return null;

    const { land, machinery, vehicle, deposit, other } = debtData.collateralTypeDistribution;
    const total = Number(land) + Number(machinery) + Number(vehicle) + Number(deposit) + Number(other);
    
    if (total === 0) return null;
    
    return {
      labels: ['ที่ดิน', 'เครื่องจักร', 'ยานพาหนะ', 'เงินฝาก', 'อื่นๆ'],
      datasets: [{
        data: [land, machinery, vehicle, deposit, other],
        backgroundColor: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
        borderWidth: 0,
        hoverOffset: 15,
      }],
    };
  }, [debtData]);

  const collateralTypeStats = useMemo(() => {
    if (!debtData?.collateralTypeDistribution) return [];
    const { land, machinery, vehicle, deposit, other } = debtData.collateralTypeDistribution;
    const numLand = Number(land);
    const numMachinery = Number(machinery);
    const numVehicle = Number(vehicle);
    const numDeposit = Number(deposit);
    const numOther = Number(other);
    const total = numLand + numMachinery + numVehicle + numDeposit + numOther;
    
    if (total === 0) return [];
    
    return [
      { label: 'ที่ดินและสิ่งปลูกสร้าง', val: numLand, pct: `${((numLand / total) * 100).toFixed(0)}%`, color: '#2563eb' },
      { label: 'เครื่องจักร/อุปกรณ์', val: numMachinery, pct: `${((numMachinery / total) * 100).toFixed(0)}%`, color: '#3b82f6' },
      { label: 'ยานพาหนะ', val: numVehicle, pct: `${((numVehicle / total) * 100).toFixed(0)}%`, color: '#60a5fa' },
      { label: 'หลักทรัพย์/เงินฝาก', val: numDeposit, pct: `${((numDeposit / total) * 100).toFixed(0)}%`, color: '#93c5fd' },
      { label: 'อื่นๆ', val: numOther, pct: `${((numOther / total) * 100).toFixed(0)}%`, color: '#bfdbfe' },
    ];
  }, [debtData]);

  const totalCollateralTypes = useMemo(() => {
    if (!debtData?.collateralTypeDistribution) return 0;
    const { land, machinery, vehicle, deposit, other } = debtData.collateralTypeDistribution;
    const total = Number(land) + Number(machinery) + Number(vehicle) + Number(deposit) + Number(other);
    return total > 0 ? 5 : 0;
  }, [debtData]);

  // Process interest rate comparison from API data
  const interestComparisonData = useMemo(() => {
    if (!debtData?.interestRateComparison || debtData.interestRateComparison.length === 0) return null;

    const comparison = debtData.interestRateComparison;
    return {
      labels: comparison.map(d => d.month),
      datasets: [
        {
          label: 'รับจริง (%)',
          data: comparison.map(d => d.actual),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#3b82f6',
        },
        {
          label: 'ตามเงื่อนไข (%)',
          data: comparison.map(d => d.expected),
          borderColor: '#1e40af',
          borderDash: [5, 5],
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#1e40af',
        },
      ],
    };
  }, [debtData]);

  const interestChartMinWidth = useMemo(() => {
    const points = debtData?.interestRateComparison?.length || 0;
    // Give each point enough horizontal space so the user can scroll back to the earliest months.
    return Math.max(900, points * 90);
  }, [debtData]);

  const scrollInterestChartToStart = () => {
    interestChartScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const scrollInterestChartToEnd = () => {
    const el = interestChartScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  };

  // Statistics cards data from API
  const statsCards = useMemo(() => {
    if (!debtData?.summary) {
      return [
        { label: "Outstanding", value: "0", sub: "ล้านบาท", icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Performing (PL)", value: "0", sub: "0% สัญญา", icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Past Due (PSA)", value: "0", sub: "0% สัญญา", icon: TrendingDown, color: "text-blue-400", bg: "bg-blue-50" },
        { label: "Non-Performing", value: "0", sub: "0% สัญญา", icon: AlertTriangle, color: "text-blue-700", bg: "bg-blue-50" },
      ];
    }

    const { summary } = debtData;
    return [
      {
        label: "Outstanding",
        value: (summary.totalOutstanding / 1000000).toFixed(1),
        sub: "ล้านบาท",
        icon: DollarSign,
        color: "text-blue-600",
        bg: "bg-blue-50",
      },
      {
        label: "Performing (PL)",
        value: summary.performingCount.toString(),
        sub: `${summary.performingPercentage.toFixed(0)}% สัญญา`,
        icon: TrendingUp,
        color: "text-blue-500",
        bg: "bg-blue-50",
      },
      {
        label: "Past Due (PSA)",
        value: summary.overdueCount.toString(),
        sub: `${summary.overduePercentage.toFixed(0)}% สัญญา`,
        icon: TrendingDown,
        color: "text-blue-400",
        bg: "bg-blue-50",
      },
      {
        label: "Non-Performing",
        value: summary.nplCount.toString(),
        sub: `${summary.nplPercentage.toFixed(0)}% สัญญา`,
        icon: AlertTriangle,
        color: "text-blue-700",
        bg: "bg-blue-50",
      },
    ];
  }, [debtData]);

  // Generate year options from API or fallback
  const yearOptions = availableYears || Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  const monthOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "1", label: "มกราคม" },
    { value: "2", label: "กุมภาพันธ์" },
    { value: "3", label: "มีนาคม" },
    { value: "4", label: "เมษายน" },
    { value: "5", label: "พฤษภาคม" },
    { value: "6", label: "มิถุนายน" },
    { value: "7", label: "กรกฎาคม" },
    { value: "8", label: "สิงหาคม" },
    { value: "9", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" },
    { value: "12", label: "ธันวาคม" },
  ];

  return (
    <DashboardLayout breadcrumbs={[{ label: "Home" }, { label: "ผลบริหารหนี้" }]}>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-blue-500/30 text-blue-100 rounded text-[10px] font-bold uppercase tracking-widest">
                Reporting System
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white">ผลบริหารหนี้สรุป</h1>
            <p className="text-white/80 mt-1">รายงานสถานะและการเติบโตของพอร์ตสินเชื่อประจำเดือน</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-2xl text-sm font-bold transition-all backdrop-blur-md border border-white/10"
            >
              <FileText size={18} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="p-6 bg-white/95 backdrop-blur shadow-xl">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">ปี</label>
                <div className="relative">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year + 543}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">เดือน</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">ภาค</label>
                <Select value={selectedRegion} onValueChange={(value) => {
                  setSelectedRegion(value);
                  setSelectedZone("all"); // Reset zone when region changes
                }}>
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {regions?.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">เขต</label>
                <Select value={selectedZone} onValueChange={setSelectedZone} disabled={selectedRegion === 'all'}>
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {zones?.map((zone) => (
                      <SelectItem key={zone.value} value={zone.value}>
                        {zone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">สาขา</label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.province})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {statsCards.map((stat, i) => (
            <div key={i} className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
              {/* Wave Background */}
              <div className={`absolute bottom-0 ${i % 2 === 0 ? 'left-0' : 'right-0'} w-full h-full pointer-events-none overflow-hidden select-none`}>
                <svg viewBox="0 0 400 200" className={`absolute bottom-0 ${i % 2 === 0 ? 'left-0' : 'right-0'} w-[140%] h-full opacity-50 ${i % 2 === 1 ? 'scale-x-[-1]' : ''} ${i % 2 === 0 ? '-translate-x-10' : 'translate-x-10'} translate-y-6`} preserveAspectRatio="none">
                  <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className={`${stat.color} opacity-10`} />
                  <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className={`${stat.color} opacity-20`} />
                  <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className={`${stat.color} opacity-40`} />
                </svg>
              </div>

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`${stat.bg} p-3 rounded-xl shadow-lg shadow-primary/20`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} strokeWidth={2} />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 tracking-wide">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                      {isLoading ? (
                        <span className="inline-block w-20 h-8 bg-slate-200 rounded animate-pulse" />
                      ) : (
                        stat.value
                      )}
                    </h3>
                    {stat.sub && !isLoading && (
                      <span className="text-sm font-semibold text-slate-500">
                        {stat.sub}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors duration-300" />
            </div>
          ))}
        </div>

        {/* Charts Row 1: Contract Size & Loan Type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Contract Size */}
          <Card className="flex flex-col rounded-[2rem] shadow-sm">
            <CustomCardHeader title="สัดส่วนขนาดมูลค่าสัญญา" icon={PieChart} />
            {contractSizeData ? (
              <>
                <div className="p-8 relative">
                  <div className="h-[380px]">
                    <Doughnut 
                      data={contractSizeData} 
                      options={getDoughnutOptions()} 
                      plugins={[customLabelsPlugin]}
                    />
                    {/* Center Text Overlay */}
                    <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <p className="text-xs font-bold text-slate-400 uppercase">สัญญา</p>
                      <p className="text-4xl font-black text-slate-900 leading-tight">{totalContracts}</p>
                      <p className="text-[11px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded mt-1">TOTAL</p>
                    </div>
                  </div>
                </div>
                <div className="px-8 pb-8 space-y-2">
                  {contractSizeStats.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {item.val} <span className="text-xs font-medium text-slate-400">({item.pct})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChartState 
                icon={PieChart}
                title="ไม่มีข้อมูลสัญญา"
                subtitle="ยังไม่มีข้อมูลสัญญาในระบบ หรือลองเปลี่ยนตัวกรองเพื่อดูข้อมูลอื่น"
              />
            )}
          </Card>

          {/* Chart 2: Collateral Type */}
          <Card className="flex flex-col rounded-[2rem] shadow-sm">
            <CustomCardHeader title="สัดส่วนประเภทหลักประกัน" icon={Home} />
            {collateralTypeData ? (
              <>
                <div className="p-8 relative">
                  <div className="h-[380px]">
                    <Doughnut 
                      data={collateralTypeData} 
                      options={getDoughnutOptions()} 
                      plugins={[customLabelsPlugin]}
                    />
                    <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <p className="text-xs font-bold text-slate-400 uppercase">ประกัน</p>
                      <p className="text-4xl font-black text-slate-900 leading-tight">{totalCollateralTypes}</p>
                      <p className="text-[11px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded mt-1">ASSETS</p>
                    </div>
                  </div>
                </div>
                <div className="px-8 pb-8 space-y-2">
                  {collateralTypeStats.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {item.val} <span className="text-xs font-medium text-slate-400">({item.pct})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChartState 
                icon={Home}
                title="ไม่มีข้อมูลหลักประกัน"
                subtitle="ยังไม่มีข้อมูลหลักประกันในระบบ หรือลองเปลี่ยนตัวกรองเพื่อดูข้อมูลอื่น"
              />
            )}
          </Card>
        </div>

        {/* Chart 3: Loan Type Distribution (Full Width) */}
        <Card className="flex flex-col rounded-[2rem] shadow-sm">
          <CustomCardHeader title="สัดส่วนประเภทสินเชื่อคงค้าง" icon={Layers} />
          {loanTypeData ? (
            <div className="p-8">
              <div className="grid grid-cols-1  gap-8 items-center">
                {/* Doughnut Chart */}
                <div className="relative">
                  <div className="h-[320px]">
                    <Doughnut 
                      data={loanTypeData} 
                      options={getDoughnutOptions()} 
                      plugins={[customLabelsPlugin]}
                    />
                    <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <p className="text-xs font-bold text-slate-400 uppercase">ประเภท</p>
                      <p className="text-4xl font-black text-slate-900 leading-tight">{totalLoanTypes}</p>
                      <p className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1">GROUPS</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyChartState 
              icon={Layers}
              title="ไม่มีข้อมูลประเภทสินเชื่อ"
              subtitle="ยังไม่มีข้อมูลประเภทสินเชื่อในระบบ หรือลองเปลี่ยนตัวกรองเพื่อดูข้อมูลอื่น"
            />
          )}
        </Card>

        {/* Chart 4: Interest Comparison (Full Width) */}
        <Card className="flex flex-col rounded-[2rem] shadow-sm">
          <CustomCardHeader
            title="ดอกเบี้ยรับจริง vs ตามเงื่อนไข"
            icon={TrendingUp}
            action={
              debtData?.interestRateComparison?.length ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={scrollInterestChartToStart}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white"
                  >
                    ดูตั้งแต่ต้น
                  </button>
                  <button
                    type="button"
                    onClick={scrollInterestChartToEnd}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white"
                  >
                    ดูล่าสุด
                  </button>
                </div>
              ) : null
            }
          />
          {interestComparisonData ? (
            <div className="p-8">
              <div className="relative">
                <div
                  ref={interestChartScrollRef}
                  className="overflow-x-auto pb-3 -mx-2 px-2"
                >
                  <div className="h-[400px]" style={{ minWidth: interestChartMinWidth }}>
                    <Line data={interestComparisonData} options={lineOptions} />
                  </div>
                </div>
                {/* Subtle edge hints to indicate scroll */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                เลื่อนซ้าย-ขวาเพื่อดูข้อมูลย้อนหลังตั้งแต่ต้น
              </p>
              <div className="mt-6 p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                <div className="p-2 bg-blue-200 text-blue-700 rounded-lg">
                  <Info size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-blue-900">การวิเคราะห์ส่วนต่างดอกเบี้ย</h4>
                  <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                    ดอกเบี้ยรับจริงต่ำกว่าเป้าหมายเฉลี่ย 0.3% จากการผิดนัดชำระของกลุ่มสัญญามูลค่า 1-3 ล้านบาท ในช่วงไตรมาสที่ 2
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyChartState 
              icon={TrendingUp}
              title="ไม่มีข้อมูลดอกเบี้ย"
              subtitle="ยังไม่มีข้อมูลการชำระดอกเบี้ยในระบบ หรือลองเปลี่ยนตัวกรองเพื่อดูข้อมูลอื่น"
            />
          )}
        </Card>

        {/* Footer Info */}
        <div className="text-center mt-12">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest flex items-center justify-center gap-2">
            <Calendar size={12} /> Last Updated: Today at 09:30 AM
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
