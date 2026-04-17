import React from 'react';
import { Table, Tag, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface Collateral {
  id: string;
  collateralType: string;
  description: string;
  location?: string;
  estimatedValue: number;
  appraisedValue?: number;
  appraisedBy?: string;
  appraisedDate?: string;
  ownerName?: string;
  ownerRelationship?: string;
  order: number;
}

interface CollateralSectionProps {
  profileId: string;
  collaterals: Collateral[];
  readonly?: boolean;
}

const CollateralSection: React.FC<CollateralSectionProps> = ({
  collaterals,
}) => {
  const columns: ColumnsType<Collateral> = [
    {
      title: 'ลำดับ',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      align: 'center',
    },
    {
      title: 'ประเภท',
      dataIndex: 'collateralType',
      key: 'collateralType',
      width: 150,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          LAND: { text: 'ที่ดิน', color: 'green' },
          BUILDING: { text: 'อาคาร', color: 'blue' },
          VEHICLE: { text: 'ยานพาหนะ', color: 'orange' },
          EQUIPMENT: { text: 'เครื่องจักร', color: 'purple' },
          INVENTORY: { text: 'สินค้าคงคลัง', color: 'cyan' },
          RECEIVABLES: { text: 'ลูกหนี้', color: 'magenta' },
          DEPOSIT: { text: 'เงินฝาก', color: 'gold' },
          OTHER: { text: 'อื่นๆ', color: 'default' },
        };
        const typeInfo = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      },
    },
    {
      title: 'รายละเอียด',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => <strong>{desc}</strong>,
    },
    {
      title: 'ที่ตั้ง',
      dataIndex: 'location',
      key: 'location',
      ellipsis: true,
      render: (location?: string) => location || '-',
    },
    {
      title: 'มูลค่าประเมิน (บาท)',
      dataIndex: 'estimatedValue',
      key: 'estimatedValue',
      width: 150,
      align: 'right',
      render: (value: number) => value.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
    {
      title: 'มูลค่าประเมินจริง (บาท)',
      dataIndex: 'appraisedValue',
      key: 'appraisedValue',
      width: 150,
      align: 'right',
      render: (value?: number) =>
        value
          ? value.toLocaleString('th-TH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '-',
    },
    {
      title: 'เจ้าของ',
      dataIndex: 'ownerName',
      key: 'ownerName',
      width: 150,
      render: (name?: string) => name || '-',
    },
    {
      title: 'ความสัมพันธ์',
      dataIndex: 'ownerRelationship',
      key: 'ownerRelationship',
      width: 120,
      render: (rel?: string) => rel || '-',
    },
  ];

  if (!collaterals || collaterals.length === 0) {
    return (
      <Empty
        description="ไม่มีข้อมูลหลักประกัน"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // Calculate totals
  const totalEstimated = collaterals.reduce(
    (sum, col) => sum + Number(col.estimatedValue),
    0
  );
  const totalAppraised = collaterals.reduce(
    (sum, col) => sum + Number(col.appraisedValue || 0),
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
            <div style={{ color: '#666', fontSize: 12 }}>จำนวนหลักประกัน</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {collaterals.length} รายการ
            </div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: 12 }}>มูลค่าประเมินรวม</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {totalEstimated.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              บาท
            </div>
          </div>
          {totalAppraised > 0 && (
            <div>
              <div style={{ color: '#666', fontSize: 12 }}>มูลค่าประเมินจริงรวม</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                {totalAppraised.toLocaleString('th-TH', {
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
        dataSource={collaterals}
        rowKey="id"
        pagination={false}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export default CollateralSection;
