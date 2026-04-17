import React from 'react';
import { Table, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface Executive {
  id: string;
  name: string;
  position: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  address?: string;
  order: number;
}

interface ExecutiveSectionProps {
  profileId: string;
  executives: Executive[];
  readonly?: boolean;
}

const ExecutiveSection: React.FC<ExecutiveSectionProps> = ({
  executives,
}) => {
  const columns: ColumnsType<Executive> = [
    {
      title: 'ลำดับ',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      align: 'center',
    },
    {
      title: 'ชื่อ-นามสกุล',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: 'ตำแหน่ง',
      dataIndex: 'position',
      key: 'position',
      width: 200,
    },
    {
      title: 'เลขบัตรประชาชน',
      dataIndex: 'nationalId',
      key: 'nationalId',
      width: 150,
      render: (id?: string) => id || '-',
    },
    {
      title: 'เบอร์โทรศัพท์',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (phone?: string) => phone || '-',
    },
    {
      title: 'อีเมล',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (email?: string) => email || '-',
    },
    {
      title: 'ที่อยู่',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (address?: string) => address || '-',
    },
  ];

  if (!executives || executives.length === 0) {
    return (
      <Empty
        description="ไม่มีข้อมูลผู้บริหาร"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={executives}
      rowKey="id"
      pagination={false}
      scroll={{ x: 1000 }}
    />
  );
};

export default ExecutiveSection;
