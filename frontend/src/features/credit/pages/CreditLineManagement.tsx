import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  message,
  Tabs,
  Progress,
  Tooltip,
  Badge,
} from 'antd';
import {
  DollarOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '@/shared/lib/api-client';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Option } = Select;

interface CreditLine {
  id: string;
  customer_id: string;
  credit_line_number: string;
  approved_limit: number;
  current_balance: number;
  available_balance: number;
  utilization_rate: number;
  interest_rate: number;
  start_date: string;
  expiry_date: string;
  review_date: string | null;
  status: string | null;
  created_at: string;
  customers: {
    id: string;
    businessName: string;
    taxId: string;
  };
  users: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  credit_line_drawdowns: Drawdown[];
}

interface Drawdown {
  id: string;
  credit_line_id: string;
  drawdown_number: string;
  amount: number;
  purpose: string;
  drawdown_date: string;
  maturity_date: string;
  interest_rate: number;
  status: string | null;
  created_at: string;
}

const CreditLineManagement: React.FC = () => {
  const [creditLines, setCreditLines] = useState<CreditLine[]>([]);
  const [drawdowns, setDrawdowns] = useState<Drawdown[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('credit-lines');
  const [creditLineModalVisible, setCreditLineModalVisible] = useState(false);
  const [drawdownModalVisible, setDrawdownModalVisible] = useState(false);
  const [selectedCreditLine, setSelectedCreditLine] = useState<CreditLine | null>(null);
  const [form] = Form.useForm();
  const [drawdownForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'credit-lines') {
        const [creditLinesRes, statsRes] = await Promise.all([
          apiClient.get('/api/credit-lines'),
          apiClient.get('/api/credit-lines/statistics'),
        ]);
        setCreditLines(creditLinesRes.data as CreditLine[]);
        setStatistics(statsRes.data as any);
      } else {
        const [drawdownsRes, statsRes] = await Promise.all([
          apiClient.get('/api/drawdowns'),
          apiClient.get('/api/drawdowns/statistics'),
        ]);
        setDrawdowns(drawdownsRes.data as Drawdown[]);
        setStatistics(statsRes.data as any);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || '';
      let userMessage = 'ไม่สามารถโหลดข้อมูล Credit Line ได้ กรุณาลองใหม่อีกครั้ง';
      if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
        userMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      } else if (errorMsg.includes('session') || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
        userMessage = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง';
      }
      message.error(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCreditLine = async (values: any) => {
    try {
      await apiClient.post('/api/credit-lines', {
        customerId: values.customerId,
        creditLineNumber: values.creditLineNumber,
        approvedLimit: values.approvedLimit,
        interestRate: values.interestRate / 100,
        startDate: values.startDate.toDate(),
        expiryDate: values.expiryDate.toDate(),
        reviewDate: values.reviewDate?.toDate(),
        createdBy: values.createdBy,
      });
      message.success('สร้าง Credit Line สำเร็จ');
      setCreditLineModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || '';
      let userMessage = 'ไม่สามารถสร้าง Credit Line ได้ กรุณาลองใหม่อีกครั้ง';
      if (errorMsg.includes('duplicate') || errorMsg.includes('already exists') || errorMsg.includes('ซ้ำ')) {
        userMessage = 'หมายเลข Credit Line นี้มีอยู่ในระบบแล้ว';
      } else if (errorMsg.includes('customer') || errorMsg.includes('ลูกค้า')) {
        userMessage = 'ไม่พบลูกค้าในระบบ กรุณาตรวจสอบรหัสลูกค้า';
      } else if (errorMsg.includes('validation') || errorMsg.includes('valid')) {
        userMessage = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง';
      }
      message.error(userMessage);
    }
  };

  const handleCreateDrawdown = async (values: any) => {
    if (!selectedCreditLine) return;
    try {
      await apiClient.post('/api/drawdowns', {
        creditLineId: selectedCreditLine.id,
        drawdownNumber: values.drawdownNumber,
        amount: values.amount,
        purpose: values.purpose,
        drawdownDate: values.drawdownDate.toDate(),
        maturityDate: values.maturityDate.toDate(),
        interestRate: values.interestRate / 100,
        createdBy: values.createdBy,
      });
      message.success('สร้าง Drawdown สำเร็จ');
      setDrawdownModalVisible(false);
      setSelectedCreditLine(null);
      drawdownForm.resetFields();
      loadData();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || '';
      let userMessage = 'ไม่สามารถสร้าง Drawdown ได้ กรุณาลองใหม่อีกครั้ง';
      if (errorMsg.includes('limit') || errorMsg.includes('วงเงิน') || errorMsg.includes('exceeded')) {
        userMessage = 'จำนวนเงิน Drawdown เกินวงเงิน Credit Line ที่เหลืออยู่';
      } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        userMessage = 'ไม่พบ Credit Line นี้ในระบบ';
      } else if (errorMsg.includes('suspended') || errorMsg.includes('inactive')) {
        userMessage = 'Credit Line นี้อยู่ในสถานะระงับชั่วคราว ไม่สามารถ Drawdown ได้';
      }
      message.error(userMessage);
    }
  };

  const handleSuspend = async (id: string) => {
    try {
      await apiClient.post(`/api/credit-lines/${id}/suspend`);
      message.success('ระงับ Credit Line สำเร็จ');
      loadData();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || '';
      let userMessage = 'ไม่สามารถระงับ Credit Line ได้ กรุณาลองใหม่อีกครั้ง';
      if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        userMessage = 'ไม่พบ Credit Line นี้ในระบบ';
      } else if (errorMsg.includes('already') || errorMsg.includes('แล้ว')) {
        userMessage = 'Credit Line นี้อยู่ในสถานะระงับอยู่แล้ว';
      }
      message.error(userMessage);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await apiClient.post(`/api/credit-lines/${id}/activate`);
      message.success('เปิดใช้งาน Credit Line สำเร็จ');
      loadData();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || '';
      let userMessage = 'ไม่สามารถเปิดใช้งาน Credit Line ได้ กรุณาลองใหม่อีกครั้ง';
      if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        userMessage = 'ไม่พบ Credit Line นี้ในระบบ';
      } else if (errorMsg.includes('expired') || errorMsg.includes('หมดอายุ')) {
        userMessage = 'Credit Line นี้หมดอายุแล้ว ไม่สามารถเปิดใช้งานได้';
      }
      message.error(userMessage);
    }
  };

  const handleRepayDrawdown = async (id: string) => {
    try {
      await apiClient.post(`/api/drawdowns/${id}/repay`);
      message.success('ชำระคืน Drawdown สำเร็จ');
      loadData();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || '';
      let userMessage = 'ไม่สามารถชำระคืน Drawdown ได้ กรุณาลองใหม่อีกครั้ง';
      if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        userMessage = 'ไม่พบ Drawdown นี้ในระบบ';
      } else if (errorMsg.includes('already') || errorMsg.includes('repaid') || errorMsg.includes('ชำระแล้ว')) {
        userMessage = 'Drawdown นี้ถูกชำระคืนแล้ว';
      }
      message.error(userMessage);
    }
  };

  const getStatusTag = (status: string | null) => {
    const statusMap: Record<string, { color: string; icon: React.ReactNode }> = {
      ACTIVE: { color: 'success', icon: <CheckCircleOutlined /> },
      SUSPENDED: { color: 'warning', icon: <StopOutlined /> },
      CLOSED: { color: 'default', icon: <CloseCircleOutlined /> },
      REPAID: { color: 'success', icon: <CheckCircleOutlined /> },
      CANCELLED: { color: 'error', icon: <CloseCircleOutlined /> },
    };
    const config = statusMap[status || 'ACTIVE'];
    return (
      <Tag color={config.color} icon={config.icon}>
        {status || 'ACTIVE'}
      </Tag>
    );
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return '#ff4d4f';
    if (rate >= 70) return '#faad14';
    return '#52c41a';
  };

  const isExpiringSoon = (expiryDate: string) => {
    const days = dayjs(expiryDate).diff(dayjs(), 'day');
    return days <= 30 && days >= 0;
  };

  const creditLineColumns: ColumnsType<CreditLine> = [
    {
      title: 'เลขที่ Credit Line',
      dataIndex: 'credit_line_number',
      key: 'credit_line_number',
      width: 150,
    },
    {
      title: 'ลูกค้า',
      dataIndex: ['customers', 'businessName'],
      key: 'customer',
      width: 200,
    },
    {
      title: 'วงเงินอนุมัติ',
      dataIndex: 'approved_limit',
      key: 'approved_limit',
      width: 150,
      render: (value: number) => `฿${value.toLocaleString('th-TH')}`,
    },
    {
      title: 'ยอดใช้ไป',
      dataIndex: 'current_balance',
      key: 'current_balance',
      width: 150,
      render: (value: number) => (
        <span style={{ color: '#ff4d4f' }}>฿{value.toLocaleString('th-TH')}</span>
      ),
    },
    {
      title: 'คงเหลือ',
      dataIndex: 'available_balance',
      key: 'available_balance',
      width: 150,
      render: (value: number) => (
        <span style={{ color: '#52c41a' }}>฿{value.toLocaleString('th-TH')}</span>
      ),
    },
    {
      title: 'อัตราการใช้',
      dataIndex: 'utilization_rate',
      key: 'utilization_rate',
      width: 150,
      render: (rate: number) => {
        const percentage = rate * 100;
        return (
          <Tooltip title={`${percentage.toFixed(2)}%`}>
            <Progress
              percent={percentage}
              strokeColor={getUtilizationColor(percentage)}
              size="small"
              format={(percent) => `${percent?.toFixed(0)}%`}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'วันหมดอายุ',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      width: 120,
      render: (date: string) => {
        const isExpiring = isExpiringSoon(date);
        return (
          <span style={{ color: isExpiring ? '#ff4d4f' : undefined }}>
            {isExpiring && <WarningOutlined style={{ marginRight: 4 }} />}
            {new Date(date).toLocaleDateString('th-TH')}
          </span>
        );
      },
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'การดำเนินการ',
      key: 'actions',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedCreditLine(record);
              setDrawdownModalVisible(true);
            }}
            disabled={record.status !== 'ACTIVE'}
          >
            Drawdown
          </Button>
          {record.status === 'ACTIVE' ? (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => handleSuspend(record.id)}
            >
              ระงับ
            </Button>
          ) : record.status === 'SUSPENDED' ? (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleActivate(record.id)}
            >
              เปิดใช้
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const drawdownColumns: ColumnsType<Drawdown> = [
    {
      title: 'เลขที่ Drawdown',
      dataIndex: 'drawdown_number',
      key: 'drawdown_number',
      width: 150,
    },
    {
      title: 'จำนวนเงิน',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (value: number) => (
        <span style={{ fontWeight: 'bold' }}>฿{value.toLocaleString('th-TH')}</span>
      ),
    },
    {
      title: 'วัตถุประสงค์',
      dataIndex: 'purpose',
      key: 'purpose',
      width: 200,
    },
    {
      title: 'วันที่เบิก',
      dataIndex: 'drawdown_date',
      key: 'drawdown_date',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('th-TH'),
    },
    {
      title: 'วันครบกำหนด',
      dataIndex: 'maturity_date',
      key: 'maturity_date',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('th-TH'),
    },
    {
      title: 'อัตราดอกเบี้ย',
      dataIndex: 'interest_rate',
      key: 'interest_rate',
      width: 100,
      render: (rate: number) => <Tag color="blue">{(rate * 100).toFixed(2)}%</Tag>,
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'การดำเนินการ',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'ACTIVE' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleRepayDrawdown(record.id)}
            >
              ชำระคืน
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>จัดการ Credit Lines</h1>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Credit Lines Tab */}
        <TabPane
          tab={
            <Badge count={statistics?.expiringIn30Days || 0} offset={[10, 0]}>
              <span>Credit Lines</span>
            </Badge>
          }
          key="credit-lines"
        >
          {statistics && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="วงเงินอนุมัติทั้งหมด"
                    value={statistics.totalApprovedLimit}
                    precision={0}
                    prefix="฿"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="ยอดใช้ไปแล้ว"
                    value={statistics.totalCurrentBalance}
                    precision={0}
                    prefix="฿"
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="คงเหลือ"
                    value={statistics.totalAvailableBalance}
                    precision={0}
                    prefix="฿"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="อัตราการใช้เฉลี่ย"
                    value={statistics.averageUtilizationRate * 100}
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          <Card
            title="รายการ Credit Lines"
            extra={
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreditLineModalVisible(true)}
                >
                  สร้าง Credit Line
                </Button>
                <Button icon={<ReloadOutlined />} onClick={loadData}>
                  รีเฟรช
                </Button>
              </Space>
            }
          >
            <Table
              columns={creditLineColumns}
              dataSource={creditLines}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1500 }}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
              }}
            />
          </Card>
        </TabPane>

        {/* Drawdowns Tab */}
        <TabPane tab="Drawdowns" key="drawdowns">
          {statistics && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="จำนวน Drawdowns"
                    value={statistics.totalDrawdowns}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="ยอดรวม"
                    value={statistics.totalAmount}
                    precision={0}
                    prefix="฿"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="เฉลี่ยต่อรายการ"
                    value={statistics.averageAmount}
                    precision={0}
                    prefix="฿"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="ครบกำหนดใน 30 วัน"
                    value={statistics.maturingIn30Days}
                    valueStyle={{ color: '#ff4d4f' }}
                    prefix={<ExclamationCircleOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          )}

          <Card
            title="รายการ Drawdowns"
            extra={
              <Button icon={<ReloadOutlined />} onClick={loadData}>
                รีเฟรช
              </Button>
            }
          >
            <Table
              columns={drawdownColumns}
              dataSource={drawdowns}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1200 }}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
              }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Create Credit Line Modal */}
      <Modal
        title="สร้าง Credit Line"
        open={creditLineModalVisible}
        onCancel={() => {
          setCreditLineModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateCreditLine}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customerId"
                label="Customer ID"
                rules={[{ required: true, message: 'กรุณาระบุ' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="creditLineNumber"
                label="เลขที่ Credit Line"
                rules={[{ required: true, message: 'กรุณาระบุ' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="approvedLimit"
                label="วงเงินอนุมัติ"
                rules={[{ required: true, message: 'กรุณาระบุ' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={(value) => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value ? Number(value.replace(/฿\s?|(,*)/g, '')) : 0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="interestRate"
                label="อัตราดอกเบี้ย (%)"
                rules={[{ required: true, message: 'กรุณาระบุ' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.01} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="วันที่เริ่มต้น"
                rules={[{ required: true, message: 'กรุณาระบุ' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryDate"
                label="วันหมดอายุ"
                rules={[{ required: true, message: 'กรุณาระบุ' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reviewDate" label="วันทบทวน">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            name="createdBy"
            label="ผู้สร้าง (User ID)"
            rules={[{ required: true, message: 'กรุณาระบุ' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                สร้าง
              </Button>
              <Button onClick={() => setCreditLineModalVisible(false)}>ยกเลิก</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Drawdown Modal */}
      <Modal
        title="สร้าง Drawdown"
        open={drawdownModalVisible}
        onCancel={() => {
          setDrawdownModalVisible(false);
          setSelectedCreditLine(null);
          drawdownForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        {selectedCreditLine && (
          <>
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f0f2f5' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div>Credit Line: {selectedCreditLine.credit_line_number}</div>
                  <div>ลูกค้า: {selectedCreditLine.customers.businessName}</div>
                </Col>
                <Col span={12}>
                  <div>
                    วงเงินคงเหลือ:{' '}
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                      ฿{selectedCreditLine.available_balance.toLocaleString('th-TH')}
                    </span>
                  </div>
                </Col>
              </Row>
            </Card>

            <Form form={drawdownForm} layout="vertical" onFinish={handleCreateDrawdown}>
              <Form.Item
                name="drawdownNumber"
                label="เลขที่ Drawdown"
                rules={[{ required: true, message: 'กรุณาระบุ' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="amount"
                label="จำนวนเงิน"
                rules={[
                  { required: true, message: 'กรุณาระบุ' },
                  {
                    type: 'number',
                    max: selectedCreditLine.available_balance,
                    message: 'จำนวนเงินต้องไม่เกินวงเงินคงเหลือ',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={selectedCreditLine.available_balance}
                  formatter={(value) => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value ? Number(value.replace(/฿\s?|(,*)/g, '')) : 0}
                />
              </Form.Item>
              <Form.Item
                name="purpose"
                label="วัตถุประสงค์"
                rules={[{ required: true, message: 'กรุณาระบุ' }]}
              >
                <Input.TextArea rows={3} />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="drawdownDate"
                    label="วันที่เบิก"
                    rules={[{ required: true, message: 'กรุณาระบุ' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="maturityDate"
                    label="วันครบกำหนด"
                    rules={[{ required: true, message: 'กรุณาระบุ' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="interestRate"
                label="อัตราดอกเบี้ย (%)"
                rules={[{ required: true, message: 'กรุณาระบุ' }]}
                initialValue={selectedCreditLine.interest_rate * 100}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.01} />
              </Form.Item>
              <Form.Item
                name="createdBy"
                label="ผู้สร้าง (User ID)"
                rules={[{ required: true, message: 'กรุณาระบุ' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    สร้าง
                  </Button>
                  <Button
                    onClick={() => {
                      setDrawdownModalVisible(false);
                      setSelectedCreditLine(null);
                    }}
                  >
                    ยกเลิก
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default CreditLineManagement;
