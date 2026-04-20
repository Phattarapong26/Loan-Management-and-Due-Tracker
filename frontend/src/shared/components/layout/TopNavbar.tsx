import {
  Menu,
  Bell,
  Mail,
  Grid3X3,
  ChevronRight,
  Home,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  KeyRound,
} from "lucide-react";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useAuth } from "@/shared/contexts/AuthContext";
import type { User } from "@/shared/types/user";
import { roleLabels } from "@/shared/config/navigation";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";

interface TopNavbarProps {
  user: User;
  onMenuToggle: () => void;
}

export function TopNavbar({ user, onMenuToggle }: TopNavbarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications({ limit: 10 });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("ออกจากระบบสำเร็จ");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการออกจากระบบ");
    }
  };

  const handleProfile = () => {
    navigate("/profile");
  };

  const handleSettings = () => {
    navigate("/settings");
  };

  const handleChangePassword = () => {
    navigate("/change-password");
  };

  return (
    <header
      className={cn(
        "h-16 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white backdrop-blur-md border-b border-gray-200 shadow-lg" // เปลี่ยน bg เป็นสีขาวเมื่อ scroll
          : "bg-transparent",
      )}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className={cn(
            "transition-colors duration-300",
            isScrolled
              ? "text-primary hover:bg-gray-100"
              : "text-white hover:bg-white/20",
          )}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center">
            <picture>
              <source srcSet="/logo.webp" type="image/webp" />
              <img
                src="/logo.png"
                alt="SME Bank"
                width="32"
                height="46"
                className={cn(
                  "h-24 w-auto object-contain transition-all duration-300",
                  isScrolled ? "brightness-100" : "brightness-0 invert",
                )}
              />
            </picture>
          </div>
          <span
            className={cn(
              "text-xl font-semibold hidden sm:inline transition-colors duration-300",
              isScrolled ? "text-gray-400" : "text-white",
            )}
          >
            SME D BANK
          </span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Quick Actions */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "hidden sm:flex transition-colors duration-300",
            isScrolled
              ? "text-primary hover:bg-gray-100"
              : "text-white hover:bg-white/20",
          )}
        >
          <Grid3X3 className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "relative transition-colors duration-300",
                isScrolled
                  ? "text-primary hover:bg-gray-100"
                  : "text-white hover:bg-white/20",
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground text-xs border-2 border-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>การแจ้งเตือน</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 text-xs text-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllAsRead();
                  }}
                >
                  อ่านทั้งหมด
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  กำลังโหลด...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  ไม่มีการแจ้งเตือน
                </div>
              ) : (
                notifications.slice(0, 5).map((notification: any) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 cursor-pointer",
                      !notification.read && "bg-primary/5",
                    )}
                    onClick={() => {
                      if (!notification.read) markAsRead(notification.id);
                      if (notification.link) navigate(notification.link);
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium text-sm truncate flex-1">
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: th,
                      })}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-primary cursor-pointer font-medium"
              onClick={() => navigate("/notifications")}
            >
              ดูทั้งหมด
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center gap-2 px-2 transition-all duration-300",
                isScrolled
                  ? "text-primary hover:bg-gray-100"
                  : "text-white hover:bg-white/20",
              )}
            >
              <Avatar
                className={cn(
                  "h-9 w-9 border-2 transition-colors duration-300",
                  isScrolled ? "border-primary/20" : "border-white/30",
                )}
              >
                <AvatarImage src={user.avatar} />
                <AvatarFallback
                  className={cn(
                    "transition-colors duration-300",
                    isScrolled
                      ? "bg-primary/10 text-primary"
                      : "bg-white/20 text-white",
                  )}
                >
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              <div className="hidden md:flex flex-col items-start text-left">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider transition-colors duration-300",
                    isScrolled ? "text-muted-foreground" : "text-white/70",
                  )}
                >
                  {roleLabels[user.role]}
                </span>
                <span className="text-sm font-semibold truncate max-w-[100px]">
                  {user.name}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>โปรไฟล์</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>ตั้งค่า</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleChangePassword} className="cursor-pointer">
              <KeyRound className="mr-2 h-4 w-4" />
              <span>เปลี่ยนรหัสผ่าน</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>ออกจากระบบ</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center gap-2 text-sm mb-6", className)}>
      <Home className="h-4 w-4 opacity-70" />
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 opacity-70" />
          <span
            className={
              index === items.length - 1
                ? "font-medium"
                : "opacity-70 hover:opacity-100 cursor-pointer"
            }
          >
            {item.label}
          </span>
        </div>
      ))}
    </nav>
  );
}
