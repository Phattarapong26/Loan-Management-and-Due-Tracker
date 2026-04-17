import { PartyPopper, Briefcase, TrendingUp } from 'lucide-react';
import type { User } from '@/shared/types/user';
import { cn } from '@/shared/lib/utils';

interface WelcomeBannerProps {
  user: User;
  className?: string;
}

export function WelcomeBanner({ user, className }: WelcomeBannerProps) {
  return (
    <div className={cn("welcome-banner animate-fade-in h-full rounded-lg border p-4", className)}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-foreground">
              ยินดีต้อนรับ {user.name}
            </h2>
            <PartyPopper className="h-6 w-6 text-warning" />
          </div>
          <p className="text-muted-foreground mb-6">
            คุณทำยอดได้{' '}
            <span className="text-success font-semibold">65%</span>{' '}
            มากกว่าปีที่แล้ว
          </p>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">฿4,800</p>
                <p className="text-xs text-muted-foreground">ปีนี้</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-destructive/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">฿2,300</p>
                <p className="text-xs text-muted-foreground">ปีที่แล้ว</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="hidden lg:block relative">
          <div className="w-48 h-40 flex items-end justify-center">
            {/* Simple desk illustration using CSS */}
            <div className="relative">
              {/* Person */}
              <div className="w-16 h-16 bg-primary/20 rounded-full mb-2 flex items-center justify-center">
                <div className="w-10 h-10 bg-primary/30 rounded-full" />
              </div>
              {/* Desk */}
              <div className="w-32 h-4 bg-muted rounded-lg" />
              {/* Laptop on desk */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-8 bg-foreground/10 rounded-t-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
