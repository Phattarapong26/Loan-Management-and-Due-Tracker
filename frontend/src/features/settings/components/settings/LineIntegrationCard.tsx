import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { toast } from 'sonner';
import { lineApi, usersApi, type User } from '@/shared/lib/api-endpoints';
import { 
  MessageCircle, 
  Check, 
  AlertCircle, 
  Send, 
  Loader2,
  Link2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

interface LineIntegrationCardProps {
  lineNotificationsEnabled: boolean;
  onToggleNotifications: (enabled: boolean) => void;
}

export function LineIntegrationCard({ 
  lineNotificationsEnabled, 
  onToggleNotifications 
}: LineIntegrationCardProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(true); // Mock connected state
  const [isTesting, setIsTesting] = useState(false);
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

  const [roleFilter, setRoleFilter] = useState<'OFFICER' | 'MANAGER' | 'ADMIN'>('OFFICER');
  const [userSearch, setUserSearch] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [targetLineUserId, setTargetLineUserId] = useState<string>('');
  const [customerContractNumber, setCustomerContractNumber] = useState<string>('');
  const [customerLineUserId, setCustomerLineUserId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
      const email = (u.email || '').toLowerCase();
      const branch = (u.branchName || u.branch?.name || '').toLowerCase();
      return name.includes(q) || email.includes(q) || branch.includes(q);
    });
  }, [userSearch, users]);

  const loadUsers = async (role: 'OFFICER' | 'MANAGER' | 'ADMIN') => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const { data, error } = await usersApi.list({ page: 1, limit: 200, status: 'ACTIVE', role });
      if (error) throw error;
      setUsers((data as any)?.users || []);
    } catch (err: any) {
      toast.error('โหลดรายชื่อพนักงานไม่สำเร็จ', { description: err?.message });
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    setTargetUserId('');
    setUserSearch('');
    setTargetLineUserId('');
    loadUsers(roleFilter);
  }, [isAdmin, roleFilter]);

  const handleAdminTestNotification = async (opts?: { mode?: 'self' | 'user' | 'lineUserId' }) => {
    const mode = opts?.mode || (targetLineUserId.trim() ? 'lineUserId' : 'user');
    if (mode === 'self' && !user?.id) {
      toast.error('ไม่พบข้อมูลผู้ใช้ปัจจุบัน');
      return;
    }
    if (mode === 'user' && !targetUserId) {
      toast.error('กรุณาเลือกผู้รับก่อน');
      return;
    }
    if (mode === 'lineUserId' && !targetLineUserId.trim()) {
      toast.error('กรุณากรอก LINE User ID ก่อน');
      return;
    }

    setIsTesting(true);
    try {
      const payload =
        mode === 'self'
          ? { targetUserId: user!.id }
          : mode === 'lineUserId'
            ? { targetLineUserId: targetLineUserId.trim() }
            : { targetUserId };

      const { data, error } = await lineApi.sendTestDailyNotification(payload);
      if (error) throw error;

      const targetName = (data as any)?.target?.name || 'ผู้รับ';
      toast.success('ส่งข้อความทดสอบสำเร็จ!', {
        description: `ส่งเข้า LINE ของ ${targetName} แล้ว`,
      });
    } catch (error: any) {
      console.error('Admin test notification error:', error);
      toast.error('ส่งข้อความทดสอบไม่สำเร็จ', {
        description: [
          error?.message,
          Array.isArray(error?.nextSteps) && error.nextSteps.length > 0
            ? `แนะนำ: ${error.nextSteps.join(' • ')}`
            : '',
        ].filter(Boolean).join('\n'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAdminTestCustomerNotification = async () => {
    const contractNumber = customerContractNumber.trim();
    const lineUserId = customerLineUserId.trim();

    if (!contractNumber && !lineUserId) {
      toast.error('กรุณากรอกเลขสัญญา หรือ LINE User ID ของลูกค้า');
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await lineApi.sendTestCustomerNotification({
        contractNumber: contractNumber || undefined,
        customerLineUserId: lineUserId || undefined,
      });
      if (error) throw error;

      const name = (data as any)?.target?.businessName || 'ลูกค้า';
      toast.success('ส่งแจ้งเตือนลูกค้าสำเร็จ!', {
        description: `ส่งเข้า LINE ของ ${name} แล้ว`,
      });
    } catch (error: any) {
      console.error('Admin test customer notification error:', error);
      toast.error('ส่งแจ้งเตือนลูกค้าไม่สำเร็จ', {
        description: [
          error?.message,
          Array.isArray(error?.nextSteps) && error.nextSteps.length > 0
            ? `แนะนำ: ${error.nextSteps.join(' • ')}`
            : '',
        ].filter(Boolean).join('\n'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="border-2 border-[#06C755]/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#06C755]/10">
            <MessageCircle className="h-5 w-5 text-[#06C755]" />
          </div>
          LINE Official Account
          {isConnected && (
            <Badge className="ml-2 bg-[#06C755] text-white">
              <Check className="h-3 w-3 mr-1" />
              เชื่อมต่อแล้ว
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          เชื่อมต่อกับ LINE Official Account เพื่อส่งแจ้งเตือนอัตโนมัติ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#06C755] flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Loan Management Bot</p>
                <p className="text-sm text-muted-foreground">Channel ID: 2007612820</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://manager.line.biz/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                จัดการ
              </a>
            </Button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            การแจ้งเตือน
          </h4>
          
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-0.5">
              <Label>แจ้งเตือนประจำวัน 08:00 น.</Label>
              <p className="text-sm text-muted-foreground">
                ส่งสรุปงานตาม Role ทุกวันเช้า
              </p>
            </div>
            <Switch
              checked={lineNotificationsEnabled}
              onCheckedChange={onToggleNotifications}
            />
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                Loan Officer
              </Badge>
              <span className="text-muted-foreground">งานวันนี้, ลูกหนี้ค้างชำระ, เป้าเก็บเงิน</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <Badge variant="outline" className="bg-info/10 text-info border-info/30">
                Branch Manager
              </Badge>
              <span className="text-muted-foreground">KPI สาขา, NPL Ratio, รออนุมัติ</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                Admin / HQ
              </Badge>
              <span className="text-muted-foreground">สถานะระบบ, Security Alerts</span>
            </div>
          </div>
        </div>

        {/* Test Notification */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium flex items-center gap-2">
            <Send className="h-4 w-4" />
            ทดสอบระบบแจ้งเตือนเข้า LINE
          </h4>

          {!isAdmin ? (
            <Alert>
              <AlertDescription>
                เฉพาะ Admin เท่านั้นที่สามารถยิงทดสอบแจ้งเตือนได้
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <AlertDescription>
                  ระบบจะส่ง “สรุปงานประจำวัน” เข้า LINE ของผู้รับ โดยใช้ข้อมูลจริงตาม Role/สาขาของผู้รับ (เหมือนระบบส่งทุกเช้า)
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                <Button
                  onClick={() => handleAdminTestNotification({ mode: 'self' })}
                  disabled={isTesting || !user?.id}
                  className="bg-[#06C755] hover:bg-[#05a548]"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      ส่งทดสอบเข้า LINE ของฉัน (1 คลิก)
                    </>
                  )}
                </Button>

                <Accordion type="single" collapsible>
                  <AccordionItem value="advanced">
                    <AccordionTrigger>
                      ทดสอบแบบเจาะจง (เลือกผู้ใช้ / กรอก LINE User ID)
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <Tabs defaultValue="user" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="user">เลือกผู้ใช้ในระบบ</TabsTrigger>
                          <TabsTrigger value="uid">กรอก LINE User ID</TabsTrigger>
                        </TabsList>

                        <TabsContent value="user" className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>ประเภทผู้รับ</Label>
                              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="OFFICER">Loan Officer</SelectItem>
                                  <SelectItem value="MANAGER">Branch Manager</SelectItem>
                                  <SelectItem value="ADMIN">Admin / HQ</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                              <Label>ค้นหา (ชื่อ / อีเมล / สาขา)</Label>
                              <Input
                                placeholder="พิมพ์เพื่อค้นหา..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>ผู้รับ (ระบบจะส่งเข้า LINE ที่ผูกไว้ของผู้ใช้นี้)</Label>
                            <Select value={targetUserId} onValueChange={setTargetUserId} disabled={loadingUsers}>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingUsers ? 'กำลังโหลดรายชื่อ...' : 'เลือกผู้รับ'} />
                              </SelectTrigger>
                              <SelectContent className="max-h-80">
                                {filteredUsers.length === 0 ? (
                                  <SelectItem value="__none" disabled>
                                    ไม่พบผู้ใช้
                                  </SelectItem>
                                ) : (
                                  filteredUsers.map((u) => {
                                    const label = `${(u.firstName || '')} ${(u.lastName || '')}`.trim() || u.email;
                                    const branch =
                                      u.branchName ||
                                      u.branch?.name ||
                                      (u.branchId ? `สาขา ${u.branchId.slice(0, 8)}…` : 'ไม่ระบุสาขา');
                                    return (
                                      <SelectItem key={u.id} value={u.id}>
                                        {label} • {branch}
                                      </SelectItem>
                                    );
                                  })
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            onClick={() => handleAdminTestNotification({ mode: 'user' })}
                            disabled={isTesting || loadingUsers || !targetUserId || targetUserId === '__none'}
                            className="bg-[#06C755] hover:bg-[#05a548]"
                          >
                            {isTesting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                กำลังส่ง...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                ส่งข้อความทดสอบ (เหมือนแจ้งเตือนประจำวัน)
                              </>
                            )}
                          </Button>
                        </TabsContent>

                        <TabsContent value="uid" className="space-y-4">
                          <div className="space-y-2">
                            <Label>LINE User ID</Label>
                            <Input
                              placeholder="U1234567890abcdef..."
                              value={targetLineUserId}
                              onChange={(e) => setTargetLineUserId(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              ต้องเป็น LINE User ID ที่ “ถูกผูกในระบบ” แล้ว (ระบบจะหา user จาก lineUserId เพื่อใช้ Role/สาขาที่ถูกต้อง)
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            onClick={() => handleAdminTestNotification({ mode: 'lineUserId' })}
                            disabled={isTesting || !targetLineUserId.trim()}
                            className="border-[#06C755]/40 text-[#06C755] hover:bg-[#06C755]/10"
                          >
                            {isTesting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                กำลังส่ง...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                ยิงทดสอบ
                              </>
                            )}
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Accordion type="single" collapsible>
                  <AccordionItem value="customer">
                    <AccordionTrigger>
                      ทดสอบแจ้งเตือน “ลูกค้า”
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      <Alert>
                        <AlertDescription>
                          จะส่งข้อความแจ้งเตือนชำระเงินแบบลูกค้าจริง (Flex) โดยดึงงวดที่ค้าง/ใกล้ครบกำหนดจากฐานข้อมูล
                        </AlertDescription>
                      </Alert>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-2">
                          <Label>เลขที่สัญญา (Contract Number)</Label>
                          <Input
                            placeholder="เช่น LN-HDY001-2026-0013"
                            value={customerContractNumber}
                            onChange={(e) => setCustomerContractNumber(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>หรือ LINE User ID ลูกค้า</Label>
                          <Input
                            placeholder="U1234567890abcdef..."
                            value={customerLineUserId}
                            onChange={(e) => setCustomerLineUserId(e.target.value)}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleAdminTestCustomerNotification}
                        disabled={isTesting || (!customerContractNumber.trim() && !customerLineUserId.trim())}
                        className="bg-[#06C755] hover:bg-[#05a548]"
                      >
                        {isTesting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            กำลังส่ง...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            ส่งทดสอบแจ้งเตือนลูกค้า
                          </>
                        )}
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-amber-700 dark:text-amber-300">
                      ถ้าส่งไม่สำเร็จ ให้ตรวจสอบว่าผู้รับ “เชื่อมต่อ LINE” แล้ว และไม่ได้บล็อก LINE OA
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Webhook URL */}
        <div className="space-y-2 pt-4 border-t">
          <Label>Webhook URL (สำหรับตั้งค่าใน LINE Developer Console)</Label>
          <div className="flex gap-2">
            <Input 
              readOnly 
              value={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/line/webhook`}
              className="font-mono text-xs"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const webhookUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/line/webhook`;
                navigator.clipboard.writeText(webhookUrl);
                toast.success('คัดลอก Webhook URL แล้ว');
              }}
            >
              คัดลอก
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
