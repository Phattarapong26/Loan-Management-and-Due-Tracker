import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Lock, Loader, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/shared/lib/api-endpoints';
import { toast } from 'sonner';

const ThreeBackground = lazy(() => import('@/shared/components/ThreeBackground'));

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Password validation
    const getPasswordErrors = (pwd: string) => {
        const errors: string[] = [];
        if (pwd.length < 8) errors.push('อย่างน้อย 8 ตัวอักษร');
        if (!/[A-Z]/.test(pwd)) errors.push('ตัวอักษรพิมพ์ใหญ่ อย่างน้อย 1 ตัว');
        if (!/[a-z]/.test(pwd)) errors.push('ตัวอักษรพิมพ์เล็ก อย่างน้อย 1 ตัว');
        if (!/[0-9]/.test(pwd)) errors.push('ตัวเลข อย่างน้อย 1 ตัว');
        if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('อักขระพิเศษ อย่างน้อย 1 ตัว');
        return errors;
    };

    const passwordErrors = getPasswordErrors(password);
    const isPasswordValid = passwordErrors.length === 0;

    useEffect(() => {
        if (!token) {
            setError('ไม่พบ Token สำหรับรีเซ็ตรหัสผ่าน กรุณาตรวจสอบลิงก์ใหม่อีกครั้ง');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error('รหัสผ่านไม่ตรงกัน');
            return;
        }

        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await authApi.resetPasswordWithToken({
                token,
                password,
            });

            if (result.error) throw new Error(result.error.message ?? String(result.error));

            setIsSuccess(true);
            toast.success('รีเซ็ตรหัสผ่านสำเร็จแล้ว');

            // Auto redirect after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: unknown) {
            const message = (err as Error)?.message ?? (typeof err === 'string' ? err : 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <Suspense fallback={null}>
                <ThreeBackground />
            </Suspense>
            <div className="w-full max-w-[420px] relative z-10">
                <Card className="shadow-2xl border-0 bg-white rounded-3xl overflow-hidden">
                    <CardContent className="p-10">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center mb-4">
                                <picture>
                                    <source srcSet="/logo.webp" type="image/webp" />
                                    <img src="/logo.png" alt="SME Bank" width="80" height="114" className="h-20 w-auto object-contain" />
                                </picture>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">ตั้งรหัสผ่านใหม่</h2>
                            <p className="text-sm text-gray-500 mt-2">
                                ระบุรหัสผ่านใหม่ที่คุณต้องการใช้งาน
                            </p>
                        </div>

                        {isSuccess ? (
                            <div className="text-center space-y-6">
                                <div className="flex justify-center">
                                    <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                                        <CheckCircle2 className="h-12 w-12" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-700 font-medium">เปลี่ยนรหัสผ่านสำเร็จ!</p>
                                    <p className="text-sm text-gray-500">
                                        ระบบจะนำคุณไปยังหน้าเข้าสู่ระบบใน 3 วินาที...
                                    </p>
                                </div>
                                <Button
                                    className="w-full h-12 bg-[#5b7cfa] text-white rounded-xl"
                                    onClick={() => navigate('/login')}
                                >
                                    เข้าสู่ระบบทันที
                                </Button>
                            </div>
                        ) : error ? (
                            <div className="text-center space-y-6">
                                <div className="flex justify-center">
                                    <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                        <AlertCircle className="h-12 w-12" />
                                    </div>
                                </div>
                                <p className="text-sm text-red-500 font-medium bg-red-50 p-4 rounded-xl">
                                    {error}
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full h-12 rounded-xl border-gray-200"
                                    onClick={() => navigate('/forgot-password')}
                                >
                                    ขอรับลิงก์รีเซ็ตอีกครั้ง
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">รหัสผ่านใหม่</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5b7cfa]" />
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-12 pr-12 h-12 bg-gray-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-[#5b7cfa]"
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">ยืนยันรหัสผ่านใหม่</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5b7cfa]" />
                                        <Input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-12 pr-12 h-12 bg-gray-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-[#5b7cfa]"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {password && confirmPassword && password !== confirmPassword && (
                                        <p className="text-xs text-red-500 ml-1">รหัสผ่านไม่ตรงกัน</p>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        className="w-full h-12 bg-gradient-to-r from-[#5b7cfa] to-[#4facfe] text-white rounded-xl font-medium shadow-lg hover:opacity-90 transition-all"
                                        disabled={isLoading || !password || password !== confirmPassword || !isPasswordValid}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader className="h-5 w-5 mr-2 animate-spin" />
                                                กำลังดำเนินการ...
                                            </>
                                        ) : (
                                            'เปลี่ยนรหัสผ่าน'
                                        )}
                                    </Button>
                                </div>

                                {passwordErrors.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-sm font-medium text-red-700 mb-2">รหัสผ่านต้องประกอบด้วย:</p>
                                        <ul className="text-xs text-red-600 space-y-1">
                                            {passwordErrors.map((error, index) => (
                                                <li key={index} className="flex items-start">
                                                    <span className="mr-2">•</span>
                                                    {error}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <p className="text-xs text-center text-gray-400">
                                    รหัสผ่านต้องประกอบด้วย ตัวอักษรพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ อย่างน้อย 1 ตัว
                                </p>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
