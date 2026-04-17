import React from 'react';
import { Timeline, Card, Tag, Empty, Space } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface ApprovalComment {
  id: string;
  commentType: string;
  commentBy: string;
  position: string;
  comments: string;
  riskAssessment?: string;
  recommendation?: string;
  decision?: string;
  approvedAmount?: number;
  specialConditions?: string;
  commentDate: string;
}

interface ApprovalCommentsSectionProps {
  profileId: string;
  comments: ApprovalComment[];
  readonly?: boolean;
}

const ApprovalCommentsSection: React.FC<ApprovalCommentsSectionProps> = ({
  comments,
}) => {
  if (!comments || comments.length === 0) {
    return (
      <Empty
        description="ไม่มีความเห็นการอนุมัติ"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const getCommentTypeInfo = (type: string) => {
    const typeMap: Record<string, { text: string; color: string }> = {
      MARKETING: { text: 'เจ้าหน้าที่การตลาด', color: 'blue' },
      CREDIT: { text: 'เจ้าหน้าที่สินเชื่อ', color: 'cyan' },
      BRANCH_MANAGER: { text: 'ผู้จัดการสาขา', color: 'purple' },
      APPROVER: { text: 'ผู้อนุมัติ', color: 'green' },
    };
    return typeMap[type] || { text: type, color: 'default' };
  };

  const getDecisionIcon = (decision?: string) => {
    if (!decision) return <QuestionCircleOutlined />;
    if (decision.includes('อนุมัติ') || decision.includes('APPROVE')) {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
    if (decision.includes('ไม่อนุมัติ') || decision.includes('REJECT')) {
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
    return <QuestionCircleOutlined />;
  };

  return (
    <div>
      <Timeline mode="left">
        {comments.map((comment) => {
          const typeInfo = getCommentTypeInfo(comment.commentType);

          return (
            <Timeline.Item
              key={comment.id}
              label={
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>{comment.commentBy}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {comment.position}
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {dayjs(comment.commentDate).format('DD/MM/YYYY HH:mm')}
                  </div>
                </div>
              }
              dot={<UserOutlined style={{ fontSize: 16 }} />}
            >
              <Card
                size="small"
                title={
                  <Space>
                    <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
                    {comment.decision && getDecisionIcon(comment.decision)}
                  </Space>
                }
              >
                {/* Comments */}
                {comment.comments && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      ความเห็น:
                    </div>
                    <div
                      style={{
                        padding: 12,
                        background: '#f5f5f5',
                        borderRadius: 4,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {comment.comments}
                    </div>
                  </div>
                )}

                {/* Risk Assessment */}
                {comment.riskAssessment && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      การประเมินความเสี่ยง:
                    </div>
                    <div
                      style={{
                        padding: 12,
                        background: '#fff7e6',
                        borderRadius: 4,
                        border: '1px solid #ffd591',
                      }}
                    >
                      {comment.riskAssessment}
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                {comment.recommendation && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      คำแนะนำ:
                    </div>
                    <div
                      style={{
                        padding: 12,
                        background: '#e6f7ff',
                        borderRadius: 4,
                        border: '1px solid #91d5ff',
                      }}
                    >
                      {comment.recommendation}
                    </div>
                  </div>
                )}

                {/* Decision */}
                {comment.decision && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      การตัดสินใจ:
                    </div>
                    <div
                      style={{
                        padding: 12,
                        background: comment.decision.includes('อนุมัติ')
                          ? '#f6ffed'
                          : '#fff1f0',
                        borderRadius: 4,
                        border: comment.decision.includes('อนุมัติ')
                          ? '1px solid #b7eb8f'
                          : '1px solid #ffa39e',
                      }}
                    >
                      {comment.decision}
                    </div>
                  </div>
                )}

                {/* Approved Amount */}
                {comment.approvedAmount && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      วงเงินที่อนุมัติ:
                    </div>
                    <div style={{ fontSize: 20, color: '#52c41a', fontWeight: 'bold' }}>
                      {Number(comment.approvedAmount).toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      บาท
                    </div>
                  </div>
                )}

                {/* Special Conditions */}
                {comment.specialConditions && (
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      เงื่อนไขพิเศษ:
                    </div>
                    <div
                      style={{
                        padding: 12,
                        background: '#fff0f6',
                        borderRadius: 4,
                        border: '1px solid #ffadd2',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {comment.specialConditions}
                    </div>
                  </div>
                )}
              </Card>
            </Timeline.Item>
          );
        })}
      </Timeline>
    </div>
  );
};

export default ApprovalCommentsSection;
