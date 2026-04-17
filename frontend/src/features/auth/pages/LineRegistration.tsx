import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/shared/contexts/AuthContext';
import { linkLineAccount, unlinkLineAccount, checkLineLinked, getLineConfig } from '@/features/auth/api';
import {
  MessageCircle,
  Check,
  X,
  QrCode,
  Link2,
  ExternalLink,
  Copy,
  Smartphone,
  UserCheck,
  Bell,
  Zap,
  Shield,
} from 'lucide-react';

export default function LineRegistration(): JSX.Element {
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const [lineUserId, setLineUserId] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const hasAttemptedLink = useRef(false);

  type LineConfig = {
    qrCodeUrl: string;
    addFriendUrl: string;
    lineOaId: string;
  };

  // Get LINE configuration
  const { data: lineConfig } = useQuery<LineConfig>({
    queryKey: ['line-config'],
    queryFn: async () => {
      const fallback: LineConfig = {
        qrCodeUrl: 'https://qr-official.line.me/gs/M_smebank_GW.png',
        addFriendUrl: 'https://line.me/R/ti/p/@smebank',
        lineOaId: '@smebank',
      };

      try {
        const response = await getLineConfig();
        return (response?.data as LineConfig) ?? fallback;
      } catch (err: unknown) {
        console.error('Failed to get LINE config:', (err as Error)?.message ?? err);
        return fallback;
      }
    },
    retry: false,
  });

  const LINE_OA_ID = lineConfig?.lineOaId || '@smebank';
  const LINE_ADD_FRIEND_URL = lineConfig?.addFriendUrl || 'https://line.me/R/ti/p/@smebank';
  const qrCodeUrl = lineConfig?.qrCodeUrl || `https://qr-official.line.me/gs/M_${LINE_OA_ID.replace('@', '')}_GW.png`;

  // Check link status
  const { data: linkStatus } = useQuery({
    queryKey: ['line-link-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return { linked: false };
      try {
        const response = await checkLineLinked(user.id);
        return response.data || { linked: false };
      } catch (err: unknown) {
        console.error('Failed to check LINE link status:', (err as Error)?.message ?? err);
        return { linked: false };
      }
    },
    enabled: !!user?.id,
    retry: false,
  });

  const isLinked = Boolean(linkStatus?.linked);

  useEffect(() => {
    if (linkStatus?.lineUserId) setLineUserId(linkStatus.lineUserId);
  }, [linkStatus]);

  // Mutations
  const linkMutation = useMutation({
    mutationFn: async (userId: string) => linkLineAccount({ userId, lineUserId, token: registrationToken || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-link-status', user?.id] });
      toast.success('เชื่อมต่อ LINE สำเร็จ! คุณจะได้รับการแจ้งเตือนทุกวัน 08:00 น.');
      setIsAutoLinking(false);
      window.history.replaceState({}, '', '/line-registration');
    },
    onError: (err: unknown) => {
      const message = (err as Error)?.message ?? 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE';
      toast.error(message);
      setIsAutoLinking(false);
    },
  });

  // Auto registration from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const lineId = params.get('lineUserId');

    if (!lineId) return;

    setLineUserId(lineId);
    if (token) setRegistrationToken(token);

    if (!user?.id) {
      const authToken = localStorage.getItem('accessToken');
      if (!authToken) {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?returnUrl=${returnUrl}`;
        return;
      }
      return;
    }

    if (user?.id && !hasAttemptedLink.current) {
      hasAttemptedLink.current = true;
      setIsAutoLinking(true);
      linkMutation.mutate(user.id);
    }
  }, [user?.id, linkMutation]);

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');
      return unlinkLineAccount(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-link-status', user?.id] });
      setLineUserId('');
      toast.success('ยกเลิกการเชื่อมต่อ LINE แล้ว');
    },
    onError: (err: unknown) => {
      const message = (err as Error)?.message ?? 'เกิดข้อผิดพลาดในการยกเลิกการเชื่อมต่อ';
      toast.error(message);
    },
  });

  const handleLinkAccount = () => {
    if (!lineUserId.trim()) {
      toast.error('กรุณาใส่ LINE ID หรือ User ID');
      return;
    }
    if (isAuthLoading) {
      toast.error('กรุณารอสักครู่...');
      return;
    }
    if (!user?.id) {
      toast.error('กรุณา login ก่อนเชื่อมต่อ LINE');
      return;
    }
    linkMutation.mutate(user.id);
  };

  const handleUnlink = () => unlinkMutation.mutate();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('คัดลอกแล้ว');
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'หน้าหลัก' }, { label: 'เชื่อมต่อ LINE' }]}>
      {isAutoLinking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm mx-auto">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06C755]" />
                <div className="text-center">
                  <p className="font-medium">กำลังเชื่อมต่อบัญชี LINE...</p>
                  <p className="text-sm text-muted-foreground mt-1">กรุณารอสักครู่</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl p-8 shadow-lg ">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative z-10 flex mb-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md shadow-lg border border-white/30">
                <MessageCircle className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">เชื่อมต่อ LINE</h1>
                <p className="text-white/90">รับการแจ้งเตือนผ่าน LINE Official Account</p>
              </div>
            </div>
            {isLinked && (
              <Badge className="bg-white/20 backdrop-blur-md text-white hover:bg-white/30 px-4 py-2 text-base border border-white/30">
                <Check className="h-4 w-4 mr-2" />
                เชื่อมต่อแล้ว
              </Badge>
            )}
          </div>
        </div>

    

        {/* Status Card */}
        {isLinked && (
          <Card className="border-[#06C755]/30 bg-gradient-to-br from-[#06C755]/5 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#06C755]">
                <UserCheck className="h-6 w-6" />
                สถานะการเชื่อมต่อ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#06C755]/20">
                <div className="space-y-1 text-center md:text-left">
                  <p className="text-sm text-slate-500">LINE User ID</p>
                  <p className="font-mono text-sm font-medium">{lineUserId}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleUnlink} 
                  disabled={unlinkMutation.isPending}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  {unlinkMutation.isPending ? 'กำลังยกเลิก...' : 'ยกเลิกการเชื่อมต่อ'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Steps */}
        {!isLinked && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
            {/* Step 1: Add Friend */}
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#06C755] text-white text-sm font-bold">
                    1
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-[#06C755]" />
                    เพิ่มเพื่อน LINE OA
                  </CardTitle>
                </div>
                <CardDescription>สแกน QR Code หรือคลิกปุ่มด้านล่าง</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-2xl shadow-lg border-2 border-slate-100">
                    <img 
                      src={qrCodeUrl} 
                      alt="LINE QR Code" 
                      className="w-48 h-48"
                      onError={(e) => { 
                        e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(LINE_ADD_FRIEND_URL)}`; 
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-sm text-slate-600">LINE ID:</span>
                  <code className="px-3 py-1 bg-white rounded-lg font-bold text-[#06C755] border border-slate-200">
                    {LINE_OA_ID}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(LINE_OA_ID)}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <Button 
                  className="w-full bg-[#06C755] hover:bg-[#05a548] h-12 text-base font-medium shadow-lg" 
                  asChild
                >
                  <a href={LINE_ADD_FRIEND_URL} target="_blank" rel="noopener noreferrer">
                    <Smartphone className="h-5 w-5 mr-2" />
                    เปิด LINE เพื่อเพิ่มเพื่อน
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Step 2: Link Account */}
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#06C755] text-white text-sm font-bold">
                    2
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-[#06C755]" />
                    เชื่อมต่อบัญชี
                  </CardTitle>
                </div>
                <CardDescription>พิมพ์ "ลงทะเบียน" ใน LINE หรือใส่ User ID</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-[#06C755]/5 border border-blue-100">
                  <div className="flex gap-3">
                    <span className="text-2xl shrink-0">💡</span>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">วิธีง่ายที่สุด (แนะนำ)</p>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        พิมพ์ <strong className="text-[#06C755]">"ลงทะเบียน"</strong> ใน LINE OA 
                        แล้วกดปุ่มที่ระบบส่งมา ระบบจะเชื่อมต่อบัญชีอัตโนมัติ
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lineUserId" className="text-sm font-medium">
                    LINE ID หรือ User ID (ถ้ามี)
                  </Label>
                  <Input 
                    id="lineUserId" 
                    placeholder="pat665.com หรือ U123..." 
                    value={lineUserId} 
                    onChange={(e) => setLineUserId(e.target.value)} 
                    className="font-mono h-12 border-slate-300 focus:border-[#06C755] focus:ring-[#06C755]" 
                  />
                  <p className="text-xs text-slate-500">
                    ใส่ LINE ID (เช่น pat665.com) หรือ User ID จากระบบ
                  </p>
                </div>

                <Button 
                  onClick={handleLinkAccount} 
                  className="w-full bg-[#06C755] hover:bg-[#05a548] h-12 text-base font-medium shadow-lg" 
                  disabled={!lineUserId.trim() || linkMutation.isPending || isAuthLoading}
                >
                  <Link2 className="h-5 w-5 mr-2" />
                  {isAuthLoading ? 'กำลังโหลด...' : linkMutation.isPending ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อบัญชี'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
