import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { UserAvatar } from '@/shared/components/ui/user-avatar';
import { AvatarPicker } from '@/shared/components/ui/avatar-picker';
import { useAuth } from '@/shared/contexts/AuthContext';
import { User as UserIcon, Camera, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/shared/lib/api-client';
import { usersApi } from '@/shared/lib/api-endpoints';
import type { User } from '@/shared/types/user';

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(user?.avatar ?? null);

  const [formData, setFormData] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phoneNumber: '',
  });

  const updateAvatarMutation = useMutation<User | null, Error, { avatar?: string }>({
    mutationFn: async (data: { avatar?: string }): Promise<User | null> => {
      const { data: responseData, error } = await apiClient.patch<User>(`/api/users/${user?.id}`, data);
      if (error) throw new Error(error.message);
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('อัพเดทรูปโปรไฟล์สำเร็จ');
    },
    onError: (error: Error) => {
      toast.error('ไม่สามารถอัพเดทรูปโปรไฟล์ได้', { description: error.message });
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('ไม่พบข้อมูลผู้ใช้');
      const { data: responseData, error } = await usersApi.update(user.id, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
      });
      if (error) throw new Error(error.message);
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('บันทึกข้อมูลสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error('ไม่สามารถบันทึกข้อมูลได้', { description: error.message });
    },
  });

  const handleAvatarSelect = (avatarUrl: string): void => {
    setSelectedAvatar(avatarUrl);
    updateAvatarMutation.mutate({ avatar: avatarUrl });
  };

  const handleSaveProfile = (): void => {
    if (!formData.firstName.trim()) {
      toast.error('กรุณากรอกชื่อ');
      return;
    }
    saveProfileMutation.mutate();
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'โปรไฟล์' }]}>
      <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">โปรไฟล์ของฉัน</h1>
          <p className="text-white">จัดการข้อมูลส่วนตัวและรูปโปรไฟล์</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              รูปโปรไฟล์
            </CardTitle>
            <CardDescription>เลือกรูปโปรไฟล์ของคุณ</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <UserAvatar
              src={selectedAvatar}
              name={user.name}
              size="xl"
              className="h-32 w-32"
            />
            <Button
              variant="outline"
              onClick={() => setShowAvatarPicker(true)}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              เปลี่ยนรูปโปรไฟล์
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              เลือกรูปโปรไฟล์จากคอลเลคชันที่เราเตรียมไว้ให้
            </p>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              ข้อมูลส่วนตัว
            </CardTitle>
            <CardDescription>ข้อมูลพื้นฐานของคุณ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ชื่อ</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="ชื่อ"
                />
              </div>
              <div className="space-y-2">
                <Label>นามสกุล</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="นามสกุล"
                />
              </div>
              <div className="space-y-2">
                <Label>อีเมล</Label>
                <Input
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>เบอร์โทรศัพท์</Label>
                <Input
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  placeholder="เบอร์โทรศัพท์"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>บทบาท</Label>
              <Input
                value={
                  user.role === 'admin'
                    ? 'ผู้ดูแลระบบ'
                    : user.role === 'branch_manager'
                    ? 'ผู้จัดการสาขา'
                    : 'เจ้าหน้าที่สินเชื่อ'
                }
                disabled
                className="bg-muted"
              />
            </div>

            {user.branchName && (
              <div className="space-y-2">
                <Label>สาขา</Label>
                <Input value={user.branchName} disabled className="bg-muted" />
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveProfile} disabled={saveProfileMutation.isPending}>
                {saveProfileMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />กำลังบันทึก...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />บันทึกข้อมูล</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AvatarPicker
        open={showAvatarPicker}
        onOpenChange={setShowAvatarPicker}
        currentAvatar={selectedAvatar}
        onSelect={handleAvatarSelect}
      />
      </div>
    </DashboardLayout>
  );
}
