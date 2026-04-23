import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { apiClient } from '@/shared/lib/api-client';
import { Loader } from 'lucide-react';

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

export const InvoicePage: React.FC = () => {
    const { loanId, scheduleId } = useParams<{ loanId?: string; scheduleId?: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                setLoading(true);
                setError(null);

                let response;

                // Fetch by payment schedule ID (public or authenticated)
                if (scheduleId) {
                    // Use public endpoint for direct access (from LINE)
                    response = await apiClient.get(`/invoices/public/${scheduleId}`);
                }
                // Fetch by loan ID and installment number
                else if (loanId) {
                    const installmentNo = searchParams.get('installmentNo');
                    if (!installmentNo) {
                        throw new Error('Installment number is required');
                    }
                    response = await apiClient.get(
                        `/invoices/loan/${loanId}/installment?installmentNo=${installmentNo}`
                    );
                } else {
                    throw new Error('Invalid invoice parameters');
                }

                // apiClient returns { data, error } format
                if (response.error) {
                    throw new Error(response.error.message);
                }

                if (response.data) {
                    setInvoiceData(response.data);
                } else {
                    throw new Error('ไม่พบข้อมูลใบแจ้งหนี้');
                }
            } catch (err: any) {
                console.error('Error fetching invoice:', err);
                setError(err.message || 'Failed to load invoice');
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, [loanId, scheduleId, searchParams]);

    const handleBack = () => {
        // Check if we can go back in history
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            // If opened directly from LINE, just hide the back button
            window.close();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 animate-spin text-[#00A950] mx-auto mb-4" />
                    <p className="text-gray-600">กำลังโหลดใบแจ้งหนี้...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={handleBack}
                        className="px-6 py-2 bg-[#00A950] text-white rounded-lg hover:bg-[#008f44]"
                    >
                        กลับ
                    </button>
                </div>
            </div>
        );
    }

    if (!invoiceData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">ไม่พบข้อมูลใบแจ้งหนี้</p>
                    <button
                        onClick={handleBack}
                        className="mt-4 px-6 py-2 bg-[#00A950] text-white rounded-lg hover:bg-[#008f44]"
                    >
                        กลับ
                    </button>
                </div>
            </div>
        );
    }

    return <InvoiceTemplate data={invoiceData} onBack={handleBack} />;
};
