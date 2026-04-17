import React from 'react';
import { Table, Empty, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface Customer {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  contactPerson?: string;
  productService?: string;
  paymentTerms?: string;
  salesProportion?: number;
  contactDuration?: string;
  order: number;
}

interface CustomerListSectionProps {
  profileId: string;
  customers: Customer[];
  readonly?: boolean;
}

const CustomerListSection: React.FC<CustomerListSectionProps> = ({
  customers,
}) => {
  const columns: ColumnsType<Customer> = [
    {
      title: 'ลำดับ',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      align: 'center',
    },
    {
      title: 'ชื่อลูกค้า',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: 'สินค้า/บริการ',
      dataIndex: 'productService',
      key: 'productService',
      width: 200,
      render: (product?: string) => product || '-',
    },
    {
      title: 'สัดส่วนยอดขาย',
      dataIndex: 'salesProportion',
      key: 'salesProportion',
      width: 150,
      render: (proportion?: number) =>
        proportion ? (
          <Progress
            percent={proportion}
            size="small"
            format={(percent) => `${percent}%`}
          />
        ) : (
          '-'
        ),
    },
    {
      title: 'เงื่อนไขการชำระ',
      dataIndex: 'paymentTerms',
      key: 'paymentTerms',
      width: 150,
      render: (terms?: string) => terms || '-',
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

  if (!customers || customers.length === 0) {
    return (
      <Empty
        description="ไม่มีข้อมูลลูกค้า"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // Calculate total sales proportion
  const totalProportion = customers.reduce(
    (sum, cust) => sum + Number(cust.salesProportion || 0),
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
            <div style={{ color: '#666', fontSize: 12 }}>จำนวนลูกค้า</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {customers.length} ราย
            </div>
          </div>
          {totalProportion > 0 && (
            <div>
              <div style={{ color: '#666', fontSize: 12 }}>รวมสัดส่วนยอดขาย</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                {totalProportion.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={customers}
        rowKey="id"
        pagination={false}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export default CustomerListSection;
