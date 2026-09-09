# Áp dụng bản sửa 07/09/2026

## Phạm vi

Đã sửa mã cho các mục 1–6 và 8–12 trong BAO_CAO_QUET_DU_AN.md. Giữ cơ chế mục 7: tài khoản công ty xem nước đi; bot chọn nước theo tỷ lệ thắng cấu hình, mặc định 70%. Cấu hình bot nay đọc từ DB để không mất sau restart; quy tắc chọn nước được giữ nguyên.

## Các thay đổi ảnh hưởng cách vận hành

- Telegram sai chữ ký bị từ chối. HMAC có tính trường signature khi Telegram gửi kèm, theo [tài liệu Telegram](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
- API cộng Xu thử nghiệm đã bị gỡ. Xu được ghi nhận qua giao dịch được duyệt, thưởng hợp lệ hoặc điều chỉnh quản trị có lịch sử.
- Mật khẩu admin mặc định bị vô hiệu hóa. Khi không cấu hình ADMIN_USERNAME/ADMIN_PASSWORD, dùng tài khoản Telegram admin. Tài khoản bị khóa không dùng được token cũ.
- Trước mỗi ván, hệ thống trừ tạm mức cược của cả hai người khỏi số dư có thể rút. Người thắng nhận lại tổng tiền giữ trừ phí; hòa hoàn tiền hai bên, không phí, không hoa hồng và không tính doanh số VIP.
- Chơi lại yêu cầu hai người đồng ý; bot tự đồng ý. Không thể reset/rời ván đang chạy để xóa nước đi. Khi người dùng đóng ứng dụng, máy chủ vẫn xử lý hết giờ; tiền được quyết toán theo quy tắc timeout hiện có.
- Mỗi ván có số thứ tự, thời hạn chọn 20 giây và bản ghi quyết toán riêng. Khách thường không chọn đúng hạn sẽ thua trước nước đã khóa của đối thủ. Tài khoản công ty không bị xử thua do hết thời gian, nhận nước đối thủ với chu kỳ cập nhật dưới một giây và được chọn hoặc đổi nước trong 10 giây chờ mở kết quả; phía khách được báo như cả hai đã khóa. Nước cuối cùng của tài khoản công ty mới được quyết toán. Gửi lặp không trả tiền lần hai. Giữ khóa trong DB cho các thao tác phòng nhằm tránh ghi đè khi nhiều yêu cầu đến đồng thời.
- Sổ biến động Xu và ván đã quyết toán không cho sửa/xóa. Chức năng xóa tài khoản chuyển thành vô hiệu hóa, giữ số dư/lịch sử. Nút xóa toàn bộ lịch sử đã gỡ.
- Cấu hình nhận tiền đọc từ DB trước biến môi trường; không dùng tài khoản nhận tiền mẫu. Mức nạp USDT là 0,4–4.000 USDT (10.000–100.000.000 Xu). Tài khoản nhận tiền của khách chỉ liên kết được một lần, sau đó cả API và giao diện đều khóa sửa đổi. Đơn rút mới lưu nơi nhận tiền tại thời điểm tạo.
- Mỗi khoản nạp được duyệt tăng doanh số cược bắt buộc đúng bằng số Xu nạp. Chỉ ván có kết quả thắng hoặc thua làm tăng tiến độ; hòa không tính. Cược trước khoản nạp không được dùng trước cho khoản nạp mới. Backend chặn lệnh rút khi chưa đủ và ví hiển thị tiến độ.
- Sảnh không khởi tạo 40 bot trong từng request. Tác vụ nền bổ sung phòng mỗi 15 giây và kiểm tra hết giờ mỗi giây. Đọc hồ sơ không đếm lại toàn bộ lịch sử trận.

## Những việc cần thực hiện ở môi trường triển khai

1. Thay mật khẩu/credential PostgreSQL đã xuất hiện trong mã cũ tại nhà cung cấp DB. Bản sửa không thể thu hồi credential bằng cách xóa chuỗi khỏi Git. Kiểm tra truy cập bất thường và rà soát lịch sử Git/bản build đã chia sẻ.
2. Tạo JWT_SECRET mới, cập nhật cấu hình triển khai; token cũ sẽ không dùng được. Nếu dùng đăng nhập admin bằng mật khẩu, đặt mật khẩu riêng ít nhất 12 ký tự. Không dùng lại giá trị đã công khai.
3. Cấu hình backend theo backend/.env.example và frontend theo frontend/.env.example. Backend đọc backend/.env; .env ở thư mục gốc không thay thế tệp này. FRONTEND_URL dùng origin chính xác; DB TLS xác minh chứng chỉ, có thể cần DATABASE_CA_CERT với CA riêng.
4. Sao lưu DB, dừng các phiên bản backend cũ/traffic trước khi migration. Không chạy ứng dụng cũ đồng thời với ứng dụng mới vì cơ chế giữ tiền đã thay đổi.
5. Chạy `npm ci`, `npm --prefix backend ci`, `npm --prefix frontend ci`, rồi `npm run check` và `npm run build`.
6. Với DATABASE_URL đúng môi trường cần nâng cấp, chạy `npm --prefix backend run migrate`. Đây là lệnh có thay đổi DB. Migration có phiên bản và transaction; chạy lại không tạo lại sổ mở đầu.
7. Khởi động backend mới bằng `npm --prefix backend start`, triển khai frontend mới cùng thời điểm. Worker phòng chạy trong backend. Khi máy chủ ngừng, các ván hết hạn được xử lý sau khi máy chủ trở lại.
8. Kiểm tra Telegram và giao dịch thử có kiểm soát: đăng nhập, cược, hòa, hết giờ, chơi lại, nạp 0,4 USDT, tạo/rút/từ chối đơn, cấu hình nhận tiền sau restart.

## Dữ liệu cũ và giới hạn

- Migration đánh dấu hết hạn các phòng ready cũ chưa giữ tiền, không trừ/cộng số dư cho các phòng này. Người dùng tạo phòng mới sau nâng cấp.
- Mỗi tài khoản có bản ghi opening_balance bằng số dư lúc migration. Không tự bịa lại các biến động đã mất trong lịch sử cũ.
- Thống kê phí/lợi nhuận từng ván tính từ ngày migration và hiển thị mốc này. Lịch sử cũ vẫn giữ nhưng không đủ dữ liệu để khôi phục phí của tất cả ván đã bị ghi đè trước bản sửa.
- Bộ test tích hợp mặc định dùng PostgreSQL nhúng PGlite trong bộ nhớ, thực thi SQL, transaction, constraint và trigger thực. Adapter xếp hàng transaction vì PGlite chỉ có một kết nối; đây không phải kiểm thử tải/khóa đa kết nối của máy chủ PostgreSQL thật.
- Chưa thực hiện migration trên DB thật, triển khai, thay credential tại nhà cung cấp hoặc kiểm thử trong Telegram trên điện thoại. Đây là các thao tác môi trường, tách khỏi bản sửa mã đã thực hiện.
- Khóa chung cho quyết toán phòng ưu tiên tính đúng đắn; cần đo tải thực tế trước khi chuyển sang khóa chi tiết để mở rộng quy mô.

## Kiểm tra tự động

`npm run check` chạy kiểm thử backend, kiểm thử giao diện, lint và build frontend. CI trong .github/workflows/check.yml chạy cùng quy trình trên Node 22. Backend test không dùng DATABASE_URL thật và không gửi thông báo Telegram.

Các trường hợp gồm: HMAC và dữ liệu giả, thiếu secret production, CORS, tài khoản khóa, route topup bị gỡ, giữ tiền/rút tiền, request lặp, cạnh tranh vào phòng, chơi lại/hòa/hết giờ, cấu hình bền vững, quyền công ty và bot giữ nguyên, địa chỉ rút cố định, duyệt/từ chối một lần, đối soát sổ Xu và lợi nhuận nhà.

Kết quả trên máy ngày 09/09/2026: 18 kiểm thử backend và 12 kiểm thử giao diện đạt; lint và build đạt. Npm audit của backend/frontend không còn cảnh báo sau khi cập nhật thư viện. Kiểm tra này không chứng minh toàn bộ hệ thống không có lỗ hổng và không thay thế kiểm tra môi trường triển khai.
