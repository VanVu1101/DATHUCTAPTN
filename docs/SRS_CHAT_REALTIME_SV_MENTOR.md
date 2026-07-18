# SRS — Chat realtime Sinh viên ↔ Mentor (Doanh nghiệp)

| Mục | Nội dung |
|-----|----------|
| **Tài liệu** | Software Requirements Specification (SRS) |
| **Tính năng** | Chat realtime giữa Sinh viên và Mentor phía Doanh nghiệp |
| **Dự án** | Hệ thống quản lý thực tập (DTTHUCTAPTN) |
| **Phiên bản** | 1.0 |
| **Ngày** | 17/07/2026 |
| **Stack hiện tại** | React (Vite) · Express · Sequelize · MySQL · JWT · AWS S3 |
| **Trạng thái** | Đặc tả thiết kế — chưa implement |

---

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu này mô tả yêu cầu chức năng, phi chức năng, dữ liệu, giao diện và hướng triển khai trên **AWS** cho tính năng **chat realtime** giữa:

- **Sinh viên** (`role = STUDENT`) đang thực tập
- **Mentor / người hướng dẫn phía doanh nghiệp** (`role = ENTERPRISE`, gắn với bản ghi `mentors`)

### 1.2 Phạm vi

| Trong phạm vi | Ngoài phạm vi (v1) |
|---------------|---------------------|
| Chat 1–1 SV ↔ Mentor được phân công | Chat nhóm nhiều SV |
| Gửi/nhận tin nhắn realtime (text) | Video/audio call |
| Đính kèm ảnh / PDF nhỏ (S3) | Chat công khai / forum |
| Trạng thái đã đọc, đang gõ | Bot AI trả lời tự động |
| Lịch sử tin nhắn phân trang | Chat với ADMIN (có thể mở rộng v2) |
| Thông báo khi có tin mới | SMS / push native app |

### 1.3 Định nghĩa

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| **Conversation / Thread** | Một cuộc hội thoại 1–1 giữa đúng một cặp (Student, Mentor) trong một kỳ thực tập |
| **Message** | Một tin nhắn thuộc Conversation |
| **Realtime** | Tin nhắn xuất hiện phía người nhận trong vài giây mà không cần F5 trang |
| **Presence** | Trạng thái online / offline / đang gõ |
| **Mentor DN** | User role `ENTERPRISE` được liên kết với `mentors.userId` và được gán trong `internships.mentorId` |

### 1.4 Tài liệu liên quan

- `TIEN_DO_DU_AN.md` — tiến độ tổng thể
- `backend/src/models/mentor.js`, `internship.js`, `student.js`, `user.js`
- `backend/src/config/s3.js` — upload file hiện có
- Hệ thống thông báo hiện tại (`notifications`) — tái sử dụng để báo “có tin nhắn mới”

---

## 2. Mô tả tổng quan

### 2.1 Bối cảnh nghiệp vụ

Trong quá trình thực tập, sinh viên cần trao đổi nhanh với mentor về nhiệm vụ, báo cáo, lịch họp. Hiện hệ thống đã có **Meetings**, **Notifications** (polling), nhưng **chưa có kênh chat realtime**.

Luồng phân công hiện tại (mục tiêu TV2):

```
Sinh viên → Đợt thực tập → Chuyên ngành → Vị trí → Mentor
```

Chat chỉ được mở khi đã có quan hệ phân công hợp lệ:

```
Internship(studentId, mentorId, periodId, status = ACTIVE|...)
```

### 2.2 Actors

| Actor | Vai trò trong chat |
|-------|-------------------|
| **Sinh viên** | Tạo/mở hội thoại với mentor được phân công; gửi tin, đính kèm, xem lịch sử |
| **Mentor (ENTERPRISE)** | Nhận tin từ SV được giao; trả lời; xem danh sách hội thoại theo từng SV |
| **Admin** | (Tùy chọn v1.1) Xem audit / khóa hội thoại khi vi phạm — không tham gia chat thường xuyên |
| **Hệ thống** | Xác thực JWT, lưu tin, đẩy realtime, upload S3, ghi thông báo |

### 2.3 Use case chính

```
UC-01: Mở danh sách hội thoại
UC-02: Mở / tạo hội thoại 1–1 với mentor (SV) hoặc với SV (Mentor)
UC-03: Gửi tin nhắn text
UC-04: Gửi file đính kèm (ảnh/PDF) lên S3
UC-05: Nhận tin realtime
UC-06: Đánh dấu đã đọc
UC-07: Hiển thị trạng thái "đang gõ"
UC-08: Xem lịch sử (phân trang / infinite scroll)
UC-09: Nhận thông báo khi offline / tab khác
UC-10: Chặn chat nếu chưa được phân công mentor
```

### 2.4 Sơ đồ luồng tổng thể

```
┌─────────────┐     JWT + Socket     ┌──────────────────┐
│  React SPA  │◄───────────────────►│  API Server      │
│  /chat      │     (Socket.IO)      │  Express + IO    │
└──────┬──────┘                      └────────┬─────────┘
       │ REST (history, upload)               │
       │                                      ├─► MySQL (RDS)
       │                                      ├─► S3 (attachments)
       └──────────────────────────────────────┴─► (optional) ElastiCache / SES
```

---

## 3. Yêu cầu chức năng

### 3.1 FR-01 — Phân quyền truy cập chat

| ID | Yêu cầu | Ưu tiên |
|----|---------|---------|
| FR-01.1 | Chỉ `STUDENT` và `ENTERPRISE` (mentor) được vào module Chat | Must |
| FR-01.2 | SV chỉ chat với mentor đang được gán trong `internships` của kỳ hiện tại | Must |
| FR-01.3 | Mentor chỉ thấy / chat với SV mà mình được gán (`internships.mentorId`) | Must |
| FR-01.4 | Nếu chưa phân công mentor → UI hiện hướng dẫn “Chưa có mentor”, không cho gửi tin | Must |
| FR-01.5 | ADMIN có thể xem danh sách hội thoại (read-only) nếu bật cấu hình `CHAT_ADMIN_AUDIT=true` | Should |

### 3.2 FR-02 — Hội thoại (Conversation)

| ID | Yêu cầu | Ưu tiên |
|----|---------|---------|
| FR-02.1 | Mỗi cặp `(studentUserId, mentorUserId, internshipId)` tối đa **một** conversation đang mở | Must |
| FR-02.2 | Tự tạo conversation khi SV hoặc Mentor gửi tin đầu tiên (lazy create) | Must |
| FR-02.3 | Danh sách hội thoại hiển thị: tên đối phương, avatar, tin cuối, thời gian, số chưa đọc | Must |
| FR-02.4 | Sắp xếp theo thời gian tin nhắn mới nhất | Must |
| FR-02.5 | Có thể đóng / archive conversation khi kỳ thực tập kết thúc (chỉ đọc, không gửi) | Should |

### 3.3 FR-03 — Tin nhắn

| ID | Yêu cầu | Ưu tiên |
|----|---------|---------|
| FR-03.1 | Gửi tin text (UTF-8), tối đa 2000 ký tự | Must |
| FR-03.2 | Tin nhắn lưu DB trước khi broadcast (đảm bảo không mất tin) | Must |
| FR-03.3 | Mỗi tin có: `id`, `conversationId`, `senderId`, `content`, `type`, `createdAt`, `status` | Must |
| FR-03.4 | `type`: `TEXT` \| `IMAGE` \| `FILE` \| `SYSTEM` | Must |
| FR-03.5 | `status`: `SENT` \| `DELIVERED` \| `READ` | Should |
| FR-03.6 | Cho phép thu hồi tin trong **2 phút** (soft delete / `isRecalled=true`) | Could |
| FR-03.7 | Không cho sửa nội dung tin đã gửi (v1) | Must |

### 3.4 FR-04 — Realtime

| ID | Yêu cầu | Ưu tiên |
|----|---------|---------|
| FR-04.1 | Kết nối WebSocket (đề xuất **Socket.IO**) sau khi đăng nhập JWT | Must |
| FR-04.2 | Event `message:new` đẩy tới room của conversation | Must |
| FR-04.3 | Event `message:read` cập nhật trạng thái đã đọc | Should |
| FR-04.4 | Event `typing:start` / `typing:stop` | Should |
| FR-04.5 | Reconnect tự động khi mất mạng; đồng bộ tin mới qua REST khi reconnect | Must |
| FR-04.6 | Latency mục tiêu P95 &lt; 2 giây trong cùng region AWS | Should |

### 3.5 FR-05 — Đính kèm file

| ID | Yêu cầu | Ưu tiên |
|----|---------|---------|
| FR-05.1 | Cho phép ảnh: JPG, PNG, WEBP — tối đa **5 MB**/file | Must |
| FR-05.2 | Cho phép PDF — tối đa **10 MB**/file | Must |
| FR-05.3 | Upload qua API → lưu **S3** (folder `chat-attachments/{conversationId}/`) | Must |
| FR-05.4 | URL đính kèm dùng **presigned URL** (khuyến nghị) hoặc URL private + proxy | Should |
| FR-05.5 | Virus/content scan: ngoài phạm vi v1; validate MIME + extension phía server | Must |

### 3.6 FR-06 — Đã đọc & thông báo

| ID | Yêu cầu | Ưu tiên |
|----|---------|---------|
| FR-06.1 | Khi mở conversation → đánh dấu tất cả tin của đối phương là READ | Must |
| FR-06.2 | Badge số chưa đọc trên sidebar / icon Chat | Must |
| FR-06.3 | Khi người nhận offline → tạo bản ghi `notifications` type `CHAT_MESSAGE` | Should |
| FR-06.4 | (Mở rộng) Email digest nếu không đọc sau 24h — dùng SES | Could |

### 3.7 FR-07 — Giao diện

| ID | Yêu cầu | Màn hình |
|----|---------|----------|
| FR-07.1 | Trang Chat tổng | `/chat` — 2 cột: danh sách hội thoại + khung chat |
| FR-07.2 | Responsive mobile | Danh sách / chi tiết tách route `/chat/:id` trên mobile |
| FR-07.3 | Hiển thị ngày nhóm tin (Hôm nay / Hôm qua / dd/MM/yyyy) | Trong khung chat |
| FR-07.4 | Empty state khi chưa có mentor / chưa có tin | — |
| FR-07.5 | Link nhanh từ Dashboard SV & Dashboard DN | Home / enterprise dashboard |

---

## 4. Yêu cầu phi chức năng

| ID | Nhóm | Yêu cầu |
|----|------|---------|
| NFR-01 | Bảo mật | Mọi REST/Socket phải xác thực JWT; không join room conversation nếu không phải thành viên |
| NFR-02 | Bảo mật | Rate limit: tối đa 30 tin/phút/user; 10 upload/giờ/user |
| NFR-03 | Bảo mật | Không log nội dung tin nhắn dạng plaintext trên CloudWatch (chỉ metadata) |
| NFR-04 | Hiệu năng | REST lấy lịch sử: &lt; 500ms với 50 tin/page |
| NFR-05 | Khả dụng | Chat không làm sập API REST khi Socket lỗi — tách namespace `/chat` |
| NFR-06 | Lưu trữ | Tin nhắn giữ tối thiểu trong suốt kỳ thực tập + 1 năm (có thể archive) |
| NFR-07 | Tương thích | Chrome, Edge, Firefox bản mới; mobile browser |
| NFR-08 | Quốc tế hóa | UI tiếng Việt (v1); content tin nhắn Unicode |
| NFR-09 | Quan sát | Metric: connections, messages/min, error rate trên CloudWatch |

---

## 5. Đặc tả dữ liệu

### 5.1 Bảng `chat_conversations`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BIGINT PK AI | — |
| `internship_id` | BIGINT FK → `internships.id` | Kỳ/quan hệ phân công |
| `student_user_id` | BIGINT FK → `users.id` | — |
| `mentor_user_id` | BIGINT FK → `users.id` | User ENTERPRISE của mentor |
| `last_message_at` | DATETIME | Sort danh sách |
| `last_message_preview` | VARCHAR(255) | Preview |
| `status` | ENUM(`ACTIVE`,`ARCHIVED`,`LOCKED`) | — |
| `created_at` / `updated_at` | DATETIME | — |

**Unique:** `(internship_id, student_user_id, mentor_user_id)`

### 5.2 Bảng `chat_messages`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BIGINT PK AI | — |
| `conversation_id` | BIGINT FK | — |
| `sender_id` | BIGINT FK → `users.id` | — |
| `content` | TEXT | Text hoặc caption |
| `type` | ENUM(`TEXT`,`IMAGE`,`FILE`,`SYSTEM`) | — |
| `attachment_url` | VARCHAR(500) NULL | URL S3 / key |
| `attachment_key` | VARCHAR(500) NULL | S3 object key |
| `attachment_mime` | VARCHAR(100) NULL | — |
| `attachment_size` | INT NULL | bytes |
| `status` | ENUM(`SENT`,`DELIVERED`,`READ`) | — |
| `is_recalled` | BOOLEAN DEFAULT false | — |
| `created_at` | DATETIME | — |

**Index:** `(conversation_id, created_at DESC)`, `(sender_id)`

### 5.3 Bảng `chat_participants` (tuỳ chọn, chuẩn bị mở rộng nhóm)

| Cột | Kiểu |
|-----|------|
| `conversation_id` | FK |
| `user_id` | FK |
| `last_read_message_id` | BIGINT NULL |
| `muted` | BOOLEAN |

> Với chat 1–1 v1 có thể bỏ bảng này và lưu `last_read_at` trên conversation theo từng phía (`student_last_read_at`, `mentor_last_read_at`).

### 5.4 Quan hệ với hệ thống hiện có

```
users (STUDENT|ENTERPRISE)
   ↑
students / mentors
   ↑
internships (studentId, mentorId, periodId)
   ↑
chat_conversations
   ↑
chat_messages
```

---

## 6. Đặc tả API & Socket

### 6.1 REST API

Base: `/api/chat` — header `Authorization: Bearer <JWT>`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/conversations` | Danh sách hội thoại của user hiện tại |
| `POST` | `/conversations` | Tạo/lấy conversation theo `internshipId` |
| `GET` | `/conversations/:id/messages?cursor=&limit=50` | Lịch sử (cursor-based) |
| `POST` | `/conversations/:id/messages` | Gửi tin (fallback khi socket fail) |
| `POST` | `/conversations/:id/read` | Đánh dấu đã đọc |
| `POST` | `/attachments` | Upload multipart → trả `url` + `key` |
| `GET` | `/unread-count` | Tổng số tin chưa đọc |

#### Ví dụ `POST /conversations`

```json
{
  "internshipId": 12
}
```

#### Ví dụ `POST /conversations/:id/messages`

```json
{
  "content": "Em đã nộp báo cáo tuần 3 ạ",
  "type": "TEXT"
}
```

#### Ví dụ response message

```json
{
  "id": 901,
  "conversationId": 15,
  "senderId": 44,
  "content": "Em đã nộp báo cáo tuần 3 ạ",
  "type": "TEXT",
  "status": "SENT",
  "createdAt": "2026-07-17T06:00:00.000Z"
}
```

### 6.2 Socket.IO events

**Kết nối**

```
io({ auth: { token: '<JWT>' } })
```

Server verify JWT → `socket.join(user:{userId})` và các `conversation:{id}` được phép.

| Event (client → server) | Payload | Mô tả |
|-------------------------|---------|-------|
| `conversation:join` | `{ conversationId }` | Join room |
| `message:send` | `{ conversationId, content, type, attachmentKey? }` | Gửi tin |
| `message:read` | `{ conversationId, lastMessageId }` | Đã đọc |
| `typing:start` | `{ conversationId }` | Đang gõ |
| `typing:stop` | `{ conversationId }` | Dừng gõ |

| Event (server → client) | Payload | Mô tả |
|-------------------------|---------|-------|
| `message:new` | `Message` | Tin mới |
| `message:read` | `{ conversationId, userId, lastMessageId }` | Cập nhật đọc |
| `typing:update` | `{ conversationId, userId, isTyping }` | Typing |
| `error` | `{ code, message }` | Lỗi quyền / validate |

### 6.3 Mã lỗi nghiệp vụ

| Code | HTTP / Socket | Ý nghĩa |
|------|---------------|---------|
| `CHAT_FORBIDDEN` | 403 | Không thuộc conversation / chưa phân công |
| `CHAT_ARCHIVED` | 409 | Kỳ đã kết thúc, chỉ đọc |
| `CHAT_RATE_LIMIT` | 429 | Gửi quá nhanh |
| `CHAT_ATTACHMENT_INVALID` | 400 | File không hợp lệ |
| `CHAT_NOT_FOUND` | 404 | Conversation không tồn tại |

---

## 7. Wireframe logic UI

### 7.1 Sinh viên — `/chat`

```
┌────────────────────────────────────────────────────┐
│ Sidebar │  Chat với: Nguyễn Văn Mentor · Online    │
│         │──────────────────────────────────────────│
│ [AV]    │  [Mentor] Chào em, tuần này focus API    │
│ Mentor  │  [Bạn] Dạ em đang làm task #12           │
│ 2 phút  │  [Bạn] 📎 bao_cao_tuan3.pdf              │
│         │                                          │
│         │  Mentor đang nhập...                     │
│         │──────────────────────────────────────────│
│         │  [___________ Nhập tin nhắn ________] 📎➤ │
└────────────────────────────────────────────────────┘
```

### 7.2 Mentor DN — `/chat`

- Cột trái: danh sách SV được phân công (filter theo kỳ / chưa đọc)
- Cột phải: khung chat tương tự
- Badge trên menu “Tin nhắn”

---

## 8. Quy tắc nghiệp vụ (Business Rules)

| BR | Nội dung |
|----|----------|
| BR-01 | Chỉ tạo conversation khi `internships.mentorId` trỏ tới mentor có `userId` hợp lệ |
| BR-02 | Khi đổi mentor giữa kỳ → archive conversation cũ; conversation mới với mentor mới |
| BR-03 | User bị khóa (`users` inactive — nếu có) không kết nối socket |
| BR-04 | Tin `SYSTEM` chỉ do server tạo (vd: “Mentor đã được đổi”) |
| BR-05 | Nội dung bị recall vẫn giữ metadata audit cho ADMIN (nếu bật) |

---

## 9. Tiêu chí chấp nhận (Acceptance Criteria)

### AC — Happy path

1. SV đăng nhập → mở `/chat` → thấy mentor được phân công.
2. SV gửi “Xin chào mentor” → Mentor nhận **không reload** trong &lt; 2s.
3. Mentor trả lời → SV thấy realtime + badge unread cập nhật.
4. SV đính kèm PDF ≤ 10MB → file nằm trên S3, cả hai bên mở được.
5. Mentor mở conversation → tin phía SV chuyển READ; badge về 0.
6. User không được phân công → không gửi được tin, có thông báo rõ ràng.

### AC — Non-happy path

7. JWT hết hạn → socket disconnect, UI yêu cầu đăng nhập lại.
8. User A cố join `conversationId` của người khác → `CHAT_FORBIDDEN`.
9. Mất mạng tạm thời → reconnect + REST sync không trùng tin (idempotent bằng `id`).

---

## 10. Kiến trúc đề xuất (khớp codebase hiện tại)

### 10.1 Backend (bổ sung)

```
backend/src/
  models/chatConversation.js
  models/chatMessage.js
  routes/chat.js
  controllers/chat.js
  services/chat.js
  sockets/chat.socket.js      # namespace /chat
  middlewares/socketAuth.js
```

Entry `server.js`:

```js
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL } });
require('./src/sockets/chat.socket')(io);
server.listen(PORT);
```

### 10.2 Frontend (bổ sung)

```
frontend/src/
  pages/ChatPage.jsx
  components/chat/ConversationList.jsx
  components/chat/MessageBubble.jsx
  components/chat/ChatComposer.jsx
  services/chatService.js
  hooks/useChatSocket.js
```

Route: `/chat`, `/chat/:conversationId`

Thư viện đề xuất: `socket.io-client`

### 10.3 Tái sử dụng

| Thành phần sẵn có | Cách dùng |
|-------------------|-----------|
| JWT + `verifyToken` | Auth REST & Socket |
| Role `STUDENT` / `ENTERPRISE` | Phân quyền module |
| `internships` + `mentors` | Kiểm tra quyền chat |
| `s3.js` `uploadFile` | Đính kèm chat |
| `notifications` | Báo tin mới khi offline |

---

# 11. Hướng dẫn tạo / triển khai tính năng trên AWS

Phần này hướng dẫn **cấu hình AWS** để chạy chat realtime + lưu file, phù hợp đồ án và stack hiện tại (region khuyến nghị: **`ap-southeast-1` Singapore**).

## 11.1 Tổng quan dịch vụ AWS dùng cho Chat

| Dịch vụ | Mục đích với Chat | Bắt buộc v1? |
|---------|-------------------|--------------|
| **EC2** (hoặc ECS) | Chạy Node API + Socket.IO | Có |
| **RDS MySQL** | Lưu conversations / messages | Có |
| **S3** | Lưu ảnh/PDF đính kèm | Có |
| **IAM** | Quyền truy cập S3 (và SES nếu có) | Có |
| **CloudWatch** | Log & metric kết nối / lỗi | Nên có |
| **ALB + Sticky Session** | Cân bằng tải Socket.IO nhiều instance | Khi scale &gt; 1 EC2 |
| **ElastiCache Redis** | Adapter Socket.IO multi-instance | Khi scale |
| **Amazon SES** | Email nhắc tin chưa đọc | Tuỳ chọn |
| **CloudFront** | CDN frontend + (tuỳ chọn) cache asset | Tuỳ chọn |
| **ACM** | HTTPS certificate | Nên có (production) |

> **Không bắt buộc** Amazon API Gateway WebSocket cho v1 nếu đã chạy Socket.IO trên EC2 — đơn giản hơn cho đồ án.

---

## 11.2 Bước 1 — IAM (quyền tối thiểu)

### 11.2.1 Tạo IAM User hoặc Role cho ứng dụng

**Khuyến nghị production:** gắn **IAM Role** cho EC2 instance (không hard-code access key).

Policy tối thiểu cho chat attachments (inline policy mẫu):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ChatS3Objects",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/chat-attachments/*"
    },
    {
      "Sid": "ListBucketPrefix",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["chat-attachments/*"]
        }
      }
    }
  ]
}
```

### 11.2.2 Biến môi trường trên EC2

```env
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=dtthuctaptn-uploads
USE_LOCAL_UPLOAD=false
# Nếu dùng IAM Role trên EC2: KHÔNG cần AWS_ACCESS_KEY_ID / SECRET
FRONTEND_URL=https://your-domain.com
CHAT_ATTACHMENT_MAX_MB=10
```

---

## 11.3 Bước 2 — S3 (đính kèm chat)

### 11.3.1 Tạo bucket

1. AWS Console → **S3** → Create bucket  
2. Name: `dtthuctaptn-uploads` (hoặc tên unik toàn cục)  
3. Region: `ap-southeast-1`  
4. **Block Public Access**: bật (khuyến nghị) — dùng **presigned URL**  
5. Versioning: tuỳ chọn  
6. Encryption: SSE-S3 (AES-256) mặc định  

### 11.3.2 Cấu trúc object key

```
chat-attachments/{conversationId}/{timestamp}-{safeFileName}
```

Tái sử dụng hàm hiện có trong `backend/src/config/s3.js`:

```js
await uploadFile({
  fileBuffer,
  fileName: safeName,
  contentType,
  folder: `chat-attachments/${conversationId}`
});
```

### 11.3.3 CORS (nếu upload trực tiếp từ browser bằng presigned URL)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["https://your-frontend-domain.com", "http://localhost:5173"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 11.3.4 Presigned URL (khuyến nghị)

Flow an toàn hơn public-read:

1. Client gọi `POST /api/chat/attachments/presign` `{ fileName, contentType }`  
2. Server trả `{ uploadUrl, key }` (AWS SDK `PutObject` presign, hết hạn 5 phút)  
3. Client `PUT` file thẳng lên S3  
4. Client gửi tin `type=FILE` kèm `attachmentKey`  
5. Khi xem file: `GET /api/chat/attachments/sign?key=...` → URL tải tạm 5–15 phút  

---

## 11.4 Bước 3 — RDS MySQL

1. **RDS** → Create database → Engine **MySQL 8**  
2. Template: Free tier / Dev (đồ án)  
3. DB instance: `db.t3.micro` hoặc `db.t4g.micro`  
4. VPC: cùng VPC với EC2  
5. Security Group: chỉ cho phép inbound **3306** từ SG của EC2  
6. Tạo database schema ứng dụng (vd: `internship_db`)  
7. Chạy migration tạo bảng:

```sql
-- chat_conversations, chat_messages (theo mục 5)
CREATE TABLE chat_conversations ( ... );
CREATE TABLE chat_messages ( ... );
```

8. Env backend:

```env
DB_HOST=xxx.ap-southeast-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=internship_db
DB_USER=app_user
DB_PASSWORD=********
```

**Lưu ý:** bật automated backup (7 ngày) cho demo đồ án.

---

## 11.5 Bước 4 — EC2 chạy API + Socket.IO

### 11.5.1 Launch EC2

1. AMI: Ubuntu 22.04 LTS  
2. Instance: `t3.small` (Socket cần RAM ổn định hơn `t3.micro`)  
3. SG inbound:

| Port | Source | Mục đích |
|------|--------|----------|
| 22 | IP của bạn | SSH |
| 80 | 0.0.0.0/0 | HTTP (redirect HTTPS) |
| 443 | 0.0.0.0/0 | HTTPS + WSS |
| 5000 | (chỉ nếu test trực tiếp) | API dev — nên đóng trên production |

4. Cài Node.js 20 LTS, PM2, Nginx  

### 11.5.2 Nginx reverse proxy (HTTP + WebSocket)

```nginx
server {
    listen 443 ssl;
    server_name api.your-domain.com;

    ssl_certificate     /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

> Header `Upgrade` / `Connection` **bắt buộc** để Socket.IO (WebSocket) hoạt động sau Nginx.

### 11.5.3 PM2

```bash
pm2 start backend/server.js --name internship-api
pm2 save
```

---

## 11.6 Bước 5 — Scale Socket.IO (khi &gt; 1 instance)

Khi chạy **nhiều EC2** sau ALB:

1. Bật **Sticky Sessions** (session affinity) trên ALB **hoặc**
2. Dùng **Redis adapter** cho Socket.IO:

```bash
npm i @socket.io/redis-adapter redis
```

3. Tạo **ElastiCache Redis** (cùng VPC)  
4. Cấu hình:

```js
const { createAdapter } = require('@socket.io/redis-adapter');
io.adapter(createAdapter(pubClient, subClient));
```

**Đồ án 1 EC2:** chưa cần Redis — ghi rõ trong báo cáo là “single-node realtime”.

---

## 11.7 Bước 6 — CloudWatch

### Log

- Agent / PM2 log → CloudWatch Log Group: `/dtthuctaptn/api`  
- Metric filter: `CHAT_FORBIDDEN`, `socket disconnect`, `S3 upload failed`

### Alarm gợi ý

| Alarm | Điều kiện |
|-------|-----------|
| API 5xx | &gt; 5 lỗi / 5 phút |
| CPU EC2 | &gt; 80% / 10 phút |
| RDS FreeStorage | &lt; 2 GB |
| Unhealthy host ALB | ≥ 1 |

Dashboard CloudWatch widgets: Connections ước lượng (custom metric `chat_socket_connections`), Messages/min.

---

## 11.8 Bước 7 — SES (tuỳ chọn — nhắc tin chưa đọc)

1. Verify domain / email trong **Amazon SES**  
2. Ra khỏi sandbox (production access) nếu gửi cho user thật  
3. IAM thêm `ses:SendEmail`  
4. Job cron (node-cron trên EC2) mỗi giờ: tìm conversation có unread &gt; 24h → gửi mail  

Tích hợp với mailer hiện có trong `backend/src/infrastructure/mail`.

---

## 11.9 Bước 8 — Frontend trên S3 + CloudFront (tuỳ chọn)

1. `npm run build` frontend  
2. Upload `dist/` lên bucket riêng `dtthuctaptn-web`  
3. CloudFront distribution → origin S3  
4. Env build:

```env
VITE_API_URL=https://api.your-domain.com
VITE_SOCKET_URL=https://api.your-domain.com
```

Socket client:

```js
import { io } from 'socket.io-client';
const socket = io(import.meta.env.VITE_SOCKET_URL, {
  auth: { token: localStorage.getItem('token') },
  transports: ['websocket', 'polling']
});
```

---

## 11.10 Checklist triển khai AWS cho Chat

| # | Việc | Done? |
|---|------|-------|
| 1 | IAM Role/User với quyền S3 prefix `chat-attachments/*` | ☐ |
| 2 | Bucket S3 + Block Public Access + CORS | ☐ |
| 3 | RDS MySQL + SG chỉ mở cho EC2 + migration bảng chat | ☐ |
| 4 | EC2 + Node + PM2 + Nginx (WebSocket headers) + HTTPS | ☐ |
| 5 | Env: `FRONTEND_URL`, DB_*, AWS_S3_BUCKET, JWT_SECRET | ☐ |
| 6 | Test: gửi tin 2 user khác trình duyệt (realtime) | ☐ |
| 7 | Test: upload PDF/ảnh → object xuất hiện trên S3 | ☐ |
| 8 | CloudWatch log group + alarm cơ bản | ☐ |
| 9 | (Scale) ALB sticky / Redis adapter | ☐ |
| 10 | (Optional) SES reminder unread | ☐ |

---

## 11.11 Ước lượng chi phí đồ án (tham khảo, ap-southeast-1)

| Thành phần | Ước lượng / tháng (dev nhẹ) |
|------------|------------------------------|
| EC2 t3.small | ~15–25 USD |
| RDS db.t3.micro | ~15 USD (hoặc Free Tier) |
| S3 + transfer nhỏ | &lt; 2 USD |
| CloudWatch | &lt; 3 USD |
| ElastiCache (nếu có) | ~12+ USD |
| SES | gần như miễn phí ở quy mô nhỏ |

→ Có thể gộp API + MySQL trên **một EC2** lúc demo để giảm chi phí (đánh đổi độ bền vững).

---

## 12. Kế hoạch triển khai phần mềm (gợi ý sprint)

| Sprint | Việc | Output |
|--------|------|--------|
| **S1** | Model + migration + REST CRUD messages | API Postman pass |
| **S2** | Socket.IO auth + `message:send/new` | Chat text realtime local |
| **S3** | UI `/chat` SV + Mentor | Demo 2 role |
| **S4** | Upload S3 + unread + notifications | Đủ AC chính |
| **S5** | Deploy EC2/RDS/S3 + Nginx WSS | Demo trên AWS |
| **S6** | Typing, archive khi hết kỳ, CloudWatch | Polish + báo cáo |

---

## 13. Rủi ro & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|--------|-----|------------|
| Socket không chạy sau Nginx | Cao | Cấu hình `Upgrade` header; test WSS |
| Multi-instance mất tin broadcast | Trung bình | Redis adapter hoặc sticky session |
| Lộ file đính kèm | Cao | Private S3 + presigned URL ngắn hạn |
| Spam tin nhắn | Trung bình | Rate limit + khóa conversation |
| Mentor chưa có `userId` | Cao | Bắt buộc liên kết `mentors.userId` khi phân công (phụ thuộc TV2) |

---

## 14. Phụ thuộc tính năng khác trong dự án

| Phụ thuộc | Lý do |
|-----------|-------|
| TV2 — Phân công mentor hoàn chỉnh | Chat cần `internships.mentorId` + `mentors.userId` |
| TV1 — Auth JWT ổn định | Socket auth |
| TV4 — S3 / EC2 / RDS | Hạ tầng lưu trữ & deploy |
| Notifications hiện có | Báo tin khi user offline |

---

## 15. Tài liệu tham khảo

- [Socket.IO — Using multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/)  
- [AWS S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)  
- [Nginx WebSocket proxying](https://nginx.org/en/docs/http/websocket.html)  
- [Amazon RDS for MySQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html)  

---

## 16. Lịch sử thay đổi tài liệu

| Phiên bản | Ngày | Mô tả |
|-----------|------|-------|
| 1.0 | 17/07/2026 | Bản SRS đầu tiên: FR/NFR, schema, API/Socket, hướng dẫn AWS |

---

*Tài liệu SRS phục vụ đặc tả & triển khai tính năng Chat realtime Sinh viên ↔ Mentor doanh nghiệp trên hệ thống quản lý thực tập.*
