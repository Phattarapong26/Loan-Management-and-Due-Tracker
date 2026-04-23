import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/shared/components/layout/DashboardLayout";
import {
  dashboardApi,
  branchesApi,
  usersApi,
  healthApi,
  User as GlobalUser,
} from "@/shared/lib/api-endpoints";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { DashboardSkeleton } from "@/shared/components/skeletons";
import {
  Users,
  AlertTriangle,
  Shield,
  Database,
  Building2,
  Server,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  CreditCard,
  Bell,
  Lock,
  TrendingUp,
  Activity,
  MoreVertical,
  ChevronRight,
  Settings,
  Clock,
  Info,
} from "lucide-react";

export default function AdminDashboard() {
  const [selectedHealthComponent, setSelectedHealthComponent] = useState<
    string | null
  >(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Fetch real health check data
  const { data: healthData, isLoading: isHealthLoading } = useQuery({
    queryKey: ["healthCheck"],
    queryFn: () => healthApi.getHealthCheck(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch all API endpoints
  const {
    data: endpointsData,
    isLoading: isEndpointsLoading,
    error: endpointsError,
  } = useQuery({
    queryKey: ["allEndpoints"],
    queryFn: async () => {
      try {
        const response = await healthApi.getAllEndpoints();
        return response.data;
      } catch (error) {
        console.error("Failed to fetch endpoints:", error);
        throw error;
      }
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 2,
  });

  // Fetch admin dashboard data with auto-refresh
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: () => dashboardApi.getAdminDashboard(),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: false,
  });

  // Fetch branches for comparison
  const { data: branchesData, isLoading: isBranchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const response = await branchesApi.list({ limit: 10 });
      return response.data?.branches || [];
    },
  });

  // Fetch users by role
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["usersByRole"],
    queryFn: async () => {
      const response = await usersApi.list({ status: "ACTIVE", limit: 100 });
      return response.data?.users || [];
    },
  });

  const isLoading =
    isHealthLoading ||
    isDashboardLoading ||
    isBranchesLoading ||
    isUsersLoading ||
    isEndpointsLoading;

  // Real health status from health check API
  const systemHealthStatus = healthData?.data?.status || "healthy";
  const healthChecks = healthData?.data?.checks;
  const systemUptime = healthChecks?.uptime || 0;

  // Dashboard data
  const activeUsersCount = dashboardData?.data?.activeUsers || 0;
  const failedJobsCount = dashboardData?.data?.failedJobs || 0;
  const securityAlertsCount = dashboardData?.data?.securityAlerts || 0;
  const dataVolume = dashboardData?.data?.dataVolume || {
    loans: 0,
    payments: 0,
    customers: 0,
    documents: 0,
    users: 0,
  };
  const dataToday = dashboardData?.data?.dataToday || { loans: 0, payments: 0 };

  // Group users by role
  const usersByRole = (usersData || []).reduce(
    (acc: Record<string, number>, user: GlobalUser) => {
      const role = user.role || "OTHER";
      acc[role] = (acc[role as string] || 0) + 1;
      return acc;
    },
    {},
  );

  const activeUsersByRole = [
    { role: "Loan Officer", count: usersByRole.OFFICER || 0, icon: Users },
    {
      role: "Branch Manager",
      count: usersByRole.MANAGER || 0,
      icon: Building2,
    },
    { role: "Admin", count: usersByRole.ADMIN || 0, icon: Shield },
  ];

  // Real system health components from health check API
  const systemHealthComponents = [
    {
      name: "Database",
      status: healthChecks?.database?.status || "unknown",
      uptime: healthChecks?.database?.latency
        ? healthChecks.database.latency < 100
          ? 99.9
          : 98.5
        : 0,
      latency: healthChecks?.database?.latency,
      message: healthChecks?.database?.message,
    },
    {
      name: "Redis Cache",
      status: healthChecks?.redis?.status || "unknown",
      uptime: healthChecks?.redis?.latency
        ? healthChecks.redis.latency < 100
          ? 99.9
          : 98.5
        : 0,
      latency: healthChecks?.redis?.latency,
      message: healthChecks?.redis?.message,
    },
    {
      name: "Job Queue",
      status: healthChecks?.queue?.status || "unknown",
      uptime: healthChecks?.queue?.status === "healthy" ? 99.5 : 95.0,
      message: healthChecks?.queue?.message,
    },
    {
      name: "Disk Storage",
      status: healthChecks?.disk?.status || "unknown",
      uptime: healthChecks?.disk?.status === "healthy" ? 99.9 : 90.0,
      message: healthChecks?.disk?.message,
      details: healthChecks?.disk?.details,
    },
    {
      name: "Memory Usage",
      status: healthChecks?.memory?.status || "unknown",
      uptime: healthChecks?.memory?.status === "healthy" ? 99.9 : 95.0,
      message: healthChecks?.memory?.message,
      details: healthChecks?.memory?.details,
    },
  ];

  // Data volume metrics - แสดงข้อมูลทั้งหมดในระบบ
  const dataVolumeMetrics = [
    {
      name: "Loans",
      count: dataVolume?.loans || 0,
      icon: FileText,
      trend: `+${dataToday?.loans || 0} วันนี้`,
      color: "from-primary/5 to-primary/10",
      iconColor: "text-primary",
    },
    {
      name: "Payments",
      count: dataVolume?.payments || 0,
      icon: CreditCard,
      trend: `+${dataToday?.payments || 0} วันนี้`,
      color: "from-primary/5 to-primary/10",
      iconColor: "text-primary",
    },
    {
      name: "Customers",
      count: dataVolume?.customers || 0,
      icon: Users,
      trend: "ทั้งหมด",
      color: "from-primary/5 to-primary/10",
      iconColor: "text-primary",
    },
    {
      name: "Documents",
      count: dataVolume?.documents || 0,
      icon: Database,
      trend: "ทั้งหมด",
      color: "from-primary/5 to-primary/10",
      iconColor: "text-primary",
    },
    {
      name: "Users",
      count: dataVolume?.users || 0,
      icon: Shield,
      trend: "ทั้งหมด",
      color: "from-primary/5 to-primary/10",
      iconColor: "text-primary",
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "หน้าหลัก" },
          { label: "Dashboard ผู้ดูแลระบบ" },
        ]}
      >
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "หน้าหลัก" }, { label: "Dashboard ผู้ดูแลระบบ" }]}
    >
      {/* Dashboard Content */}
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl text-white font-bold">
            Dashbord Mornitoring
          </h1>
          <p className="text-white">ข้อมูลและภาพรวมสถานะของระบบ</p>
        </div>
        {/* Top Stats - System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Wave Background */}
            <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
              <svg
                viewBox="0 0 400 200"
                className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-primary opacity-10"
                />
                <path
                  d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-primary opacity-20"
                />
                <path
                  d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-primary opacity-40"
                />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-xl bg-primary shadow-lg shadow-primary/20">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <Badge
                  className={
                    systemHealthStatus === "healthy"
                      ? "bg-emerald-100 text-emerald-600"
                      : systemHealthStatus === "degraded"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-rose-100 text-rose-600"
                  }
                >
                  {systemHealthStatus === "healthy"
                    ? "Healthy"
                    : systemHealthStatus === "degraded"
                      ? "Degraded"
                      : "Unhealthy"}
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-slate-500 text-sm font-medium">
                  System Health
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {systemHealthStatus === "healthy"
                    ? "99.9%"
                    : systemHealthStatus === "degraded"
                      ? "98.5%"
                      : "95.0%"}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Uptime: {Math.floor(systemUptime / 3600)}h{" "}
                  {Math.floor((systemUptime % 3600) / 60)}m
                </p>
              </div>
            </div>
          </div>

          <div className="relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Wave Background */}
            <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
              <svg
                viewBox="0 0 400 200"
                className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-blue-500 opacity-10"
                />
                <path
                  d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-blue-500 opacity-20"
                />
                <path
                  d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-blue-500 opacity-40"
                />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-xl bg-primary shadow-lg shadow-primary/20">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <Badge className="bg-primary/10 text-primary">Online</Badge>
              </div>
              <div className="mt-4">
                <p className="text-slate-500 text-sm font-medium">
                  Active Users
                </p>
                <h3 className="text-2xl font-bold mt-1">{activeUsersCount}</h3>
              </div>
            </div>
          </div>

          <div className="relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Wave Background */}
            <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
              <svg
                viewBox="0 0 400 200"
                className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-rose-500 opacity-10"
                />
                <path
                  d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-rose-500 opacity-20"
                />
                <path
                  d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-rose-500 opacity-40"
                />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-xl bg-primary shadow-lg shadow-primary/20">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <Badge
                  className={
                    failedJobsCount > 0
                      ? "bg-rose-100 text-rose-600"
                      : "bg-emerald-100 text-emerald-600"
                  }
                >
                  {failedJobsCount > 0 ? "Issues" : "Clear"}
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-slate-500 text-sm font-medium">
                  Failed Jobs
                </p>
                <h3 className="text-2xl font-bold mt-1">{failedJobsCount}</h3>
              </div>
            </div>
          </div>

          <div className="relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Wave Background */}
            <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
              <svg
                viewBox="0 0 400 200"
                className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-amber-500 opacity-10"
                />
                <path
                  d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-amber-500 opacity-20"
                />
                <path
                  d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-amber-500 opacity-40"
                />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-xl bg-primary shadow-lg shadow-primary/20">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <Badge
                  className={
                    securityAlertsCount > 0
                      ? "bg-amber-100 text-amber-600"
                      : "bg-emerald-100 text-emerald-600"
                  }
                >
                  {securityAlertsCount > 0 ? "Alerts" : "Secure"}
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-slate-500 text-sm font-medium">
                  Security Alerts
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {securityAlertsCount}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* System Health & API Endpoints */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* System Health Components */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold flex items-center gap-2">
                <Server size={18} className="text-primary" /> สถานะระบบ
              </h2>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {systemHealthComponents.map((system) => (
                <div
                  key={system.name}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 cursor-pointer"
                  onClick={() => setSelectedHealthComponent(system.name)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        system.status === "healthy"
                          ? "bg-emerald-500 animate-pulse"
                          : system.status === "degraded"
                            ? "bg-amber-500 animate-pulse"
                            : system.status === "unhealthy"
                              ? "bg-rose-500 animate-pulse"
                              : "bg-slate-300"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {system.name}
                        </span>
                        {system.latency && (
                          <span className="text-xs text-slate-400">
                            {system.latency}ms
                          </span>
                        )}
                      </div>
                      {system.message && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {system.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                      {system.uptime.toFixed(1)}%
                    </span>
                    <Badge
                      className={`text-xs ${
                        system.status === "healthy"
                          ? "bg-emerald-100 text-emerald-600"
                          : system.status === "degraded"
                            ? "bg-amber-100 text-amber-600"
                            : system.status === "unhealthy"
                              ? "bg-rose-100 text-rose-600"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {system.status === "healthy"
                        ? "Healthy"
                        : system.status === "degraded"
                          ? "Degraded"
                          : system.status === "unhealthy"
                            ? "Unhealthy"
                            : "Unknown"}
                    </Badge>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* API Endpoints Status */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold flex items-center gap-2">
                <Server size={18} className="text-primary" /> API Endpoints
              </h2>
              <Badge className="bg-primary/10 text-primary">
                {endpointsData?.total || 0} Endpoints
              </Badge>
            </div>

            {isEndpointsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : endpointsError ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <AlertCircle size={48} className="mb-2 text-amber-500" />
                <p className="text-sm font-medium text-slate-600">
                  ไม่สามารถโหลดข้อมูล API Endpoints
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  กรุณาตรวจสอบการเชื่อมต่อ
                </p>
              </div>
            ) : (
              (() => {
                const categories = endpointsData?.categories || {};

                return Object.keys(categories).length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {Object.entries(categories).map(([category, routes]) => {
                      const isExpanded = expandedCategories.has(category);
                      const displayRoutes = isExpanded ? routes : routes.slice(0, 3);
                      
                      return (
                        <div
                          key={category}
                          className="border border-slate-100 rounded-xl overflow-hidden"
                        >
                          <div className="bg-slate-50 px-3 py-2 font-medium text-xs text-slate-700 flex items-center justify-between">
                            <span>{category}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500">
                                {
                                  routes.filter(
                                    (r: { status: string }) =>
                                      r.status === "healthy",
                                  ).length
                                }
                                /{routes.length}
                              </span>
                              <Badge className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0">
                                {routes.length}
                              </Badge>
                            </div>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {displayRoutes
                              .map(
                                (
                                  route: {
                                    method: string;
                                    path: string;
                                    status: string;
                                  },
                                  idx: number,
                                ) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Badge
                                        className={`text-[9px] px-1 py-0 font-semibold ${
                                          route.method === "GET"
                                            ? "bg-blue-100 text-blue-600"
                                            : route.method === "POST"
                                              ? "bg-green-100 text-green-600"
                                              : route.method === "PUT"
                                                ? "bg-amber-100 text-amber-600"
                                                : route.method === "PATCH"
                                                  ? "bg-purple-100 text-purple-600"
                                                  : route.method === "DELETE"
                                                    ? "bg-rose-100 text-rose-600"
                                                    : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {route.method}
                                      </Badge>
                                      <span className="text-[10px] text-slate-600 truncate font-mono">
                                        {route.path}
                                      </span>
                                    </div>
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        route.status === "healthy"
                                          ? "bg-emerald-500"
                                          : route.status === "degraded"
                                            ? "bg-amber-500"
                                            : "bg-rose-500"
                                      }`}
                                    />
                                  </div>
                                ),
                              )}
                            {routes.length > 3 && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedCategories);
                                  if (isExpanded) {
                                    newExpanded.delete(category);
                                  } else {
                                    newExpanded.add(category);
                                  }
                                  setExpandedCategories(newExpanded);
                                }}
                                className="w-full px-3 py-1.5 text-[10px] text-slate-500 hover:text-slate-700 text-center bg-slate-50/50 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronRight className="w-3 h-3 rotate-90" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronRight className="w-3 h-3" />
                                    + {routes.length - 3} more
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Server size={48} className="mb-2" />
                    <p className="text-sm font-medium">
                      ไม่มีข้อมูล API Endpoints
                    </p>
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Data Volume & System Notifications */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Data Volume Metrics */}
          <div className="xl:col-span-2 relative bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Wave Background */}
            <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
              <svg
                viewBox="0 0 400 200"
                className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-primary opacity-10"
                />
                <path
                  d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-primary opacity-20"
                />
                <path
                  d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-primary opacity-40"
                />
              </svg>
            </div>

            {/* Content Layer */}
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="font-bold flex items-center gap-2 text-slate-900">
                  <Database size={18} className="text-primary" />{" "}
                  ปริมาณข้อมูลในระบบ
                </h2>
                <Badge className="bg-primary/10 text-primary text-xs border-none hover:bg-primary/20 transition-colors w-full sm:w-auto flex justify-center sm:block">
                  Total Records:{" "}
                  {(
                    (dataVolume?.loans || 0) +
                    (dataVolume?.payments || 0) +
                    (dataVolume?.customers || 0) +
                    (dataVolume?.documents || 0) +
                    (dataVolume?.users || 0)
                  ).toLocaleString()}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {dataVolumeMetrics.map((data) => (
                  <div
                    key={data.name}
                    className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-lg transition-all transform hover:-translate-y-1 border border-primary/10"
                  >
                    <data.icon
                      className={`h-8 w-8 ${data.iconColor} mx-auto mb-2`}
                    />
                    <p className="text-2xl font-bold text-slate-900">
                      {data.count.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {data.name}
                    </p>
                    <Badge className="mt-2 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 border-none">
                      {data.trend}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-3 border border-primary/10">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Activity size={14} className="text-primary" />
                  <span>Database Size Estimate:</span>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  ~
                  {(
                    ((dataVolume?.loans || 0) * 2 +
                      (dataVolume?.payments || 0) * 1 +
                      (dataVolume?.customers || 0) * 3 +
                      (dataVolume?.documents || 0) * 5 +
                      (dataVolume?.users || 0) * 1) /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </span>
              </div>
            </div>
          </div>

          {/* System Notifications & Alerts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold flex items-center gap-2">
                <Bell size={18} className="text-primary" /> การแจ้งเตือนระบบ
              </h2>
            </div>
            <div className="space-y-4">
              {systemHealthStatus !== "healthy" && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      System health is {systemHealthStatus}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date().toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {failedJobsCount > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                    <XCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {failedJobsCount} งานล้มเหลว
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      ต้องตรวจสอบ
                    </p>
                  </div>
                </div>
              )}

              {securityAlertsCount > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {securityAlertsCount} การแจ้งเตือนความปลอดภัย
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      วันนี้
                    </p>
                  </div>
                </div>
              )}

              {systemHealthStatus === "healthy" &&
                failedJobsCount === 0 &&
                securityAlertsCount === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <CheckCircle size={48} className="mb-2 text-primary" />
                    <p className="text-sm font-medium">ระบบทำงานปกติ</p>
                    <p className="text-xs text-slate-400 mt-1">
                      ไม่มีการแจ้งเตือน
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Active Users by Role & Branch Comparison */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Active Users by Role */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold flex items-center gap-2">
                <Users size={18} className="text-primary" /> ผู้ใช้งานออนไลน์
              </h2>
              <Badge className="bg-primary">
                {activeUsersByRole.reduce((sum, u) => sum + u.count, 0)}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {activeUsersByRole.map((user) => (
                <div
                  key={user.role}
                  className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <user.icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{user.count}</p>
                  <p className="text-xs text-slate-500 mt-1">{user.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Branch Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2">
                <Building2 size={18} className="text-primary" /> เปรียบเทียบสาขา
              </h2>
              <Badge className="bg-primary/10 text-primary">
                {branchesData?.length || 0} สาขา
              </Badge>
            </div>
            <div className="overflow-x-auto">
              {branchesData && branchesData.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">สาขา</th>
                      <th className="px-6 py-4 text-center">สถานะ</th>
                      <th className="px-6 py-4 text-right">รหัส</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {branchesData
                      .slice(0, 5)
                      .map(
                        (branch: {
                          id: string;
                          name: string;
                          status: string;
                          code: string;
                        }) => (
                          <tr
                            key={branch.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="px-6 py-4 font-semibold text-sm">
                              {branch.name}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Badge
                                className={`text-xs ${
                                  branch.status === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {branch.status === "ACTIVE"
                                  ? "Active"
                                  : "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-slate-500">
                              {branch.code}
                            </td>
                          </tr>
                        ),
                      )}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Building2 size={48} className="mb-2" />
                  <p className="text-sm font-medium">ไม่มีข้อมูลสาขา</p>
                </div>
              )}
            </div>
            {branchesData && branchesData.length > 5 && (
              <div className="p-4 border-t border-slate-50 text-center">
                <button className="text-sm font-semibold text-primary hover:text-[#008e43]">
                  ดูทั้งหมด ({branchesData.length} สาขา)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* System Metrics Summary */}
        <div className="relative bg-gradient-to-br from-primary to-primary/80 p-6 rounded-2xl border border-white/10 text-white shadow-lg overflow-hidden">
          {/* Wave Background */}
          <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
            <svg
              viewBox="0 0 400 200"
              className="absolute bottom-0 right-0 w-[140%] h-full opacity-70 scale-x-[-1] translate-x-10 translate-y-6"
              preserveAspectRatio="none"
            >
              {/* Wave Layer 1 (Back) */}
              <path
                d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z"
                fill="currentColor"
                className="text-white opacity-20"
              />
              {/* Wave Layer 2 (Middle) */}
              <path
                d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z"
                fill="currentColor"
                className="text-white opacity-40"
              />
              {/* Wave Layer 3 (Front) */}
              <path
                d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z"
                fill="currentColor"
                className="text-white opacity-80"
              />
            </svg>
          </div>

          {/* Content Layer */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left w-full md:w-auto">
              <h3 className="font-bold text-lg mb-2 text-white">
                System Performance
              </h3>
              <p className="text-sm text-white/80 flex items-center justify-center md:justify-start gap-2">
                Overall system health:{" "}
                <span
                  className={`font-bold text-white px-2 py-0.5 rounded ${
                    systemHealthStatus === "healthy"
                      ? "bg-emerald-500/30"
                      : systemHealthStatus === "degraded"
                        ? "bg-amber-500/30"
                        : "bg-rose-500/30"
                  }`}
                >
                  {systemHealthStatus.toUpperCase()}
                </span>
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full md:w-auto md:flex md:gap-8 pt-4 md:pt-0 border-t border-white/10 md:border-none">
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white shadow-sm">
                  {activeUsersCount}
                </p>
                <p className="text-xs text-white/70 mt-1 font-medium">
                  Active Users
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white shadow-sm">
                  {(
                    dataVolume.loans +
                    dataVolume.payments +
                    dataVolume.customers
                  ).toLocaleString()}
                </p>
                <p className="text-xs text-white/70 mt-1 font-medium">
                  Total Records
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white shadow-sm">
                  {systemHealthStatus === "healthy"
                    ? "99.9"
                    : systemHealthStatus === "degraded"
                      ? "98.5"
                      : "95.0"}
                  %
                </p>
                <p className="text-xs text-white/70 mt-1 font-medium">Uptime</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-6 px-8 text-center text-slate-400 text-xs">
        © 2026 SME D BANK System. All rights reserved. Administrator Dashboard.
      </footer>

      {/* Health Component Details Modal */}
      {selectedHealthComponent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedHealthComponent(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Server size={20} className="text-primary" />
                  {selectedHealthComponent}
                </h3>
                <button
                  onClick={() => setSelectedHealthComponent(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {(() => {
                const component = systemHealthComponents.find(
                  (c) => c.name === selectedHealthComponent,
                );
                if (!component) return null;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Status</span>
                      <Badge
                        className={`text-xs ${
                          component.status === "healthy"
                            ? "bg-emerald-100 text-emerald-600"
                            : component.status === "degraded"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-rose-100 text-rose-600"
                        }`}
                      >
                        {component.status === "healthy"
                          ? "Healthy"
                          : component.status === "degraded"
                            ? "Degraded"
                            : "Unhealthy"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Uptime</span>
                      <span className="text-sm font-medium">
                        {component.uptime.toFixed(1)}%
                      </span>
                    </div>

                    {component.latency && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Latency</span>
                        <span className="text-sm font-medium">
                          {component.latency}ms
                        </span>
                      </div>
                    )}

                    {component.message && (
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-700">
                          {component.message}
                        </p>
                      </div>
                    )}

                    {component.details &&
                      typeof component.details === "object" && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">
                            Details
                          </p>
                          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                            {Object.entries(component.details).map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-slate-500 capitalize">
                                    {key.replace(/([A-Z])/g, " $1").trim()}
                                  </span>
                                  <span className="font-medium text-slate-700">
                                    {typeof value === "number"
                                      ? (value as number).toLocaleString()
                                      : String(value)}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    <div className="pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedHealthComponent(null)}
                        className="w-full py-2 px-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
