import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { ProductBudgetDialog } from './ProductBudgetDialog';
import { DollarSign, TrendingUp, AlertTriangle, Plus } from 'lucide-react';
import { FormattedAmount } from '@/shared/components/FormattedAmount';

interface ProductBudget {
  id: string;
  product_id: string;
  fiscal_year: number;
  quarter?: number;
  total_budget_amount: number;
  committed_amount: number;
  disbursed_amount: number;
  available_amount: number;
  utilization_rate: number;
  warning_threshold: number;
  critical_threshold: number;
  budget_status: string;
}

interface ProductBudgetCardProps {
  productId: string;
  productName: string;
  budget?: ProductBudget | null; // undefined = loading, null = no budget, object = has budget
  onBudgetUpdate?: () => void;
}

export function ProductBudgetCard({ productId, productName, budget: propBudget, onBudgetUpdate }: ProductBudgetCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'add'>('create');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>();

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  // Use prop budget directly
  const budget = propBudget;

  const handleCreateBudget = () => {
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleAddBudget = () => {
    if (budget?.id) {
      setSelectedBudgetId(budget.id);
      setDialogMode('add');
      setDialogOpen(true);
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    if (onBudgetUpdate) {
      onBudgetUpdate();
    }
  };

  // undefined = still loading, null = no budget, object = has budget
  const isLoading = propBudget === undefined;
  const error = null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">งบประมาณ</CardTitle>
          <div className="h-5 w-16 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Budget Skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-6 w-24 bg-muted animate-pulse rounded" />
          </div>

          {/* Progress Bar Skeleton */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-12 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-2 w-full bg-muted animate-pulse rounded" />
          </div>

          {/* Budget Breakdown Skeleton */}
          <div className="space-y-2 pt-2 border-t">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>

          {/* Action Button Skeleton */}
          <div className="pt-2">
            <div className="h-9 w-full bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">งบประมาณ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 mb-2">
              {error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'}
            </p>
            {error instanceof Error && error.message.includes('เข้าสู่ระบบ') && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
              >
                ออกจากระบบ
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!budget) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">งบประมาณ</CardTitle>
          <Badge variant="secondary">ไม่มีข้อมูล</Badge>
        </CardHeader>
        <CardContent className="min-h-[280px] flex flex-col justify-center">
          <div className="text-center py-6">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-4">
              ยังไม่มีงบประมาณสำหรับปี {currentYear} Q{currentQuarter}
            </p>
            <Button onClick={handleCreateBudget} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              สร้างงบประมาณ
            </Button>
          </div>

          <ProductBudgetDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            productId={productId}
            productName={productName}
            mode="create"
            onSuccess={handleDialogSuccess}
          />
        </CardContent>
      </Card>
    );
  }

  // Handle both camelCase and snake_case from API
  const totalBudget = Number(budget.total_budget_amount || 0);
  const disbursed = Number(budget.disbursed_amount || 0);
  const committed = Number(budget.committed_amount || 0);
  const available = Number(budget.available_amount || 0);
  const utilizationRate = Number(budget.utilization_rate || 0);
  const warningThreshold = Number(budget.warning_threshold || 80);
  const criticalThreshold = Number(budget.critical_threshold || 95);

  const getStatusBadge = () => {
    if (utilizationRate >= criticalThreshold) {
      return <Badge variant="destructive">วิกฤต</Badge>;
    }
    if (utilizationRate >= warningThreshold) {
      return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">เตือน</Badge>;
    }
    return <Badge className="bg-green-500 text-white hover:bg-green-600">ปกติ</Badge>;
  };

  const getProgressColor = () => {
    if (utilizationRate >= criticalThreshold) return 'bg-red-500';
    if (utilizationRate >= warningThreshold) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">งบประมาณ</CardTitle>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Budget */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">งบประมาณทั้งหมด</span>
          </div>
          <FormattedAmount 
            amount={totalBudget} 
            className="text-lg font-semibold"
          />
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">การใช้งบประมาณ</span>
            <span className="font-medium">{utilizationRate.toFixed(2)}%</span>
          </div>
          <Progress value={utilizationRate} className={getProgressColor()} />
        </div>

        {/* Budget Breakdown */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">เบิกจ่ายแล้ว</span>
            <FormattedAmount 
              amount={disbursed} 
              className="font-medium text-blue-600"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">จองไว้</span>
            <FormattedAmount 
              amount={committed} 
              className="font-medium text-orange-600"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">คงเหลือ</span>
            <FormattedAmount 
              amount={available} 
              className="font-medium text-green-600"
            />
          </div>
        </div>

        {/* Warning Messages */}
        {utilizationRate >= warningThreshold && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              {utilizationRate >= criticalThreshold
                ? 'งบประมาณใกล้หมด! กรุณาเพิ่มงบประมาณหรือระงับการอนุมัติสินเชื่อใหม่'
                : 'งบประมาณเหลือน้อย กรุณาพิจารณาเพิ่มงบประมาณ'}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleAddBudget} size="sm" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-2" />
            เพิ่มงบประมาณ
          </Button>
        </div>

        <ProductBudgetDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          productId={productId}
          productName={productName}
          mode={dialogMode}
          existingBudgetId={selectedBudgetId}
          onSuccess={handleDialogSuccess}
        />
      </CardContent>
    </Card>
  );
}
