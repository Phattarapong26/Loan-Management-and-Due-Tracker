import { useLocation, Link } from 'react-router-dom';
import * as React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Upload,
  CreditCard,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Building2,
  UserCog,
  Settings,
  Calendar,
  Bell,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Wallet,
  Package,
  ShieldCheck,
  History,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { toast } from 'sonner';
import type { User, MenuItem } from '@/shared/types/user';
import { getNavigationForRole, roleLabels } from '@/shared/config/navigation';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  FileText,
  Upload,
  CreditCard,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Building2,
  UserCog,
  Settings,
  Calendar,
  Bell,
  MessageCircle,
  Receipt,
  Wallet,
  Package,
  ShieldCheck,
  History,
};

interface AppSidebarProps {
  user: User;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({ user, isCollapsed, onToggleCollapse }: AppSidebarProps) {
  const location = useLocation();
  const navigation = getNavigationForRole(user.role);
  const [approvedCount, setApprovedCount] = React.useState<number>(0);

  // Fetch approved disbursements count
  React.useEffect(() => {
    let isMounted = true;

    const fetchApprovedCount = async () => {
      try {
        const { disbursementsApi } = await import('@/shared/lib/api-endpoints');
        const response = await disbursementsApi.list({ 
          status: 'APPROVED',
          page: 1,
          limit: 1
        });
        if (isMounted) {
          setApprovedCount(response.data?.total || 0);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch approved disbursements count:', error);
        }
      }
    };

    fetchApprovedCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchApprovedCount, 30000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update navigation with badge count
  const navigationWithBadges = React.useMemo(() => {
    return navigation.map(group => ({
      ...group,
      items: group.items.map(item => {
        if (item.url === '/transactions' && approvedCount > 0) {
          return { ...item, badge: approvedCount };
        }
        return item;
      })
    }));
  }, [navigation, approvedCount]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (url: string) => {
    // Exact match for dashboard routes to prevent all dashboard routes being active
    if (url.startsWith('/dashboard')) {
      return location.pathname === url;
    }
    // For other routes, check if current path starts with the menu item path
    if (location.pathname === url) return true;
    // Check if it's a sub-route (e.g., /customers/123 matches /customers)
    return location.pathname.startsWith(url + '/');
  };

  return (
    <aside
      className={cn(
        'h-full bg-sidebar border-r border-sidebar-border rounded-tr-[20px] transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* User Profile Section */}
      <div className={cn(
        'p-4 border-b border-sidebar-border',
        isCollapsed && 'flex justify-center px-2'
      )}>
        <div className={cn(
          'flex items-center gap-3 pr-5',
          isCollapsed && 'flex-col'
        )}>
          <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {roleLabels[user.role]}
              </p>
              {user.branchName && (
                <p className="text-xs text-muted-foreground/70 truncate">
                  {user.branchName}
                </p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-4">
          {navigationWithBadges.map((group) => {
            const groupBadgeCount = group.items.reduce((acc, item) => acc + (item.badge || 0), 0);

            if (isCollapsed) {
              return (
                <div key={group.id} className="space-y-1">
                  {group.items.map((item) => renderSidebarItem(item, isCollapsed))}
                </div>
              );
            }

            if (!group.collapsible) {
              return (
                <div key={group.id} className="space-y-1">
                  <div className="px-3 mb-2">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">
                      {group.title}
                    </h2>
                  </div>
                  {group.items.map((item) => renderSidebarItem(item, isCollapsed))}
                </div>
              );
            }

            return (
              <Accordion
                key={group.id}
                type="single"
                collapsible
                defaultValue={group.defaultOpen ? group.id : undefined}
                className="border-none"
              >
                <AccordionItem value={group.id} className="border-none">
                  <AccordionTrigger className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:no-underline hover:text-foreground transition-colors group">
                    <span className="flex-1 text-left">{group.title}</span>
                    {groupBadgeCount > 0 && (
                      <Badge 
                        className="h-4 min-w-[1rem] flex items-center justify-center p-0 text-[10px] px-1 bg-primary text-primary-foreground mr-1 shadow-md"
                        aria-label={`${groupBadgeCount} รายการรอดำเนินการ`}
                      >
                        {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                      </Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 pt-1 will-change-[height] transform-gpu">
                    <div className="space-y-1 ml-2 border-l border-sidebar-border/50 pl-2 mt-1">
                      {group.items.map((item) => renderSidebarItem(item, isCollapsed))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })}
        </div>
      </ScrollArea>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn(
            'w-full flex items-center gap-2 text-muted-foreground hover:text-foreground',
            isCollapsed && 'justify-center'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">ย่อเมนู</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );

  function renderSidebarItem(item: MenuItem, isCollapsed: boolean) {
    const Icon = iconMap[item.icon] || LayoutDashboard;
    const active = isActive(item.url);

    const menuButton = (
      <Link
        key={item.url}
        to={item.url}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
          active
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <div className={cn("relative shrink-0", isCollapsed && "pr-3")}>
          <Icon className={cn('h-5 w-5', active && 'text-primary-foreground')} />
          {isCollapsed && item.badge && item.badge > 0 && (
            <>
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary/30 animate-ping" />
              <Badge
                className={cn(
                  "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold border-2 border-sidebar pointer-events-none shadow-lg animate-in zoom-in-50 duration-200",
                  active 
                    ? "bg-primary/90 text-primary-foreground ring-2 ring-primary/30" 
                    : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-2 ring-primary/30"
                )}
                aria-label={`${item.badge} รายการรอดำเนินการ`}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </Badge>
            </>
          )}
        </div>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-sm font-medium">{item.title}</span>
            {item.badge && item.badge > 0 && (
              <Badge
                variant={active ? 'secondary' : 'default'}
                className={cn(
                  'h-5 min-w-5 flex items-center justify-center text-xs font-bold shrink-0 shadow-md',
                  active 
                    ? 'bg-primary-foreground/20 text-primary-foreground' 
                    : 'bg-primary text-primary-foreground'
                )}
                aria-label={`${item.badge} รายการรอดำเนินการ`}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </Badge>
            )}
          </>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.url} delayDuration={0}>
          <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.title}
            {item.badge && item.badge > 0 && (
              <Badge className="h-5 font-bold bg-primary text-primary-foreground">
                {item.badge > 99 ? "99+" : item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return menuButton;
  }
}
