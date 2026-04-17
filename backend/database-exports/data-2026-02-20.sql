--
-- PostgreSQL database dump
--

\restrict 0WwWjHkZc0DOCcqHdodcaeOotwPcbYuv1b8zC3cj31M0tOr8Tshgy5dXhIaofsK

-- Dumped from database version 16.12 (Homebrew)
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
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
4098674b-e260-4d43-8121-0935e87fb4cd	9882e135420e0540a5999378d26efd3a7287f0212a63e2461fca110191c6348d	2026-02-16 13:11:33.591445+07	20260216061131_rename_user_role_to_customer	\N	\N	2026-02-16 13:11:31.446075+07	1
d0e10b12-dd0c-4363-918f-9b6dfe6af183	2092c705454591318522d90f5bdf5b1bb7e81c9957d4d7d14f0fa554cdc3cf4e	2026-02-16 21:00:24.639696+07	20260216140024_add_secure_document_tokens	\N	\N	2026-02-16 21:00:24.612306+07	1
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.branches (id, code, name, address, phone, status, created_at, updated_at) FROM stdin;
171ad6ee-27d7-4da7-87d8-98584e282d5d	HQ	สำนักงานใหญ่	กรุงเทพมหานคร	02-123-4567	ACTIVE	2026-02-20 16:28:20.625	2026-02-20 16:28:20.625
efca69e7-2201-4ad2-8be4-c40de3cf96fe	BR01	สาขาที่ 1	กรุงเทพมหานคร	02-234-5678	ACTIVE	2026-02-20 16:28:20.636	2026-02-20 16:28:20.636
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.users (id, email, password_hash, first_name, last_name, phone_number, avatar, role, status, branch_id, must_change_password, password_changed_at, national_id, line_user_id, line_linked_at, line_active, line_notifications_enabled, monthly_target, created_at, updated_at, last_login_at) FROM stdin;
a3ff99a4-2079-4804-9bdc-021200dd7f11	phattarapong.phe@gmail.com	$2b$10$BnzkeJfIevdg3uPwZbYJ3.2GZcwkNSx77HOKlOxX3bVXoITA.GHLm	Admin	System	\N	\N	ADMIN	ACTIVE	171ad6ee-27d7-4da7-87d8-98584e282d5d	f	\N	\N	\N	\N	t	t	100000.00	2026-02-20 16:28:20.707	2026-02-20 16:28:20.707	\N
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customers (id, user_id, branch_id, customer_code, business_name, business_type, business_registration_date, business_registration_type, registered_capital, business_size, industry_code, business_age_years, number_of_employees, phone, email, address, business_address, business_phone, thai_id, tax_id, avatar, shareholders, signatories, annual_revenue, net_profit, total_assets, total_liabilities, debt_to_equity_ratio, ai_extracted_data, ai_confidence_score, ai_processed_at, ai_warnings, status, document_complete, line_user_id, line_linked_at, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: loan_products; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.loan_products (id, product_code, product_name, product_name_en, description, purpose, eligibility, target_business, min_revenue, max_revenue, min_years_in_business, min_loan_amount, max_loan_amount, total_project_budget, interest_rate_type, interest_rate_year_1_3, interest_rate_year_4_plus, interest_rate_formula, government_subsidy, subsidy_details, loan_type, max_term_months, grace_period_months, collateral_required, collateral_details, guarantee_options, benefits, fee_waivers, project_start_date, project_end_date, status, is_popular, display_order, created_by, created_at, updated_at) FROM stdin;
2ea472a3-89ae-44ef-90b5-0ab274333b15	SME-FIXED-001	สินเชื่อ SME เพื่อขยายกิจการ (อัตราคงที่)	SME Business Expansion Loan (Fixed Rate)	สินเชื่อดอกเบี้ยคงที่ตลอดอายุสัญญา เหมาะสำหรับผู้ประกอบการที่ต้องการความแน่นอนในการวางแผนการเงิน	{ขยายกิจการ,เพิ่มสาขา,ซื้อเครื่องจักร,ปรับปรุงสถานที่}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี","มีรายได้ต่อปีไม่น้อยกว่า 3 ล้านบาท","มีกำไรสุทธิต่อเนื่อง 2 ปี"}	{ร้านอาหาร,ร้านค้าปลีก,โรงแรม,ธุรกิจบริการ}	3000000.00	50000000.00	2	500000.00	10000000.00	\N	FIXED	6.99	\N	\N	f	\N	LONG_TERM	120	6	t	ที่ดิน อาคาร หรือเครื่องจักร มูลค่าไม่น้อยกว่า 120% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{ดอกเบี้ยคงที่ตลอดอายุสัญญา,"ปลอดชำระเงินต้น 6 เดือนแรก",ไม่มีค่าธรรมเนียมปิดบัญชีก่อนกำหนด}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,ฟรีค่าประเมินหลักประกัน}	\N	\N	ACTIVE	t	1	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.73	2026-02-16 06:12:09.73
783c31b9-2f12-4781-ab31-47edc8bf7b9e	SME-FIXED-002	สินเชื่อ SME เพื่อเสริมสภาพคล่อง (อัตราคงที่)	SME Working Capital Loan (Fixed Rate)	สินเชื่อระยะสั้นดอกเบี้ยคงที่ สำหรับเสริมสภาพคล่องในการดำเนินธุรกิจ	{เสริมสภาพคล่อง,ซื้อสินค้า,จ่ายเงินเดือน,ค่าใช้จ่ายประจำ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 1 ปี","มีรายได้ต่อปีไม่น้อยกว่า 1 ล้านบาท"}	{ร้านค้าปลีก,ร้านค้าส่ง,ธุรกิจการค้า,ธุรกิจนำเข้า-ส่งออก}	1000000.00	30000000.00	1	300000.00	5000000.00	\N	FIXED	7.99	\N	\N	f	\N	SHORT_TERM	36	0	f	\N	{ค้ำประกันโดยผู้ถือหุ้น,ค้ำประกันโดยบุคคลภายนอก}	{"อนุมัติเร็ว ภายใน 3 วันทำการ",ไม่ต้องใช้หลักประกัน,ยืดหยุ่นในการชำระ}	{ฟรีค่าธรรมเนียมจัดทำสัญญา}	\N	\N	ACTIVE	t	2	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.734	2026-02-16 06:12:09.734
aefc13b7-e02e-4446-8ec0-59931a300646	SME-VAR-001	สินเชื่อ SME อัตราลอยตัว (MLR Plus)	SME Floating Rate Loan (MLR Plus)	สินเชื่ออัตราดอกเบี้ยลอยตัวตามอัตรา MLR เหมาะสำหรับผู้ที่คาดว่าอัตราดอกเบี้ยจะลดลง	{ลงทุนระยะยาว,ขยายกิจการ,ซื้ออสังหาริมทรัพย์,โครงการพิเศษ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 3 ปี","มีรายได้ต่อปีไม่น้อยกว่า 10 ล้านบาท",มีผลประกอบการดี}	{โรงงานผลิต,ธุรกิจก่อสร้าง,ธุรกิจอสังหาริมทรัพย์,ธุรกิจขนาดใหญ่}	10000000.00	200000000.00	3	5000000.00	50000000.00	\N	VARIABLE	\N	\N	MLR + 1.5%	f	\N	LONG_TERM	180	12	t	ที่ดินพร้อมสิ่งปลูกสร้าง หรือเครื่องจักรอุปกรณ์ มูลค่าไม่น้อยกว่า 150% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG",ค้ำประกันโดยบริษัทในเครือ}	{อัตราดอกเบี้ยปรับตามตลาด,"ปลอดชำระเงินต้น 12 เดือนแรก","วงเงินสูงสุดถึง 50 ล้านบาท"}	{"ลดค่าธรรมเนียมจัดทำสัญญา 50%"}	\N	\N	ACTIVE	f	3	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.737	2026-02-16 06:12:09.737
e6fdb1a1-025f-429c-9d26-c2406caa9fc8	SME-VAR-002	สินเชื่อ SME อัตราลอยตัว (MRR Plus)	SME Floating Rate Loan (MRR Plus)	สินเชื่ออัตราดอกเบี้ยลอยตัวตามอัตรา MRR เหมาะสำหรับธุรกิจที่มีกระแสเงินสดดี	{ขยายกิจการ,ซื้อเครื่องจักร,ลงทุนเทคโนโลยี,พัฒนาผลิตภัณฑ์}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี","มีรายได้ต่อปีไม่น้อยกว่า 5 ล้านบาท"}	{ธุรกิจเทคโนโลยี,ธุรกิจดิจิทัล,ธุรกิจบริการ,ธุรกิจสตาร์ทอัพ}	5000000.00	100000000.00	2	2000000.00	20000000.00	\N	VARIABLE	\N	\N	MRR + 2.0%	f	\N	MEDIUM_TERM	84	6	t	หลักประกันตามที่ธนาคารกำหนด	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{อัตราดอกเบี้ยแข่งขันได้,ยืดหยุ่นในการชำระ,สามารถปรับโครงสร้างหนี้ได้}	{}	\N	\N	ACTIVE	f	4	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.739	2026-02-16 06:12:09.739
c9552b6d-b260-4938-92d7-2475170f5d0f	SME-MIX-001	สินเชื่อ SME อัตราผสม (3 ปีแรกคงที่)	SME Mixed Rate Loan (3-Year Fixed)	สินเชื่ออัตราดอกเบี้ยคงที่ 3 ปีแรก จากนั้นเป็นอัตราลอยตัว ให้ความมั่นใจในช่วงเริ่มต้น	{ลงทุนโครงการใหม่,ขยายกิจการ,ซื้ออุปกรณ์,ปรับปรุงโรงงาน}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี","มีรายได้ต่อปีไม่น้อยกว่า 5 ล้านบาท",มีแผนธุรกิจที่ชัดเจน}	{โรงงานผลิต,ธุรกิจการค้า,ธุรกิจบริการ,ธุรกิจท่องเที่ยว}	5000000.00	100000000.00	2	3000000.00	30000000.00	\N	MIXED	4.99	6.99	ปีที่ 4+: MLR + 1.5%	t	รัฐบาลชดเชยดอกเบี้ย 2% ในปีแรก	LONG_TERM	120	6	t	ที่ดิน อาคาร หรือเครื่องจักร มูลค่าไม่น้อยกว่า 120% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{"ดอกเบี้ยต่ำในช่วง 3 ปีแรก","รัฐบาลชดเชยดอกเบี้ย 2%","ปลอดชำระเงินต้น 6 เดือนแรก"}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,"ฟรีค่าธรรมเนียมค้ำประกัน TCG 4 ปี"}	\N	\N	ACTIVE	t	5	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.741	2026-02-16 06:12:09.741
63ac28ff-e6fc-484e-a77c-e51f58d171fe	SME-MIX-002	สินเชื่อ SME อัตราผสม (5 ปีแรกคงที่)	SME Mixed Rate Loan (5-Year Fixed)	สินเชื่ออัตราดอกเบี้ยคงที่ 5 ปีแรก จากนั้นเป็นอัตราลอยตัว เหมาะสำหรับโครงการระยะยาว	{โครงการลงทุนขนาดใหญ่,ซื้ออสังหาริมทรัพย์,สร้างโรงงาน,ขยายสาขา}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 3 ปี","มีรายได้ต่อปีไม่น้อยกว่า 20 ล้านบาท",มีผลประกอบการดีต่อเนื่อง}	{โรงงานผลิต,ธุรกิจอสังหาริมทรัพย์,ธุรกิจโรงแรม,ธุรกิจก่อสร้าง}	20000000.00	500000000.00	3	10000000.00	100000000.00	\N	MIXED	3.99	5.99	ปีที่ 6+: MLR + 1.0%	f	\N	LONG_TERM	240	24	t	ที่ดินพร้อมสิ่งปลูกสร้าง มูลค่าไม่น้อยกว่า 150% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,ค้ำประกันโดยบริษัทในเครือ}	{"ดอกเบี้ยต่ำในช่วง 5 ปีแรก","ปลอดชำระเงินต้น 24 เดือนแรก","วงเงินสูงสุดถึง 100 ล้านบาท"}	{"ลดค่าธรรมเนียมจัดทำสัญญา 50%","ลดค่าประเมินหลักประกัน 30%"}	\N	\N	ACTIVE	f	6	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.744	2026-02-16 06:12:09.744
94618a6a-b64e-4428-a4a5-9f98ed1d99de	SME-TIER-001	สินเชื่อ SME แบบ Step-up (3 ระดับ)	SME Step-up Tiered Loan (3 Tiers)	สินเชื่อดอกเบี้ยแบบขั้นบันได เริ่มต้นต่ำแล้วค่อยๆ เพิ่มขึ้น เหมาะสำหรับธุรกิจที่คาดว่ารายได้จะเติบโต	{เปิดธุรกิจใหม่,ขยายกิจการ,ลงทุนโครงการใหม่,พัฒนาผลิตภัณฑ์}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 1 ปี",มีแผนธุรกิจที่ชัดเจน,มีศักยภาพในการเติบโต}	{ธุรกิจสตาร์ทอัพ,ธุรกิจเทคโนโลยี,ธุรกิจนวัตกรรม,ธุรกิจดิจิทัล}	2000000.00	50000000.00	1	1000000.00	15000000.00	\N	TIERED	\N	\N	\N	t	รัฐบาลชดเชยดอกเบี้ย 3% ในปีแรก	MEDIUM_TERM	84	6	f	\N	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{ดอกเบี้ยต่ำในช่วงเริ่มต้น,"รัฐบาลชดเชยดอกเบี้ย 3%",ไม่ต้องใช้หลักประกัน,อนุมัติเร็ว}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,"ฟรีค่าธรรมเนียมค้ำประกัน TCG 4 ปี"}	\N	\N	ACTIVE	t	7	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.748	2026-02-16 06:12:09.748
767c82f5-ab62-477b-93b1-c9733c3c7043	SME-TIER-002	สินเชื่อ SME แบบยืดหยุ่น (4 ระดับ)	SME Flexible Tiered Loan (4 Tiers)	สินเชื่อดอกเบี้ยแบบยืดหยุ่น 4 ระดับ ออกแบบมาเพื่อรองรับการเติบโตของธุรกิจในแต่ละช่วงเวลา	{ลงทุนระยะยาว,ขยายกิจการ,โครงการพิเศษ,พัฒนาธุรกิจ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี","มีรายได้ต่อปีไม่น้อยกว่า 10 ล้านบาท",มีผลประกอบการดี}	{โรงงานผลิต,ธุรกิจการค้า,ธุรกิจบริการ,ธุรกิจส่งออก}	10000000.00	200000000.00	2	5000000.00	50000000.00	\N	TIERED	\N	\N	\N	f	\N	LONG_TERM	180	12	t	ที่ดิน อาคาร หรือเครื่องจักร มูลค่าไม่น้อยกว่า 130% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG",ค้ำประกันโดยบริษัทในเครือ}	{ดอกเบี้ยปรับตามช่วงเวลา,"ปลอดชำระเงินต้น 12 เดือนแรก",ยืดหยุ่นสูง}	{"ลดค่าธรรมเนียมจัดทำสัญญา 30%"}	\N	\N	ACTIVE	f	8	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.754	2026-02-16 06:12:09.754
578cbf2a-e1c8-410e-8188-15a01a36dbd2	SME-TIER-GOV-001	สินเชื่อ SME ร่วมกับรัฐบาล (แบบ Tiered)	SME Government Partnership Tiered Loan	สินเชื่อพิเศษร่วมกับรัฐบาล ดอกเบี้ยต่ำในช่วงแรก รัฐบาลชดเชยดอกเบี้ย เหมาะสำหรับ SME ที่ได้รับผลกระทบจากวิกฤต	{ฟื้นฟูธุรกิจ,ปรับโครงสร้างธุรกิจ,เสริมสภาพคล่อง,ลงทุนพัฒนา}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 1 ปี",ได้รับผลกระทบจากวิกฤตเศรษฐกิจ,มีแผนฟื้นฟูธุรกิจที่ชัดเจน}	{ร้านอาหาร,โรงแรม,ธุรกิจท่องเที่ยว,ธุรกิจบริการ,ร้านค้าปลีก}	1000000.00	50000000.00	1	500000.00	10000000.00	\N	TIERED	\N	\N	\N	t	รัฐบาลชดเชยดอกเบี้ย 3% ในปีที่ 1-2 และ 2% ในปีที่ 3	MEDIUM_TERM	60	12	f	\N	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG (รัฐค้ำ 100%)"}	{"รัฐบาลชดเชยดอกเบี้ย 3%",ไม่ต้องใช้หลักประกัน,"ปลอดชำระเงินต้น 12 เดือนแรก","TCG ค้ำประกัน 100%"}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,"ฟรีค่าธรรมเนียมค้ำประกัน TCG ตลอดอายุสัญญา",ฟรีค่าวิเคราะห์โครงการ}	2024-01-01 00:00:00	2026-12-31 00:00:00	ACTIVE	t	9	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.758	2026-02-16 06:12:09.758
40e89207-ee73-4b4a-b2dd-c8939934e954	SME-TIER-PREMIUM-001	สินเชื่อ SME พรีเมียม (แบบ Tiered)	SME Premium Tiered Loan	สินเชื่อพิเศษสำหรับ SME ขนาดใหญ่ ดอกเบี้ยแบบ Tiered ที่ยืดหยุ่นและแข่งขันได้	{ลงทุนขนาดใหญ่,ขยายกิจการต่างประเทศ,ซื้อกิจการ,โครงการพิเศษ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 5 ปี","มีรายได้ต่อปีไม่น้อยกว่า 100 ล้านบาท",มีผลประกอบการดีเยี่ยม,มีเครดิตเรตติ้งดี}	{โรงงานผลิตขนาดใหญ่,ธุรกิจส่งออก,ธุรกิจข้ามชาติ,กลุ่มบริษัท}	100000000.00	1000000000.00	5	20000000.00	200000000.00	\N	TIERED	\N	\N	\N	f	\N	LONG_TERM	300	24	t	หลักประกันตามที่ธนาคารกำหนด มูลค่าไม่น้อยกว่า 150% ของวงเงินกู้	{ค้ำประกันโดยผู้ถือหุ้น,ค้ำประกันโดยบริษัทในเครือ,ค้ำประกันโดยบริษัทแม่}	{อัตราดอกเบี้ยพิเศษ,"วงเงินสูงสุดถึง 200 ล้านบาท","ปลอดชำระเงินต้น 24 เดือนแรก","Relationship Manager เฉพาะ"}	{"ลดค่าธรรมเนียมจัดทำสัญญา 50%","ลดค่าประเมินหลักประกัน 50%"}	\N	\N	ACTIVE	f	10	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.762	2026-02-16 06:12:09.762
66ef3eeb-3e98-445d-a833-d7d1074e6289	SME-GREEN-001	สินเชื่อ SME เพื่อสิ่งแวดล้อม (Green Loan)	SME Green Loan	สินเชื่อพิเศษสำหรับโครงการที่เป็นมิตรกับสิ่งแวดล้อม ดอกเบี้ยพิเศษ	{ติดตั้งพลังงานสะอาด,ลดการปล่อยคาร์บอน,จัดการขยะ,ประหยัดพลังงาน,โครงการสีเขียว}	{มีโครงการที่เป็นมิตรกับสิ่งแวดล้อม,ผ่านการรับรองมาตรฐานสิ่งแวดล้อม,มีแผนลดคาร์บอนที่ชัดเจน}	{โรงงานผลิต,ธุรกิจพลังงาน,ธุรกิจรีไซเคิล,ธุรกิจเกษตรอินทรีย์}	3000000.00	100000000.00	2	2000000.00	30000000.00	\N	TIERED	\N	\N	\N	t	รัฐบาลชดเชยดอกเบี้ย 2% และสนับสนุนค่าที่ปรึกษา	LONG_TERM	120	12	t	หลักประกันตามที่ธนาคารกำหนด	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{ดอกเบี้ยพิเศษสำหรับโครงการสีเขียว,"รัฐบาลชดเชยดอกเบี้ย 2%",สนับสนุนค่าที่ปรึกษา,"ปลอดชำระเงินต้น 12 เดือนแรก"}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,ฟรีค่าวิเคราะห์โครงการ,ฟรีค่าที่ปรึกษาสิ่งแวดล้อม}	\N	\N	ACTIVE	t	11	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.766	2026-02-16 06:12:09.766
cffeb117-665e-449e-a6e8-5796b75e330f	SME-DIGITAL-001	สินเชื่อ SME เพื่อดิจิทัลทรานส์ฟอร์เมชัน	SME Digital Transformation Loan	สินเชื่อพิเศษสำหรับการลงทุนด้านเทคโนโลยีดิจิทัล ระบบ IT และ E-Commerce	{"ลงทุนระบบ IT","พัฒนา E-Commerce","ระบบ ERP","ระบบ CRM","Digital Marketing","AI และ Automation"}	{มีแผนดิจิทัลทรานส์ฟอร์เมชันที่ชัดเจน,ผ่านการประเมินจากที่ปรึกษาดิจิทัล}	{ธุรกิจค้าปลีก,ธุรกิจบริการ,ธุรกิจการค้า,ธุรกิจผลิต,ธุรกิจทุกประเภท}	2000000.00	100000000.00	1	500000.00	20000000.00	\N	MIXED	3.99	5.99	ปีที่ 4+: MRR + 1.5%	t	รัฐบาลชดเชยดอกเบี้ย 2% และสนับสนุนค่าที่ปรึกษาดิจิทัล	MEDIUM_TERM	60	6	f	\N	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{ดอกเบี้ยพิเศษ,"รัฐบาลชดเชยดอกเบี้ย 2%",สนับสนุนค่าที่ปรึกษาดิจิทัล,ไม่ต้องใช้หลักประกัน}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,ฟรีค่าที่ปรึกษาดิจิทัล,ฟรีค่าอบรมดิจิทัล}	\N	\N	ACTIVE	t	12	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.77	2026-02-16 06:12:09.77
870d8b74-2afe-4501-98d2-867902dc285d	SME-REVOLVING-001	วงเงินสินเชื่อหมุนเวียน SME	SME Revolving Credit Line	วงเงินสินเชื่อหมุนเวียน ใช้เมื่อต้องการ คืนเมื่อพร้อม ยืดหยุ่นสูงสุด	{เสริมสภาพคล่อง,ซื้อสินค้า,จ่ายค่าใช้จ่าย,โอกาสทางธุรกิจ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี","มีรายได้ต่อปีไม่น้อยกว่า 5 ล้านบาท",มีกระแสเงินสดดี}	{ธุรกิจการค้า,ธุรกิจบริการ,ธุรกิจผลิต,ธุรกิจนำเข้า-ส่งออก}	5000000.00	100000000.00	2	1000000.00	20000000.00	\N	VARIABLE	\N	\N	MRR + 2.5%	f	\N	REVOLVING	12	0	t	หลักประกันตามที่ธนาคารกำหนด	{ค้ำประกันโดยผู้ถือหุ้น}	{"ใช้เมื่อต้องการ คืนเมื่อพร้อม",คิดดอกเบี้ยเฉพาะยอดที่ใช้,ยืดหยุ่นสูง,อนุมัติเร็ว}	{}	\N	\N	ACTIVE	f	13	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.772	2026-02-16 06:12:09.772
bb40599c-1bac-4aba-972a-13624acdddca	SME-EXPORT-001	สินเชื่อ SME เพื่อการส่งออก-นำเข้า	SME Export-Import Loan	สินเชื่อพิเศษสำหรับธุรกิจนำเข้า-ส่งออก รองรับการทำธุรกิจระหว่างประเทศ	{นำเข้าสินค้า,ส่งออกสินค้า,"เปิด L/C",ค่าขนส่งระหว่างประเทศ,ค่าประกันสินค้า}	{มีใบอนุญาตนำเข้า-ส่งออก,มีประสบการณ์การค้าระหว่างประเทศ,มีคู่ค้าต่างประเทศที่ชัดเจน}	{ธุรกิจนำเข้า-ส่งออก,ธุรกิจการค้าระหว่างประเทศ,ผู้ผลิตเพื่อส่งออก}	10000000.00	500000000.00	2	3000000.00	50000000.00	\N	MIXED	4.50	6.50	ปีที่ 4+: MLR + 1.5%	f	\N	MEDIUM_TERM	60	3	t	สินค้า หรือหลักประกันอื่นตามที่ธนาคารกำหนด	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย EXIM Bank"}	{รองรับการทำธุรกิจระหว่างประเทศ,"บริการเปิด L/C",บริการแลกเปลี่ยนเงินตรา,ที่ปรึกษาการค้าระหว่างประเทศ}	{"ลดค่าธรรมเนียมเปิด L/C 30%"}	\N	\N	ACTIVE	f	14	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.774	2026-02-16 06:12:09.774
6ec29a90-ebf7-4281-9795-b908d2605e23	SME-FRANCHISE-001	สินเชื่อ SME เพื่อธุรกิจแฟรนไชส์	SME Franchise Loan	สินเชื่อพิเศษสำหรับการซื้อแฟรนไชส์หรือขยายสาขาแฟรนไชส์	{ซื้อแฟรนไชส์,เปิดสาขาแฟรนไชส์,ค่าตกแต่งร้าน,ค่าอุปกรณ์,ค่าสต็อกสินค้า}	{มีสัญญาแฟรนไชส์ที่ชัดเจน,แฟรนไชส์ต้องมีชื่อเสียง,ผ่านการอบรมจากเจ้าของแฟรนไชส์}	{ร้านอาหารแฟรนไชส์,ร้านกาแฟแฟรนไชส์,ร้านค้าปลีกแฟรนไชส์,ธุรกิจบริการแฟรนไชส์}	0.00	50000000.00	0	1000000.00	15000000.00	\N	TIERED	\N	\N	\N	f	\N	MEDIUM_TERM	84	6	f	\N	{ค้ำประกันโดยผู้ถือหุ้น,"ค้ำประกันโดย TCG"}	{เหมาะสำหรับผู้เริ่มต้นธุรกิจ,ไม่ต้องใช้หลักประกัน,อนุมัติเร็ว,"ปลอดชำระเงินต้น 6 เดือนแรก"}	{ฟรีค่าธรรมเนียมจัดทำสัญญา,"ฟรีค่าธรรมเนียมค้ำประกัน TCG 2 ปี"}	\N	\N	ACTIVE	t	15	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.776	2026-02-16 06:12:09.776
cbff2a76-2669-49e6-a3ec-8f873646f8b6	SME-OLD-001	สินเชื่อ SME รุ่นเก่า (ไม่ใช้งาน)	SME Old Loan (Inactive)	สินเชื่อรุ่นเก่าที่ไม่เปิดให้บริการแล้ว	{ขยายกิจการ}	{"ดำเนินธุรกิจมาแล้วไม่น้อยกว่า 2 ปี"}	{ทุกประเภท}	\N	\N	\N	1000000.00	10000000.00	\N	FIXED	8.99	\N	\N	f	\N	LONG_TERM	120	0	t	\N	{}	{}	{}	\N	\N	INACTIVE	f	99	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.78	2026-02-16 06:12:09.78
7df3047b-7c5c-455b-90c5-7412352d4512	SME-ARCHIVE-001	สินเชื่อ SME โครงการพิเศษ 2023 (เก็บถาวร)	SME Special Project 2023 (Archived)	สินเชื่อโครงการพิเศษที่สิ้นสุดแล้ว	{โครงการพิเศษ}	{ตามเงื่อนไขโครงการ}	{ทุกประเภท}	\N	\N	\N	500000.00	5000000.00	\N	FIXED	3.99	\N	\N	t	โครงการสิ้นสุดแล้ว	SHORT_TERM	36	0	f	\N	{}	{}	{}	2023-01-01 00:00:00	2023-12-31 00:00:00	ARCHIVED	f	100	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:12:09.782	2026-02-16 06:12:09.782
\.


--
-- Data for Name: loans; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.loans (id, customer_id, branch_id, officer_id, contract_number, principal, interest_rate, term_months, current_principal, version, interest_calculation_method, last_interest_calculation_date, accumulated_interest, payment_day, first_payment_date, payment_day_adjustment, dscr, dscr_status, monthly_payment, total_interest, allow_early_payment, early_payment_penalty_rate, status, sla_status, sla_deadline, approved_by, approved_at, rejected_by, rejected_at, rejected_reason, approval_level, current_approval_level, approval_history, disbursement_date, maturity_date, outstanding_balance, next_payment_date, next_payment_amount, last_payment_date, overdue_days, total_disbursed, remaining_amount, product_config_id, product_config, loan_product_id, start_date, end_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: aging_analysis; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.aging_analysis (id, loan_id, customer_id, branch_id, current_age, aging_bucket, principal_overdue, interest_overdue, penalty_overdue, total_overdue, collection_agent_id, collection_strategy, next_action_date, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: aml_checks; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.aml_checks (id, customer_id, check_type, check_result, match_score, matched_names, check_data, performed_by, performed_at, reviewed_by, reviewed_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: approval_limits; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.approval_limits (id, role, min_amount, max_amount, approval_level, requires_next_level, sla_hours, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.audit_logs (id, user_id, action, entity, entity_id, changes, ip_address, user_agent, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: blocked_ips; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.blocked_ips (id, ip_address, reason, blocked_by, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: product_budgets; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.product_budgets (id, product_id, product_code, product_name, fiscal_year, quarter, total_budget_amount, committed_amount, disbursed_amount, pending_amount, available_amount, utilization_rate, warning_threshold, critical_threshold, budget_status, budget_owner, notes, version, created_by, created_at, updated_at) FROM stdin;
3494594e-e167-49d0-801b-3c401c8b261c	2ea472a3-89ae-44ef-90b5-0ab274333b15	SME-FIXED-001	สินเชื่อ SME เพื่อขยายกิจการ (อัตราคงที่)	2026	1	75000000.00	0.00	47220000.00	0.00	77780000.00	62.96	80.00	95.00	ACTIVE	\N		1	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 06:51:54.721	2026-02-16 17:14:05
d9be18d7-65fe-4f2b-91ef-63b619a74e84	783c31b9-2f12-4781-ab31-47edc8bf7b9e	SME-FIXED-002	สินเชื่อ SME เพื่อเสริมสภาพคล่อง (อัตราคงที่)	2026	1	20000000.00	0.00	500000.00	0.00	19500000.00	2.50	80.00	95.00	ACTIVE	\N		1	995ee434-ee85-4877-a3af-ac2216c5a175	2026-02-16 17:24:53.179	2026-02-16 17:28:23.176
\.


--
-- Data for Name: budget_consumption; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.budget_consumption (id, product_budget_id, loan_id, branch_id, requested_amount, approved_amount, disbursed_amount, consumption_type, status, consumption_date, consumption_time, processed_by, released_amount, released_at, released_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.calendar_events (id, branch_id, created_by, title, description, start_date, end_date, all_day, event_type, category, loan_id, customer_id, recurring, recurrence_rule, reminder_minutes, location, attendees, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: collection_workflow_steps; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.collection_workflow_steps (id, days_overdue_from, days_overdue_to, action_type, template_id, priority, assigned_role, sla_hours, is_active, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: contact_logs; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.contact_logs (id, customer_id, loan_id, officer_id, contact_date, contact_status, contact_method, notes, promised_date, task_id, next_follow_up_date, outcome, created_at) FROM stdin;
\.


--
-- Data for Name: conversation_states; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.conversation_states (id, line_user_id, flow, step, data, state, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: credit_lines; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.credit_lines (id, customer_id, credit_line_number, approved_limit, current_balance, available_balance, utilization_rate, interest_rate, start_date, expiry_date, review_date, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: credit_line_drawdowns; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.credit_line_drawdowns (id, credit_line_id, drawdown_number, amount, purpose, drawdown_date, maturity_date, interest_rate, status, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: customer_active_products; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_active_products (id, customer_id, loan_product_id, loan_id, activated_at, deactivated_at, status) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.documents (id, customer_id, document_type, file_name, file_path, file_size, mime_type, file_hash, ai_processed, ai_status, extracted_data, confidence_score, enhanced_data, document_subtype, processing_version, review_status, reviewed_by, reviewed_at, review_notes, rejected_reason, uploaded_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_business_profiles; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_business_profiles (id, customer_id, source_file_name, source_file_hash, document_id, parser_version, match_confidence, sheets_parsed, warnings, status, "reviewStatus", reviewed_by, reviewed_at, review_notes, version, is_latest, previous_version_id, enhanced_data, recommendation, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: customer_approval_comments; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_approval_comments (id, profile_id, comment_type, comment_by, "position", comments, risk_assessment, recommendation, decision, approved_amount, special_conditions, comment_date, created_at) FROM stdin;
\.


--
-- Data for Name: customer_bank_statements; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_bank_statements (id, customer_id, bank_name, account_number, account_name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_bank_statement_months; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_bank_statement_months (id, statement_id, month, withdraw_count, withdraw_amount, deposit_count, deposit_amount, balance) FROM stdin;
\.


--
-- Data for Name: customer_business_histories; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_business_histories (id, customer_id, type, content, details, created_at) FROM stdin;
\.


--
-- Data for Name: customer_collaterals; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_collaterals (id, profile_id, collateral_type, description, location, estimated_value, appraised_value, appraised_by, appraised_date, owner_name, owner_relationship, title_deed_number, land_office, registration_number, is_insured, insurance_company, insurance_value, "order", attachments, created_at) FROM stdin;
\.


--
-- Data for Name: customer_comments; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_comments (id, customer_id, topic, content, created_at) FROM stdin;
\.


--
-- Data for Name: customer_credit_bureaus; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_credit_bureaus (id, customer_id, type, name, check_date, total_limit, total_outstanding, number_of_accounts, npl_status, accounts, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_customers; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_customers (id, profile_id, name, address, phone, contact_person, product_service, payment_terms, sales_proportion, contact_duration, relationship_quality, "order", created_at) FROM stdin;
\.


--
-- Data for Name: customer_dscr_analysis; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_dscr_analysis (id, profile_id, analysis_year, analysis_period, net_operating_income, other_income, total_income, principal_payment, interest_payment, total_debt_service, dscr_ratio, dscr_status, breakdown, created_at) FROM stdin;
\.


--
-- Data for Name: customer_executives; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_executives (id, profile_id, name, "position", national_id, date_of_birth, age, marital_status, current_address, registered_address, education, experience, is_shareholder, share_percentage, share_value, "order", created_at) FROM stdin;
\.


--
-- Data for Name: customer_financial_statements; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_financial_statements (id, customer_id, year, revenue, gross_profit, net_profit, cost_of_sales, selling_expenses, admin_expenses, ebitda, total_assets, total_liabilities, total_equity, current_assets, non_current_assets, current_liabilities, non_current_liabilities, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_investments; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_investments (id, customer_id, description, total_amount, own_share, loan_share, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_loan_requests; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_loan_requests (id, profile_id, loan_type, product_name, requested_amount, purpose, term_months, proposed_interest_rate, interest_calculation, collateral_description, collateral_value, request_type, status, loan_id, "order", created_at) FROM stdin;
\.


--
-- Data for Name: customer_projections; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_projections (id, customer_id, year, revenue, cost_of_sales, gross_profit, expenses, net_profit, dscr, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_shareholders; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_shareholders (id, profile_id, name, national_id, share_percentage, share_value, share_type, has_signing_authority, signing_conditions, "position", phone, email, address, "order", created_at) FROM stdin;
\.


--
-- Data for Name: customer_suppliers; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_suppliers (id, profile_id, name, address, phone, contact_person, product_type, payment_terms, credit_limit, contact_duration, relationship_quality, "order", created_at) FROM stdin;
\.


--
-- Data for Name: customer_vat_records; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_vat_records (id, customer_id, month, year, sales_amount, sales_tax, purchase_amount, purchase_tax, tax_payable, details, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_working_capitals; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.customer_working_capitals (id, customer_id, total_limit, used_limit, stock_amount, receivable_days, payable_days, details, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: data_access_logs; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.data_access_logs (id, user_id, customer_id, access_type, access_path, accessed_fields, purpose, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: secure_document_tokens; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.secure_document_tokens (id, token, document_type, document_id, customer_id, expires_at, access_count, last_accessed_at, created_at) FROM stdin;
c1539f2d-1103-477a-a5d3-f7dbe29c04fd	470f535d6fea30ce9396163bb13746770470176e38bf0de331343551eacf5f45	invoice	ac0f1f1b-20f2-4700-960a-ada3fb07edf8	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 14:21:47.178	0	\N	2026-02-16 14:21:47.179
e054625c-a6d6-4da3-81aa-e8b80267cbe2	76f5a80e7e9903c6b51427e5bc4e31ea22e7c7105f19f8036f0fa157e9064799	invoice	c78f4b8a-096e-44a1-8b64-e0a9de0edbd8	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 14:21:47.181	0	\N	2026-02-16 14:21:47.182
7fb092fd-c25e-42a9-90c9-45f4f9136f7a	4b32122a648d47305514580987ed8f79d9da24e90acda85869be8ddb6cd9c1d8	contract	ec38775c-09ff-40a5-9a49-fb9e25b0e572	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 14:22:18.992	0	\N	2026-02-16 14:22:18.993
99c14237-c453-4146-a9fc-f761bf437277	f6c156e169f6a56f99791e393669bd1179fb74eebaa631386898bcb7b0f52702	invoice	ac0f1f1b-20f2-4700-960a-ada3fb07edf8	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 14:26:40.008	0	\N	2026-02-16 14:26:40.009
f43a6ecf-1da5-4a53-875d-8a72c8645c90	6d12a143fd28ef3f4e9833b9211d41a01dc35abb31c110206824ac89442eada5	invoice	96b626f7-4e35-4070-b316-8a731f871956	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 14:26:40.009	0	\N	2026-02-16 14:26:40.01
04767cca-8ed2-4e9d-8520-7242ddec086b	48bf9f7b596b7db0a90095d22e85a9f15541cc5893d93c2a6c94df293038af51	invoice	96b626f7-4e35-4070-b316-8a731f871956	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 14:26:59.915	0	\N	2026-02-16 14:26:59.916
bcb858ef-cdb3-4a5a-b179-50dd0b36252b	570894c05058b8080376b85a540f57612ad13d1178e24703cafb8e47cb8bc0bd	invoice	ac0f1f1b-20f2-4700-960a-ada3fb07edf8	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 14:26:59.916	0	\N	2026-02-16 14:26:59.916
99ef7fc3-2340-46b4-aa5b-7a1fe0724766	78c30f89b3052d6770c799f6b04c98236fc025524f553ae14ba632a51d757b7b	invoice	edbc714f-96dc-4422-a891-383d1c5fe974	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:52:59.065	1	2026-02-16 14:53:06.994	2026-02-16 14:52:59.066
ab47491f-88db-4c25-95b0-f990da99bc27	e3c99c9ac62b648118d9a8e19ab07b13ef6e9d24c314c2e9c8e2aef19327981f	receipt	9d8f87ee-21ff-46e0-b029-1a46e6ca04d6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:25:25.196	2	2026-02-16 14:33:48.423	2026-02-16 14:25:25.197
75dcb948-2739-4b18-af0b-65bb5ef3e05b	3317c666ae7d12fa01716558c0ad0ac355b9d24c4d35fd4cf0c45fe222428cd4	receipt	c0482929-3f78-4ead-88fb-543d46614379	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:54:24.615	1	2026-02-16 14:54:32.804	2026-02-16 14:54:24.616
b45f5875-d453-4684-a52a-8580328d0b8c	c349a248e23ba3f3cb8b8b41775e087b6ce25374f4e566ac7c2c18195a873f50	contract	c96360c2-0322-4960-870e-3033664d5570	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:35:56.098	0	\N	2026-02-16 14:35:56.099
b2ec78fa-bd7a-4332-a8ee-c4975e3822f9	459672e5231f77fcb1a08c8b1018cfdbc5440c9c4eac301587b461a699b3614a	receipt	1c302495-de76-4fdf-8fc6-82f731f7be77	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 14:34:45.005	3	2026-02-16 14:36:22.925	2026-02-16 14:34:45.006
0c82f33f-f90d-45c6-a9ab-d8e873e61384	fd4b1f83475c5ae9a404af6d139f890af361fa0a246d39d3dd5ee310292b7d9e	invoice	ac0f1f1b-20f2-4700-960a-ada3fb07edf8	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 14:36:29.428	1	2026-02-16 14:36:36.409	2026-02-16 14:36:29.429
5725b842-8b58-40b2-acd0-0d309a0d6196	2100289a1dfcbaf83a337c6a5b5193aa8fb79950bf59717de752ad1fb567fdc3	invoice	96b626f7-4e35-4070-b316-8a731f871956	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 14:36:29.428	1	2026-02-16 14:36:51.332	2026-02-16 14:36:29.429
5023157d-40fb-4480-bc77-52f44af2b377	4b6af51c83e4860a5b4bacc14a7c746ea931f59d3b568d4fd3031179635dd506	invoice	edbc714f-96dc-4422-a891-383d1c5fe974	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:42:58.638	4	2026-02-16 14:44:45.261	2026-02-16 14:42:58.639
3a2abb67-ae3a-4a8d-a8b1-1c339b4dbdf2	5e64b5ba675c790ba09f9ab592c9409d23985fa42f0c09d424de55e07508e965	invoice	edbc714f-96dc-4422-a891-383d1c5fe974	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:45:26.792	1	2026-02-16 14:45:37.794	2026-02-16 14:45:26.793
3df5db6f-2412-4ee0-92c7-0f5c060533d0	50b2a48b76185ab15c57a69cb348b052f989ef0b4057604cee423979fc6d55c6	invoice	edbc714f-96dc-4422-a891-383d1c5fe974	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:47:23.584	1	2026-02-16 14:47:37.006	2026-02-16 14:47:23.585
f9f173a0-0ce7-4324-8eb8-a78368d73d22	8dd21d014b34a4cf309c5d52871826936fdbbaca2bda8e378715a8b8f73f6e7c	invoice	edbc714f-96dc-4422-a891-383d1c5fe974	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:37:07.778	7	2026-02-16 14:41:26.04	2026-02-16 14:37:07.778
ccdf13f8-51eb-4b33-8116-97a34792c1b6	681ec695cd69ef98989b1379178f37a32ee23a3ce5ab2d280cce4333efe1ed62	invoice	edbc714f-96dc-4422-a891-383d1c5fe974	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:42:23.876	1	2026-02-16 14:42:53.532	2026-02-16 14:42:23.877
c01d59f7-adbf-45ed-8e05-481aeefb4f01	3e5051d715ee0227a29dc193462c704aab4c2b56b6f5850351ef8786f599574e	invoice	edbc714f-96dc-4422-a891-383d1c5fe974	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:48:39.137	1	2026-02-16 14:48:50.372	2026-02-16 14:48:39.138
8f34c0d2-8e9b-4a32-8018-3b216992e72a	b2c29a6fab30444f7644feff98bd10a8746a696dc66394ed9d66c8048d85ba2c	invoice	edbc714f-96dc-4422-a891-383d1c5fe974	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:49:58.534	0	\N	2026-02-16 14:49:58.535
01c43796-a544-4cff-9faa-1af9798c1078	58c8467df58cd12caf951ac3b27b241844c732e394d861bf925aabda65081c0b	contract	ef102b1f-50b6-41ab-b42c-54d5dc4f1bac	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:57:22.456	0	\N	2026-02-16 14:57:22.457
d3f1fd0b-3f22-44e5-ad9c-e794834a1e74	dbe60e5a4508dfb0e4099d4eae08e456271a7b4d28dfeca919f9ddff775f7f1a	invoice	edbc714f-96dc-4422-a891-383d1c5fe974	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 14:50:20.435	2	2026-02-16 14:52:53.872	2026-02-16 14:50:20.436
eda697a0-d3d5-4ccd-9f0c-9c36b5e4f7b9	4e6808f6b3910ff32df281eefedc467f7319fd344e8fe927979569fc4a135eb6	receipt	347d47f7-e635-441f-83b7-9fa0ee92bfcc	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:30:43.093	0	\N	2026-02-16 15:30:43.094
8ad86a1c-99ff-42e0-bf3f-94311ca15768	1e7a5c33f9c5b7369fcb3a8557eff5aa395c096aebba336b9d33ff3dc5e2243a	receipt	ceeb5432-a07d-47f3-b37d-4b35e9fc79ae	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:30:43.093	0	\N	2026-02-16 15:30:43.094
73be329b-510b-4175-8833-fa67f33bc234	5af6b89c7563816f702ba745b803c31b520c10cbd34e80a099c4b0907b1e6a97	receipt	9d8f87ee-21ff-46e0-b029-1a46e6ca04d6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:30:43.093	0	\N	2026-02-16 15:30:43.094
d19d4f0d-4fdc-4b9c-b8ff-b9ffcd2a0de4	a5b3e49dd231b8082423a7e2954d7ad9b420cfc7000510d095a2736addf3ca1a	receipt	c0482929-3f78-4ead-88fb-543d46614379	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:30:43.093	0	\N	2026-02-16 15:30:43.094
a313d83e-5c16-439b-857c-88a9ca1becbe	a9ae9554c9e1a21c8deba1afea3fbc4d4a7e3ff5aebcad292ac11a5ddbc23f63	receipt	365256f2-0de0-4a72-bb04-5d323c518cba	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:30:43.093	1	2026-02-16 15:31:03.597	2026-02-16 15:30:43.094
6e0567e4-1529-4abe-aa71-add00306e755	0b91bd3120aa22f34b8a2a1e0f661a2cc958fc399d2356fda673f3c3eb1a36e3	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:33:03.852	1	2026-02-16 15:33:24.11	2026-02-16 15:33:03.853
c8e22d13-6237-499b-a23c-3507cf4a02ee	88f6c1ea3821760626aded1bb1ef45aba86962cf235c219fdfc564f41a7198ef	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:33:40.582	1	2026-02-16 15:33:49.737	2026-02-16 15:33:40.583
7cf69197-dc19-4206-85f9-389ba169d9db	a6f39e35d364cb0245e711a99bac7144470ca94e4b47be4bbd0774f59a75d772	invoice		2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:34:07.596	1	2026-02-16 15:34:19.33	2026-02-16 15:34:07.597
cbbb9551-6e4e-43db-a8a7-09e679dfc827	523502edd554f63a9fbd08ab925a5d5ba7481860bd39198978ef263559341878	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:36:33.296	1	2026-02-16 15:36:43.581	2026-02-16 15:36:33.297
5394ada6-b7e2-4a67-9c96-fd572afa12a9	18fd09e11cdf6aa47dd425bae135d3e0412fc8504b98ca747e155848e77ecd86	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:37:01.802	1	2026-02-16 15:37:12.277	2026-02-16 15:37:01.803
207c50e1-62de-4a35-b1ca-16c0ae0ba1fe	cb525b363109a01fe5801cae90f3af792d2f4e24c69c3d4ca01485f5a7a6ed74	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:39:40.277	1	2026-02-16 15:39:53.831	2026-02-16 15:39:40.278
1b9e86d7-7a8f-4159-84b8-9e5a43720e04	a89afb39b975c45793a62b6e51854f0aca658e9aa29b7c29fbe601b62209e9d5	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:40:26.532	1	2026-02-16 15:40:41.422	2026-02-16 15:40:26.533
0d5665cf-bc9d-4d0c-bb64-c36eae669910	51077dc023a31272e8ecf83d8df484e3ea5ca4f7168a2bce76b7520dc9075077	receipt	365256f2-0de0-4a72-bb04-5d323c518cba	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:51:53.373	1	2026-02-16 16:52:14.206	2026-02-16 16:51:53.375
4dcf2d72-7cf8-43d0-8572-4b022f6e0a9e	7dd09828da4b07545ad58a3ee3326ab45b720392169758c431bb6ef96c22de76	invoice	9a1dc5fa-e54e-4254-8eea-a7fd9cd4c8ed	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 15:40:31.718	2	2026-02-16 15:40:55.54	2026-02-16 15:40:31.719
c62ec2b0-6143-4b29-9ad7-6c6855f375ac	069be3c53a5ce0244d2c6a0fa4b122f4587326b34cdb265af2a38d135f62ca12	invoice	9a1dc5fa-e54e-4254-8eea-a7fd9cd4c8ed	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 15:41:01.493	1	2026-02-16 15:41:08.626	2026-02-16 15:41:01.494
8a8d9a67-c8d4-40a3-b8e6-f58ac2ec0a70	78caaf5665fc5bfff728d5c7291d8adf2db8eedbbcd3a3244d51c5523fd727f9	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:41:49.004	1	2026-02-16 15:41:57.831	2026-02-16 15:41:49.005
e84fd1cb-4e7d-4048-b678-a76ff0f478bd	37736700ac0aba660d61653e91e52c7e181f6878185d5aafe307cd3b609031ac	invoice	00dbdc66-a37c-43f8-899f-11af5d881927	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 15:41:55.068	1	2026-02-16 15:42:04.37	2026-02-16 15:41:55.068
1efd9d8b-3d95-491a-afce-a7067d0c5644	34ce6fbdcddf8dac03860d2a8feb981065bb9b16309d45b1d45a904c4b0eb479	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:42:15.287	1	2026-02-16 15:42:22.389	2026-02-16 15:42:15.288
3c959af3-c935-4c76-8f8f-b72e2188be96	67fb929c5f152be7ab68d057cd294861e01121761552f9164d4f7cb8309085de	invoice	9a1dc5fa-e54e-4254-8eea-a7fd9cd4c8ed	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 15:42:26.084	0	\N	2026-02-16 15:42:26.085
c08d17bd-a9a8-46bb-93de-f8f53ea85a62	d4dbfa9d48d5a035a637dfee962409c0420ede222c92b50da66cc26899c88fd0	invoice	00dbdc66-a37c-43f8-899f-11af5d881927	663ed212-d894-4680-864e-23fbb0a0861a	2026-02-23 15:42:26.084	1	2026-02-16 15:42:36.174	2026-02-16 15:42:26.085
b756a9f4-a98a-443c-aa88-317b9303c149	a05dbf87809b75c2242431ae8eed72a1242266d4a596bc4807cfca28e8108527	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:42:55.945	0	\N	2026-02-16 15:42:55.946
acae1476-ee6e-4c6c-9b09-2cc395dec9ba	a9631f87a520f42b9a440be38caebf59a7685633affe9f630748356c43c93259	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:42:55.945	0	\N	2026-02-16 15:42:55.946
8b5c3542-aaca-4fbd-8cb7-0e9a77a2261a	1050874c90ae44682664d7bbe27ff65ac4fa7e1b2a13cfe40898e1f46f3d3662	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 15:42:55.945	0	\N	2026-02-16 15:42:55.946
b54125a7-eb69-4fb8-ae2c-733a7fd5adb9	d1497b4c1cbecc63c75dbf55f721213445486f7ef1f3f182b1116318f2e09a6a	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:38:04.43	0	\N	2026-02-16 16:38:04.431
59d1d17c-1704-4b6a-9d9b-1379438bc040	25a1fd89087c54401e8936e83e1907d2c8a568e685ebbefc1df237680e76c46d	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:38:20.885	0	\N	2026-02-16 16:38:20.886
37ce82e8-786d-4801-83f6-4f3fd1aae197	faf1e3d5ecadfe7fc173fa3bcb6ae5fc17023217b0ddb63f4dc3918ae0d9c78f	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:38:20.885	0	\N	2026-02-16 16:38:20.886
3e8b7729-ab01-48b4-b192-ebb482c072ea	27d7c6d227f624b01f180ebab3c233b83e7c516ff7906283ab95b4862ad92828	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:38:20.885	0	\N	2026-02-16 16:38:20.886
9c57fd51-087a-4ba4-95e5-b6086c7c25a8	8cf2e22e4e0d6edeebbc398b07e34fd3c6c06e0bec38a9b2bf3d70bf9da165e6	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:45:03.959	1	2026-02-16 16:45:17.487	2026-02-16 16:45:03.96
c3f765e6-123d-4b6e-bb23-8ced6aa30932	06305fcab6d1ca72a5d3d2d8fe44a8eb6a97f5eece0585b0ba245c2930e6f574	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:45:56.353	0	\N	2026-02-16 16:45:56.354
bed152ab-8f5e-4fec-bc9c-6113ded394d5	2b16f75f783e935e3b8cd1720d0ca9216b519b2c599edba5e23019ce2e127623	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:45:56.353	0	\N	2026-02-16 16:45:56.354
c75f1647-ad8a-44cc-93fc-1c1b2b6dbad3	1daaa23a374aec8605c321929af6ebf07634ddb255279808f40ff43dc73dcd3b	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:45:56.353	0	\N	2026-02-16 16:45:56.354
d490fd13-2be3-42fe-92fd-bc3c0a266b9d	7beded8174b5c64e9ac64062d57ddc08d46633460a61b8e423807d032f6345fb	receipt	c0482929-3f78-4ead-88fb-543d46614379	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:51:53.373	0	\N	2026-02-16 16:51:53.375
ca9d4d7c-69f6-4ed6-9a9d-84d81cfe8faa	fae694f901a33822d122251418332d2f9e24f1cf7c4d3395baa85c6aec41abe3	receipt	ceeb5432-a07d-47f3-b37d-4b35e9fc79ae	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:51:53.373	0	\N	2026-02-16 16:51:53.375
61c4f5db-b502-4d58-abfe-8f82c9987b2b	e8655be4342f404a3c87739b6ec9d0676a23efde11d5bf01b176e5bcc2194a70	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:54:00.185	1	2026-02-16 16:54:22.445	2026-02-16 16:54:00.186
f97fa1c2-9aa2-417c-82ce-e70f8fbc146f	663e7a665b0dce241de6a652b8d5d58d4153252b20271f6d7f76bf005ccbb174	receipt	9d8f87ee-21ff-46e0-b029-1a46e6ca04d6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:51:53.373	0	\N	2026-02-16 16:51:53.375
c528e9d3-eace-47f1-a612-6bac7d34f058	ff676cc947aa8fc8a233ee6a9e6422e4be5c31473900edffec3d0b9b409a0c5f	receipt	347d47f7-e635-441f-83b7-9fa0ee92bfcc	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:51:53.373	1	2026-02-16 16:52:43.57	2026-02-16 16:51:53.375
3f269ce1-5636-433f-92d3-df4241173857	3eabf23289fa0d8e542fd4e5b13817cd423c60cd7804021f0f5cf52299afc3ac	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:54:00.185	0	\N	2026-02-16 16:54:00.186
ae9d7813-2022-4925-b1c7-7b478335d257	2eeacf934dfb49ce8caef7c6f15c9910c632ec79361d023dd694a0e7de53a752	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:54:00.185	0	\N	2026-02-16 16:54:00.186
d2a4e023-0b1f-418b-ae2c-fcddda456b60	ac019b24effed13c9aa8c9a713f0d74338ba12b32b65b0ff566525cffd786197	receipt	347d47f7-e635-441f-83b7-9fa0ee92bfcc	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:56:54.064	0	\N	2026-02-16 16:56:54.065
330879cc-1df8-4896-8a42-e4f9ffbda8ed	2bdd77bf01d9cc010c38a71bd9f8fec40b911eab6b7c163bfc83c5f1ecf28862	receipt	c0482929-3f78-4ead-88fb-543d46614379	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:56:54.064	0	\N	2026-02-16 16:56:54.065
352996d4-3cdd-4c2f-aeeb-e17fe018a790	6a2e9b145c4798e833ad6a1a11ee97fbb2ec344c5a8c262d97d5e30006c10811	receipt	9d8f87ee-21ff-46e0-b029-1a46e6ca04d6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:56:54.064	0	\N	2026-02-16 16:56:54.065
644e98a3-c149-4fad-8b59-1d95aee3d40f	c0bd57f0a776648739b357b1dc3bffcacd088311c664882cf8570a03c56ab434	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:57:01.927	0	\N	2026-02-16 16:57:01.928
e99c628d-7f87-4f98-9682-5b5a6c5d8b11	bc406e3187e2a150e233a75acece67f0e79bc5e5065b7c2714769c37c6fa9374	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:57:01.927	0	\N	2026-02-16 16:57:01.928
22a927a5-57db-4f03-b86b-e3756eee86bd	d40fa3fad1d70b9a140af88545ba64959a2f2d3bd5019b583596fc27c274123b	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:57:01.927	0	\N	2026-02-16 16:57:01.928
e52bd263-8318-4d33-b96c-513d227d0f6a	885108262c89df686fe8429f0a3eea58916c8bdb68a138255626c1e464a4543f	receipt	365256f2-0de0-4a72-bb04-5d323c518cba	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:56:54.064	1	2026-02-16 16:57:13.699	2026-02-16 16:56:54.065
12059321-e7e0-47f9-b19d-85f7a306a267	2bf10f4c209199d0c03a19aeb853102c0f9fd4093e0922a08b15a69b5b62ab8e	receipt	ceeb5432-a07d-47f3-b37d-4b35e9fc79ae	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 16:56:54.064	1	2026-02-16 16:57:27.501	2026-02-16 16:56:54.065
c0a6608c-9d35-4bc7-b724-dc3e1549dbeb	b86645068b4b1d8f5611d902f2a81782ea2f1c7b638589781e65fad8364468ce	contract	c8b3b194-5c30-44ee-bed2-6dca090838ca	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:28:30.202	0	\N	2026-02-16 17:28:30.205
cb664caa-89ab-4ea9-ae6b-09911a8c807c	8bf3eee63e26186c36b779bc2d992bb5aefab791a4c59b2985a4c6b69cf7548e	contract	c8b3b194-5c30-44ee-bed2-6dca090838ca	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:29:14.274	1	2026-02-16 17:29:29.364	2026-02-16 17:29:14.275
dd800e79-5763-45da-969a-55f969dff4a6	ef005db08a596808e97786b17ddeb37d9d5a27c57a8bd9fbd227cd32107dc5a4	invoice	7089182a-1a52-462d-a500-e812568958f6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:29:52.63	1	2026-02-16 17:30:01.894	2026-02-16 17:29:52.631
45e5fcb2-9f53-46ee-b0d4-426dc20b0220	4a6321749b1b6251db59502bf3361484cefb716c90170ea4ec1b1eb20e3a019c	invoice	87100df8-f1fb-4592-91ac-cbd6a1205c24	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:39:39.338	1	2026-02-16 17:39:50.814	2026-02-16 17:39:39.339
f3524368-94de-445b-a864-bcaf9431e484	d75f0fadb3d415a807da0ebcb0342fe2f6e8841ad5ecb3e0ebd8f5abfb962482	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:40:08.162	1	2026-02-16 17:40:17.579	2026-02-16 17:40:08.163
e79f2baa-3268-4067-b306-0f2354e20ce5	a180ded906d9e9b4a39138e11856103527b178714a410e0684fe3ee6d0392664	invoice	7089182a-1a52-462d-a500-e812568958f6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:46:32.422	1	2026-02-16 17:46:44.106	2026-02-16 17:46:32.423
b3458ea4-b5df-4d68-8b15-b0e065b9ba03	e9ce80d12c3e4e02f90db536c84d0abd78dd7b862e7c2e38129c914ae66a5abc	invoice	7089182a-1a52-462d-a500-e812568958f6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:41:25.723	2	2026-02-16 17:42:24.901	2026-02-16 17:41:25.724
1fadcc9f-aec3-4958-889b-f290a41516c9	264560210e46b66f83ea67b6387d5076c89bc07d21360ac66180401ffad589cb	contract	c8b3b194-5c30-44ee-bed2-6dca090838ca	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:42:43.027	1	2026-02-16 17:42:53.235	2026-02-16 17:42:43.027
11942f02-faa4-4971-848b-198b741f1c00	80a1a037c337717f610f1494bfe85ff16fcfd86a7ead980ba32f9e002c002a0f	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:47:45.18	0	\N	2026-02-16 17:47:45.181
ddda2e30-3221-4e8e-ae74-03289daf5499	f565f70bb9f710873d00bd891c6b6dfe36af6842ddad1c63b55720751837a92e	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:47:45.18	0	\N	2026-02-16 17:47:45.181
968882b3-013d-47c1-ad6e-962520554bb2	b06666db2dd0b0232dbe6cbf0aa0b031f963953e5650c1520591e5ae4b4386e0	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:47:45.18	0	\N	2026-02-16 17:47:45.181
acfe848f-3ebb-47df-87b9-df3252d9d29f	f3676fbd1aa115a83c0f351c356a895e89d6a27fbcfa5660d5582365da75b11d	invoice	7089182a-1a52-462d-a500-e812568958f6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:47:45.18	0	\N	2026-02-16 17:47:45.181
beff6c99-9440-42cb-9ee5-06daed7caaf1	dcda79288a0a8e06cf7c50e176481dc614e63a7e4b74fc5b0e8364208d8d9208	invoice	87100df8-f1fb-4592-91ac-cbd6a1205c24	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:47:45.18	1	2026-02-16 17:48:01.416	2026-02-16 17:47:45.181
54b48331-00d9-48f8-aa36-edcf3e935fc7	6b2b65b80a78b663962b52160b93e39612c67ba3c67e81506d0102bd7a422708	invoice	87100df8-f1fb-4592-91ac-cbd6a1205c24	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-23 17:49:05.979	1	2026-02-16 17:49:30.616	2026-02-16 17:49:05.98
6458d223-c51d-44d4-88aa-5dfce14c34a8	85d51e114edefb0e33fdde636eb5cac55c3dd53a36673f6e1bab4bb8d061b6d3	receipt	365256f2-0de0-4a72-bb04-5d323c518cba	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 01:59:28.15	0	\N	2026-02-17 01:59:28.152
ada54f9b-fdf6-464c-b0bf-c0b0fc6da018	0cc1ae4bcbe8c4736ddb49c6be043b76be70ce1a243b01a906747f1d3aae05d8	receipt	c0482929-3f78-4ead-88fb-543d46614379	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 01:59:28.15	0	\N	2026-02-17 01:59:28.152
0eff01e5-a6dd-437b-a80b-37d5424e93e1	445c13491022d55fc7a7df03e4cddadff1876d7e9a1213e2e3dd589e5f5e4c2f	receipt	347d47f7-e635-441f-83b7-9fa0ee92bfcc	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 01:59:28.15	0	\N	2026-02-17 01:59:28.152
c8f78a5b-1d64-4b27-8c28-de47681c1c73	42024efea54406cf55db4688871a5eaea02f742827ca9d6330087ae9e512af32	receipt	ceeb5432-a07d-47f3-b37d-4b35e9fc79ae	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 01:59:28.15	0	\N	2026-02-17 01:59:28.152
176779cf-8e9f-47af-8024-f53b749edb30	fd9ac75999abf7358b388a31b52c6cec2833322130b3d8143546a8e033802ecb	receipt	9d8f87ee-21ff-46e0-b029-1a46e6ca04d6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 01:59:28.15	0	\N	2026-02-17 01:59:28.152
36586125-615b-48ce-8439-2269fae982ff	2b8ba37a99597910e6191d5e662742c4650559b84cc920728db70c0b2981ffe2	invoice	7089182a-1a52-462d-a500-e812568958f6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 01:59:30.194	0	\N	2026-02-17 01:59:30.194
4b518324-2996-4599-bdea-2014ffa1606c	e5039edf95f1b3c469befd2267fdaa8ad989523d2bd79c8eaa0d8810a1846b7b	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 01:59:30.193	0	\N	2026-02-17 01:59:30.194
d66ec9db-740c-4808-96b2-1a50e5e816ee	c590761df42277c8d43a13a4707bc10a012b3d415f46c2b37d972b3d5062ff4e	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 01:59:30.193	0	\N	2026-02-17 01:59:30.194
5687cb21-f434-4133-b3ac-7242050743b0	734fe0cbb143e9df90864909ceb23dc7e5307264687f52c7e81c9624fde97dc0	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:03:01.84	0	\N	2026-02-17 02:03:01.841
76437f15-e0b7-40fb-9dad-6cec4d9232d0	40a64a0372f6832ea73f7324b1a8df63a74be99c39104f9ddbc33971bcda348c	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:03:01.84	0	\N	2026-02-17 02:03:01.841
4743df3d-e173-486d-9085-487ce8b157a6	e3d2dcd0bde53fb734f3f025d6979cbe7d1f3276ae7423300d4965da8e1eeb90	invoice	87100df8-f1fb-4592-91ac-cbd6a1205c24	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:30:42.944	0	\N	2026-02-17 02:30:42.945
57910053-1edf-41b0-9a04-4f98f483b41e	09d07d8b001f1189b51f5b3ced66c5b7f1ab5b3e7d70076364395908b5b7083c	contract	c8b3b194-5c30-44ee-bed2-6dca090838ca	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:40:24.738	0	\N	2026-02-17 02:40:24.739
dc3e7d52-22b6-4ee1-b8dc-6a4f1203bddc	6e9b0dce29a03160ec2197fc093316c9a0ee47bf5364aff11e8d2d4faf4276fc	contract	c8b3b194-5c30-44ee-bed2-6dca090838ca	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:43:59.398	0	\N	2026-02-17 02:43:59.399
fb9ae941-e7f1-49ea-91cf-bf1f14964951	9cdc11e5e04ab2cda9e31825337c414dbf5e1344ed0cad71373a20c295216cdc	receipt	c0482929-3f78-4ead-88fb-543d46614379	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:47:50.357	0	\N	2026-02-17 02:47:50.358
4298cd93-0414-467c-8b1e-3812c3db99f6	5e527c7ebb0edc4dbd2048538edd60b26f765fad2644b88783a65e1a3e6d5f00	contract	c8b3b194-5c30-44ee-bed2-6dca090838ca	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:55:47.84	4	2026-02-17 02:57:02.048	2026-02-17 02:55:47.841
81c6686a-2cc2-44b3-84b7-9b9aeb2b318a	2d11505d1c99b4095504f6b6916e0949cc896e300870af7b6f324804b97fc584	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-26 15:11:06.562	0	\N	2026-02-19 15:11:06.564
eeb8c42a-d0c5-47b4-a6ab-13297dc894d9	ce5506a856d17169f9c80f4f00daaf03ea3d703222c578a5165a0f85741ab747	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 01:59:30.194	0	\N	2026-02-17 01:59:30.194
b45cd57d-44dc-4c6b-8c1b-fb98aedbc4db	4e8f4eeb45fb01092a836f44f74a0092ee007965c4a6df54017bae044e4fd046	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:03:01.84	0	\N	2026-02-17 02:03:01.841
10f9c586-8817-4a3a-959f-2d7227d806df	9b51b027822fb20c06b02a8ae622ab9cbe3a15d1c09ac71bdd9063a15a94cf20	contract	c8b3b194-5c30-44ee-bed2-6dca090838ca	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:25:34.803	1	2026-02-17 02:26:05.829	2026-02-17 02:25:34.806
bc15faff-8027-4bfd-b6e9-11e823d176d7	0a10898b41a3e036472519d3948e87583b829e9425344e9c7c6f45958328c6d6	invoice	7089182a-1a52-462d-a500-e812568958f6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:30:42.944	0	\N	2026-02-17 02:30:42.945
2d7c85da-15b5-4b55-bdb5-c759119fe976	21a6243ec39bb73e2b8dcf41f7c42047cddbf20c80553e5a04a8b6d2a0d17b3b	contract	c8b3b194-5c30-44ee-bed2-6dca090838ca	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:46:03.45	0	\N	2026-02-17 02:46:03.451
72171688-f021-4e8f-8bf3-c5c2a11af002	f9f7b1d3bd6cf2d8e3b122fba71e979f8680df0bca37ae01d6b559667883aba0	receipt	365256f2-0de0-4a72-bb04-5d323c518cba	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:47:50.357	0	\N	2026-02-17 02:47:50.358
ef78ad85-6871-4543-a10b-fc70fb3e2ae2	03b60b3197e9f22525ab364f809241cf898fc842a7a277fa8a64d77e82178423	receipt	9d8f87ee-21ff-46e0-b029-1a46e6ca04d6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:47:50.357	0	\N	2026-02-17 02:47:50.358
90b8214b-a713-4dbd-8cd5-541b4090b346	be3a3c09bb9a8704afa68deb22219fb668fe5190deba3bd757a9e733a50059c8	receipt	365256f2-0de0-4a72-bb04-5d323c518cba	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 09:01:42.374	0	\N	2026-02-17 09:01:42.376
5cfe6561-7e8c-4d74-9152-4d6ed339fe7f	f68c26e22a591fbab7b24a66c09ea6c03c6c1ebe0882ab6f588ee93f19e6313b	receipt	c0482929-3f78-4ead-88fb-543d46614379	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 09:01:42.374	0	\N	2026-02-17 09:01:42.376
2a1c7938-5c1f-4d92-a6ec-ebd33377859d	dad0180e043e931f7c77ed5f25168848cff1eb7a0359507c7747fbd0aac95901	receipt	9d8f87ee-21ff-46e0-b029-1a46e6ca04d6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 09:01:42.374	0	\N	2026-02-17 09:01:42.376
87ef214a-65c1-41e6-8515-9abc498dd517	f09dba4adbc14605d94c6f0b4045ca5972786e304cafa189d07ded082e8501e5	receipt	ceeb5432-a07d-47f3-b37d-4b35e9fc79ae	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 09:01:42.374	0	\N	2026-02-17 09:01:42.376
ae75fdec-77de-4202-806e-21a836c339a1	8d52774446645b39f4c959b578f9a4755fa65038b4487e21d39ab0d12d224d43	receipt	347d47f7-e635-441f-83b7-9fa0ee92bfcc	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 09:01:42.374	0	\N	2026-02-17 09:01:42.376
114048e1-57a2-4a25-8ab8-f839a663ef3c	53f382641e093ad66e7205cd3d1e63ab404bf96c959e37a0751d8fc7965d30b6	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 09:01:44.459	0	\N	2026-02-17 09:01:44.46
2900949e-4028-40a7-84ec-4f2bff7b4cf0	aa57dfe0af9b29d822a058eebadd1812292dca6300471b240b0f85bc2b5b2657	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 09:01:44.459	0	\N	2026-02-17 09:01:44.462
813edd2d-0e7e-4cbc-b918-1f96bac89574	1bd03b5232403673144c333fbe2891685759532db040bd8dcad11ccc67df94b1	invoice	7089182a-1a52-462d-a500-e812568958f6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 09:01:44.459	0	\N	2026-02-17 09:01:44.463
8d0feb02-0c9a-4a56-9a13-11e1158ab368	4165c38183dd5b0d42d40b777b80446c1c22b6561b2315f09c38771a02f94d08	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 09:01:44.459	0	\N	2026-02-17 09:01:44.462
d2f4adad-dfae-45bf-a5a5-01c59bfda0e2	b3c5bce66965c8945d578267a627bf96754f0062b2420a9b301181df8e7d77fb	invoice	87100df8-f1fb-4592-91ac-cbd6a1205c24	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 09:01:44.459	0	\N	2026-02-17 09:01:44.464
790d038b-803a-48af-87cf-9109e9cb51c1	8295bea74c2283ab50b9c98a26e194493d76e682730e06c33d7198e884e3a75a	invoice	7089182a-1a52-462d-a500-e812568958f6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-26 15:11:06.562	0	\N	2026-02-19 15:11:06.564
ea31edac-abdf-4d9f-8744-f85ab1a7dd19	ad144c01f7ff5b013cec650ea2a99c6a897d7478120b20e273d21fe6711f8172	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-26 15:11:06.562	0	\N	2026-02-19 15:11:06.564
6f5f5878-62e1-40f7-b1cc-3c0089875af3	4e37c014b94fbd62f44c999579804e4b403ee3bc94179d09185cf80112971c9a	invoice	87100df8-f1fb-4592-91ac-cbd6a1205c24	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 01:59:30.194	0	\N	2026-02-17 01:59:30.195
56a0c34b-4d1a-4aaa-9bf5-a5aa75b40686	47403098acef5e207fa93c5d6793f458639f7167eecb2a6584e8ae68f8db9e26	invoice	87100df8-f1fb-4592-91ac-cbd6a1205c24	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:03:01.841	0	\N	2026-02-17 02:03:01.842
24397ab9-c784-46f0-86ff-26a8fea552bf	56b19d333ad3b7767a69117110a51e06cd5a7cd0171f2fcf5ef786e36bc6acac	invoice	7089182a-1a52-462d-a500-e812568958f6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:26:36.211	1	2026-02-17 02:26:46.847	2026-02-17 02:26:36.212
5bcefb10-4573-4189-b3b8-5c4e6f1d458a	77ea9b06cb4e20e596425187f9c75ea5258f192adc75146e3e95acdb9f8811d1	invoice	dc2fa890-8d7b-472f-ae5d-e5a510b312be	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:30:42.944	0	\N	2026-02-17 02:30:42.945
4ce5269d-4b23-48d2-b8a8-cae11d5d7ca1	3d520d0266ac77875267fa6dd9dfffa1255549ce7df6abb8189905baea6382af	invoice	25b54f9c-9f4b-4c0e-b715-a0beea99493b	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:30:42.943	0	\N	2026-02-17 02:30:42.945
d985b04a-e187-48b2-abdf-66b5dadaa4da	11ca564cab50b0bfcb6d5442d1b68d03d7715020b6406e8e546b2112f0d5019f	contract	c8b3b194-5c30-44ee-bed2-6dca090838ca	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:30:47.279	0	\N	2026-02-17 02:30:47.28
4a2de5a1-b2a1-405e-9cbd-9c147c7f69fe	1156c8c34d6904afefd44c2ea357be2ce4414a78d991c887ce30c06c0ae774bb	receipt	347d47f7-e635-441f-83b7-9fa0ee92bfcc	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:47:50.357	0	\N	2026-02-17 02:47:50.358
b0656090-34ca-412a-a64f-b0f09fee9991	9482a50f734f62b68029c7f5f55a0126074825bc6f4a163947e668ddb814e2e5	invoice	7089182a-1a52-462d-a500-e812568958f6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:51:15.358	1	2026-02-17 02:51:53.82	2026-02-17 02:51:15.359
50268b36-7662-4e97-a5a0-25b1616b98c3	deeedd7b37c458e87f1d910212b12e3652ec3e247f191ccfe436f6c95d67314a	invoice	87100df8-f1fb-4592-91ac-cbd6a1205c24	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-26 15:11:06.562	0	\N	2026-02-19 15:11:06.564
e205931a-fd34-4d78-ae27-96c5ed8e5b5a	ff51f96e2ba0340b94801eadcdfee6b1b55af6089894d11a04976d8f23dc8dd0	invoice	7089182a-1a52-462d-a500-e812568958f6	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:03:01.84	0	\N	2026-02-17 02:03:01.842
895010b1-1442-46c8-988c-e9cd89ea339a	c45efe7f6dd9de9a57a1fa832fc35d7998a5890d9597cbfa8c247567a43fc123	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:30:42.944	0	\N	2026-02-17 02:30:42.945
0b62d22a-1e03-40bc-bddf-d5f34896f3af	fd5d8539b530d1225c653d691275d3956fdb0744be7981c62cd7a64c67c56ad0	contract	c8b3b194-5c30-44ee-bed2-6dca090838ca	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:35:40.38	0	\N	2026-02-17 02:35:40.381
0ee15964-06a1-4180-9393-195e85881965	ff4a027329c9d2bbb57659a12898f8a524f6330025cfc626e40bf0f86b6beda3	receipt	ceeb5432-a07d-47f3-b37d-4b35e9fc79ae	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:47:50.357	0	\N	2026-02-17 02:47:50.358
fc0b75de-7b18-404e-8a5b-594d5c7528a0	4f3558a09cae7572bd51415d43ccdbc773006d5d4dfab1179008859d33afb984	contract	c8b3b194-5c30-44ee-bed2-6dca090838ca	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-24 02:54:58.962	2	2026-02-17 02:55:13.3	2026-02-17 02:54:58.963
eac681ba-9d04-42fc-9183-daa841ae3eda	836414612e7a87f3c9424db2c5867397432a2da792c36ccccef40966355c97e0	invoice	37054796-6edb-4031-8086-481ba3a3d0d7	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	2026-02-26 15:11:06.562	0	\N	2026-02-19 15:11:06.564
\.


--
-- Data for Name: document_access_logs; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.document_access_logs (id, token, success, reason, accessed_at) FROM stdin;
307ea94d-8ec9-453a-b15f-f473e8557faa	470f535d6fea30ce9396163bb13746770470176e38bf0de331343551eacf5f45	f	Invalid password	2026-02-16 14:22:49.321
8eb099cb-43e3-4e90-827c-1406146b3cc9	470f535d6fea30ce9396163bb13746770470176e38bf0de331343551eacf5f45	f	Invalid password	2026-02-16 14:23:50.864
158daf7e-52c4-4dd5-9f6a-b94a56eb67a0	470f535d6fea30ce9396163bb13746770470176e38bf0de331343551eacf5f45	f	Invalid password	2026-02-16 14:24:04.767
bb2bdb82-241e-42fb-a686-f85ff966b74d	76f5a80e7e9903c6b51427e5bc4e31ea22e7c7105f19f8036f0fa157e9064799	f	Invalid password	2026-02-16 14:24:27.267
07059b4b-e4d4-45c7-a2b2-684474364f69	76f5a80e7e9903c6b51427e5bc4e31ea22e7c7105f19f8036f0fa157e9064799	f	Invalid password	2026-02-16 14:24:37.574
9beb16d0-4430-445d-b6fc-275284ccb596	e3c99c9ac62b648118d9a8e19ab07b13ef6e9d24c314c2e9c8e2aef19327981f	f	Invalid password	2026-02-16 14:25:46.72
f28dd5af-d16f-4bdb-8d2d-788e38c33401	e3c99c9ac62b648118d9a8e19ab07b13ef6e9d24c314c2e9c8e2aef19327981f	f	Invalid password	2026-02-16 14:25:57.312
8ac9ff08-bed5-4597-9b44-bdc0290d92be	f6c156e169f6a56f99791e393669bd1179fb74eebaa631386898bcb7b0f52702	f	Invalid password	2026-02-16 14:26:49.341
e991a6e0-817f-41be-8fad-ae436cf2980c	570894c05058b8080376b85a540f57612ad13d1178e24703cafb8e47cb8bc0bd	f	Invalid password	2026-02-16 14:27:09.285
5c01f132-3260-4c54-ba8a-98a8de2ecfd5	e3c99c9ac62b648118d9a8e19ab07b13ef6e9d24c314c2e9c8e2aef19327981f	f	Invalid password	2026-02-16 14:28:39.267
5e69b5a4-b2cf-432e-8204-2cbc6c04b163	e3c99c9ac62b648118d9a8e19ab07b13ef6e9d24c314c2e9c8e2aef19327981f	t	\N	2026-02-16 14:30:13.832
ca8b8d8e-eb68-4373-b888-2ff911f964f4	e3c99c9ac62b648118d9a8e19ab07b13ef6e9d24c314c2e9c8e2aef19327981f	f	Invalid password	2026-02-16 14:33:26.049
f5c066e2-75d2-41d8-a8d7-9998aeab7bd7	e3c99c9ac62b648118d9a8e19ab07b13ef6e9d24c314c2e9c8e2aef19327981f	f	Invalid password	2026-02-16 14:33:36.805
aabd1abd-ccaa-43f5-ad8d-434be1d0c0b7	e3c99c9ac62b648118d9a8e19ab07b13ef6e9d24c314c2e9c8e2aef19327981f	t	\N	2026-02-16 14:33:48.421
45cc689e-5cb3-45b5-9f30-2c2db57da424	459672e5231f77fcb1a08c8b1018cfdbc5440c9c4eac301587b461a699b3614a	t	\N	2026-02-16 14:35:05.834
5b51445a-c7e9-4946-9c35-7ad0fa93066f	459672e5231f77fcb1a08c8b1018cfdbc5440c9c4eac301587b461a699b3614a	t	\N	2026-02-16 14:35:19.752
361f521c-9ec2-4825-b1a4-4f834fa125de	459672e5231f77fcb1a08c8b1018cfdbc5440c9c4eac301587b461a699b3614a	t	\N	2026-02-16 14:36:22.921
0a66362c-a7e7-4096-80d7-3c87444cdb57	fd4b1f83475c5ae9a404af6d139f890af361fa0a246d39d3dd5ee310292b7d9e	t	\N	2026-02-16 14:36:36.408
a1f47899-07e8-49ad-98e7-b37e065f38e6	2100289a1dfcbaf83a337c6a5b5193aa8fb79950bf59717de752ad1fb567fdc3	t	\N	2026-02-16 14:36:51.329
86bba326-9e45-4cc3-9188-96d1aab2d1d1	8dd21d014b34a4cf309c5d52871826936fdbbaca2bda8e378715a8b8f73f6e7c	t	\N	2026-02-16 14:37:18.156
f0c515aa-899a-4b09-bc60-c487099ef31a	8dd21d014b34a4cf309c5d52871826936fdbbaca2bda8e378715a8b8f73f6e7c	t	\N	2026-02-16 14:38:10.714
9392e795-e263-461a-9621-dea928b859fb	8dd21d014b34a4cf309c5d52871826936fdbbaca2bda8e378715a8b8f73f6e7c	t	\N	2026-02-16 14:38:56.845
34b10261-1543-4b6b-b613-d77f381df541	8dd21d014b34a4cf309c5d52871826936fdbbaca2bda8e378715a8b8f73f6e7c	t	\N	2026-02-16 14:39:29.968
68d0b32d-3534-4e17-8d8d-247ce6f633af	8dd21d014b34a4cf309c5d52871826936fdbbaca2bda8e378715a8b8f73f6e7c	t	\N	2026-02-16 14:41:14.778
625dd5f9-9fab-45c3-a5e7-e2b3fca9e57f	8dd21d014b34a4cf309c5d52871826936fdbbaca2bda8e378715a8b8f73f6e7c	t	\N	2026-02-16 14:41:17.867
65fff1f4-88a7-4423-bded-7e8f8043b487	8dd21d014b34a4cf309c5d52871826936fdbbaca2bda8e378715a8b8f73f6e7c	t	\N	2026-02-16 14:41:26.038
9808a5f1-e55b-487a-98b5-9ea4ec17d13c	681ec695cd69ef98989b1379178f37a32ee23a3ce5ab2d280cce4333efe1ed62	t	\N	2026-02-16 14:42:53.528
2afd053f-46ec-4932-97c9-efa8bb1c7ed6	4b6af51c83e4860a5b4bacc14a7c746ea931f59d3b568d4fd3031179635dd506	t	\N	2026-02-16 14:43:07.86
f34cce98-ce23-475e-bc53-dc2146c7243b	4b6af51c83e4860a5b4bacc14a7c746ea931f59d3b568d4fd3031179635dd506	t	\N	2026-02-16 14:43:34.399
ea768e27-a55a-436c-b28d-b25ccf4bca92	4b6af51c83e4860a5b4bacc14a7c746ea931f59d3b568d4fd3031179635dd506	t	\N	2026-02-16 14:44:38.58
e9cd765d-e9eb-4d85-8e7f-0ede34977e63	4b6af51c83e4860a5b4bacc14a7c746ea931f59d3b568d4fd3031179635dd506	t	\N	2026-02-16 14:44:45.26
2a8cc27f-af72-4406-9484-7df52a73e013	5e64b5ba675c790ba09f9ab592c9409d23985fa42f0c09d424de55e07508e965	t	\N	2026-02-16 14:45:37.792
4fda26a9-26c9-47b9-9526-e26736e2d3d4	50b2a48b76185ab15c57a69cb348b052f989ef0b4057604cee423979fc6d55c6	t	\N	2026-02-16 14:47:37.003
d2b5140a-f610-457b-b954-969518868f1b	3e5051d715ee0227a29dc193462c704aab4c2b56b6f5850351ef8786f599574e	t	\N	2026-02-16 14:48:50.37
7b19f0c2-9fab-4628-aecd-e0b80036da6c	dbe60e5a4508dfb0e4099d4eae08e456271a7b4d28dfeca919f9ddff775f7f1a	t	\N	2026-02-16 14:50:28.504
4c73e378-0cfb-4c66-bd6a-a282ec1df566	dbe60e5a4508dfb0e4099d4eae08e456271a7b4d28dfeca919f9ddff775f7f1a	t	\N	2026-02-16 14:52:53.867
301c0a3d-8c50-40bb-9b9d-fb4c6ad8ea36	78c30f89b3052d6770c799f6b04c98236fc025524f553ae14ba632a51d757b7b	t	\N	2026-02-16 14:53:06.987
e5e769e8-fb4b-4df1-bfaf-5170aac562f9	3317c666ae7d12fa01716558c0ad0ac355b9d24c4d35fd4cf0c45fe222428cd4	t	\N	2026-02-16 14:54:32.801
fc8356a5-61e0-4e1e-8c53-0918f7a52c25	a9ae9554c9e1a21c8deba1afea3fbc4d4a7e3ff5aebcad292ac11a5ddbc23f63	t	\N	2026-02-16 15:31:03.595
df36eeca-ee31-4f6c-a053-19b9acb6ebd2	0b91bd3120aa22f34b8a2a1e0f661a2cc958fc399d2356fda673f3c3eb1a36e3	f	Invalid password	2026-02-16 15:33:18.015
77a41957-cac9-43ed-b885-8230e64ab8c2	0b91bd3120aa22f34b8a2a1e0f661a2cc958fc399d2356fda673f3c3eb1a36e3	t	\N	2026-02-16 15:33:24.107
7928bf17-cbd9-40fa-98eb-716f88b3eb23	88f6c1ea3821760626aded1bb1ef45aba86962cf235c219fdfc564f41a7198ef	t	\N	2026-02-16 15:33:49.735
eeab3277-2b73-47ad-9524-2a0a9a863935	a6f39e35d364cb0245e711a99bac7144470ca94e4b47be4bbd0774f59a75d772	t	\N	2026-02-16 15:34:19.327
42adcf23-ed1c-402a-846b-137915e5a65d	523502edd554f63a9fbd08ab925a5d5ba7481860bd39198978ef263559341878	t	\N	2026-02-16 15:36:43.575
f27511fd-a2a4-4e75-b252-7a367e9e7b8a	18fd09e11cdf6aa47dd425bae135d3e0412fc8504b98ca747e155848e77ecd86	t	\N	2026-02-16 15:37:12.276
c35ad3e4-86ad-4628-a191-caf82f404ad6	cb525b363109a01fe5801cae90f3af792d2f4e24c69c3d4ca01485f5a7a6ed74	t	\N	2026-02-16 15:39:53.828
cc5988f5-3480-418f-94db-06f604dab37f	a89afb39b975c45793a62b6e51854f0aca658e9aa29b7c29fbe601b62209e9d5	t	\N	2026-02-16 15:40:41.42
33ad7995-dbd0-45b8-8299-ccadf73d70fb	7dd09828da4b07545ad58a3ee3326ab45b720392169758c431bb6ef96c22de76	t	\N	2026-02-16 15:40:44.211
ef58bca8-f7bd-44eb-ba20-9d6dcc144a72	7dd09828da4b07545ad58a3ee3326ab45b720392169758c431bb6ef96c22de76	t	\N	2026-02-16 15:40:55.513
97cd9b79-735c-4361-a8db-45b5bb3c30e9	069be3c53a5ce0244d2c6a0fa4b122f4587326b34cdb265af2a38d135f62ca12	t	\N	2026-02-16 15:41:08.624
62fe96d0-5770-4c50-b499-bf28d82e1003	78caaf5665fc5bfff728d5c7291d8adf2db8eedbbcd3a3244d51c5523fd727f9	t	\N	2026-02-16 15:41:57.829
533904d8-9b0c-4b6f-b006-9c098a228ca6	37736700ac0aba660d61653e91e52c7e181f6878185d5aafe307cd3b609031ac	t	\N	2026-02-16 15:42:04.368
37ce3440-7e59-420b-9e3f-d5579fb89bf0	34ce6fbdcddf8dac03860d2a8feb981065bb9b16309d45b1d45a904c4b0eb479	t	\N	2026-02-16 15:42:22.386
655c7544-e7f7-46d9-8dcc-17d83a483f21	d4dbfa9d48d5a035a637dfee962409c0420ede222c92b50da66cc26899c88fd0	t	\N	2026-02-16 15:42:36.172
9ab66182-25d2-4781-8c7b-a081ca96950f	8cf2e22e4e0d6edeebbc398b07e34fd3c6c06e0bec38a9b2bf3d70bf9da165e6	t	\N	2026-02-16 16:45:17.483
01c2afa2-8094-4291-8d47-5ea5234de2c3	51077dc023a31272e8ecf83d8df484e3ea5ca4f7168a2bce76b7520dc9075077	t	\N	2026-02-16 16:52:14.203
a02977e3-0241-4533-a2e7-dce40e19ee17	ff676cc947aa8fc8a233ee6a9e6422e4be5c31473900edffec3d0b9b409a0c5f	t	\N	2026-02-16 16:52:43.563
84f840d1-a8bb-4614-8b5c-2d6b00a4b977	e8655be4342f404a3c87739b6ec9d0676a23efde11d5bf01b176e5bcc2194a70	t	\N	2026-02-16 16:54:22.443
68734467-14bf-4fd4-98f0-fec8522c2c87	885108262c89df686fe8429f0a3eea58916c8bdb68a138255626c1e464a4543f	t	\N	2026-02-16 16:57:13.696
365dbed2-a796-4837-846d-8ac591bf4cdb	2bf10f4c209199d0c03a19aeb853102c0f9fd4093e0922a08b15a69b5b62ab8e	t	\N	2026-02-16 16:57:27.5
fe41a81c-5867-4717-8ca9-c1d9d7ce0ba7	8bf3eee63e26186c36b779bc2d992bb5aefab791a4c59b2985a4c6b69cf7548e	t	\N	2026-02-16 17:29:29.361
d696b05f-6957-480a-a985-ef1f41b314d9	ef005db08a596808e97786b17ddeb37d9d5a27c57a8bd9fbd227cd32107dc5a4	t	\N	2026-02-16 17:30:01.892
2b972937-1d64-4598-952a-d31dc737a84a	4a6321749b1b6251db59502bf3361484cefb716c90170ea4ec1b1eb20e3a019c	t	\N	2026-02-16 17:39:50.811
dcac1f20-d902-4933-8b5d-be9f16ce9a11	d75f0fadb3d415a807da0ebcb0342fe2f6e8841ad5ecb3e0ebd8f5abfb962482	t	\N	2026-02-16 17:40:17.576
8e5cd9e0-a16d-4f4b-b113-59ea04949c47	e9ce80d12c3e4e02f90db536c84d0abd78dd7b862e7c2e38129c914ae66a5abc	t	\N	2026-02-16 17:41:35.877
7fc9d12d-b45a-481f-a5a8-9ff6479b8263	e9ce80d12c3e4e02f90db536c84d0abd78dd7b862e7c2e38129c914ae66a5abc	t	\N	2026-02-16 17:42:24.896
f4728d9c-e2a8-4528-b44f-adc086e45f60	264560210e46b66f83ea67b6387d5076c89bc07d21360ac66180401ffad589cb	t	\N	2026-02-16 17:42:53.233
5db5e3c5-9530-4525-ab53-6f36cbc5fd14	a180ded906d9e9b4a39138e11856103527b178714a410e0684fe3ee6d0392664	t	\N	2026-02-16 17:46:44.101
ec0894d0-47fd-468a-8523-cb3b88dca7e3	dcda79288a0a8e06cf7c50e176481dc614e63a7e4b74fc5b0e8364208d8d9208	t	\N	2026-02-16 17:48:01.414
f261a0da-6ab0-45c4-9bce-e0747bdf0989	6b2b65b80a78b663962b52160b93e39612c67ba3c67e81506d0102bd7a422708	f	Invalid password	2026-02-16 17:49:25.727
515b005c-5fbc-4b5e-af21-69674ce00e2e	6b2b65b80a78b663962b52160b93e39612c67ba3c67e81506d0102bd7a422708	t	\N	2026-02-16 17:49:30.614
4a0abc84-20b5-44fe-8b19-6be977b8e2b0	9b51b027822fb20c06b02a8ae622ab9cbe3a15d1c09ac71bdd9063a15a94cf20	t	\N	2026-02-17 02:26:05.822
35247d81-c6d2-4f54-afc8-447737617912	56b19d333ad3b7767a69117110a51e06cd5a7cd0171f2fcf5ef786e36bc6acac	t	\N	2026-02-17 02:26:46.845
acda2d98-9399-4433-ad6d-e82caf15a836	9482a50f734f62b68029c7f5f55a0126074825bc6f4a163947e668ddb814e2e5	t	\N	2026-02-17 02:51:53.815
85250002-2f31-4dcd-8ab0-2edf30ad7b8d	4f3558a09cae7572bd51415d43ccdbc773006d5d4dfab1179008859d33afb984	t	\N	2026-02-17 02:55:12.748
ac44bcfa-3166-4ce5-a2c6-02ef3ae297bc	4f3558a09cae7572bd51415d43ccdbc773006d5d4dfab1179008859d33afb984	t	\N	2026-02-17 02:55:13.299
12c29731-aff5-4b4b-904a-a3980e1b9ce0	5e527c7ebb0edc4dbd2048538edd60b26f765fad2644b88783a65e1a3e6d5f00	t	\N	2026-02-17 02:55:57.237
45d2661d-5725-40c7-9c46-c0215940ae4b	5e527c7ebb0edc4dbd2048538edd60b26f765fad2644b88783a65e1a3e6d5f00	t	\N	2026-02-17 02:55:57.845
6378e248-3ac2-412b-be28-1766946635ba	5e527c7ebb0edc4dbd2048538edd60b26f765fad2644b88783a65e1a3e6d5f00	t	\N	2026-02-17 02:57:01.548
47a6f6d0-b7de-4516-b682-ba7bb3865b7c	5e527c7ebb0edc4dbd2048538edd60b26f765fad2644b88783a65e1a3e6d5f00	t	\N	2026-02-17 02:57:02.047
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.expenses (id, branch_id, created_by, category, amount, description, receipt_path, status, approved_by, approved_at, rejected_by, rejected_at, rejected_reason, reimbursed, reimbursed_at, reimbursed_by, expense_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interest_rate_tiers; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.interest_rate_tiers (id, loan_product_id, tier_name, min_amount, max_amount, interest_rate, grace_period_days, effective_from, effective_until, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoice_access_logs; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.invoice_access_logs (id, resource_id, customer_id, success, attempted_at, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: payment_schedules; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.payment_schedules (id, loan_id, payment_number, payment_date, principal_amount, interest_amount, total_payment, remaining_balance, version, status, paid_at, statement_number, days_overdue, penalty_amount, compound_interest_amount, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.invoices (id, payment_schedule_id, loan_id, customer_id, invoice_number, invoice_date, due_date, invoice_data, status, sent_at, sent_via, viewed_at, generated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: loan_approval_workflow; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.loan_approval_workflow (id, loan_id, approval_level, approver_id, approval_status, approved_amount, approval_notes, sla_deadline, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: loan_disbursements; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.loan_disbursements (id, loan_id, disbursement_no, amount, purpose, requested_date, status, approved_by, approved_at, rejected_by, rejected_at, rejected_reason, disbursed_by, disbursed_at, disbursement_method, reference_no, next_disbursement_date, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: loan_interest_history; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.loan_interest_history (id, loan_id, payment_number, outstanding_balance, applied_rate, tier_name, grace_period_days, interest_amount, calculated_at, effective_date) FROM stdin;
\.


--
-- Data for Name: next_payment_invoices; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.next_payment_invoices (id, invoice_number, loan_id, customer_id, payment_schedule_id, invoice_data, status, generated_by, sent_at, sent_via, sent_by, paid_at, paid_amount, payment_method, receipt_number, valid_until, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_actions; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.notification_actions (id, notification_type, action_id, label, link, required_roles, required_permissions, requires_confirmation, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_audience_rules; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.notification_audience_rules (id, notification_type, allowed_roles, allowed_branches, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.notifications (id, user_id, type, title, message, link, metadata, read, read_at, priority, event_id, dedup_key, archived, archived_at, audience_roles, action_id, action_label, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.payments (id, loan_id, payment_schedule_id, amount, payment_date, payment_method, payment_type, interest_saved, penalty_amount, notes, reference, idempotency_key, version, processed_at, payment_gateway, gateway_reference, gateway_response, bank_name, account_number, verified, verified_by, verified_at, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: payment_receipts; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.payment_receipts (id, receipt_number, payment_id, loan_id, customer_id, invoice_id, amount, payment_date, payment_method, receipt_data, status, issued_by, issued_at, sent_at, sent_via, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_timeline_events; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.payment_timeline_events (id, loan_id, payment_schedule_id, event_type, scheduled_date, executed_at, status, metadata, error_message, retry_count, max_retries, next_retry_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: penalty_rules; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.penalty_rules (id, loan_product_id, rule_name, days_overdue_from, days_overdue_to, penalty_type, penalty_rate, penalty_amount, compound_interest, compound_rate, is_default, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: principal_prepayments; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.principal_prepayments (id, loan_id, payment_schedule_id, amount, prepayment_date, interest_saved, new_monthly_payment, new_maturity_date, penalty_amount, processed_by, processed_at, created_at) FROM stdin;
\.


--
-- Data for Name: privacy_consents; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.privacy_consents (id, customer_id, consent_type, consent_version, consent_text, given, given_at, withdrawn, withdrawn_at, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: product_configs; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.product_configs (id, product_code, product_name, description, config, status, active_from, active_until, version, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: promptpay_qr_codes; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.promptpay_qr_codes (id, loan_id, payment_ref, amount_expected, qr_code_data, expires_at, status, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: registration_tokens; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.registration_tokens (id, line_user_id, token, user_id, expires_at, used, created_at) FROM stdin;
02dadcaf-db59-4666-8623-b909b344b518	663ed212-d894-4680-864e-23fbb0a0861a	03D264A0	\N	2026-02-16 07:09:36.879	f	2026-02-16 07:07:36.881
7da065ce-88b4-4486-8437-12e60464239d	663ed212-d894-4680-864e-23fbb0a0861a	D872CC2F	\N	2026-02-16 07:16:36.233	f	2026-02-16 07:14:36.235
a10528c2-5f2c-40bd-9a12-2e42f220e033	663ed212-d894-4680-864e-23fbb0a0861a	36C52F43	\N	2026-02-16 07:16:59.229	f	2026-02-16 07:14:59.23
03efe89e-f933-4f5d-97e9-f00e5c234a3a	663ed212-d894-4680-864e-23fbb0a0861a	A789E81F	\N	2026-02-16 07:17:00.5	f	2026-02-16 07:15:00.501
4abf692e-5d03-4557-870f-82b18e8e7fb6	663ed212-d894-4680-864e-23fbb0a0861a	994B913D	\N	2026-02-16 07:17:25.462	f	2026-02-16 07:15:25.463
62465e87-7f8f-4686-b9b1-41b861da6797	663ed212-d894-4680-864e-23fbb0a0861a	4003CDB8	\N	2026-02-16 07:17:29.08	f	2026-02-16 07:15:29.081
ff5ffe76-efd4-4377-b220-5a579ecc0fcb	663ed212-d894-4680-864e-23fbb0a0861a	2A07B070	\N	2026-02-16 07:17:30.98	f	2026-02-16 07:15:30.981
50deff81-c7a5-41c1-94a5-bc86aa913a07	663ed212-d894-4680-864e-23fbb0a0861a	0E829C3F	\N	2026-02-16 07:31:52.815	f	2026-02-16 07:21:52.817
a7a87e72-4805-47d9-a5ce-dc70d3e26e8d	663ed212-d894-4680-864e-23fbb0a0861a	CFDB0332	\N	2026-02-16 07:46:11.558	t	2026-02-16 07:36:11.559
f97c6b9a-9467-477b-bf15-4d1c14a6ef87	663ed212-d894-4680-864e-23fbb0a0861a	FD594261	\N	2026-02-16 08:04:54.362	t	2026-02-16 07:54:54.364
182560a9-1bd6-48f2-ac77-49364b6c1787	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	876B1460	\N	2026-02-16 14:11:45.074	t	2026-02-16 14:01:45.075
5c21fc17-1788-4f69-b0af-9bcbc1488d2f	2fea0e8a-0e07-4e34-8da7-e349b7ec7c93	332EE7FF	\N	2026-02-16 14:12:52.971	t	2026-02-16 14:02:52.972
\.


--
-- Data for Name: security_alerts; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.security_alerts (id, type, severity, title, description, ip_address, user_id, endpoint, status, resolved_at, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.security_events (id, user_id, ip_address, user_agent, endpoint, method, threat_type, severity, description, payload, blocked, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.sessions (id, user_id, token, refresh_token, previous_token, previous_token_expires_at, previous_refresh_token, ip_address, user_agent, is_valid, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.transactions (id, user_id, loan_id, type, amount, currency, status, from_account, to_account, reference, description, metadata, processed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: suspicious_transaction_reports; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.suspicious_transaction_reports (id, report_number, customer_id, transaction_id, suspicion_type, suspicion_details, reported_by, reported_at, review_status, submitted_to, submitted_at, amlo_reference, created_at) FROM stdin;
\.


--
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.system_configs (id, key, value, category, description, updated_by, created_at, updated_at) FROM stdin;
9263c8d5-892f-4a96-b584-539a5fa9b8ec	notifications.line_enabled	true	notifications	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.722	2026-02-20 16:28:20.722
fba9e09d-8a88-4e1d-b5a3-9ebba1099291	notifications.reminder_days	3	notifications	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.724	2026-02-20 16:28:20.724
5157c78e-7fd1-4301-928d-040f15939a12	notifications.daily_report	true	notifications	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.725	2026-02-20 16:28:20.725
9e043e40-cf72-46b2-afad-891a25ae8b9f	notifications.npl_alert	true	notifications	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.726	2026-02-20 16:28:20.726
762f15ac-2545-471d-a893-c6e8f850ada1	security.session_timeout	24	security	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.727	2026-02-20 16:28:20.727
f74f81d5-706d-4d26-8219-ca4c2322cbf8	company.name	บริษัท สินเชื่อไทย จำกัด	company	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.714	2026-02-20 16:28:20.714
da2f9052-a09f-4308-95cd-b56f38055ef4	company.email	contact@thailoan.co.th	company	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.717	2026-02-20 16:28:20.717
ca074b5a-5bd3-4715-ac04-dd8112aa7f9a	company.phone	02-123-4567	company	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.718	2026-02-20 16:28:20.718
54fead85-cf46-48fe-8317-cfb8df968191	system.language	th	system	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.72	2026-02-20 16:28:20.72
9706e667-4731-4463-a952-ab23972effab	notifications.email_enabled	true	notifications	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.721	2026-02-20 16:28:20.721
6a74166e-42e3-40b4-8b6c-5eb981da2407	security.password_expiry	90	security	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.729	2026-02-20 16:28:20.729
575ecc46-a5b4-47c9-9b04-e152b0db0846	security.two_factor	false	security	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.731	2026-02-20 16:28:20.731
716e17c3-2259-48d2-a43b-071ae2ef9987	security.login_attempts	5	security	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.732	2026-02-20 16:28:20.732
35ad6c29-de60-498e-bd6f-67425049c588	interest_rate.mlr	6.875	interest_rate	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.733	2026-02-20 16:28:20.733
ef8d7db6-c8a2-4e7b-bd7a-2f28ff5935ac	interest_rate.mrr	7.125	interest_rate	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.734	2026-02-20 16:28:20.734
92a776e2-d616-4895-a2cd-bcea361d6717	interest_rate.last_updated	2026-02-20T16:28:20.713Z	interest_rate	\N	a3ff99a4-2079-4804-9bdc-021200dd7f11	2026-02-20 16:28:20.735	2026-02-20 16:28:20.735
\.


--
-- Data for Name: task_assignments; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.task_assignments (id, task_id, task_type, assigned_to, assigned_by, priority, due_date, completion_date, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: thai_banks; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.thai_banks (id, bank_code, bank_name, bank_name_th, bank_name_en, logo_url, color_code, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: year_interest_tiers; Type: TABLE DATA; Schema: public; Owner: medlab
--

COPY public.year_interest_tiers (id, loan_product_id, tier_type, start_year, end_year, rate, formula, min_rate, max_rate, created_at, updated_at) FROM stdin;
cbe0612d-c0b1-4186-ac19-4c9b28c055c5	94618a6a-b64e-4428-a4a5-9f98ed1d99de	FIXED	1	3	0.0399	\N	\N	\N	2026-02-16 06:12:09.748	2026-02-16 06:12:09.748
d96bf624-dc1e-4fe4-bed1-6be73de8659c	94618a6a-b64e-4428-a4a5-9f98ed1d99de	FIXED	4	5	0.0499	\N	\N	\N	2026-02-16 06:12:09.748	2026-02-16 06:12:09.748
ce474a56-9584-4d28-8597-892a4992473b	94618a6a-b64e-4428-a4a5-9f98ed1d99de	VARIABLE	6	END	\N	MRR + 1.0%	0.0500	0.0800	2026-02-16 06:12:09.748	2026-02-16 06:12:09.748
231af798-bc02-45f0-be30-966fa79f754e	767c82f5-ab62-477b-93b1-c9733c3c7043	FIXED	1	2	0.0450	\N	\N	\N	2026-02-16 06:12:09.754	2026-02-16 06:12:09.754
602f604f-da7a-4abd-bbb5-8fb83f63096c	767c82f5-ab62-477b-93b1-c9733c3c7043	FIXED	3	5	0.0550	\N	\N	\N	2026-02-16 06:12:09.754	2026-02-16 06:12:09.754
32f05170-1c5b-4871-9b4a-1e2f06f0b60f	767c82f5-ab62-477b-93b1-c9733c3c7043	VARIABLE	6	10	\N	MLR + 1.5%	0.0600	0.0900	2026-02-16 06:12:09.754	2026-02-16 06:12:09.754
983dc6c4-67e8-450c-946d-2e146f3a4692	767c82f5-ab62-477b-93b1-c9733c3c7043	VARIABLE	11	END	\N	MLR + 2.0%	0.0650	0.1000	2026-02-16 06:12:09.754	2026-02-16 06:12:09.754
bdcfd170-5905-4dd7-9fc4-68091c412f4a	578cbf2a-e1c8-410e-8188-15a01a36dbd2	FIXED	1	2	0.0299	\N	\N	\N	2026-02-16 06:12:09.758	2026-02-16 06:12:09.758
724de5ff-5a24-4731-8899-b0d96b81145d	578cbf2a-e1c8-410e-8188-15a01a36dbd2	FIXED	3	3	0.0399	\N	\N	\N	2026-02-16 06:12:09.758	2026-02-16 06:12:09.758
df8b7b0b-7cf5-43a5-887f-186d82a0c7c5	578cbf2a-e1c8-410e-8188-15a01a36dbd2	FIXED	4	END	0.0599	\N	\N	\N	2026-02-16 06:12:09.758	2026-02-16 06:12:09.758
97fb108d-c4e9-4124-ba47-e67384744a68	40e89207-ee73-4b4a-b2dd-c8939934e954	FIXED	1	5	0.0350	\N	\N	\N	2026-02-16 06:12:09.762	2026-02-16 06:12:09.762
b329207e-131d-479b-9ee3-e869d26a088a	40e89207-ee73-4b4a-b2dd-c8939934e954	VARIABLE	6	15	\N	MLR + 0.5%	0.0400	0.0700	2026-02-16 06:12:09.762	2026-02-16 06:12:09.762
62ed44b7-2080-413d-bdf1-68bf3245f930	40e89207-ee73-4b4a-b2dd-c8939934e954	VARIABLE	16	END	\N	MLR + 1.0%	0.0450	0.0800	2026-02-16 06:12:09.762	2026-02-16 06:12:09.762
b68bbb43-b759-43ea-aa90-7bcb7f404233	66ef3eeb-3e98-445d-a833-d7d1074e6289	FIXED	1	3	0.0350	\N	\N	\N	2026-02-16 06:12:09.766	2026-02-16 06:12:09.766
42a60d34-c513-4618-bd09-70821c65abc9	66ef3eeb-3e98-445d-a833-d7d1074e6289	FIXED	4	5	0.0450	\N	\N	\N	2026-02-16 06:12:09.766	2026-02-16 06:12:09.766
08375d53-7146-45f3-aa5b-4c9cbc5187ce	66ef3eeb-3e98-445d-a833-d7d1074e6289	VARIABLE	6	END	\N	MLR + 1.0%	0.0500	0.0750	2026-02-16 06:12:09.766	2026-02-16 06:12:09.766
eab55902-cfb3-4c98-9a6e-ef8d7b9d3b31	6ec29a90-ebf7-4281-9795-b908d2605e23	FIXED	1	2	0.0599	\N	\N	\N	2026-02-16 06:12:09.776	2026-02-16 06:12:09.776
59b6d43f-073d-4632-95c7-7dda82efc9ed	6ec29a90-ebf7-4281-9795-b908d2605e23	FIXED	3	4	0.0699	\N	\N	\N	2026-02-16 06:12:09.776	2026-02-16 06:12:09.776
28935420-d258-4d12-8d14-a7a37e49f619	6ec29a90-ebf7-4281-9795-b908d2605e23	VARIABLE	5	END	\N	MRR + 1.5%	0.0700	0.0900	2026-02-16 06:12:09.776	2026-02-16 06:12:09.776
\.


--
-- PostgreSQL database dump complete
--

\unrestrict 0WwWjHkZc0DOCcqHdodcaeOotwPcbYuv1b8zC3cj31M0tOr8Tshgy5dXhIaofsK

