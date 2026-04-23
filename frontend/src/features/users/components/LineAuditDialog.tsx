import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { 
  Link2, 
  Link2Off, 
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';
import { toast } from 'sonner';
import { lineAuditApi } from '../api/line-audit.api';
import { useAlertDialog } from '@/shared/hooks/useAlertDialog';

interface LineAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  customerId?: string;
  userEmail?: string;
  customerName?: string;
}

interface LineAuditLog {
  id: string;
  action: string;
  lineUserId: string | null;
  previousLineUserId: string | null;
  reason: string | null;
  createdAt: string;
  performedByUser: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface LineStatus {
  currentLineUserId: string | null;
  lineActive?: boolean;
  lineLinkedAt: string | null;
  auditLogs: LineAuditLog[];
}

const actionConfig = {
  CONNECT: { label: 'เชื่อมต่อ', color: 'bg-success/10 text-success', icon: Link2 },
  DISCONNECT: { label: 'ตัดการเชื่อมต่อ', color: 'bg-warning/10 text-warning', icon: Link2Off },
  RECONNECT: { label: 'เชื่อมต่อใหม่', color: 'bg-info/10 text-info', icon: Link2 },
  ADMIN_DISCONNECT: { label: 'Admin ตัดการเชื่อมต่อ', color: 'bg-destructive/10 text-destructive', icon: XCircle },
  ADMIN_FORCE_DISCONNECT: { label: 'Admin บังคับตัดการเชื่อมต่อ', color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle },
};

export function LineAuditDialog({ 
  open, 
  onOpenChange, 
  userId, 
  customerId, 
  userEmail, 
  customerName 
}: LineAuditDialogProps) {
  const queryClient = useQueryClient();
  const alertDialog = useAlertDialog();
  const [disconnectReason, setDisconnectReason] = useState('');
  const [forceDisconnect, setForceDisconnect] = useState(false);
  const [showDisconnectForm, setShowDisconnectForm] = useState(false);

  // Fetch LINE status and audit logs
  const { data: lineStatus, isLoading } = useQuery({
    queryKey: ['lineStatus', userId || customerId],
    queryFn: async () => {
      if (userId) {
        const result = await lineAuditApi.getUserLineStatus(userId);
        if (result.error) throw new Error(result.error.message ?? String(result.error));
        return result.data as LineStatus;
      } else if (customerId) {
        const result = await lineAuditApi.getCustomerLineStatus(customerId);
        if (result.error) throw new Error(result.error.message ?? String(result.error));
        return result.data as LineStatus;
      }
      throw new Error('No user or customer ID provided');
    },
    enabled: open && (!!userId || !!customerId),
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!disconnectReason.trim()) {
        throw new Error('กรุณาระบุเหตุผลในการตัดการเชื่อมต่อ');
      }

      if (userId) {
        const result = await lineAuditApi.disconnectUserLineAccount(userId, {
          reason: disconnectReason,
          forceDisconnect,
        });
        if (result.error) throw new Error(result.error.message ?? String(result.error));
        return result.data;
      } else if (customerId) {
        const result = await lineAuditApi.disconnectCustomerLineAccount(customerId, {
          reason: disconnectReason,
          forceDisconnect,
        });
        if (result.error) throw new Error(result.error.message ?? String(result.error));
        return result.data;
      }
      throw new Error('No user or customer ID provided');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lineStatus'] });
      toast.success('ตัดการเชื่อมต่อ LINE สำเร็จ');
      setShowDisconnectForm(false);
      setDisconnectReason('');
      setForceDisconnect(false);
    },
    onError: (error: Error) => {
      toast.error(`ไม่สามารถตัดการเชื่อมต่อได้: ${error.message}`);
    },
  });

  const handleDisconnect = () => {
    alertDialog.warning({
      title: 'ยืนยันการตัดการเชื่อมต่อ LINE',
      description: `คุณต้องการตัดการเชื่อมต่อ LINE ของ ${userEmail || customerName} ใช่หรือไม่?`,
      confirmText: 'ตัดการเชื่อมต่อ',
      cancelText: 'ยกเลิก',
      showCancel: true,
      onConfirm: () => disconnectMutation.mutate(),
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH');
  };

  const maskLineUserId = (lineUserId: string | null) => {
    if (!lineUserId) return '-';
    if (lineUserId.length <= 8) return lineUserId;
    return `${lineUserId.substring(0, 4)}****${lineUserId.substring(lineUserId.length - 4)}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              ประวัติการเชื่อมต่อ LINE
            </DialogTitle>
            <DialogDescription>
              {userEmail && `ผู้ใช้: ${userEmail}`}
              {customerName && `ลูกค้า: ${customerName}`}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin" />
              <span className="ml-2">กำลังโหลดข้อมูล...</span>
            </div>
          ) : lineStatus ? (
            <div className="space-y-6">
              {/* Current Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">สถานะปัจจุบัน</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">LINE User ID</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {lineStatus.currentLineUserId ? (
                          <>
                            <Badge className="bg-success/10 text-success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              เชื่อมต่อแล้ว
                            </Badge>
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {maskLineUserId(lineStatus.currentLineUserId)}
                            </code>
                          </>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground">
                            <XCircle className="h-3 w-3 mr-1" />
                            ไม่ได้เชื่อมต่อ
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">เชื่อมต่อเมื่อ</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {lineStatus.lineLinkedAt ? formatDate(lineStatus.lineLinkedAt) : '-'}
                      </p>
                    </div>
                  </div>

                  {lineStatus.currentLineUserId && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDisconnectForm(true)}
                        disabled={disconnectMutation.isPending}
                      >
                        <Link2Off className="h-4 w-4 mr-2" />
                        ตัดการเชื่อมต่อ LINE
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Disconnect Form */}
              {showDisconnectForm && (
                <Card className="border-destructive/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-destructive">ตัดการเชื่อมต่อ LINE</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="reason">เหตุผล *</Label>
                      <Textarea
                        id="reason"
                        value={disconnectReason}
                        onChange={(e) => setDisconnectReason(e.target.value)}
                        placeholder="ระบุเหตุผลในการตัดการเชื่อมต่อ..."
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        id="forceDisconnect"
                        type="checkbox"
                        checked={forceDisconnect}
                        onChange={(e) => setForceDisconnect(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="forceDisconnect" className="text-sm">
                        บังคับตัดการเชื่อมต่อ (ไม่แจ้งเตือนผู้ใช้)
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleDisconnect}
                        disabled={disconnectMutation.isPending || !disconnectReason.trim()}
                      >
                        {disconnectMutation.isPending ? (
                          <>
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            กำลังตัดการเชื่อมต่อ...
                          </>
                        ) : (
                          <>
                            <Link2Off className="h-4 w-4 mr-2" />
                            ยืนยันตัดการเชื่อมต่อ
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDisconnectForm(false);
                          setDisconnectReason('');
                          setForceDisconnect(false);
                        }}
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Audit Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ประวัติการเชื่อมต่อ</CardTitle>
                </CardHeader>
                <CardContent>
                  {lineStatus.auditLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      ไม่มีประวัติการเชื่อมต่อ
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>การดำเนินการ</TableHead>
                          <TableHead>LINE User ID</TableHead>
                          <TableHead>เหตุผล</TableHead>
                          <TableHead>ดำเนินการโดย</TableHead>
                          <TableHead>วันที่</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineStatus.auditLogs.map((log) => {
                          const config = actionConfig[log.action as keyof typeof actionConfig];
                          const Icon = config?.icon || Clock;
                          
                          return (
                            <TableRow key={log.id}>
                              <TableCell>
                                <Badge className={config?.color || 'bg-muted'}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {config?.label || log.action}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {log.lineUserId && (
                                    <code className="text-xs bg-muted px-1 py-0.5 rounded block">
                                      ปัจจุบัน: {maskLineUserId(log.lineUserId)}
                                    </code>
                                  )}
                                  {log.previousLineUserId && (
                                    <code className="text-xs bg-muted px-1 py-0.5 rounded block text-muted-foreground">
                                      เดิม: {maskLineUserId(log.previousLineUserId)}
                                    </code>
                                  )}
                                  {!log.lineUserId && !log.previousLineUserId && '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {log.reason ? (
                                  <span className="text-sm">{log.reason}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="font-medium">
                                    {log.performedByUser.firstName} {log.performedByUser.lastName}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {log.performedByUser.email}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(log.createdAt)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              ไม่สามารถโหลดข้อมูลได้
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <alertDialog.AlertDialog />
    </>
  );
}