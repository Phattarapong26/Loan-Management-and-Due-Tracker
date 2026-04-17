import React from 'react';
import { Table, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface Supplier {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  contactPerson?: string;
  productType?: string;
  paymentTerms?: string;
  creditLimit?: number;
  contactDuration?: string;
  order: number;
}

interface SupplierSectionProps {
  profileId: string;
  suppliers: Supplier[];
  readonly?: boolean;
}

const SupplierSection: React.FC<SupplierSectionProps> = ({
  suppliers,
}) => {
  const columns: ColumnsType<Supplier> = [
    {
      title: 'ลำดับ',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      align: 'center',
    },
    {
      title: 'ชื่อผู้ขาย',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: 'ประเภทสินค้า',
      dataIndex: 'productType',
      key: 'productType',
      width: 150,
      render: (type?: string) => type || '-',
    },
    {
      title: 'เงื่อนไขการชำระ',
      dataIndex: 'paymentTerms',
      key: 'paymentTerms',
      width: 150,
      render: (terms?: string) => terms || '-',
    },
    {
      title: 'วงเงินเครดิต (บาท)',
      dataIndex: 'creditLimit',
      key: 'creditLimit',
      width: 150,
      align: 'right',
      render: (limit?: number) =>
        limit
          ? limit.toLocaleString('th-TH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '-',
    },
    {
      title: 'ระยะเวลาติดต่อ',
      dataIndex: 'contactDuration',
      key: 'contactDuration',
      width: 150,
      render: (duration?: string) => duration || '-',
    },
    {
      title: 'เบอร์โทรศัพท์',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (phone?: string) => phone || '-',
    },
    {
      title: 'ที่อยู่',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (address?: string) => address || '-',
    },
  ];

  if (!suppliers || suppliers.length === 0) {
    return (
      <Empty
        description="ไม่มีข้อมูลผู้ขาย"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // Calculate total credit limit
  const totalCreditLimit = suppliers.reduce(
    (sum, sup) => sum + Number(sup.creditLimit || 0),
    0
  );

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
            <div style={{ color: '#666', fontSize: 12 }}>จำนวนผู้ขาย</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {suppliers.length} ราย
            </div>
          </div>
          {totalCreditLimit > 0 && (
            <div>
              <div style={{ color: '#666', fontSize: 12 }}>รวมวงเงินเครดิต</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                {totalCreditLimit.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                บาท
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={suppliers}
        rowKey="id"
        pagination={false}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export default SupplierSection;
