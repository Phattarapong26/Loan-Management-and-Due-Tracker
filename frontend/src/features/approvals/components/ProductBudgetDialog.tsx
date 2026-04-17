import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAlert } from '@/shared/hooks/useAlert';
import { apiClient } from '@/shared/lib/api-client';

// Types for budget payloads
type CreateBudgetPayload = {
  fiscalYear: number;
  quarter?: number;
  totalBudgetAmount: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  notes?: string;
  productId?: string;
};

type AddBudgetPayload = {
  additionalAmount: number;
};

interface ProductBudgetDialogProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  mode: 'create' | 'add';
  existingBudgetId?: string;
  onSuccess?: () => void;
}

export function ProductBudgetDialog({
  open,
  onClose,
  productId,
  productName,
  mode,
  existingBudgetId,
  onSuccess,
}: ProductBudgetDialogProps) {
  const { showSuccess, showError } = useAlert();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const [formData, setFormData] = useState({
    fiscalYear: currentYear,
    quarter: currentQuarter as number | undefined,
    totalBudgetAmount: '',
    additionalAmount: '',
    warningThreshold: '80',
    criticalThreshold: '95',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateBudgetPayload) => {
      const response = await apiClient.post('/api/budgets', {
        productId,
        ...data,
      });
      
      if (response.error) {
        throw new Error(response.error.message ?? 'API error');
      }
      
      return response.data;
    },
    onSuccess: () => {
      showSuccess('สร้างงบประมาณสำเร็จ');
      queryClient.invalidateQueries({ queryKey: ['product-budget'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: unknown) => {
      const message = (error as Error)?.message ?? 'ไม่สามารถสร้างงบประมาณได้';
      showError('เกิดข้อผิดพลาด', message);
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: AddBudgetPayload) => {
      if (!existingBudgetId) {
        throw new Error('Budget ID is missing');
      }
      
      const response = await apiClient.post(`/api/budgets/${existingBudgetId}/add`, data);
      
      if (response.error) {
        throw new Error(response.error.message ?? 'API error');
      }
      
      return response.data;
    },
    onSuccess: () => {
      showSuccess('เพิ่มงบประมาณสำเร็จ');
      queryClient.invalidateQueries({ queryKey: ['product-budget'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: unknown) => {
      const message = (error as Error)?.message ?? 'ไม่สามารถเพิ่มงบประมาณได้';
      showError('เกิดข้อผิดพลาด', message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'create') {
      if (!formData.totalBudgetAmount || parseFloat(formData.totalBudgetAmount) <= 0) {
        showError('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนงบประมาณ');
        return;
      }

      if (!formData.fiscalYear || isNaN(formData.fiscalYear)) {
        showError('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุปีงบประมาณ');
        return;
      }

      createMutation.mutate({
        fiscalYear: formData.fiscalYear,
        quarter: formData.quarter !== undefined ? formData.quarter : undefined,
        totalBudgetAmount: parseFloat(formData.totalBudgetAmount),
        warningThreshold: formData.warningThreshold ? parseInt(formData.warningThreshold) : 80,
        criticalThreshold: formData.criticalThreshold ? parseInt(formData.criticalThreshold) : 95,
        notes: formData.notes,
      });
    } else {
      if (!formData.additionalAmount || parseFloat(formData.additionalAmount) <= 0) {
        showError('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนเงินที่ต้องการเพิ่ม');
        return;
      }

      addMutation.mutate({
        additionalAmount: parseFloat(formData.additionalAmount),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'สร้างงบประมาณใหม่' : 'เพิ่มงบประมาณ'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'สร้างงบประมาณใหม่สำหรับผลิตภัณฑ์สินเชื่อ' 
              : 'เพิ่มงบประมาณเข้าในโครงการที่มีอยู่'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby="budget-form-description">
          <p id="budget-form-description" className="sr-only">
            {mode === 'create' 
              ? 'แบบฟอร์มสำหรับสร้างงบประมาณใหม่สำหรับผลิตภัณฑ์สินเชื่อ' 
              : 'แบบฟอร์มสำหรับเพิ่มงบประมาณเข้าในโครงการที่มีอยู่'}
          </p>
          <div>
            <Label className="text-sm font-medium">ผลิตภัณฑ์</Label>
            <Input value={productName} disabled className="mt-1" />
          </div>

          {mode === 'create' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fiscalYear" className="text-sm font-medium">
                    ปีงบประมาณ
                  </Label>
                  <Input
                    id="fiscalYear"
                    type="number"
                    value={formData.fiscalYear}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setFormData({ 
                        ...formData, 
                        fiscalYear: isNaN(value) ? currentYear : value 
                      });
                    }}
                    min={currentYear}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="quarter" className="text-sm font-medium">
                    ไตรมาส (ถ้ามี)
                  </Label>
                  <Input
                    id="quarter"
                    type="number"
                    value={formData.quarter ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ 
                        ...formData, 
                        quarter: value === '' ? undefined : parseInt(value)
                      });
                    }}
                    min={1}
                    max={4}
                    placeholder="ไม่ระบุ = ทั้งปี"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="totalBudgetAmount" className="text-sm font-medium">
                  จำนวนงบประมาณ (บาท) *
                </Label>
                <Input
                  id="totalBudgetAmount"
                  type="number"
                  value={formData.totalBudgetAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, totalBudgetAmount: e.target.value })
                  }
                  min={0}
                  step={0.01}
                  required
                  className="mt-1"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="warningThreshold" className="text-sm font-medium">
                    เกณฑ์เตือน (%)
                  </Label>
                  <Input
                    id="warningThreshold"
                    type="number"
                    value={formData.warningThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, warningThreshold: e.target.value })
                    }
                    min={0}
                    max={100}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="criticalThreshold" className="text-sm font-medium">
                    เกณฑ์วิกฤต (%)
                  </Label>
                  <Input
                    id="criticalThreshold"
                    type="number"
                    value={formData.criticalThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, criticalThreshold: e.target.value })
                    }
                    min={0}
                    max={100}
                    className="mt-1"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="additionalAmount" className="text-sm font-medium">
                จำนวนเงินที่ต้องการเพิ่ม (บาท) *
              </Label>
              <Input
                id="additionalAmount"
                type="number"
                value={formData.additionalAmount}
                onChange={(e) =>
                  setFormData({ ...formData, additionalAmount: e.target.value })
                }
                min={0}
                step={0.01}
                required
                className="mt-1"
                placeholder="0.00"
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              หมายเหตุ
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="mt-1"
              placeholder="ระบุรายละเอียดเพิ่มเติม..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || addMutation.isPending}
            >
              {createMutation.isPending || addMutation.isPending
                ? 'กำลังบันทึก...'
                : mode === 'create'
                ? 'สร้างงบประมาณ'
                : 'เพิ่มงบประมาณ'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
