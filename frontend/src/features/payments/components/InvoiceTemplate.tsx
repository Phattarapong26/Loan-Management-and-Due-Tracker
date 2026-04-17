import React, { useRef } from 'react';
import { Printer, Clock, User, ArrowLeft, QrCode, Info } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useReactToPrint } from 'react-to-print';

interface InvoiceData {
    accountNo: string;
    loanType: string;
    installmentNo: number;
    totalInstallments: number;
    billingDate: string;
    dueDate: string;
    customer: {
        name: string;
        address: string;
        city: string;
        email: string;
        phone: string;
    };
    breakdown: {
        principal: number;
        interest: number;
        fees: number;
        total: number;
    };
    summary: {
        remainingBalance: number;
        interestRate: string;
        paidInstallments: number;
        overdueAmount: number;
    };
    loan: {
        id: string;
        startDate: string;
        maturityDate: string;
        monthlyPayment: number;
    };
    payment?: {
        status: string;
        paidAt?: string;
        paidAmount?: number;
    };
}

interface InvoiceTemplateProps {
    data: InvoiceData;
    onBack?: () => void;
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data, onBack }) => {
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Invoice-${data.accountNo}-${data.installmentNo}`,
    });

    const logoUrl = '/logo.png';

    return (
        <div className="min-h-screen bg-gray-50 text-[#333333] font-sans antialiased pb-12 print:bg-white print:pb-0">
            {/* CSS สำหรับการตั้งค่าพิมพ์และลายน้ำโลโก้ */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                @media print {
                    @page { size: A4; margin: 15mm; }
                    body { -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-shadow-none { box-shadow: none !important; border: 1px solid #eee !important; }
                    .print-border-simple { border: 1px solid #e5e7eb !important; }
                }
                .watermark-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    overflow: hidden;
                    z-index: 0;
                    opacity: 0.03;
                    user-select: none;
                }
                .watermark-item {
                    position: absolute;
                    width: 180px;
                    height: 180px;
                    transform: rotate(-30deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .watermark-item img {
                    width: 100%;
                    height: auto;
                    filter: grayscale(100%);
                }
            `,
                }}
            />

            {/* แถบนำทางด้านบน (ซ่อนตอนพิมพ์) */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 no-print">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            {onBack && (
                                <button
                                    onClick={onBack}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <ArrowLeft size={20} className="text-gray-600" />
                                </button>
                            )}
                            <h1 className="text-lg font-semibold text-gray-800">
                                ใบแจ้งยอดชำระเงินกู้ SME D Bank
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#00A950] hover:bg-[#008f44]"
                            >
                                <Printer size={18} />
                                <span>พิมพ์เอกสาร</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* เนื้อหาหลัก */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 print:mt-0 print:max-w-none">
                {/* คอนเทนเนอร์ใบแจ้งหนี้ */}
                <div
                    ref={componentRef}
                    className="relative bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100 print-shadow-none print-border-simple"
                >
                    {/* ลายน้ำแบบโลโก้ (Watermark Layer) */}
                    <div className="watermark-container">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="watermark-item"
                                style={{
                                    top: `${Math.floor(i / 2) * 40 + 5}%`,
                                    left: `${(i % 2) * 50 + 10}%`,
                                }}
                            >
                                <img src={logoUrl} alt="Watermark" />
                            </div>
                        ))}
                    </div>

                    <div className="relative z-10 p-8 sm:p-12 print:p-8">
                        {/* ส่วนหัวของเอกสาร */}
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 print:mb-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 flex items-center justify-center overflow-hidden bg-white rounded-lg">
                                        <img
                                            src={logoUrl}
                                            alt="SME D Bank Logo"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black tracking-tight text-[#00A950]">
                                            SME D{' '}
                                            <span className="text-gray-400 font-light">BANK</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-bold leading-tight max-w-[200px]">
                                            ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mt-4">
                                        ใบแจ้งยอดชำระค่างวด
                                    </h2>
                                    <p className="text-gray-500 font-medium text-lg">
                                        {data.loanType}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end text-right">
                                <div className="mb-4 text-xs font-bold tracking-[0.2em] uppercase text-gray-400">
                                    INVOICE
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-gray-500 font-medium">
                                        เลขที่บัญชีสินเชื่อ
                                    </p>
                                    <p className="text-xl font-bold text-[#00A950] tracking-widest">
                                        {data.accountNo}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* แถบข้อมูลสรุปแบบรวดเร็ว */}
                        <div className="grid grid-cols-3 gap-4 p-6 bg-[#F9FAFB]/80 backdrop-blur-sm rounded-2xl mb-12 border border-gray-100 print:bg-gray-50 print:mb-8">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                                    วันที่ออกเอกสาร
                                </p>
                                <p className="text-sm font-bold text-gray-800">
                                    {data.billingDate}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                                    กำหนดชำระภายใน
                                </p>
                                <p className="text-sm font-bold text-[#00A950] flex items-center gap-1.5">
                                    <Clock size={14} className="no-print text-[#00A950]/50" />
                                    {data.dueDate}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                                    ยอดเงินต้นคงเหลือ
                                </p>
                                <p className="text-sm font-bold text-gray-800">
                                    ฿
                                    {data.summary.remainingBalance.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* ส่วนข้อมูลรายละเอียด */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 print:gap-8 print:mb-8">
                            {/* คอลัมน์ข้อมูลลูกค้า */}
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2 text-[#00A950] mb-4 no-print">
                                        <User size={18} />
                                        <h3 className="text-xs font-bold uppercase tracking-widest">
                                            ข้อมูลผู้กู้
                                        </h3>
                                    </div>
                                    <p className="font-bold text-gray-900 text-lg leading-tight mb-2">
                                        {data.customer.name}
                                    </p>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {data.customer.address}
                                    </p>
                                    <p className="text-sm text-gray-600">{data.customer.city}</p>
                                    <p className="text-sm text-gray-600 mt-2">
                                        โทร: {data.customer.phone}
                                    </p>
                                    {data.customer.email && (
                                        <p className="text-sm text-gray-600">
                                            อีเมล: {data.customer.email}
                                        </p>
                                    )}
                                </div>
                                <div className="pt-6 border-t border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                        ช่องทางชำระเงิน
                                    </h3>
                                    <div className="flex items-start gap-4">
                                        <div className="bg-white border-2 border-dashed border-[#00A950]/20 rounded-xl p-3 text-center">
                                            <QrCode size={100} className="text-gray-800 mb-2" />
                                            <p className="text-[8px] font-black text-[#00A950] tracking-tighter uppercase">
                                                Thai QR Payment
                                            </p>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                                สแกน QR Code เพื่อชำระผ่าน Mobile Banking ทุกธนาคาร
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 bg-[#00A950] rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                                                    D
                                                </div>
                                                <p className="text-[11px] font-bold text-[#00A950]">
                                                    Call Center 1357
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* คอลัมน์รายละเอียดค่าใช้จ่าย */}
                            <div className="bg-[#F9FAFB]/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100 print:bg-white print:p-0 print:border-0">
                                <h3 className="text-sm font-bold text-[#00A950] mb-6 pb-2 border-b border-[#00A950]/10">
                                    รายละเอียดการเรียกเก็บ (งวดที่ {data.installmentNo}/
                                    {data.totalInstallments})
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">เงินต้น (Principal)</span>
                                        <span className="font-bold text-gray-900">
                                            ฿
                                            {data.breakdown.principal.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">
                                                ดอกเบี้ย (Interest)
                                            </span>
                                            <span className="text-[9px] bg-white border border-[#00A950]/20 px-1.5 py-0.5 rounded text-[#00A950] font-bold">
                                                {data.summary.interestRate}
                                            </span>
                                        </div>
                                        <span className="font-bold text-gray-900">
                                            ฿
                                            {data.breakdown.interest.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                    {data.breakdown.fees > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">
                                                ค่าธรรมเนียมอื่นๆ (Fees)
                                            </span>
                                            <span className="font-bold text-gray-900">
                                                ฿
                                                {data.breakdown.fees.toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pt-4 mt-4 border-t border-gray-200">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-900">
                                                ยอดชำระสุทธิ
                                            </span>
                                            <span className="text-2xl font-black text-[#00A950]">
                                                ฿
                                                {data.breakdown.total.toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Payment Status */}
                                    {data.payment && (
                                        <div className="pt-4 mt-4 border-t border-gray-200">
                                            <div className="bg-green-50 p-3 rounded-lg">
                                                <p className="text-xs font-bold text-green-700 mb-1">
                                                    สถานะ: ชำระแล้ว
                                                </p>
                                                <p className="text-xs text-green-600">
                                                    วันที่ชำระ: {data.payment.paidAt}
                                                </p>
                                                <p className="text-xs text-green-600">
                                                    จำนวนเงิน: ฿
                                                    {data.payment.paidAmount?.toLocaleString(
                                                        undefined,
                                                        {
                                                            minimumFractionDigits: 2,
                                                        }
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ส่วนหมายเหตุ */}
                        <div className="p-5 bg-[#e6f9ed]/70 backdrop-blur-sm rounded-xl border border-[#00A950]/10 mb-12 print:bg-white print:border-gray-200 print:mb-8">
                            <div className="flex gap-3">
                                <Info
                                    size={18}
                                    className="text-[#00A950] flex-shrink-0 mt-0.5 no-print"
                                />
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-[#00A950] print:text-gray-800">
                                        หมายเหตุสำคัญ:
                                    </p>
                                    <ul className="text-[10px] text-gray-600 space-y-1 list-disc ml-4 print:text-gray-500">
                                        <li>
                                            กรุณาชำระเงินภายในวันที่กำหนดเพื่อรักษาประวัติการเงินที่ดีของสถานประกอบการ
                                        </li>
                                        <li>
                                            เอกสารฉบับนี้จัดทำขึ้นเพื่อแจ้งยอดชำระเบื้องต้นเท่านั้น
                                        </li>
                                        <li>
                                            หากมีข้อสงสัยประการใด
                                            กรุณาติดต่อธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมฯ
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* ข้อมูลท้ายเอกสาร */}
                        <div className="pt-8 border-t border-gray-100 flex flex-row justify-between items-end">
                            <div className="max-w-[70%]">
                                <p className="text-[10px] font-bold text-[#00A950] uppercase tracking-widest mb-1">
                                    ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย
                                </p>
                                <p className="text-[9px] text-gray-400 leading-tight">
                                    อาคาร SME Bank Tower 310 ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท
                                    กรุงเทพฯ 10400
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-gray-400 mb-2 font-medium">
                                    พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}
                                </p>
                                <div className="text-lg font-black tracking-tight text-[#00A950]/10 select-none uppercase">
                                    SME D <span className="text-gray-200">BANK</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ข้อแนะนำการพิมพ์ */}
                <div className="mt-6 text-center no-print">
                    <p className="text-xs text-gray-400 italic">
                        SME D Bank - ธนาคารเพื่อเอสเอ็มอีไทย
                    </p>
                </div>
            </main>
        </div>
    );
};
