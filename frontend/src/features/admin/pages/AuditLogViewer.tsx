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
  DatePicker,
  Select,
  Input,
  Tabs,
  Modal,
  Descriptions,
  Timeline,
  Badge,
  Alert
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  ExportOutlined
} from '@ant-design/icons';
import axios from 'axios';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Option } = Select;

interface DataAccessLog {
  id: string;
  user_id: string;
  customer_id: string;
  access_type: string;
  resource_type: string;
  resource_id: string;
  accessed_at: string;
  ip_address?: string;
  users?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  customers?: {
    business_name: string;
    tax_id: string;
  };
}

interface SuspiciousReport {
  id: string;
  customer_id: string;
  activity_type: string;
  severity: string;
  description: string;
  status: string;
  reported_at: string;
  customers?: {
    business_name: string;
  };
  users?: {
    first_name: string;
    last_name: string;
  };
}

interface AuditStats {
  totalDataAccess: number;
  totalInvoiceAccess: number;
  totalSuspicious: number;
  suspiciousByStatus: Record<string, number>;
  suspiciousBySeverity: Record<string, number>;
  accessByType: Record<string, number>;
}

const getAccessTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    VIEW: <EyeOutlined />,
    EDIT: <EditOutlined />,
    DELETE: <DeleteOutlined />,
    EXPORT: <ExportOutlined />,
    DOWNLOAD: <DownloadOutlined />
  };
  return icons[type] || <EyeOutlined />;
};

const getSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    LOW: 'success',
    MEDIUM: 'warning',
    HIGH: 'error',
    CRITICAL: 'error'
  };
  return colors[severity] || 'default';
};

export const AuditLogViewer: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [dataAccessLogs, setDataAccessLogs] = useState<DataAccessLog[]>([]);
  const [suspiciousReports, setSuspiciousReports] = useState<SuspiciousReport[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [searchCustomerId, setSearchCustomerId] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  useEffect(() => {
    loadData();
  }, [dateRange, filterSeverity, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateRange) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }

      const [statsRes, suspiciousRes] = await Promise.all([
        axios.get('/api/audit-logs/stats', { params }),
        axios.get('/api/audit-logs/suspicious', {
          params: {
            severity: filterSeverity,
            status: filterStatus,
            limit: 50
          }
        })
      ]);

      setStats(statsRes.data);
      setSuspiciousReports(suspiciousRes.data);
    } catch (error) {
      console.error('Failed to load audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerLogs = async (customerId: string) => {
    try {
      const response = await axios.get(`/api/audit-logs/customer/${customerId}`);
      setDataAccessLogs(response.data);
    } catch (error) {
      console.error('Failed to load customer logs:', error);
    }
  };

  const handleSearch = () => {
    if (searchCustomerId) {
      loadCustomerLogs(searchCustomerId);
    }
  };

  const showDetail = (record: any) => {
    setSelectedLog(record);
    setDetailModalVisible(true);
  };

  const handleExport = async () => {
    if (!dateRange) {
      alert('Please select a date range');
      return;
    }

    try {
      const response = await axios.post('/api/audit-logs/export', {
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString()
      });

      // Convert to CSV and download
      const csv = convertToCSV(response.data);
      downloadCSV(csv, 'audit-logs.csv');
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    return [headers, ...rows].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const dataAccessColumns: ColumnsType<DataAccessLog> = [
    {
      title: 'Time',
      dataIndex: 'accessed_at',
      key: 'accessed_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => new Date(a.accessed_at).getTime() - new Date(b.accessed_at).getTime()
    },
    {
      title: 'User',
      dataIndex: 'users',
      key: 'user',
      render: (user) => user ? `${user.first_name} ${user.last_name}` : '-'
    },
    {
      title: 'Customer',
      dataIndex: 'customers',
      key: 'customer',
      render: (customer) => customer?.business_name || '-'
    },
    {
      title: 'Access Type',
      dataIndex: 'access_type',
      key: 'access_type',
      render: (type) => (
        <Tag icon={getAccessTypeIcon(type)}>{type}</Tag>
      )
    },
    {
      title: 'Resource',
      dataIndex: 'resource_type',
      key: 'resource_type',
      render: (type) => <Tag color="blue">{type}</Tag>
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showDetail(record)}
        >
          View
        </Button>
      )
    }
  ];

  const suspiciousColumns: ColumnsType<SuspiciousReport> = [
    {
      title: 'Reported',
      dataIndex: 'reported_at',
      key: 'reported_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => new Date(a.reported_at).getTime() - new Date(b.reported_at).getTime()
    },
    {
      title: 'Customer',
      dataIndex: ['customers', 'business_name'],
      key: 'customer'
    },
    {
      title: 'Activity Type',
      dataIndex: 'activity_type',
      key: 'activity_type',
      render: (type) => <Tag>{type}</Tag>
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => (
        <Tag color={getSeverityColor(severity)} icon={<WarningOutlined />}>
          {severity}
        </Tag>
      ),
      sorter: (a, b) => {
        const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return order[a.severity as keyof typeof order] - order[b.severity as keyof typeof order];
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors: Record<string, string> = {
          PENDING: 'warning',
          INVESTIGATING: 'processing',
          RESOLVED: 'success',
          FALSE_POSITIVE: 'default'
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showDetail(record)}
        >
          View
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Audit Log Viewer</h1>
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            />
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={handleExport}
              disabled={!dateRange}
            >
              Export
            </Button>
          </Space>
        </div>

        {/* Statistics */}
        {stats && (
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Data Access Logs"
                  value={stats.totalDataAccess}
                  prefix={<EyeOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Invoice Access"
                  value={stats.totalInvoiceAccess}
                  prefix={<DownloadOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Suspicious Reports"
                  value={stats.totalSuspicious}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Critical Alerts"
                  value={stats.suspiciousBySeverity.CRITICAL || 0}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Search */}
        <Card title="Search Customer Logs">
          <Space>
            <Input
              placeholder="Enter Customer ID"
              value={searchCustomerId}
              onChange={(e) => setSearchCustomerId(e.target.value)}
              style={{ width: 300 }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
            >
              Search
            </Button>
          </Space>
        </Card>

        {/* Tabs */}
        <Card>
          <Tabs defaultActiveKey="suspicious">
            <TabPane tab="Suspicious Activity" key="suspicious">
              <Space style={{ marginBottom: 16 }}>
                <Select
                  placeholder="Filter by Severity"
                  style={{ width: 150 }}
                  allowClear
                  value={filterSeverity}
                  onChange={setFilterSeverity}
                >
                  <Option value="LOW">Low</Option>
                  <Option value="MEDIUM">Medium</Option>
                  <Option value="HIGH">High</Option>
                  <Option value="CRITICAL">Critical</Option>
                </Select>
                <Select
                  placeholder="Filter by Status"
                  style={{ width: 150 }}
                  allowClear
                  value={filterStatus}
                  onChange={setFilterStatus}
                >
                  <Option value="PENDING">Pending</Option>
                  <Option value="INVESTIGATING">Investigating</Option>
                  <Option value="RESOLVED">Resolved</Option>
                  <Option value="FALSE_POSITIVE">False Positive</Option>
                </Select>
              </Space>
              <Table
                columns={suspiciousColumns}
                dataSource={suspiciousReports}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
            <TabPane tab="Data Access Logs" key="access">
              <Table
                columns={dataAccessColumns}
                dataSource={dataAccessLogs}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      {/* Detail Modal */}
      <Modal
        title="Log Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedLog && (
          <Descriptions bordered column={2}>
            {Object.entries(selectedLog).map(([key, value]) => (
              <Descriptions.Item label={key} key={key} span={2}>
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogViewer;
