import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Lock, Mail, Shield, User, Briefcase, Loader2, Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '@/shared/types/user';
import { lazy, Suspense } from 'react';
import { useCenterAlert } from '@/shared/hooks/useCenterAlert';

const ThreeBackground = lazy(() => import('@/shared/components/ThreeBackground'));

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showError, AlertComponent } = useCenterAlert();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success && result.role) {
      const roleRedirects: Record<UserRole, string> = {
        ADMIN: '/dashboard/admin',
        admin: '/dashboard/admin',
        MANAGER: '/dashboard/branch-manager',
        branch_manager: '/dashboard/branch-manager',
        OFFICER: '/dashboard/loan-officer',
        loan_officer: '/dashboard/loan-officer',
        USER: '/dashboard/user',
        CUSTOMER: '/dashboard/customer',
        customer: '/dashboard/customer',
      };
      const redirectPath = roleRedirects[result.role] || '/dashboard';
      navigate(redirectPath, { replace: true });
    } else {
      showError(
        result.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง',
        {
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          onRetry: () => {
            // Clear password and focus on email
            setPassword('');
            document.getElementById('email')?.focus();
          },
          onForgotPassword: () => {
            navigate('/forgot-password');
          },
          onHelpDesk: () => {
            // You can implement help desk contact logic here
            window.open('mailto:support@smebank.com?subject=ขอความช่วยเหลือเข้าสู่ระบบ', '_blank');
          },
        }
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <Suspense fallback={null}>
        <ThreeBackground />
      </Suspense>
      {AlertComponent}
      <div className="w-full max-w-[420px] relative z-10">
        <Card className="shadow-2xl border-0 bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-10">
            <Tabs defaultValue="login" className="w-full">
            

              <TabsContent value="login" className="space-y-6 mt-0">
                {/* Logo */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center mb-4">
                    <picture>
                      <source srcSet="/logo.webp" type="image/webp" />
                      <img src="/logo.png" alt="SME Bank" width="96" height="137" className="h-24 w-auto object-contain" />
                    </picture>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5b7cfa]" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-12 bg-gray-50 border-0 rounded-xl text-gray-800 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#5b7cfa] focus-visible:ring-offset-0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5b7cfa]" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 pr-12 h-12 bg-gray-50 border-0 rounded-xl text-gray-800 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#5b7cfa] focus-visible:ring-offset-0"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5b7cfa] transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#5b7cfa] focus:ring-[#5b7cfa]" />
                      <span className="text-gray-600">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-[#5b7cfa] hover:underline font-medium"
                    >
                      Reset Password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-[#5b7cfa] to-[#4facfe] hover:opacity-90 text-white rounded-xl font-medium text-base shadow-lg shadow-[#5b7cfa]/30 transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        กำลังเข้าสู่ระบบ...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Demo tab removed */}
            </Tabs>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
