import React from 'react';
import { Table, Tag, Progress, Empty } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Shareholder {
  id: string;
  name: string;
  nationalId?: string;
  sharePercentage: number;
  shareValue: number;
  shareType: string;
  hasSigningAuthority: boolean;
  signingConditions?: string;
  position?: string;
  phone?: string;
  email?: string;
  address?: string;
  order: number;
}

interface ShareholderSectionProps {
  profileId: string;
  shareholders: Shareholder[];
  readonly?: boolean;
}

const ShareholderSection: React.FC<ShareholderSectionProps> = ({
  profileId,
  shareholders,
  readonly = false,
}) => {
  const columns: ColumnsType<Shareholder> = [
    {
      title: 'ลำดับ',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      align: 'center',
    },
    {
      title: 'ชื่อผู้ถือหุ้น',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: 'เลขบัตรประชาชน',
      dataIndex: 'nationalId',
      key: 'nationalId',
      width: 150,
    },
    {
      title: 'สัดส่วนหุ้น',
      dataIndex: 'sharePercentage',
      key: 'sharePercentage',
      width: 150,
      render: (percentage: number) => (
        <div>
          <Progress
            percent={percentage}
            size="small"
            format={(percent) => `${percent}%`}
          />
        </div>
      ),
    },
    {
      title: 'มูลค่าหุ้น (บาท)',
      dataIndex: 'shareValue',
      key: 'shareValue',
      width: 150,
      align: 'right',
      render: (value: number) => value.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
    {
      title: 'ประเภทหุ้น',
      dataIndex: 'shareType',
      key: 'shareType',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          ORDINARY: { text: 'สามัญ', color: 'blue' },
          PREFERRED: { text: 'บุริมสิทธิ', color: 'purple' },
        };
        const typeInfo = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      },
    },
    {
      title: 'อำนาจลงนาม',
      dataIndex: 'hasSigningAuthority',
      key: 'hasSigningAuthority',
      width: 120,
      align: 'center',
      render: (hasAuthority: boolean) =>
        hasAuthority ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            มี
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="default">
            ไม่มี
          </Tag>
        ),
    },
    {
      title: 'เงื่อนไขการลงนาม',
      dataIndex: 'signingConditions',
      key: 'signingConditions',
      ellipsis: true,
      render: (conditions?: string) => conditions || '-',
    },
    {
      title: 'ตำแหน่ง',
      dataIndex: 'position',
      key: 'position',
      width: 150,
      render: (position?: string) => position || '-',
    },
  ];

  if (!shareholders || shareholders.length === 0) {
    return (
      <Empty
        description="ไม่มีข้อมูลผู้ถือหุ้น"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // Calculate total share percentage
  const totalPercentage = shareholders.reduce(
    (sum, sh) => sum + Number(sh.sharePercentage),
    0
  );

  // Calculate total share value
  const totalValue = shareholders.reduce(
    (sum, sh) => sum + Number(sh.shareValue),
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
            <div style={{ color: '#666', fontSize: 12 }}>จำนวนผู้ถือหุ้น</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {shareholders.length} คน
            </div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: 12 }}>รวมสัดส่วนหุ้น</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {totalPercentage.toFixed(2)}%
            </div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: 12 }}>รวมมูลค่าหุ้น</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {totalValue.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              บาท
            </div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: 12 }}>มีอำนาจลงนาม</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {shareholders.filter((sh) => sh.hasSigningAuthority).length} คน
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={shareholders}
        rowKey="id"
        pagination={false}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export default ShareholderSection;
