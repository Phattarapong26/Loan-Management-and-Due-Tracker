/**
 * Document Review Modal - REFACTORED VERSION
 * 
 * Main modal component for reviewing and editing parsed business profile data
 * All section components have been extracted to separate files
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, Pencil, Save, AlertTriangle, ChevronDown, 
  ChevronUp, Layers, Loader2, FileText
} from "lucide-react";
import { EnhancedDataViewer } from './EnhancedDataViewer';
import { DebugDataViewer } from './DebugDataViewer';
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import { ParsedBusinessProfile } from "../../utils/parsers/excel-parser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

// Import types and utilities
import { DocumentReviewModalProps, ReviewSection } from './review-modal/types';
import { SECTIONS } from './review-modal/constants';
import { normalizeProfile, calculateSectionCounts } from './review-modal/utils';

// Import section components
import {
  CompanyInfoSection,
  ShareholderSection,
  LoanSummarySection,
  FinancialSection,
  VATSection,
  CreditBureauSection,
  BankStatementSection,
  InvestmentSection,
  CollateralSection,
  WorkingCapitalSection,
  RevenueProjectionSection,
  DSCRSection,
  BusinessHistorySection,
  ProductSection,
  ApprovalCommentsSection,
  RecommendationSection,
} from './review-modal/sections';

export function DocumentReviewModal({
  parsedData: initialProfile,
  onConfirm,
  onSaveDraft,
  onCancel,
  existingCustomers = [],
}: DocumentReviewModalProps) {
  // console.log('[DocumentReviewModal] Initial profile:', initialProfile);

  const [profile, setProfile] = useState<ParsedBusinessProfile>(normalizeProfile(initialProfile));
  const [activeSection, setActiveSection] = useState<ReviewSection>('companyInfo');
  const [isSaving, setIsSaving] = useState(false);
  const [saveAction, setSaveAction] = useState<'create' | 'link'>('create');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showSheetInfo, setShowSheetInfo] = useState(false);

  const confidence = Math.round((profile.matchConfidence || 0) * 100);
  const sectionCounts = useMemo(() => calculateSectionCounts(profile), [profile]);

  const handleSave = async () => {
    if (saveAction === 'link' && !selectedCustomerId) {
      toast.error("กรุณาเลือกลูกค้าที่ต้องการผูกข้อมูล");
      return;
    }

    setIsSaving(true);
    try {
      await onConfirm(profile, saveAction, selectedCustomerId || undefined);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    
    setIsSaving(true);
    try {
      await onSaveDraft(profile);
      toast.success("บันทึกแบบร่างสำเร็จ");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึกแบบร่าง");
    } finally {
      setIsSaving(false);
    }
  };

  const updateCompanyInfo = (field: string, value: string | number) => {
    setProfile(prev => ({
      ...prev,
      companyInfo: { ...prev.companyInfo, [field]: value },
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-card rounded-2xl w-[98vw] max-w-[1400px] h-[96vh] flex flex-col overflow-hidden shadow-2xl border border-border"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">
                ตรวจสอบและยืนยันข้อมูล
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <span className="truncate max-w-[300px]" title={profile.sourceFileName || 'ไม่ระบุชื่อไฟล์'}>
                  {profile.sourceFileName || 'ไม่ระบุชื่อไฟล์'}
                </span>
                {(profile.sheetsParsed && profile.sheetsParsed.length > 0) && (
                  <>
                    <span className="opacity-50">•</span>
                    <button
                      onClick={() => setShowSheetInfo(!showSheetInfo)}
                      className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      <Layers className="w-4 h-4" />
                      {profile.sheetsParsed.length} sheets
                      {showSheetInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onCancel}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all"
              disabled={isSaving}
              title="ปิด"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sheets Info (collapsible) */}
        <AnimatePresence>
          {showSheetInfo && profile.sheetsParsed && profile.sheetsParsed.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border"
            >
              <div className="px-4 sm:px-6 py-2 bg-primary/5">
                <div className="flex flex-wrap gap-1.5">
                  {profile.sheetsParsed.map((sheet, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                      ✓ {sheet}
                    </span>
                  ))}
                  {profile.warnings && profile.warnings.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-warning/10 text-warning border border-warning/20">
                      ⚠ {profile.warnings.length} warnings
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Summary Bar */}
        <div className="px-4 sm:px-6 py-2 border-b border-border bg-muted/10 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {[
              { ok: !!profile.companyInfo?.companyName, label: 'บริษัท' },
              { ok: (profile.shareholders || []).length > 0, label: `ผถห.(${(profile.shareholders || []).length})` },
              { ok: ((profile.loanSummary?.newLoans || []).length) > 0, label: `สินเชื่อ(${((profile.loanSummary?.existingLoans || []).length) + ((profile.loanSummary?.newLoans || []).length)})` },
              { ok: (profile.financialStatements || []).length > 0, label: `งบกำไร(${(profile.financialStatements || []).length})` },
              { ok: (profile.balanceSheets || []).length > 0, label: `งบดุล(${(profile.balanceSheets || []).length})` },
              { ok: (profile.vatRecords || []).length > 0, label: `ภพ30(${(profile.vatRecords || []).length})` },
              { ok: (profile.creditBureauReports || []).length > 0, label: `เครดิตบูโร(${(profile.creditBureauReports || []).length})` },
              { ok: (profile.bankStatements || []).length > 0, label: `Stmt(${(profile.bankStatements || []).length})` },
              { ok: (profile.workingCapital?.totalNeeded || 0) > 0, label: 'เงินทุน' },
              { ok: (profile.revenueProjection?.monthlyProjections || []).length > 0, label: `ประมาณ(${(profile.revenueProjection?.monthlyProjections || []).length})` },
              { ok: !!profile.dscr?.dscrRatio, label: profile.dscr?.dscrRatio ? `DSCR(${profile.dscr.dscrRatio.toFixed(1)})` : 'DSCR' },
              { ok: !!profile.businessHistory?.establishmentYear, label: 'ประวัติ' },
              { ok: (((profile.suppliers || []).length) + ((profile.customers || []).length)) > 0, label: `คู่ค้า(${((profile.suppliers || []).length) + ((profile.customers || []).length)})` },
            ].map((item, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                  item.ok
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-muted/50 text-muted-foreground border border-border'
                }`}
              >
                {item.ok ? '✓' : '✗'} {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Customer Selection Bar */}
        <div className="px-6 py-3 border-b border-border bg-muted/10 flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">การดำเนินการ:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSaveAction('create')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                saveAction === 'create'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              สร้างลูกค้าใหม่
            </button>
            <button
              onClick={() => setSaveAction('link')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                saveAction === 'link'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              ผูกกับลูกค้าที่มีอยู่
            </button>
          </div>
          {saveAction === 'link' && (
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="w-[300px] h-9">
                <SelectValue placeholder="เลือกลูกค้า..." />
              </SelectTrigger>
              <SelectContent>
                {existingCustomers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.businessName} {customer.taxId ? `(${customer.taxId})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Tab sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-muted/20 overflow-x-auto md:overflow-y-auto shrink-0 scrollbar-hide">
            <nav className="p-2 flex md:flex-col gap-1 min-w-max md:min-w-0">
              {SECTIONS.map(({ key, label, icon: Icon }) => {
                const count = sectionCounts[key] || 0;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${
                      activeSection === key
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1 text-left">{label}</span>
                    {count > 0 && (
                      <span className={`shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold ${
                        activeSection === key
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeSection === 'companyInfo' && (
                  <CompanyInfoSection
                    data={profile.companyInfo}
                    onUpdate={updateCompanyInfo}
                  />
                )}
                {activeSection === 'shareholders' && (
                  <ShareholderSection 
                    data={profile.shareholders}
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, shareholders: newData }))}
                  />
                )}
                {activeSection === 'loanSummary' && (
                  <LoanSummarySection 
                    data={profile.loanSummary}
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, loanSummary: newData }))}
                  />
                )}
                {activeSection === 'financial' && (
                  <FinancialSection
                    statements={profile.financialStatements}
                    balanceSheets={profile.balanceSheets}
                    onUpdate={(statements, balanceSheets) => setProfile(prev => ({ 
                      ...prev, 
                      financialStatements: statements,
                      balanceSheets 
                    }))}
                  />
                )}
                {activeSection === 'vatRecords' && (
                  <VATSection 
                    data={profile.vatRecords} 
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, vatRecords: newData }))}
                  />
                )}
                {activeSection === 'creditBureau' && (
                  <CreditBureauSection 
                    data={profile.creditBureauReports}
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, creditBureauReports: newData }))}
                  />
                )}
                {activeSection === 'bankStatements' && (
                  <BankStatementSection 
                    data={profile.bankStatements}
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, bankStatements: newData }))}
                  />
                )}
                {activeSection === 'investment' && (
                  <InvestmentSection 
                    data={profile.investmentStructure}
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, investmentStructure: newData }))}
                  />
                )}
                {activeSection === 'collateral' && (
                  <CollateralSection 
                    data={profile.collaterals}
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, collaterals: newData }))}
                  />
                )}
                {activeSection === 'workingCapital' && (
                  <WorkingCapitalSection 
                    data={profile.workingCapital}
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, workingCapital: newData }))}
                  />
                )}
                {activeSection === 'revenueProjection' && (
                  <RevenueProjectionSection 
                    data={profile.revenueProjection}
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, revenueProjection: newData }))}
                  />
                )}
                {activeSection === 'dscr' && (
                  <DSCRSection 
                    data={profile.dscr}
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, dscr: newData }))}
                  />
                )}
                {activeSection === 'businessHistory' && (
                  <BusinessHistorySection 
                    data={profile.businessHistory}
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, businessHistory: newData }))}
                  />
                )}
                {activeSection === 'products' && (
                  <ProductSection 
                    suppliers={profile.suppliers} 
                    customers={profile.customers}
                    onUpdate={(suppliers, customers) => setProfile(prev => ({ ...prev, suppliers, customers }))}
                  />
                )}
                {activeSection === 'approvalComments' && (
                  <ApprovalCommentsSection 
                    data={profile.approvalComments}
                    onUpdate={(newData) => setProfile(prev => ({ ...prev, approvalComments: newData }))}
                  />
                )}
                {activeSection === 'recommendation' && (
                  <RecommendationSection
                    data={profile.recommendation}
                    onChange={(val) => setProfile(prev => ({ ...prev, recommendation: val }))}
                  />
                )}
                {activeSection === 'debug' && (
                  <div className="space-y-6">
                    {profile.enhancedData && (
                      <div>
                        <EnhancedDataViewer enhancedData={profile.enhancedData} />
                      </div>
                    )}
                    <div className="pt-6 border-t border-border">
                      <DebugDataViewer parsedData={profile} />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-warning bg-warning/10 px-4 py-2 rounded-xl border border-warning/20">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">กรุณาตรวจสอบข้อมูลทุกหมวดหมู่ให้ถูกต้องก่อนกดยืนยัน</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none h-11 px-6 font-medium"
              onClick={onCancel}
              disabled={isSaving}
            >
              ยกเลิก
            </Button>
            
            {onSaveDraft && (
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none h-11 px-6 font-medium bg-muted hover:bg-muted/80 text-foreground"
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    บันทึกแบบร่าง
                  </>
                )}
              </Button>
            )}

            <Button
              className="flex-1 sm:flex-none h-11 px-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  ยืนยันและบันทึกข้อมูล
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
