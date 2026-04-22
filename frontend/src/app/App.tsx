import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/shared/contexts/AuthContext";
import { ProtectedRoute } from "@/features/auth/components/auth/ProtectedRoute";
import { configApi } from "@/shared/lib/config-api";
import { useEffect } from "react";

import Login from "@/features/auth/pages/Login";
import Customers from "@/features/customers/pages/Customers";
import CustomerDetail from "@/features/customers/pages/CustomerDetail";
import Loans from "@/features/loans/pages/Loans";
import LoanDetail from "@/features/loans/pages/LoanDetail";
import Documents from "@/features/documents/pages/Documents";
import DocumentUploadWithCustomer from "@/features/documents/pages/DocumentUploadWithCustomer";
import Payments from "@/features/payments/pages/Payments";
import { InvoicePage } from "@/features/payments/pages/InvoicePage";
import Reports from "@/features/reports/pages/Reports";
import { LoanProducts } from "@/features/approvals/pages/LoanProducts";
import CollectionsReminders from "@/features/collections/pages/CollectionsReminders";
import DebtManagementResults from "@/features/collections/pages/DebtManagementResults";
import Disbursements from "@/features/disbursements/pages/Disbursements";
import Transactions from "@/features/transactions/pages/Transactions";
import Branches from "@/features/branches/pages/Branches";
import BranchProfile from "@/features/branches/pages/BranchProfile";
import UsersPage from "@/features/users/pages/Users";
import BranchStaff from "@/features/users/pages/BranchStaff";
import OfficerPerformance from "@/features/users/pages/OfficerPerformance";
import Settings from "@/features/settings/pages/Settings";
import Profile from "@/features/settings/pages/Profile";
import CalendarPage from "@/features/calendar/pages/CalendarPage";
import Notifications from "@/features/notifications/pages/Notifications";
import NotFound from "@/app/pages/NotFound";
import LineRegistration from "@/features/auth/pages/LineRegistration";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import ResetPassword from "@/features/auth/pages/ResetPassword";
import ChangePassword from "@/features/auth/pages/ChangePassword";
import SecurityDashboard from "@/features/monitoring/pages/SecurityDashboard";
import AuditLogs from "@/features/monitoring/pages/AuditLogs";
import DocumentBackfill from "@/features/monitoring/pages/DocumentBackfill";
import { SecureDocumentAccess } from "@/features/documents/pages/SecureDocumentAccess";
import OverpaymentCalculator from "@/pages/OverpaymentCalculator";

// Role-specific Dashboards
import {
  LoanOfficerDashboard,
  BranchManagerDashboard,
  AdminDashboard
} from "@/features/dashboard/pages/dashboards";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - cache persists for 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnMount: false, // Don't refetch on component mount if data exists
      retry: 1, // Only retry failed requests once
    },
  },
});

const App = () => {
  // Register the current frontend URL on app startup
  useEffect(() => {
    configApi.registerFrontendUrl();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Public Invoice Route - accessible from LINE */}
            <Route path="/invoice/:scheduleId" element={<InvoicePage />} />
            
            {/* Public Secure Document Route - password protected */}
            <Route path="/secure-document/:token" element={<SecureDocumentAccess />} />

            {/* Public Overpayment Calculator - accessible from LINE */}
            <Route path="/overpayment-calculator" element={<OverpaymentCalculator />} />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Role-specific Dashboard Routes */}
            <Route path="/dashboard/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/branch-manager" element={
              <ProtectedRoute allowedRoles={['branch_manager', 'admin']}>
                <BranchManagerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/loan-officer" element={
              <ProtectedRoute allowedRoles={['loan_officer', 'admin', 'branch_manager']}>
                <LoanOfficerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <LoanOfficerDashboard />
              </ProtectedRoute>
            } />

            {/* Protected Routes */}
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
            <Route path="/loans" element={<ProtectedRoute><Loans /></ProtectedRoute>} />
            <Route path="/loans/:id" element={<ProtectedRoute><LoanDetail /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/documents/upload" element={<ProtectedRoute><DocumentUploadWithCustomer /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/invoices/schedule/:scheduleId" element={<ProtectedRoute><InvoicePage /></ProtectedRoute>} />
            <Route path="/invoices/loan/:loanId" element={<ProtectedRoute><InvoicePage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'branch_manager']}><Reports /></ProtectedRoute>} />
            <Route path="/loan-products" element={<ProtectedRoute allowedRoles={['admin']}><LoanProducts /></ProtectedRoute>} />
            <Route path="/collections" element={<ProtectedRoute allowedRoles={['admin', 'branch_manager', 'loan_officer']}><CollectionsReminders /></ProtectedRoute>} />
            <Route path="/collections/debt-management-results" element={<ProtectedRoute allowedRoles={['admin', 'branch_manager', 'loan_officer']}><DebtManagementResults /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Disbursements /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/branches" element={<ProtectedRoute allowedRoles={['admin']}><Branches /></ProtectedRoute>} />
            <Route path="/branches/:id" element={<ProtectedRoute allowedRoles={['admin', 'branch_manager', 'loan_officer']}><BranchProfile /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UsersPage /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute allowedRoles={['branch_manager', 'admin']}><OfficerPerformance /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
            <Route path="/monitoring/security" element={<ProtectedRoute allowedRoles={['admin']}><SecurityDashboard /></ProtectedRoute>} />
            <Route path="/monitoring/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
            <Route path="/monitoring/document-backfill" element={<ProtectedRoute allowedRoles={['admin']}><DocumentBackfill /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/line-registration" element={<ProtectedRoute><LineRegistration /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
