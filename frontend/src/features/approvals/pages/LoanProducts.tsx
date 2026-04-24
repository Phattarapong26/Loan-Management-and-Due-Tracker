import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, TrendingUp, Package } from 'lucide-react';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { PaginationControls } from '@/shared/components/ui/pagination-controls';
import { TableSkeleton } from '@/shared/components/skeletons';
import { usePagination } from '@/shared/hooks/usePagination';
import { useToast } from '@/shared/hooks/use-toast';
import { loanProductsApi, LoanProduct, LoanProductStats } from '../api/loan-products.api';
import { LoanProductDialog } from '../components/LoanProductDialog';
import { ProductBudgetCard } from '../components/ProductBudgetCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { apiClient } from '@/shared/lib/api-client';
import { LoanProductStatsCards } from '../components/LoanProductStatsCards';

export function LoanProducts(): JSX.Element {
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [stats, setStats] = useState<LoanProductStats | null>(null);
  const [budgets, setBudgets] = useState<Record<string, any>>({});
  const [budgetsLoaded, setBudgetsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LoanProduct | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<LoanProduct | null>(null);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const { page, pageSize, setPage, setPageSize } = usePagination();
  const { toast } = useToast();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{
        data: LoanProduct[];
        pagination?: { page: number; limit: number; total: number; totalPages: number };
      }>('/api/loan-products', {
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        page,
        limit: pageSize,
      });

      if (response.error) {
        throw new Error(response.error.message ?? 'API error');
      }

      const productsArray = response.data?.data || [];
      const paginationData = response.data?.pagination;

      setProducts(productsArray);

      if (paginationData) {
        setPagination({ total: paginationData.total, totalPages: paginationData.totalPages });
      } else {
        setPagination({ total: productsArray.length, totalPages: Math.max(1, Math.ceil(productsArray.length / pageSize)) });
      }

      // Batch load budgets for all products
      if (productsArray.length > 0) {
        await loadBudgets(productsArray.map(p => p.id));
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message ?? '';
      // Map technical errors to user-friendly messages
      let userMessage = 'ไม่สามารถโหลดข้อมูลสินเชื่อได้ กรุณาลองใหม่อีกครั้ง';
      if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
        userMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      } else if (errorMsg.includes('session') || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
        userMessage = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง';
      }
      toast({ title: 'เกิดข้อผิดพลาด', description: userMessage, variant: 'destructive' });
      setProducts([]);
      setPagination({ total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, page, pageSize, toast]);

  const loadBudgets = useCallback(async (productIds: string[]) => {
    try {
      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

      const response = await apiClient.post<Record<string, any>>('/api/budgets/batch', {
        productIds,
        fiscalYear: currentYear,
        quarter: currentQuarter,
      });

      if (response.error) {
        console.error('Failed to load budgets:', response.error);
        setBudgetsLoaded(true);
        return;
      }

      // The budget data is directly in response.data (not response.data.data)
      const budgetData = response.data || {};

      setBudgets(budgetData);
      setBudgetsLoaded(true);
    } catch (err: unknown) {
      console.error('Failed to load budgets:', err);
      setBudgetsLoaded(true); // Mark as loaded even on error
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await loanProductsApi.getStats();
      setStats(data);
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Failed to load stats:', (err as Error)?.message ?? err);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadStats();
  }, [loadProducts, loadStats]);

  const handleSearch = () => {
    setPage(1);
    loadProducts();
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const handleEdit = (product: LoanProduct) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDeleteClick = (product: LoanProduct) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      await loanProductsApi.delete(productToDelete.id);
      toast({ title: 'สำเร็จ', description: 'ลบสินเชื่อเรียบร้อยแล้ว' });
      await loadProducts();
      await loadStats();
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message ?? '';
      // Map technical errors to user-friendly messages
      let userMessage = 'ไม่สามารถลบสินเชื่อได้ กรุณาลองใหม่อีกครั้ง';
      if (errorMsg.includes('in use') || errorMsg.includes('referenced') || errorMsg.includes('foreign key')) {
        userMessage = 'ไม่สามารถลบสินเชื่อนี้ได้เนื่องจากมีการใช้งานอยู่ในระบบ';
      } else if (errorMsg.includes('permission') || errorMsg.includes('forbidden') || errorMsg.includes('403')) {
        userMessage = 'คุณไม่มีสิทธิ์ลบสินเชื่อนี้';
      } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        userMessage = 'ไม่พบสินเชื่อที่ต้องการลบ อาจถูกลบไปแล้ว';
      }
      toast({ title: 'เกิดข้อผิดพลาด', description: userMessage, variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    loadProducts();
    loadStats();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      ACTIVE: 'default',
      INACTIVE: 'secondary',
      ARCHIVED: 'destructive',
    };
    const labels: Record<string, string> = {
      ACTIVE: 'ใช้งาน',
      INACTIVE: 'ไม่ใช้งาน',
      ARCHIVED: 'เก็บถาวร',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getLoanTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      SHORT_TERM: 'ระยะสั้น',
      MEDIUM_TERM: 'ระยะกลาง',
      LONG_TERM: 'ระยะยาว',
      REVOLVING: 'หมุนเวียน',
      MIXED: 'ผสม',
    };
    return <Badge variant="outline">{labels[type]}</Badge>;
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'ผลิตภัณฑ์สินเชื่อ' }]}>
      <div className="p-6 space-y-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl text-white font-bold">จัดการผลิตภัณฑ์สินเชื่อ</h1>
              <p className="text-white">จัดการข้อมูลสินเชื่อสำหรับ SME</p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มสินเชื่อใหม่
            </Button>
          </div>

          {stats && (
            <LoanProductStatsCards
              total={stats.total}
              active={stats.active}
              inactive={stats.inactive}
              popular={stats.popular}
              isLoading={loading}
            />
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 w-full">
                  <Input
                    placeholder="ค้นหาสินเชื่อ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <select
                    className="flex h-10 w-full md:w-auto items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">ทุกสถานะ</option>
                    <option value="ACTIVE">ใช้งาน</option>
                    <option value="INACTIVE">ไม่ใช้งาน</option>
                    <option value="ARCHIVED">เก็บถาวร</option>
                  </select>

                  <Button onClick={handleSearch} className="w-full md:w-auto">
                    <Search className="mr-2 h-4 w-4" />
                    ค้นหา
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <TableSkeleton rows={pageSize} columns={1} />
              ) : !Array.isArray(products) || products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">ไม่พบข้อมูลสินเชื่อ</div>
              ) : (
                <>
                  <div className="space-y-4">
                    {products.map((product) => (
                      <Card key={product.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div className="flex-1 w-full">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                    <h3 className="text-lg font-semibold">{product.productName}</h3>
                                    <div className="flex flex-wrap gap-2">
                                      {product.isPopular && <Badge variant="default" className="bg-yellow-500">ยอดนิยม</Badge>}
                                      {getStatusBadge(product.status)}
                                      {getLoanTypeBadge(product.loanType)}
                                    </div>
                                  </div>

                                  <p className="text-sm text-muted-foreground mb-2">รหัส: {product.productCode}</p>
                                  {product.description && <p className="text-sm mb-3 line-clamp-2">{product.description}</p>}

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">วงเงินสูงสุด:</span>
                                      <p className="font-medium">{formatCurrency(product.maxLoanAmount)}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">ระยะเวลา:</span>
                                      <p className="font-medium">{product.maxTermMonths} เดือน</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">อัตราดอกเบี้ย:</span>
                                      <p className="font-medium">{product.interestRateYear1_3 ? `${product.interestRateYear1_3}%` : product.interestRateFormula || '-'}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">หลักประกัน:</span>
                                      <p className="font-medium">{product.collateralRequired ? 'ต้องใช้' : 'ไม่ต้องใช้'}</p>
                                    </div>
                                  </div>

                                  <div className="flex gap-2 mt-4">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      แก้ไข
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDeleteClick(product)}>
                                      <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                                      ลบ
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="lg:col-span-1">
                              <ProductBudgetCard
                                productId={product.id}
                                productName={product.productName}
                                budget={budgetsLoaded ? budgets[product.id] : undefined}
                                onBudgetUpdate={() => loadBudgets(products.map(p => p.id))}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {pagination.total > 0 && (
                    <PaginationControls currentPage={page} totalPages={pagination.totalPages} pageSize={pageSize} totalItems={pagination.total} onPageChange={setPage} onPageSizeChange={setPageSize} />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <LoanProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editingProduct} onSuccess={handleDialogSuccess} />

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                <AlertDialogDescription>
                  คุณแน่ใจหรือไม่ที่จะลบสินเชื่อ "{productToDelete?.productName}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 px-6 py-2 hover:bg-red-700">ลบ</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </DashboardLayout>
  );
}
