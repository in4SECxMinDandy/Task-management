# Quản Lý Công Việc

Phần mềm desktop (Windows) giao việc cho nhân viên — xây dựng trên **Tauri 2 +
React + shadcn/ui + Supabase (PostgreSQL + Auth + Storage + Realtime)**.

- 2 phân quyền: `admin` và `employee`
- Admin có CRUD tài khoản, giao việc kèm deadline / mô tả / file đính kèm,
  bảng đánh giá hiệu suất nhân viên, dashboard tiến độ
- Nhân viên xem việc của mình, cập nhật tiến độ, nộp file, nhận thông báo
  realtime + Windows toast
- Tài khoản chỉ được tạo bởi admin (không có self-signup)
- Dark mode, giao diện hiện đại như Linear / Vercel

## Cấu trúc repo

```
.
├── app/                       # Tauri + React desktop application
│   ├── src/                   # React source
│   │   ├── components/        # AppLayout, NotificationsBell, RoleGuard, UI primitives
│   │   ├── contexts/          # AuthContext, ThemeContext
│   │   ├── lib/               # supabase client, admin RPC, storage helpers, formatting
│   │   ├── pages/             # LoginPage, TasksPage, TaskDetailPage, ...
│   │   │   └── admin/         # AdminDashboard, EmployeesPage, CreateTaskDialog, ...
│   │   ├── App.tsx            # Router
│   │   ├── main.tsx           # Entry: providers + Toaster
│   │   └── index.css          # Tailwind v4 + shadcn theme tokens
│   ├── src-tauri/             # Rust shell (Tauri 2)
│   ├── package.json
│   └── .env.example           # → copy to .env and fill in Supabase URL/keys
└── supabase/
    ├── migrations/            # SQL migrations (chạy theo thứ tự)
    ├── seed/                  # Bootstrap admin profile
    └── functions/admin-users/ # Edge Function (CRUD tài khoản, dùng service role)
```

## Yêu cầu môi trường

- Node.js 20+ và pnpm 9+
- Rust toolchain (cài qua https://rustup.rs)
- Trên **Windows** không cần thêm gì khác. Trên Linux cần `webkit2gtk`/`rsvg2`
  (dev only) — xem https://tauri.app/start/prerequisites/
- Tài khoản Supabase + project (project hiện tại: `pybmkjhfwxurrlwxhdxo`)
- Supabase CLI (chỉ cần để deploy Edge Function): https://supabase.com/docs/guides/cli

## Setup từng bước

### 1. Cấu hình Supabase database

Mở Supabase Dashboard → **SQL Editor** và chạy lần lượt các file trong
`supabase/migrations/` theo thứ tự tên file:

1. `20250101000000_init_schema.sql` — bảng + enum
2. `20250101000100_helpers.sql` — `is_admin()`
3. `20250101000200_rls.sql` — Row Level Security
4. `20250101000300_triggers.sql` — notifications + audit history
5. `20250101000400_views.sql` — `employee_performance` view
6. `20250101000500_storage.sql` — bucket `task-files` + storage policies

Tất cả script idempotent — chạy lại nhiều lần không sao.

### 2. Tắt self-signup

Dashboard → **Authentication → Providers → Email**:
- Bật `Email`
- Bỏ check **Enable email signup** (hoặc đặt `Allow new users to sign up = OFF`)
- Bỏ check **Confirm email** (theo yêu cầu của bạn — admin tạo và xác nhận)

### 3. Tạo tài khoản admin đầu tiên

a) Dashboard → **Authentication → Users → Add user**, nhập email + password và
   bấm **Auto Confirm User**.

b) Mở `supabase/seed/00-bootstrap-admin.sql`, sửa email trong dòng
   `where u.email = '...'` thành email admin của bạn, rồi chạy trong SQL Editor.

c) Đăng nhập từ app — đó là tài khoản admin. Các nhân viên còn lại sẽ được tạo
   từ trong app (qua Edge Function `admin-users`).

### 4. Deploy Edge Function `admin-users`

```bash
# Đăng nhập + link project (chỉ làm 1 lần)
supabase login
supabase link --project-ref pybmkjhfwxurrlwxhdxo

# Deploy
supabase functions deploy admin-users --project-ref pybmkjhfwxurrlwxhdxo
```

Edge Function tự động đọc `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` từ
project (đã có sẵn — bạn không cần set thêm).

### 5. Chạy desktop app

```bash
cd app
cp .env.example .env          # rồi điền VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
pnpm install
pnpm tauri dev                # mở cửa sổ desktop
```

Build production:

```bash
pnpm tauri build              # tạo file .exe / .msi trong src-tauri/target/
```

## Bảo mật

- `service_role` key **chỉ** sống trong Edge Function — không bao giờ commit và
  không bao giờ nhúng vào desktop app.
- Tất cả bảng đều có RLS bật, nhân viên chỉ thấy task của mình.
- Bucket `task-files` private, frontend dùng signed URL để download.
- Đăng ký công khai bị tắt; admin tạo tài khoản qua Edge Function với
  `email_confirm=true`, nhân viên bắt buộc đổi mật khẩu lần đầu.

## Tính năng

### Admin
- **Dashboard** với 4 KPI (tổng / đang làm / chờ duyệt / hoàn thành), biểu đồ
  pie & bar, cảnh báo task quá hạn.
- **Bảng đánh giá hiệu suất** (`employee_performance` view): điểm 0-100, tỉ lệ
  đúng hạn, tỉ lệ duyệt, số task quá hạn, đánh giá sao 1-5.
- **CRUD nhân viên**: tạo (sinh mật khẩu ngẫu nhiên), chỉnh sửa role/phòng ban,
  reset mật khẩu, vô hiệu hóa / kích hoạt.
- **Trang chi tiết nhân viên**: tab "Đang làm / Quá hạn / Chờ duyệt / Hoàn thành",
  metric tổng quan.
- **Tạo task**: tiêu đề, mô tả, người được giao, deadline, ưu tiên, đính kèm
  nhiều file.
- **Phê duyệt / từ chối** kết quả nộp với ghi chú.

### Nhân viên
- **Dashboard cá nhân**: 5 KPI + danh sách "cần làm gấp".
- **Danh sách công việc** với filter trạng thái + tìm kiếm.
- **Chi tiết task**: cập nhật tiến độ (slider 0-100%), tải file nộp, ghi chú,
  bình luận trao đổi với admin.
- Nhận thông báo realtime + Windows toast khi: được giao việc / được duyệt /
  bị từ chối / có bình luận mới.

### Chung
- Dark mode + light mode (theo hệ thống mặc định).
- Sidebar collapsible.
- Tiếng Việt khắp UI; có thể mở rộng đa ngôn ngữ sau.

## Roadmap (chưa làm)

- Recurring tasks (giao việc lặp lại)
- Group assignment (giao 1 task cho nhiều người)
- Xuất báo cáo Excel/PDF theo khoảng thời gian
- Email notification qua Supabase Edge Function + Resend
- Yêu cầu gia hạn deadline (admin duyệt)
- 2FA cho admin

## Lệnh hữu ích

```bash
cd app
pnpm dev                # dev server (browser, không có Tauri APIs)
pnpm tauri dev          # dev với cửa sổ Tauri (notifications, file dialog)
pnpm build              # vite build (web only, kiểm typecheck)
pnpm tauri build        # build .exe / .msi
pnpm tsc --noEmit       # typecheck
```
