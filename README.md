# 🚀 Task Management System (Quản Lý Nhân Viên)

Một phần mềm desktop (Windows) hiện đại dành cho quản lý và giao việc cho nhân viên. Được thiết kế với giao diện thân thiện, hiệu năng cao và bảo mật chặt chẽ.

![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=for-the-badge&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19.0-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)

---

## 🌟 Giới thiệu chung

Dự án này là một ứng dụng Desktop được phát triển đặc biệt để tối ưu hóa quy trình quản lý công việc trong nội bộ doanh nghiệp. Hệ thống được chia làm hai phân quyền rõ ràng: **Admin** (Quản trị viên) và **Employee** (Nhân viên).

Hệ thống cung cấp một quy trình khép kín: từ việc tạo tài khoản cho nhân viên, giao việc kèm tài liệu, theo dõi tiến độ theo thời gian thực (realtime), đánh giá hiệu suất, cho đến khi hoàn thành và lưu trữ.

## 🛠 Công nghệ sử dụng

Dự án áp dụng các công nghệ hiện đại nhất để đảm bảo hiệu suất và trải nghiệm người dùng:

- **Frontend & Desktop App**:
  - **Tauri 2**: Framework tạo ứng dụng Desktop nhẹ, nhanh và an toàn bằng Rust.
  - **React 19**: Xây dựng giao diện người dùng (UI).
  - **Vite**: Build tool cực nhanh.
  - **Tailwind CSS v4 & shadcn/ui**: Thiết kế giao diện hiện đại (giao diện lấy cảm hứng từ Linear/Vercel) hỗ trợ sẵn Dark/Light mode.
  - **Zustand & React Query**: Quản lý state và data fetching.
- **Backend & Database**:
  - **Supabase**: Nền tảng Backend-as-a-Service (BaaS) mã nguồn mở.
  - **PostgreSQL**: Cơ sở dữ liệu quan hệ mạnh mẽ.
  - **Supabase Auth & RLS**: Quản lý xác thực và phân quyền truy cập dữ liệu ở cấp độ dòng (Row Level Security).
  - **Supabase Storage**: Lưu trữ file đính kèm an toàn.
  - **Supabase Edge Functions**: Xử lý logic backend (ví dụ: tạo tài khoản nhân viên từ phía Admin).

## ✨ Tính năng nổi bật

### 👨‍💼 Dành cho Admin (Quản trị viên)
- **Dashboard Tổng Quan**: Cung cấp các chỉ số KPI theo thời gian thực (tổng số việc, đang làm, chờ duyệt, hoàn thành). Tích hợp biểu đồ trực quan (Pie & Bar chart) và cảnh báo công việc quá hạn.
- **Quản lý Nhân viên**: Tạo mới, chỉnh sửa thông tin (vai trò, phòng ban), cấp lại mật khẩu, vô hiệu hóa hoặc kích hoạt tài khoản.
- **Đánh giá Hiệu suất (KPI)**: Hệ thống tự động tính điểm từ 0-100 dựa trên: tỷ lệ đúng hạn, tỷ lệ duyệt thành công, số task quá hạn và đánh giá (1-5 sao).
- **Giao việc (Task Management)**: Tạo công việc mới với tiêu đề, mô tả chi tiết, người thực hiện, thời hạn (deadline), mức độ ưu tiên và cho phép đính kèm nhiều file.
- **Quy trình Phê duyệt**: Xem xét kết quả nộp từ nhân viên, tải file báo cáo, thêm ghi chú/bình luận và quyết định Phê duyệt (Approve) hoặc Từ chối (Reject) yêu cầu làm lại.

### 👨‍💻 Dành cho Employee (Nhân viên)
- **Dashboard Cá nhân**: Theo dõi tiến độ công việc của bản thân, xem nhanh danh sách các việc "cần làm gấp" (sắp đến hạn).
- **Bảng Công việc**: Xem danh sách các công việc được giao, hỗ trợ bộ lọc theo trạng thái và công cụ tìm kiếm.
- **Báo cáo Tiến độ**: Cập nhật % tiến độ thực hiện thông qua thanh trượt (slider 0-100%).
- **Nộp Báo Cáo**: Nộp kết quả công việc kèm file đính kèm, thêm ghi chú và trao đổi bình luận trực tiếp với Admin.
- **Thông báo Realtime**: Nhận thông báo tức thì (kèm Windows Toast notification) khi có việc mới, thay đổi trạng thái duyệt, hoặc có bình luận mới.

---

## 📂 Cấu trúc mã nguồn

```text
📦 Task-management
├── 📁 app/                       # Ứng dụng Frontend & Desktop (Tauri + React)
│   ├── 📁 src/                   # Mã nguồn React
│   │   ├── 📁 components/        # Các UI Components (Layout, Notification, UI primitives...)
│   │   ├── 📁 contexts/          # Context API (Auth, Theme...)
│   │   ├── 📁 lib/               # Utility functions, Supabase Client, API helpers
│   │   └── 📁 pages/             # Các trang giao diện (Login, Tasks, Dashboard...)
│   │       └── 📁 admin/         # Các trang dành riêng cho Admin
│   ├── 📁 src-tauri/             # Mã nguồn Rust cho Desktop shell
│   ├── 📄 package.json           # Khai báo thư viện & scripts cho Frontend
│   └── 📄 .env.example           # File mẫu chứa biến môi trường
└── 📁 supabase/                  # Cấu hình & Logic Backend
    ├── 📁 migrations/            # Các file SQL để khởi tạo Database, Tables, RLS, Triggers
    ├── 📁 seed/                  # Script tạo dữ liệu mẫu (Tạo Admin ban đầu)
    └── 📁 functions/             # Mã nguồn Supabase Edge Functions
        └── 📁 admin-users/       # API xử lý CRUD tài khoản người dùng
```

## ⚙️ Yêu cầu hệ thống (Prerequisites)

Để phát triển hoặc build dự án, bạn cần cài đặt:
- **Node.js**: Phiên bản 20 trở lên.
- **pnpm**: Trình quản lý package (phiên bản 9+).
- **Rust Toolchain**: Cài đặt thông qua [rustup.rs](https://rustup.rs/) (Yêu cầu bắt buộc để chạy/build Tauri).
  - *Trên Windows*: Cần cài đặt thêm C++ Build Tools (Visual Studio).
  - *Trên Linux*: Cần cài đặt `webkit2gtk` và `rsvg2`.
- **Tài khoản Supabase**: Đã tạo project trên [Supabase](https://supabase.com/).
- **Supabase CLI**: Dành cho việc deploy Edge Functions.

---

## 🚀 Hướng dẫn Cài đặt & Triển khai

### Bước 1: Khởi tạo Database trên Supabase
1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard) và chọn Project của bạn.
2. Mở mục **SQL Editor**.
3. Mở toàn bộ file trong thư mục `supabase/migrations/` và chạy lần lượt theo thứ tự tên file:
   - `1. 20250101000000_init_schema.sql` (Tạo bảng & Enum)
   - `2. 20250101000100_helpers.sql` (Hàm tiện ích `is_admin()`)
   - `3. 20250101000200_rls.sql` (Bật Row Level Security)
   - `4. 20250101000300_triggers.sql` (Triggers cho hệ thống thông báo và Audit log)
   - `5. 20250101000400_views.sql` (View thống kê hiệu suất `employee_performance`)
   - `6. 20250101000500_storage.sql` (Tạo bucket `task-files` và cấu hình bảo mật file)
   - `7. 20250101000600_fix_view_security.sql` (Đảm bảo view chạy theo quyền người gọi)
   - `8. 20250101000700_security_hardening.sql` (Chặn leo quyền và tự duyệt task)
   - `9. 20250101000800_audit_log.sql` (Nhật ký thao tác quản trị)
   - `10. 20250101000900_multi_assignee.sql` (Hỗ trợ giao nhiều người)
   - `11. 20250101001000_fix_change_password_rpc.sql` (RPC đổi mật khẩu lần đầu)
   - `12. 20250101001100_active_user_rls.sql` (Chặn tài khoản vô hiệu truy cập dữ liệu nghiệp vụ)
   - `13. 20250101001200_function_lint_hardening.sql` (Giảm cảnh báo Supabase linter cho SQL functions)

### Bước 2: Cấu hình Authentication (Tắt tự do đăng ký)
Hệ thống này chỉ cho phép Admin tạo tài khoản.
1. Tại Supabase Dashboard, vào **Authentication** -> **Providers** -> **Email**.
2. **Bật** tính năng Email provider.
3. **Tắt** `Enable email signup` (hoặc đặt `Allow new users to sign up = OFF`).
4. **Tắt** `Confirm email` (Admin sẽ tự động xác nhận khi tạo tài khoản cho nhân viên).

### Bước 3: Khởi tạo tài khoản Admin đầu tiên
1. Vào **Authentication** -> **Users** -> **Add user**.
2. Nhập Email & Password cho Admin, sau đó chọn **Auto Confirm User**.
3. Mở file `supabase/seed/00-bootstrap-admin.sql`.
4. Tìm dòng `where u.email = '...'` và thay thế bằng Email Admin bạn vừa tạo.
5. Chạy đoạn SQL này trong **SQL Editor** để cấp quyền Admin cho tài khoản.

### Bước 4: Deploy Edge Function
Hàm `admin-users` được dùng để Admin thao tác với tài khoản nhân viên (sử dụng Service Role Key).
```bash
# Đăng nhập Supabase CLI (Chỉ cần làm 1 lần)
supabase login

# Liên kết với Project của bạn (Thay <PROJECT_REF> bằng ID dự án của bạn)
supabase link --project-ref <PROJECT_REF>

# Deploy Edge Function
supabase functions deploy admin-users --project-ref <PROJECT_REF>
```

### Bước 5: Cấu hình Môi trường Frontend
```bash
cd app

# Sao chép file môi trường mẫu
cp .env.example .env

# Mở file .env và điền thông tin:
# VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Cài đặt thư viện
pnpm install
```

---

## 💻 Hướng dẫn Chạy & Build Dự án

Sau khi hoàn tất cấu hình, bạn có thể sử dụng các lệnh sau trong thư mục `app`:

```bash
# Chạy dự án trên Trình duyệt (Chỉ test UI, không có API của Tauri)
pnpm dev

# Chạy dự án dưới dạng Desktop App (Có đầy đủ tính năng hệ thống, Windows notification)
pnpm tauri dev

# Kiểm tra lỗi TypeScript
pnpm tsc --noEmit

# Build ứng dụng Desktop thành file cài đặt (.exe / .msi)
# (Yêu cầu phải cài đặt Rust & C++ Build Tools thành công)
pnpm tauri build
```

---

## 🔄 Tự động cập nhật (OTA Update)

Hệ thống sử dụng [Tauri Updater Plugin](https://v2.tauri.app/plugin/updater/) để mỗi khi bạn (Admin) đẩy phiên bản mới lên GitHub Releases, người dùng chỉ cần vào **Cài đặt → Phiên bản & cập nhật → Kiểm tra cập nhật** là ứng dụng tự tải, tự cài và tự khởi động lại.

### Cách hoạt động

1. App đọc file `latest.json` trên GitHub Releases (`releases/latest/download/latest.json`).
2. So sánh `version` trong file đó với version hiện tại trong `tauri.conf.json`.
3. Nếu mới hơn, tải `*.nsis.zip` về (đã được ký số), xác minh chữ ký bằng public key gắn trong app, rồi chạy installer ở chế độ `passive`.
4. App tự `relaunch()` sau khi cài xong.

### Bước 1 — Sinh cặp khóa ký (CHỈ LÀM 1 LẦN)

Trên máy của Admin, chạy:

```powershell
cd app
pnpm tauri signer generate -w ./tauri-update.key
```

Lệnh này tạo ra:

- `tauri-update.key` — **khóa riêng tư**, KHÔNG ĐƯỢC commit, KHÔNG ĐƯỢC chia sẻ.
- `tauri-update.key.pub` — **khóa công khai** (an toàn để chia sẻ).

CLI sẽ hỏi bạn đặt mật khẩu cho khóa riêng (có thể để trống nếu chỉ cá nhân dùng, nhưng khuyến nghị có).

> File `tauri-update.key*` đã được liệt kê trong `.gitignore` để tránh lỡ commit.

### Bước 2 — Dán public key vào `tauri.conf.json`

Mở `app/tauri-update.key.pub`, copy nguyên dòng base64 (KHÔNG bao gồm dòng `untrusted comment:` ở đầu) rồi dán vào trường `plugins.updater.pubkey` trong `app/src-tauri/tauri.conf.json`, thay thế chuỗi `REPLACE_WITH_TAURI_PUBKEY_FROM_KEYGEN`:

```jsonc
"plugins": {
  "updater": {
    "endpoints": [
      "https://github.com/<owner>/<repo>/releases/latest/download/latest.json"
    ],
    "pubkey": "dW50cnVzdGVkI...DÁN_PUBLIC_KEY_VÀO_ĐÂY",
    "windows": { "installMode": "passive" }
  }
}
```

> Nếu bạn fork sang user/repo khác, nhớ chỉnh `endpoints` cho khớp.

### Bước 3 — Đăng ký GitHub Secrets

Vào **Settings → Secrets and variables → Actions** của repo, thêm:

| Secret | Giá trị |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Toàn bộ nội dung file `app/tauri-update.key` (mở bằng Notepad, copy hết, kể cả các dòng `untrusted comment:` và base64). |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Mật khẩu bạn đã đặt ở Bước 1 (để trống nếu không đặt). |

(Tuỳ chọn) `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` nếu bạn không muốn dùng giá trị mặc định trong workflow.

### Bước 4 — Phát hành phiên bản mới

Mỗi lần ra phiên bản:

1. Bump version ở **2 chỗ** cho khớp:
   - `app/package.json` → `"version": "0.1.2"`
   - `app/src-tauri/tauri.conf.json` → `"version": "0.1.2"`
2. Commit và tạo tag `v0.1.2`:

   ```powershell
   git add -A
   git commit -m "chore: release v0.1.2"
   git tag v0.1.2
   git push origin main --tags
   ```

3. GitHub Actions (`.github/workflows/release.yml`) sẽ tự động:
   - Build app trên Windows
   - Ký bundle `.nsis.zip` bằng `TAURI_SIGNING_PRIVATE_KEY`
   - Tạo GitHub Release `v0.1.2`
   - Đính kèm `.exe`, `.nsis.zip`, `.nsis.zip.sig` và sinh `latest.json`

4. Người dùng đang chạy phiên bản cũ sẽ thấy bản mới khi bấm **Cài đặt → Kiểm tra cập nhật**.

### Bước 5 — Trigger thủ công (nếu không muốn tag)

Vào tab **Actions → Release Windows .exe → Run workflow**, nhập tag (vd: `v0.1.2`) — workflow sẽ tạo release với tag đó. Nếu để trống, workflow chỉ build artifact mà không phát hành.

### Lưu ý

- Public key nhúng trong app KHÔNG ĐƯỢC ĐỔI sau khi đã có người dùng cài. Nếu đổi, các bản cài cũ sẽ không thể xác minh bản update mới. Hãy backup `tauri-update.key` ở nơi an toàn.
- Bản đầu tiên (ví dụ `v0.1.1`) phải được người dùng cài thủ công bằng `.exe`. OTA chỉ áp dụng từ bản kế tiếp trở đi.
- Nếu thấy lỗi `signature error`/`invalid signature`: thường là pubkey trong `tauri.conf.json` không khớp với private key đã ký bundle.

---

## 🛡 Kiến trúc Bảo mật

- **Service Role Key**: Chỉ tồn tại trong môi trường an toàn của Edge Function. Tuyệt đối không được đính kèm vào ứng dụng Desktop hay Frontend.
- **Row Level Security (RLS)**: Tất cả các bảng dữ liệu đều được bảo vệ bằng RLS. Nhân viên chỉ có quyền truy xuất (Xem/Cập nhật) các task được giao trực tiếp cho họ.
- **Bảo mật File**: Bucket `task-files` được đặt ở chế độ private. Người dùng chỉ có thể upload/download file thông qua các Signed URLs có thời hạn.
- **Quản lý Tài khoản**: Không có trang đăng ký tự do. Chỉ Admin mới có quyền tạo mới, chỉnh sửa hoặc vô hiệu hóa tài khoản thông qua Edge Function.

---

## 🗺 Roadmap (Kế hoạch Phát triển)

- [ ] Hỗ trợ Giao việc định kỳ (Recurring tasks).
- [ ] Giao một công việc cho một nhóm (Group assignment).
- [ ] Tính năng xuất báo cáo Excel/PDF theo khoảng thời gian tùy chọn.
- [ ] Gửi Email thông báo (sử dụng Supabase Edge Function + Resend/SendGrid).
- [ ] Nhân viên có thể yêu cầu gia hạn Deadline (chờ Admin duyệt).
- [ ] Xác thực 2 bước (2FA) bắt buộc dành cho Admin.