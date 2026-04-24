import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Modal,
  message,
  Alert,
  Divider,
  Tag,
} from 'antd';
import {
  DollarOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '@/shared/lib/api-client';
import dayjs from 'dayjs';

interface Prepayment {
  id: string;
  loan_id: string;
  payment_schedule_id: string | null;
  amount: number;
  prepayment_date: string;
  interest_saved: number;
  new_monthly_payment: number | null;
  new_maturity_date: string | null;
  penalty_amount: number;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  loans: {
    id: string;
    principal: number;
    interestRate: number;
    status: string;
    customer: {
      id: string;
      businessName: string;
    };
  };
  users: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface PrepaymentFormProps {
  loanId: string;
  loanPrincipal: number;
  remainingBalance: number;
  interestRate: number;
  remainingMonths: number;
}

const PrepaymentForm: React.FC<PrepaymentFormProps> = ({
  loanId,
  loanPrincipal,
  remainingBalance,
  interestRate,
  remainingMonths,
}) => {
  const [prepayments, setPrepayments] = useState<Prepayment[]>([]);
  const [totalStats, setTotalStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [calculatedImpact, setCalculatedImpact] = useState<any>(null);
  const [form] = Form.useForm();
  const [calcForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [loanId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prepaymentsRes, totalRes] = await Promise.all([
        apiClient.get(`/api/prepayments/loan/${loanId}`),
        apiClient.get(`/api/prepayments/loan/${loanId}/total`),
      ]);
      setPrepayments(prepaymentsRes.data as Prepayment[]);
      setTotalStats(totalRes.data as any);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || '';
      let userMessage = 'ไม่สามารถโหลดข้อมูลการชำระล่วงหน้าได้ กรุณาลองใหม่อีกครั้ง';
      if (errorMsg.includes('network') || errorMsg.includes('connection')) {
        userMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        userMessage = 'ไม่พบข้อมูลสินเชื่อนี้ในระบบ';
      }
      message.error(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateImpact = async (values: any) => {
    try {
      const res = await apiClient.post('/api/prepayments/calculate-impact', {
        loanPrincipal,
        remainingBalance,
        prepaymentAmount: values.amount,
        interestRate,
        remainingMonths,
      });
      setCalculatedImpact(res.data as any);
      message.success('คำนวณเสร็จสิ้น');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || '';
      let userMessage = 'ไม่สามารถคำนวณผลกระทบการชำระล่วงหน้าได้ กรุณาลองใหม่อีกครั้ง';
      if (errorMsg.includes('validation') || errorMsg.includes('valid')) {
        userMessage = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบจำนวนเงินและลองใหม่อีกครั้ง';
      } else if (errorMsg.includes('loan') || errorMsg.includes('สินเชื่อ')) {
        userMessage = 'ไม่พบข้อมูลสินเชื่อ หรือสินเชื่อไม่เข้าเงื่อนไขการชำระล่วงหน้า';
      }
      message.error(userMessage);
    }
  };

  const handleCreatePrepayment = async (values: any) => {
    try {
      await apiClient.post('/api/prepayments', {
        loanId,
        amount: values.amount,
        prepaymentDate: values.prepaymentDate.toDate(),
        interestSaved: calculatedImpact?.interestSaved || 0,
        newMonthlyPayment: calculatedImpact?.newMonthlyPayment,
        penaltyAmount: values.penaltyAmount || 0,
        processedBy: values.processedBy,
      });
      message.success('บันทึกการชำระล่วงหน้าสำเร็จ');
      setModalVisible(false);
      setCalculatedImpact(null);
      form.resetFields();
      loadData();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || '';
      let userMessage = 'ไม่สามารถบันทึกการชำระล่วงหน้าได้ กรุณาลองใหม่อีกครั้ง';
      if (errorMsg.includes('validation') || errorMsg.includes('valid')) {
        userMessage = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง';
      } else if (errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
        userMessage = 'มีการบันทึกการชำระล่วงหน้านี้แล้วในระบบ';
      } else if (errorMsg.includes('loan') || errorMsg.includes('สินเชื่อ')) {
        userMessage = 'ไม่พบข้อมูลสินเชื่อ หรือสินเชื่ออยู่ในสถานะที่ไม่สามารถชำระล่วงหน้าได้';
      }
      message.error(userMessage);
    }
  };

  const columns: ColumnsType<Prepayment> = [
    {
      title: 'วันที่ชำระ',
      dataIndex: 'prepayment_date',
      key: 'prepayment_date',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('th-TH'),
      sorter: (a, b) =>
        new Date(a.prepayment_date).getTime() - new Date(b.prepayment_date).getTime(),
    },
    {
      title: 'จำนวนเงิน',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (value: number) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
          ฿{value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'ดอกเบี้ยที่ประหยัด',
      dataIndex: 'interest_saved',
      key: 'interest_saved',
      width: 150,
      render: (value: number) => (
        <span style={{ color: '#1890ff' }}>
          ฿{value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'ค่าปรับ',
      dataIndex: 'penalty_amount',
      key: 'penalty_amount',
      width: 120,
      render: (value: number) =>
        value > 0 ? (
          <span style={{ color: '#ff4d4f' }}>
            ฿{value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: 'ผลประโยชน์สุทธิ',
      key: 'net_benefit',
      width: 150,
      render: (_, record) => {
        const netBenefit = record.interest_saved - record.penalty_amount;
        return (
          <span style={{ color: netBenefit > 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
            ฿{netBenefit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      title: 'ผู้ดำเนินการ',
      key: 'processed_by',
      width: 150,
      render: (_, record) =>
        record.users ? `${record.users.firstName} ${record.users.lastName}` : '-',
    },
    {
      title: 'สถานะ',
      key: 'status',
      width: 100,
      render: (_, record) =>
        record.processed_at ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            ดำเนินการแล้ว
          </Tag>
        ) : (
          <Tag color="warning">รอดำเนินการ</Tag>
        ),
    },
  ];

  return (
    <div>
      {/* Statistics */}
      {totalStats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="ชำระล่วงหน้าทั้งหมด"
                value={totalStats.totalAmount}
                precision={2}
                prefix="฿"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="ดอกเบี้ยที่ประหยัด"
                value={totalStats.totalInterestSaved}
                precision={2}
                prefix="฿"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="ค่าปรับทั้งหมด"
                value={totalStats.totalPenalty}
                precision={2}
                prefix="฿"
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="ผลประโยชน์สุทธิ"
                value={totalStats.netSavings}
                precision={2}
                prefix="฿"
                valueStyle={{ color: totalStats.netSavings > 0 ? '#52c41a' : '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Prepayments Table */}
      <Card
        title={
          <Space>
            <DollarOutlined />
            <span>ประวัติการชำระล่วงหน้า</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="default"
              icon={<CalculatorOutlined />}
              onClick={() => setCalculatorVisible(true)}
            >
              คำนวณผลกระทบ
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              บันทึกการชำระ
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              รีเฟรช
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={prepayments}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `ทั้งหมด ${total} รายการ`,
          }}
        />
      </Card>

      {/* Calculator Modal */}
      <Modal
        title={
          <Space>
            <CalculatorOutlined />
            <span>คำนวณผลกระทบจากการชำระล่วงหน้า</span>
          </Space>
        }
        open={calculatorVisible}
        onCancel={() => {
          setCalculatorVisible(false);
          setCalculatedImpact(null);
          calcForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Alert
          message="ข้อมูลสินเชื่อปัจจุบัน"
          description={
            <div>
              <div>ยอดคงเหลือ: ฿{remainingBalance.toLocaleString('th-TH')}</div>
              <div>อัตราดอกเบี้ย: {(interestRate * 100).toFixed(2)}%</div>
              <div>งวดที่เหลือ: {remainingMonths} เดือน</div>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 24 }}
        />

        <Form form={calcForm} layout="vertical" onFinish={handleCalculateImpact}>
          <Form.Item
            name="amount"
            label="จำนวนเงินที่ต้องการชำระล่วงหน้า"
            rules={[
              { required: true, message: 'กรุณาระบุจำนวนเงิน' },
              {
                type: 'number',
                max: remainingBalance,
                message: 'จำนวนเงินต้องไม่เกินยอดคงเหลือ',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={remainingBalance}
              formatter={(value) => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value): number => value ? Number(value.replace(/฿\s?|(,*)/g, '')) : 0}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<CalculatorOutlined />} block>
              คำนวณ
            </Button>
          </Form.Item>
        </Form>

        {calculatedImpact && (
          <>
            <Divider>ผลการคำนวณ</Divider>
            <Alert
              message="ผลกระทบจากการชำระล่วงหน้า"
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="ยอดคงเหลือใหม่"
                    value={calculatedImpact.newBalance}
                    precision={2}
                    prefix="฿"
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="ดอกเบี้ยที่ประหยัด"
                    value={calculatedImpact.interestSaved}
                    precision={2}
                    prefix="฿"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={12} style={{ marginTop: 16 }}>
                <Card size="small">
                  <Statistic
                    title="ค่างวดรายเดือนใหม่"
                    value={calculatedImpact.newMonthlyPayment}
                    precision={2}
                    prefix="฿"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={12} style={{ marginTop: 16 }}>
                <Card size="small">
                  <Statistic
                    title="จำนวนเดือนที่ประหยัด"
                    value={calculatedImpact.monthsSaved}
                    suffix="เดือน"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Modal>

      {/* Create Prepayment Modal */}
      <Modal
        title="บันทึกการชำระล่วงหน้า"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setCalculatedImpact(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreatePrepayment}>
          <Form.Item
            name="amount"
            label="จำนวนเงิน"
            rules={[{ required: true, message: 'กรุณาระบุจำนวนเงิน' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value): number => value ? Number(value.replace(/฿\s?|(,*)/g, '')) : 0}
              onChange={(value) => {
                if (value) {
                  handleCalculateImpact({ amount: value });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="prepaymentDate"
            label="วันที่ชำระ"
            rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="penaltyAmount" label="ค่าปรับ (ถ้ามี)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value): number => value ? Number(value.replace(/฿\s?|(,*)/g, '')) : 0}
            />
          </Form.Item>

          <Form.Item
            name="processedBy"
            label="ผู้ดำเนินการ (User ID)"
            rules={[{ required: true, message: 'กรุณาระบุผู้ดำเนินการ' }]}
          >
            <Input />
          </Form.Item>

          {calculatedImpact && (
            <Alert
              message={`ดอกเบี้ยที่ประหยัด: ฿${calculatedImpact.interestSaved.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                บันทึก
              </Button>
              <Button onClick={() => setModalVisible(false)}>ยกเลิก</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PrepaymentForm;
