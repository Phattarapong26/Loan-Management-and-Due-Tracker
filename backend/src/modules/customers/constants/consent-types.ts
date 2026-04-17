export const CONSENT_TYPES = {
  PERSONAL_DATA_COLLECTION: 'PERSONAL_DATA_COLLECTION',
  PERSONAL_DATA_USAGE: 'PERSONAL_DATA_USAGE',
  PERSONAL_DATA_DISCLOSURE: 'PERSONAL_DATA_DISCLOSURE',
  MARKETING_COMMUNICATION: 'MARKETING_COMMUNICATION',
  CREDIT_BUREAU_CHECK: 'CREDIT_BUREAU_CHECK',
  DATA_RETENTION: 'DATA_RETENTION',
  THIRD_PARTY_SHARING: 'THIRD_PARTY_SHARING'
} as const;

export const CONSENT_VERSIONS = {
  PERSONAL_DATA_COLLECTION: '1.0',
  PERSONAL_DATA_USAGE: '1.0',
  PERSONAL_DATA_DISCLOSURE: '1.0',
  MARKETING_COMMUNICATION: '1.0',
  CREDIT_BUREAU_CHECK: '1.0',
  DATA_RETENTION: '1.0',
  THIRD_PARTY_SHARING: '1.0'
} as const;

export const CONSENT_TEXTS = {
  PERSONAL_DATA_COLLECTION: {
    th: 'ข้าพเจ้ายินยอมให้บริษัทฯ เก็บรวบรวมข้อมูลส่วนบุคคลของข้าพเจ้าเพื่อวัตถุประสงค์ในการพิจารณาสินเชื่อและการให้บริการทางการเงิน',
    en: 'I consent to the Company collecting my personal data for the purpose of credit consideration and financial services.'
  },
  PERSONAL_DATA_USAGE: {
    th: 'ข้าพเจ้ายินยอมให้บริษัทฯ ใช้ข้อมูลส่วนบุคคลของข้าพเจ้าเพื่อการดำเนินงานที่เกี่ยวข้องกับการให้บริการสินเชื่อ',
    en: 'I consent to the Company using my personal data for operations related to credit services.'
  },
  PERSONAL_DATA_DISCLOSURE: {
    th: 'ข้าพเจ้ายินยอมให้บริษัทฯ เปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าต่อหน่วยงานที่เกี่ยวข้องตามที่กฎหมายกำหนด',
    en: 'I consent to the Company disclosing my personal data to relevant authorities as required by law.'
  },
  MARKETING_COMMUNICATION: {
    th: 'ข้าพเจ้ายินยอมให้บริษัทฯ ติดต่อข้าพเจ้าเพื่อวัตถุประสงค์ทางการตลาดและการแนะนำผลิตภัณฑ์ใหม่',
    en: 'I consent to the Company contacting me for marketing purposes and introducing new products.'
  },
  CREDIT_BUREAU_CHECK: {
    th: 'ข้าพเจ้ายินยอมให้บริษัทฯ ตรวจสอบข้อมูลเครดิตของข้าพเจ้าจากบริษัทข้อมูลเครดิต',
    en: 'I consent to the Company checking my credit information from credit bureaus.'
  },
  DATA_RETENTION: {
    th: 'ข้าพเจ้ารับทราบและยินยอมให้บริษัทฯ เก็บรักษาข้อมูลส่วนบุคคลของข้าพเจ้าตามระยะเวลาที่กฎหมายกำหนด',
    en: 'I acknowledge and consent to the Company retaining my personal data for the period required by law.'
  },
  THIRD_PARTY_SHARING: {
    th: 'ข้าพเจ้ายินยอมให้บริษัทฯ แบ่งปันข้อมูลของข้าพเจ้ากับบุคคลที่สามที่เป็นพันธมิตรทางธุรกิจ',
    en: 'I consent to the Company sharing my data with third-party business partners.'
  }
} as const;

export type ConsentType = keyof typeof CONSENT_TYPES;

export interface ConsentDefinition {
  type: ConsentType;
  version: string;
  text: {
    th: string;
    en: string;
  };
  required: boolean;
  category: 'essential' | 'functional' | 'marketing';
}

export const CONSENT_DEFINITIONS: ConsentDefinition[] = [
  {
    type: 'PERSONAL_DATA_COLLECTION',
    version: CONSENT_VERSIONS.PERSONAL_DATA_COLLECTION,
    text: CONSENT_TEXTS.PERSONAL_DATA_COLLECTION,
    required: true,
    category: 'essential'
  },
  {
    type: 'PERSONAL_DATA_USAGE',
    version: CONSENT_VERSIONS.PERSONAL_DATA_USAGE,
    text: CONSENT_TEXTS.PERSONAL_DATA_USAGE,
    required: true,
    category: 'essential'
  },
  {
    type: 'PERSONAL_DATA_DISCLOSURE',
    version: CONSENT_VERSIONS.PERSONAL_DATA_DISCLOSURE,
    text: CONSENT_TEXTS.PERSONAL_DATA_DISCLOSURE,
    required: true,
    category: 'essential'
  },
  {
    type: 'CREDIT_BUREAU_CHECK',
    version: CONSENT_VERSIONS.CREDIT_BUREAU_CHECK,
    text: CONSENT_TEXTS.CREDIT_BUREAU_CHECK,
    required: true,
    category: 'functional'
  },
  {
    type: 'DATA_RETENTION',
    version: CONSENT_VERSIONS.DATA_RETENTION,
    text: CONSENT_TEXTS.DATA_RETENTION,
    required: true,
    category: 'essential'
  },
  {
    type: 'MARKETING_COMMUNICATION',
    version: CONSENT_VERSIONS.MARKETING_COMMUNICATION,
    text: CONSENT_TEXTS.MARKETING_COMMUNICATION,
    required: false,
    category: 'marketing'
  },
  {
    type: 'THIRD_PARTY_SHARING',
    version: CONSENT_VERSIONS.THIRD_PARTY_SHARING,
    text: CONSENT_TEXTS.THIRD_PARTY_SHARING,
    required: false,
    category: 'functional'
  }
];
