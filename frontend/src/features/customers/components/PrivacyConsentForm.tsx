import React, { useState, useEffect } from 'react';
import { Checkbox, Button, Card, Space, Typography, Divider, Alert, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

interface ConsentDefinition {
  type: string;
  version: string;
  text: {
    th: string;
    en: string;
  };
  required: boolean;
  category: 'essential' | 'functional' | 'marketing';
}

interface PrivacyConsentFormProps {
  customerId: string;
  onComplete?: () => void;
  showTitle?: boolean;
  language?: 'th' | 'en';
}

const CONSENT_DEFINITIONS: ConsentDefinition[] = [
  {
    type: 'PERSONAL_DATA_COLLECTION',
    version: '1.0',
    text: {
      th: 'ข้าพเจ้ายินยอมให้บริษัทฯ เก็บรวบรวมข้อมูลส่วนบุคคลของข้าพเจ้าเพื่อวัตถุประสงค์ในการพิจารณาสินเชื่อและการให้บริการทางการเงิน',
      en: 'I consent to the Company collecting my personal data for the purpose of credit consideration and financial services.'
    },
    required: true,
    category: 'essential'
  },
  {
    type: 'PERSONAL_DATA_USAGE',
    version: '1.0',
    text: {
      th: 'ข้าพเจ้ายินยอมให้บริษัทฯ ใช้ข้อมูลส่วนบุคคลของข้าพเจ้าเพื่อการดำเนินงานที่เกี่ยวข้องกับการให้บริการสินเชื่อ',
      en: 'I consent to the Company using my personal data for operations related to credit services.'
    },
    required: true,
    category: 'essential'
  },
  {
    type: 'PERSONAL_DATA_DISCLOSURE',
    version: '1.0',
    text: {
      th: 'ข้าพเจ้ายินยอมให้บริษัทฯ เปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าต่อหน่วยงานที่เกี่ยวข้องตามที่กฎหมายกำหนด',
      en: 'I consent to the Company disclosing my personal data to relevant authorities as required by law.'
    },
    required: true,
    category: 'essential'
  },
  {
    type: 'CREDIT_BUREAU_CHECK',
    version: '1.0',
    text: {
      th: 'ข้าพเจ้ายินยอมให้บริษัทฯ ตรวจสอบข้อมูลเครดิตของข้าพเจ้าจากบริษัทข้อมูลเครดิต',
      en: 'I consent to the Company checking my credit information from credit bureaus.'
    },
    required: true,
    category: 'functional'
  },
  {
    type: 'DATA_RETENTION',
    version: '1.0',
    text: {
      th: 'ข้าพเจ้ารับทราบและยินยอมให้บริษัทฯ เก็บรักษาข้อมูลส่วนบุคคลของข้าพเจ้าตามระยะเวลาที่กฎหมายกำหนด',
      en: 'I acknowledge and consent to the Company retaining my personal data for the period required by law.'
    },
    required: true,
    category: 'essential'
  },
  {
    type: 'MARKETING_COMMUNICATION',
    version: '1.0',
    text: {
      th: 'ข้าพเจ้ายินยอมให้บริษัทฯ ติดต่อข้าพเจ้าเพื่อวัตถุประสงค์ทางการตลาดและการแนะนำผลิตภัณฑ์ใหม่',
      en: 'I consent to the Company contacting me for marketing purposes and introducing new products.'
    },
    required: false,
    category: 'marketing'
  },
  {
    type: 'THIRD_PARTY_SHARING',
    version: '1.0',
    text: {
      th: 'ข้าพเจ้ายินยอมให้บริษัทฯ แบ่งปันข้อมูลของข้าพเจ้ากับบุคคลที่สามที่เป็นพันธมิตรทางธุรกิจ',
      en: 'I consent to the Company sharing my data with third-party business partners.'
    },
    required: false,
    category: 'functional'
  }
];

const CATEGORY_LABELS = {
  th: {
    essential: 'จำเป็น (Essential)',
    functional: 'การทำงาน (Functional)',
    marketing: 'การตลาด (Marketing)'
  },
  en: {
    essential: 'Essential',
    functional: 'Functional',
    marketing: 'Marketing'
  }
};

export const PrivacyConsentForm: React.FC<PrivacyConsentFormProps> = ({
  customerId,
  onComplete,
  showTitle = true,
  language = 'th'
}) => {
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingConsents, setExistingConsents] = useState<any[]>([]);

  useEffect(() => {
    loadExistingConsents();
  }, [customerId]);

  const loadExistingConsents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/privacy-consents/customer/${customerId}`);
      setExistingConsents(response.data);
      
      // Pre-fill granted consents
      const consentMap: Record<string, boolean> = {};
      response.data.forEach((consent: any) => {
        if (consent.granted && !consent.revoked_at) {
          consentMap[consent.consent_type] = true;
        }
      });
      setConsents(consentMap);
    } catch (error) {
      console.error('Failed to load consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = (type: string, checked: boolean) => {
    setConsents(prev => ({ ...prev, [type]: checked }));
  };

  const handleSubmit = async () => {
    // Check if all required consents are granted
    const requiredConsents = CONSENT_DEFINITIONS.filter(c => c.required);
    const missingRequired = requiredConsents.some(c => !consents[c.type]);

    if (missingRequired) {
      alert(language === 'th' 
        ? 'กรุณายินยอมข้อตกลงที่จำเป็นทั้งหมด' 
        : 'Please accept all required consents');
      return;
    }

    setSubmitting(true);
    try {
      const consentData = CONSENT_DEFINITIONS.map(def => ({
        consentType: def.type,
        consentVersion: def.version,
        consentText: def.text[language],
        granted: consents[def.type] || false,
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent
      }));

      await axios.post('/api/privacy-consents/bulk', {
        customerId,
        consents: consentData
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to save consents:', error);
      alert(language === 'th' 
        ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' 
        : 'Failed to save consents');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = () => {
    const requiredConsents = CONSENT_DEFINITIONS.filter(c => c.required);
    return requiredConsents.every(c => consents[c.type]);
  };

  if (loading) {
    return <Spin size="large" />;
  }

  const groupedConsents = CONSENT_DEFINITIONS.reduce((acc, consent) => {
    if (!acc[consent.category]) {
      acc[consent.category] = [];
    }
    acc[consent.category].push(consent);
    return acc;
  }, {} as Record<string, ConsentDefinition[]>);

  return (
    <Card>
      {showTitle && (
        <Title level={3}>
          {language === 'th' ? 'ความยินยอมในการเก็บรวบรวมข้อมูลส่วนบุคคล' : 'Privacy Consent'}
        </Title>
      )}

      <Alert
        message={language === 'th' ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}
        description={
          language === 'th'
            ? 'กรุณาอ่านและยินยอมในการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่าน ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562'
            : 'Please read and consent to the collection, use, and disclosure of your personal data in accordance with the Personal Data Protection Act B.E. 2562'
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {Object.entries(groupedConsents).map(([category, items]) => (
          <div key={category}>
            <Title level={5}>
              {CATEGORY_LABELS[language][category as keyof typeof CATEGORY_LABELS.th]}
            </Title>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {items.map(consent => (
                <Card
                  key={consent.type}
                  size="small"
                  style={{
                    borderLeft: consent.required ? '3px solid #1890ff' : '3px solid #d9d9d9'
                  }}
                >
                  <Checkbox
                    checked={consents[consent.type] || false}
                    onChange={(e) => handleConsentChange(consent.type, e.target.checked)}
                    disabled={submitting}
                  >
                    <Space direction="vertical" size={0}>
                      <Text strong>
                        {consent.text[language]}
                        {consent.required && (
                          <Text type="danger"> *</Text>
                        )}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {language === 'th' ? 'เวอร์ชัน' : 'Version'}: {consent.version}
                      </Text>
                    </Space>
                  </Checkbox>
                </Card>
              ))}
            </Space>
            <Divider />
          </div>
        ))}
      </Space>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Button
          type="primary"
          size="large"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!canSubmit()}
          icon={canSubmit() ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {language === 'th' ? 'ยืนยันความยินยอม' : 'Confirm Consent'}
        </Button>
      </div>

      <Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
        {language === 'th'
          ? '* ข้อตกลงที่มีเครื่องหมายดอกจันสีแดงเป็นข้อตกลงที่จำเป็นสำหรับการให้บริการ'
          : '* Items marked with a red asterisk are required for service provision'}
      </Paragraph>
    </Card>
  );
};

export default PrivacyConsentForm;
