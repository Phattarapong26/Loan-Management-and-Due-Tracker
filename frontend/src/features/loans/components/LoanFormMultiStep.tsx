/**
 * Multi-Step Loan Form - ลด Journey Friction
 * แบ่งเป็น 3 Steps แทน 1 Form ยาว
 */

import { useState, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Progress } from '@/shared/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface LoanFormData {
  // Step 1: Customer
  customerId: string;
  
  // Step 2: Loan Details
  loanProductId: string;
  amount: string;
  interestRate: string;
  duration: string;
  
  // Step 3: Financial Data (Optional)
  revenue: string;
  expenses: string;
  debtPayment: string;
  description?: string;
}

interface LoanFormMultiStepProps {
  customers: Array<{ id: string; name: string; businessName: string }>;
  loanProducts: Array<{ id: string; productName: string; defaultRate: number; defaultTerm: number }>;
  onSubmit: (data: LoanFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialCustomerId?: string;
}

const STEPS = [
  { id: 1, title: 'เลือกลูกค้า', description: 'เลือกลูกค้าที่ต้องการสร้างสินเชื่อ' },
  { id: 2, title: 'ข้อมูลสินเชื่อ', description: 'กรอกรายละเอียดสินเชื่อ' },
  { id: 3, title: 'ข้อมูลทางการเงิน', description: 'กรอกข้อมูลทางการเงิน (ถ้ามี)' },
];

export function LoanFormMultiStep({
  customers,
  loanProducts,
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialCustomerId,
}: LoanFormMultiStepProps) {
  const [currentStep, setCurrentStep] = useState(initialCustomerId ? 2 : 1);
  const [formData, setFormData] = useState<LoanFormData>({
    customerId: initialCustomerId || '',
    loanProductId: '',
    amount: '',
    interestRate: '8.5',
    duration: '12',
    revenue: '',
    expenses: '',
    debtPayment: '',
    description: '',
  });

  const progress = (currentStep / STEPS.length) * 100;

  // Auto-fill จาก Loan Product
  const handleLoanProductChange = useCallback((productId: string) => {
    const product = loanProducts.find(p => p.id === productId);
    if (product) {
      setFormData(prev => ({
        ...prev,
        loanProductId: productId,
        interestRate: product.defaultRate.toString(),
        duration: product.defaultTerm.toString(),
      }));
    }
  }, [loanProducts]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    await onSubmit(formData);
  }, [onSubmit, formData]);

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.customerId !== '';
      case 2:
        return formData.loanProductId !== '' && 
               formData.amount !== '' && 
               parseFloat(formData.amount) > 0;
      case 3:
        return true; // Optional step
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            ขั้นตอนที่ {currentStep} จาก {STEPS.length}
          </span>
          <span className="text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-2',
              index < STEPS.length - 1 && 'flex-1'
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  currentStep > step.id && 'border-primary bg-primary text-primary-foreground',
                  currentStep === step.id && 'border-primary bg-background text-primary',
                  currentStep < step.id && 'border-muted bg-background text-muted-foreground'
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.id}</span>
                )}
              </div>
              <div className="text-center">
                <p className={cn(
                  'text-sm font-medium',
                  currentStep === step.id ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {step.title}
                </p>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-2',
                currentStep > step.id ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Customer Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">
                  เลือกลูกค้า <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}
                >
                  <SelectTrigger id="customerId">
                    <SelectValue placeholder="เลือกลูกค้า" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.businessName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  เลือกลูกค้าที่ต้องการสร้างสินเชื่อ
                </p>
              </div>

              {formData.customerId && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">ลูกค้าที่เลือก:</p>
                  <p className="text-sm text-muted-foreground">
                    {customers.find(c => c.id === formData.customerId)?.businessName}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Loan Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loanProductId">
                  ประเภทสินเชื่อ <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.loanProductId}
                  onValueChange={handleLoanProductChange}
                >
                  <SelectTrigger id="loanProductId">
                    <SelectValue placeholder="เลือกประเภทสินเชื่อ" />
                  </SelectTrigger>
                  <SelectContent>
                    {loanProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.productName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  อัตราดอกเบี้ยและระยะเวลาจะถูกกรอกอัตโนมัติ
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  จำนวนเงินกู้ (บาท) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="100000"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  ตัวอย่าง: 100000
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interestRate">
                    อัตราดอกเบี้ย (%) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    value={formData.interestRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, interestRate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">
                    ระยะเวลา (เดือน) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  />
                </div>
              </div>

              {formData.loanProductId && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium text-primary mb-1">
                    💡 ข้อมูลถูกกรอนอัตโนมัติ
                  </p>
                  <p className="text-xs text-muted-foreground">
                    อัตราดอกเบี้ยและระยะเวลาถูกกรอกตามประเภทสินเชื่อที่เลือก คุณสามารถแก้ไขได้
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Financial Data (Optional) */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg mb-4">
                <p className="text-sm font-medium mb-1">ข้อมูลทางการเงิน (ไม่บังคับ)</p>
                <p className="text-xs text-muted-foreground">
                  กรอกข้อมูลเพื่อคำนวณ DSCR หรือข้ามขั้นตอนนี้ได้
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="revenue">รายได้ต่อปี (บาท)</Label>
                <Input
                  id="revenue"
                  type="number"
                  placeholder="1000000"
                  value={formData.revenue}
                  onChange={(e) => setFormData(prev => ({ ...prev, revenue: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenses">ค่าใช้จ่ายต่อปี (บาท)</Label>
                <Input
                  id="expenses"
                  type="number"
                  placeholder="500000"
                  value={formData.expenses}
                  onChange={(e) => setFormData(prev => ({ ...prev, expenses: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="debtPayment">ภาระหนี้ต่อปี (บาท)</Label>
                <Input
                  id="debtPayment"
                  type="number"
                  placeholder="200000"
                  value={formData.debtPayment}
                  onChange={(e) => setFormData(prev => ({ ...prev, debtPayment: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">หมายเหตุ</Label>
                <Textarea
                  id="description"
                  placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handleBack}
          disabled={isSubmitting}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'ยกเลิก' : 'ย้อนกลับ'}
        </Button>

        {currentStep < STEPS.length ? (
          <Button
            onClick={handleNext}
            disabled={!isStepValid() || isSubmitting}
          >
            ถัดไป
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!isStepValid() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                กำลังสร้างสินเชื่อ...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                สร้างสินเชื่อ
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
