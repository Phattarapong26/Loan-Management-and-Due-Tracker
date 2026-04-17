import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { TableSkeleton } from '@/shared/components/skeletons';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/shared/lib/api-client';

interface Workflow {
  id: string;
  loan_id: string;
  approval_level: number;
  approver_id: string | null;
  approval_status: string | null;
  approved_amount: number | null;
  approval_notes: string | null;
  sla_deadline: string | null;
  completed_at: string | null;
  created_at: string;
  loans: {
    id: string;
    principal: number;
    status: string;
    customer: {
      id: string;
      businessName: string;
    };
  };
  users: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

interface Statistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  averageApprovalTime: number;
  overdueCount: number;
}

export default function ApprovalWorkflow() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [notes, setNotes] = useState('');

  // Fetch workflows
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['loan-workflows', activeTab],
    queryFn: async () => {
      const params = activeTab === 'all' ? {} : { status: activeTab.toUpperCase() };
      const result = await apiClient.get('/api/loan-workflows', { params });
      return result.data as Workflow[];
    },
  });

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['loan-workflows-statistics'],
    queryFn: async () => {
      const result = await apiClient.get('/api/loan-workflows/statistics');
      return result.data as Statistics;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const result = await apiClient.post(`/api/loan-workflows/${id}/approve`, { notes });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['loan-workflows-statistics'] });
      toast.success('อนุมัติสำเร็จ');
      setApproveModalOpen(false);
      setNotes('');
      setSelectedWorkflow(null);
    },
    onError: () => {
      toast.error('ไม่สามารถอนุมัติได้');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const result = await apiClient.post(`/api/loan-workflows/${id}/reject`, { notes });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['loan-workflows-statistics'] });
      toast.success('ปฏิเสธสำเร็จ');
      setRejectModalOpen(false);
      setNotes('');
      setSelectedWorkflow(null);
    },
    onError: () => {
      toast.error('ไม่สามารถปฏิเสธได้');
    },
  });

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; text: string }> = {
      PENDING: { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" />, text: 'รออนุมัติ' },
      APPROVED: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" />, text: 'อนุมัติแล้ว' },
      REJECTED: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" />, text: 'ปฏิเสธ' },
    };
    const config = statusMap[status || 'PENDING'];
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'หน้าหลัก' }, { label: 'Approval Workflow' }]}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Approval Workflow</h1>
            <p className="text-white">จัดการการอนุมัติสินเชื่อ</p>
          </div>
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['loan-workflows'] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรช
          </Button>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">ทั้งหมด</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">รออนุมัติ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">อนุมัติแล้ว</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statistics.approved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">ปฏิเสธ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{statistics.rejected}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Workflows Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการอนุมัติ</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending">รออนุมัติ</TabsTrigger>
                <TabsTrigger value="approved">อนุมัติแล้ว</TabsTrigger>
                <TabsTrigger value="rejected">ปฏิเสธ</TabsTrigger>
                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <TableSkeleton rows={5} columns={6} />
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ลูกค้า</TableHead>
                          <TableHead>วงเงินกู้</TableHead>
                          <TableHead>ระดับอนุมัติ</TableHead>
                          <TableHead>ผู้อนุมัติ</TableHead>
                          <TableHead>สถานะ</TableHead>
                          <TableHead>SLA</TableHead>
                          <TableHead className="text-right">การจัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workflows && workflows.length > 0 ? (
                          workflows.map((workflow) => (
                            <TableRow key={workflow.id}>
                              <TableCell className="font-medium">
                                {workflow.loans.customer.businessName}
                              </TableCell>
                              <TableCell>{formatCurrency(workflow.loans.principal)}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">Level {workflow.approval_level}</Badge>
                              </TableCell>
                              <TableCell>
                                {workflow.users
                                  ? `${workflow.users.firstName} ${workflow.users.lastName}`
                                  : '-'}
                              </TableCell>
                              <TableCell>{getStatusBadge(workflow.approval_status)}</TableCell>
                              <TableCell>
                                {workflow.sla_deadline ? (
                                  <div className="flex items-center gap-1">
                                    {isOverdue(workflow.sla_deadline) && (
                                      <AlertCircle className="h-4 w-4 text-destructive" />
                                    )}
                                    <span
                                      className={
                                        isOverdue(workflow.sla_deadline)
                                          ? 'text-destructive font-medium'
                                          : ''
                                      }
                                    >
                                      {formatDate(workflow.sla_deadline)}
                                    </span>
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {workflow.approval_status === 'PENDING' && (
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedWorkflow(workflow);
                                        setApproveModalOpen(true);
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      อนุมัติ
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setSelectedWorkflow(workflow);
                                        setRejectModalOpen(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      ปฏิเสธ
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              ไม่พบข้อมูล
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Approve Modal */}
        <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>อนุมัติสินเชื่อ</DialogTitle>
              <DialogDescription>
                {selectedWorkflow && (
                  <>
                    ลูกค้า: {selectedWorkflow.loans.customer.businessName}
                    <br />
                    วงเงิน: {formatCurrency(selectedWorkflow.loans.principal)}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="approve-notes">หมายเหตุ (ถ้ามี)</Label>
                <Textarea
                  id="approve-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="กรอกหมายเหตุการอนุมัติ..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                onClick={() => {
                  if (selectedWorkflow) {
                    approveMutation.mutate({ id: selectedWorkflow.id, notes });
                  }
                }}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? 'กำลังอนุมัติ...' : 'ยืนยันอนุมัติ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Modal */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ปฏิเสธสินเชื่อ</DialogTitle>
              <DialogDescription>
                {selectedWorkflow && (
                  <>
                    ลูกค้า: {selectedWorkflow.loans.customer.businessName}
                    <br />
                    วงเงิน: {formatCurrency(selectedWorkflow.loans.principal)}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reject-notes">เหตุผลในการปฏิเสธ *</Label>
                <Textarea
                  id="reject-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="กรอกเหตุผลในการปฏิเสธ..."
                  rows={4}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedWorkflow && notes.trim()) {
                    rejectMutation.mutate({ id: selectedWorkflow.id, notes });
                  } else {
                    toast.error('กรุณากรอกเหตุผลในการปฏิเสธ');
                  }
                }}
                disabled={rejectMutation.isPending || !notes.trim()}
              >
                {rejectMutation.isPending ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
