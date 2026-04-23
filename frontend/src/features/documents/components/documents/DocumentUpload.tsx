import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, FileText, Image, X, Loader, ScanLine, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { toast } from "sonner";
import { documentsApi, customersApi, businessProfilesApi, Customer } from "@/shared/lib/api-endpoints";
import { useAuth } from "@/shared/contexts/AuthContext";
import { DocumentReviewModal } from "./DocumentReviewModal";
import type { ParsedBusinessProfile } from "../../utils/parsers/excel-parser";
import { parseExcel } from "../../utils/parsers/excel-parser";
import { calculateConfidence } from "../../utils/parsers/helpers/excel-parser-confidence";
import { motion, AnimatePresence } from "framer-motion";
import { showUserFriendlyError } from "@/shared/utils/user-friendly-errors";

type UploadState = 'idle' | 'uploading' | 'parsing' | 'matching' | 'review' | 'done' | 'error';

const stageLabels: Record<UploadState, string> = {
  idle: '',
  uploading: 'กำลังอัพโหลดไฟล์...',
  parsing: 'กำลังอ่านข้อมูลจาก Excel...',
  matching: 'กำลัง Matching Schema กับ Business Profile...',
  review: 'รอการตรวจสอบ',
  done: 'ประมวลผลเสร็จสิ้น!',
  error: 'เกิดข้อผิดพลาด',
};

interface UploadedFile {
  file: File;
  progress: number;
  status: UploadState;
  documentId?: string;
  parsedData?: ParsedBusinessProfile;
  confidence?: { overall: number; missingFields: string[] };
  error?: string;
  startTime?: number;
  estimatedTimeRemaining?: number;
}

interface DocumentUploadProps {
  customerId?: string;
  officerId?: string;
  branchId?: string;
  officers?: Array<{ id: string; firstName: string; lastName: string }>;
  onUploadComplete?: (documentId: string) => void;
  onReviewRequest?: (documentId: string, parsedData: ParsedBusinessProfile) => void;
}

const ACCEPTED_FILE_TYPES = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentUpload({ customerId, officerId, branchId, officers = [], onUploadComplete, onReviewRequest }: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewingFile, setReviewingFile] = useState<UploadedFile | null>(null);
  const [existingCustomers, setExistingCustomers] = useState<Array<{ id: string; name: string; taxId?: string }>>([]);
  const [dragOver, setDragOver] = useState(false);
  const { user } = useAuth();

  // Fetch existing customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await customersApi.list({ limit: 1000 });
      if (data && !error) {
        setExistingCustomers(
          data.customers.map((c: Customer) => ({
            id: c.id,
            name: c.businessName || c.name || 'ไม่ระบุชื่อ',
            taxId: c.taxId,
          }))
        );
      } else if (error && error.status === 400) {
        // Handle case where no customers exist - set empty array
        setExistingCustomers([]);
      }
    };
    fetchCustomers();
  }, []);

  const simulateProgress = (from: number, to: number, duration: number, fileIndex: number): Promise<void> => {
    return new Promise(resolve => {
      const steps = 20;
      const stepDuration = duration / steps;
      let current = from;
      const increment = (to - from) / steps;

      const interval = setInterval(() => {
        current += increment;
        if (current >= to) {
          current = to;
          clearInterval(interval);
          resolve();
        }
        setFiles(prev => prev.map((f, idx) => {
          if (idx === fileIndex) {
            // Calculate estimated time remaining
            const elapsed = Date.now() - (f.startTime || Date.now());
            const progressPercent = current / 100;
            const estimatedTotal = progressPercent > 0 ? elapsed / progressPercent : 0;
            const estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
            
            return { 
              ...f, 
              progress: Math.round(current),
              estimatedTimeRemaining: estimatedTimeRemaining > 10000 ? estimatedTimeRemaining : undefined
            };
          }
          return f;
        }));
      }, stepDuration);
    });
  };

  const getDocumentType = (file: File): string => {
    // Auto-detect document type based on file name or default to excel for Excel files
    const fileName = file.name.toLowerCase();

    // Check if it's a loan application file (12 sheets)
    if (fileName.includes('สินเชื่อ') || fileName.includes('loan') || fileName.includes('application')) {
      return 'LOAN_APPLICATION';
    }

    // Check for other specific types
    if (fileName.includes('ภพ') || fileName.includes('vat') || fileName.includes('ภาษี')) {
      return 'TAX_DOC';
    }

    if (fileName.includes('งบการเงิน') || fileName.includes('financial')) {
      return 'FINANCIAL';
    }

    if (fileName.includes('statement') || fileName.includes('บัญชี')) {
      return 'BANK_STATEMENT';
    }

    if (fileName.includes('เครดิต') || fileName.includes('credit')) {
      return 'CREDIT_BUREAU';
    }

    // Default based on file type
    if (file.type.includes("spreadsheet") || file.type.includes("excel")) return 'FINANCIAL';
    if (file.type === "application/pdf") return 'OTHER';
    if (file.type.startsWith("image/")) return 'ID_CARD';

    return 'OTHER';
  };

  const processFile = useCallback(async (file: File, index: number) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setFiles(prev => prev.map((f, idx) =>
        idx === index ? { 
          ...f, 
          status: 'error', 
          error: '❌ ไฟล์ไม่ถูกต้อง\n\nกรุณาอัพโหลดไฟล์ Excel (.xlsx, .xls) หรือ CSV เท่านั้น\n\nไฟล์ที่รองรับ:\n• Microsoft Excel (.xlsx)\n• Excel 97-2003 (.xls)\n• CSV (.csv)' 
        } : f
      ));
      return;
    }

    try {
      // Stage 1: Uploading (0-30%)
      setFiles(prev => prev.map((f, idx) =>
        idx === index ? { ...f, status: 'uploading', progress: 0, startTime: Date.now() } : f
      ));
      await simulateProgress(0, 30, 800, index);

      // Stage 2: Parsing (30-60%)
      setFiles(prev => prev.map((f, idx) =>
        idx === index ? { ...f, status: 'parsing' } : f
      ));
      await simulateProgress(30, 60, 1200, index);

      // Parse Excel in browser
      const parsedData = await parseExcel(file);

      // Calculate confidence
      const confidence = calculateConfidence(parsedData);
      // console.log('[Document Upload] Confidence:', confidence);

      // Stage 3: Matching (60-90%)
      setFiles(prev => prev.map((f, idx) =>
        idx === index ? { ...f, status: 'matching', confidence } : f
      ));
      await simulateProgress(60, 90, 1200, index);

      const finalParsedData = parsedData;

      // Upload to backend (for storage only)
      const uploadFields: { documentType: string; customerId?: string; officerId?: string; branchId?: string } = {
        documentType: getDocumentType(file),
      };

      // Only include customerId if it's provided
      if (customerId) {
        uploadFields.customerId = customerId;
      }
      if (officerId) {
        uploadFields.officerId = officerId;
      }
      if (branchId) {
        uploadFields.branchId = branchId;
      }

      const { data: docData, error: uploadError } = await documentsApi.upload(
        file,
        uploadFields
      );

      if (uploadError || !docData) {
        throw new Error(uploadError?.message || "Upload failed");
      }

      // Save the parsed data to the backend immediately so it can be reviewed later from the list
      await documentsApi.saveParsedData(docData.id, finalParsedData);

      // Note: Backend will NOT auto-process the file
      // We already parsed it here in frontend
      // We'll save the parsed data after user reviews it

      const completedFile: UploadedFile = {
        file: file,
        progress: 100,
        status: 'review',
        documentId: docData.id,
        parsedData: finalParsedData,
        confidence
      };

      // Complete
      setFiles(prev => prev.map((f, idx) =>
        idx === index ? {
          ...f,
          status: 'done',
          progress: 100,
          documentId: docData.id,
          parsedData: finalParsedData,
          confidence
        } : f
      ));

      // Show review modal after a short delay
      setTimeout(() => {
        setFiles(prev => prev.map((f, idx) =>
          idx === index ? { ...f, status: 'review' } : f
        ));
        // console.log('[DocumentUpload] Opening review modal with completedFile:', completedFile);
        // console.log('[DocumentUpload] parsedData:', completedFile.parsedData);
        
        // If onReviewRequest callback is provided, use it instead of showing modal here
        if (onReviewRequest) {
          onReviewRequest(docData.id, finalParsedData);
        } else {
          setReviewingFile(completedFile);
        }
      }, 600);

      const confidenceLabel = confidence.overall >= 90 ? 'สูง' : confidence.overall >= 70 ? 'ปานกลาง' : 'ต่ำ';
      toast.success(`ดึงข้อมูลจาก ${file.name} สำเร็จ (ความมั่นใจ: ${confidenceLabel} ${confidence.overall}%)`);

    } catch (error) {
      console.error("Processing error:", error);
      
      // Determine specific error message
      let errorMessage = 'ไม่สามารถประมวลผลไฟล์ได้';
      
      if (error instanceof Error) {
        if (error.message.includes('text/html') || error.message.includes('MIME') || error.message.includes('not a valid JavaScript')) {
          // Dynamic import chunk failed to load (stale deployment / cache issue)
          errorMessage = '❌ เวอร์ชันแอปเก่า กรุณารีเฟรชหน้าเว็บ\n\nกด Ctrl+Shift+R (Windows) หรือ Cmd+Shift+R (Mac) แล้วลองอีกครั้ง';
          // Auto-suggest reload
          toast.error('กรุณารีเฟรชหน้าเว็บ (Ctrl+Shift+R) แล้วลองอีกครั้ง', { duration: 8000 });
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = '❌ เกิดข้อผิดพลาดในการเชื่อมต่อ\n\nไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้\n\nกรุณา:\n• ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต\n• ลองอัพโหลดอีกครั้ง';
        } else if (error.message.includes('parse') || error.message.includes('read')) {
          errorMessage = '❌ ไม่สามารถอ่านไฟล์ได้\n\nไฟล์อาจเสียหายหรือรูปแบบไม่ถูกต้อง\n\nกรุณา:\n• ตรวจสอบว่าไฟล์เปิดได้ใน Excel\n• ลองบันทึกไฟล์ใหม่แล้วอัพโหลดอีกครั้ง\n• ใช้ไฟล์ Excel รูปแบบ .xlsx';
        } else if (error.message.includes('size') || error.message.includes('large')) {
          errorMessage = '❌ ไฟล์มีขนาดใหญ่เกินไป\n\nขนาดไฟล์เกิน 10MB\n\nกรุณา:\n• ลดขนาดไฟล์โดยลบข้อมูลที่ไม่จำเป็น\n• บีบอัดไฟล์ก่อนอัพโหลด\n• แยกข้อมูลเป็นหลายไฟล์';
        } else {
          errorMessage = `❌ เกิดข้อผิดพลาด\n\n${error.message}\n\nกรุณาลองอีกครั้งหรือติดต่อผู้ดูแลระบบ`;
        }
      }
      
      setFiles(prev => prev.map((f, idx) =>
        idx === index ? {
          ...f,
          status: 'error',
          error: errorMessage,
        } : f
      ));
      toast.error(`ประมวลผล ${file.name} ล้มเหลว`);
    }
  }, [customerId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: "idle" as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    setDragOver(false);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
    onDropRejected: (rejectedFiles) => {
      setDragOver(false);
      rejectedFiles.forEach((rejection) => {
        if (rejection.errors[0]?.code === "file-too-large") {
          toast.error(`ไฟล์ ${rejection.file.name} มีขนาดใหญ่เกินไป (สูงสุด 10MB)`);
        } else {
          toast.error(`ไม่รองรับไฟล์ ${rejection.file.name}`);
        }
      });
    },
  });

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error("กรุณาเลือกไฟล์ก่อน");
      return;
    }

    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนอัพโหลดเอกสาร");
      return;
    }

    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'idle') {
        await processFile(files[i].file, i);
      }
    }

    setIsProcessing(false);
  };

  const handleReviewConfirm = async (
    editedData: ParsedBusinessProfile,
    action: 'create' | 'link',
    customerId?: string,
    officerIdFromModal?: string
  ) => {
    if (!reviewingFile?.documentId) return;

    try {
      let targetCustomerId = customerId;
      // Use officerId from modal (admin selected) or from props (passed from parent page)
      const effectiveOfficerId = officerIdFromModal || officerId;

      // If creating new customer, call customer creation API first
      if (action === 'create') {
        // Validate and fix the business profile data structure
        const validatedData = {
          ...editedData,
          companyInfo: {
            ...editedData.companyInfo,
            companyName: editedData.companyInfo?.companyName || 'ไม่ระบุชื่อบริษัท',
            registrationNumber: editedData.companyInfo?.registrationNumber || editedData.companyInfo?.taxId || '0000000000000',
            taxId: editedData.companyInfo?.taxId || editedData.companyInfo?.registrationNumber || '0000000000000',
            phone: editedData.companyInfo?.phone || editedData.companyInfo?.phoneNumber || '-',
            phoneNumber: editedData.companyInfo?.phoneNumber || editedData.companyInfo?.phone || '-',
            address: editedData.companyInfo?.address || 'ไม่ระบุที่อยู่',
          }
        };

        const { data: newCustomer, error: customerError } = await customersApi.createFromDocument({
          documentId: reviewingFile.documentId,
          businessProfile: validatedData,
          ...(effectiveOfficerId && { officerId: effectiveOfficerId }),
          ...(branchId && { branchId }),
        });

        if (customerError || !newCustomer) {
          const steps = Array.isArray(customerError?.nextSteps) ? customerError!.nextSteps : [];
          toast.error(customerError?.message || 'ไม่สามารถสร้างลูกค้าได้', {
            description: steps.length ? steps.map((s) => `• ${s}`).join('\n') : undefined,
          });
          return;
        }

        targetCustomerId = newCustomer.id;
        toast.success(`สร้างลูกค้าใหม่สำเร็จ: ${validatedData.companyInfo.companyName}`);
      } else if (action === 'link' && customerId) {
        // Link document to existing customer
        const { error: linkError } = await documentsApi.linkToCustomer(
          reviewingFile.documentId,
          customerId,
          editedData
        );

        if (linkError) {
          throw new Error(linkError.message);
        }

        toast.success("ผูกเอกสารกับลูกค้าสำเร็จ");
      }

      // Save business profile to new database tables
      if (targetCustomerId) {
        const { data: profileData, error: profileError } = await businessProfilesApi.create({
          customerId: targetCustomerId,
          parsedData: editedData,
          documentId: reviewingFile.documentId,
          action,
          existingCustomerId: action === 'link' ? customerId : undefined,
        });

        if (profileError || !profileData?.success) {
          console.error('[DocumentUpload] Business profile save error:', profileError);
          // Don't throw - customer is already created, just log the error
          toast.warning("บันทึกข้อมูลลูกค้าสำเร็จ แต่ไม่สามารถบันทึก Business Profile ได้");
        } else {
          // console.log('[DocumentUpload] Business profile saved:', profileData.data);
        }
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.documentId === reviewingFile.documentId
            ? { ...f, status: "done", parsedData: editedData }
            : f
        )
      );

      setReviewingFile(null);
      onUploadComplete?.(reviewingFile.documentId);
    } catch (error) {
      console.error("Save error:", error);
      
      // Show user-friendly error dialog
      showUserFriendlyError(error);
    }
  };

  const handleReviewCancel = () => {
    setReviewingFile(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const retryFile = async (index: number) => {
    const file = files[index];
    if (!file) return;
    
    // Reset file status to idle
    setFiles(prev => prev.map((f, idx) =>
      idx === index ? { ...f, status: 'idle', error: undefined, progress: 0 } : f
    ));
    
    // Process the file again
    await processFile(file.file, index);
  };

  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
      return `ประมาณ ${seconds} วินาที`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `ประมาณ ${minutes} นาที`;
  };

  const reset = () => {
    setFiles([]);
    setReviewingFile(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            อัพโหลดเอกสาร
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show upload zone or progress */}
          <AnimatePresence mode="wait">
            {files.length === 0 || files.every(f => f.status === 'done' || f.status === 'error') ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                    }`}
                >
                  <input {...getInputProps()} />
                  <motion.div
                    animate={dragOver ? { scale: 1.05 } : { scale: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    {dragOver ? (
                      <p className="text-primary font-medium">วางไฟล์ที่นี่...</p>
                    ) : (
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          รองรับไฟล์ Excel (.xlsx, .xls) สูงสุด 10MB
                        </p>
                      </div>
                    )}
                    <Button variant="outline" className="mt-2">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      เลือกไฟล์ Excel
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card rounded-xl border border-border p-8"
              >
                {files.map((uploadedFile, index) => {
                  if (uploadedFile.status === 'idle') return null;

                  return (
                    <div key={index} className="flex flex-col items-center gap-6">
                      {/* File info */}
                      <div className="flex items-center gap-3 bg-muted rounded-lg px-4 py-2.5 w-full">
                        <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-sm font-medium truncate flex-1">{uploadedFile.file.name}</span>
                        {uploadedFile.status === 'error' && (
                          <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Progress animation */}
                      <div className="w-full space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            {uploadedFile.status === 'done' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : uploadedFile.status === 'error' ? (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            ) : (
                              <Loader className="w-4 h-4 animate-spin text-primary" />
                            )}
                            {stageLabels[uploadedFile.status]}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{uploadedFile.progress}%</span>
                            {uploadedFile.estimatedTimeRemaining && uploadedFile.estimatedTimeRemaining > 10000 && (
                              <span className="text-xs text-muted-foreground">
                                • {formatTimeRemaining(uploadedFile.estimatedTimeRemaining)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${uploadedFile.status === 'error' ? 'bg-red-600' :
                                uploadedFile.status === 'done' ? 'bg-green-600' : 'bg-primary'
                              }`}
                            animate={{ width: `${uploadedFile.progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>

                      {/* Stage indicators */}
                      {uploadedFile.status !== 'error' && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {['อัพโหลด', 'อ่านข้อมูล', 'Matching', 'เสร็จสิ้น'].map((label, i) => {
                            const stageProgress = [0, 30, 60, 100];
                            const isActive = uploadedFile.progress >= stageProgress[i];
                            return (
                              <div key={label} className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary' : 'bg-border'}`} />
                                <span className={isActive ? 'text-foreground font-medium' : ''}>
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Scanning animation */}
                      {(uploadedFile.status === 'parsing' || uploadedFile.status === 'matching') && (
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="flex items-center gap-2 text-sm text-primary"
                        >
                          <ScanLine className="w-5 h-5" />
                          <span>กำลังวิเคราะห์ข้อมูล...</span>
                        </motion.div>
                      )}

                      {/* Error state */}
                      {uploadedFile.status === 'error' && (
                        <div className="text-center space-y-3 w-full">
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800 whitespace-pre-line text-left">{uploadedFile.error}</p>
                          </div>
                          <div className="flex gap-2 justify-center">
                            <Button 
                              variant="outline" 
                              onClick={() => retryFile(index)}
                              className="flex items-center gap-2"
                            >
                              <Upload className="w-4 h-4" />
                              ลองอัพโหลดอีกครั้ง
                            </Button>
                            <Button 
                              variant="ghost" 
                              onClick={() => removeFile(index)}
                              className="flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              ลบไฟล์
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload button */}
          {files.some((f) => f.status === "idle") && (
            <Button
              onClick={uploadFiles}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  กำลังประมวลผล...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  เริ่มประมวลผล {files.filter((f) => f.status === "idle").length} ไฟล์
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Review Modal - Only render if onReviewRequest is NOT provided */}
      {/* When onReviewRequest is provided, the parent component handles the modal */}
      <AnimatePresence>
        {!onReviewRequest && reviewingFile && reviewingFile.parsedData && reviewingFile.documentId && (
          <DocumentReviewModal
            documentId={reviewingFile.documentId}
            parsedData={reviewingFile.parsedData}
            onConfirm={handleReviewConfirm}
            onCancel={handleReviewCancel}
            existingCustomers={existingCustomers}
            officers={officers}
            isAdmin={user?.role === 'admin'}
          />
        )}
      </AnimatePresence>
    </>
  );
}
