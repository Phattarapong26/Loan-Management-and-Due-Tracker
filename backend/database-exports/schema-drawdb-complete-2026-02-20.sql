-- Generated DrawDB Schema with Relationships
-- Generated at: 2026-02-21T00:09:54.551Z
-- Total Tables: 72

CREATE TABLE branches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  avatar TEXT,
  branch_id TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  password_changed_at TIMESTAMP,
  national_id TEXT,
  line_user_id TEXT UNIQUE,
  line_linked_at TIMESTAMP,
  line_active BOOLEAN NOT NULL DEFAULT true,
  line_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  monthly_target DECIMAL DEFAULT 100000.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL,
  last_login_at TIMESTAMP
);

CREATE TABLE approval_limits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  min_amount DECIMAL NOT NULL DEFAULT 0,
  max_amount DECIMAL,
  approval_level TEXT NOT NULL,
  requires_next_level BOOLEAN NOT NULL DEFAULT false,
  sla_hours INTEGER NOT NULL DEFAULT 24,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  refresh_token TEXT UNIQUE,
  previous_token TEXT,
  previous_token_expires_at TIMESTAMP,
  previous_refresh_token TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  loan_id TEXT,
  amount DECIMAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'THB',
  from_account TEXT,
  to_account TEXT,
  reference TEXT UNIQUE,
  description TEXT,
  metadata JSONB,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE next_payment_invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  loan_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  payment_schedule_id TEXT NOT NULL,
  invoice_data JSONB NOT NULL,
  generated_by TEXT NOT NULL,
  sent_at TIMESTAMP,
  sent_via TEXT,
  sent_by TEXT,
  paid_at TIMESTAMP,
  paid_amount DECIMAL,
  payment_method TEXT,
  receipt_number TEXT,
  valid_until TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE payment_receipts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  payment_id TEXT NOT NULL,
  loan_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  invoice_id TEXT,
  amount DECIMAL NOT NULL,
  payment_date TIMESTAMP NOT NULL,
  payment_method TEXT NOT NULL,
  receipt_data JSONB NOT NULL,
  issued_by TEXT NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  sent_via TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE interest_rate_tiers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_product_id TEXT,
  tier_name TEXT NOT NULL,
  min_amount DECIMAL NOT NULL,
  max_amount DECIMAL,
  interest_rate DECIMAL NOT NULL,
  grace_period_days INTEGER NOT NULL DEFAULT 0,
  effective_from TIMESTAMP NOT NULL,
  effective_until TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE year_interest_tiers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_product_id TEXT NOT NULL,
  tier_type TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  end_year TEXT NOT NULL,
  rate DECIMAL,
  formula TEXT,
  min_rate DECIMAL,
  max_rate DECIMAL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE loan_interest_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id TEXT NOT NULL,
  payment_number INTEGER NOT NULL,
  outstanding_balance DECIMAL NOT NULL,
  applied_rate DECIMAL NOT NULL,
  tier_name TEXT,
  grace_period_days INTEGER NOT NULL DEFAULT 0,
  interest_amount DECIMAL NOT NULL,
  calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_date TIMESTAMP NOT NULL
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  branch_id TEXT NOT NULL,
  customer_code TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT,
  business_registration_date TIMESTAMP,
  business_registration_type VARCHAR(50),
  registered_capital DECIMAL,
  business_size VARCHAR(20),
  industry_code VARCHAR(10),
  business_age_years INTEGER,
  number_of_employees INTEGER,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  business_address TEXT,
  business_phone TEXT,
  thai_id TEXT,
  tax_id TEXT NOT NULL UNIQUE,
  avatar TEXT,
  shareholders JSONB,
  signatories JSONB,
  annual_revenue DECIMAL,
  net_profit DECIMAL,
  total_assets DECIMAL,
  total_liabilities DECIMAL,
  debt_to_equity_ratio DECIMAL,
  ai_extracted_data JSONB,
  ai_confidence_score DECIMAL,
  ai_processed_at TIMESTAMP,
  document_complete BOOLEAN NOT NULL DEFAULT false,
  line_user_id TEXT UNIQUE,
  line_linked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE loans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  officer_id TEXT NOT NULL,
  contract_number TEXT UNIQUE,
  principal DECIMAL NOT NULL,
  interest_rate DECIMAL NOT NULL,
  term_months INTEGER NOT NULL,
  current_principal DECIMAL,
  version INTEGER NOT NULL DEFAULT 1,
  interest_calculation_method TEXT DEFAULT 'DYNAMIC_PRINCIPAL',
  last_interest_calculation_date TIMESTAMP,
  accumulated_interest DECIMAL DEFAULT 0,
  payment_day INTEGER NOT NULL DEFAULT 1,
  first_payment_date TIMESTAMP,
  payment_day_adjustment TEXT DEFAULT 'LAST_DAY',
  dscr DECIMAL,
  dscr_status TEXT,
  monthly_payment DECIMAL,
  total_interest DECIMAL,
  allow_early_payment BOOLEAN DEFAULT true,
  early_payment_penalty_rate DECIMAL DEFAULT 0,
  sla_status VARCHAR(20),
  sla_deadline TIMESTAMP,
  approved_by TEXT,
  approved_at TIMESTAMP,
  rejected_by TEXT,
  rejected_at TIMESTAMP,
  rejected_reason TEXT,
  approval_history JSONB,
  disbursement_date TIMESTAMP,
  maturity_date TIMESTAMP,
  outstanding_balance DECIMAL NOT NULL DEFAULT 0,
  next_payment_date TIMESTAMP,
  next_payment_amount DECIMAL,
  last_payment_date TIMESTAMP,
  overdue_days INTEGER NOT NULL DEFAULT 0,
  total_disbursed DECIMAL NOT NULL DEFAULT 0,
  remaining_amount DECIMAL,
  product_config_id TEXT,
  product_config JSONB,
  loan_product_id TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL,
  aging_analysis TEXT
);

CREATE TABLE payment_schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id TEXT NOT NULL,
  payment_number INTEGER NOT NULL,
  payment_date TIMESTAMP NOT NULL,
  principal_amount DECIMAL NOT NULL,
  interest_amount DECIMAL NOT NULL,
  total_payment DECIMAL NOT NULL,
  remaining_balance DECIMAL NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  paid_at TIMESTAMP,
  statement_number TEXT,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  penalty_amount DECIMAL NOT NULL DEFAULT 0,
  compound_interest_amount DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id TEXT NOT NULL,
  payment_schedule_id TEXT,
  amount DECIMAL NOT NULL,
  payment_date TIMESTAMP NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  interest_saved DECIMAL,
  penalty_amount DECIMAL,
  notes TEXT,
  reference TEXT UNIQUE,
  idempotency_key TEXT UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  processed_at TIMESTAMP,
  payment_gateway VARCHAR(50),
  gateway_reference TEXT,
  gateway_response JSONB,
  bank_name VARCHAR(100),
  account_number VARCHAR(20),
  verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  ai_processed BOOLEAN NOT NULL DEFAULT false,
  ai_status TEXT,
  extracted_data JSONB,
  confidence_score DECIMAL,
  enhanced_data JSONB,
  document_subtype TEXT,
  processing_version TEXT DEFAULT 'v1',
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  rejected_reason TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE contact_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  loan_id TEXT,
  officer_id TEXT NOT NULL,
  contact_date TIMESTAMP NOT NULL,
  notes TEXT NOT NULL,
  promised_date TIMESTAMP,
  task_id TEXT,
  next_follow_up_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  active_from TIMESTAMP NOT NULL,
  active_until TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE loan_products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  product_name_en TEXT,
  description TEXT,
  min_revenue DECIMAL,
  max_revenue DECIMAL,
  min_years_in_business INTEGER,
  min_loan_amount DECIMAL,
  max_loan_amount DECIMAL NOT NULL,
  total_project_budget DECIMAL,
  interest_rate_year_1_3 DECIMAL,
  interest_rate_year_4_plus DECIMAL,
  interest_rate_formula TEXT,
  government_subsidy BOOLEAN NOT NULL DEFAULT false,
  subsidy_details TEXT,
  max_term_months INTEGER NOT NULL,
  grace_period_months INTEGER DEFAULT 0,
  collateral_required BOOLEAN NOT NULL DEFAULT true,
  collateral_details TEXT,
  project_start_date TIMESTAMP,
  project_end_date TIMESTAMP,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE penalty_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_product_id TEXT,
  rule_name TEXT NOT NULL,
  days_overdue_from INTEGER NOT NULL DEFAULT 1,
  days_overdue_to INTEGER,
  penalty_type TEXT NOT NULL,
  penalty_rate DECIMAL,
  penalty_amount DECIMAL,
  compound_interest BOOLEAN NOT NULL DEFAULT false,
  compound_rate DECIMAL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE customer_active_products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  loan_product_id TEXT NOT NULL,
  loan_id TEXT NOT NULL,
  activated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE system_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  updated_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  description TEXT NOT NULL,
  receipt_path TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP,
  rejected_by TEXT,
  rejected_at TIMESTAMP,
  rejected_reason TEXT,
  reimbursed BOOLEAN NOT NULL DEFAULT false,
  reimbursed_at TIMESTAMP,
  reimbursed_by TEXT,
  expense_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE loan_disbursements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id TEXT NOT NULL,
  disbursement_no INTEGER NOT NULL,
  amount DECIMAL NOT NULL,
  purpose TEXT NOT NULL,
  requested_date TIMESTAMP NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMP,
  rejected_by TEXT,
  rejected_at TIMESTAMP,
  rejected_reason TEXT,
  disbursed_by TEXT,
  disbursed_at TIMESTAMP,
  disbursement_method TEXT,
  reference_no TEXT,
  next_disbursement_date TIMESTAMP,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  event_id TEXT,
  dedup_key TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMP,
  action_id TEXT,
  action_label TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_audience_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE notification_actions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  action_id TEXT NOT NULL,
  label TEXT NOT NULL,
  link TEXT NOT NULL,
  requires_confirmation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  all_day BOOLEAN NOT NULL DEFAULT false,
  loan_id TEXT,
  customer_id TEXT,
  recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  location TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE conversation_states (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT NOT NULL UNIQUE,
  flow TEXT NOT NULL,
  step TEXT NOT NULL,
  data JSONB,
  state TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE registration_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  user_id TEXT,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promptpay_qr_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id TEXT NOT NULL,
  payment_ref TEXT NOT NULL UNIQUE,
  amount_expected DECIMAL NOT NULL,
  qr_code_data TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_schedule_id TEXT NOT NULL,
  loan_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  invoice_data JSONB NOT NULL,
  sent_at TIMESTAMP,
  sent_via TEXT,
  viewed_at TIMESTAMP,
  generated_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE invoice_access_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE aging_analysis (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  current_age INTEGER NOT NULL DEFAULT 0,
  aging_bucket VARCHAR(20) NOT NULL,
  principal_overdue DECIMAL DEFAULT 0,
  interest_overdue DECIMAL DEFAULT 0,
  penalty_overdue DECIMAL DEFAULT 0,
  total_overdue DECIMAL DEFAULT 0,
  collection_agent_id TEXT,
  collection_strategy VARCHAR(50),
  next_action_date TIMESTAMP,
  "status" VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE aml_checks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  check_type VARCHAR(50) NOT NULL,
  check_result VARCHAR(20) NOT NULL,
  match_score DECIMAL,
  matched_names JSONB,
  check_data JSONB,
  performed_by TEXT,
  performed_at TIMESTAMP,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budget_consumption (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  product_budget_id TEXT NOT NULL,
  loan_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  requested_amount DECIMAL NOT NULL,
  approved_amount DECIMAL NOT NULL,
  disbursed_amount DECIMAL DEFAULT 0,
  consumption_type VARCHAR(20) NOT NULL,
  "status" VARCHAR(20) DEFAULT 'ACTIVE',
  consumption_date TIMESTAMP NOT NULL,
  consumption_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_by TEXT,
  released_amount DECIMAL DEFAULT 0,
  released_at TIMESTAMP,
  released_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE collection_workflow_steps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  days_overdue_from INTEGER NOT NULL,
  days_overdue_to INTEGER,
  action_type VARCHAR(50) NOT NULL,
  template_id TEXT,
  priority VARCHAR(20) NOT NULL,
  assigned_role VARCHAR(50) NOT NULL,
  sla_hours INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_line_drawdowns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_line_id TEXT NOT NULL,
  drawdown_number VARCHAR(50) NOT NULL UNIQUE,
  amount DECIMAL NOT NULL,
  purpose TEXT NOT NULL,
  drawdown_date TIMESTAMP NOT NULL,
  maturity_date TIMESTAMP NOT NULL,
  interest_rate DECIMAL NOT NULL,
  "status" VARCHAR(20) DEFAULT 'ACTIVE',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_lines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  credit_line_number VARCHAR(50) NOT NULL UNIQUE,
  approved_limit DECIMAL NOT NULL,
  current_balance DECIMAL DEFAULT 0,
  available_balance DECIMAL DEFAULT 0,
  utilization_rate DECIMAL DEFAULT 0,
  interest_rate DECIMAL NOT NULL,
  start_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  review_date TIMESTAMP,
  "status" VARCHAR(20) DEFAULT 'ACTIVE',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE data_access_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  access_type VARCHAR(50) NOT NULL,
  access_path TEXT NOT NULL,
  purpose TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loan_approval_workflow (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id TEXT NOT NULL,
  approval_level INTEGER NOT NULL DEFAULT 1,
  approver_id TEXT,
  approval_status VARCHAR(20) DEFAULT 'PENDING',
  approved_amount DECIMAL,
  approval_notes TEXT,
  sla_deadline TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE principal_prepayments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id TEXT NOT NULL,
  payment_schedule_id TEXT,
  amount DECIMAL NOT NULL,
  prepayment_date TIMESTAMP NOT NULL,
  interest_saved DECIMAL DEFAULT 0,
  new_monthly_payment DECIMAL,
  new_maturity_date TIMESTAMP,
  penalty_amount DECIMAL DEFAULT 0,
  processed_by TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE privacy_consents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  consent_type VARCHAR(100) NOT NULL,
  consent_version VARCHAR(20) NOT NULL,
  consent_text TEXT NOT NULL,
  given BOOLEAN NOT NULL DEFAULT false,
  given_at TIMESTAMP,
  withdrawn BOOLEAN DEFAULT false,
  withdrawn_at TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_budgets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  quarter INTEGER,
  total_budget_amount DECIMAL NOT NULL,
  committed_amount DECIMAL DEFAULT 0,
  disbursed_amount DECIMAL DEFAULT 0,
  pending_amount DECIMAL DEFAULT 0,
  available_amount DECIMAL DEFAULT 0,
  utilization_rate DECIMAL DEFAULT 0,
  warning_threshold DECIMAL DEFAULT 80.00,
  critical_threshold DECIMAL DEFAULT 95.00,
  budget_status VARCHAR(20) DEFAULT 'ACTIVE',
  budget_owner TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE suspicious_transaction_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id TEXT,
  transaction_id TEXT,
  suspicion_type VARCHAR(100) NOT NULL,
  suspicion_details TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  review_status VARCHAR(20) DEFAULT 'PENDING',
  submitted_to VARCHAR(100),
  submitted_at TIMESTAMP,
  amlo_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_assignments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL,
  assigned_to TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  due_date TIMESTAMP NOT NULL,
  completion_date TIMESTAMP,
  "status" VARCHAR(20) DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE payment_timeline_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id TEXT NOT NULL,
  payment_schedule_id TEXT NOT NULL,
  scheduled_date TIMESTAMP NOT NULL,
  executed_at TIMESTAMP,
  metadata JSONB,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE thai_banks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code VARCHAR(10) NOT NULL UNIQUE,
  bank_name VARCHAR(100) NOT NULL,
  bank_name_th VARCHAR(100) NOT NULL,
  bank_name_en VARCHAR(100) NOT NULL,
  logo_url TEXT,
  color_code VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE security_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  threat_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  payload TEXT,
  blocked BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE security_alerts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_id TEXT,
  endpoint TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  resolved_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE blocked_ips (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_by TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_vat_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  month TEXT NOT NULL,
  "year" INTEGER,
  sales_amount DECIMAL NOT NULL DEFAULT 0,
  sales_tax DECIMAL NOT NULL DEFAULT 0,
  purchase_amount DECIMAL NOT NULL DEFAULT 0,
  purchase_tax DECIMAL NOT NULL DEFAULT 0,
  tax_payable DECIMAL NOT NULL DEFAULT 0,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE customer_investments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  description TEXT NOT NULL,
  total_amount DECIMAL NOT NULL DEFAULT 0,
  own_share DECIMAL NOT NULL DEFAULT 0,
  loan_share DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE customer_financial_statements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  "year" TEXT NOT NULL,
  revenue DECIMAL,
  gross_profit DECIMAL,
  net_profit DECIMAL,
  cost_of_sales DECIMAL,
  selling_expenses DECIMAL,
  admin_expenses DECIMAL,
  ebitda DECIMAL,
  total_assets DECIMAL,
  total_liabilities DECIMAL,
  total_equity DECIMAL,
  current_assets DECIMAL,
  non_current_assets DECIMAL,
  current_liabilities DECIMAL,
  non_current_liabilities DECIMAL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE customer_working_capitals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  total_limit DECIMAL NOT NULL DEFAULT 0,
  used_limit DECIMAL NOT NULL DEFAULT 0,
  stock_amount DECIMAL,
  receivable_days INTEGER,
  payable_days INTEGER,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE customer_projections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  "year" TEXT NOT NULL,
  revenue DECIMAL,
  cost_of_sales DECIMAL,
  gross_profit DECIMAL,
  expenses DECIMAL,
  net_profit DECIMAL,
  dscr DECIMAL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE customer_credit_bureaus (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  "type" TEXT NOT NULL,
  name TEXT NOT NULL,
  check_date TIMESTAMP,
  total_limit DECIMAL,
  total_outstanding DECIMAL,
  number_of_accounts INTEGER,
  npl_status BOOLEAN NOT NULL DEFAULT false,
  accounts JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE customer_bank_statements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE customer_bank_statement_months (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id TEXT NOT NULL,
  month TEXT NOT NULL,
  withdraw_count INTEGER NOT NULL DEFAULT 0,
  withdraw_amount DECIMAL NOT NULL DEFAULT 0,
  deposit_count INTEGER NOT NULL DEFAULT 0,
  deposit_amount DECIMAL NOT NULL DEFAULT 0,
  balance DECIMAL NOT NULL DEFAULT 0
);

CREATE TABLE customer_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  topic TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_business_histories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  "type" TEXT NOT NULL,
  content TEXT,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE secure_document_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_access_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  reason TEXT,
  accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_business_profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  source_file_hash TEXT,
  document_id TEXT,
  parser_version TEXT NOT NULL DEFAULT 'v3.0',
  match_confidence DECIMAL NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  previous_version_id TEXT,
  enhanced_data JSONB,
  recommendation TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP
);

CREATE TABLE customer_shareholders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  national_id TEXT,
  share_percentage DECIMAL NOT NULL,
  share_value DECIMAL NOT NULL,
  share_type TEXT DEFAULT 'ORDINARY',
  has_signing_authority BOOLEAN NOT NULL DEFAULT false,
  signing_conditions TEXT,
  position TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_executives (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  national_id TEXT,
  date_of_birth TIMESTAMP,
  age INTEGER,
  marital_status TEXT,
  current_address TEXT,
  registered_address TEXT,
  education TEXT,
  experience TEXT,
  is_shareholder BOOLEAN NOT NULL DEFAULT false,
  share_percentage DECIMAL,
  share_value DECIMAL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_loan_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  loan_type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  requested_amount DECIMAL NOT NULL,
  purpose TEXT,
  term_months INTEGER,
  proposed_interest_rate TEXT,
  interest_calculation TEXT,
  collateral_description TEXT,
  collateral_value DECIMAL,
  request_type TEXT NOT NULL DEFAULT 'NEW',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  loan_id TEXT UNIQUE,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_collaterals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  collateral_type TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  estimated_value DECIMAL NOT NULL,
  appraised_value DECIMAL,
  appraised_by TEXT,
  appraised_date TIMESTAMP,
  owner_name TEXT,
  owner_relationship TEXT,
  title_deed_number TEXT,
  land_office TEXT,
  registration_number TEXT,
  is_insured BOOLEAN NOT NULL DEFAULT false,
  insurance_company TEXT,
  insurance_value DECIMAL,
  "order" INTEGER NOT NULL DEFAULT 0,
  attachments JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  contact_person TEXT,
  product_type TEXT,
  payment_terms TEXT,
  credit_limit DECIMAL,
  contact_duration TEXT,
  relationship_quality TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  contact_person TEXT,
  product_service TEXT,
  payment_terms TEXT,
  sales_proportion DECIMAL,
  contact_duration TEXT,
  relationship_quality TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_dscr_analysis (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  analysis_year INTEGER NOT NULL,
  analysis_period TEXT,
  net_operating_income DECIMAL NOT NULL,
  other_income DECIMAL,
  total_income DECIMAL NOT NULL,
  principal_payment DECIMAL NOT NULL,
  interest_payment DECIMAL NOT NULL,
  total_debt_service DECIMAL NOT NULL,
  dscr_ratio DECIMAL NOT NULL,
  dscr_status TEXT NOT NULL,
  breakdown JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_approval_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  comment_type TEXT NOT NULL,
  comment_by TEXT NOT NULL,
  position TEXT,
  comments TEXT NOT NULL,
  risk_assessment TEXT,
  recommendation TEXT,
  decision TEXT,
  approved_amount DECIMAL,
  special_conditions TEXT,
  comment_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Foreign Key Relationships: 125

-- MANY_TO_ONE: users.branch_id -> branches.id
ALTER TABLE users
  ADD CONSTRAINT fk_users_branch_id
  FOREIGN KEY (branch_id)
  REFERENCES branches (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: approval_limits.created_by -> users.id
ALTER TABLE approval_limits
  ADD CONSTRAINT fk_approval_limits_created_by
  FOREIGN KEY (created_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: sessions.user_id -> users.id
ALTER TABLE sessions
  ADD CONSTRAINT fk_sessions_user_id
  FOREIGN KEY (user_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: transactions.loan_id -> loans.id
ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: transactions.user_id -> users.id
ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_user_id
  FOREIGN KEY (user_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: next_payment_invoices.customer_id -> customers.id
ALTER TABLE next_payment_invoices
  ADD CONSTRAINT fk_next_payment_invoices_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: next_payment_invoices.generated_by -> users.id
ALTER TABLE next_payment_invoices
  ADD CONSTRAINT fk_next_payment_invoices_generated_by
  FOREIGN KEY (generated_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: next_payment_invoices.loan_id -> loans.id
ALTER TABLE next_payment_invoices
  ADD CONSTRAINT fk_next_payment_invoices_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: next_payment_invoices.payment_schedule_id -> payment_schedules.id
ALTER TABLE next_payment_invoices
  ADD CONSTRAINT fk_next_payment_invoices_payment_schedule_id
  FOREIGN KEY (payment_schedule_id)
  REFERENCES payment_schedules (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: next_payment_invoices.sent_by -> users.id
ALTER TABLE next_payment_invoices
  ADD CONSTRAINT fk_next_payment_invoices_sent_by
  FOREIGN KEY (sent_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: payment_receipts.customer_id -> customers.id
ALTER TABLE payment_receipts
  ADD CONSTRAINT fk_payment_receipts_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: payment_receipts.invoice_id -> next_payment_invoices.id
ALTER TABLE payment_receipts
  ADD CONSTRAINT fk_payment_receipts_invoice_id
  FOREIGN KEY (invoice_id)
  REFERENCES next_payment_invoices (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: payment_receipts.issued_by -> users.id
ALTER TABLE payment_receipts
  ADD CONSTRAINT fk_payment_receipts_issued_by
  FOREIGN KEY (issued_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: payment_receipts.loan_id -> loans.id
ALTER TABLE payment_receipts
  ADD CONSTRAINT fk_payment_receipts_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: payment_receipts.payment_id -> payments.id
ALTER TABLE payment_receipts
  ADD CONSTRAINT fk_payment_receipts_payment_id
  FOREIGN KEY (payment_id)
  REFERENCES payments (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: interest_rate_tiers.loan_product_id -> loan_products.id
ALTER TABLE interest_rate_tiers
  ADD CONSTRAINT fk_interest_rate_tiers_loan_product_id
  FOREIGN KEY (loan_product_id)
  REFERENCES loan_products (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: year_interest_tiers.loan_product_id -> loan_products.id
ALTER TABLE year_interest_tiers
  ADD CONSTRAINT fk_year_interest_tiers_loan_product_id
  FOREIGN KEY (loan_product_id)
  REFERENCES loan_products (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loan_interest_history.loan_id -> loans.id
ALTER TABLE loan_interest_history
  ADD CONSTRAINT fk_loan_interest_history_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: audit_logs.user_id -> users.id
ALTER TABLE audit_logs
  ADD CONSTRAINT fk_audit_logs_user_id
  FOREIGN KEY (user_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customers.branch_id -> branches.id
ALTER TABLE customers
  ADD CONSTRAINT fk_customers_branch_id
  FOREIGN KEY (branch_id)
  REFERENCES branches (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customers.user_id -> users.id
ALTER TABLE customers
  ADD CONSTRAINT fk_customers_user_id
  FOREIGN KEY (user_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loans.approved_by -> users.id
ALTER TABLE loans
  ADD CONSTRAINT fk_loans_approved_by
  FOREIGN KEY (approved_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loans.branch_id -> branches.id
ALTER TABLE loans
  ADD CONSTRAINT fk_loans_branch_id
  FOREIGN KEY (branch_id)
  REFERENCES branches (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loans.customer_id -> customers.id
ALTER TABLE loans
  ADD CONSTRAINT fk_loans_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loans.loan_product_id -> loan_products.id
ALTER TABLE loans
  ADD CONSTRAINT fk_loans_loan_product_id
  FOREIGN KEY (loan_product_id)
  REFERENCES loan_products (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loans.officer_id -> users.id
ALTER TABLE loans
  ADD CONSTRAINT fk_loans_officer_id
  FOREIGN KEY (officer_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: payment_schedules.loan_id -> loans.id
ALTER TABLE payment_schedules
  ADD CONSTRAINT fk_payment_schedules_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: payments.created_by -> users.id
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_created_by
  FOREIGN KEY (created_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: payments.loan_id -> loans.id
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: payments.payment_schedule_id -> payment_schedules.id
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_payment_schedule_id
  FOREIGN KEY (payment_schedule_id)
  REFERENCES payment_schedules (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: documents.customer_id -> customers.id
ALTER TABLE documents
  ADD CONSTRAINT fk_documents_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: contact_logs.customer_id -> customers.id
ALTER TABLE contact_logs
  ADD CONSTRAINT fk_contact_logs_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: contact_logs.loan_id -> loans.id
ALTER TABLE contact_logs
  ADD CONSTRAINT fk_contact_logs_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: contact_logs.officer_id -> users.id
ALTER TABLE contact_logs
  ADD CONSTRAINT fk_contact_logs_officer_id
  FOREIGN KEY (officer_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: product_configs.created_by -> users.id
ALTER TABLE product_configs
  ADD CONSTRAINT fk_product_configs_created_by
  FOREIGN KEY (created_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: penalty_rules.loan_product_id -> loan_products.id
ALTER TABLE penalty_rules
  ADD CONSTRAINT fk_penalty_rules_loan_product_id
  FOREIGN KEY (loan_product_id)
  REFERENCES loan_products (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_active_products.customer_id -> customers.id
ALTER TABLE customer_active_products
  ADD CONSTRAINT fk_customer_active_products_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_active_products.loan_id -> loans.id
ALTER TABLE customer_active_products
  ADD CONSTRAINT fk_customer_active_products_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_active_products.loan_product_id -> loan_products.id
ALTER TABLE customer_active_products
  ADD CONSTRAINT fk_customer_active_products_loan_product_id
  FOREIGN KEY (loan_product_id)
  REFERENCES loan_products (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: system_configs.updated_by -> users.id
ALTER TABLE system_configs
  ADD CONSTRAINT fk_system_configs_updated_by
  FOREIGN KEY (updated_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: expenses.approved_by -> users.id
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_approved_by
  FOREIGN KEY (approved_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: expenses.branch_id -> branches.id
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_branch_id
  FOREIGN KEY (branch_id)
  REFERENCES branches (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: expenses.created_by -> users.id
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_created_by
  FOREIGN KEY (created_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: expenses.reimbursed_by -> users.id
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_reimbursed_by
  FOREIGN KEY (reimbursed_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: expenses.rejected_by -> users.id
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_rejected_by
  FOREIGN KEY (rejected_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loan_disbursements.approved_by -> users.id
ALTER TABLE loan_disbursements
  ADD CONSTRAINT fk_loan_disbursements_approved_by
  FOREIGN KEY (approved_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loan_disbursements.created_by -> users.id
ALTER TABLE loan_disbursements
  ADD CONSTRAINT fk_loan_disbursements_created_by
  FOREIGN KEY (created_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loan_disbursements.disbursed_by -> users.id
ALTER TABLE loan_disbursements
  ADD CONSTRAINT fk_loan_disbursements_disbursed_by
  FOREIGN KEY (disbursed_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loan_disbursements.loan_id -> loans.id
ALTER TABLE loan_disbursements
  ADD CONSTRAINT fk_loan_disbursements_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loan_disbursements.rejected_by -> users.id
ALTER TABLE loan_disbursements
  ADD CONSTRAINT fk_loan_disbursements_rejected_by
  FOREIGN KEY (rejected_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: notifications.user_id -> users.id
ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_user_id
  FOREIGN KEY (user_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: calendar_events.branch_id -> branches.id
ALTER TABLE calendar_events
  ADD CONSTRAINT fk_calendar_events_branch_id
  FOREIGN KEY (branch_id)
  REFERENCES branches (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: calendar_events.created_by -> users.id
ALTER TABLE calendar_events
  ADD CONSTRAINT fk_calendar_events_created_by
  FOREIGN KEY (created_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: calendar_events.customer_id -> customers.id
ALTER TABLE calendar_events
  ADD CONSTRAINT fk_calendar_events_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: calendar_events.loan_id -> loans.id
ALTER TABLE calendar_events
  ADD CONSTRAINT fk_calendar_events_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- ONE_TO_ONE: conversation_states.line_user_id -> users.line_user_id
ALTER TABLE conversation_states
  ADD CONSTRAINT fk_conversation_states_line_user_id
  FOREIGN KEY (line_user_id)
  REFERENCES users (line_user_id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: registration_tokens.user_id -> users.id
ALTER TABLE registration_tokens
  ADD CONSTRAINT fk_registration_tokens_user_id
  FOREIGN KEY (user_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: promptpay_qr_codes.loan_id -> loans.id
ALTER TABLE promptpay_qr_codes
  ADD CONSTRAINT fk_promptpay_qr_codes_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: invoices.customer_id -> customers.id
ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: invoices.loan_id -> loans.id
ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: invoices.payment_schedule_id -> payment_schedules.id
ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_payment_schedule_id
  FOREIGN KEY (payment_schedule_id)
  REFERENCES payment_schedules (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: invoice_access_logs.customer_id -> customers.id
ALTER TABLE invoice_access_logs
  ADD CONSTRAINT fk_invoice_access_logs_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: aging_analysis.branch_id -> branches.id
ALTER TABLE aging_analysis
  ADD CONSTRAINT fk_aging_analysis_branch_id
  FOREIGN KEY (branch_id)
  REFERENCES branches (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: aging_analysis.collection_agent_id -> users.id
ALTER TABLE aging_analysis
  ADD CONSTRAINT fk_aging_analysis_collection_agent_id
  FOREIGN KEY (collection_agent_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: aging_analysis.customer_id -> customers.id
ALTER TABLE aging_analysis
  ADD CONSTRAINT fk_aging_analysis_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- ONE_TO_ONE: aging_analysis.loan_id -> loans.id
ALTER TABLE aging_analysis
  ADD CONSTRAINT fk_aging_analysis_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: aml_checks.customer_id -> customers.id
ALTER TABLE aml_checks
  ADD CONSTRAINT fk_aml_checks_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: aml_checks.performed_by -> users.id
ALTER TABLE aml_checks
  ADD CONSTRAINT fk_aml_checks_performed_by
  FOREIGN KEY (performed_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: aml_checks.reviewed_by -> users.id
ALTER TABLE aml_checks
  ADD CONSTRAINT fk_aml_checks_reviewed_by
  FOREIGN KEY (reviewed_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: budget_consumption.branch_id -> branches.id
ALTER TABLE budget_consumption
  ADD CONSTRAINT fk_budget_consumption_branch_id
  FOREIGN KEY (branch_id)
  REFERENCES branches (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: budget_consumption.loan_id -> loans.id
ALTER TABLE budget_consumption
  ADD CONSTRAINT fk_budget_consumption_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: budget_consumption.processed_by -> users.id
ALTER TABLE budget_consumption
  ADD CONSTRAINT fk_budget_consumption_processed_by
  FOREIGN KEY (processed_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: budget_consumption.product_budget_id -> product_budgets.id
ALTER TABLE budget_consumption
  ADD CONSTRAINT fk_budget_consumption_product_budget_id
  FOREIGN KEY (product_budget_id)
  REFERENCES product_budgets (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: budget_consumption.released_by -> users.id
ALTER TABLE budget_consumption
  ADD CONSTRAINT fk_budget_consumption_released_by
  FOREIGN KEY (released_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: collection_workflow_steps.created_by -> users.id
ALTER TABLE collection_workflow_steps
  ADD CONSTRAINT fk_collection_workflow_steps_created_by
  FOREIGN KEY (created_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: credit_line_drawdowns.created_by -> users.id
ALTER TABLE credit_line_drawdowns
  ADD CONSTRAINT fk_credit_line_drawdowns_created_by
  FOREIGN KEY (created_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: credit_line_drawdowns.credit_line_id -> credit_lines.id
ALTER TABLE credit_line_drawdowns
  ADD CONSTRAINT fk_credit_line_drawdowns_credit_line_id
  FOREIGN KEY (credit_line_id)
  REFERENCES credit_lines (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: credit_lines.created_by -> users.id
ALTER TABLE credit_lines
  ADD CONSTRAINT fk_credit_lines_created_by
  FOREIGN KEY (created_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: credit_lines.customer_id -> customers.id
ALTER TABLE credit_lines
  ADD CONSTRAINT fk_credit_lines_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: data_access_logs.customer_id -> customers.id
ALTER TABLE data_access_logs
  ADD CONSTRAINT fk_data_access_logs_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: data_access_logs.user_id -> users.id
ALTER TABLE data_access_logs
  ADD CONSTRAINT fk_data_access_logs_user_id
  FOREIGN KEY (user_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loan_approval_workflow.approver_id -> users.id
ALTER TABLE loan_approval_workflow
  ADD CONSTRAINT fk_loan_approval_workflow_approver_id
  FOREIGN KEY (approver_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: loan_approval_workflow.loan_id -> loans.id
ALTER TABLE loan_approval_workflow
  ADD CONSTRAINT fk_loan_approval_workflow_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: principal_prepayments.loan_id -> loans.id
ALTER TABLE principal_prepayments
  ADD CONSTRAINT fk_principal_prepayments_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: principal_prepayments.payment_schedule_id -> payment_schedules.id
ALTER TABLE principal_prepayments
  ADD CONSTRAINT fk_principal_prepayments_payment_schedule_id
  FOREIGN KEY (payment_schedule_id)
  REFERENCES payment_schedules (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: principal_prepayments.processed_by -> users.id
ALTER TABLE principal_prepayments
  ADD CONSTRAINT fk_principal_prepayments_processed_by
  FOREIGN KEY (processed_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: privacy_consents.customer_id -> customers.id
ALTER TABLE privacy_consents
  ADD CONSTRAINT fk_privacy_consents_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: product_budgets.budget_owner -> users.id
ALTER TABLE product_budgets
  ADD CONSTRAINT fk_product_budgets_budget_owner
  FOREIGN KEY (budget_owner)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: product_budgets.created_by -> users.id
ALTER TABLE product_budgets
  ADD CONSTRAINT fk_product_budgets_created_by
  FOREIGN KEY (created_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: product_budgets.product_id -> loan_products.id
ALTER TABLE product_budgets
  ADD CONSTRAINT fk_product_budgets_product_id
  FOREIGN KEY (product_id)
  REFERENCES loan_products (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: suspicious_transaction_reports.customer_id -> customers.id
ALTER TABLE suspicious_transaction_reports
  ADD CONSTRAINT fk_suspicious_transaction_reports_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: suspicious_transaction_reports.reported_by -> users.id
ALTER TABLE suspicious_transaction_reports
  ADD CONSTRAINT fk_suspicious_transaction_reports_reported_by
  FOREIGN KEY (reported_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: suspicious_transaction_reports.transaction_id -> transactions.id
ALTER TABLE suspicious_transaction_reports
  ADD CONSTRAINT fk_suspicious_transaction_reports_transaction_id
  FOREIGN KEY (transaction_id)
  REFERENCES transactions (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: task_assignments.assigned_by -> users.id
ALTER TABLE task_assignments
  ADD CONSTRAINT fk_task_assignments_assigned_by
  FOREIGN KEY (assigned_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: task_assignments.assigned_to -> users.id
ALTER TABLE task_assignments
  ADD CONSTRAINT fk_task_assignments_assigned_to
  FOREIGN KEY (assigned_to)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: payment_timeline_events.loan_id -> loans.id
ALTER TABLE payment_timeline_events
  ADD CONSTRAINT fk_payment_timeline_events_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: payment_timeline_events.payment_schedule_id -> payment_schedules.id
ALTER TABLE payment_timeline_events
  ADD CONSTRAINT fk_payment_timeline_events_payment_schedule_id
  FOREIGN KEY (payment_schedule_id)
  REFERENCES payment_schedules (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: security_events.user_id -> users.id
ALTER TABLE security_events
  ADD CONSTRAINT fk_security_events_user_id
  FOREIGN KEY (user_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: security_alerts.user_id -> users.id
ALTER TABLE security_alerts
  ADD CONSTRAINT fk_security_alerts_user_id
  FOREIGN KEY (user_id)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: blocked_ips.blocked_by -> users.id
ALTER TABLE blocked_ips
  ADD CONSTRAINT fk_blocked_ips_blocked_by
  FOREIGN KEY (blocked_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_vat_records.customer_id -> customers.id
ALTER TABLE customer_vat_records
  ADD CONSTRAINT fk_customer_vat_records_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_investments.customer_id -> customers.id
ALTER TABLE customer_investments
  ADD CONSTRAINT fk_customer_investments_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_financial_statements.customer_id -> customers.id
ALTER TABLE customer_financial_statements
  ADD CONSTRAINT fk_customer_financial_statements_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_working_capitals.customer_id -> customers.id
ALTER TABLE customer_working_capitals
  ADD CONSTRAINT fk_customer_working_capitals_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_projections.customer_id -> customers.id
ALTER TABLE customer_projections
  ADD CONSTRAINT fk_customer_projections_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_credit_bureaus.customer_id -> customers.id
ALTER TABLE customer_credit_bureaus
  ADD CONSTRAINT fk_customer_credit_bureaus_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_bank_statements.customer_id -> customers.id
ALTER TABLE customer_bank_statements
  ADD CONSTRAINT fk_customer_bank_statements_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_bank_statement_months.statement_id -> customer_bank_statements.id
ALTER TABLE customer_bank_statement_months
  ADD CONSTRAINT fk_customer_bank_statement_months_statement_id
  FOREIGN KEY (statement_id)
  REFERENCES customer_bank_statements (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_comments.customer_id -> customers.id
ALTER TABLE customer_comments
  ADD CONSTRAINT fk_customer_comments_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_business_histories.customer_id -> customers.id
ALTER TABLE customer_business_histories
  ADD CONSTRAINT fk_customer_business_histories_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: secure_document_tokens.customer_id -> customers.id
ALTER TABLE secure_document_tokens
  ADD CONSTRAINT fk_secure_document_tokens_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: document_access_logs.token -> secure_document_tokens.token
ALTER TABLE document_access_logs
  ADD CONSTRAINT fk_document_access_logs_token
  FOREIGN KEY (token)
  REFERENCES secure_document_tokens (token)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_business_profiles.customer_id -> customers.id
ALTER TABLE customer_business_profiles
  ADD CONSTRAINT fk_customer_business_profiles_customer_id
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_business_profiles.document_id -> documents.id
ALTER TABLE customer_business_profiles
  ADD CONSTRAINT fk_customer_business_profiles_document_id
  FOREIGN KEY (document_id)
  REFERENCES documents (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_business_profiles.reviewed_by -> users.id
ALTER TABLE customer_business_profiles
  ADD CONSTRAINT fk_customer_business_profiles_reviewed_by
  FOREIGN KEY (reviewed_by)
  REFERENCES users (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_business_profiles.previous_version_id -> customer_business_profiles.id
ALTER TABLE customer_business_profiles
  ADD CONSTRAINT fk_customer_business_profiles_previous_version_id
  FOREIGN KEY (previous_version_id)
  REFERENCES customer_business_profiles (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_shareholders.profile_id -> customer_business_profiles.id
ALTER TABLE customer_shareholders
  ADD CONSTRAINT fk_customer_shareholders_profile_id
  FOREIGN KEY (profile_id)
  REFERENCES customer_business_profiles (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_executives.profile_id -> customer_business_profiles.id
ALTER TABLE customer_executives
  ADD CONSTRAINT fk_customer_executives_profile_id
  FOREIGN KEY (profile_id)
  REFERENCES customer_business_profiles (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_loan_requests.profile_id -> customer_business_profiles.id
ALTER TABLE customer_loan_requests
  ADD CONSTRAINT fk_customer_loan_requests_profile_id
  FOREIGN KEY (profile_id)
  REFERENCES customer_business_profiles (id)
  ON DELETE CASCADE;

-- ONE_TO_ONE: customer_loan_requests.loan_id -> loans.id
ALTER TABLE customer_loan_requests
  ADD CONSTRAINT fk_customer_loan_requests_loan_id
  FOREIGN KEY (loan_id)
  REFERENCES loans (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_collaterals.profile_id -> customer_business_profiles.id
ALTER TABLE customer_collaterals
  ADD CONSTRAINT fk_customer_collaterals_profile_id
  FOREIGN KEY (profile_id)
  REFERENCES customer_business_profiles (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_suppliers.profile_id -> customer_business_profiles.id
ALTER TABLE customer_suppliers
  ADD CONSTRAINT fk_customer_suppliers_profile_id
  FOREIGN KEY (profile_id)
  REFERENCES customer_business_profiles (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_customers.profile_id -> customer_business_profiles.id
ALTER TABLE customer_customers
  ADD CONSTRAINT fk_customer_customers_profile_id
  FOREIGN KEY (profile_id)
  REFERENCES customer_business_profiles (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_dscr_analysis.profile_id -> customer_business_profiles.id
ALTER TABLE customer_dscr_analysis
  ADD CONSTRAINT fk_customer_dscr_analysis_profile_id
  FOREIGN KEY (profile_id)
  REFERENCES customer_business_profiles (id)
  ON DELETE CASCADE;

-- MANY_TO_ONE: customer_approval_comments.profile_id -> customer_business_profiles.id
ALTER TABLE customer_approval_comments
  ADD CONSTRAINT fk_customer_approval_comments_profile_id
  FOREIGN KEY (profile_id)
  REFERENCES customer_business_profiles (id)
  ON DELETE CASCADE;


-- Summary:
-- Total Tables: 72
-- Total Foreign Keys: 125
-- ONE_TO_ONE: 3
-- ONE_TO_MANY: 0
-- MANY_TO_ONE: 122
