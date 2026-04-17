import React from 'react';
import { Table, Tag, Empty, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface LoanRequest {
  id: string;
  loanType: string;
  productName: string;
  requestedAmount: number;
  purpose?: string;
  termMonths?: number;
  proposedInterestRate?: string;
  interestCalculation?: string;
  collateralDescription?: string;
  collateralValue?: number;
  requestType: string;
  status: string;
  order: number;
}

interface LoanRequestSectionProps {
  profileId: string;
  loanRequests: LoanRequest[];
  readonly?: boolean;
}

const LoanRequestSection: React.FC<LoanRequestSectionProps> = ({
  loanRequests,
}) => {
  const columns: ColumnsType<LoanRequest> = [
    {
      title: 'ลำดับ',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      align: 'center',
    },
    {
      title: 'ประเภท',
      dataIndex: 'requestType',
      key: 'requestType',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'EXISTING' ? 'blue' : 'green'}>
          {type === 'EXISTING' ? 'เดิม' : 'ใหม่'}
        </Tag>
      ),
    },
    {
      title: 'ผลิตภัณฑ์',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: 'วงเงินที่ขอ (บาท)',
      dataIndex: 'requestedAmount',
      key: 'requestedAmount',
      width: 150,
      align: 'right',
      render: (amount: number) => amount.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
    {
      title: 'ระยะเวลา (เดือน)',
      dataIndex: 'termMonths',
      key: 'termMonths',
      width: 120,
      align: 'center',
      render: (months?: number) => months || '-',
    },
    {
      title: 'อัตราดอกเบี้ย',
      dataIndex: 'proposedInterestRate',
      key: 'proposedInterestRate',
      width: 120,
      render: (rate?: string) => rate || '-',
    },
    {
      title: 'หลักประกัน',
      dataIndex: 'collateralDescription',
      key: 'collateralDescription',
      ellipsis: true,
      render: (desc?: string) => desc || '-',
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          PENDING: { text: 'รอดำเนินการ', color: 'warning' },
          ACTIVE: { text: 'ใช้งาน', color: 'success' },
          APPROVED: { text: 'อนุมัติ', color: 'success' },
          REJECTED: { text: 'ปฏิเสธ', color: 'error' },
          CLOSED: { text: 'ปิด', color: 'default' },
        };
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
  ];

  if (!loanRequests || loanRequests.length === 0) {
    return (
      <Empty
        description="ไม่มีข้อมูลวงเงินที่ขอ"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // Separate existing and new loans
  const existingLoans = loanRequests.filter((loan) => loan.requestType === 'EXISTING');
  const newLoans = loanRequests.filter((loan) => loan.requestType === 'NEW');

  // Calculate totals
  const totalExisting = existingLoans.reduce(
    (sum, loan) => sum + Number(loan.requestedAmount),
    0
  );
  const totalNew = newLoans.reduce(
    (sum, loan) => sum + Number(loan.requestedAmount),
    0
  );
  const totalAll = totalExisting + totalNew;

  return (
    <div>
      {/* Summary */}
      <div
        style={{
          marginBottom: 16,
          padding: 16,
          background: '#f5f5f5',
          borderRadius: 4,
        }}
      >
        <div style={{ display: 'flex', gap: 32 }}>
          <div>
            <div style={{ color: '#666', fontSize: 12 }}>วงเงินเดิม</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
              {totalExisting.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              บาท
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>
              ({existingLoans.length} รายการ)
            </div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: 12 }}>วงเงินใหม่</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {totalNew.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              บาท
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>
              ({newLoans.length} รายการ)
            </div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: 12 }}>รวมทั้งหมด</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {totalAll.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              บาท
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>
              ({loanRequests.length} รายการ)
            </div>
          </div>
        </div>
      </div>

      {/* Existing Loans */}
      {existingLoans.length > 0 && (
        <>
          <h3>วงเงินเดิม ({existingLoans.length} รายการ)</h3>
          <Table
            columns={columns}
            dataSource={existingLoans}
            rowKey="id"
            pagination={false}
            scroll={{ x: 1200 }}
          />
          <Divider />
        </>
      )}

      {/* New Loans */}
      {newLoans.length > 0 && (
        <>
          <h3>วงเงินใหม่ ({newLoans.length} รายการ)</h3>
          <Table
            columns={columns}
            dataSource={newLoans}
            rowKey="id"
            pagination={false}
            scroll={{ x: 1200 }}
          />
        </>
      )}
    </div>
  );
};

export default LoanRequestSection;
