# Hệ Thống Quản Lý Thực Tập Sinh

Tài liệu này mô tả blueprint kiến trúc thư mục cho hệ thống Quản lý Thực tập Sinh theo hướng tách lớp rõ ràng, dễ mở rộng, phù hợp cho 2 role chính: Student và Enterprise.

## 1. Tổng Quan Công Nghệ

Frontend:
- React + TypeScript + Vite
- Redux Toolkit
- React Router
- Ant Design
- Axios

Backend:
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- AWS S3
- AWS SES
- AWS CloudWatch

## 2. Cấu Trúc Thư Mục Frontend

```text
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── store/
│   │   ├── hooks/
│   │   ├── router/
│   │   └── providers/
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── styles/
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── forms/
│   │   └── feedback/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── internship/
│   │   ├── task-report/
│   │   ├── notification/
│   │   └── schedule/
│   ├── pages/
│   │   ├── auth/
│   │   ├── student/
│   │   ├── enterprise/
│   │   ├── dashboard/
│   │   └── shared/
│   ├── routes/
│   ├── services/
│   │   ├── api/
│   │   ├── auth/
│   │   └── upload/
│   ├── store/
│   │   ├── slices/
│   │   └── middlewares/
│   ├── types/
│   ├── utils/
│   └── constants/
├── .env.example
├── index.html
├── vite.config.ts
└── package.json
```

### Trách nhiệm Frontend

- `app/`: khởi tạo Redux store, router, provider, cấu hình app.
- `assets/`: tài nguyên tĩnh, style nền tảng, biểu tượng, ảnh.
- `components/`: component tái sử dụng theo nhóm chức năng.
- `features/`: logic theo domain, nơi chứa slice, service, component liên quan một module.
- `pages/`: màn hình theo route, chỉ ghép layout và feature.
- `routes/`: định nghĩa route, guard theo role, route động.
- `services/`: tầng giao tiếp API, axios instance, upload service.
- `store/`: Redux slices, middleware, cấu hình trạng thái toàn cục.
- `types/`: type dùng chung cho frontend.
- `utils/`: helper thuần, format, validate, mapping.
- `constants/`: hằng số, role, status, endpoint path, message keys.

## 3. Cấu Trúc Thư Mục Backend

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── express.ts
│   │   ├── routes.ts
│   │   └── middlewares.ts
│   ├── config/
│   │   ├── env.ts
│   │   ├── prisma.ts
│   │   ├── jwt.ts
│   │   ├── aws.ts
│   │   └── logger.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── internships/
│   │   ├── tasks/
│   │   ├── reports/
│   │   ├── evaluations/
│   │   ├── certificates/
│   │   ├── dashboards/
│   │   ├── notifications/
│   │   ├── schedules/
│   │   ├── meetings/
│   │   └── checkin-qr/
│   ├── common/
│   │   ├── errors/
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── constants/
│   │   ├── types/
│   │   └── helpers/
│   ├── infrastructure/
│   │   ├── mail/
│   │   ├── storage/
│   │   ├── cloudwatch/
│   │   └── auth/
│   ├── jobs/
│   ├── docs/
│   ├── tests/
│   └── main.ts
├── .env.example
├── package.json
└── tsconfig.json
```

### Trách Nhiệm Backend

- `app/`: khởi tạo Express app, đăng ký middleware và routes tổng.
- `config/`: cấu hình biến môi trường, Prisma, JWT, AWS, logger.
- `modules/`: mỗi module là một domain nghiệp vụ độc lập, gồm controller, service, repository, route, dto, validation.
- `common/`: mã dùng chung toàn backend như error handler, guard, validator, constants.
- `infrastructure/`: tích hợp hệ thống ngoài như S3, SES, CloudWatch, auth provider.
- `jobs/`: tác vụ nền, gửi email hàng loạt, đồng bộ, clean-up.
- `docs/`: tài liệu API, schema, nghiệp vụ.
- `tests/`: test unit và integration.

## 4. Cấu Trúc Database

### Nhóm bảng chính

```text
users
profiles
roles
student_profiles
enterprise_profiles
majors
positions
internship_periods
internship_assignments
mentors
tasks
weekly_reports
evaluations
certificates
notifications
schedules
meetings
checkin_qr_sessions
refresh_tokens
password_reset_tokens
files
audit_logs
```

### Quan hệ nghiệp vụ chính

- `users` là bảng gốc định danh tài khoản.
- `roles` xác định Student hoặc Enterprise, có thể mở rộng cho admin sau này.
- `profiles` lưu thông tin hồ sơ chung; `student_profiles` và `enterprise_profiles` tách phần riêng theo role.
- `internship_periods` quản lý đợt thực tập.
- `majors` và `positions` là danh mục chuẩn hóa.
- `mentors` gắn người hướng dẫn với doanh nghiệp, đợt thực tập hoặc vị trí.
- `internship_assignments` là bảng trung tâm liên kết sinh viên, doanh nghiệp, đợt thực tập, vị trí và mentor.
- `tasks` là công việc được giao.
- `weekly_reports` là báo cáo tuần của sinh viên.
- `evaluations` là nhận xét/đánh giá theo mốc thời gian hoặc theo đợt.
- `certificates` lưu chứng nhận hoàn thành.
- `notifications`, `schedules`, `meetings` phục vụ dashboard và lịch làm việc.
- `checkin_qr_sessions` quản lý mã QR điểm danh theo phiên.
- `refresh_tokens` và `password_reset_tokens` phục vụ xác thực.
- `files` lưu metadata của avatar, CV, báo cáo, chứng chỉ và tài liệu khác.
- `audit_logs` ghi nhận hành động quan trọng cho kiểm soát và truy vết.

### Gợi ý chuẩn hóa dữ liệu

- Tất cả bảng nghiệp vụ nên có `id`, `created_at`, `updated_at`, `deleted_at` nếu dùng soft delete.
- Dùng `uuid` cho khóa chính để an toàn khi mở rộng hệ thống.
- Dùng enum hoặc bảng danh mục cho các trạng thái như `task_status`, `report_status`, `meeting_status`, `notification_type`.
- Các file upload chỉ lưu metadata trong DB, file thật lưu ở S3.

## 5. Hướng dẫn chạy dự án

### Backend
- Vào thư mục backend:
  - `cd backend`
- Cài đặt dependencies:
  - `npm install`
- Chạy server:
  - `npm run dev`
- Backend sẽ chạy tại:
  - `http://localhost:5000`

### Frontend
- Vào thư mục frontend:
  - `cd frontend`
- Cài đặt dependencies:
  - `npm install`
- Chạy ứng dụng:
  - `npm run dev`
- Frontend sẽ chạy tại:
  - `http://localhost:5173`

### Link mở web
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- Ví dụ API kiểm tra: `http://localhost:5000/api/auth/register`

## 6. Cấu Trúc API

### Base URL

- `api/v1`

### Nhóm API theo module

#### Authentication

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/change-password`
- `GET /auth/me`
- `PATCH /auth/profile`
- `POST /auth/avatar`
- `POST /auth/cv`

#### Internship Management

- `GET /internships/periods`
- `POST /internships/periods`
- `GET /internships/majors`
- `POST /internships/majors`
- `GET /internships/positions`
- `POST /internships/positions`
- `GET /internships/mentors`
- `POST /internships/mentors`
- `POST /internships/assignments`
- `GET /internships/assignments`
- `PATCH /internships/assignments/:id`

#### Task & Report

- `GET /tasks`
- `POST /tasks`
- `PATCH /tasks/:id`
- `DELETE /tasks/:id`
- `GET /reports/weekly`
- `POST /reports/weekly`
- `PATCH /reports/weekly/:id`
- `GET /evaluations`
- `POST /evaluations`
- `GET /certificates`
- `POST /certificates`

#### Dashboard & Notification

- `GET /dashboard/student`
- `GET /dashboard/enterprise`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `GET /schedules`
- `POST /schedules`
- `GET /meetings`
- `POST /meetings`
- `POST /checkin-qr/generate`
- `POST /checkin-qr/scan`

### Quy ước API

- Tách route theo module, không gom toàn bộ vào một file lớn.
- API trả về payload thống nhất theo format `success`, `message`, `data`, `errors`.
- Dùng middleware xác thực JWT cho route bảo vệ.
- Dùng middleware phân quyền theo role cho Student và Enterprise.
- Dùng validation cho body, query, params trước khi vào service.

## 6. Naming Convention

### Frontend

- Component: `PascalCase`.
- Hook: `useSomething`.
- File component: `PascalCase.tsx`.
- Slice: `something.slice.ts`.
- Service: `something.service.ts`.
- Page: `SomethingPage.tsx`.
- CSS module hoặc style file: `something.module.scss` hoặc theo chuẩn dự án chọn.
- Constant: `UPPER_SNAKE_CASE`.

### Backend

- Folder/module: `kebab-case` hoặc `plural noun` nhất quán trong toàn dự án.
- Controller: `something.controller.ts`.
- Service: `something.service.ts`.
- Repository: `something.repository.ts`.
- Route: `something.route.ts`.
- DTO/Schema: `something.dto.ts` hoặc `something.schema.ts`.
- Middleware: `something.middleware.ts`.
- Helper: `something.helper.ts`.

### Database

- Table: `snake_case`, số nhiều.
- Column: `snake_case`.
- Foreign key: `<referenced_table>_id`.
- Index: `idx_<table>_<column>`.
- Unique constraint: `uq_<table>_<column>`.

## 7. Folder Responsibility

### Frontend

- `pages/` không chứa business logic nặng.
- `features/` là nơi đặt logic nghiệp vụ theo module.
- `components/common/` chỉ chứa component trung tính, không phụ thuộc module.
- `services/api/` chịu trách nhiệm cấu hình Axios, interceptors, refresh token nếu có.
- `store/` chỉ quản lý state toàn cục và side effects liên quan Redux.

### Backend

- `modules/` là lớp điều phối nghiệp vụ chính.
- `common/` chỉ dùng cho logic chung, không phụ thuộc domain.
- `infrastructure/` là lớp tích hợp external service.
- `config/` không chứa logic nghiệp vụ.
- `prisma/` chỉ mô tả schema và migration.

## 8. Phân Rã Theo Role

### Student

- Đăng nhập, đăng xuất, quên mật khẩu, đổi mật khẩu.
- Quản lý hồ sơ cá nhân, avatar, CV.
- Xem thông tin đợt thực tập, nhiệm vụ, báo cáo tuần, đánh giá, chứng chỉ.
- Xem dashboard, thông báo, lịch, cuộc họp, QR check-in.

### Enterprise

- Đăng nhập, đăng xuất, quên mật khẩu, đổi mật khẩu.
- Quản lý hồ sơ doanh nghiệp, mentor, vị trí tuyển thực tập.
- Xem và phân công thực tập sinh, quản lý task, báo cáo, đánh giá.
- Xem dashboard, thông báo, lịch, cuộc họp, QR check-in.

## 9. Gợi Ý Tổ Chức Phát Triển

- Bắt đầu từ `auth`, `users`, `profiles`, `files`.
- Sau đó triển khai `internships` và `assignments`.
- Tiếp theo là `tasks`, `reports`, `evaluations`, `certificates`.
- Cuối cùng hoàn thiện `dashboard`, `notifications`, `schedules`, `meetings`, `checkin-qr`.

## 10. Kết Luận

Kiến trúc này ưu tiên tách domain rõ ràng, dễ mở rộng, phù hợp triển khai theo nhóm và dễ bảo trì lâu dài. Frontend và backend đều được tổ chức theo module nghiệp vụ thay vì gom theo kiểu kỹ thuật đơn thuần, giúp hệ thống thích ứng tốt khi số lượng tính năng tăng lên.
