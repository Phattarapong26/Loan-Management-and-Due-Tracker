import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/shared/lib/api-endpoints';
import { toast } from 'sonner';

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
            if (result.error) throw new Error(result.error as string);
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
        <div className="max-w-lg mx-auto py-10 px-4">
            <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" />
                กลับ
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">เปลี่ยนรหัสผ่าน</CardTitle>
                </CardHeader>
                <CardContent>
                    {isSuccess ? (
                        <div className="text-center space-y-4 py-6">
                            <div className="flex justify-center">
                                <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                                    <CheckCircle2 className="h-10 w-10" />
                                </div>
                            </div>
                            <p className="font-medium text-gray-700">เปลี่ยนรหัสผ่านสำเร็จ!</p>
                            <Button className="w-full" onClick={() => navigate(-1)}>กลับ</Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Current password */}
                            <div className="space-y-2">
                                <Label>รหัสผ่านปัจจุบัน</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type={showCurrent ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="pl-10 pr-10"
                                        required
                                    />
                                    <button type="button" tabIndex={-1}
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* New password */}
                            <div className="space-y-2">
                                <Label>รหัสผ่านใหม่</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type={showNew ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="pl-10 pr-10"
                                        required
                                    />
                                    <button type="button" tabIndex={-1}
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {newPassword && passwordErrors.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-xs font-medium text-red-700 mb-1">รหัสผ่านต้องประกอบด้วย:</p>
                                        <ul className="text-xs text-red-600 space-y-0.5">
                                            {passwordErrors.map((err, i) => (
                                                <li key={i}>• {err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Confirm new password */}
                            <div className="space-y-2">
                                <Label>ยืนยันรหัสผ่านใหม่</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type={showConfirm ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10 pr-10"
                                        required
                                    />
                                    <button type="button" tabIndex={-1}
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {confirmPassword && !passwordsMatch && (
                                    <p className="text-xs text-red-500">รหัสผ่านไม่ตรงกัน</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading || !currentPassword || !isPasswordValid || !passwordsMatch}
                            >
                                {isLoading ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />กำลังดำเนินการ...</>
                                ) : 'เปลี่ยนรหัสผ่าน'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
