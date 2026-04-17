import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Separator } from '@/shared/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Save,
  RefreshCw,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Building2,
  Globe,
  Clock,
  FileText,
  Banknote,
  CalendarDays,
  Percent,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { LineIntegrationCard } from '@/features/settings/components/settings/LineIntegrationCard';
import { LineQRCodeCard } from '@/features/settings/components/settings/LineQRCodeCard';
import { apiClient } from '@/shared/lib/api-client';
import { settingsApi } from '@/shared/lib/api-endpoints';
import { Badge } from '@/shared/components/ui/badge';

interface InterestRate {
  mlr: number;
  mrr: number;
  lastUpdated: string;
  updatedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

export default function Settings() {
  const queryClient = useQueryClient();
  
  // Get tab from URL query parameter
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const defaultTab = searchParams.get('tab') || 'general';

  // Load general settings
  const { data: generalData, isLoading: loadingGeneral } = useQuery({
    queryKey: ['settings', 'general'],
    queryFn: () => settingsApi.getGeneral(),
  });

  // Load notification settings
  const { data: notificationData, isLoading: loadingNotifications } = useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: () => settingsApi.getNotifications(),
  });

  // Load security settings
  const { data: securityData, isLoading: loadingSecurity } = useQuery({
    queryKey: ['settings', 'security'],
    queryFn: () => settingsApi.getSecurity(),
  });

  const [generalSettings, setGeneralSettings] = useState({
    companyName: '',
    email: '',
    phone: '',
    language: 'th',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lineNotifications: true,
    reminderDays: '3',
    dailyReport: true,
    nplAlert: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: '24',
    passwordExpiry: '90',
    twoFactor: false,
    loginAttempts: '5',
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (generalData?.data) {
      setGeneralSettings(generalData.data);
    }
  }, [generalData]);

  useEffect(() => {
    if (notificationData?.data) {
      setNotificationSettings(notificationData.data);
    }
  }, [notificationData]);

  useEffect(() => {
    if (securityData?.data) {
      setSecuritySettings(securityData.data);
    }
  }, [securityData]);

  // Mutations
  const updateGeneralMutation = useMutation({
    mutationFn: (data: typeof generalSettings) => settingsApi.updateGeneral(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'general'] });
      toast.success('บันทึกการตั้งค่าทั่วไปสำเร็จ');
    },
    onError: (error: any) => {
      toast.error('ไม่สามารถบันทึกการตั้งค่าได้', {
        description: error.message
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: (data: typeof notificationSettings) => settingsApi.updateNotifications(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
      toast.success('บันทึกการตั้งค่าการแจ้งเตือนสำเร็จ');
    },
    onError: (error: any) => {
      toast.error('ไม่สามารถบันทึกการตั้งค่าได้', {
        description: error.message
      });
    },
  });

  const updateSecurityMutation = useMutation({
    mutationFn: (data: typeof securitySettings) => settingsApi.updateSecurity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'security'] });
      toast.success('บันทึกการตั้งค่าความปลอดภัยสำเร็จ');
    },
    onError: (error: any) => {
      toast.error('ไม่สามารถบันทึกการตั้งค่าได้', {
        description: error.message
      });
    },
  });

  const [interestRates, setInterestRates] = useState<InterestRate | null>(null);
  const [mlrInput, setMlrInput] = useState('');
  const [mrrInput, setMrrInput] = useState('');
  const [loadingRates, setLoadingRates] = useState(false);
  const [savingMLR, setSavingMLR] = useState(false);
  const [savingMRR, setSavingMRR] = useState(false);

  // Load interest rates on mount
  useEffect(() => {
    loadInterestRates();
  }, []);

  const loadInterestRates = async () => {
    try {
      setLoadingRates(true);
      const response = await apiClient.get<InterestRate>('/api/interest-rates');
      if (response.data) {
        setInterestRates(response.data);
        setMlrInput(response.data.mlr.toString());
        setMrrInput(response.data.mrr.toString());
      }
    } catch (error: any) {
      toast.error('ไม่สามารถโหลดอัตราดอกเบี้ยได้', {
        description: error.message
      });
    } finally {
      setLoadingRates(false);
    }
  };

  const handleUpdateMLR = async () => {
    try {
      setSavingMLR(true);
      const rate = parseFloat(mlrInput);
      
      if (isNaN(rate) || rate < 0 || rate > 20) {
        toast.error('อัตราดอกเบี้ยไม่ถูกต้อง', {
          description: 'กรุณากรอกอัตราระหว่าง 0-20%'
        });
        return;
      }

      await apiClient.patch('/api/interest-rates/mlr', { rate });
      
      toast.success('อัปเดต MLR สำเร็จ', {
        description: 'ระบบได้ส่งการแจ้งเตือนไปยังผู้ใช้ทุกคนแล้ว'
      });
      
      await loadInterestRates();
    } catch (error: any) {
      toast.error('ไม่สามารถอัปเดต MLR ได้', {
        description: error.message
      });
    } finally {
      setSavingMLR(false);
    }
  };

  const handleUpdateMRR = async () => {
    try {
      setSavingMRR(true);
      const rate = parseFloat(mrrInput);
      
      if (isNaN(rate) || rate < 0 || rate > 20) {
        toast.error('อัตราดอกเบี้ยไม่ถูกต้อง', {
          description: 'กรุณากรอกอัตราระหว่าง 0-20%'
        });
        return;
      }

      await apiClient.patch('/api/interest-rates/mrr', { rate });
      
      toast.success('อัปเดต MRR สำเร็จ', {
        description: 'ระบบได้ส่งการแจ้งเตือนไปยังผู้ใช้ทุกคนแล้ว'
      });
      
      await loadInterestRates();
    } catch (error: any) {
      toast.error('ไม่สามารถอัปเดต MRR ได้', {
        description: error.message
      });
    } finally {
      setSavingMRR(false);
    }
  };

  const handleSaveGeneral = () => {
    updateGeneralMutation.mutate(generalSettings);
  };

  const handleSaveNotifications = () => {
    updateNotificationsMutation.mutate(notificationSettings);
  };

  const handleSaveSecurity = () => {
    updateSecurityMutation.mutate(securitySettings);
  };

  const handleRefreshRates = () => {
    loadInterestRates();
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'การตั้งค่าระบบ' }]}>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">การตั้งค่าระบบ</h1>
          <p className="text-white">จัดการการตั้งค่าต่างๆ ของระบบ</p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="general">ทั่วไป</TabsTrigger>
          <TabsTrigger value="notifications">แจ้งเตือน</TabsTrigger>
          <TabsTrigger value="line" className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            LINE
          </TabsTrigger>
          <TabsTrigger value="security">ความปลอดภัย</TabsTrigger>
          <TabsTrigger value="interest">อัตราดอกเบี้ย</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="space-y-6">

            {/* ── ข้อมูลองค์กร ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-primary" />
                  ข้อมูลองค์กร
                </CardTitle>
                <CardDescription>ชื่อ ที่อยู่ และข้อมูลติดต่อขององค์กร</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ชื่อบริษัท / สถาบัน</Label>
                    <Input
                      placeholder="เช่น SME D BANK"
                      value={generalSettings.companyName}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, companyName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>อีเมลองค์กร</Label>
                    <Input
                      type="email"
                      placeholder="contact@company.com"
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>เบอร์โทรศัพท์</Label>
                    <Input
                      placeholder="02-xxx-xxxx"
                      value={generalSettings.phone}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      ภาษาระบบ
                    </Label>
                    <Select
                      value={generalSettings.language}
                      onValueChange={(value) => setGeneralSettings({ ...generalSettings, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="th">🇹🇭 ภาษาไทย</SelectItem>
                        <SelectItem value="en">🇺🇸 English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── การแสดงผลและรูปแบบ ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-primary" />
                  รูปแบบการแสดงผล
                </CardTitle>
                <CardDescription>รูปแบบวันที่ สกุลเงิน และ timezone</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      รูปแบบวันที่
                    </Label>
                    <Select defaultValue="dd/mm/yyyy">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                      สกุลเงิน
                    </Label>
                    <Select defaultValue="thb">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thb">฿ บาท (THB)</SelectItem>
                        <SelectItem value="usd">$ ดอลลาร์ (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      Timezone
                    </Label>
                    <Select defaultValue="asia_bangkok">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asia_bangkok">Asia/Bangkok (UTC+7)</SelectItem>
                        <SelectItem value="utc">UTC+0</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── นโยบายสินเชื่อ ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Percent className="h-5 w-5 text-primary" />
                  นโยบายสินเชื่อ
                </CardTitle>
                <CardDescription>ค่าเริ่มต้นสำหรับการสร้างสินเชื่อใหม่</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>วันครบกำหนดชำระ (ค่าเริ่มต้น)</Label>
                    <Select defaultValue="1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 5, 10, 15, 20, 25, 28].map(d => (
                          <SelectItem key={d} value={String(d)}>วันที่ {d} ของเดือน</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ระยะเวลาผ่อนชำระสูงสุด (เดือน)</Label>
                    <Select defaultValue="120">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">60 เดือน (5 ปี)</SelectItem>
                        <SelectItem value="84">84 เดือน (7 ปี)</SelectItem>
                        <SelectItem value="120">120 เดือน (10 ปี)</SelectItem>
                        <SelectItem value="180">180 เดือน (15 ปี)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>เกณฑ์ NPL (วันค้างชำระ)</Label>
                    <Select defaultValue="90">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">60 วัน</SelectItem>
                        <SelectItem value="90">90 วัน (มาตรฐาน)</SelectItem>
                        <SelectItem value="120">120 วัน</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">คำนวณดอกเบี้ยทบต้น</Label>
                      <p className="text-xs text-muted-foreground">สำหรับสินเชื่อที่ค้างชำระ ≥ 90 วัน</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">อนุมัติอัตโนมัติ</Label>
                      <p className="text-xs text-muted-foreground">สำหรับสินเชื่อที่ผ่านเกณฑ์ DSCR ≥ 1.5</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── ข้อมูลระบบ (read-only) ── */}
            <Card className="bg-slate-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  ข้อมูลระบบ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {[
                    { label: 'เวอร์ชันระบบ', value: 'v2.0.0' },
                    { label: 'สภาพแวดล้อม', value: (import.meta as any).env?.DEV ? 'Development' : 'Production' },
                    { label: 'API Endpoint', value: (import.meta as any).env?.VITE_API_URL || 'localhost:3000' },
                    { label: 'Build Date', value: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) },
                  ].map(item => (
                    <div key={item.label} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-medium text-slate-700 truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveGeneral} disabled={updateGeneralMutation.isPending}>
                {updateGeneralMutation.isPending
                  ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />กำลังบันทึก...</>
                  : <><Save className="h-4 w-4 mr-2" />บันทึกการตั้งค่า</>
                }
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                การตั้งค่าการแจ้งเตือน
              </CardTitle>
              <CardDescription>ตั้งค่าการแจ้งเตือนต่างๆ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>แจ้งเตือนทางอีเมล</Label>
                  <p className="text-sm text-muted-foreground">รับการแจ้งเตือนผ่านอีเมล</p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>แจ้งเตือนทาง LINE</Label>
                  <p className="text-sm text-muted-foreground">รับการแจ้งเตือนผ่าน LINE OA</p>
                </div>
                <Switch
                  checked={notificationSettings.lineNotifications}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, lineNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>รายงานประจำวัน</Label>
                  <p className="text-sm text-muted-foreground">ส่งรายงานสรุปทุกเช้า 08:00 น.</p>
                </div>
                <Switch
                  checked={notificationSettings.dailyReport}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, dailyReport: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>แจ้งเตือน NPL</Label>
                  <p className="text-sm text-muted-foreground">แจ้งเตือนเมื่อมีสินเชื่อเข้า NPL</p>
                </div>
                <Switch
                  checked={notificationSettings.nplAlert}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, nplAlert: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>แจ้งเตือนก่อนครบกำหนด (วัน)</Label>
                <Select
                  value={notificationSettings.reminderDays}
                  onValueChange={(value) => setNotificationSettings({ ...notificationSettings, reminderDays: value })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 วัน</SelectItem>
                    <SelectItem value="3">3 วัน</SelectItem>
                    <SelectItem value="5">5 วัน</SelectItem>
                    <SelectItem value="7">7 วัน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications}>
                  <Save className="h-4 w-4 mr-2" />
                  บันทึก
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LINE Integration Settings */}
        <TabsContent value="line">
          <div className="space-y-6">
            <LineIntegrationCard
              lineNotificationsEnabled={notificationSettings.lineNotifications}
              onToggleNotifications={(enabled) =>
                setNotificationSettings({ ...notificationSettings, lineNotifications: enabled })
              }
            />
            <LineQRCodeCard />
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                การตั้งค่าความปลอดภัย
              </CardTitle>
              <CardDescription>ตั้งค่าความปลอดภัยของระบบ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session Timeout (ชั่วโมง)</Label>
                  <Select
                    value={securitySettings.sessionTimeout}
                    onValueChange={(value) => setSecuritySettings({ ...securitySettings, sessionTimeout: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 ชั่วโมง</SelectItem>
                      <SelectItem value="8">8 ชั่วโมง</SelectItem>
                      <SelectItem value="24">24 ชั่วโมง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>รหัสผ่านหมดอายุ (วัน)</Label>
                  <Select
                    value={securitySettings.passwordExpiry}
                    onValueChange={(value) => setSecuritySettings({ ...securitySettings, passwordExpiry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 วัน</SelectItem>
                      <SelectItem value="60">60 วัน</SelectItem>
                      <SelectItem value="90">90 วัน</SelectItem>
                      <SelectItem value="never">ไม่หมดอายุ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>จำนวนครั้งที่ล็อกอินผิดก่อนล็อค</Label>
                  <Select
                    value={securitySettings.loginAttempts}
                    onValueChange={(value) => setSecuritySettings({ ...securitySettings, loginAttempts: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 ครั้ง</SelectItem>
                      <SelectItem value="5">5 ครั้ง</SelectItem>
                      <SelectItem value="10">10 ครั้ง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">ยืนยันตัวตน 2 ขั้นตอน</p>
                </div>
                <Switch
                  checked={securitySettings.twoFactor}
                  onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, twoFactor: checked })}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveSecurity}>
                  <Save className="h-4 w-4 mr-2" />
                  บันทึก
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interest Rate Settings */}
        <TabsContent value="interest">
          <div className="space-y-6">
            {/* Alert Banner */}
            <div className="bg-primary border border-emerald-100 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
              <div className="p-2 bg-white rounded-full text-emerald-600">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">ประกาศสำคัญ</h3>
                <p className="text-white text-sm mt-0.5">
                  การเปลี่ยนแปลงอัตราดอกเบี้ยอ้างอิง (MLR/MRR) จะส่งการแจ้งเตือนแบบเรียลไทม์ไปยังผู้ใช้ทุกคนผ่าน LINE OA ทันทีหลังจากกดอัปเดต
                </p>
              </div>
            </div>

            {/* Real-time Status Overview */}
            {interestRates && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* MLR Summary Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-32 w-32 text-emerald-600" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-gray-500 font-medium uppercase tracking-wider text-xs">
                          Minimum Loan Rate
                        </h2>
                        <h3 className="text-2xl font-bold mt-1">MLR</h3>
                        <p className="text-sm text-gray-400">อัตราดอกเบี้ยเงินกู้ขั้นต่ำ</p>
                      </div>
                      <div className="bg-emerald-50 px-3 py-1 rounded-full text-emerald-600 font-bold text-sm">
                        {interestRates.mlr.toFixed(3)}%
                      </div>
                    </div>
                    <div className="flex items-end gap-2 mt-8">
                      <span className="text-5xl font-extrabold text-primary">
                        {interestRates.mlr.toFixed(3)}%
                      </span>
                      <span className="text-gray-400 text-sm mb-2">ปัจจุบัน</span>
                    </div>
                  </div>
                </div>

                {/* MRR Summary Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                    <TrendingDown className="h-32 w-32 text-emerald-600" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-gray-500 font-medium uppercase tracking-wider text-xs">
                          Minimum Retail Rate
                        </h2>
                        <h3 className="text-2xl font-bold mt-1">MRR</h3>
                        <p className="text-sm text-gray-400">อัตราดอกเบี้ยเงินกู้รายย่อยขั้นต่ำ</p>
                      </div>
                      <div className="bg-emerald-50 px-3 py-1 rounded-full text-emerald-600 font-bold text-sm">
                        {interestRates.mrr.toFixed(3)}%
                      </div>
                    </div>
                    <div className="flex items-end gap-2 mt-8">
                      <span className="text-5xl font-extrabold text-primary">
                        {interestRates.mrr.toFixed(3)}%
                      </span>
                      <span className="text-gray-400 text-sm mb-2">ปัจจุบัน</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Update Forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Update MLR */}
              <div className="bg-white rounded-3xl p-8 shadow-md transition-all hover:shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-bold">ปรับปรุง MLR</h4>
                </div>
                
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    อัตราใหม่ (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      max="20"
                      value={mlrInput}
                      onChange={(e) => setMlrInput(e.target.value)}
                      disabled={loadingRates}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-2xl font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                      placeholder="0.000"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">
                      %
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 px-2">
                    <span>ระบุอัตราได้ระหว่าง 0.000 - 20.000%</span>
                    {interestRates && <span>ล่าสุด: {interestRates.mlr.toFixed(3)}%</span>}
                  </div>
                </div>

                <button
                  onClick={handleUpdateMLR}
                  disabled={savingMLR || loadingRates}
                  className="w-full mt-8 py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 hover:bg-emerald-700"
                >
                  {savingMLR ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      ยืนยันการอัปเดต MLR
                    </>
                  )}
                </button>
              </div>

              {/* Update MRR */}
              <div className="bg-white rounded-3xl p-8 shadow-md transition-all hover:shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    <TrendingDown className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-bold">ปรับปรุง MRR</h4>
                </div>
                
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    อัตราใหม่ (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      max="20"
                      value={mrrInput}
                      onChange={(e) => setMrrInput(e.target.value)}
                      disabled={loadingRates}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-2xl font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                      placeholder="0.000"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">
                      %
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 px-2">
                    <span>ระบุอัตราได้ระหว่าง 0.000 - 20.000%</span>
                    {interestRates && <span>ล่าสุด: {interestRates.mrr.toFixed(3)}%</span>}
                  </div>
                </div>

                <button
                  onClick={handleUpdateMRR}
                  disabled={savingMRR || loadingRates}
                  className="w-full mt-8 py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 hover:bg-emerald-700"
                >
                  {savingMRR ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      ยืนยันการอัปเดต MRR
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Audit Log Section */}
            {interestRates && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-6 mb-6">
                  <div>
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      ประวัติการอัปเดตล่าสุด
                    </h4>
                    <p className="text-sm text-gray-400">ข้อมูลการปรับเปลี่ยนอัตราดอกเบี้ยในระบบ</p>
                  </div>
                  <button
                    onClick={handleRefreshRates}
                    disabled={loadingRates}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors font-medium disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingRates ? 'animate-spin' : ''}`} />
                    รีเฟรชข้อมูล
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                      <Bell className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                        อัปเดตล่าสุด
                      </p>
                      <p className="font-bold text-slate-800">
                        {new Date(interestRates.lastUpdated).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {interestRates.updatedBy && (
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                        <SettingsIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                          ดำเนินการโดย
                        </p>
                        <p className="font-bold text-slate-800">
                          {interestRates.updatedBy.name} ({interestRates.updatedBy.role})
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Remarks Section */}
            <div className="bg-amber-50 rounded-3xl p-8 border border-amber-100">
              <div className="flex items-center gap-3 mb-4 text-amber-700">
                <AlertCircle className="h-5 w-5" />
                <h5 className="font-bold text-lg tracking-tight">หมายเหตุและแนวทางปฏิบัติ</h5>
              </div>
              <ul className="space-y-4 text-amber-800 text-sm">
                {[
                  'อัตราดอกเบี้ยอ้างอิง (MLR/MRR) ใช้สำหรับการคำนวณดอกเบี้ยสินเชื่อแบบลอยตัว (Variable Rate)',
                  'เมื่อมีการยืนยันอัตราใหม่ ระบบจะส่ง Push Notification แจ้งเตือนไปยังลูกค้าทุกคนที่ใช้บริการผ่าน LINE Official Account',
                  'สินเชื่อที่มีอัตราดอกเบี้ยแบบลอยตัวจะได้รับผลกระทบจากการเปลี่ยนแปลงนี้ทันทีในรอบบิลถัดไป',
                  interestRates 
                    ? `ตัวอย่าง: "MLR + 1.5%" จะคำนวณเป็น ${(interestRates.mlr + 1.5).toFixed(3)}% (${interestRates.mlr.toFixed(3)}% + 1.500%)`
                    : 'ตัวอย่าง: "MLR + 1.5%" จะคำนวณโดยใช้อัตรา MLR ปัจจุบันบวกกับ 1.5%'
                ].map((text, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <p className="leading-relaxed opacity-90">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}
