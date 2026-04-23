import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Lock, Eye, EyeOff, Loader, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/shared/lib/api-endpoints';
import { toast } from 'sonner';

const ThreeBackground = lazy(() => import('@/shared/components/ThreeBackground'));

export default function ChangePassword() {
    const navigate = useNavigate();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const getPasswordErrors = (pwd: string) => {
        const errors: string[] = [];
        if (pwd.length < 8) errors.push('อย่างน้อย 8 ตัวอักษร');
        if (!/[A-Z]/.test(pwd)) errors.push('ตัวอักษรพิมพ์ใหญ่ อย่างน้อย 1 ตัว');
        if (!/[a-z]/.test(pwd)) errors.push('ตัวอักษรพิมพ์เล็ก อย่างน้อย 1 ตัว');
        if (!/[0-9]/.test(pwd)) errors.push('ตัวเลข อย่างน้อย 1 ตัว');
        if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('อักขระพิเศษ อย่างน้อย 1 ตัว');
        return errors;
    };

    const passwordErrors = getPasswordErrors(newPassword);
    const isPasswordValid = passwordErrors.length === 0;
    const passwordsMatch = newPassword === confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordsMatch) {
            toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }
        setIsLoading(true);
        try {
            const result = await authApi.changePassword({ currentPassword, newPassword });
            if (result.error) throw new Error(result.error.message);
            setIsSuccess(true);
            toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
        } catch (err: unknown) {
            const message = (err as Error)?.message ?? 'เกิดข้อผิดพลาด';
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
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center mb-4">
                                <picture>
                                    <source srcSet="/logo.webp" type="image/webp" />
                                    <img src="/logo.png" alt="SME Bank" width="80" height="114" className="h-20 w-auto object-contain" />
                                </picture>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">เปลี่ยนรหัสผ่าน</h2>
                            <p className="text-sm text-gray-500 mt-2">ระบุรหัสผ่านปัจจุบันและรหัสผ่านใหม่</p>
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
                                </div>
                                <Button
                                    className="w-full h-12 bg-[#5b7cfa] text-white rounded-xl"
                                    onClick={() => navigate(-1)}
                                >
                                    กลับ
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Current password */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">รหัสผ่านปัจจุบัน</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5b7cfa]" />
                                        <Input
                                            type={showCurrent ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="pl-12 pr-12 h-12 bg-gray-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-[#5b7cfa]"
                                            required
                                        />
                                        <button type="button" tabIndex={-1}
                                            onClick={() => setShowCurrent(!showCurrent)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                            {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* New password */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">รหัสผ่านใหม่</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5b7cfa]" />
                                        <Input
                                            type={showNew ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="pl-12 pr-12 h-12 bg-gray-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-[#5b7cfa]"
                                            required
                                        />
                                        <button type="button" tabIndex={-1}
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                            {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm new password */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">ยืนยันรหัสผ่านใหม่</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5b7cfa]" />
                                        <Input
                                            type={showConfirm ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-12 pr-12 h-12 bg-gray-50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-[#5b7cfa]"
                                            required
                                        />
                                        <button type="button" tabIndex={-1}
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                            {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {confirmPassword && !passwordsMatch && (
                                        <p className="text-xs text-red-500 ml-1">รหัสผ่านไม่ตรงกัน</p>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        className="w-full h-12 bg-gradient-to-r from-[#5b7cfa] to-[#4facfe] text-white rounded-xl font-medium shadow-lg hover:opacity-90 transition-all"
                                        disabled={isLoading || !currentPassword || !isPasswordValid || !passwordsMatch}
                                    >
                                        {isLoading ? (
                                            <><Loader className="h-5 w-5 mr-2 animate-spin" />กำลังดำเนินการ...</>
                                        ) : 'เปลี่ยนรหัสผ่าน'}
                                    </Button>
                                </div>

                                {newPassword && passwordErrors.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-sm font-medium text-red-700 mb-2">รหัสผ่านต้องประกอบด้วย:</p>
                                        <ul className="text-xs text-red-600 space-y-1">
                                            {passwordErrors.map((err, i) => (
                                                <li key={i} className="flex items-start">
                                                    <span className="mr-2">•</span>{err}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <p className="text-xs text-center text-gray-400">
                                    รหัสผ่านต้องประกอบด้วย ตัวอักษรพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ อย่างน้อย 1 ตัว
                                </p>

                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mt-2"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    กลับ
                                </button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
