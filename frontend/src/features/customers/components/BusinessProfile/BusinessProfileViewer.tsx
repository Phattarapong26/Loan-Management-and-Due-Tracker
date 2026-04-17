import React, { useState, useEffect } from 'react';
import { Card, Tabs, Spin, Alert, Button, Tag, Space, Statistic, Row, Col } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  DollarOutlined,
  SafetyOutlined,
  ShopOutlined,
  ShoppingOutlined,
  LineChartOutlined,
  CommentOutlined,
  HistoryOutlined,
  EditOutlined,
} from '@ant-design/icons';
import ShareholderSection from './sections/ShareholderSection';
import ExecutiveSection from './sections/ExecutiveSection';
import LoanRequestSection from './sections/LoanRequestSection';
import CollateralSection from './sections/CollateralSection';
import SupplierSection from './sections/SupplierSection';
import CustomerListSection from './sections/CustomerListSection';
import DSCRAnalysisSection from './sections/DSCRAnalysisSection';
import ApprovalCommentsSection from './sections/ApprovalCommentsSection';
import VersionHistoryViewer from './VersionHistoryViewer';

const { TabPane } = Tabs;

interface BusinessProfileViewerProps {
  customerId: string;
  onEdit?: () => void;
}

interface ProfileData {
  id: string;
  customerId: string;
  sourceFileName: string;
  matchConfidence: number;
  status: string;
  reviewStatus: string;
  version: number;
  isLatest: boolean;
  createdAt: string;
  updatedAt: string;
  shareholders: any[];
  loanRequests: any[];
  collaterals: any[];
  executives: any[];
  suppliers: any[];
  customers: any[];
  dscrAnalysis: any[];
  approvalComments: any[];
}

const BusinessProfileViewer: React.FC<BusinessProfileViewerProps> = ({
  customerId,
  onEdit,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('shareholders');

  useEffect(() => {
    fetchProfile();
  }, [customerId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/business-profiles/${customerId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch business profile');
      }

      setProfile(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
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

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>กำลังโหลดข้อมูล Business Profile...</p>
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
          <Button size="small" onClick={fetchProfile}>
            ลองอีกครั้ง
          </Button>
        }
      />
    );
  }

  if (!profile) {
    return (
      <Alert
        message="ไม่พบข้อมูล"
        description="ยังไม่มีข้อมูล Business Profile สำหรับลูกค้านี้"
        type="info"
        showIcon
      />
    );
  }

  if (showHistory) {
    return (
      <VersionHistoryViewer
        customerId={customerId}
        onBack={() => setShowHistory(false)}
        onSelectVersion={(version) => {
          setShowHistory(false);
          fetchProfile();
        }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size="small">
              <Space>
                <h2 style={{ margin: 0 }}>Business Profile</h2>
                <Tag color={getStatusColor(profile.status)}>{profile.status}</Tag>
                <Tag color={getReviewStatusColor(profile.reviewStatus)}>
                  {profile.reviewStatus}
                </Tag>
              </Space>
              <Space size="large">
                <span>
                  <strong>เวอร์ชัน:</strong> {profile.version}
                </span>
                <span>
                  <strong>ไฟล์:</strong> {profile.sourceFileName}
                </span>
                <span>
                  <strong>ความมั่นใจ:</strong> {(profile.matchConfidence * 100).toFixed(1)}%
                </span>
              </Space>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<HistoryOutlined />}
                onClick={() => setShowHistory(true)}
              >
                ประวัติเวอร์ชัน
              </Button>
              {onEdit && (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={onEdit}
                >
                  แก้ไข
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* Statistics */}
        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col span={4}>
            <Statistic
              title="ผู้ถือหุ้น"
              value={profile.shareholders.length}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="วงเงินที่ขอ"
              value={profile.loanRequests.length}
              prefix={<DollarOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="หลักประกัน"
              value={profile.collaterals.length}
              prefix={<SafetyOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="ผู้ขาย"
              value={profile.suppliers.length}
              prefix={<ShopOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="ลูกค้า"
              value={profile.customers.length}
              prefix={<ShoppingOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="DSCR"
              value={profile.dscrAnalysis[0]?.dscrRatio || 0}
              precision={2}
              prefix={<LineChartOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <TeamOutlined />
                ผู้ถือหุ้น ({profile.shareholders.length})
              </span>
            }
            key="shareholders"
          >
            <ShareholderSection
              profileId={profile.id}
              shareholders={profile.shareholders}
              readonly
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <UserOutlined />
                ผู้บริหาร ({profile.executives.length})
              </span>
            }
            key="executives"
          >
            <ExecutiveSection
              profileId={profile.id}
              executives={profile.executives}
              readonly
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <DollarOutlined />
                วงเงินที่ขอ ({profile.loanRequests.length})
              </span>
            }
            key="loans"
          >
            <LoanRequestSection
              profileId={profile.id}
              loanRequests={profile.loanRequests}
              readonly
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SafetyOutlined />
                หลักประกัน ({profile.collaterals.length})
              </span>
            }
            key="collaterals"
          >
            <CollateralSection
              profileId={profile.id}
              collaterals={profile.collaterals}
              readonly
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <ShopOutlined />
                ผู้ขาย ({profile.suppliers.length})
              </span>
            }
            key="suppliers"
          >
            <SupplierSection
              profileId={profile.id}
              suppliers={profile.suppliers}
              readonly
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <ShoppingOutlined />
                ลูกค้า ({profile.customers.length})
              </span>
            }
            key="customers"
          >
            <CustomerListSection
              profileId={profile.id}
              customers={profile.customers}
              readonly
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <LineChartOutlined />
                การวิเคราะห์ DSCR
              </span>
            }
            key="dscr"
          >
            <DSCRAnalysisSection
              profileId={profile.id}
              dscrAnalysis={profile.dscrAnalysis}
              readonly
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <CommentOutlined />
                ความเห็นการอนุมัติ ({profile.approvalComments.length})
              </span>
            }
            key="comments"
          >
            <ApprovalCommentsSection
              profileId={profile.id}
              comments={profile.approvalComments}
              readonly
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default BusinessProfileViewer;
