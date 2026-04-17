import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Calendar } from '@/shared/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  DollarSign,
  Phone,
  FileText,
  Loader2,
  UserCheck,
  AlertCircle,
  Check,
  ChevronsUpDown,
  Building2,
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/shared/lib/utils';
import { calendarApi, branchesApi, Branch } from '@/shared/lib/api-endpoints';
import { useAlertDialog } from '@/shared/hooks/useAlertDialog';
import { useAuth } from '@/shared/contexts/AuthContext';

// Backend event type
type BackendEvent = {
  id: string;
  title?: string;
  startDate?: string;
  eventType?: string;
  description?: string | null;
  customer?: { businessName?: string } | null;
  [key: string]: unknown;
};

type EventType = 'payment' | 'appointment' | 'follow_up' | 'meeting';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  type: EventType;
  description: string;
  customerName?: string;
  amount?: number;
}

// Map backend event type to frontend type
const mapEventType = (type: string): EventType => {
  const typeMap: Record<string, EventType> = {
    'PAYMENT_DUE': 'payment',
    'APPOINTMENT': 'appointment',
    'CUSTOMER_VISIT': 'appointment',
    'FOLLOW_UP': 'follow_up',
    'COLLECTION': 'follow_up',
    'MEETING': 'meeting',
    'INTERNAL_MEETING': 'meeting',
    'REMINDER': 'follow_up',
    'HOLIDAY': 'meeting',
    'OTHER': 'meeting',
  };
  return typeMap[type] || 'meeting';
};

const eventTypeConfig: Record<EventType, { label: string; color: string; icon: React.ElementType }> = {
  payment: { label: 'นัดชำระ', color: 'bg-success/10 text-success', icon: DollarSign },
  appointment: { label: 'นัดพบ', color: 'bg-info/10 text-info', icon: User },
  follow_up: { label: 'ติดตาม', color: 'bg-warning/10 text-warning', icon: Phone },
  meeting: { label: 'ประชุม', color: 'bg-primary/10 text-primary', icon: FileText },
};

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const alertDialog = useAlertDialog();
  const { currentRole, user } = useAuth();
  const isAdmin = currentRole === 'admin';
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [openStaffCombobox, setOpenStaffCombobox] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    time: '',
    type: '' as EventType | '',
    description: '',
    customerName: '',
    assignedTo: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  });

  const isManager = currentRole === 'branch_manager' || currentRole === 'admin';
  const userBranchId = user?.branchId;

  // Fetch branches for admin filter
  const { data: branchesData } = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: async () => {
      const result = await branchesApi.getAll();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: isAdmin,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const branches: Branch[] = Array.isArray(branchesData) ? branchesData : [];

  // Fetch calendar events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['calendar-events', branchFilter],
    queryFn: async () => {
      const result = await calendarApi.list({
        page: 1,
        limit: 1000,
        branchId: isAdmin && branchFilter !== 'all' ? branchFilter : undefined,
      });
      if (result.error) throw result.error;
      return result.data;
    },
  });

  // Fetch staff list (for Manager/Admin only) - filtered by branch and role
  const { data: staffData } = useQuery({
    queryKey: ['staff-list', userBranchId, currentRole, branchFilter],
    queryFn: async () => {
      const { usersApi } = await import('@/shared/lib/api-endpoints');
      
      // Admin sees everyone from all branches
      // Manager/Officer sees only staff in their branch (excluding Admin)
      const params: any = {
        page: 1,
        limit: 100,
        status: 'ACTIVE',
      };
      
      // If not admin, filter by branch
      if (currentRole !== 'admin' && userBranchId) {
        params.branchId = userBranchId;
      }
      // If admin selects a specific branch, filter staff list by that branch
      if (currentRole === 'admin' && branchFilter !== 'all') {
        params.branchId = branchFilter;
      }
      
      const result = await usersApi.list(params);
      if (result.error) throw result.error;
      
      // Filter out Admin users if current user is not Admin
      if (currentRole !== 'admin' && result.data?.users) {
        result.data.users = result.data.users.filter((staff: any) => staff.role !== 'ADMIN');
      }
      
      return result.data;
    },
    enabled: isManager && (currentRole === 'admin' || !!userBranchId),
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: { 
      title: string; 
      description?: string; 
      startDate: string; 
      allDay?: boolean; 
      eventType?: string; 
      category?: string;
      assignedTo?: string;
      priority?: string;
    }) => {
      const payload = {
        title: String(data.title),
        description: data.description ? String(data.description) : undefined,
        startDate: String(data.startDate),
        allDay: Boolean(data.allDay),
        eventType: data.eventType ? String(data.eventType) : undefined,
        category: data.category ? String(data.category) : undefined,
        assignedTo: data.assignedTo ? String(data.assignedTo) : undefined,
        priority: data.priority ? String(data.priority) : undefined,
      };
      const result = await calendarApi.create(payload);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      alertDialog.success({
        title: eventForm.assignedTo ? 'มอบหมายงานสำเร็จ!' : 'เพิ่มกิจกรรมสำเร็จ!',
        description: eventForm.assignedTo 
          ? 'ระบบได้ส่งการแจ้งเตือนไปยังพนักงานที่ได้รับมอบหมายแล้ว'
          : 'ระบบได้บันทึกกิจกรรมเรียบร้อยแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
      setIsAddEventOpen(false);
      setEventForm({ title: '', date: '', time: '', type: '', description: '', customerName: '', assignedTo: '', priority: 'MEDIUM' });
    },
    onError: (error: unknown) => {
      const message = (error as Error)?.message ?? (typeof error === 'string' ? error : 'เกิดข้อผิดพลาดในการเพิ่มกิจกรรม');
      alertDialog.error({
        title: 'ไม่สามารถเพิ่มกิจกรรมได้',
        description: message,
        confirmText: 'ตกลง',
      });
    },
  });

  // Map backend events to frontend format
  const events: CalendarEvent[] = (eventsData?.events || []).map((e: any) => {
    const startDate = e.startDate ? new Date(String(e.startDate)) : new Date();
    return {
      id: e.id,
      title: e.title ? String(e.title) : 'ไม่มีหัวข้อ',
      date: startDate,
      time: format(startDate, 'HH:mm'),
      type: mapEventType(String(e.eventType || 'OTHER')),
      description: e.description ? String(e.description) : '',
      customerName: e.customer?.businessName ? String(e.customer.businessName) : undefined,
      amount: undefined, // Can be extracted from metadata if needed
    };
  });

  const eventsForSelectedDate = events.filter(event => 
    isSameDay(event.date, selectedDate)
  );

  const getDatesWithEvents = () => {
    return events.map(event => event.date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddEvent = async () => {
    if (!eventForm.title || !eventForm.date || !eventForm.type) {
      alertDialog.error({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        confirmText: 'ตกลง',
      });
      return;
    }

    const startDate = eventForm.time 
      ? `${eventForm.date}T${eventForm.time}:00.000Z`
      : `${eventForm.date}T00:00:00.000Z`;

    // Map frontend type to backend EventType enum
    const eventTypeMap: Record<string, string> = {
      'payment': 'PAYMENT_DUE',
      'appointment': 'APPOINTMENT',
      'follow_up': 'FOLLOW_UP',
      'meeting': 'MEETING',
      'reminder': 'REMINDER',
      'other': 'OTHER',
    };

    const categoryMap: Record<string, string> = {
      'payment': 'LOAN_RELATED',
      'appointment': 'CUSTOMER_VISIT',
      'follow_up': 'LOAN_RELATED',
      'meeting': 'INTERNAL_MEETING',
      'reminder': 'OTHER',
      'other': 'OTHER',
    };

    await createEventMutation.mutateAsync({
      title: eventForm.title,
      description: eventForm.description || undefined,
      startDate,
      allDay: !eventForm.time,
      eventType: eventTypeMap[eventForm.type] || 'OTHER',
      category: categoryMap[eventForm.type] || 'OTHER',
      assignedTo: eventForm.assignedTo || undefined,
      priority: eventForm.priority,
    });
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'ปฏิทิน' }]}>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">ปฏิทิน</h1>
          <p className="text-white">จัดการนัดหมายและกิจกรรม</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isAdmin && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="ทุกสาขา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสาขา</SelectItem>
                {branches.map((branch: Branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มกิจกรรม
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto border rounded-lg">
            <DialogHeader>
              <DialogTitle>เพิ่มกิจกรรมใหม่</DialogTitle>
              <DialogDescription>สร้างนัดหมายหรือกิจกรรม</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>หัวข้อ *</Label>
                <Input
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="นัดพบลูกค้า"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>วันที่ *</Label>
                  <Input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>เวลา</Label>
                  <Input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ประเภท *</Label>
                <Select
                  value={eventForm.type}
                  onValueChange={(value) => setEventForm({ ...eventForm, type: value as EventType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">นัดชำระ</SelectItem>
                    <SelectItem value="appointment">นัดพบลูกค้า</SelectItem>
                    <SelectItem value="follow_up">ติดตามหนี้</SelectItem>
                    <SelectItem value="meeting">ประชุม</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ชื่อลูกค้า</Label>
                <Input
                  value={eventForm.customerName}
                  onChange={(e) => setEventForm({ ...eventForm, customerName: e.target.value })}
                  placeholder="บริษัท ตัวอย่าง จำกัด"
                />
              </div>

              {/* Manager/Admin only: Task Assignment */}
              {isManager && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <UserCheck className="h-4 w-4 text-primary" />
                      <Label className="text-base font-semibold">มอบหมายงาน (สำหรับผู้จัดการ)</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      เลือกพนักงานในสาขาของคุณเพื่อมอบหมายงาน ระบบจะส่งการแจ้งเตือนทั้งในระบบและ LINE
                    </p>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>มอบหมายให้พนักงาน</Label>
                        <Popover open={openStaffCombobox} onOpenChange={setOpenStaffCombobox}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openStaffCombobox}
                              className="w-full justify-between"
                            >
                              {eventForm.assignedTo
                                ? (() => {
                                    const staff = staffData?.users?.find((s: any) => s.id === eventForm.assignedTo);
                                    return staff ? `${staff.firstName} ${staff.lastName}` : "เลือกพนักงาน...";
                                  })()
                                : staffData?.users?.length 
                                  ? (currentRole === 'admin' ? "เลือกพนักงาน (ทุกสาขา)" : "เลือกพนักงานในสาขา")
                                  : "ไม่มีพนักงาน"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="ค้นหาพนักงาน..." />
                              <CommandList>
                                <CommandEmpty>ไม่พบพนักงาน</CommandEmpty>
                                <CommandGroup>
                                  {staffData?.users?.map((staff: any) => {
                                    // Map backend role to Thai label
                                    let roleLabel = 'ผู้ใช้งาน';
                                    if (staff.role === 'ADMIN') {
                                      roleLabel = 'แอดมิน';
                                    } else if (staff.role === 'MANAGER') {
                                      roleLabel = 'ผู้จัดการสาขา';
                                    } else if (staff.role === 'OFFICER') {
                                      roleLabel = 'เจ้าหน้าที่สินเชื่อ';
                                    } else if (staff.role === 'USER') {
                                      roleLabel = 'ลูกค้า';
                                    } else if (staff.role === 'CUSTOMER') {
                                      roleLabel = 'ลูกค้า';
                                    }
                                    
                                    return (
                                      <CommandItem
                                        key={staff.id}
                                        value={`${staff.firstName} ${staff.lastName} ${staff.email}`}
                                        onSelect={() => {
                                          setEventForm({ ...eventForm, assignedTo: staff.id });
                                          setOpenStaffCombobox(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            eventForm.assignedTo === staff.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span className="font-medium">{staff.firstName} {staff.lastName}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {roleLabel}
                                            {staff.branch?.name && ` • ${staff.branch.name}`}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {eventForm.assignedTo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEventForm({ ...eventForm, assignedTo: '' })}
                            className="text-xs"
                          >
                            ล้างการเลือก
                          </Button>
                        )}
                      </div>

                      {eventForm.assignedTo && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            ระดับความเร่งด่วน *
                          </Label>
                          <Select
                            value={eventForm.priority}
                            onValueChange={(value) => setEventForm({ ...eventForm, priority: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LOW">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                                  <span>ปกติ</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="MEDIUM">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                  <span>ปานกลาง</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="HIGH">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                                  <span>สูง</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="URGENT">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  <span>🚨 เร่งด่วนมาก</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            พนักงานจะได้รับการแจ้งเตือนทันทีทั้งในระบบและ LINE
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>รายละเอียด</Label>
                <Textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleAddEvent} disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  'บันทึก'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(eventTypeConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", config.color.split(' ')[0])} />
            <span className="text-sm text-white">{config.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              ปฏิทิน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border w-full"
              modifiers={{
                hasEvent: getDatesWithEvents(),
              }}
              modifiersStyles={{
                hasEvent: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Events for Selected Date */}
        <Card>
          <CardHeader>
            <CardTitle>
              {format(selectedDate, 'PPP', { locale: th })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </p>
            ) : eventsForSelectedDate.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                ไม่มีกิจกรรมในวันนี้
              </p>
            ) : (
              <div className="space-y-4">
                {eventsForSelectedDate.map((event) => {
                  const config = eventTypeConfig[event.type];
                  const Icon = config.icon;
                  return (
                    <div key={event.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-lg', config.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className={config.color}>{config.label}</Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.time}
                            </span>
                          </div>
                          <p className="font-medium mt-1">{event.title}</p>
                          {event.customerName ? (
                            <p className="text-sm text-muted-foreground">{event.customerName}</p>
                          ) : null}
                          {event.amount ? (
                            <p className="text-sm font-medium text-primary mt-1">{formatCurrency(event.amount)}</p>
                          ) : null}
                          {event.description ? (
                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Dialog */}
      <alertDialog.AlertDialog />
      </div>
    </DashboardLayout>
  );
}
