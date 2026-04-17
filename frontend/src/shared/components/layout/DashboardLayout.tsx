import { useState } from "react";
import { TopNavbar, Breadcrumb } from "./TopNavbar";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/shared/contexts/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function DashboardLayout({
  children,
  breadcrumbs = [],
}: DashboardLayoutProps) {
  const { user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) {
    return null;
  }

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* 1. Global Background (คงเดิม) */}
      <div className="absolute top-0 left-0 right-0 h-[360px] z-0 overflow-hidden">
        <picture>
          <source srcSet="/banner.webp" type="image/webp" />
          <img
            src="/banner.JPEG"
            alt="Background"
            width="1920"
            height="360"
            loading="eager"
            fetchpriority="high"
            className="w-full h-full object-cover object-[40%_center] md:object-[center_80%]"
          />
        </picture>
        {/* บนซ้ายจาง -> กลางทึบ -> ล่างขวาจาง */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue/60 via-[50%] to-transparent"></div>
      </div>

      {/* 2. Top Navigation (ต้องมี z-index สูงกว่า Sidebar) */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <TopNavbar user={user} onMenuToggle={toggleSidebar} />
      </div>

      {/* 3. Main Layout Container */}
      <div className="flex pt-16 min-h-screen relative z-10">
        {/* Sidebar Overlay (Mobile Only) - วางไว้ก่อน Sidebar */}
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-[35] md:hidden transition-opacity duration-300",
            isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* 4. Sidebar Wrapper 
            - ใช้ sticky เพื่อให้เลื่อนตามแต่ไม่ทับ Navbar 
            - top-16 คือระยะที่เท่ากับความสูง Navbar */}
        <aside
          className={cn(
            "fixed md:sticky top-16 h-[calc(100vh-4rem)] z-[40] transition-all duration-300 flex-none",
            isMobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0",
            isSidebarCollapsed ? "w-20" : "w-64",
          )}
        >
          {/* ส่วนประกอบ Sidebar ที่มีขอบมนและเงา (ลอยอยู่ใต้ Navbar) */}
          <div className="h-full py-4 pl-0 pr-8">
            <div className="h-full bg-white rounded-r-[2rem] shadow-xl overflow-hidden border border-slate-200/50">
              <AppSidebar
                user={user}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() =>
                  setIsSidebarCollapsed(!isSidebarCollapsed)
                }
              />
            </div>
          </div>
        </aside>

        {/* 5. Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 flex flex-col">
            {breadcrumbs.length > 0 && (
              <Breadcrumb
                items={breadcrumbs}
                className="text-white px-6 py-3 shadow-sm flex-none mx-4 mt-4"
              />
            )}

            {/* ปรับจาก px-8 เหลือ px-4 เพื่อเพิ่มพื้นที่เนื้อหา */}
            <div className="flex-1 px-1 py-6">
              <div className="min-h-full">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
