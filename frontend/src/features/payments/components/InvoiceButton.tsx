import React from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface InvoiceButtonProps {
    scheduleId?: string;
    loanId?: string;
    installmentNo?: number;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
}

export const InvoiceButton: React.FC<InvoiceButtonProps> = ({
    scheduleId,
    loanId,
    installmentNo,
    variant = 'outline',
    size = 'sm',
    className,
}) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (scheduleId) {
            navigate(`/invoices/schedule/${scheduleId}`);
        } else if (loanId && installmentNo) {
            navigate(`/invoices/loan/${loanId}?installmentNo=${installmentNo}`);
        } else if (loanId) {
            // Navigate to first invoice or show list
            navigate(`/invoices/loan/${loanId}?installmentNo=1`);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            className={className}
            disabled={!scheduleId && !loanId}
        >
            <FileText className="w-4 h-4 mr-2" />
            ดูใบแจ้งหนี้
        </Button>
    );
};
