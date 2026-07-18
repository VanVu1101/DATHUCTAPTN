# Tiến độ dự án — Hệ thống quản lý thực tập

> Cập nhật: **17/07/2026**  
> Nguồn: đối chiếu phân công 4 thành viên với codebase thực tế (`backend` + `frontend`).

---

## Tổng quan

| Thành viên | Phạm vi | Hoàn thành | Một phần | Còn thiếu | Ước lượng |
|------------|---------|------------|----------|-----------|-----------|
| **TV1** | Xác thực & hồ sơ | 7 | 5 | 2 | ~75% |
| **TV2** | Quản lý thực tập | 3 | 4 | 3 | ~45% |
| **TV3** | Nhiệm vụ, báo cáo, đánh giá | 6 | 5 | 4 | ~55% |
| **TV4** | Dashboard, thông báo, AWS | 6 | 5 | 4 | ~55% |
| **Toàn dự án** | — | — | — | — | **~55–60%** |

**Chú thích trạng thái**

| Ký hiệu | Ý nghĩa |
|---------|---------|
| ✅ | Đã hoàn thành (backend + frontend dùng được) |
| 🔶 | Một phần (có model/API/UI nhưng chưa đủ theo spec) |
| ❌ | Chưa có / chỉ placeholder |

---

## Thành viên 1 — Xác thực và hồ sơ người dùng

### Chức năng

| Tính năng | Trạng thái | Ghi chú |
|-----------|------------|---------|
| Đăng nhập | ✅ | JWT, trang `/login` |
| Đăng xuất | 🔶 | Chỉ xóa token phía client; chưa có API logout / thu hồi session |
| Phân quyền Doanh nghiệp / Sinh viên | 🔶 | Có role `STUDENT` / `ENTERPRISE` / `ADMIN`; bảo vệ route theo role còn yếu (chủ yếu ADMIN) |
| Đổi mật khẩu | ✅ | API + form trong trang hồ sơ |
| Quên mật khẩu qua email | 🔶 | Có gửi mail + `/reset-password`; chưa có trang `/forgot-password` riêng; token reset lưu in-memory |
| Cập nhật hồ sơ cá nhân | ✅ | `/profile`, API student profile |
| Đổi ảnh đại diện | ✅ | Upload avatar |
| Upload CV PDF | 🔶 | Có upload tài liệu (PDF/DOC/ảnh); chưa bắt buộc chỉ PDF |
| Xem lịch sử đăng nhập | ✅ | `/profile/history` + bảng `login_histories` |

### AWS

| Tính năng | Trạng thái | Ghi chú |
|-----------|------------|---------|
| Upload avatar lên S3 | 🔶 | Có code S3; fallback local khi `USE_LOCAL_UPLOAD=true` |
| Upload CV lên S3 | 🔶 | Tương tự avatar |

### Bảng dữ liệu

| Bảng (theo spec) | Trạng thái | Thực tế |
|------------------|------------|---------|
| Users | ✅ | `users` |
| Profiles | 🔶 | Không có bảng `profiles`; dùng `students` + `users` |
| RefreshTokens | ❌ | Chỉ có trong design SQL, chưa implement |
| LoginHistories | ✅ | `login_histories` |

### Giao diện

| Trang | Trạng thái | Ghi chú |
|-------|------------|---------|
| Trang đăng nhập | ✅ | `/login` |
| Trang quên mật khẩu | 🔶 | Nút trên login + trang reset; chưa trang forgot riêng |
| Trang hồ sơ cá nhân | ✅ | `/profile` |
| Trang đổi mật khẩu | 🔶 | Section trong hồ sơ, chưa trang riêng |

### Việc ưu tiên còn lại (TV1)

1. Implement **RefreshTokens** + API logout (thu hồi token).
2. Tách trang **Quên mật khẩu** / **Đổi mật khẩu**.
3. Siết **RBAC** ENTERPRISE vs STUDENT trên frontend & backend.
4. Lưu reset-token vào DB thay vì `Map` in-memory.

---

## Thành viên 2 — Quản lý thực tập

### Chức năng

| Tính năng | Trạng thái | Ghi chú |
|-----------|------------|---------|
| Quản lý chuyên ngành | ✅ | `/majors` + CRUD API |
| Quản lý đợt thực tập | ✅ | `/periods`, chi tiết kỳ, upload tài liệu kỳ |
| Quản lý vị trí thực tập | 🔶 | Có model `positions`; chưa CRUD UI/API (tự tạo mặc định) |
| Quản lý người hướng dẫn | 🔶 | Có model `mentors`; chưa trang/API quản lý; UI nhập tên tự do |
| Quản lý thực tập sinh | ✅ | `/students` list/filter/CRUD |
| Phân công thực tập | 🔶 | Có bảng `internships` + vài API assign; **chưa có màn hình phân công** |

### Quy trình: SV → Đợt → Chuyên ngành → Vị trí → Mentor

| Bước | Trạng thái |
|------|------------|
| Schema hỗ trợ quan hệ | ✅ |
| Workflow UI theo chuỗi bước | ❌ |

### Bảng dữ liệu

| Bảng | Trạng thái |
|------|------------|
| Majors | ✅ |
| InternshipPeriods | ✅ |
| Positions | ✅ (model) / ❌ (CRUD) |
| Mentors | ✅ (model) / ❌ (CRUD) |
| Students | ✅ |
| Internships | ✅ (model) / 🔶 (gán tự động, thiếu UI) |

### Giao diện

| Trang | Trạng thái |
|-------|------------|
| Dashboard quản lý thực tập sinh | 🔶 | Dùng `/students` + `/dashboard` chung |
| Danh sách chuyên ngành | ✅ |
| Danh sách vị trí thực tập | ❌ |
| Danh sách người hướng dẫn | ❌ |
| Màn hình phân công thực tập | ❌ |

### Việc ưu tiên còn lại (TV2)

1. CRUD **Positions** + **Mentors** (API + UI).
2. Màn hình **Phân công** chọn Period → Major → Position → Mentor.
3. Liên kết student form với dropdown Major/Mentor (không nhập text tự do).
4. Hoàn thiện trang `InternshipInfo` (đang stub).

---

## Thành viên 3 — Nhiệm vụ, báo cáo và đánh giá

### Chức năng

| Tính năng | Trạng thái | Ghi chú |
|-----------|------------|---------|
| Giao nhiệm vụ | ✅ | `/tasks`, ADMIN tạo task |
| Cập nhật tiến độ | 🔶 | Có status task; chưa bảng `TaskProgresses`; SV hạn chế tự cập nhật |
| Theo dõi mục tiêu thực tập | ❌ | `/goals` = Coming soon |
| Nộp báo cáo tuần | ✅ | `/reports` |
| Upload PDF lên S3 | 🔶 | Upload file báo cáo lên S3; chưa validate chỉ PDF |
| Chỉnh sửa báo cáo trước hạn | 🔶 | Chủ nộp lại khi REJECTED; chưa enforce deadline |
| Xem lịch sử báo cáo | ✅ | Nằm chung trang `/reports` |
| Duyệt báo cáo | ✅ | APPROVED |
| Từ chối báo cáo | ✅ | REJECTED + ghi chú |
| Yêu cầu chỉnh sửa | 🔶 | Dùng REJECTED + note; chưa status `REQUEST_REVISION` riêng |
| Đánh giá thực tập sinh | ✅ | `/evaluations` |
| Export báo cáo cuối kỳ PDF | ❌ | `/final-report` placeholder; `jspdf` có trong deps nhưng chưa dùng |

### Chức năng mở rộng

| Tính năng | Trạng thái |
|-----------|------------|
| Hệ thống huy hiệu thành tích | ❌ | `/badges` placeholder |
| Chứng nhận hoàn thành thực tập | ❌ | `/certificates` placeholder |

### Bảng dữ liệu

| Bảng | Trạng thái |
|------|------------|
| Tasks | ✅ |
| TaskProgresses | ❌ |
| WeeklyReports | ✅ (`weekly_reports` + `reports`) |
| Evaluations | ✅ |
| Goals | ❌ |
| Badges | ❌ |
| Certificates | ❌ |

### Giao diện

| Trang | Trạng thái |
|-------|------------|
| Trang nhiệm vụ | ✅ |
| Trang nộp báo cáo | ✅ |
| Trang lịch sử báo cáo | 🔶 | Gộp trong `/reports` |
| Trang đánh giá | ✅ |
| Trang mục tiêu thực tập | ❌ |

### Việc ưu tiên còn lại (TV3)

1. Implement **Goals** (model + API + UI).
2. **Export PDF** báo cáo cuối kỳ.
3. **Badges** + **Certificates** (ít nhất MVP).
4. Deadline enforcement + tiến độ task chi tiết (`TaskProgresses`).

---

## Thành viên 4 — Dashboard, thông báo và AWS

### Chức năng

| Tính năng | Trạng thái | Ghi chú |
|-----------|------------|---------|
| Dashboard doanh nghiệp | 🔶 | Có `/dashboard` cho ADMIN; chưa dashboard riêng ENTERPRISE |
| Dashboard sinh viên | ✅ | `/` (`HomePage`) |
| Thông báo | ✅ | `/notifications` + trigger khi task/meeting/report |
| Thông báo thời gian thực | 🔶 | Polling 30s; chưa WebSocket/SSE |
| Check-in hàng ngày | ✅ | `/checkin` |
| Điểm danh bằng QR Code | ❌ | Chỉ folder placeholder `checkin-qr` |
| Lịch làm việc | ✅ | Schedules (gộp trong `/checkin`) |
| Lịch họp với người hướng dẫn | ✅ | Meetings |
| Nhật ký hoạt động | 🔶 | Feed UI trên Home; chưa bảng `ActivityLogs` |

### AWS

| Dịch vụ | Trạng thái | Ghi chú |
|---------|------------|---------|
| EC2 | ❌ | Chưa có cấu hình / deploy script |
| RDS | 🔶 | Dùng MySQL (tương thích RDS); chưa IaC / docs deploy RDS |
| S3 | ✅ | Upload avatar, CV, báo cáo |
| IAM | 🔶 | Access key trong env cho S3 |
| CloudWatch | ❌ | Chỉ `.gitkeep` |

### Bảng dữ liệu

| Bảng | Trạng thái |
|------|------------|
| Notifications | ✅ |
| Schedules | ✅ |
| Meetings | ✅ |
| CheckIns | ✅ |
| ActivityLogs | ❌ |

### Giao diện

| Trang | Trạng thái |
|-------|------------|
| Dashboard doanh nghiệp | 🔶 |
| Dashboard sinh viên | ✅ |
| Lịch làm việc | 🔶 | Gộp `/checkin`, chưa trang riêng |
| Thông báo | ✅ |
| Check-in QR Code | ❌ |

### Việc ưu tiên còn lại (TV4)

1. **QR Check-in** (generate + scan).
2. Dashboard riêng cho role **ENTERPRISE**.
3. Real-time notifications (Socket.IO / SSE).
4. Bảng **ActivityLogs** + CloudWatch / docs deploy EC2+RDS.

---

## Ma trận ưu tiên hoàn thiện (theo impact)

| Ưu tiên | Tính năng | Thành viên | Lý do |
|---------|-----------|------------|-------|
| P0 | Màn hình phân công thực tập | TV2 | Xương sống quy trình SV → Mentor |
| P0 | CRUD Positions + Mentors | TV2 | Thiếu thì phân công không chạy đúng |
| P0 | Dashboard ENTERPRISE | TV4 | Role doanh nghiệp gần như chưa có UI riêng |
| P1 | Goals (mục tiêu thực tập) | TV3 | Đã có route, cần backend |
| P1 | QR Check-in | TV4 | Nổi bật, demo tốt |
| P1 | Export PDF cuối kỳ | TV3 | Yêu cầu báo cáo đồ án |
| P1 | Refresh token + logout server | TV1 | Bảo mật / đúng spec |
| P2 | Badges + Certificates | TV3 | Mở rộng, điểm cộng |
| P2 | Real-time notification | TV4 | UX tốt hơn polling |
| P2 | ActivityLogs | TV4 | Audit trail |
| P3 | Deploy EC2 / RDS / CloudWatch | TV4 | Hạ tầng demo AWS đầy đủ |

---

## Đề xuất tính năng có thể làm thêm

Các đề xuất dưới đây **không nằm trong phân công gốc**, phù hợp để nâng chất lượng đồ án / demo / thực tế doanh nghiệp.

### A. Trải nghiệm người dùng & vận hành

| # | Đề xuất | Mô tả ngắn | Độ khó |
|---|---------|------------|--------|
| 1 | **Onboarding wizard** | Hướng dẫn SV lần đầu: điền hồ sơ → upload CV → chọn kỳ → xem mentor | Trung bình |
| 2 | **Dark / Light theme** | Chế độ giao diện, lưu preference theo user | Thấp |
| 3 | **Đa ngôn ngữ (VI/EN)** | i18n cho giao diện chính | Trung bình |
| 4 | **Tìm kiếm toàn cục** | Ô search nhanh: SV, task, báo cáo, thông báo | Trung bình |
| 5 | **Export Excel** | Xuất danh sách SV / điểm danh / đánh giá ra `.xlsx` | Trung bình |

### B. Thực tập & doanh nghiệp

| # | Đề xuất | Mô tả ngắn | Độ khó |
|---|---------|------------|--------|
| 6 | **Đăng ký thực tập / ứng tuyển vị trí** | SV apply vào Position; DN duyệt | Cao |
| 7 | **Matching SV–Vị trí** | Gợi ý vị trí theo chuyên ngành / kỹ năng từ CV | Cao |
| 8 | **Chấm công theo địa điểm (GPS)** | Check-in kèm tọa độ / bán kính văn phòng | Trung bình |
| 9 | **Timesheet & giờ công** | Tổng hợp giờ check-in/out theo tuần/tháng | Trung bình |
| 10 | **Phản hồi 360°** | SV đánh giá mentor / DN; mentor đánh giá SV | Trung bình |
| 11 | **Hợp đồng / thỏa thuận thực tập** | Upload & ký số (hoặc xác nhận điện tử) | Cao |

### C. Học tập & đánh giá

| # | Đề xuất | Mô tả ngắn | Độ khó |
|---|---------|------------|--------|
| 12 | **Kanban board nhiệm vụ** | Kéo thả TODO → IN_PROGRESS → DONE | Trung bình |
| 13 | **Comment / thảo luận trên task & báo cáo** | Thread trao đổi mentor–SV | Trung bình |
| 14 | **Rubric đánh giá chi tiết** | Tiêu chí có trọng số, tự tính điểm tổng | Trung bình |
| 15 | **AI hỗ trợ review báo cáo** | Tóm tắt / gợi ý nhận xét (OpenAI API) | Cao |
| 16 | **Portfolio SV** | Trang public showcase CV + chứng chỉ + dự án | Trung bình |

### D. Thông báo & tích hợp

| # | Đề xuất | Mô tả ngắn | Độ khó |
|---|---------|------------|--------|
| 17 | **Email / Push reminder** | Nhắc hạn nộp báo cáo, họp, check-in | Trung bình |
| 18 | **Tích hợp Google Calendar** | Đồng bộ lịch họp / lịch làm việc | Cao |
| 19 | **Chat nội bộ mentor–SV** | Tin nhắn realtime trong hệ thống | Cao |
| 20 | **Webhook / Slack / Teams** | Gửi thông báo ra kênh DN | Trung bình |

### E. AWS & DevOps (điểm cộng đồ án)

| # | Đề xuất | Mô tả ngắn | Độ khó |
|---|---------|------------|--------|
| 21 | **CI/CD (GitHub Actions)** | Auto test + deploy backend/frontend | Trung bình |
| 22 | **CloudFront + S3 hosting frontend** | CDN cho SPA | Trung bình |
| 23 | **SES cho email** | Thay SMTP thường bằng Amazon SES | Thấp–TB |
| 24 | **Backup RDS tự động** | Snapshot + restore drill | Trung bình |
| 25 | **WAF / rate limit API** | Chống brute-force login | Trung bình |

### F. Bảo mật & tuân thủ

| # | Đề xuất | Mô tả ngắn | Độ khó |
|---|---------|------------|--------|
| 26 | **2FA (OTP email/app)** | Xác thực 2 bước khi đăng nhập | Trung bình |
| 27 | **Audit log đầy đủ** | Ghi mọi thao tác CRUD quan trọng | Trung bình |
| 28 | **Phân quyền chi tiết (RBAC matrix)** | Permission theo module, không chỉ 3 role | Cao |
| 29 | **Consent & privacy** | Chính sách dữ liệu, xóa tài khoản (GDPR-like) | Trung bình |

### Gợi ý chọn nhanh (nếu chỉ làm thêm 3–5 mục)

1. **QR Check-in** + **GPS (tuỳ chọn)** — demo ấn tượng.  
2. **Export PDF cuối kỳ** + **Certificates** — đúng nghiệp vụ thực tập.  
3. **Kanban task** + **Comment** — UX mentor/SV rõ ràng.  
4. **Email reminder** (SES) — chứng minh tích hợp AWS.  
5. **CI/CD + deploy EC2/RDS** — hoàn thiện phần hạ tầng TV4.

---

## Phụ lục — Stack thực tế

| Thành phần | Công nghệ đang dùng |
|------------|---------------------|
| Frontend | React (Vite) + React Router + Axios |
| Backend | Node.js + Express + Sequelize |
| Database | MySQL |
| Auth | JWT |
| Storage | AWS S3 (có fallback local) |

> **Lưu ý:** `README.md` mô tả kiến trúc kế hoạch (TypeScript, Prisma, PostgreSQL…) có thể khác so với code hiện tại. File này dựa trên **code đang chạy**, không dựa trên blueprint README.

---

## Cách cập nhật file này

Khi hoàn thành một mục, đổi ký hiệu trong bảng tương ứng:

- `❌` / `🔶` → `✅`
- Cập nhật dòng **Ước lượng %** ở đầu file
- Ghi ngày cập nhật ở dòng đầu

---

*File được tạo tự động từ audit codebase theo phân công 4 thành viên.*
