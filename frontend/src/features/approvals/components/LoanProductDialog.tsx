import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import { loanProductsApi, LoanProduct, CreateLoanProductInput, InterestTier } from '../api/loan-products.api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { CurrentRatesInfo } from './CurrentRatesInfo';

// Types for legacy/backend structures
type LegacyProductLike = {
  interestRateType?: string;
  interestRateYear1_3?: number | string;
  interestRateYear4Plus?: number | string;
  interestRateFormula?: string;
  [key: string]: unknown;
};

type BackendYearInterestTier = {
  id: string;
  tierType?: string;
  startYear?: number | string;
  endYear?: number | string;
  rate?: string | number;
  formula?: string;
  minRate?: string | number;
  maxRate?: string | number;
  [key: string]: unknown;
};

interface LoanProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: LoanProduct | null;
  onSuccess: () => void;
}

// Presets สำหรับ Tiered Interest
const TIERED_PRESETS = [
  {
    name: '3 ปีแรกคงที่, ต่อมาลอยตัว',
    tiers: [
      { id: 'preset-1-1', type: 'FIXED' as const, startYear: 1, endYear: 3, rate: 4.99 },
      { id: 'preset-1-2', type: 'VARIABLE' as const, startYear: 4, endYear: 'END' as const, formula: 'MLR + 1.5%' }
    ]
  },
  {
    name: 'Step-up 1-3-5 ปี',
    tiers: [
      { id: 'preset-2-1', type: 'FIXED' as const, startYear: 1, endYear: 3, rate: 3.99 },
      { id: 'preset-2-2', type: 'FIXED' as const, startYear: 4, endYear: 5, rate: 4.99 },
      { id: 'preset-2-3', type: 'VARIABLE' as const, startYear: 6, endYear: 'END' as const, formula: 'MRR + 1.0%' }
    ]
  },
  {
    name: 'คงที่ตลอดสัญญา',
    tiers: [
      { id: 'preset-3-1', type: 'FIXED' as const, startYear: 1, endYear: 'END' as const, rate: 6.99 }
    ]
  }
];

// TierCard Component
interface TierCardProps {
  tier: InterestTier;
  index: number;
  onUpdate: (id: string, updates: Partial<InterestTier>) => void;
  onRemove: () => void;
  isLast: boolean;
}

const TierCard = ({ tier, index, onUpdate, onRemove, isLast }: TierCardProps) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <Badge variant={tier.type === 'FIXED' ? 'default' : 'secondary'}>
            {tier.type === 'FIXED' ? 'คงที่' : 'ลอยตัว'}
          </Badge>
          <span className="text-sm text-muted-foreground">Tier {index + 1}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0"
        >
          ✕
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ปีเริ่มต้น */}
        <div>
          <Label htmlFor={`tier-${tier.id}-start`}>ปีเริ่มต้น *</Label>
          <Input
            id={`tier-${tier.id}-start`}
            type="number"
            min="1"
            value={tier.startYear}
            onChange={(e) => onUpdate(tier.id, { startYear: parseInt(e.target.value) })}
          />
        </div>

        {/* ปีสิ้นสุด */}
        <div>
          <Label htmlFor={`tier-${tier.id}-end`}>ปีสิ้นสุด *</Label>
          <select
            id={`tier-${tier.id}-end`}
            className="w-full border rounded-md px-3 py-2"
            value={tier.endYear}
            onChange={(e) => onUpdate(tier.id, {
              endYear: e.target.value === 'END' ? 'END' : parseInt(e.target.value)
            })}
          >
            <option value="END">จนจบสัญญา</option>
            {Array.from({ length: 50 }, (_, i) => i + 1).map(year => (
              <option key={year} value={year}>ปีที่ {year}</option>
            ))}
          </select>
        </div>

        {/* ประเภทดอกเบี้ยใน Tier */}
        {tier.type === 'FIXED' ? (
          <div>
            <Label htmlFor={`tier-${tier.id}-rate`}>อัตราดอกเบี้ย (%) *</Label>
            <Input
              id={`tier-${tier.id}-rate`}
              type="number"
              step="0.01"
              min="0"
              max="20"
              value={tier.rate || ''}
              onChange={(e) => onUpdate(tier.id, { rate: parseFloat(e.target.value) })}
            />
          </div>
        ) : (
          <div className="col-span-3 space-y-3">
            <div>
              <Label htmlFor={`tier-${tier.id}-formula`}>สูตรคำนวณ *</Label>
              <Input
                id={`tier-${tier.id}-formula`}
                type="text"
                value={tier.formula || ''}
                onChange={(e) => onUpdate(tier.id, { formula: e.target.value })}
                placeholder="เช่น MLR + 1.5%"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`tier-${tier.id}-min`}>อัตราขั้นต่ำ (%)</Label>
                <Input
                  id={`tier-${tier.id}-min`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={tier.minRate || ''}
                  onChange={(e) => onUpdate(tier.id, { minRate: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor={`tier-${tier.id}-max`}>อัตราสูงสุด (%)</Label>
                <Input
                  id={`tier-${tier.id}-max`}
                  type="number"
                  step="0.01"
                  min="0"
                  max="20"
                  value={tier.maxRate || ''}
                  onChange={(e) => onUpdate(tier.id, { maxRate: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Auto-adjust message */}
      {!isLast && (
        <p className="text-xs text-muted-foreground mt-2">
          ปีเริ่มต้นของ Tier ถัดไปจะปรับอัตโนมัติเป็นปีที่ {tier.endYear === 'END' ? 'END' : (tier.endYear as number) + 1}
        </p>
      )}
    </div>
  );
};

export function LoanProductDialog({ open, onOpenChange, product, onSuccess }: LoanProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState<CreateLoanProductInput>({
    productCode: '',
    productName: '',
    productNameEn: '',
    description: '',
    purpose: [],
    eligibility: [],
    targetBusiness: [],
    maxLoanAmount: 0,
    interestRateType: 'FIXED',
    interestTiers: [],
    loanType: 'LONG_TERM',
    maxTermMonths: 120,
    governmentSubsidy: false,
    collateralRequired: true,
    guaranteeOptions: [],
    benefits: [],
    feeWaivers: [],
    status: 'ACTIVE',
    isPopular: false,
    displayOrder: 0,
  });

  // Utility Functions for Tiered Interest
  const convertLegacyData = (oldData: LegacyProductLike): InterestTier[] => {
    const type = String(oldData.interestRateType || '').toUpperCase();
    if (type === 'FIXED') {
      return [{
        id: 'legacy-fixed',
        type: 'FIXED',
        startYear: 1,
        endYear: 'END',
        rate: Number(oldData.interestRateYear1_3 ?? 6.99)
      }];
    }
    if (type === 'MIXED') {
      return [{
        id: 'legacy-fixed-period',
        type: 'FIXED',
        startYear: 1,
        endYear: 3,
        rate: Number(oldData.interestRateYear1_3 ?? 4.99)
      }, {
        id: 'legacy-variable-period',
        type: oldData.interestRateFormula ? 'VARIABLE' : 'FIXED',
        startYear: 4,
        endYear: 'END',
        rate: oldData.interestRateFormula ? undefined : (oldData.interestRateYear4Plus ? Number(oldData.interestRateYear4Plus) : undefined),
        formula: typeof oldData.interestRateFormula === 'string' ? oldData.interestRateFormula : undefined
      }];
    }
    if (type === 'VARIABLE') {
      return [{
        id: 'legacy-variable',
        type: 'VARIABLE',
        startYear: 1,
        endYear: 'END',
        formula: String(oldData.interestRateFormula || 'MLR + 1.5%')
      }];
    }
    return [];
  };

  const validateTiers = (tiers: InterestTier[]): string[] => {
    const errors: string[] = [];
    if (tiers.length === 0) return errors;

    const sortedTiers = [...tiers].sort((a, b) => a.startYear - b.startYear);

    // Check first tier starts at Year 1
    if (sortedTiers[0].startYear !== 1) {
      errors.push('Tier แรกต้องเริ่มที่ปีที่ 1');
    }

    // ตรวจสอบความต่อเนื่องและการซ้อนทับ
    for (let i = 0; i < sortedTiers.length - 1; i++) {
      const current = sortedTiers[i];
      const next = sortedTiers[i + 1];

      // Case: Current ends at 'END' but there is a next tier
      if (current.endYear === 'END') {
        errors.push(`Tier ที่ ${i + 1} เป็นแบบตลอดสัญญา ไม่ควรมี Tier ต่อท้าย`);
        break; // Stop checking further as logic is already broken
      }

      // Case: Gap check
      if (next.startYear > current.endYear + 1) {
        errors.push(`มีช่องว่างระหว่างปีที่ ${current.endYear} และ ${next.startYear}`);
      }

      // Case: Overlap check
      if (next.startYear <= current.endYear) {
        errors.push(`ช่วงเวลาซ้อนทับกันระหว่าง Tier ${i + 1} และ ${i + 2}`);
      }
    }

    // ตรวจสอบอัตราดอกเบี้ยและค่า Min/Max
    tiers.forEach((tier, index) => {
      // Check Max Rate Limit (Legal)
      if (tier.type === 'FIXED' && tier.rate && tier.rate > 24) { // Updated legal limit might be higher/lower, assuming 24% or 20%
        errors.push(`Tier ${index + 1}: อัตราดอกเบี้ยสูงเกินไป (Max 24%)`);
      }

      // Check Variable Rate Logic
      if (tier.type === 'VARIABLE') {
        if (!tier.formula) {
          errors.push(`Tier ${index + 1}: กรุณาระบุสูตรคำนวณ`);
        }
        if (tier.minRate !== undefined && tier.maxRate !== undefined && tier.minRate > tier.maxRate) {
          errors.push(`Tier ${index + 1}: อัตราต่ำสุดต้องไม่มากกว่าอัตราสูงสุด`);
        }
      }
    });

    return errors;
  };

  const generateFormulaString = (tiers: InterestTier[]): string => {
    return tiers.map((tier) => {
      const period = tier.endYear === 'END'
        ? `ปีที่ ${tier.startYear}+`
        : tier.startYear === tier.endYear
          ? `ปีที่ ${tier.startYear}`
          : `ปีที่ ${tier.startYear}-${tier.endYear}`;

      const rate = tier.type === 'FIXED'
        ? `${tier.rate}%`
        : tier.formula || `${tier.minRate || 0}%-${tier.maxRate || 0}%`;

      return `${period}: ${rate}`;
    }).join(' | ');
  };

  const generateSummary = (tiers: InterestTier[]) => {
    return tiers.map((tier) => ({
      period: tier.endYear === 'END'
        ? `ปีที่ ${tier.startYear}+`
        : `ปีที่ ${tier.startYear}-${tier.endYear}`,
      type: tier.type,
      rate: tier.rate,
      formula: tier.formula,
      minRate: tier.minRate,
      maxRate: tier.maxRate
    }));
  };

  const addTier = (type: 'FIXED' | 'VARIABLE') => {
    const tiers = [...(formData.interestTiers || [])];
    const lastTier = tiers.length > 0 ? tiers[tiers.length - 1] : null;

    // Prevent adding tier if last one is 'END'
    if (lastTier && lastTier.endYear === 'END') {
      toast({
        title: "ไม่สามารถเพิ่ม Tier ได้",
        description: "Tier ล่าสุดเป็นแบบ 'ตลอดสัญญา' กรุณาแก้ไข Tier ล่าสุดให้มีปีสิ้นสุดก่อน",
        variant: "destructive"
      });
      return;
    }

    const startYear = lastTier
      ? (lastTier.endYear as number) + 1
      : 1;

    const newTier: InterestTier = {
      id: `tier-${Date.now()}`,
      type,
      startYear,
      endYear: type === 'FIXED' ? (startYear + 2) : 'END',
      rate: type === 'FIXED' ? 4.99 : undefined,
      formula: type === 'VARIABLE' ? 'MLR + 1.5%' : undefined,
    };

    setFormData({
      ...formData,
      interestTiers: [...tiers, newTier]
    });
  };

  const updateTier = (id: string, updates: Partial<InterestTier>) => {
    setFormData(prev => {
      const currentTiers = prev.interestTiers || [];
      const updatedTiers = currentTiers.map(tier =>
        tier.id === id ? { ...tier, ...updates } : tier
      );

      // Auto-adjust start years of subsequent tiers to prevent overlaps automatically
      // This is a "Smart UX" feature
      const sorted = [...updatedTiers].sort((a, b) => a.startYear - b.startYear);
      const index = sorted.findIndex(t => t.id === id);

      if (index !== -1 && index < sorted.length - 1) {
        // If we updated a tier that is NOT the last one
        const current = sorted[index];
        if (current.endYear !== 'END') {
          // Ensure next tier starts immediately after
          const nextTier = sorted[index + 1];
          if (nextTier.startYear <= current.endYear) {
            nextTier.startYear = (current.endYear as number) + 1;
          }
        }
      }

      return {
        ...prev,
        interestTiers: sorted
      };
    });
  };

  const removeTier = (id: string) => {
    setFormData({
      ...formData,
      interestTiers: (formData.interestTiers || []).filter(tier => tier.id !== id)
    });
  };

  const applyPreset = (preset: typeof TIERED_PRESETS[0]) => {
    setFormData({
      ...formData,
      interestTiers: preset.tiers.map(t => ({ ...t, id: `${t.id}-${Date.now()}` }))
    });
  };

  useEffect(() => {
    if (product) {
      // Transform yearInterestTiers from backend to frontend format
      const productTiersSource = (product as unknown as { yearInterestTiers?: BackendYearInterestTier[]; interestTiers?: BackendYearInterestTier[] } | null) || null;
      const backendTiers = (productTiersSource?.yearInterestTiers ?? productTiersSource?.interestTiers) || [];
      const transformedTiers = backendTiers.map((tier) => ({
        id: String(tier.id),
        type: (tier.tierType as 'FIXED' | 'VARIABLE') || 'FIXED',
        startYear: Number(tier.startYear) || 1,
        endYear: tier.endYear === 'END' ? 'END' as const : Number(tier.endYear) || 'END',
        rate: tier.rate !== undefined ? Number(tier.rate) : undefined,
        formula: typeof tier.formula === 'string' ? tier.formula : undefined,
        minRate: tier.minRate !== undefined ? Number(tier.minRate) : undefined,
        maxRate: tier.maxRate !== undefined ? Number(tier.maxRate) : undefined,
      } as InterestTier));

      setFormData({
        productCode: product.productCode,
        productName: product.productName,
        productNameEn: product.productNameEn,
        description: product.description,
        purpose: product.purpose,
        eligibility: product.eligibility,
        targetBusiness: product.targetBusiness,
        minRevenue: product.minRevenue,
        maxRevenue: product.maxRevenue,
        minYearsInBusiness: product.minYearsInBusiness,
        minLoanAmount: product.minLoanAmount,
        maxLoanAmount: product.maxLoanAmount,
        totalProjectBudget: product.totalProjectBudget,
        interestRateType: product.interestRateType,
        interestRateYear1_3: product.interestRateYear1_3,
        interestRateYear4Plus: product.interestRateYear4Plus,
        interestRateFormula: product.interestRateFormula,
        interestTiers: transformedTiers,
        governmentSubsidy: product.governmentSubsidy,
        subsidyDetails: product.subsidyDetails,
        loanType: product.loanType,
        maxTermMonths: product.maxTermMonths,
        gracePeriodMonths: product.gracePeriodMonths,
        collateralRequired: product.collateralRequired,
        collateralDetails: product.collateralDetails,
        guaranteeOptions: product.guaranteeOptions,
        benefits: product.benefits,
        feeWaivers: product.feeWaivers,
        projectStartDate: product.projectStartDate,
        projectEndDate: product.projectEndDate,
        status: product.status,
        isPopular: product.isPopular,
        displayOrder: product.displayOrder,
      });
    } else {
      setFormData({
        productCode: '',
        productName: '',
        productNameEn: '',
        description: '',
        purpose: [],
        eligibility: [],
        targetBusiness: [],
        maxLoanAmount: 0,
        interestRateType: 'FIXED',
        interestTiers: [],
        loanType: 'LONG_TERM',
        maxTermMonths: 120,
        governmentSubsidy: false,
        collateralRequired: true,
        guaranteeOptions: [],
        benefits: [],
        feeWaivers: [],
        status: 'ACTIVE',
        isPopular: false,
        displayOrder: 0,
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data for submission
      const { interestTiers, ...submitData } = formData;
      // backend payload typed loosely to allow adding yearInterestTiers
      const backendPayload: Partial<CreateLoanProductInput & { yearInterestTiers?: Record<string, unknown>[] }> = { ...submitData };

      // Transform interestTiers for backend
      if (formData.interestRateType === 'TIERED' && formData.interestTiers && formData.interestTiers.length > 0) {
        backendPayload.yearInterestTiers = formData.interestTiers.map(tier => ({
          tierType: tier.type,
          startYear: tier.startYear,
          endYear: tier.endYear === 'END' ? 'END' : String(tier.endYear),
          rate: tier.rate,
          formula: tier.formula,
          minRate: tier.minRate,
          maxRate: tier.maxRate,
        }));
      }

      if (product) {
        await loanProductsApi.update(product.id, backendPayload as CreateLoanProductInput);
        toast({
          title: 'สำเร็จ',
          description: 'อัปเดตข้อมูลสินเชื่อเรียบร้อยแล้ว',
        });
      } else {
        await loanProductsApi.create(backendPayload as CreateLoanProductInput);
        toast({
          title: 'สำเร็จ',
          description: 'เพิ่มสินเชื่อใหม่เรียบร้อยแล้ว',
        });
      }

      // --- Manual Validation Before Submit ---
      const errors: string[] = [];

      // Validate Financials
      if (formData.minLoanAmount && formData.maxLoanAmount && formData.minLoanAmount > formData.maxLoanAmount) {
        errors.push("วงเงินกู้ขั้นต่ำต้องไม่มากกว่าวงเงินกู้สูงสุด");
      }
      if (formData.minRevenue && formData.maxRevenue && formData.minRevenue > formData.maxRevenue) {
        errors.push("รายได้ขั้นต่ำต้องไม่มากกว่ารายได้สูงสุด");
      }

      // Validate Dates
      if (formData.projectStartDate && formData.projectEndDate) {
        const start = new Date(formData.projectStartDate);
        const end = new Date(formData.projectEndDate);
        if (end < start) {
          errors.push("วันสิ้นสุดโครงการต้องอยู่หลังวันเริ่มโครงการ");
        }
      }

      // Validate Tiers (If applicable)
      if (formData.interestRateType === 'TIERED' && formData.interestTiers) {
        const tierErrors = validateTiers(formData.interestTiers);
        errors.push(...tierErrors);
      }

      if (errors.length > 0) {
        toast({
          title: "ข้อมูลไม่ถูกต้อง",
          description: (
            <div className="flex flex-col gap-1 mt-1">
              {errors.map((e, i) => <span key={i}>• {e}</span>)}
            </div>
          ),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      // ---------------------------------------

      onSuccess();
    } catch (error: unknown) {
      console.error('[LoanProductDialog] Submit error:', error);
      const err = error as Error | { message?: string } | undefined;
      const message = err?.message ?? 'ไม่สามารถบันทึกข้อมูลได้';
      const userMessage = message === 'Session expired. Please login again.'
        ? 'เซสชันหมดอายุ กรุณารีเฟรชหน้าเว็บและลองใหม่อีกครั้ง'
        : message;
      toast({ title: 'เกิดข้อผิดพลาด', description: userMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleArrayInput = (field: keyof CreateLoanProductInput, value: string) => {
    setFormData({
      ...formData,
      [field]: value.split(',').map((v) => v.trim()).filter(Boolean),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto border rounded-lg">
        <DialogHeader>
          <DialogTitle>{product ? 'แก้ไขสินเชื่อ' : 'เพิ่มสินเชื่อใหม่'}</DialogTitle>
          <DialogDescription>
            {product ? 'แก้ไขข้อมูลสินเชื่อและเงื่อนไขต่างๆ' : 'เพิ่มสินเชื่อใหม่พร้อมกำหนดเงื่อนไขทางการเงิน'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">ข้อมูลพื้นฐาน</TabsTrigger>
              <TabsTrigger value="financial">เงื่อนไขทางการเงิน</TabsTrigger>
              <TabsTrigger value="eligibility">คุณสมบัติ</TabsTrigger>
              <TabsTrigger value="benefits">สิทธิประโยชน์</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productCode">รหัสสินเชื่อ *</Label>
                  <Input
                    id="productCode"
                    value={formData.productCode}
                    onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="productName">ชื่อสินเชื่อ (ไทย) *</Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="productNameEn">ชื่อสินเชื่อ (อังกฤษ)</Label>
                <Input
                  id="productNameEn"
                  value={formData.productNameEn}
                  onChange={(e) => setFormData({ ...formData, productNameEn: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="loanType">ประเภทสินเชื่อ *</Label>
                  <select
                    id="loanType"
                    className="w-full border rounded-md px-3 py-2"
                    value={formData.loanType}
                    onChange={(e) => setFormData({ ...formData, loanType: e.target.value as CreateLoanProductInput['loanType'] })}
                    required
                  >
                    <option value="SHORT_TERM">ระยะสั้น</option>
                    <option value="MEDIUM_TERM">ระยะกลาง</option>
                    <option value="LONG_TERM">ระยะยาว</option>
                    <option value="REVOLVING">หมุนเวียน</option>
                    <option value="MIXED">ผสม</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">สถานะ *</Label>
                  <select
                    id="status"
                    className="w-full border rounded-md px-3 py-2"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CreateLoanProductInput['status'] })}
                    required
                  >
                    <option value="ACTIVE">ใช้งาน</option>
                    <option value="INACTIVE">ไม่ใช้งาน</option>
                    <option value="ARCHIVED">เก็บถาวร</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPopular"
                    checked={formData.isPopular}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPopular: checked })}
                  />
                  <Label htmlFor="isPopular">สินเชื่อยอดนิยม</Label>
                </div>
                <div>
                  <Label htmlFor="displayOrder">ลำดับการแสดง</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              {/* ==================== วงเงิน ==================== */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minLoanAmount">วงเงินขั้นต่ำ (บาท)</Label>
                  <Input
                    id="minLoanAmount"
                    type="number"
                    value={formData.minLoanAmount || ''}
                    onChange={(e) => setFormData({ ...formData, minLoanAmount: parseFloat(e.target.value) || undefined })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="maxLoanAmount">วงเงินสูงสุด (บาท) *</Label>
                  <Input
                    id="maxLoanAmount"
                    type="number"
                    value={formData.maxLoanAmount}
                    onChange={(e) => setFormData({ ...formData, maxLoanAmount: parseFloat(e.target.value) || 0 })}
                    required
                    placeholder="5000000"
                  />
                </div>
              </div>

              {/* ==================== ดอกเบี้ย ==================== */}
              <div className="space-y-4 border rounded-md p-4">
                <h3 className="font-semibold text-lg">อัตราดอกเบี้ย</h3>

                {/* ประเภทดอกเบี้ย */}
                <div>
                  <Label htmlFor="interestRateType">ประเภทอัตราดอกเบี้ย *</Label>
                  <select
                    id="interestRateType"
                    className="w-full border rounded-md px-3 py-2"
                    value={formData.interestRateType}
                    onChange={(e) => {
                      const newType = e.target.value as CreateLoanProductInput['interestRateType'];
                      // Only pass the legacy-related fields to converter
                      const legacyLike: LegacyProductLike = {
                        interestRateType: newType,
                        interestRateYear1_3: formData.interestRateYear1_3,
                        interestRateYear4Plus: formData.interestRateYear4Plus,
                        interestRateFormula: formData.interestRateFormula,
                      };
                      const convertedTiers = newType === 'TIERED' ? convertLegacyData(legacyLike) : [];
                      setFormData({
                        ...formData,
                        interestRateType: newType,
                        interestTiers: convertedTiers,
                        // Reset ข้อมูลดอกเบี้ยเมื่อเปลี่ยนประเภท
                        interestRateFormula: newType === 'VARIABLE' ? formData.interestRateFormula : undefined,
                        interestRateYear1_3: newType !== 'TIERED' ? formData.interestRateYear1_3 : undefined,
                        interestRateYear4Plus: newType !== 'TIERED' ? formData.interestRateYear4Plus : undefined
                      });
                    }}
                    required
                  >
                    <option value="FIXED">คงที่</option>
                    <option value="VARIABLE">ลอยตัว</option>
                    <option value="MIXED">ผสม (คงที่ + ลอยตัว)</option>
                    <option value="TIERED">หลาย Tier (ยืดหยุ่น)</option>
                  </select>
                </div>

                {/* ==================== แบบคงที่ ==================== */}
                {formData.interestRateType === 'FIXED' && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-md">
                    <h4 className="font-medium">ดอกเบี้ยแบบคงที่</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="interestRateYear1_3">อัตราดอกเบี้ยปีที่ 1-3 (%) *</Label>
                        <Input
                          id="interestRateYear1_3"
                          type="number"
                          step="0.01"
                          min="0"
                          max="20"
                          value={formData.interestRateYear1_3 || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            interestRateYear1_3: parseFloat(e.target.value) || undefined
                          })}
                          placeholder="เช่น 6.99"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          อัตราดอกเบี้ยคงที่ตลอดอายุสัญญา
                        </p>
                      </div>
                      <div>
                        <Label>ตัวอย่างการคำนวณ</Label>
                        <div className="text-sm p-2 bg-background rounded border">
                          <p>วงเงิน 1,000,000 บาท × 6.99% =</p>
                          <p className="font-medium">ดอกเบี้ยปีละ 69,900 บาท</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================== แบบลอยตัว ==================== */}
                {formData.interestRateType === 'VARIABLE' && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-md">
                    <h4 className="font-medium">ดอกเบี้ยแบบลอยตัว</h4>

                    {/* แสดงอัตราอ้างอิงปัจจุบัน */}
                    <CurrentRatesInfo />

                    <div>
                      <Label htmlFor="interestRateFormula">สูตรคำนวณดอกเบี้ย *</Label>
                      <Input
                        id="interestRateFormula"
                        type="text"
                        value={formData.interestRateFormula || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          interestRateFormula: e.target.value
                        })}
                        placeholder="เช่น MLR + 1.5% หรือ MRR + 2.0%"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ระบุสูตรการคำนวณดอกเบี้ย เช่น MLR + 1.5%, MRR + 2.0%
                      </p>
                    </div>
                  </div>
                )}

                {/* ==================== แบบผสม ==================== */}
                {formData.interestRateType === 'MIXED' && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-md">
                    <h4 className="font-medium">ดอกเบี้ยแบบผสม</h4>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="interestRateYear1_3">อัตราดอกเบี้ยปีที่ 1-3 (%) *</Label>
                          <Input
                            id="interestRateYear1_3"
                            type="number"
                            step="0.01"
                            min="0"
                            max="20"
                            value={formData.interestRateYear1_3 || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              interestRateYear1_3: parseFloat(e.target.value) || undefined
                            })}
                            placeholder="เช่น 4.99"
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            อัตราดอกเบี้ยคงที่สำหรับปีที่ 1-3
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="interestRateYear4Plus">อัตราดอกเบี้ยปีที่ 4+ (%) *</Label>
                          <Input
                            id="interestRateYear4Plus"
                            type="number"
                            step="0.01"
                            min="0"
                            max="20"
                            value={formData.interestRateYear4Plus || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              interestRateYear4Plus: parseFloat(e.target.value) || undefined
                            })}
                            placeholder="เช่น 6.99"
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            อัตราดอกเบี้ยสำหรับปีที่ 4 เป็นต้นไป
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="interestRateFormula">สูตรคำนวณ (ถ้ามี)</Label>
                        <Input
                          id="interestRateFormula"
                          type="text"
                          value={formData.interestRateFormula || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            interestRateFormula: e.target.value
                          })}
                          placeholder="เช่น ปีที่ 4+: MLR + 1.5%"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          สูตรสำหรับช่วงลอยตัว (ถ้ามี)
                        </p>
                      </div>

                      {/* ตัวอย่างการคำนวณ */}
                      <div className="space-y-2">
                        <Label>ตัวอย่างการคำนวณ</Label>
                        <div className="text-sm space-y-2 p-3 bg-background rounded border">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-muted-foreground">ปีที่ 1-3</p>
                              <p className="font-medium">ดอกเบี้ยคงที่ {formData.interestRateYear1_3 || 0}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">ปีที่ 4 เป็นต้นไป</p>
                              <p className="font-medium">
                                ดอกเบี้ย {formData.interestRateYear4Plus || 0}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================== แบบ Tiered (หลาย Tier) ==================== */}
                {formData.interestRateType === 'TIERED' && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-md">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">จัดการดอกเบี้ยแบบหลาย Tier</h4>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTier('FIXED')}
                        >
                          + Tier คงที่
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTier('VARIABLE')}
                        >
                          + Tier ลอยตัว
                        </Button>
                      </div>
                    </div>

                    {/* แสดงอัตราอ้างอิงปัจจุบัน */}
                    <CurrentRatesInfo />

                    {/* Presets */}
                    <div className="space-y-2">
                      <Label>แบบสำเร็จรูป</Label>
                      <div className="flex flex-wrap gap-2">
                        {TIERED_PRESETS.map((preset, idx) => (
                          <Button
                            key={idx}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreset(preset)}
                          >
                            {preset.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Visual Tiers */}
                    <div className="space-y-3">
                      {(formData.interestTiers || [])
                        .sort((a, b) => a.startYear - b.startYear)
                        .map((tier, index) => (
                          <TierCard
                            key={tier.id}
                            tier={tier}
                            index={index}
                            onUpdate={updateTier}
                            onRemove={() => removeTier(tier.id)}
                            isLast={index === (formData.interestTiers || []).length - 1}
                          />
                        ))}
                    </div>

                    {/* Real-time Summary */}
                    {(formData.interestTiers || []).length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <h5 className="font-medium text-blue-800 mb-2">สรุปดอกเบี้ย</h5>
                        <div className="space-y-1 text-sm">
                          {generateSummary(formData.interestTiers || []).map((summary, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{summary.period}:</span>
                              <span className="font-medium">
                                {summary.type === 'FIXED'
                                  ? `${summary.rate}%`
                                  : summary.formula || `${summary.minRate || 0}%-${summary.maxRate || 0}%`}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Validation Messages */}
                        {validateTiers(formData.interestTiers || []).map((error, idx) => (
                          <div key={idx} className="text-red-600 text-sm mt-2">
                            ⚠️ {error}
                          </div>
                        ))}

                        {/* Auto-generated Formula String */}
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <Label className="text-blue-800">สูตรดอกเบี้ยที่สร้างอัตโนมัติ:</Label>
                          <div className="text-sm font-mono bg-white p-2 rounded border">
                            {generateFormulaString(formData.interestTiers || [])}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ==================== เงื่อนไขอื่นๆ ==================== */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxTermMonths">ระยะเวลาสูงสุด (เดือน) *</Label>
                  <Input
                    id="maxTermMonths"
                    type="number"
                    value={formData.maxTermMonths}
                    onChange={(e) => setFormData({ ...formData, maxTermMonths: parseInt(e.target.value) || 0 })}
                    required
                    min="1"
                    max="360"
                  />
                </div>
                <div>
                  <Label htmlFor="gracePeriodMonths">ระยะปลอดชำระเงินต้น (เดือน)</Label>
                  <Input
                    id="gracePeriodMonths"
                    type="number"
                    value={formData.gracePeriodMonths || ''}
                    onChange={(e) => setFormData({ ...formData, gracePeriodMonths: parseInt(e.target.value) || undefined })}
                    min="0"
                    max="24"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ชำระเฉพาะดอกเบี้ย ไม่ต้องชำระเงินต้น
                  </p>
                </div>
              </div>

              {/* ... ส่วนที่เหลือ ... */}
            </TabsContent>

            <TabsContent value="eligibility" className="space-y-4">
              <div>
                <Label htmlFor="purpose">วัตถุประสงค์การกู้ (คั่นด้วยเครื่องหมายจุลภาค)</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose?.join(', ') || ''}
                  onChange={(e) => handleArrayInput('purpose', e.target.value)}
                  rows={3}
                  placeholder="เช่น ลงทุน, ขยายกิจการ, เสริมสภาพคล่อง"
                />
              </div>

              <div>
                <Label htmlFor="eligibility">คุณสมบัติผู้กู้ (คั่นด้วยเครื่องหมายจุลภาค)</Label>
                <Textarea
                  id="eligibility"
                  value={formData.eligibility?.join(', ') || ''}
                  onChange={(e) => handleArrayInput('eligibility', e.target.value)}
                  rows={3}
                  placeholder="เช่น เป็นผู้ประกอบการ SME, ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 1 ปี"
                />
              </div>

              <div>
                <Label htmlFor="targetBusiness">กลุ่มธุรกิจเป้าหมาย (คั่นด้วยเครื่องหมายจุลภาค)</Label>
                <Textarea
                  id="targetBusiness"
                  value={formData.targetBusiness?.join(', ') || ''}
                  onChange={(e) => handleArrayInput('targetBusiness', e.target.value)}
                  rows={2}
                  placeholder="เช่น ร้านอาหาร, ร้านค้าปลีก, ธุรกิจดิจิทัล"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minRevenue">รายได้ขั้นต่ำต่อปี (บาท)</Label>
                  <Input
                    id="minRevenue"
                    type="number"
                    value={formData.minRevenue || ''}
                    onChange={(e) => setFormData({ ...formData, minRevenue: parseFloat(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxRevenue">รายได้สูงสุดต่อปี (บาท)</Label>
                  <Input
                    id="maxRevenue"
                    type="number"
                    value={formData.maxRevenue || ''}
                    onChange={(e) => setFormData({ ...formData, maxRevenue: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="minYearsInBusiness">จำนวนปีที่ดำเนินธุรกิจขั้นต่ำ</Label>
                <Input
                  id="minYearsInBusiness"
                  type="number"
                  value={formData.minYearsInBusiness || ''}
                  onChange={(e) => setFormData({ ...formData, minYearsInBusiness: parseInt(e.target.value) || undefined })}
                />
              </div>
            </TabsContent>

            <TabsContent value="benefits" className="space-y-4">
              <div>
                <Label htmlFor="benefits">สิทธิประโยชน์ (คั่นด้วยเครื่องหมายจุลภาค)</Label>
                <Textarea
                  id="benefits"
                  value={formData.benefits?.join(', ') || ''}
                  onChange={(e) => handleArrayInput('benefits', e.target.value)}
                  rows={3}
                  placeholder="เช่น รัฐบาลชดเชยดอกเบี้ย 3%, ฟรีค่าธรรมเนียม"
                />
              </div>

              <div>
                <Label htmlFor="feeWaivers">ยกเว้นค่าธรรมเนียม (คั่นด้วยเครื่องหมายจุลภาค)</Label>
                <Textarea
                  id="feeWaivers"
                  value={formData.feeWaivers?.join(', ') || ''}
                  onChange={(e) => handleArrayInput('feeWaivers', e.target.value)}
                  rows={2}
                  placeholder="เช่น ฟรีค่าธรรมเนียมค้ำประกัน 4 ปี, ลดค่าธรรมเนียมวิเคราะห์โครงการ"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectStartDate">วันเริ่มโครงการ</Label>
                  <Input
                    id="projectStartDate"
                    type="date"
                    value={formData.projectStartDate || ''}
                    onChange={(e) => setFormData({ ...formData, projectStartDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="projectEndDate">วันสิ้นสุดโครงการ</Label>
                  <Input
                    id="projectEndDate"
                    type="date"
                    value={formData.projectEndDate || ''}
                    onChange={(e) => setFormData({ ...formData, projectEndDate: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
