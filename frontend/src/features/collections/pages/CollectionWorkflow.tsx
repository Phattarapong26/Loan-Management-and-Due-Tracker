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
  Select,
  message,
  Tabs,
  Badge,
  Switch,
  DatePicker,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UserSwitchOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { collectionsApi, WorkflowStep, TaskAssignment, WorkflowStats, TaskStats } from '../api/collections.api';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

const CollectionWorkflow: React.FC = () => {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('workflows');
  const [taskStatusFilter, setTaskStatusFilter] = useState('pending');
  const [stepModalVisible, setStepModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskAssignment | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [activeTab, taskStatusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'workflows') {
        const [stepsRes, statsRes] = await Promise.all([
          collectionsApi.getWorkflowSteps(),
          collectionsApi.getWorkflowStats(),
        ]);
        setWorkflowSteps(stepsRes.data);
        setWorkflowStats(statsRes.data);
      } else {
        const [tasksRes, statsRes] = await Promise.all([
          collectionsApi.getTaskAssignments(
            taskStatusFilter === 'all' ? {} : { status: taskStatusFilter.toUpperCase() }
          ),
          collectionsApi.getTaskStats(),
        ]);
        setTasks(tasksRes.data);
        setTaskStats(statsRes.data);
      }
    } catch (error) {
      message.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStep = async (values: any) => {
    try {
      await collectionsApi.createWorkflowStep(values);
      message.success('สร้าง Workflow Step สำเร็จ');
      setStepModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error('ไม่สามารถสร้าง Workflow Step ได้');
    }
  };

  const handleUpdateStep = async (values: any) => {
    if (!selectedStep) return;
    try {
      await collectionsApi.updateWorkflowStep(selectedStep.id, values);
      message.success('อัพเดท Workflow Step สำเร็จ');
      setStepModalVisible(false);
      setSelectedStep(null);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error('ไม่สามารถอัพเดท Workflow Step ได้');
    }
  };

  const handleToggleStep = async (stepId: string, isActive: boolean) => {
    try {
      await collectionsApi.toggleWorkflowStep(stepId, isActive);
      message.success(isActive ? 'เปิดใช้งานสำเร็จ' : 'ปิดใช้งานสำเร็จ');
      loadData();
    } catch (error) {
      message.error('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    Modal.confirm({
      title: 'ยืนยันการลบ',
      content: 'คุณต้องการลบ Workflow Step นี้หรือไม่?',
      onOk: async () => {
        try {
          await collectionsApi.deleteWorkflowStep(stepId);
          message.success('ลบสำเร็จ');
          loadData();
        } catch (error) {
          message.error('ไม่สามารถลบได้');
        }
      },
    });
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await collectionsApi.completeTask(taskId);
      message.success('ทำงานเสร็จสิ้น');
      loadData();
    } catch (error) {
      message.error('ไม่สามารถทำงานเสร็จสิ้นได้');
    }
  };

  const getPriorityTag = (priority: string) => {
    const colors: Record<string, string> = {
      HIGH: 'red',
      MEDIUM: 'orange',
      LOW: 'blue',
    };
    return <Tag color={colors[priority] || 'default'}>{priority}</Tag>;
  };

  const getStatusTag = (status: string | null) => {
    const statusMap: Record<string, { color: string; icon: React.ReactNode }> = {
      PENDING: { color: 'warning', icon: <ClockCircleOutlined /> },
      COMPLETED: { color: 'success', icon: <CheckCircleOutlined /> },
      CANCELLED: { color: 'error', icon: <CloseCircleOutlined /> },
    };
    const config = statusMap[status || 'PENDING'];
    return (
      <Tag color={config.color} icon={config.icon}>
        {status || 'PENDING'}
      </Tag>
    );
  };

  const workflowColumns: ColumnsType<WorkflowStep> = [
    {
      title: 'วันค้างชำระ',
      key: 'overdue_range',
      width: 150,
      render: (_, record) =>
        `${record.days_overdue_from}-${record.days_overdue_to || '∞'} วัน`,
    },
    {
      title: 'การดำเนินการ',
      dataIndex: 'action_type',
      key: 'action_type',
      width: 150,
    },
    {
      title: 'ความสำคัญ',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => getPriorityTag(priority),
    },
    {
      title: 'บทบาทที่รับผิดชอบ',
      dataIndex: 'assigned_role',
      key: 'assigned_role',
      width: 150,
    },
    {
      title: 'SLA (ชม.)',
      dataIndex: 'sla_hours',
      key: 'sla_hours',
      width: 100,
    },
    {
      title: 'สถานะ',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleToggleStep(record.id, checked)}
        />
      ),
    },
    {
      title: 'การดำเนินการ',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedStep(record);
              form.setFieldsValue({
                daysOverdueFrom: record.days_overdue_from,
                daysOverdueTo: record.days_overdue_to,
                actionType: record.action_type,
                priority: record.priority,
                assignedRole: record.assigned_role,
                slaHours: record.sla_hours,
              });
              setStepModalVisible(true);
            }}
          >
            แก้ไข
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteStep(record.id)}
          >
            ลบ
          </Button>
        </Space>
      ),
    },
  ];

  const taskColumns: ColumnsType<TaskAssignment> = [
    {
      title: 'Task ID',
      dataIndex: 'task_id',
      key: 'task_id',
      width: 150,
    },
    {
      title: 'ประเภท',
      dataIndex: 'task_type',
      key: 'task_type',
      width: 120,
      render: (type: string | null) => type || '-',
    },
    {
      title: 'ผู้รับผิดชอบ',
      key: 'assigned_to',
      width: 150,
      render: (_, record) =>
        `${record.users_task_assignments_assigned_toTousers.firstName} ${record.users_task_assignments_assigned_toTousers.lastName}`,
    },
    {
      title: 'ความสำคัญ',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => getPriorityTag(priority),
    },
    {
      title: 'กำหนดเวลา',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (date: string) => {
        const isOverdue = new Date(date) < new Date();
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {isOverdue && <ExclamationCircleOutlined style={{ marginRight: 4 }} />}
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
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'PENDING' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleCompleteTask(record.id)}
            >
              เสร็จสิ้น
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>ระบบจัดการติดตามหนี้</h1>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Workflow Steps Tab */}
        <TabPane tab="Workflow Steps" key="workflows">
          {workflowStats && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="ทั้งหมด" value={workflowStats.totalSteps} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="เปิดใช้งาน"
                    value={workflowStats.activeSteps}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="ปิดใช้งาน"
                    value={workflowStats.inactiveSteps}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          <Card
            title="Workflow Steps"
            extra={
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setSelectedStep(null);
                    form.resetFields();
                    setStepModalVisible(true);
                  }}
                >
                  เพิ่ม Step
                </Button>
                <Button icon={<ReloadOutlined />} onClick={loadData}>
                  รีเฟรช
                </Button>
              </Space>
            }
          >
            <Table
              columns={workflowColumns}
              dataSource={workflowSteps}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1000 }}
            />
          </Card>
        </TabPane>

        {/* Tasks Tab */}
        <TabPane
          tab={
            <Badge count={taskStats?.pending || 0} offset={[10, 0]}>
              <span>งานที่มอบหมาย</span>
            </Badge>
          }
          key="tasks"
        >
          {taskStats && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={4}>
                <Card>
                  <Statistic title="ทั้งหมด" value={taskStats.total} />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="รอดำเนินการ"
                    value={taskStats.pending}
                    valueStyle={{ color: '#faad14' }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="เสร็จสิ้น"
                    value={taskStats.completed}
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="ยกเลิก"
                    value={taskStats.cancelled}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="เกินกำหนด"
                    value={taskStats.overdue}
                    valueStyle={{ color: '#ff4d4f' }}
                    prefix={<ExclamationCircleOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          )}

          <Card
            title="รายการงาน"
            extra={
              <Space>
                <Select
                  value={taskStatusFilter}
                  onChange={setTaskStatusFilter}
                  style={{ width: 150 }}
                >
                  <Option value="pending">รอดำเนินการ</Option>
                  <Option value="completed">เสร็จสิ้น</Option>
                  <Option value="cancelled">ยกเลิก</Option>
                  <Option value="all">ทั้งหมด</Option>
                </Select>
                <Button icon={<ReloadOutlined />} onClick={loadData}>
                  รีเฟรช
                </Button>
              </Space>
            }
          >
            <Table
              columns={taskColumns}
              dataSource={tasks}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1000 }}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
              }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Workflow Step Modal */}
      <Modal
        title={selectedStep ? 'แก้ไข Workflow Step' : 'เพิ่ม Workflow Step'}
        open={stepModalVisible}
        onCancel={() => {
          setStepModalVisible(false);
          setSelectedStep(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={selectedStep ? handleUpdateStep : handleCreateStep}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="daysOverdueFrom"
                label="วันค้างชำระ (จาก)"
                rules={[{ required: true, message: 'กรุณาระบุ' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="daysOverdueTo" label="วันค้างชำระ (ถึง)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="actionType"
            label="การดำเนินการ"
            rules={[{ required: true, message: 'กรุณาระบุ' }]}
          >
            <Select>
              <Option value="SMS">ส่ง SMS</Option>
              <Option value="CALL">โทรศัพท์</Option>
              <Option value="EMAIL">ส่งอีเมล</Option>
              <Option value="VISIT">เยี่ยมลูกค้า</Option>
              <Option value="LEGAL">ดำเนินการทางกฎหมาย</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="priority"
            label="ความสำคัญ"
            rules={[{ required: true, message: 'กรุณาระบุ' }]}
          >
            <Select>
              <Option value="HIGH">สูง</Option>
              <Option value="MEDIUM">ปานกลาง</Option>
              <Option value="LOW">ต่ำ</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="assignedRole"
            label="บทบาทที่รับผิดชอบ"
            rules={[{ required: true, message: 'กรุณาระบุ' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="slaHours"
            label="SLA (ชั่วโมง)"
            rules={[{ required: true, message: 'กรุณาระบุ' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          {!selectedStep && (
            <Form.Item
              name="createdBy"
              label="ผู้สร้าง (User ID)"
              rules={[{ required: true, message: 'กรุณาระบุ' }]}
            >
              <Input />
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {selectedStep ? 'อัพเดท' : 'สร้าง'}
              </Button>
              <Button onClick={() => setStepModalVisible(false)}>ยกเลิก</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CollectionWorkflow;
