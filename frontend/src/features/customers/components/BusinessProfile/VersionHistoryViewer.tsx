import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Spin, Alert, Modal } from 'antd';
import { ArrowLeftOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

interface VersionHistoryViewerProps {
  customerId: string;
  onBack: () => void;
  onSelectVersion: (versionId: string) => void;
}

interface ProfileVersion {
  id: string;
  version: number;
  status: string;
  reviewStatus: string;
  matchConfidence: number;
  sourceFileName: string;
  isLatest: boolean;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

const VersionHistoryViewer: React.FC<VersionHistoryViewerProps> = ({
  customerId,
  onBack,
  onSelectVersion,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<ProfileVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ProfileVersion | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [customerId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/business-profiles/${customerId}/versions`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch versions');
      }

      setVersions(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      SUBMITTED: 'processing',
      APPROVED: 'success',
      REJECTED: 'error',
      ARCHIVED: 'default',
    };
    return colors[status] || 'default';
  };

  const getReviewStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'warning',
      IN_REVIEW: 'processing',
      APPROVED: 'success',
      REJECTED: 'error',
      NEEDS_REVISION: 'warning',
    };
    return colors[status] || 'default';
  };

  const columns: ColumnsType<ProfileVersion> = [
    {
      title: 'เวอร์ชัน',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (version: number, record: ProfileVersion) => (
        <Space>
          <strong>v{version}</strong>
          {record.isLatest && (
            <Tag color="blue" icon={<CheckCircleOutlined />}>
              ล่าสุด
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'สถานะการตรวจสอบ',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 150,
      render: (status: string) => (
        <Tag color={getReviewStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'ไฟล์ต้นฉบับ',
      dataIndex: 'sourceFileName',
      key: 'sourceFileName',
      ellipsis: true,
    },
    {
      title: 'ความมั่นใจ',
      dataIndex: 'matchConfidence',
      key: 'matchConfidence',
      width: 120,
      render: (confidence: number) => `${(confidence * 100).toFixed(1)}%`,
    },
    {
      title: 'วันที่สร้าง',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'การดำเนินการ',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: any, record: ProfileVersion) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedVersion(record);
              setShowDetails(true);
            }}
          >
            ดูรายละเอียด
          </Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>กำลังโหลดประวัติเวอร์ชัน...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        message="เกิดข้อผิดพลาด"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchVersions}>
            ลองอีกครั้ง
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
            >
              กลับ
            </Button>
            <span>ประวัติเวอร์ชัน Business Profile</span>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={versions}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `ทั้งหมด ${total} เวอร์ชัน`,
          }}
        />
      </Card>

      {/* Version Details Modal */}
      <Modal
        title={`รายละเอียดเวอร์ชัน ${selectedVersion?.version}`}
        open={showDetails}
        onCancel={() => setShowDetails(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setShowDetails(false)}>
            ปิด
          </Button>,
          <Button
            key="view"
            type="primary"
            onClick={() => {
              if (selectedVersion) {
                onSelectVersion(selectedVersion.id);
                setShowDetails(false);
              }
            }}
          >
            ดูเวอร์ชันนี้
          </Button>,
        ]}
      >
        {selectedVersion && (
          <div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <strong>เวอร์ชัน:</strong> v{selectedVersion.version}
                {selectedVersion.isLatest && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    ล่าสุด
                  </Tag>
                )}
              </div>

              <div>
                <strong>สถานะ:</strong>{' '}
                <Tag color={getStatusColor(selectedVersion.status)}>
                  {selectedVersion.status}
                </Tag>
              </div>

              <div>
                <strong>สถานะการตรวจสอบ:</strong>{' '}
                <Tag color={getReviewStatusColor(selectedVersion.reviewStatus)}>
                  {selectedVersion.reviewStatus}
                </Tag>
              </div>

              <div>
                <strong>ไฟล์ต้นฉบับ:</strong> {selectedVersion.sourceFileName}
              </div>

              <div>
                <strong>ความมั่นใจ:</strong>{' '}
                {(selectedVersion.matchConfidence * 100).toFixed(1)}%
              </div>

              <div>
                <strong>วันที่สร้าง:</strong>{' '}
                {dayjs(selectedVersion.createdAt).format('DD/MM/YYYY HH:mm')}
              </div>

              <div>
                <strong>วันที่อัพเดท:</strong>{' '}
                {dayjs(selectedVersion.updatedAt).format('DD/MM/YYYY HH:mm')}
              </div>

              {selectedVersion.reviewedBy && (
                <>
                  <div>
                    <strong>ตรวจสอบโดย:</strong> {selectedVersion.reviewedBy}
                  </div>

                  {selectedVersion.reviewedAt && (
                    <div>
                      <strong>วันที่ตรวจสอบ:</strong>{' '}
                      {dayjs(selectedVersion.reviewedAt).format('DD/MM/YYYY HH:mm')}
                    </div>
                  )}

                  {selectedVersion.reviewNotes && (
                    <div>
                      <strong>หมายเหตุ:</strong>
                      <div
                        style={{
                          marginTop: 8,
                          padding: 12,
                          background: '#f5f5f5',
                          borderRadius: 4,
                        }}
                      >
                        {selectedVersion.reviewNotes}
                      </div>
                    </div>
                  )}
                </>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VersionHistoryViewer;
