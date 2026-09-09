# Oẳn Tù Tì — Telegram Mini App

Ứng dụng React/TypeScript + Express/PostgreSQL với chơi máy, phòng đấu, ví nạp/rút được admin duyệt, thưởng ngày, giới thiệu 5 tầng, VIP 30 cấp và bảng xếp hạng.

## Cài đặt

Dùng Node.js 22 (hoặc Node.js từ 20.19). Cài thư viện theo lockfile:

```sh
npm ci
npm --prefix backend ci
npm --prefix frontend ci
```

Sao chép backend/.env.example thành backend/.env và điền cấu hình; frontend dùng frontend/.env.example. Backend không tự đọc .env ở thư mục gốc. Không đưa bí mật vào Git.

Tạo schema/cập nhật DB trước khi chạy:

```sh
npm run build
npm --prefix backend run migrate
npm run dev
```

Frontend: http://localhost:5173. Backend: http://localhost:5000. Chạy thử ngoài Telegram chỉ khi NODE_ENV=development và ALLOW_DEV_AUTH=true với DB thử nghiệm riêng. Đăng nhập admin bằng mật khẩu chỉ khả dụng nếu đã đặt ADMIN_USERNAME/ADMIN_PASSWORD riêng; có thể mở từ màn hình lỗi đăng nhập Telegram.

## Quy tắc hiện tại

- Cả hai bên được giữ đủ tiền trước mỗi ván; Xu giữ không thể rút. Thắng nhận tổng tiền giữ trừ phí 5% mức cược. Hòa hoàn tiền hai bên, không trả hoa hồng hoặc tính doanh số VIP.
- Mỗi ván có 20 giây để chọn; nếu một bên không chọn thì backend tự gán nước thua trước nước đối thủ. Chơi lại cần hai bên đồng ý, bot tự đồng ý; không thể xóa nước đi bằng reset/rời phòng khi ván còn chạy.
- Phòng bot giữ cơ chế tỷ lệ thắng có cấu hình (mặc định 70%). Tài khoản công ty thấy nước đối thủ ngay sau khi nước đó được khóa; giao diện luôn dùng nước đã được backend xác nhận để hiển thị và tính kết quả.
- Điểm xếp hạng thắng +12, thua -8, hòa 0; đây không phải công thức ELO theo chênh lệch đối thủ. Thưởng nhiệm vụ có thể tăng điểm.
- Nạp ngân hàng từ 10.000 VNĐ; USDT từ 0,4 USDT, tỷ giá 25.000 Xu/USDT. Nạp/rút cần admin duyệt; phí rút USDT hiện tại 2 USDT.
- Mỗi khoản nạp được duyệt tạo yêu cầu doanh số cược 1×. Chỉ ván thắng hoặc thua được tính; ván hòa không tính. Khách chỉ tạo lệnh rút khi tiến độ đạt 100% và có thể xem tiến độ trong tab Rút.
- Cấu hình thanh toán lưu trong DB; đích nhận của đơn rút được chụp lại khi tạo. Sổ Xu và ván đã quyết toán không thể sửa/xóa qua ứng dụng.

## Kiểm tra

```sh
npm run check
```

Lệnh này chạy kiểm thử backend trên PostgreSQL nhúng trong bộ nhớ, kiểm thử giao diện, lint và build. Không cần cơ sở dữ liệu thật hoặc token Telegram cho test. CI chạy cùng lệnh trên Node 22.

## Triển khai bản sửa

Đọc [Hướng dẫn áp dụng](HUONG_DAN_AP_DUNG.md) trước khi nâng cấp hệ thống có dữ liệu. Cần thay credential đã lộ ở nhà cung cấp, đặt JWT secret mới, sao lưu và dừng backend cũ trước migration. Startup chỉ kiểm tra phiên bản schema, không tự đổi bảng hoặc xóa dữ liệu theo tên.

[Báo cáo ban đầu](BAO_CAO_QUET_DU_AN.md) mô tả lỗi trước bản sửa; không phải tình trạng mã hiện tại.
