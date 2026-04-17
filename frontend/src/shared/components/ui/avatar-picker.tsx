import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { AVATAR_COLLECTION } from '@/shared/lib/avatar-constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';

interface AvatarPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatar?: string | null;
  onSelect: (avatarUrl: string) => void;
}

export function AvatarPicker({
  open,
  onOpenChange,
  currentAvatar,
  onSelect,
}: AvatarPickerProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(
    currentAvatar || null
  );

  const handleSelect = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
  };

  const handleConfirm = () => {
    if (selectedAvatar) {
      onSelect(selectedAvatar);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>เลือกรูปโปรไฟล์</DialogTitle>
          <DialogDescription>
            เลือกรูปโปรไฟล์ที่คุณชอบจากคอลเลคชันด้านล่าง
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-4 gap-4">
            {AVATAR_COLLECTION.map((avatarUrl, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(avatarUrl)}
                className={cn(
                  'relative aspect-square rounded-lg border-2 transition-all hover:scale-105',
                  selectedAvatar === avatarUrl
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <img
                  src={avatarUrl}
                  alt={`Avatar ${index + 1}`}
                  className="h-full w-full rounded-lg object-cover"
                />
                {selectedAvatar === avatarUrl && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/20">
                    <div className="rounded-full bg-primary p-1">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedAvatar}>
            ยืนยัน
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
