-- ============================================================================
-- Bootstrap script: chạy SAU KHI bạn đã tạo tài khoản admin đầu tiên trên
-- Supabase Dashboard (Authentication → Users → Add user → email + password).
--
-- Thay :ADMIN_EMAIL bằng email của tài khoản admin bạn vừa tạo và chạy đoạn
-- này trong SQL Editor. Nó sẽ tạo bản ghi profile gắn với auth user và set
-- vai trò admin.
-- ============================================================================

-- Cách dùng: bấm "Run" rồi copy email ở dòng `where email = '...'` thành
-- email của bạn.

insert into public.profiles (id, full_name, email, role, is_active, must_change_password)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  'admin'::app_role,
  true,
  false
from auth.users u
where u.email = 'bongluongtm@gmail.com'   -- <-- THAY EMAIL ADMIN CỦA BẠN VÀO ĐÂY
on conflict (id) do update
  set role = excluded.role,
      is_active = true,
      must_change_password = false;
