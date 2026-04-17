export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatCompactNumber = (number: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
};

export const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Bangkok'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString;
  }
};

export const exportToCSV = (loans: any[], loanStatusFilter: string) => {
  try {
    const headers = [
      'เลขที่สัญญา',
      'ลูกค้า',
      'จำนวนเงินกู้',
      'ยอดคงเหลือ',
      'อัตราดอกเบี้ย',
      'ระยะเวลา (เดือน)',
      'งวดถัดไป',
      'วันครบกำหนด',
      'สถานะ',
      'วันที่เบิกจ่าย',
      'เกินกำหนด (วัน)'
    ];

    const statusLabels: Record<string, string> = {
      active: 'ปกติ',
      overdue: 'เกินกำหนด',
      npl: 'NPL'
    };

    const csvData = loans.map(loan => [
      loan.contractNumber || loan.id,
      loan.customerName,
      loan.amount,
      loan.outstandingBalance,
      `${loan.interestRate}%`,
      loan.duration,
      loan.nextPaymentAmount || 0,
      loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : '-',
      statusLabels[loan.status] || loan.status,
      loan.disbursementDate ? formatDate(loan.disbursementDate) : '-',
      loan.overdueDays
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);

    const dateStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');

    const statusLabel = loanStatusFilter === 'active' ? 'มีหนี้' :
      loanStatusFilter === 'closed' ? 'ปิดยอด' : 'ทั้งหมด';

    link.setAttribute('download', `รายการสัญญา_${statusLabel}_${dateStr}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { success: true, count: loans.length };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error };
  }
};
