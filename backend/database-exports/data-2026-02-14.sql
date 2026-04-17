--
-- PostgreSQL database dump
--

\restrict xWpFGelh6Hx7Eh8vycAUTrnxTEqrdMFHr55Tx09zxXHkbHK50HtjkcGV5Tu3p6c

-- Dumped from database version 16.11 (Homebrew)
-- Dumped by pg_dump version 16.12 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.branches (id, code, name, address, phone, status, created_at, updated_at) FROM stdin;
65447ded-c891-4f6a-85f9-3748572cd572	HQ	สำนักงานใหญ่	กรุงเทพมหานคร	02-123-4567	ACTIVE	2026-02-12 16:00:24.327	2026-02-12 16:00:24.327
34701d9a-39d1-4c5e-91f1-45490cd89cc3	BR01	ฉะเชิงเทรา	182-184 ถ.ฉะเชิงเทรา-บางปะกง ต.หน้าเมือง อ.เมือง จ.ฉะเชิงเทรา 24000	02-234-5678	ACTIVE	2026-02-12 16:00:24.336	2026-02-13 04:53:53.963
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, first_name, last_name, phone_number, avatar, role, status, branch_id, must_change_password, password_changed_at, national_id, line_user_id, line_linked_at, line_active, line_notifications_enabled, monthly_target, created_at, updated_at, last_login_at) FROM stdin;
b0a90dc5-e982-45a4-be79-f9b2be0a8bae	dearnull85@gmail.com	$2b$12$7Doc3bTSX.I32d6DUp9FIeFe3U0cQSuJchG515lo12SYQdN4n1zJm	Fern	Wang 	09523455686	\N	OFFICER	ACTIVE	34701d9a-39d1-4c5e-91f1-45490cd89cc3	f	2026-02-13 05:08:41.728	\N	\N	\N	f	f	100000.00	2026-02-13 05:07:38.592	2026-02-14 04:41:48.5	2026-02-14 04:41:48.499
4fade8f4-67f5-4301-98fd-07daf590d0ae	globalcompanymula@gmail.com	$2b$12$ibciXSZ3yoa23LLdhG2hzuChy2JMqorsa0Ym.lG7TlDRqj4yfmGn.	phattara	phattara	0966566414	\N	MANAGER	ACTIVE	34701d9a-39d1-4c5e-91f1-45490cd89cc3	f	2026-02-13 05:06:12.28	\N	\N	\N	f	f	100000.00	2026-02-13 04:54:41.675	2026-02-14 05:31:06.259	2026-02-14 05:31:06.258
1060886f-fea1-4e49-a7c4-57bc0a1293ba	phat@gmail.comm	$2b$10$defaulthash	คลอเฟน	co,th	\N	\N	USER	ACTIVE	34701d9a-39d1-4c5e-91f1-45490cd89cc3	f	\N	\N	U71da57381acd79d1bbc23e33e54619fe	\N	t	t	100000.00	2026-02-13 09:16:54.084	2026-02-14 05:41:56.896	\N
49867ed8-5c7a-485d-ad1a-891390126840	phattarapong.phe@gmail.com	$2b$10$fepBYRK2nlpvsVMhEf.4FOe9gIs1dGh6j5L98oefQOpATjdvPVF8C	Admin	System	\N	\N	ADMIN	ACTIVE	65447ded-c891-4f6a-85f9-3748572cd572	f	\N	\N	\N	\N	t	t	100000.00	2026-02-12 16:00:24.411	2026-02-14 07:37:15.438	2026-02-14 07:37:15.437
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, user_id, branch_id, customer_code, business_name, business_type, business_registration_date, business_registration_type, registered_capital, business_size, industry_code, business_age_years, number_of_employees, phone, email, address, business_address, business_phone, thai_id, tax_id, avatar, shareholders, signatories, annual_revenue, net_profit, total_assets, total_liabilities, debt_to_equity_ratio, ai_extracted_data, ai_confidence_score, ai_processed_at, ai_warnings, status, document_complete, line_user_id, line_linked_at, created_at, updated_at, created_by) FROM stdin;
18ef4ce6-acf2-4b69-ac5b-f6b1a398fc20	\N	34701d9a-39d1-4c5e-91f1-45490cd89cc3	CUSTBR01202602140001	Evena Lab	เทคโนโลยี	\N	\N	\N	\N	\N	\N	\N	0966566414	phat@gmail.com	123 Watcharaphon Tharang Bangkhen Bangkok 10220	\N	\N	48772a681d5f140cb9a53b6855b43ab0:2dcb308068b22f28f90a411695cce69e:855a949a2ae46f401891996268	d48af25060d97368b05ce224b358fabe:5a287074b6c8786f5e262f5a8392a14f:63332e6691e1ea23324c22ab02	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	ACTIVE	f	\N	\N	2026-02-14 04:56:55.667	2026-02-14 04:56:55.667	b0a90dc5-e982-45a4-be79-f9b2be0a8bae
\.


--
-- Data for Name: loan_products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loan_products (id, product_code, product_name, product_name_en, description, purpose, eligibility, target_business, min_revenue, max_revenue, min_years_in_business, min_loan_amount, max_loan_amount, total_project_budget, interest_rate_type, interest_rate_year_1_3, interest_rate_year_4_plus, interest_rate_formula, government_subsidy, subsidy_details, loan_type, max_term_months, grace_period_months, collateral_required, collateral_details, guarantee_options, benefits, fee_waivers, project_start_date, project_end_date, status, is_popular, display_order, created_by, created_at, updated_at) FROM stdin;
d23b486c-ccc2-4376-bc18-e1c161fc69ce	SME-FIXED-001	สินเชื่อ SME เพื่อขยายกิจการ (อัตราคงที่)	SME Business Expansion Loan (Fixed Rate)	สินเชื่อดอกเบี้ยคงที่ตลอดอายุสัญญา เหมาะสำหรับผู้ประกอบการที่ต้องการความแน่นอนในการวางแผนการเงิน	{ขยายกิจการ,เพิ่มสาขา,ซื้อเครื่องจักร,ปรับปรุงสถานที่}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี","มีรายได้ต่อปีไม่น้อยกว่า 3 ล้านบาท","มีกำไรสุทธิต่อเนื่อง 2 ปี"}	{ร้านอาหาร,ร้านค้าปลีก,โรงแรม,ธุรกิจบริการ}	3000000.00	50000000.00	2	500000.00	10000000.00	\N	FIXED	6.99	\N	\N	f	\N	LONG_TERM	120	6	t	ที่ดิน อาคาร หรือเครื่องจักร มูลค่าไม่น้อยกว่า 120% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{ดอกเบี้ยคงที่ตลอดอายุสัญญา,"ปลอดชำระเงินต้น 6 เดือนแรก",ไม่มีค่าธรรมเนียมปิดบัญชีก่อนกำหนด}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,ฟรีค่าประเมินหลักประกัน}	\N	\N	ACTIVE	t	1	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.023	2026-02-14 04:40:54.023
ad7f3687-ab08-4ce0-8df7-671b77f623da	SME-FIXED-002	สินเชื่อ SME เพื่อเสริมสภาพคล่อง (อัตราคงที่)	SME Working Capital Loan (Fixed Rate)	สินเชื่อระยะสั้นดอกเบี้ยคงที่ สำหรับเสริมสภาพคล่องในการดำเนินธุรกิจ	{เสริมสภาพคล่อง,ซื้อสินค้า,จ่ายเงินเดือน,ค่าใช้จ่ายประจำ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 1 ปี","มีรายได้ต่อปีไม่น้อยกว่า 1 ล้านบาท"}	{ร้านค้าปลีก,ร้านค้าส่ง,ธุรกิจการค้า,ธุรกิจนำเข้า-ส่งออก}	1000000.00	30000000.00	1	300000.00	5000000.00	\N	FIXED	7.99	\N	\N	f	\N	SHORT_TERM	36	0	f	\N	{ค้ำประกันโดยผู้ถือหุ้น,ค้ำประกันโดยบุคคลภายนอก}	{"อนุมัติเร็ว ภายใน 3 วันทำการ",ไม่ต้องใช้หลักประกัน,ยืดหยุ่นในการชำระ}	{ฟรีค่าธรรมเนียมจัดทำสัญญา}	\N	\N	ACTIVE	t	2	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.038	2026-02-14 04:40:54.038
7fe2e4be-7eb1-4b42-b158-d1e4545d5a85	SME-VAR-001	สินเชื่อ SME อัตราลอยตัว (MLR Plus)	SME Floating Rate Loan (MLR Plus)	สินเชื่ออัตราดอกเบี้ยลอยตัวตามอัตรา MLR เหมาะสำหรับผู้ที่คาดว่าอัตราดอกเบี้ยจะลดลง	{ลงทุนระยะยาว,ขยายกิจการ,ซื้ออสังหาริมทรัพย์,โครงการพิเศษ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 3 ปี","มีรายได้ต่อปีไม่น้อยกว่า 10 ล้านบาท",มีผลประกอบการดี}	{โรงงานผลิต,ธุรกิจก่อสร้าง,ธุรกิจอสังหาริมทรัพย์,ธุรกิจขนาดใหญ่}	10000000.00	200000000.00	3	5000000.00	50000000.00	\N	VARIABLE	\N	\N	MLR + 1.5%	f	\N	LONG_TERM	180	12	t	ที่ดินพร้อมสิ่งปลูกสร้าง หรือเครื่องจักรอุปกรณ์ มูลค่าไม่น้อยกว่า 150% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG",ค้ำประกันโดยบริษัทในเครือ}	{อัตราดอกเบี้ยปรับตามตลาด,"ปลอดชำระเงินต้น 12 เดือนแรก","วงเงินสูงสุดถึง 50 ล้านบาท"}	{"ลดค่าธรรมเนียมจัดทำสัญญา 50%"}	\N	\N	ACTIVE	f	3	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.052	2026-02-14 04:40:54.052
8a96d4d5-148d-4c9b-951b-de9fa0fc62f5	SME-VAR-002	สินเชื่อ SME อัตราลอยตัว (MRR Plus)	SME Floating Rate Loan (MRR Plus)	สินเชื่ออัตราดอกเบี้ยลอยตัวตามอัตรา MRR เหมาะสำหรับธุรกิจที่มีกระแสเงินสดดี	{ขยายกิจการ,ซื้อเครื่องจักร,ลงทุนเทคโนโลยี,พัฒนาผลิตภัณฑ์}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี","มีรายได้ต่อปีไม่น้อยกว่า 5 ล้านบาท"}	{ธุรกิจเทคโนโลยี,ธุรกิจดิจิทัล,ธุรกิจบริการ,ธุรกิจสตาร์ทอัพ}	5000000.00	100000000.00	2	2000000.00	20000000.00	\N	VARIABLE	\N	\N	MRR + 2.0%	f	\N	MEDIUM_TERM	84	6	t	หลักประกันตามที่ธนาคารกำหนด	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{อัตราดอกเบี้ยแข่งขันได้,ยืดหยุ่นในการชำระ,สามารถปรับโครงสร้างหนี้ได้}	{}	\N	\N	ACTIVE	f	4	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.075	2026-02-14 04:40:54.075
56aea43d-7764-4294-a041-370659c3e09f	SME-MIX-001	สินเชื่อ SME อัตราผสม (3 ปีแรกคงที่)	SME Mixed Rate Loan (3-Year Fixed)	สินเชื่ออัตราดอกเบี้ยคงที่ 3 ปีแรก จากนั้นเป็นอัตราลอยตัว ให้ความมั่นใจในช่วงเริ่มต้น	{ลงทุนโครงการใหม่,ขยายกิจการ,ซื้ออุปกรณ์,ปรับปรุงโรงงาน}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี","มีรายได้ต่อปีไม่น้อยกว่า 5 ล้านบาท",มีแผนธุรกิจที่ชัดเจน}	{โรงงานผลิต,ธุรกิจการค้า,ธุรกิจบริการ,ธุรกิจท่องเที่ยว}	5000000.00	100000000.00	2	3000000.00	30000000.00	\N	MIXED	4.99	6.99	ปีที่ 4+: MLR + 1.5%	t	รัฐบาลชดเชยดอกเบี้ย 2% ในปีแรก	LONG_TERM	120	6	t	ที่ดิน อาคาร หรือเครื่องจักร มูลค่าไม่น้อยกว่า 120% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{"ดอกเบี้ยต่ำในช่วง 3 ปีแรก","รัฐบาลชดเชยดอกเบี้ย 2%","ปลอดชำระเงินต้น 6 เดือนแรก"}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,"ฟรีค่าธรรมเนียมค้ำประกัน TCG 4 ปี"}	\N	\N	ACTIVE	t	5	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.11	2026-02-14 04:40:54.11
04cbc779-e4c0-4d17-9fe2-d13e184b36d6	SME-MIX-002	สินเชื่อ SME อัตราผสม (5 ปีแรกคงที่)	SME Mixed Rate Loan (5-Year Fixed)	สินเชื่ออัตราดอกเบี้ยคงที่ 5 ปีแรก จากนั้นเป็นอัตราลอยตัว เหมาะสำหรับโครงการระยะยาว	{โครงการลงทุนขนาดใหญ่,ซื้ออสังหาริมทรัพย์,สร้างโรงงาน,ขยายสาขา}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 3 ปี","มีรายได้ต่อปีไม่น้อยกว่า 20 ล้านบาท",มีผลประกอบการดีต่อเนื่อง}	{โรงงานผลิต,ธุรกิจอสังหาริมทรัพย์,ธุรกิจโรงแรม,ธุรกิจก่อสร้าง}	20000000.00	500000000.00	3	10000000.00	100000000.00	\N	MIXED	3.99	5.99	ปีที่ 6+: MLR + 1.0%	f	\N	LONG_TERM	240	24	t	ที่ดินพร้อมสิ่งปลูกสร้าง มูลค่าไม่น้อยกว่า 150% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,ค้ำประกันโดยบริษัทในเครือ}	{"ดอกเบี้ยต่ำในช่วง 5 ปีแรก","ปลอดชำระเงินต้น 24 เดือนแรก","วงเงินสูงสุดถึง 100 ล้านบาท"}	{"ลดค่าธรรมเนียมจัดทำสัญญา 50%","ลดค่าประเมินหลักประกัน 30%"}	\N	\N	ACTIVE	f	6	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.123	2026-02-14 04:40:54.123
33cdbe69-c25e-41aa-9f97-e41c2aa1cd07	SME-TIER-001	สินเชื่อ SME แบบ Step-up (3 ระดับ)	SME Step-up Tiered Loan (3 Tiers)	สินเชื่อดอกเบี้ยแบบขั้นบันได เริ่มต้นต่ำแล้วค่อยๆ เพิ่มขึ้น เหมาะสำหรับธุรกิจที่คาดว่ารายได้จะเติบโต	{เปิดธุรกิจใหม่,ขยายกิจการ,ลงทุนโครงการใหม่,พัฒนาผลิตภัณฑ์}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 1 ปี",มีแผนธุรกิจที่ชัดเจน,มีศักยภาพในการเติบโต}	{ธุรกิจสตาร์ทอัพ,ธุรกิจเทคโนโลยี,ธุรกิจนวัตกรรม,ธุรกิจดิจิทัล}	2000000.00	50000000.00	1	1000000.00	15000000.00	\N	TIERED	\N	\N	\N	t	รัฐบาลชดเชยดอกเบี้ย 3% ในปีแรก	MEDIUM_TERM	84	6	f	\N	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{ดอกเบี้ยต่ำในช่วงเริ่มต้น,"รัฐบาลชดเชยดอกเบี้ย 3%",ไม่ต้องใช้หลักประกัน,อนุมัติเร็ว}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,"ฟรีค่าธรรมเนียมค้ำประกัน TCG 4 ปี"}	\N	\N	ACTIVE	t	7	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.288	2026-02-14 04:40:54.288
fc6ce566-70a4-42fd-a8c5-1d859f1eb168	SME-TIER-002	สินเชื่อ SME แบบยืดหยุ่น (4 ระดับ)	SME Flexible Tiered Loan (4 Tiers)	สินเชื่อดอกเบี้ยแบบยืดหยุ่น 4 ระดับ ออกแบบมาเพื่อรองรับการเติบโตของธุรกิจในแต่ละช่วงเวลา	{ลงทุนระยะยาว,ขยายกิจการ,โครงการพิเศษ,พัฒนาธุรกิจ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี","มีรายได้ต่อปีไม่น้อยกว่า 10 ล้านบาท",มีผลประกอบการดี}	{โรงงานผลิต,ธุรกิจการค้า,ธุรกิจบริการ,ธุรกิจส่งออก}	10000000.00	200000000.00	2	5000000.00	50000000.00	\N	TIERED	\N	\N	\N	f	\N	LONG_TERM	180	12	t	ที่ดิน อาคาร หรือเครื่องจักร มูลค่าไม่น้อยกว่า 130% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG",ค้ำประกันโดยบริษัทในเครือ}	{ดอกเบี้ยปรับตามช่วงเวลา,"ปลอดชำระเงินต้น 12 เดือนแรก",ยืดหยุ่นสูง}	{"ลดค่าธรรมเนียมจัดทำสัญญา 30%"}	\N	\N	ACTIVE	f	8	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.312	2026-02-14 04:40:54.312
0d54a2c0-7684-4083-9d57-5e44f28baae8	SME-TIER-GOV-001	สินเชื่อ SME ร่วมกับรัฐบาล (แบบ Tiered)	SME Government Partnership Tiered Loan	สินเชื่อพิเศษร่วมกับรัฐบาล ดอกเบี้ยต่ำในช่วงแรก รัฐบาลชดเชยดอกเบี้ย เหมาะสำหรับ SME ที่ได้รับผลกระทบจากวิกฤต	{ฟื้นฟูธุรกิจ,ปรับโครงสร้างธุรกิจ,เสริมสภาพคล่อง,ลงทุนพัฒนา}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 1 ปี",ได้รับผลกระทบจากวิกฤตเศรษฐกิจ,มีแผนฟื้นฟูธุรกิจที่ชัดเจน}	{ร้านอาหาร,โรงแรม,ธุรกิจท่องเที่ยว,ธุรกิจบริการ,ร้านค้าปลีก}	1000000.00	50000000.00	1	500000.00	10000000.00	\N	TIERED	\N	\N	\N	t	รัฐบาลชดเชยดอกเบี้ย 3% ในปีที่ 1-2 และ 2% ในปีที่ 3	MEDIUM_TERM	60	12	f	\N	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG (รัฐค้ำ 100%)"}	{"รัฐบาลชดเชยดอกเบี้ย 3%",ไม่ต้องใช้หลักประกัน,"ปลอดชำระเงินต้น 12 เดือนแรก","TCG ค้ำประกัน 100%"}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,"ฟรีค่าธรรมเนียมค้ำประกัน TCG ตลอดอายุสัญญา",ฟรีค่าวิเคราะห์โครงการ}	2024-01-01 00:00:00	2026-12-31 00:00:00	ACTIVE	t	9	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.322	2026-02-14 04:40:54.322
1cdf3d62-3e59-4ce4-a258-47c1c46553a0	SME-TIER-PREMIUM-001	สินเชื่อ SME พรีเมียม (แบบ Tiered)	SME Premium Tiered Loan	สินเชื่อพิเศษสำหรับ SME ขนาดใหญ่ ดอกเบี้ยแบบ Tiered ที่ยืดหยุ่นและแข่งขันได้	{ลงทุนขนาดใหญ่,ขยายกิจการต่างประเทศ,ซื้อกิจการ,โครงการพิเศษ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 5 ปี","มีรายได้ต่อปีไม่น้อยกว่า 100 ล้านบาท",มีผลประกอบการดีเยี่ยม,มีเครดิตเรตติ้งดี}	{โรงงานผลิตขนาดใหญ่,ธุรกิจส่งออก,ธุรกิจข้ามชาติ,กลุ่มบริษัท}	100000000.00	1000000000.00	5	20000000.00	200000000.00	\N	TIERED	\N	\N	\N	f	\N	LONG_TERM	300	24	t	หลักประกันตามที่ธนาคารกำหนด มูลค่าไม่น้อยกว่า 150% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,ค้ำประกันโดยบริษัทในเครือ,ค้ำประกันโดยบริษัทแม่}	{อัตราดอกเบี้ยพิเศษ,"วงเงินสูงสุดถึง 200 ล้านบาท","ปลอดชำระเงินต้น 24 เดือนแรก","Relationship Manager เฉพาะ"}	{"ลดค่าธรรมเนียมจัดทำสัญญา 50%","ลดค่าประเมินหลักประกัน 50%"}	\N	\N	ACTIVE	f	10	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.332	2026-02-14 04:40:54.332
86579b25-d0b2-42f6-b687-da105b21ebef	SME-GREEN-001	สินเชื่อ SME เพื่อสิ่งแวดล้อม (Green Loan)	SME Green Loan	สินเชื่อพิเศษสำหรับโครงการที่เป็นมิตรกับสิ่งแวดล้อม ดอกเบี้ยพิเศษ	{ติดตั้งพลังงานสะอาด,ลดการปล่อยคาร์บอน,จัดการขยะ,ประหยัดพลังงาน,โครงการสีเขียว}	{มีโครงการที่เป็นมิตรกับสิ่งแวดล้อม,ผ่านการรับรองมาตรฐานสิ่งแวดล้อม,มีแผนลดคาร์บอนที่ชัดเจน}	{โรงงานผลิต,ธุรกิจพลังงาน,ธุรกิจรีไซเคิล,ธุรกิจเกษตรอินทรีย์}	3000000.00	100000000.00	2	2000000.00	30000000.00	\N	TIERED	\N	\N	\N	t	รัฐบาลชดเชยดอกเบี้ย 2% และสนับสนุนค่าที่ปรึกษา	LONG_TERM	120	12	t	หลักประกันตามที่ธนาคารกำหนด	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{ดอกเบี้ยพิเศษสำหรับโครงการสีเขียว,"รัฐบาลชดเชยดอกเบี้ย 2%",สนับสนุนค่าที่ปรึกษา,"ปลอดชำระเงินต้น 12 เดือนแรก"}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,ฟรีค่าวิเคราะห์โครงการ,ฟรีค่าที่ปรึกษาสิ่งแวดล้อม}	\N	\N	ACTIVE	t	11	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.365	2026-02-14 04:40:54.365
4f4c93b8-1b52-442b-866a-7a006b736857	SME-DIGITAL-001	สินเชื่อ SME เพื่อดิจิทัลทรานส์ฟอร์เมชัน	SME Digital Transformation Loan	สินเชื่อพิเศษสำหรับการลงทุนด้านเทคโนโลยีดิจิทัล ระบบ IT และ E-Commerce	{"ลงทุนระบบ IT","พัฒนา E-Commerce","ระบบ ERP","ระบบ CRM","Digital Marketing","AI และ Automation"}	{มีแผนดิจิทัลทรานส์ฟอร์เมชันที่ชัดเจน,ผ่านการประเมินจากที่ปรึกษาดิจิทัล}	{ธุรกิจค้าปลีก,ธุรกิจบริการ,ธุรกิจการค้า,ธุรกิจผลิต,ธุรกิจทุกประเภท}	2000000.00	100000000.00	1	500000.00	20000000.00	\N	MIXED	3.99	5.99	ปีที่ 4+: MRR + 1.5%	t	รัฐบาลชดเชยดอกเบี้ย 2% และสนับสนุนค่าที่ปรึกษาดิจิทัล	MEDIUM_TERM	60	6	f	\N	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{ดอกเบี้ยพิเศษ,"รัฐบาลชดเชยดอกเบี้ย 2%",สนับสนุนค่าที่ปรึกษาดิจิทัล,ไม่ต้องใช้หลักประกัน}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,ฟรีค่าที่ปรึกษาดิจิทัล,ฟรีค่าอบรมดิจิทัล}	\N	\N	ACTIVE	t	12	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.377	2026-02-14 04:40:54.377
07669afe-c491-432b-bddf-4b807fc8152c	SME-REVOLVING-001	วงเงินสินเชื่อหมุนเวียน SME	SME Revolving Credit Line	วงเงินสินเชื่อหมุนเวียน ใช้เมื่อต้องการ คืนเมื่อพร้อม ยืดหยุ่นสูงสุด	{เสริมสภาพคล่อง,ซื้อสินค้า,จ่ายค่าใช้จ่าย,โอกาสทางธุรกิจ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี","มีรายได้ต่อปีไม่น้อยกว่า 5 ล้านบาท",มีกระแสเงินสดดี}	{ธุรกิจการค้า,ธุรกิจบริการ,ธุรกิจผลิต,ธุรกิจนำเข้า-ส่งออก}	5000000.00	100000000.00	2	1000000.00	20000000.00	\N	VARIABLE	\N	\N	MRR + 2.5%	f	\N	REVOLVING	12	0	t	หลักประกันตามที่ธนาคารกำหนด	{ค้ำประกันโดยผู้ถือหุ้น}	{"ใช้เมื่อต้องการ คืนเมื่อพร้อม",คิดดอกเบี้ยเฉพาะยอดที่ใช้,ยืดหยุ่นสูง,อนุมัติเร็ว}	{}	\N	\N	ACTIVE	f	13	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.382	2026-02-14 04:40:54.382
1f07af5f-3690-450a-a062-9a634ec0c908	SME-EXPORT-001	สินเชื่อ SME เพื่อการส่งออก-นำเข้า	SME Export-Import Loan	สินเชื่อพิเศษสำหรับธุรกิจนำเข้า-ส่งออก รองรับการทำธุรกิจระหว่างประเทศ	{นำเข้าสินค้า,ส่งออกสินค้า,"เปิด L/C",ค่าขนส่งระหว่างประเทศ,ค่าประกันสินค้า}	{มีใบอนุญาตนำเข้า-ส่งออก,มีประสบการณ์การค้าระหว่างประเทศ,มีคู่ค้าต่างประเทศที่ชัดเจน}	{ธุรกิจนำเข้า-ส่งออก,ธุรกิจการค้าระหว่างประเทศ,ผู้ผลิตเพื่อส่งออก}	10000000.00	500000000.00	2	3000000.00	50000000.00	\N	MIXED	4.50	6.50	ปีที่ 4+: MLR + 1.5%	f	\N	MEDIUM_TERM	60	3	t	สินค้า หรือหลักประกันอื่นตามที่ธนาคารกำหนด	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย EXIM Bank"}	{รองรับการทำธุรกิจระหว่างประเทศ,"บริการเปิด L/C",บริการแลกเปลี่ยนเงินตรา,ที่ปรึกษาการค้าระหว่างประเทศ}	{"ลดค่าธรรมเนียมเปิด L/C 30%"}	\N	\N	ACTIVE	f	14	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.417	2026-02-14 04:40:54.417
a939e2c1-f9dc-4f38-888e-9e91e2a2904b	SME-FRANCHISE-001	สินเชื่อ SME เพื่อธุรกิจแฟรนไชส์	SME Franchise Loan	สินเชื่อพิเศษสำหรับการซื้อแฟรนไชส์หรือขยายสาขาแฟรนไชส์	{ซื้อแฟรนไชส์,เปิดสาขาแฟรนไชส์,ค่าตกแต่งร้าน,ค่าอุปกรณ์,ค่าสต็อกสินค้า}	{มีสัญญาแฟรนไชส์ที่ชัดเจน,แฟรนไชส์ต้องมีชื่อเสียง,ผ่านการอบรมจากเจ้าของแฟรนไชส์}	{ร้านอาหารแฟรนไชส์,ร้านกาแฟแฟรนไชส์,ร้านค้าปลีกแฟรนไชส์,ธุรกิจบริการแฟรนไชส์}	0.00	50000000.00	0	1000000.00	15000000.00	\N	TIERED	\N	\N	\N	f	\N	MEDIUM_TERM	84	6	f	\N	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{เหมาะสำหรับผู้เริ่มต้นธุรกิจ,ไม่ต้องใช้หลักประกัน,อนุมัติเร็ว,"ปลอดชำระเงินต้น 6 เดือนแรก"}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,"ฟรีค่าธรรมเนียมค้ำประกัน TCG 2 ปี"}	\N	\N	ACTIVE	t	15	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.554	2026-02-14 04:40:54.554
0d3f98a9-1864-40c6-ab3b-8db77572dbb8	SME-OLD-001	สินเชื่อ SME รุ่นเก่า (ไม่ใช้งาน)	SME Old Loan (Inactive)	สินเชื่อรุ่นเก่าที่ไม่เปิดให้บริการแล้ว	{ขยายกิจการ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี"}	{ทุกประเภท}	\N	\N	\N	1000000.00	10000000.00	\N	FIXED	8.99	\N	\N	f	\N	LONG_TERM	120	0	t	\N	{}	{}	{}	\N	\N	INACTIVE	f	99	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.583	2026-02-14 04:40:54.583
b2113a4a-2aad-4730-bb57-be8459019c93	SME-ARCHIVE-001	สินเชื่อ SME โครงการพิเศษ 2023 (เก็บถาวร)	SME Special Project 2023 (Archived)	สินเชื่อโครงการพิเศษที่สิ้นสุดแล้ว	{โครงการพิเศษ}	{ตามเงื่อนไขโครงการ}	{ทุกประเภท}	\N	\N	\N	500000.00	5000000.00	\N	FIXED	3.99	\N	\N	t	โครงการสิ้นสุดแล้ว	SHORT_TERM	36	0	f	\N	{}	{}	{}	2023-01-01 00:00:00	2023-12-31 00:00:00	ARCHIVED	f	100	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 04:40:54.589	2026-02-14 04:40:54.589
\.


--
-- Data for Name: loans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loans (id, customer_id, branch_id, officer_id, contract_number, principal, interest_rate, term_months, current_principal, interest_calculation_method, last_interest_calculation_date, accumulated_interest, payment_day, first_payment_date, payment_day_adjustment, dscr, dscr_status, monthly_payment, total_interest, allow_early_payment, early_payment_penalty_rate, status, sla_status, sla_deadline, approved_by, approved_at, rejected_by, rejected_at, rejected_reason, approval_level, current_approval_level, approval_history, disbursement_date, maturity_date, outstanding_balance, next_payment_date, next_payment_amount, last_payment_date, overdue_days, total_disbursed, remaining_amount, product_config_id, product_config, loan_product_id, start_date, end_date, created_at, updated_at, version) FROM stdin;
001efd65-2579-4012-8bb4-3f5bc08c0649	18ef4ce6-acf2-4b69-ac5b-f6b1a398fc20	34701d9a-39d1-4c5e-91f1-45490cd89cc3	b0a90dc5-e982-45a4-be79-f9b2be0a8bae	SDSME2569BR0010000010	5000000.00	6.99	30	\N	DYNAMIC_PRINCIPAL	\N	0.00	1	2026-03-17 05:31:16.278	LAST_DAY	10.87	excellent	182136.80	464104.00	t	0.00	APPROVED	\N	\N	4fade8f4-67f5-4301-98fd-07daf590d0ae	2026-02-14 05:31:16.197	\N	\N	\N	HQ	\N	\N	\N	\N	5000000.00	\N	\N	\N	0	0.00	\N	\N	null	d23b486c-ccc2-4376-bc18-e1c161fc69ce	\N	\N	2026-02-14 05:30:36.688	2026-02-14 05:31:16.487	1
\.


--
-- Data for Name: aging_analysis; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.aging_analysis (id, loan_id, customer_id, branch_id, current_age, aging_bucket, principal_overdue, interest_overdue, penalty_overdue, total_overdue, collection_agent_id, collection_strategy, next_action_date, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: aml_checks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.aml_checks (id, customer_id, check_type, check_result, match_score, matched_names, check_data, performed_by, performed_at, reviewed_by, reviewed_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: approval_limits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.approval_limits (id, role, min_amount, max_amount, approval_level, requires_next_level, sla_hours, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, action, entity, entity_id, changes, ip_address, user_agent, metadata, created_at) FROM stdin;
9131883d-5003-4e1d-936c-dd4820a60568	\N	POST /api/auth/login	auth	login	{"email": "dearnull85@gmail.com", "password": "ZX0966566414!"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 1041, "statusCode": 401}	2026-02-14 04:41:40.232
8cc9f243-02c1-4e7b-929f-02fa7125f907	\N	POST /api/auth/login	auth	login	{"email": "dearnull85@gmail.com", "password": "Zx0966566414!"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 875, "statusCode": 200}	2026-02-14 04:41:48.543
85b0d082-5922-4ed6-88c8-3d0d35b98019	b0a90dc5-e982-45a4-be79-f9b2be0a8bae	POST /api/customers	customers	\N	{"email": "phat@gmail.com", "phone": "0966566414", "taxId": "1329900959405", "thaiId": "1329900959405", "address": "123 Watcharaphon Tharang Bangkhen Bangkok 10220", "businessName": "Evena Lab", "businessType": "เทคโนโลยี"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 84, "statusCode": 201, "requestRole": "OFFICER", "requestEmail": "dearnull85@gmail.com", "requestUserId": "b0a90dc5-e982-45a4-be79-f9b2be0a8bae"}	2026-02-14 04:56:55.683
040cc57f-8dcf-46c6-a42e-82a14ea82fd9	\N	POST /api/auth/login	auth	login	{"email": "phattarapong.phe@gmail.com", "password": "0966566414"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 241, "statusCode": 200}	2026-02-14 05:07:46.219
28bf878c-b9bc-4d00-9118-e3ff34fc2389	b0a90dc5-e982-45a4-be79-f9b2be0a8bae	POST /api/loans	loans	\N	{"loanType": "SME", "principal": 5000000, "annualCogs": 3744000, "annualOpex": 2496000, "customerId": "18ef4ce6-acf2-4b69-ac5b-f6b1a398fc20", "paymentDay": 1, "termMonths": 30, "interestRate": 1, "annualRevenue": 30000000, "loanProductId": "d23b486c-ccc2-4376-bc18-e1c161fc69ce"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 632, "statusCode": 201, "requestRole": "OFFICER", "requestEmail": "dearnull85@gmail.com", "requestUserId": "b0a90dc5-e982-45a4-be79-f9b2be0a8bae"}	2026-02-14 05:30:37.114
9a8c7f16-bc66-4ea5-b730-4fa4ca8bc89c	\N	POST /api/auth/login	auth	login	{"email": "globalcompanymula@gmail.com", "password": "Zx0966566414!"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 329, "statusCode": 200}	2026-02-14 05:31:06.266
39f49da2-67e3-4d52-923a-09352a847b71	4fade8f4-67f5-4301-98fd-07daf590d0ae	POST /api/loans/001efd65-2579-4012-8bb4-3f5bc08c0649/approve	loans	001efd65-2579-4012-8bb4-3f5bc08c0649	{"notes": "อนุมัติโดยระบบ"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 93, "statusCode": 200, "requestRole": "MANAGER", "requestEmail": "globalcompanymula@gmail.com", "requestUserId": "4fade8f4-67f5-4301-98fd-07daf590d0ae"}	2026-02-14 05:31:16.227
7741bc88-f391-4dcf-8a7c-836d0c964638	\N	POST /api/auth/refresh	auth	refresh	{"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMGE5MGRjNS1lOTgyLTQ1YTQtYmU3OS1mOWIyYmUwYThiYWUiLCJzZXNzaW9uSWQiOiI0M2NiMTdiMy01NTU3LTQzYTQtODgxMi1jMTY2MmEwNDY4MDUiLCJqdGkiOiI0OTM2NTczMS0xMmE2LTRmMjEtYmUwZi00MjQ1OTY1MWEwZjUiLCJpYXQiOjE3NzEwNDQxMDgsImV4cCI6MTc3MTY0ODkwOH0.x9t2LONl6VVpACX3j33QXCKTFDsCexqj3nKJcdOyTxI"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 99, "statusCode": 200}	2026-02-14 05:38:12.974
dd8eb242-aa67-4b83-b5b5-fb774a8f516f	\N	POST /api/auth/refresh	auth	refresh	{"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0OTg2N2VkOC01YzdhLTQ4NWQtYWQxYS04OTEzOTAxMjY4NDAiLCJzZXNzaW9uSWQiOiJjMTE0OTM2ZS1iMjBjLTQ3NjctOWQ4YS1lNWMxM2E1M2QwZGMiLCJqdGkiOiJjZDk2ODlhZC1kMjA2LTQ2NTctYmRlMS0zOWEzMGE5NmQ5NmQiLCJpYXQiOjE3NzEwNDU2NjYsImV4cCI6MTc3MTY1MDQ2Nn0.bqcuSUaLOln5sMl440bk7fqSTi8nDZqi55bKsBkeQgI"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 90, "statusCode": 200}	2026-02-14 06:03:32.223
07c6ea4a-6370-4656-b0cd-c4b4f2dc0f40	\N	POST /api/auth/refresh	auth	refresh	{"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZmFkZThmNC02N2Y1LTQzMDEtOThmZC0wN2RhZjU5MGQwYWUiLCJzZXNzaW9uSWQiOiJjN2ZkY2RhNi02NTZiLTQ2Y2YtODYyZS0wZjcxMTJiNjJiN2EiLCJqdGkiOiJlNjY3MDNhYy1jM2E2LTRiNjgtYWMyZC0yZjFkMjM3OTc4N2UiLCJpYXQiOjE3NzEwNDcwNjYsImV4cCI6MTc3MTY1MTg2Nn0.oLHU9EM4qlDq4bSSFqSTfx9mkREF6V59ovBWRD0aUpM"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 82, "statusCode": 200}	2026-02-14 06:28:28.352
d6b53b3c-6aa5-4287-a73e-de3b35c0b52f	\N	POST /api/auth/refresh	auth	refresh	{"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMGE5MGRjNS1lOTgyLTQ1YTQtYmU3OS1mOWIyYmUwYThiYWUiLCJzZXNzaW9uSWQiOiI0M2NiMTdiMy01NTU3LTQzYTQtODgxMi1jMTY2MmEwNDY4MDUiLCJqdGkiOiIzNzg3ZmQ0NC00YTRkLTQ4YzgtOTc5Mi01ZDNjODFkMzlkZGMiLCJpYXQiOjE3NzEwNDc0OTIsImV4cCI6MTc3MTY1MjI5Mn0.0O2QZWP5_SfZVVczvaIpboihZwIv1M4hCXjgYWskZ6A"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 94, "statusCode": 200}	2026-02-14 06:37:08.629
7284795a-e31e-451f-a690-1b1e0ed0a9dc	\N	POST /api/auth/login	auth	login	{"email": "phattarapong.phe@gmail.com", "password": "0966566414"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 154, "statusCode": 200}	2026-02-14 07:37:15.449
bc14c610-4fdf-4a7d-9eb7-85e136663e0b	\N	POST /api/auth/refresh	auth	refresh	{"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZmFkZThmNC02N2Y1LTQzMDEtOThmZC0wN2RhZjU5MGQwYWUiLCJzZXNzaW9uSWQiOiJjN2ZkY2RhNi02NTZiLTQ2Y2YtODYyZS0wZjcxMTJiNjJiN2EiLCJqdGkiOiJmNzg0NzhjNC02ZTMzLTQ2ZmItOTVlZi1lZWY5ZDA1M2FhNzIiLCJpYXQiOjE3NzEwNTA1MDgsImV4cCI6MTc3MTY1NTMwOH0.ky79WpIVKnImYLU22xnt5ERa97LIkCcwowd215t5x_M"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 411, "statusCode": 200}	2026-02-14 07:38:00.882
f01cd29a-40b8-48bf-bf02-88804639b151	\N	POST /api/auth/refresh	auth	refresh	{"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMGE5MGRjNS1lOTgyLTQ1YTQtYmU3OS1mOWIyYmUwYThiYWUiLCJzZXNzaW9uSWQiOiI0M2NiMTdiMy01NTU3LTQzYTQtODgxMi1jMTY2MmEwNDY4MDUiLCJqdGkiOiJmZjk1YzVlMi01YTExLTQxNzEtODBiYy04ZTA2ODMxZTQzNjEiLCJpYXQiOjE3NzEwNTEwMjgsImV4cCI6MTc3MTY1NTgyOH0.4d2ZnRwalF8mwzmHbqQEUHfWaZbc8IhX3iOcWbjYRHQ"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 257, "statusCode": 200}	2026-02-14 08:13:32.086
c188ceec-3efa-4db1-9320-53e74962fea4	\N	POST /api/auth/refresh	auth	refresh	{"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0OTg2N2VkOC01YzdhLTQ4NWQtYWQxYS04OTEzOTAxMjY4NDAiLCJzZXNzaW9uSWQiOiJjMTE0OTM2ZS1iMjBjLTQ3NjctOWQ4YS1lNWMxM2E1M2QwZGMiLCJqdGkiOiIwNDE2NGM4OS1kZTA1LTQ1NzUtYWMyZS03ZWZkNDhiODY1NjYiLCJpYXQiOjE3NzEwNDkwMTIsImV4cCI6MTc3MTY1MzgxMn0.XUoqv5dXNLuT67Rt-23pXH2LsDJR1A2TjqnYqAUgGsE"}	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"duration": 282, "statusCode": 200}	2026-02-14 08:32:26.358
\.


--
-- Data for Name: blocked_ips; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blocked_ips (id, ip_address, reason, blocked_by, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: product_budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_budgets (id, product_id, product_code, product_name, fiscal_year, quarter, total_budget_amount, committed_amount, disbursed_amount, pending_amount, available_amount, utilization_rate, warning_threshold, critical_threshold, budget_status, budget_owner, notes, created_by, created_at, updated_at, version) FROM stdin;
0ae1816e-2590-4495-9cea-9ff2b84a5264	d23b486c-ccc2-4376-bc18-e1c161fc69ce	SME-FIXED-001	สินเชื่อ SME เพื่อขยายกิจการ (อัตราคงที่)	2026	\N	500000000.00	0.00	0.00	0.00	500000000.00	0.00	80.00	95.00	ACTIVE	\N		49867ed8-5c7a-485d-ad1a-891390126840	2026-02-14 05:25:06.788	\N	1
\.


--
-- Data for Name: budget_consumption; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.budget_consumption (id, product_budget_id, loan_id, branch_id, requested_amount, approved_amount, disbursed_amount, consumption_type, status, consumption_date, consumption_time, processed_by, released_amount, released_at, released_by, created_at, updated_at, idempotency_key) FROM stdin;
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calendar_events (id, branch_id, created_by, title, description, start_date, end_date, all_day, event_type, category, loan_id, customer_id, recurring, recurrence_rule, reminder_minutes, location, attendees, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: collection_workflow_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.collection_workflow_steps (id, days_overdue_from, days_overdue_to, action_type, template_id, priority, assigned_role, sla_hours, is_active, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: contact_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contact_logs (id, customer_id, loan_id, officer_id, contact_date, contact_status, contact_method, notes, promised_date, task_id, next_follow_up_date, outcome, created_at) FROM stdin;
\.


--
-- Data for Name: conversation_states; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversation_states (id, line_user_id, flow, step, data, state, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: credit_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_lines (id, customer_id, credit_line_number, approved_limit, current_balance, available_balance, utilization_rate, interest_rate, start_date, expiry_date, review_date, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: credit_line_drawdowns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_line_drawdowns (id, credit_line_id, drawdown_number, amount, purpose, drawdown_date, maturity_date, interest_rate, status, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: customer_active_products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_active_products (id, customer_id, loan_product_id, loan_id, activated_at, deactivated_at, status) FROM stdin;
\.


--
-- Data for Name: customer_bank_statements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_bank_statements (id, customer_id, bank_name, account_number, account_name, created_at, updated_at) FROM stdin;
8f137e07-735f-4373-a863-b59ce0d7aa1c	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	ธนาคาร	\N	\N	2026-02-13 06:09:44.158	2026-02-13 06:09:44.158
f249a635-76ec-421d-901c-da04f6beaef4	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	ธนาคาร/เลขบัญชี	715-6-04428-1	\N	2026-02-13 06:09:44.171	2026-02-13 06:09:44.171
\.


--
-- Data for Name: customer_bank_statement_months; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_bank_statement_months (id, statement_id, month, withdraw_count, withdraw_amount, deposit_count, deposit_amount, balance) FROM stdin;
f772f04c-161d-4ddf-88d4-481df58f37d1	8f137e07-735f-4373-a863-b59ce0d7aa1c	24654	0	24654.00	0	-2741933.67	-2741933.67
1b3bff18-b582-4e8c-ba09-c68c935440ff	8f137e07-735f-4373-a863-b59ce0d7aa1c	24746	0	24746.00	0	-2741933.67	4669067.28
ad955958-91a3-419e-8f68-44bb65a14132	8f137e07-735f-4373-a863-b59ce0d7aa1c	24838	24838	24.00	24098918	77.00	23345336.42
4e4988b4-e6ca-41b9-b951-0e8eb53e64a3	8f137e07-735f-4373-a863-b59ce0d7aa1c	24869	24869	22.00	22159130	70.00	22290446.94
5d0cff6d-1b36-40ce-bb85-8df1f0c37c7c	8f137e07-735f-4373-a863-b59ce0d7aa1c	24898	24898	20.00	23814662	73.00	23814662.54
898e98f1-5b5e-4ef1-bc6a-3a2683793cc5	8f137e07-735f-4373-a863-b59ce0d7aa1c	24929	24929	22.00	25865671	80.00	25585939.94
47ab32d6-3733-41db-853a-7850d75a4d8c	8f137e07-735f-4373-a863-b59ce0d7aa1c	24959	24959	20.00	22585997	71.00	23665025.99
9ad7b732-dacf-4f7f-9b76-a784905599cb	8f137e07-735f-4373-a863-b59ce0d7aa1c	24990	24990	25.00	27303429	82.00	25955991.69
3c517cf9-8f20-4c3e-8c88-c0de7bc99182	8f137e07-735f-4373-a863-b59ce0d7aa1c	25020	25020	21.00	23604947	77.00	23725296.66
97192b5f-a618-4d59-8aa8-986cca62c33e	f249a635-76ec-421d-901c-da04f6beaef4	24654	0	24654.00	0	0.00	0.00
f6027486-bfc8-4a4b-be2c-e7f53964d467	f249a635-76ec-421d-901c-da04f6beaef4	24746	0	24746.00	0	0.00	0.00
ed32a8a8-3fb7-470b-bca0-25f19a583667	f249a635-76ec-421d-901c-da04f6beaef4	24838	24838	0.00	0	0.00	0.00
\.


--
-- Data for Name: customer_business_histories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_business_histories (id, customer_id, type, content, details, created_at) FROM stdin;
b8115ede-c2d5-4e98-96ae-03537eef215b	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	EXECUTIVES	\N	[{"age": "61 ปี", "name": "นายเสมอ จันทร์เทศ", "education": "ปริญญาตรี คณะนิติศาสตร์ มหาวิทยาลัยรามคำแหง"}, {"age": "62 ปี", "name": "น.ส.ฐิติพร  เตชะพันธุ์", "education": "ปริญญาตรี คณะนิติศาสตร์ มหาวิทยาลัยรามคำแหง"}]	2026-02-13 06:09:44.194
31f3d92a-8fc3-4588-863b-4989f0868dfc	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	SHAREHOLDERS	\N	[{"name": "1.นายสุทธิเกียรติ  สุขบุญรักษา", "shares": 2250000, "percentage": 45}, {"name": "2.นายวราพงษ์  สุขบุญรักษา", "shares": 2250000, "percentage": 45}, {"name": "3.น.ส.วริยา  สระสำราญ", "shares": 500000, "percentage": 10}]	2026-02-13 06:09:44.196
\.


--
-- Data for Name: customer_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_comments (id, customer_id, topic, content, created_at) FROM stdin;
0da933c5-6038-4862-84c8-7967c08c662f	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 1. เงินกู้ระยะสั้นตามตั๋วสัญญาใช้เงิน(P/N)  วงเงิน  3,000,000 บาท	2026-02-13 06:09:44.179
2c51568e-b663-439a-b4de-22405984fe9f	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	  -  วัตถุประสงค์เพื่อเป็นเงินทุนหมุนเวียนในกิจการ	2026-02-13 06:09:44.179
85761d4a-f992-4fd5-ab47-b89fb54e1c03	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	   - ระยะเวลากู้  10 ปี  ทบทวนวงเงินทุกปี  ระยะเวลาตั๋วแต่ละฉบับไม่เกิน 90 วัน	2026-02-13 06:09:44.179
d35e83b4-4022-49d7-9ec9-bb54ffef960f	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	  - อัตราดอกเบี้ย           ปีที่ 1-3   Fix 3.00% ต่อปี         	2026-02-13 06:09:44.179
eccd1bc2-8005-4728-8414-b5fef2498557	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	               ปีที่  4     เป็นต้นไป  MLR+1.50% ต่อปี       ปัจจุบัน MLR = 7.1%        	2026-02-13 06:09:44.179
e7cd3328-ee15-4ac8-b69c-745d308fd06e	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	  - หลักประกัน 1. จดจำนองโฉนดที่ดินเลขที่ 19857  ต.ศิลาลอย  อ.สามร้อยยอด  จ.ประจวบคีรีขันธ์ เนื้อที่ 1 ไร่  	2026-02-13 06:09:44.179
d2e91898-a0e4-489a-ba70-bcdf07220b5b	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	                -โฉนดที่ดินเลขที่  11262   ต.ทรายทอง  อ.บางสะพานน้อย  จ.ประจวบคีรีขันธ์  เนื้อที่  0-1-80   ไร่กรรมสิทธิ์  นายเสน่ห์ สุขบุญรักษา บสย.ค้ำประกันเต็มวงเงิน	2026-02-13 06:09:44.179
d0e456b7-8b29-4a83-b7ad-3aa9cfacf19a	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	           2.  บุคคลค้ำประกันเต็มวงเงิน 2 คน ได้แก่   นายสุทธิเกียรติ  สุขบุญรักษา  ,  นายวราพงษ์  สุขบุญรักษา บสย.ค้ำประกันเต็มวงเงิน	2026-02-13 06:09:44.179
f6617856-3bfb-41ad-a2d2-8b2825eeb159	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	กรรมสิทธิ์ น.ส.ฐิติพร เตชะพันธุ์	2026-02-13 06:09:44.179
a4f9d5bd-41a3-4547-a368-dea024ba853b	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	2. บุคคลค้ำประกัน 2 ท่าน   ได้แก่  นายเสมอ  จันทร์เทศ  , น.ส.ฐิติพร  เตชะพันธุ์	2026-02-13 06:09:44.179
e9a5b713-77dc-4bdb-b0a7-56b28334c51c	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	  - เงื่อนไขการเบิกจ่าย   ให้มีเอกสารด้านการซื้อน้ำมัน  ได้แก่  ใบกำกับภาษี  หรือใบเสร็จรับเงิน  ประกอบการเบิกจ่าย	2026-02-13 06:09:44.179
444b0055-4430-4b44-9c88-ab684ca3d38b	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 2. เงินกู้ระยะยาว (F/L)  วงเงิน  1.40 ล้านบาท	2026-02-13 06:09:44.179
56a5ebb8-971f-4f7c-be47-b66783c77382	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	  -  วัตถุประสงค์เพื่อสมทบซื้อเครื่องตู้อบรมควัน 1 เครื่อง	2026-02-13 06:09:44.179
52e112af-50d6-4a92-af48-aeca79329fd9	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	   - ระยะเวลากู้  7 ปี  	2026-02-13 06:09:44.179
61cdb7f5-ce11-4382-8a5e-97b1b089580f	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	  - อัตราดอกเบี้ย           ปีที่ 1-2   MLR-2.75% ต่อปี              ปีที่3 เป็นต้นไป  MLR+0.75%ต่อปี                               ปัจจุบัน MLR = 7.25%        	2026-02-13 06:09:44.179
3938cf9a-854b-47a7-8e44-2f691805cd99	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	              ปีที่ 4     เป็นต้นไป  MLR+1.50% ต่อปี 	2026-02-13 06:09:44.179
4a316553-f771-46f1-a85d-065863b45c38	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	  - หลักประกัน  - บสย.ค้ำประกันเต็มวงเงิน	2026-02-13 06:09:44.179
f19bc7fb-9b36-4bf9-907b-5004214fe41b	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	                -โฉนดที่ดินเลขที่  11262   ต.ทรายทอง  อ.บางสะพานน้อย  จ.ประจวบคีรีขันธ์  เนื้อที่  0-1-80   ไร่กรรมสิทธิ์  นายเสน่ห์ สุขบุญรักษา บสย.ค้ำประกันเต็มวงเงิน	2026-02-13 06:09:44.179
174c549e-6d1b-4943-b387-68f901d8f781	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	           2.  บุคคลค้ำประกันเต็มวงเงิน 2 คน ได้แก่   นายสุทธิเกียรติ  สุขบุญรักษา  ,  นายวราพงษ์  สุขบุญรักษา บสย.ค้ำประกันเต็มวงเงิน	2026-02-13 06:09:44.179
e8a30dd9-3f1b-4590-a344-96154a6da392	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 - บุคคลค้ำประกัน 3 ท่าน ได้แก่  น.ส.ปุณยสรณ์ สิรนันทนาวัฒน์  , น.ส.ภิดาพรรธน์  สิรนันทนาวัฒน์	2026-02-13 06:09:44.179
9e2c10cd-b81b-4ebc-b501-3ab5115538df	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	นายวีรนันท์  สิรนันทนาวัฒน์	2026-02-13 06:09:44.179
9061a2d7-45fd-4ff1-9102-836fc26f02a8	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 -ให้จดทะเบียนเครื่องจักรเป็นหลักประกันทางธุรกิจ	2026-02-13 06:09:44.179
083e065f-c850-4ef0-86c5-eeaa45cfd8c4	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	  - เงื่อนไขการเบิกจ่าย  ให้มีเอกสารใบเสนอราคา และใบวางบิล หรือใบแจ้งหนี้ พร้อมภาพถ่ายเครื่องจักรประกอบการเบิกจ่าย	2026-02-13 06:09:44.179
09e1de73-463c-4df1-a76f-07088c47a773	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	รายการเครื่องจักร	2026-02-13 06:09:44.179
142d12c3-e98d-478d-9438-dcdfc53b8915	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	ตู้อบรมควัน : TL-111-1S จำนวน 1 เครื่อง กำลังการผลิต 150กก./ครั้ง	2026-02-13 06:09:44.179
3f7b6da1-c7ad-4350-b147-c94c4e81b07d	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	ตามใบเสนอราคา ลงวันที่ 28 มิ.ย.2568 เลขที่ B250617-03Rev.01	2026-02-13 06:09:44.179
a0a55109-5ddf-47ed-8c55-be379a8d1111	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	จาก บจก.ทะเลเทคโนโลยี	2026-02-13 06:09:44.179
cb3413c5-947c-4d5c-8a84-55290ed70e83	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	เหตุผลสนับสนุน	2026-02-13 06:09:44.179
dc890192-dcd9-4cef-9f89-7ba84f956afc	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 -ผู้กู้  บจก.เพชรเกษมฐิติพร  จดทะเบียนเป็นนิติบุคคลเมื่อวันที่ 3 พ.ค.2538  ทะเบียนนิติบุคคลเลขที่ 0775538000226  ทุนจดทะเบียน 1,000,000 บาท	2026-02-13 06:09:44.179
da620794-a46c-4413-a58f-2f7b36c7634a	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	ประกอบธุรกิจสถานีบริการน้ำมันบางจาก  การถือหุ้น	2026-02-13 06:09:44.179
15124a4f-edc7-4232-8da1-364e143b3c74	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	ชื่อผู้ถือหุ้น สัดส่วนหุ้น	2026-02-13 06:09:44.179
40219baa-2149-45b3-9f37-401de1e3c3b9	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	น.ส.ฐิติพร เตชะพันธุ์ กรรมการหนึ่งคนลงลายมือชื่อ	2026-02-13 06:09:44.179
75ccfea2-793a-485a-8f5c-8a28aa546501	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	นายเสมอ จันทร์เทศ และประทับตราบริษัท	2026-02-13 06:09:44.179
1d835f5a-1f7d-4406-b7f9-469cdc90b7a2	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	นางสุมา เพ็ญรัตนา	2026-02-13 06:09:44.179
be2d1c91-5933-42eb-bb32-c3ec30ca7677	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 -ผู้กู้มีประสบการณ์ในการประกอบกิจการสถานีบริการน้ำมันมากว่า 30 ปี  ปัจจุบันบริหารงานสถานีบริการน้ำมัน 48 หัวจ่าย มีพนักงาน 15 คน	2026-02-13 06:09:44.179
87d2eeaa-8208-4b91-9902-0e1847d2efbc	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 -จากสัญญาให้ใช้สิทธิดำเนินการสถานีบริการ วันเริ่มสัญญา 1 ก.ย.2567 วันสิ้นสุดสัญญา 31 ส.ค.2568  ระหว่างบมจ.บางจาก ศรีราชา(ผู้ให้ใช้สิทธิ)  	2026-02-13 06:09:44.179
9baf57ee-b8a7-44ae-93b6-8b63627e7994	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	กับ บจก.เพชรเกษมฐิติพร(ผู้ใช้สิทธิ)  อนุญาตให้ใช้สิทธิ ดำเนินการสถานีบริการน้ำมันภายใต้เครื่องหมายการค้าบางจาก บนเนื้อที่  6-2-0 ไร่ 	2026-02-13 06:09:44.179
0b172cbf-1ed9-4908-b181-aaccfb79ecc0	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	ตั้งอยู่เลขที่ 482  หมู่ 2  ต.วังก์พง  อ.ปราณบุรี  จ.ประจวบฯ ตกลงจ่ายค่าใช้สิทธิเป็นรายเดือน ในอัตราเดือนละ 75,000 บาท	2026-02-13 06:09:44.179
75331dec-f429-4e8b-9fdd-edd9d9a95418	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 -ผู้กู้ได้ต่อสัญญาให้ใช้สิทธิดำเนินการสถานีบริการน้ำมันภายใต้เครื่องหมายการค้าบางจาก   ตกลงจ่ายค่าใช้สิทธิเป็นรายเดือน  ในอัตราเดือนละ	2026-02-13 06:09:44.179
1838ba4f-9c45-400f-b177-a0432fd12f78	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 -ใบอนุญาตเลขที่ 2/2567 แบบ ธพ.น.2 กรมธุรกิจพลังงาน ใบอนุยษตประกอบกิจการ สถานีบริการน้ำมัน ประเภท ก ใบอนุญาตนี้ออกให้เพื่อแสดงว่า	2026-02-13 06:09:44.179
21dd727f-9d45-4cc4-8a75-49d881ea2ea8	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	บมจ.บางจาก ศรีราช เป็นผู้ได้รับอนุญาตให้ประกอบกิจการควบคุมประเภทที่ 3 ตามมาตรา 17(3) แห่งพระราชบัญญัติควบคุมร้ำมันเชื้อเพลิง 	2026-02-13 06:09:44.179
0fcade28-0605-4b4c-8806-0141005f48e5	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	พ.ศ.2542 ณ สถานีบริการน้ำมัน บจก.เพชรเกษมฐิติพร ใบอนุญาตนี้ให้ใช้ได้จนถึงวันที่ 31 ธ.ค.2568 ออกให้ ณ วันที่ 12 พ.ย.2567	2026-02-13 06:09:44.179
ce71dc16-126b-4231-a2cc-a16cbbf31c4d	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	ความจุถังเก็บรักษาน้ำมันเชื้อเพลิงใต้พื้นดิน	2026-02-13 06:09:44.179
3e2aca81-4bf2-4eb9-acb6-c2e290cbfd5c	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	2. ดีเซลพลัส 	2026-02-13 06:09:44.179
0df6367d-124e-4b98-bcac-d7475e0ce325	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	3. แก๊สโซฮอล์ 95	2026-02-13 06:09:44.179
da33722c-42c8-451f-b040-4b6fb395772b	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	4. แก๊สโซฮอล์ 91	2026-02-13 06:09:44.179
92c660eb-9a03-4858-b1a7-ca57dd721a4c	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	5. แก๊สโซฮอล์E20	2026-02-13 06:09:44.179
451cd40d-268b-42ab-8180-b7937e62569d	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	6. น้ำมันหล่อลื่น	2026-02-13 06:09:44.179
39d9b7e3-3071-49e1-a243-c2b66f566151	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 -ใบอนุญาตเลขที่ ปข0120028 แบบ ธพ.น.2  กรมธุรกิจพลังงาน ใบอนุญาตประกอบกิจการ ถังขนส่งน้ำมัน ใบอนุญาตนี้ออกให้เพื่อแสดงว่า	2026-02-13 06:09:44.179
e04d92c7-199d-4bda-9606-58f62402d86a	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	บจก.เพชรเกษมฐิติพร  เป็นผู้ได้รับอนุญาตให้ประกอบกิจการควบคุมประเภทที่ 3 ตามมาตรา 17(3) แห่งพระราชบัญญัติควบคุมน้ำมันเชื้อเพลิง	2026-02-13 06:09:44.179
a8117ca8-ecf1-4a3c-9edd-9197b30bc8d0	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	พ.ศ.2542  ประเภทรถขนส่งน้ำมัน ชนิดรถกึ่งพ่วง หมายเลขทะเบียน 81-3987 ประจวบคีรีขันธ์ ปริมาตรรวม 32,000 ลิตร ใบอนุญาตนี้ให้ใช้ได้จน	2026-02-13 06:09:44.179
97f068f7-be48-4f4d-8216-5c3ba849f6e6	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	ถึงวันที่ 31 ธ.ค.2568  ออกให้ ณ วันที่ 15 ม.ค.2568	2026-02-13 06:09:44.179
99a49d45-3114-444f-b1b8-5ef91c22d809	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 -จากงบการเงิน ปี 2567 มีรายได้รวม 282.83 ล้านบาท   ต้นทุนขาย 272.90 ล้านบาท  ค่าใช้จ่ายในการขาย 4.65 ล้านบาท ค่าใช้จ่ายในการบริหาร 	2026-02-13 06:09:44.179
5b45d8b3-f333-4d77-83cc-29c7ca09e575	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	3.49 ล้านบาท  ดอกเบี้ยจ่าย 0.30 ล้านบาท  ค่าใช้จ่ายภาษีเงินได้ 0.29 ล้านบาท  กำไรสุทธิ 1.18 ล้านบาท	2026-02-13 06:09:44.179
ea04802a-3ec9-4c97-ae22-83a7c023d1f5	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 - ปี 2568 สาขาประมาณการรายได้จาก ภ.พ.30  ม.ค.2568-มิ.ย. 2568  ยอดขายรวม  139.72 ล้านบาท   ต้นทุนขายเฉลี่ย  96.49%	2026-02-13 06:09:44.179
7764e1df-84a3-41ee-a67d-0d76e5cad366	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	ค่าใช้จ่ายในการขาย 1.65%  ค่าใช้จ่ายในการบริหาร 1.23%   ประมาณการรายได้เพียงพอชำระหนี้ได้ DSCR 1.67 เท่า	2026-02-13 06:09:44.179
338759cb-f0b7-4f6f-b424-dfed6a009c8d	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 - ผลตรวจข้อมูลเครดิตบูโรผู้กู้ ไม่พบประวัติเสียหายทางการเงิน และตรวจข้อมูล Black List  ไม่พบเป็นบุคคลล้มละลายหรือพิทักทรัพย์	2026-02-13 06:09:44.179
6d388021-f82a-47c6-9203-b6793359d7e4	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	ผู้กู้เป็นลูกค้าเก่าของธนาคาร ชำระตรงตามเงื่อนไข ปัจจุบันสถานะบัญชีปิดบัญชี	2026-02-13 06:09:44.179
cfd48ea4-aeb9-44ae-83c1-566f16c03eea	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 -นายเสมอ จันทร์เทศ  มีประสบการณ์ในการบริหารสถานีบริการน้ำมันมากกว่า 30 ปี  ปัจจุบันเป็นกรรมการผู้จัดการสถานีบริการน้ำมัน 2 แห่ง	2026-02-13 06:09:44.179
4c077334-6275-4a4d-a12b-5fea46ad8897	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	  แห่งที่ 1  สถานีบริการน้ำมัน บางจาก บจก.เพชรเกษมฐิติพร   ตั้งอยู่เลขที่ 482  หมู่ 2 ต.วังก์พง  อ.ปราณบุรี  จ.ประจวบคีรีขันธ์ 	2026-02-13 06:09:44.179
56772c98-cfd2-4afe-9889-04db86d271b1	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 แห่งที่ 2 สถานีบริการน้ำมัน บางจาก หจก.ธนัญธร ฐิติพร  ตั้งอยู่เลขที่ 35/20  ถ.เพชรเกษม  ต.หัวหิน  อ.หัวหิน  จ.ประจวบคีรีขันธ์	2026-02-13 06:09:44.179
99a26adc-6582-42db-b2a6-859d82e6a647	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	 - ครั้งนี้นำเสนอสินเชื่อโครงการ Beyond ติดปีก SME   P/N วงเงิน 3,000,000 บาท  เพื่อเป็นเงินทุนหมุนเวียนในการดำเนินธุรกิจ เพื่อช่วยลดต้นทุน	2026-02-13 06:09:44.179
6277b3ae-98e3-4200-9239-8422781380b4	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	ทางการเงินของผู้ประกอบการ ผู้กู้แจ้งว่า มีวงเงิน O/D กับธนาคารไทยพาณิชย์ อัตราดอกเบี้ย 7.025 สำหรับใช้ซื้อน้ำมัน  ซึ่งกิจการมีนโยบาย	2026-02-13 06:09:44.179
b459cbd1-8c1a-42d9-aff6-5ec84618432a	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	ให้เครดิตการค้าแก่ลูกค้าประจำที่เป็นประกอบธุรกิจขนส่ง รับเหมาก่อสร้าง ถมดินในพื้นที่อำเภอปราณบุรี 	2026-02-13 06:09:44.179
42059a9b-f113-4689-8cb9-20d8b470d9d4	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	…………………………………. …………………………………. ………………………………….	2026-02-13 06:09:44.179
d010a6b4-18fd-4661-bfca-bcdb3f9832d3	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	น.ส.วิภาสินี อยู่พ่วง นางขวัญนภา  ลัทธิธรรม นายจรัญ  สินพูล	2026-02-13 06:09:44.179
9f2ba53c-6827-4ec6-88c8-6086728f5288	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	Approval Comment	เจ้าหน้าที่การตลาด RO ผู้ช่วยผู้จัดการสาขาประจวบคีรีขันธ์ ผู้จัดการสาขาประจวบคีรีขันธ์	2026-02-13 06:09:44.179
\.


--
-- Data for Name: customer_credit_bureaus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_credit_bureaus (id, customer_id, type, name, check_date, total_limit, total_outstanding, number_of_accounts, npl_status, accounts, created_at, updated_at) FROM stdin;
1849e811-7dad-47aa-a178-2fe151bd44bb	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	BORROWER		2026-02-13 06:09:44.147	9200000.00	5908677.00	3	f	[{"bank": "ธนาคาร", "type": "สินเชื่อเพื่อการพาณิชย์", "limit": 242839, "status": "ปกติ", "payment": 2017167, "outstanding": 3000000}, {"bank": "ธนาคาร", "type": "สินเชื่อเพื่อการพาณิชย์", "limit": 243283, "status": "ปกติ", "payment": 96351, "outstanding": 200000}, {"bank": "ธนาคาร", "type": "สินเชื่อวงเงินเบิกเกินบัญชี", "limit": 235031, "status": "ปกติ", "payment": 3795159, "outstanding": 6000000}]	2026-02-13 06:09:44.148	2026-02-13 06:09:44.148
54441376-4f9e-4abb-bace-155f28413f9d	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	GUARANTOR		\N	0.00	0.00	0	f	[]	2026-02-13 06:09:44.153	2026-02-13 06:09:44.153
26a259f3-5257-4cc1-a901-b82d71d22dff	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	GUARANTOR	นายเสมอ  จันทร์เทศ      ตรวจสอบ ณ	\N	3473000.00	83020.00	12	f	[{"bank": "ธ.กรุงเทพ", "type": "บัตรเครดิต", "limit": 243906, "status": "ปกติ", "payment": 0, "outstanding": 100000}, {"bank": "ธ.กรุงเทพ", "type": "บัตรเครดิต", "limit": 240780, "status": "ปกติ", "payment": 0, "outstanding": 100000}, {"bank": "ธ.กรุงเทพ", "type": "บัตรเครดิต", "limit": 239522, "status": "ปกติ", "payment": 0, "outstanding": 100000}, {"bank": "ธ.กรุงเทพ", "type": "บัตรเครดิต", "limit": 238475, "status": "ปกติ", "payment": 0, "outstanding": 100000}, {"bank": "บจก.คาร์ด เอกซ์", "type": "บัตรเครดิต", "limit": 241676, "status": "ปกติ", "payment": 32901, "outstanding": 400000}, {"bank": "บจก.คาร์ด เอกซ์", "type": "บัตรเครดิต", "limit": 236440, "status": "ปกติ", "payment": 173, "outstanding": 400000}, {"bank": "บจก.คาร์ด เอกซ์", "type": "บัตรเครดิต", "limit": 235343, "status": "ปกติ", "payment": 0, "outstanding": 400000}, {"bank": "บจก.คาร์ด เอกซ์", "type": "บัตรเครดิต", "limit": 235343, "status": "ปกติ", "payment": 252, "outstanding": 400000}, {"bank": "ธ.กสิกรไทย", "type": "บัตรเครดิต", "limit": 237549, "status": "ปกติ", "payment": 6279, "outstanding": 528000}, {"bank": "บจก.บัตรกรุงศรีอยุธยา", "type": "บัตรเครดิต", "limit": 231535, "status": "ปกติ", "payment": 6038, "outstanding": 195000}, {"bank": "บจก.โลตัสส์ มันนี่ เซอร์วิสเซส", "type": "บัตรเครดิต", "limit": 240481, "status": "ปกติ", "payment": 32937, "outstanding": 250000}, {"bank": "ธ.ยูโอบี", "type": "บัตรเครดิต", "limit": 242422, "status": "ปกติ", "payment": 4440, "outstanding": 500000}]	2026-02-13 06:09:44.153	2026-02-13 06:09:44.153
b0d2a903-0410-4e93-b104-a604da9b9da9	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	GUARANTOR	น.ส.ฐิติพร เตชะพันธุ์          ตรวจสอบ ณ	\N	150000.00	51584.00	2	f	[{"bank": "บจก.คาร์ด เอกซ์", "type": "บัตรเครดิต", "limit": 233228, "status": "ปกติ", "payment": 0, "outstanding": 45000}, {"bank": "ธ.ไทยพาณิชย์", "type": "บัตรเครดิต", "limit": 241647, "status": "ปกติ", "payment": 51584, "outstanding": 105000}]	2026-02-13 06:09:44.153	2026-02-13 06:09:44.153
\.


--
-- Data for Name: customer_financial_statements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_financial_statements (id, customer_id, year, revenue, gross_profit, net_profit, cost_of_sales, selling_expenses, admin_expenses, ebitda, total_assets, total_liabilities, total_equity, current_assets, non_current_assets, current_liabilities, non_current_liabilities, created_at, updated_at) FROM stdin;
11c15920-d10d-4207-a06f-2aa564c4eda2	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	2026	272299060.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-13 06:09:44.126	2026-02-13 06:09:44.126
0ce62e02-0654-4e66-8c0f-8bb0b92e0a9e	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	ปี 2565	\N	\N	\N	\N	\N	\N	\N	26660141.09	26543879.70	18550662.71	9053616.95	17606524.14	5497105.46	2496111.53	2026-02-13 06:09:44.126	2026-02-13 06:09:44.126
bb73f0f7-f58d-4ca0-9183-e9229b4b16d0	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	ปี 2566	\N	\N	\N	\N	\N	\N	\N	1.00	1.00	0.70	0.34	0.66	0.21	0.09	2026-02-13 06:09:44.126	2026-02-13 06:09:44.126
927633ae-f39a-4eb1-9db8-f0054a00e8d5	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	ปี 2567	\N	\N	\N	\N	\N	\N	\N	27800415.40	27684154.01	19735707.77	8967198.42	18833216.98	5894796.41	2053649.83	2026-02-13 06:09:44.126	2026-02-13 06:09:44.126
\.


--
-- Data for Name: customer_investments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_investments (id, customer_id, description, total_amount, own_share, loan_share, created_at, updated_at) FROM stdin;
2d483efd-573d-4232-a610-24415232acae	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	1.ที่ดิน+สิ่งปลูกสร้าง(ปั้มน้ำมัน)	3042137.00	0.00	3042137.00	2026-02-13 06:09:44.13	2026-02-13 06:09:44.13
836ef029-477c-4540-9d23-aabe8f527233	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	2. ที่ดิน (หลักประกันครั้งนี้)	2092193.00	0.00	2092193.00	2026-02-13 06:09:44.13	2026-02-13 06:09:44.13
7123d071-e959-4d3d-877c-7ddf2b8977b3	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	3. เครื่องมือเครื่องใช้	2092193.00	164167.31	1928025.69	2026-02-13 06:09:44.13	2026-02-13 06:09:44.13
6d65174d-141e-4c28-82e1-aeb5bd9970e8	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	4. เครื่องใช้สำนักงาน	2092193.00	486776.20	1605416.80	2026-02-13 06:09:44.13	2026-02-13 06:09:44.13
16f8670c-1a46-4c78-89f4-619e4844bba3	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	2.งานระหว่างก่อสร้าง	0.00	0.00	0.00	2026-02-13 06:09:44.13	2026-02-13 06:09:44.13
b26a1f1d-f641-43c0-87d9-55d94d31e176	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	5. ยานพาหนะ	2092193.00	5449467.29	-3357274.29	2026-02-13 06:09:44.13	2026-02-13 06:09:44.13
cc98a7f9-37a2-4415-b6cf-623636d7f435	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	6. เงินทุนหมุนเวียน	9390264.32	390264.32	9000000.00	2026-02-13 06:09:44.13	2026-02-13 06:09:44.13
c0022aa5-a65f-4fa2-b589-dd381c0ff6aa	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	7. สำรองค่าใช้จ่าย	6000000.00	0.00	6000000.00	2026-02-13 06:09:44.13	2026-02-13 06:09:44.13
\.


--
-- Data for Name: customer_projections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_projections (id, customer_id, year, revenue, cost_of_sales, gross_profit, expenses, net_profit, dscr, created_at, updated_at) FROM stdin;
dec98736-5c45-4bef-9c31-5cd84fdd1c3f	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	 - จากงบการเงินปี 2567  ค่าใช้จ่ายในการขาย  4,652,994 บาท  คิดเป็น  1.65%ของรายได้	1.00	0.00	8058911.11	0.00	0.00	2.12	2026-02-13 06:09:44.144	2026-02-13 06:09:44.144
\.


--
-- Data for Name: customer_vat_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_vat_records (id, customer_id, month, year, sales_amount, sales_tax, purchase_amount, purchase_tax, tax_payable, details, created_at, updated_at) FROM stdin;
49686ebe-e6ae-4020-9143-a261a6218e3f	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	243984	2026	24456300.66	1711941.05	24252770.37	1697693.78	14247.27	{"month": "243984", "salesTax": 1711941.05, "taxPayable": 14247.27, "purchaseTax": 1697693.78, "salesAmount": 24456300.66, "purchaseAmount": 24252770.37}	2026-02-13 06:09:44.114	2026-02-13 06:09:44.114
d2875945-1b3c-485a-bd82-5898564f71de	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	244015	2026	22467489.02	1572724.23	21421914.06	1499533.86	73190.37	{"month": "244015", "salesTax": 1572724.23, "taxPayable": 73190.37, "purchaseTax": 1499533.86, "salesAmount": 22467489.02, "purchaseAmount": 21421914.06}	2026-02-13 06:09:44.114	2026-02-13 06:09:44.114
105bbd6e-42f9-427a-9bac-07f11f062b57	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	244044	2026	25161108.23	1761277.57	25060511.74	1754235.75	7041.82	{"month": "244044", "salesTax": 1761277.57, "taxPayable": 7041.82, "purchaseTax": 1754235.75, "salesAmount": 25161108.23, "purchaseAmount": 25060511.74}	2026-02-13 06:09:44.114	2026-02-13 06:09:44.114
05e6731d-ffd6-48fd-a571-7b97e2283302	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	244075	2026	23239208.37	1626744.59	22105640.18	1547394.89	79349.70	{"month": "244075", "salesTax": 1626744.59, "taxPayable": 79349.7, "purchaseTax": 1547394.89, "salesAmount": 23239208.37, "purchaseAmount": 22105640.18}	2026-02-13 06:09:44.114	2026-02-13 06:09:44.114
3698d129-1ce1-426e-bea5-40760614c7c8	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	244105	2026	22347860.46	1564350.23	21569867.74	1509890.67	54459.56	{"month": "244105", "salesTax": 1564350.23, "taxPayable": 54459.56, "purchaseTax": 1509890.67, "salesAmount": 22347860.46, "purchaseAmount": 21569867.74}	2026-02-13 06:09:44.114	2026-02-13 06:09:44.114
d589458b-7a06-43b6-9ab2-8904e9ddc008	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	244136	2026	22057473.65	1544023.16	21981129.48	1538679.00	5344.16	{"month": "244136", "salesTax": 1544023.16, "taxPayable": 5344.16, "purchaseTax": 1538679, "salesAmount": 22057473.65, "purchaseAmount": 21981129.48}	2026-02-13 06:09:44.114	2026-02-13 06:09:44.114
160d7800-cd8d-4fa8-a770-531a0e1170fc	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	279458880.78000003	2026	19562121.66	272783667.14	19094855.90	467265.76	0.00	{"month": "279458880.78000003", "salesTax": 272783667.14, "taxPayable": 0, "purchaseTax": 467265.76, "salesAmount": 19562121.66, "purchaseAmount": 19094855.9}	2026-02-13 06:09:44.114	2026-02-13 06:09:44.114
ceecb763-ef19-4e7f-b884-c98e510d7d42	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	18390920.16	2026	0.00	18390920.16	0.00	0.00	0.00	{"month": "18390920.16", "salesTax": 18390920.16, "taxPayable": 0, "purchaseTax": 0, "salesAmount": 0, "purchaseAmount": 0}	2026-02-13 06:09:44.114	2026-02-13 06:09:44.114
\.


--
-- Data for Name: customer_working_capitals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_working_capitals (id, customer_id, total_limit, used_limit, stock_amount, receivable_days, payable_days, details, created_at, updated_at) FROM stdin;
98169aa1-134f-4559-8c67-9c10f60ad8cc	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	9390264.32	2890264.32	7031000.00	45	3	{"notes": [], "stock": 7031000, "payables": {"days": 3, "amount": 2808810.876799173, "percentage": 1}, "receivables": {"days": 45, "amount": 5168075.192506851, "percentage": 0.15}, "totalNeeded": 9390264.315707676, "additionalNeeded": 2890264.315707676}	2026-02-13 06:09:44.136	2026-02-13 06:09:44.136
\.


--
-- Data for Name: data_access_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.data_access_logs (id, user_id, customer_id, access_type, access_path, accessed_fields, purpose, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, customer_id, document_type, file_name, file_path, file_size, mime_type, file_hash, ai_processed, ai_status, extracted_data, confidence_score, enhanced_data, document_subtype, processing_version, review_status, reviewed_by, reviewed_at, review_notes, rejected_reason, uploaded_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, branch_id, created_by, category, amount, description, receipt_path, status, approved_by, approved_at, rejected_by, rejected_at, rejected_reason, reimbursed, reimbursed_at, reimbursed_by, expense_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interest_rate_tiers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interest_rate_tiers (id, loan_product_id, tier_name, min_amount, max_amount, interest_rate, grace_period_days, effective_from, effective_until, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoice_access_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoice_access_logs (id, resource_id, customer_id, success, attempted_at, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: payment_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_schedules (id, loan_id, payment_number, payment_date, principal_amount, interest_amount, total_payment, remaining_balance, status, paid_at, statement_number, days_overdue, penalty_amount, compound_interest_amount, created_at, updated_at, version) FROM stdin;
daa14b7a-7ac5-43a5-8289-52bea2dc3edf	001efd65-2579-4012-8bb4-3f5bc08c0649	1	2026-03-01 05:30:36.699	153011.80	29125.00	182136.80	4846988.20	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
aa014b9a-cdc1-471d-b97e-155bdd95431f	001efd65-2579-4012-8bb4-3f5bc08c0649	2	2026-04-01 05:30:36.699	153903.10	28233.71	182136.80	4693085.10	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
3c179d63-4c94-4ed7-8233-49b0c75634c4	001efd65-2579-4012-8bb4-3f5bc08c0649	3	2026-05-01 05:30:36.699	154799.58	27337.22	182136.80	4538285.52	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
d9520836-eeff-472a-b967-69560b583c65	001efd65-2579-4012-8bb4-3f5bc08c0649	4	2026-06-01 05:30:36.699	155701.29	26435.51	182136.80	4382584.23	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
d9ef3c17-6b2b-4180-ad3a-2e359876820c	001efd65-2579-4012-8bb4-3f5bc08c0649	5	2026-07-01 05:30:36.699	156608.25	25528.55	182136.80	4225975.98	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
09044539-7db0-4685-9c9d-cd7555192b75	001efd65-2579-4012-8bb4-3f5bc08c0649	6	2026-08-01 05:30:36.699	157520.49	24616.31	182136.80	4068455.49	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
6282329a-f1aa-4436-be89-695a8ef9d44b	001efd65-2579-4012-8bb4-3f5bc08c0649	7	2026-09-01 05:30:36.699	158438.05	23698.75	182136.80	3910017.44	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
4824575c-ba4a-48bb-97dc-0af0538e091b	001efd65-2579-4012-8bb4-3f5bc08c0649	8	2026-10-01 05:30:36.699	159360.95	22775.85	182136.80	3750656.49	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
0b2c334a-479b-404f-ad96-367efabd564e	001efd65-2579-4012-8bb4-3f5bc08c0649	9	2026-11-01 05:30:36.699	160289.23	21847.57	182136.80	3590367.27	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
46201e74-9202-4cb5-93c3-426d40acc4b8	001efd65-2579-4012-8bb4-3f5bc08c0649	10	2026-12-01 05:30:36.699	161222.91	20913.89	182136.80	3429144.35	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
41a3605f-2f0d-4027-8845-647474582195	001efd65-2579-4012-8bb4-3f5bc08c0649	11	2027-01-01 05:30:36.699	162162.04	19974.77	182136.80	3266982.32	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
94d95c53-e770-4316-991a-d140157f252a	001efd65-2579-4012-8bb4-3f5bc08c0649	12	2027-02-01 05:30:36.699	163106.63	19030.17	182136.80	3103875.69	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
8099e81e-7fba-4ff0-a8b4-e9ad198987c5	001efd65-2579-4012-8bb4-3f5bc08c0649	13	2027-03-01 05:30:36.699	164056.73	18080.08	182136.80	2939818.96	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
9923ed1f-ef87-4d7b-8c0d-bb041c602f85	001efd65-2579-4012-8bb4-3f5bc08c0649	14	2027-04-01 05:30:36.699	165012.36	17124.45	182136.80	2774806.60	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
6e654ded-faaf-4a98-81a2-9b8dfcd8282e	001efd65-2579-4012-8bb4-3f5bc08c0649	15	2027-05-01 05:30:36.699	165973.55	16163.25	182136.80	2608833.05	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
132df375-1c95-4cfb-9b86-078e57020095	001efd65-2579-4012-8bb4-3f5bc08c0649	16	2027-06-01 05:30:36.699	166940.35	15196.45	182136.80	2441892.70	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
4d27e6f2-6926-4478-8d70-f44b93791142	001efd65-2579-4012-8bb4-3f5bc08c0649	17	2027-07-01 05:30:36.699	167912.78	14224.02	182136.80	2273979.92	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
d6f69311-793d-4f62-8316-c17a823db7eb	001efd65-2579-4012-8bb4-3f5bc08c0649	18	2027-08-01 05:30:36.699	168890.87	13245.93	182136.80	2105089.06	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
cb936358-9d27-4366-9a81-e0b9ca7bc093	001efd65-2579-4012-8bb4-3f5bc08c0649	19	2027-09-01 05:30:36.699	169874.66	12262.14	182136.80	1935214.40	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
45817dfa-8f70-4f4d-8bc2-5ddccdf96e4a	001efd65-2579-4012-8bb4-3f5bc08c0649	20	2027-10-01 05:30:36.699	170864.18	11272.62	182136.80	1764350.22	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
44d769d2-60d1-49e8-a51d-782182e301ed	001efd65-2579-4012-8bb4-3f5bc08c0649	21	2027-11-01 05:30:36.699	171859.46	10277.34	182136.80	1592490.76	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
cfde714a-74e0-40e2-9d84-c3039b61de2c	001efd65-2579-4012-8bb4-3f5bc08c0649	22	2027-12-01 05:30:36.699	172860.54	9276.26	182136.80	1419630.21	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
19675ffa-1af7-4402-baaa-4c9a89481905	001efd65-2579-4012-8bb4-3f5bc08c0649	23	2028-01-01 05:30:36.699	173867.46	8269.35	182136.80	1245762.76	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
cbaff955-58fb-43a8-80ba-3895d35e631a	001efd65-2579-4012-8bb4-3f5bc08c0649	24	2028-02-01 05:30:36.699	174880.23	7256.57	182136.80	1070882.52	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
872aed8b-98b7-4ba2-9579-78334157f9fc	001efd65-2579-4012-8bb4-3f5bc08c0649	25	2028-03-01 05:30:36.699	175898.91	6237.89	182136.80	894983.61	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
52802ec9-e467-4497-b29a-bc62f1d2c26c	001efd65-2579-4012-8bb4-3f5bc08c0649	26	2028-04-01 05:30:36.699	176923.52	5213.28	182136.80	718060.09	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
4d069fed-2bb8-4f15-8e35-176f0926e977	001efd65-2579-4012-8bb4-3f5bc08c0649	27	2028-05-01 05:30:36.699	177954.10	4182.70	182136.80	540105.99	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
3c5e30ee-8806-40a4-9e42-a2299aa32c3a	001efd65-2579-4012-8bb4-3f5bc08c0649	28	2028-06-01 05:30:36.699	178990.68	3146.12	182136.80	361115.30	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
5c5aa27f-12a0-4aef-8141-e69588034cfc	001efd65-2579-4012-8bb4-3f5bc08c0649	29	2028-07-01 05:30:36.699	180033.31	2103.50	182136.80	181082.00	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
4352e4b9-1fb5-4628-ae86-6993c65a56f0	001efd65-2579-4012-8bb4-3f5bc08c0649	30	2028-08-01 05:30:36.699	181082.00	1054.80	182136.80	0.00	UNPAID	\N	\N	0	0.00	0.00	2026-02-14 05:30:36.701	2026-02-14 05:30:36.701	1
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, payment_schedule_id, loan_id, customer_id, invoice_number, invoice_date, due_date, invoice_data, status, sent_at, sent_via, viewed_at, generated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: loan_approval_workflow; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loan_approval_workflow (id, loan_id, approval_level, approver_id, approval_status, approved_amount, approval_notes, sla_deadline, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: loan_disbursements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loan_disbursements (id, loan_id, disbursement_no, amount, purpose, requested_date, status, approved_by, approved_at, rejected_by, rejected_at, rejected_reason, disbursed_by, disbursed_at, disbursement_method, reference_no, next_disbursement_date, notes, created_by, created_at, updated_at, idempotency_key) FROM stdin;
3465babc-ed93-4115-b520-b0f173280458	001efd65-2579-4012-8bb4-3f5bc08c0649	1	5000000.00	เบิกจ่ายเงินกู้ตามสัญญา Evena Lab	2026-02-15 05:31:16.278	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	สร้างอัตโนมัติจากการอนุมัติสินเชื่อ - กรุณาตรวจสอบและแก้ไขข้อมูลก่อนดำเนินการ	4fade8f4-67f5-4301-98fd-07daf590d0ae	2026-02-14 05:31:16.49	2026-02-14 05:31:16.49	\N
\.


--
-- Data for Name: loan_interest_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loan_interest_history (id, loan_id, payment_number, outstanding_balance, applied_rate, tier_name, grace_period_days, interest_amount, calculated_at, effective_date) FROM stdin;
\.


--
-- Data for Name: next_payment_invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.next_payment_invoices (id, invoice_number, loan_id, customer_id, payment_schedule_id, invoice_data, status, generated_by, sent_at, sent_via, sent_by, paid_at, paid_amount, payment_method, receipt_number, valid_until, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_actions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_actions (id, notification_type, action_id, label, link, required_roles, required_permissions, requires_confirmation, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_audience_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_audience_rules (id, notification_type, allowed_roles, allowed_branches, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, link, metadata, read, read_at, priority, event_id, dedup_key, archived, archived_at, audience_roles, action_id, action_label, created_at) FROM stdin;
7901d03d-83d8-42ec-a2e8-df4063f4878b	4fade8f4-67f5-4301-98fd-07daf590d0ae	REMINDER	📋 คำขออนุมัติสินเชื่อใหม่	Fern Wang  ขออนุมัติสินเชื่อสำหรับ Evena Lab จำนวน 5,000,000 บาท	/loans/001efd65-2579-4012-8bb4-3f5bc08c0649	{"amount": 5000000, "loanId": "001efd65-2579-4012-8bb4-3f5bc08c0649", "branchId": "34701d9a-39d1-4c5e-91f1-45490cd89cc3", "officerName": "Fern Wang ", "customerName": "Evena Lab", "notificationType": "LOAN_APPROVAL_REQUEST"}	f	\N	HIGH	\N	\N	f	\N	{}	\N	\N	2026-02-14 05:30:36.745
ded5b8f7-c419-4da5-8335-1c96167aaa01	b0a90dc5-e982-45a4-be79-f9b2be0a8bae	LOAN_APPROVED	✅ สินเชื่ออนุมัติแล้ว	สินเชื่อของ Evena Lab ได้รับการอนุมัติจาก phattara phattara	/loans/001efd65-2579-4012-8bb4-3f5bc08c0649	{"loanId": "001efd65-2579-4012-8bb4-3f5bc08c0649", "approved": true, "branchId": "34701d9a-39d1-4c5e-91f1-45490cd89cc3", "managerName": "phattara phattara", "customerName": "Evena Lab"}	f	\N	HIGH	\N	LOAN_APPROVED_001efd65-2579-4012-8bb4-3f5bc08c0649_b0a90dc5-e982-45a4-be79-f9b2be0a8bae	f	\N	{}	\N	\N	2026-02-14 05:31:16.224
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, loan_id, payment_schedule_id, amount, payment_date, payment_method, payment_type, interest_saved, penalty_amount, notes, reference, payment_gateway, gateway_reference, gateway_response, bank_name, account_number, verified, verified_by, verified_at, created_at, created_by, version, idempotency_key) FROM stdin;
\.


--
-- Data for Name: payment_receipts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_receipts (id, receipt_number, payment_id, loan_id, customer_id, invoice_id, amount, payment_date, payment_method, receipt_data, status, issued_by, issued_at, sent_at, sent_via, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_timeline_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_timeline_events (id, loan_id, payment_schedule_id, event_type, scheduled_date, executed_at, status, metadata, error_message, retry_count, max_retries, next_retry_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: penalty_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.penalty_rules (id, loan_product_id, rule_name, days_overdue_from, days_overdue_to, penalty_type, penalty_rate, penalty_amount, compound_interest, compound_rate, is_default, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: principal_prepayments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.principal_prepayments (id, loan_id, payment_schedule_id, amount, prepayment_date, interest_saved, new_monthly_payment, new_maturity_date, penalty_amount, processed_by, processed_at, created_at) FROM stdin;
\.


--
-- Data for Name: privacy_consents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.privacy_consents (id, customer_id, consent_type, consent_version, consent_text, given, given_at, withdrawn, withdrawn_at, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: product_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_configs (id, product_code, product_name, description, config, status, active_from, active_until, version, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: promptpay_qr_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promptpay_qr_codes (id, loan_id, payment_ref, amount_expected, qr_code_data, expires_at, status, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: registration_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.registration_tokens (id, line_user_id, token, user_id, expires_at, used, created_at) FROM stdin;
b9cf9a44-4b2c-4b24-b9ab-f88ab6848445	07b9b099-cd7e-46a7-8c51-c533d9ae9d77	356ED885	\N	2026-02-13 09:17:01.176	f	2026-02-13 09:15:01.177
ab1eb7f7-2c44-4a71-ab46-742387c3f95a	07b9b099-cd7e-46a7-8c51-c533d9ae9d77	4A167FDA	\N	2026-02-13 09:18:27.399	t	2026-02-13 09:16:27.401
5581003c-8a71-4213-9d21-9dc37cfef219	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	0C87D8DB	\N	2026-02-13 09:40:10.521	t	2026-02-13 09:38:10.524
198b4583-5f0d-4739-bab8-bdf8d2da9a8a	5a34592b-f9ab-4ddf-a6b3-dfde02ee8445	A58DA0CA	\N	2026-02-13 13:27:14.518	t	2026-02-13 13:25:14.519
\.


--
-- Data for Name: security_alerts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.security_alerts (id, type, severity, title, description, ip_address, user_id, endpoint, status, resolved_at, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.security_events (id, user_id, ip_address, user_agent, endpoint, method, threat_type, severity, description, payload, blocked, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (id, user_id, token, refresh_token, previous_token, previous_token_expires_at, previous_refresh_token, ip_address, user_agent, is_valid, expires_at, created_at) FROM stdin;
adcaa7be-4d1a-4c3e-a1c4-ed74917e6abb	49867ed8-5c7a-485d-ad1a-891390126840	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0OTg2N2VkOC01YzdhLTQ4NWQtYWQxYS04OTEzOTAxMjY4NDAiLCJlbWFpbCI6InBoYXR0YXJhcG9uZy5waGVAZ21haWwuY29tIiwicm9sZSI6IkFETUlOIiwiYnJhbmNoSWQiOiI2NTQ0N2RlZC1jODkxLTRmNmEtODVmOS0zNzQ4NTcyY2Q1NzIiLCJzZXNzaW9uSWQiOiJhZGNhYTdiZS00ZDFhLTRjM2UtYTFjNC1lZDc0OTE3ZTZhYmIiLCJqdGkiOiIxOTdhZDVjNC1lMjc1LTRmYTktYjgxZi05M2IwMDA0MjRkNzIiLCJpYXQiOjE3NzEwNTQ2MzUsImV4cCI6MTc3MTA1ODIzNX0.OPLSI0GtyBE7RGgHCd2S6zOtabUEpiM_OKrCZ9VJEC4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0OTg2N2VkOC01YzdhLTQ4NWQtYWQxYS04OTEzOTAxMjY4NDAiLCJzZXNzaW9uSWQiOiJhZGNhYTdiZS00ZDFhLTRjM2UtYTFjNC1lZDc0OTE3ZTZhYmIiLCJqdGkiOiI2ZjU2NWRjYy1hNDM5LTQ4YWItOGFhYS0wYjE0Nzc3ZjE4NzIiLCJpYXQiOjE3NzEwNTQ2MzUsImV4cCI6MTc3MTY1OTQzNX0.W9lp-23f7IBnrrabgtlWN4FlTxvfXWa74ovIvopG2ms	\N	\N	\N	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	t	2026-02-21 07:37:15.419	2026-02-14 07:37:15.423
43cb17b3-5557-43a4-8812-c1662a046805	b0a90dc5-e982-45a4-be79-f9b2be0a8bae	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMGE5MGRjNS1lOTgyLTQ1YTQtYmU3OS1mOWIyYmUwYThiYWUiLCJlbWFpbCI6ImRlYXJudWxsODVAZ21haWwuY29tIiwicm9sZSI6Ik9GRklDRVIiLCJicmFuY2hJZCI6IjM0NzAxZDlhLTM5ZDEtNGM1ZS05MWYxLTQ1NDkwY2Q4OWNjMyIsInNlc3Npb25JZCI6IjQzY2IxN2IzLTU1NTctNDNhNC04ODEyLWMxNjYyYTA0NjgwNSIsImp0aSI6IjczMGE0ZjFlLWVjYmItNDlkYy04NjVjLTIyOTRjODMxZTM4OSIsImlhdCI6MTc3MTA1NjgxMSwiZXhwIjoxNzcxMDYwNDExfQ.QVAEoXURPeNZWcERoy_iwM63xIVw8fWlmjd_pyrE9E8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMGE5MGRjNS1lOTgyLTQ1YTQtYmU3OS1mOWIyYmUwYThiYWUiLCJzZXNzaW9uSWQiOiI0M2NiMTdiMy01NTU3LTQzYTQtODgxMi1jMTY2MmEwNDY4MDUiLCJqdGkiOiJhNzI4ZGUzYi0wYmYzLTQ5OTktYTg1MS1kZDQ3ZmRiZjM5YmIiLCJpYXQiOjE3NzEwNTY4MTEsImV4cCI6MTc3MTY2MTYxMX0.tba7fFbCqCiu3v1SJr0ISvun4TGwu-R5XKGOkgFQ094	\N	\N	\N	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	t	2026-02-21 08:13:31.958	2026-02-14 04:41:48.484
c114936e-b20c-4767-9d8a-e5c13a53d0dc	49867ed8-5c7a-485d-ad1a-891390126840	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0OTg2N2VkOC01YzdhLTQ4NWQtYWQxYS04OTEzOTAxMjY4NDAiLCJlbWFpbCI6InBoYXR0YXJhcG9uZy5waGVAZ21haWwuY29tIiwicm9sZSI6IkFETUlOIiwiYnJhbmNoSWQiOiI2NTQ0N2RlZC1jODkxLTRmNmEtODVmOS0zNzQ4NTcyY2Q1NzIiLCJzZXNzaW9uSWQiOiJjMTE0OTM2ZS1iMjBjLTQ3NjctOWQ4YS1lNWMxM2E1M2QwZGMiLCJqdGkiOiIxYmVkYzBlZS0wZmUzLTRjZjQtOWFhMi1kNTQwYmFlYWMwMzQiLCJpYXQiOjE3NzEwNTc5NDYsImV4cCI6MTc3MTA2MTU0Nn0.3ZF8hpB2wRAQHdcfKlvzELo53wY3bZfizY6YM6MEpYM	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0OTg2N2VkOC01YzdhLTQ4NWQtYWQxYS04OTEzOTAxMjY4NDAiLCJzZXNzaW9uSWQiOiJjMTE0OTM2ZS1iMjBjLTQ3NjctOWQ4YS1lNWMxM2E1M2QwZGMiLCJqdGkiOiI5YTI1Mzg1Yi0yZjJmLTQ2M2MtOGI5YS04YjM5NTI4N2FmNWYiLCJpYXQiOjE3NzEwNTc5NDYsImV4cCI6MTc3MTY2Mjc0Nn0.cOdLV4m0K3efBbCBNE3e0Jji9Q1A3DFaJ1u3Y1Py05I	\N	\N	\N	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	t	2026-02-21 08:32:26.135	2026-02-14 05:07:46.196
c7fdcda6-656b-46cf-862e-0f7112b62b7a	4fade8f4-67f5-4301-98fd-07daf590d0ae	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZmFkZThmNC02N2Y1LTQzMDEtOThmZC0wN2RhZjU5MGQwYWUiLCJlbWFpbCI6Imdsb2JhbGNvbXBhbnltdWxhQGdtYWlsLmNvbSIsInJvbGUiOiJNQU5BR0VSIiwiYnJhbmNoSWQiOiIzNDcwMWQ5YS0zOWQxLTRjNWUtOTFmMS00NTQ5MGNkODljYzMiLCJzZXNzaW9uSWQiOiJjN2ZkY2RhNi02NTZiLTQ2Y2YtODYyZS0wZjcxMTJiNjJiN2EiLCJqdGkiOiI1OTM0NzliMC1lNzE2LTRhZDMtYjFiMy1jNDgwNGY0OWRjZjkiLCJpYXQiOjE3NzEwNTQ2ODAsImV4cCI6MTc3MTA1ODI4MH0.muqkX7QY7G_ni8nFVtTuTg2GWSRosFNf7WiMmBmzsPQ	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZmFkZThmNC02N2Y1LTQzMDEtOThmZC0wN2RhZjU5MGQwYWUiLCJzZXNzaW9uSWQiOiJjN2ZkY2RhNi02NTZiLTQ2Y2YtODYyZS0wZjcxMTJiNjJiN2EiLCJqdGkiOiIzY2VjMTBjZi0yMGNlLTQzNmItYjYxYy02ODgxODk4NWVlMGYiLCJpYXQiOjE3NzEwNTQ2ODAsImV4cCI6MTc3MTY1OTQ4MH0.CMf6X4XtuaMulS_hroVOLzpfm1yMmNuA8tcte2eQ2Eo	\N	\N	\N	2001:fb1:bd:28c:84d:2e16:cff9:5fdd	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	t	2026-02-21 07:38:00.481	2026-02-14 05:31:06.253
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, user_id, loan_id, type, amount, currency, status, from_account, to_account, reference, description, metadata, processed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: suspicious_transaction_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suspicious_transaction_reports (id, report_number, customer_id, transaction_id, suspicion_type, suspicion_details, reported_by, reported_at, review_status, submitted_to, submitted_at, amlo_reference, created_at) FROM stdin;
\.


--
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_configs (id, key, value, category, description, updated_by, created_at, updated_at) FROM stdin;
21fd95fe-6e8f-4712-b3ec-7ffc7e961ae1	company.name	บริษัท สินเชื่อไทย จำกัด	company	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.421	2026-02-12 16:00:24.421
bd56b781-dc94-4a4f-bab8-54f3115c2ae4	company.email	contact@thailoan.co.th	company	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.426	2026-02-12 16:00:24.426
4c29a09f-d787-4263-b2da-a82e49d1633a	company.phone	02-123-4567	company	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.428	2026-02-12 16:00:24.428
fee088cc-3bc2-4192-b0fe-72af8899e893	system.language	th	system	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.429	2026-02-12 16:00:24.429
fda13fd5-3556-44c6-9b1b-a02567cf75b7	notifications.email_enabled	true	notifications	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.433	2026-02-12 16:00:24.433
ebbf6325-70ff-4df2-99b6-db1b67325832	notifications.line_enabled	true	notifications	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.434	2026-02-12 16:00:24.434
21fd3e3e-3fcc-49b2-bc8a-68f66b375af9	notifications.reminder_days	3	notifications	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.437	2026-02-12 16:00:24.437
0405958f-de70-4074-b083-5e4623e46190	notifications.daily_report	true	notifications	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.438	2026-02-12 16:00:24.438
a444a62a-b471-422c-b4a0-9dd451c4010d	notifications.npl_alert	true	notifications	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.44	2026-02-12 16:00:24.44
86459761-e269-4758-8b83-a91d0aebcbfc	security.session_timeout	24	security	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.442	2026-02-12 16:00:24.442
f93293c9-c926-4056-bbeb-1f6f6a22429a	security.password_expiry	90	security	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.442	2026-02-12 16:00:24.442
34bdcece-f06d-4d4e-b4d4-52913c406c13	security.two_factor	false	security	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.443	2026-02-12 16:00:24.443
fec112d0-efcd-404a-9b31-1f00442b5c2b	security.login_attempts	5	security	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.444	2026-02-12 16:00:24.444
c4da48a7-e46c-421f-8eaa-d3619a5620d7	interest_rate.mlr	6.875	interest_rate	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.445	2026-02-12 16:00:24.445
8462bde3-c4d5-47cd-b5b6-70591c09ae28	interest_rate.mrr	7.125	interest_rate	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.446	2026-02-12 16:00:24.446
4aa3d8c9-07a1-4218-ba1b-6260b7a71002	interest_rate.last_updated	2026-02-12T16:00:24.420Z	interest_rate	\N	49867ed8-5c7a-485d-ad1a-891390126840	2026-02-12 16:00:24.448	2026-02-12 16:00:24.448
54a1b0eb-7736-4b15-aaf2-92a988be04b6	rich_menu_user	richmenu-2902d402bed161dd4f297bef4dd303d0	LINE	Rich Menu ID for USER role	\N	2026-02-12 16:17:58.389	2026-02-12 16:17:58.389
ed1f95f4-b8a1-4995-a334-61a0da43ec55	rich_menu_officer	richmenu-01f721ad376f10a905fa1f95bdcedb51	LINE	Rich Menu ID for OFFICER role	\N	2026-02-12 16:17:58.572	2026-02-12 16:17:58.572
db716b45-ea0e-4a86-9c90-2925d80ce81f	rich_menu_manager	richmenu-08fdfc37dd4e2ab4be8249637dfd3232	LINE	Rich Menu ID for MANAGER role	\N	2026-02-12 16:17:58.758	2026-02-12 16:17:58.758
f5f1e6fe-0ffc-42be-9d9c-c1b41214f70f	rich_menu_admin	richmenu-ab1a9152861f3fde699feabb90da3ef9	LINE	Rich Menu ID for ADMIN role	\N	2026-02-12 16:17:58.953	2026-02-12 16:17:58.953
cbc31310-df21-4486-9d46-04dd3573ba03	SEQ:RCP-BR01-6902	12	SEQUENCE	Auto-generated sequence number for RCP-BR01-6902	\N	2026-02-13 14:16:45.687	2026-02-13 15:02:28.352
\.


--
-- Data for Name: task_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_assignments (id, task_id, task_type, assigned_to, assigned_by, priority, due_date, completion_date, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: thai_banks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.thai_banks (id, bank_code, bank_name, bank_name_th, bank_name_en, logo_url, color_code, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: year_interest_tiers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.year_interest_tiers (id, loan_product_id, tier_type, start_year, end_year, rate, formula, min_rate, max_rate, created_at, updated_at) FROM stdin;
618f808e-21db-4485-9214-f4bb1e4ce893	33cdbe69-c25e-41aa-9f97-e41c2aa1cd07	FIXED	1	3	0.0399	\N	\N	\N	2026-02-14 04:40:54.288	2026-02-14 04:40:54.288
c5dc3537-aee7-4496-a672-cfbedea7e093	33cdbe69-c25e-41aa-9f97-e41c2aa1cd07	FIXED	4	5	0.0499	\N	\N	\N	2026-02-14 04:40:54.288	2026-02-14 04:40:54.288
1f3749c9-011b-4492-93d5-7a4be694b207	33cdbe69-c25e-41aa-9f97-e41c2aa1cd07	VARIABLE	6	END	\N	MRR + 1.0%	0.0500	0.0800	2026-02-14 04:40:54.288	2026-02-14 04:40:54.288
bb7f82a4-6936-492c-9123-2a95f3b18c7e	fc6ce566-70a4-42fd-a8c5-1d859f1eb168	FIXED	1	2	0.0450	\N	\N	\N	2026-02-14 04:40:54.312	2026-02-14 04:40:54.312
d43b3cc6-3481-4156-9591-503b74700698	fc6ce566-70a4-42fd-a8c5-1d859f1eb168	FIXED	3	5	0.0550	\N	\N	\N	2026-02-14 04:40:54.312	2026-02-14 04:40:54.312
99f2c48d-cf1b-4403-9342-531abb654abd	fc6ce566-70a4-42fd-a8c5-1d859f1eb168	VARIABLE	6	10	\N	MLR + 1.5%	0.0600	0.0900	2026-02-14 04:40:54.312	2026-02-14 04:40:54.312
35efc1a7-6e4c-4da4-880f-939cf1ca2f1d	fc6ce566-70a4-42fd-a8c5-1d859f1eb168	VARIABLE	11	END	\N	MLR + 2.0%	0.0650	0.1000	2026-02-14 04:40:54.312	2026-02-14 04:40:54.312
8b41b230-1d23-4ad0-8fef-23a2ff75fe79	0d54a2c0-7684-4083-9d57-5e44f28baae8	FIXED	1	2	0.0299	\N	\N	\N	2026-02-14 04:40:54.322	2026-02-14 04:40:54.322
508afadc-28bb-4dfa-b432-06906f1a38dc	0d54a2c0-7684-4083-9d57-5e44f28baae8	FIXED	3	3	0.0399	\N	\N	\N	2026-02-14 04:40:54.322	2026-02-14 04:40:54.322
04172eff-750e-482d-91ad-46ee5d36f347	0d54a2c0-7684-4083-9d57-5e44f28baae8	FIXED	4	END	0.0599	\N	\N	\N	2026-02-14 04:40:54.322	2026-02-14 04:40:54.322
ca0ed02b-3178-45a2-83cd-eacc07bd8f5f	1cdf3d62-3e59-4ce4-a258-47c1c46553a0	FIXED	1	5	0.0350	\N	\N	\N	2026-02-14 04:40:54.332	2026-02-14 04:40:54.332
fe408abc-84a6-4be1-9cb8-814ff9d21620	1cdf3d62-3e59-4ce4-a258-47c1c46553a0	VARIABLE	6	15	\N	MLR + 0.5%	0.0400	0.0700	2026-02-14 04:40:54.332	2026-02-14 04:40:54.332
456547b2-e802-4e41-a433-af3759afb80e	1cdf3d62-3e59-4ce4-a258-47c1c46553a0	VARIABLE	16	END	\N	MLR + 1.0%	0.0450	0.0800	2026-02-14 04:40:54.332	2026-02-14 04:40:54.332
95cc5a4d-4ba5-4c17-b906-7381f7025eff	86579b25-d0b2-42f6-b687-da105b21ebef	FIXED	1	3	0.0350	\N	\N	\N	2026-02-14 04:40:54.365	2026-02-14 04:40:54.365
8f5681c5-1a88-4367-82c5-b42612a6dd20	86579b25-d0b2-42f6-b687-da105b21ebef	FIXED	4	5	0.0450	\N	\N	\N	2026-02-14 04:40:54.365	2026-02-14 04:40:54.365
d9c8afac-d788-4d54-9afb-80aa946e49ad	86579b25-d0b2-42f6-b687-da105b21ebef	VARIABLE	6	END	\N	MLR + 1.0%	0.0500	0.0750	2026-02-14 04:40:54.365	2026-02-14 04:40:54.365
ae558d3f-2e3d-493a-a820-6c516a0436f0	a939e2c1-f9dc-4f38-888e-9e91e2a2904b	FIXED	1	2	0.0599	\N	\N	\N	2026-02-14 04:40:54.554	2026-02-14 04:40:54.554
465db000-2a28-4f43-a1a5-8f6fcc3ca943	a939e2c1-f9dc-4f38-888e-9e91e2a2904b	FIXED	3	4	0.0699	\N	\N	\N	2026-02-14 04:40:54.554	2026-02-14 04:40:54.554
60ed76eb-5dc4-4da4-85bb-c8ba8f256b3f	a939e2c1-f9dc-4f38-888e-9e91e2a2904b	VARIABLE	5	END	\N	MRR + 1.5%	0.0700	0.0900	2026-02-14 04:40:54.554	2026-02-14 04:40:54.554
\.


--
-- PostgreSQL database dump complete
--

\unrestrict xWpFGelh6Hx7Eh8vycAUTrnxTEqrdMFHr55Tx09zxXHkbHK50HtjkcGV5Tu3p6c

