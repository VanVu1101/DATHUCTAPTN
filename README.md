Quy tắc Git để tránh conflict
Cấu trúc branch
main
 develop

 feature/auth
 feature/internship
 feature/report
 feature/dashboard
Quy tắc
Không commit trực tiếp lên main
Chỉ merge vào develop
Tạo Pull Request trước khi merge
Mỗi người chỉ sửa module của mình

Cấu trúc thư mục
Frontend
src/
 ├── api/
 ├── components/
 ├── layouts/
 ├── pages/
 ├── hooks/
 ├── services/
 ├── store/
 └── types/
Backend
src/
 ├── controllers/
 ├── services/
 ├── routes/
 ├── middlewares/
 ├── prisma/
 ├── config/
 └── utils/

Lưu ý quan trọng
chia chức năng thành 2 mức độ:
Bắt buộc
Đăng nhập, phân quyền
Quản lý thực tập sinh
Phân công thực tập
Nhiệm vụ
Báo cáo PDF
Đánh giá
Dashboard
AWS
Nâng cao (làm nếu còn thời gian)
QR Check-in
Huy hiệu thành tích
Chứng nhận hoàn thành
Thông báo thời gian thực
Lịch họp
Ưu tiên hoàn thành phần bắt buộc trước, sau đó mới làm các tính năng nâng cao. Đây là cách làm hiệu quả và an toàn nhất cho đồ án nhóm 4 người.

feature/report
Người 3 phụ trách:
Nhiệm vụ
Báo cáo
Upload PDF lên S3
Đánh giá
Chứng nhận

feature/dashboard
Người 4 phụ trách:
Dashboard
Thông báo
Check-in
CloudWatch
AWS

Quy trình làm việc
main
   ↑
 develop
   ↑
 feature/*
Quy trình chuẩn:
1. Pull code mới nhất từ develop

 2. Code trên feature của mình

 3. Push lên GitHub

 4. Tạo Pull Request vào develop

 5. Trưởng nhóm review

 6. Merge vào develop

 7. Cuối tuần merge develop → main

Khi nào cần tạo thêm nhánh?
Chỉ tạo nhánh tạm thời khi sửa lỗi khẩn cấp:
hotfix/login-bug
Hoặc khi nhiều người cùng làm một module lớn:
feature/report-upload
 feature/report-evaluation

Quy tắc quan trọng để tránh conflict
Không commit trực tiếp vào main.
Không commit trực tiếp vào develop.
Mỗi người chỉ làm việc trên nhánh của mình.
Luôn pull develop trước khi code.
