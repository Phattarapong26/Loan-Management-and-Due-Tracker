import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UseEditableDataOptions<T> {
  initialData: T;
  updateFn: (data: T) => Promise<unknown>;
  queryKey: unknown[];
  onSuccess?: () => void;
}

export function useEditableData<T extends Record<string, unknown>>({
  initialData,
  updateFn,
  queryKey,
  onSuccess,
}: UseEditableDataOptions<T>) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<T>(initialData);
  const initialDataRef = useRef<string>(JSON.stringify(initialData));

  // Update edited data when initial data changes (using deep comparison)
  // But only when NOT editing
  useEffect(() => {
    if (isEditing) return; // Don't update while editing
    
    const newDataString = JSON.stringify(initialData);
    if (newDataString !== initialDataRef.current) {
      initialDataRef.current = newDataString;
      setEditedData(initialData);
    }
  }, [initialData, isEditing]);

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      toast.success('บันทึกข้อมูลสำเร็จ');
      queryClient.invalidateQueries({ queryKey });
      setIsEditing(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error('ไม่สามารถบันทึกข้อมูลได้: ' + (error.message || 'เกิดข้อผิดพลาด'));
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editedData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData(initialData);
  };

  const updateField = <K extends keyof T>(field: K, value: T[K]) => {
    console.log(`updateField - field: ${String(field)}, value:`, value);
    setEditedData((prev) => {
      const newData = { ...prev, [field]: value };
      console.log('updateField - newData:', newData);
      return newData;
    });
  };

  return {
    isEditing,
    editedData,
    isSaving: updateMutation.isPending,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
    setEditedData,
  };
}
