import { ReactNode } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Edit2, Save, X, Loader2 } from 'lucide-react';

interface EditableSectionProps {
  title: string;
  icon: ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  children: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode; // Added actions prop for header buttons
}

export function EditableSection({
  title,
  icon,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  isSaving = false,
  children,
  badge,
  actions,
}: EditableSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-semibold">{title}</span>
          </div>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              แก้ไข
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                ยกเลิก
              </Button>
              <Button 
                size="sm" 
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                บันทึก
              </Button>
            </div>
          )}
        </div>
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
