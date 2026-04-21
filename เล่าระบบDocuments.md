# ระบบเอกสาร + Document Parser แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์สถาปัตยกรรมระบบจัดการเอกสารและการใช้ Deterministic Parser ในการอ่านเอกสารสำหรับทีมพัฒนาและ Tech Leaders

---

## 1. ภาพรวมสถาปัตยกรรม

### Stack Technology
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Storage** | Local Filesystem | File storage |
| **Parser** | SheetJS/xlsx + Rule-based | Frontend deterministic parser |
| **Backend** | Fastify + Prisma | Document CRUD |

### Flow
```
User → Frontend → Parser → Review UI → Backend → Database + File Storage
```

---

## 2. โครงสร้างโปรเจค

### Backend
```
documents/
├── document.controller.ts    # Upload, download, delete
├── document.service.ts       # File handling
├── document.repository.ts    # Database
└── document.model.ts         # Zod schemas
```

### Frontend
```
documents/
├── pages/Documents.tsx
├── components/
│   ├── DocumentUpload.tsx
│   ├── DocumentReviewModal.tsx (15 sections)
│   └── sections/*.tsx
└── utils/parsers/
    └── excel-parser.ts
```

---

## 3. Database Schema

### Document Table
```prisma
model Document {
  id              String   @id @default(uuid())
  fileName        String
  filePath        String
  fileHash        String   // SHA-256
  fileSize        Int
  mimeType        String
  
  documentType    DocumentType
  deterministicParserProcessed     Boolean  @default(false)  
  deterministicParserStatus        String   // pending, completed, failed
  extractedData   Json?
  confidenceScore Float?
  
  customerId      String?
  uploadedBy      String
  branchId        String?
  
  customer        Customer? @relation(fields: [customerId], references: [id])
}
```

---

## 4. 15 Sheets Parser (Frontend)

### สามารถอ่านได้
| Sheet | ข้อมูล |
|-------|--------|
| รายละเอียด | ชื่อบริษัท, ผู้ถือหุ้น |
| ใบสรุปวงเงิน | สินเชื่อที่ขอ, หลักประกัน |
| ภพ 30 | ยอดขายรายเดือน |
| งบกำไรขาดทุน | รายได้ 3 ปี |
| งบดุล | สินทรัพย์ หนี้สิน |
| เครดิตบูโร | ประวัติการกู้ |
| Statement | การเคลื่อนไหวบัญชี |
| DSCR | อัตราส่วน DSCR |
| ผู้ขายผู้ซื้อ | Suppliers/Customers |
| แผนธุรกิจ | รายได้คาดการณ์ |
| โครงสร้างการลงทุน | เงินลงทุน หนี้สิน |
| เงินทุนหมุนเวียน | Working capital |
| กรรมการ | ข้อมูลผู้บริหาร |
| ความเห็น | ความเห็นผู้อนุมัติ |
| สรุป | Recommendation |

### 7.1 สรุป: Deterministic Parser (ไม่ใช่ AI)

| คำถาม | คำตอบ |
|-------|--------|
| มี AI/ML ไหม? | ❌ ไม่มี |
| มี Neural Network ไหม? | ❌ ไม่มี |
| ต้อง Train Model ไหม? | ❌ ไม่ต้อง |
| ใช้อะไร? | ✅ Pattern Matching + Hardcoded Rules |
| เรียก AI ได้ไหม? | ❌ ไม่ควรเรียก เป็นแค่ชื่อ field ในฐานข้อมูล |

---

## 5. Security Features

### File Upload Security
```typescript
// 1. Validate file size (10MB max)
if (buffer.length > 10 * 1024 * 1024) {
    return error('File too large');
}

// 2. Detect actual file type (magic bytes)
const detectedType = await fileTypeFromBuffer(buffer);

// 3. Whitelist allowed types
const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// 4. Sanitize filename
const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

// 5. Generate file hash
const fileHash = createHash('sha256').update(buffer).digest('hex');
```

---

## 6. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents` | Upload file |
| GET | `/api/documents` | List documents |
| GET | `/api/documents/:id` | Get document |
| GET | `/api/documents/:id/file` | Download file |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/documents/:id/link` | Link to customer |
| POST | `/api/documents/:id/save-parsed` | Save parsed data |

---

## 7. Confidence Score

| Score | ระดับ | ความหมาย |
|-------|--------|---------|
| 90-100% | สูง | ข้อมูลน่าเชื่อถือ |
| 70-89% | ปานกลาง | ตรวจสอบเพิ่ม |
| 50-69% | ต่ำ | กรอกเองบางส่วน |
| <50% | ต่ำมาก | กรอกเองทั้งหมด |

---

## 8. Key Design Decisions

### ทำไมใช้ **Deterministic Parsing** (กฎคงที่) ไม่ใช่ Machine Learning
- Pattern matching + Rule-based extraction
- **Review**: กดดูก่อนบันทึก
- **แก้ไข**: แก้ข้อมูลก่อนส่ง

### ทำไมต้อง Review Modal?
- **Accuracy**: ตรวจสอบก่อนบันทึก
- **Flexibility**: แก้ไขได้ทันที
- **Confidence**: รู้ว่า Parser อ่านถูกมั้ย

---

## 9. Files สำคัญ

| File | Responsibility |
|------|---------------|
| `document.controller.ts` | Upload validation, security |
| `document.service.ts` | File storage, metadata |
| `excel-parser.ts` | Parse 15 sheets |
| `DocumentReviewModal.tsx` | Review UI |

---

*เอกสารนี้จัดทำเมื่อ: April 2026*
