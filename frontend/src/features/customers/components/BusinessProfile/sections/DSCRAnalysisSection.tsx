import React from 'react';
import { Card, Row, Col, Statistic, Tag, Empty, Table, Progress } from 'antd';
import {
  LineChartOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface DSCRAnalysis {
  id: string;
  analysisYear: number;
  analysisPeriod?: string;
  netOperatingIncome: number;
  otherIncome?: number;
  totalIncome: number;
  principalPayment: number;
  interestPayment: number;
  totalDebtService: number;
  dscrRatio: number;
  dscrStatus: string;
}

interface DSCRAnalysisSectionProps {
  profileId: string;
  dscrAnalysis: DSCRAnalysis[];
  readonly?: boolean;
}

const DSCRAnalysisSection: React.FC<DSCRAnalysisSectionProps> = ({
  dscrAnalysis,
}) => {
  if (!dscrAnalysis || dscrAnalysis.length === 0) {
    return (
      <Empty
        description="ไม่มีข้อมูลการวิเคราะห์ DSCR"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const latestAnalysis = dscrAnalysis[0];

  const getDSCRStatus = (ratio: number) => {
    if (ratio >= 1.5) {
      return {
        text: 'ดีมาก',
        color: 'success',
        icon: <CheckCircleOutlined />,
      };
    } else if (ratio >= 1.25) {
      return {
        text: 'ดี',
        color: 'success',
        icon: <CheckCircleOutlined />,
      };
    } else if (ratio >= 1.0) {
      return {
        text: 'พอใช้',
        color: 'warning',
        icon: <WarningOutlined />,
      };
    } else {
      return {
        text: 'ต่ำ',
        color: 'error',
        icon: <CloseCircleOutlined />,
      };
    }
  };

  const status = getDSCRStatus(Number(latestAnalysis.dscrRatio));

  const columns: ColumnsType<DSCRAnalysis> = [
    {
      title: 'ปี',
      dataIndex: 'analysisYear',
      key: 'analysisYear',
      width: 100,
      align: 'center',
    },
    {
      title: 'รายได้จากการดำเนินงาน',
      dataIndex: 'netOperatingIncome',
      key: 'netOperatingIncome',
      width: 180,
      align: 'right',
      render: (value: number) => value.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
    {
      title: 'รายได้อื่น',
      dataIndex: 'otherIncome',
      key: 'otherIncome',
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
      title: 'รายได้รวม',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      width: 150,
      align: 'right',
      render: (value: number) => (
        <strong>
          {value.toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </strong>
      ),
    },
    {
      title: 'เงินต้น',
      dataIndex: 'principalPayment',
      key: 'principalPayment',
      width: 150,
      align: 'right',
      render: (value: number) => value.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
    {
      title: 'ดอกเบี้ย',
      dataIndex: 'interestPayment',
      key: 'interestPayment',
      width: 150,
      align: 'right',
      render: (value: number) => value.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
    {
      title: 'ภาระหนี้รวม',
      dataIndex: 'totalDebtService',
      key: 'totalDebtService',
      width: 150,
      align: 'right',
      render: (value: number) => (
        <strong>
          {value.toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </strong>
      ),
    },
    {
      title: 'DSCR',
      dataIndex: 'dscrRatio',
      key: 'dscrRatio',
      width: 120,
      align: 'center',
      render: (ratio: number) => {
        const status = getDSCRStatus(ratio);
        return (
          <Tag color={status.color} icon={status.icon}>
            {Number(ratio).toFixed(2)}
          </Tag>
        );
      },
    },
  ];

  return (
    <div>
      {/* Latest DSCR Summary */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="DSCR Ratio"
              value={Number(latestAnalysis.dscrRatio).toFixed(2)}
              prefix={<LineChartOutlined />}
              suffix={
                <Tag color={status.color} icon={status.icon}>
                  {status.text}
                </Tag>
              }
              valueStyle={{ fontSize: 32 }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              ปี {latestAnalysis.analysisYear}
            </div>
          </Col>

          <Col span={6}>
            <Statistic
              title="รายได้รวม"
              value={Number(latestAnalysis.totalIncome)}
              precision={2}
              prefix={<RiseOutlined />}
              suffix="บาท"
            />
          </Col>

          <Col span={6}>
            <Statistic
              title="ภาระหนี้รวม"
              value={Number(latestAnalysis.totalDebtService)}
              precision={2}
              prefix={<FallOutlined />}
              suffix="บาท"
            />
          </Col>

          <Col span={6}>
            <div style={{ marginBottom: 8 }}>
              <strong>ความสามารถในการชำระหนี้</strong>
            </div>
            <Progress
              percent={Math.min(Number(latestAnalysis.dscrRatio) * 50, 100)}
              status={
                Number(latestAnalysis.dscrRatio) >= 1.25
                  ? 'success'
                  : Number(latestAnalysis.dscrRatio) >= 1.0
                  ? 'normal'
                  : 'exception'
              }
              format={() => `${(Number(latestAnalysis.dscrRatio) * 100).toFixed(0)}%`}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              {Number(latestAnalysis.dscrRatio) >= 1.25
                ? 'มีความสามารถในการชำระหนี้สูง'
                : Number(latestAnalysis.dscrRatio) >= 1.0
                ? 'มีความสามารถในการชำระหนี้พอใช้'
                : 'มีความสามารถในการชำระหนี้ต่ำ'}
            </div>
          </Col>
        </Row>
      </Card>

      {/* DSCR Explanation */}
      <Card
        title="คำอธิบาย DSCR (Debt Service Coverage Ratio)"
        style={{ marginBottom: 16 }}
        size="small"
      >
        <div style={{ color: '#666' }}>
          <p>
            <strong>DSCR</strong> คือ อัตราส่วนความสามารถในการชำระหนี้
            คำนวณจาก: <strong>รายได้รวม ÷ ภาระหนี้รวม</strong>
          </p>
          <ul style={{ marginBottom: 0 }}>
            <li>
              <strong>DSCR ≥ 1.5:</strong> ดีมาก - มีรายได้เพียงพอชำระหนี้และเหลือเงินสำรอง
            </li>
            <li>
              <strong>DSCR 1.25-1.49:</strong> ดี - มีรายได้เพียงพอชำระหนี้
            </li>
            <li>
              <strong>DSCR 1.0-1.24:</strong> พอใช้ - มีรายได้พอชำระหนี้แต่ไม่มีเงินสำรอง
            </li>
            <li>
              <strong>DSCR &lt; 1.0:</strong> ต่ำ - รายได้ไม่เพียงพอชำระหนี้
            </li>
          </ul>
        </div>
      </Card>

      {/* Historical Data */}
      {dscrAnalysis.length > 1 && (
        <Card title="ประวัติการวิเคราะห์ DSCR">
          <Table
            columns={columns}
            dataSource={dscrAnalysis}
            rowKey="id"
            pagination={false}
            scroll={{ x: 1200 }}
          />
        </Card>
      )}

      {/* Single Year Data */}
      {dscrAnalysis.length === 1 && (
        <Card title="รายละเอียดการวิเคราะห์ DSCR">
          <Table
            columns={columns}
            dataSource={dscrAnalysis}
            rowKey="id"
            pagination={false}
            scroll={{ x: 1200 }}
          />
        </Card>
      )}
    </div>
  );
};

export default DSCRAnalysisSection;
