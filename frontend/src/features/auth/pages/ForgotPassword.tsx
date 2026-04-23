import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Mail, Loader, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/shared/lib/api-endpoints';
import { toast } from 'sonner';

const ThreeBackground = lazy(() => import('@/shared/components/ThreeBackground'));

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await authApi.forgotPassword(email);
            if (result.error) throw new Error(result.error.message ?? String(result.error));
            setIsSent(true);
            toast.success('ลิงก์รีเซ็ตรหัสผ่านถูกส่งไปยังอีเมลของคุณแล้ว');
        } catch (error: unknown) {
            const message = (error as Error)?.message ?? (typeof error === 'string' ? error : 'เกิดข้อผิดพลาดในการส่งลิงก์รีเซ็ต');
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
                            <h2 className="text-2xl font-bold text-gray-800">ลืมรหัสผ่าน?</h2>
                            <p className="text-sm text-gray-500 mt-2">
                                ระบุอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
                            </p>
                        </div>

                        {isSent ? (
                            <div className="text-center space-y-6">
                                <div className="flex justify-center">
                                    <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                                        <CheckCircle2 className="h-12 w-12" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-gray-700 font-medium">ส่งอีเมลเรียบร้อยแล้ว!</p>
                                    <p className="text-sm text-gray-500">
                                        โปรดตรวจสอบกล่องขาเข้าของอีเมล <b>{email}</b> และทำตามขั้นตอนในอีเมล
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full h-12 rounded-xl border-gray-200"
                                    onClick={() => navigate('/login')}
                                >
                                    กลับสู่หน้าเข้าสู่ระบบ
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                        อีเมลที่ลงทะเบียน
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5b7cfa]" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="example@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-12 h-12 bg-gray-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-[#5b7cfa]"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-gradient-to-r from-[#5b7cfa] to-[#4facfe] text-white rounded-xl font-medium shadow-lg hover:opacity-90 transition-all"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader className="h-5 w-5 mr-2 animate-spin" />
                                            กำลังส่งลิงก์...
                                        </>
                                    ) : (
                                        'ส่งลิงก์รีเซ็ตรหัสผ่าน'
                                    )}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="flex items-center justify-center w-full text-sm text-gray-500 hover:text-[#5b7cfa] transition-colors"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    กลับไปหน้าเข้าสู่ระบบ
                                </button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
