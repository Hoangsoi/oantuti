# Báo cáo quét dự án Oẳn Tù Tì

> Báo cáo này ghi nhận tình trạng trước bản sửa. Các mục 1–6 và 8–12 đã được xử lý ở mã nguồn trong phiên tiếp theo; mục 7 được giữ theo yêu cầu. Xem HUONG_DAN_AP_DUNG.md để biết thay đổi, kiểm tra và các bước còn cần thực hiện trên môi trường triển khai.

Ngày đánh giá: 07/09/2026. Phạm vi: mã nguồn và cấu hình trong workspace hiện tại, biên dịch cục bộ và kiểm thử có sẵn. Không truy cập cơ sở dữ liệu hoặc gọi dịch vụ vận hành thật. Các lỗi luồng nghiệp vụ dưới đây được xác định bằng đọc mã, chưa tái hiện trên cơ sở dữ liệu thử nghiệm.

## Kết luận

Dự án có bộ chức năng khá rộng và biên dịch thành công, nhưng **chưa sẵn sàng vận hành nạp/rút và cược có giá trị thực**. Các điểm chặn chính là bỏ qua xác thực Telegram, tự cộng Xu qua API, bí mật nằm trong mã nguồn và thanh toán cược không giữ tiền trước trận.

## Tổng quan

- Frontend: React 18, TypeScript, Vite, Tailwind; 11 trang gồm trang chủ, chơi máy, phòng, sảnh, kết quả, ví, hồ sơ, giới thiệu, nhiệm vụ, bảng xếp hạng và quản trị.
- Backend: Express, TypeScript, PostgreSQL, JWT, Zod; tách routes/controllers/services/middleware.
- Chức năng được triển khai trong mã: đăng nhập Telegram, chơi máy, PvP và phòng bot, nạp/rút thủ công, duyệt giao dịch, quản lý người dùng, hoa hồng 5 tầng, VIP 30 cấp, thưởng ngày và thông báo bot Telegram.
- Đã lập danh mục 76 tệp trong hai thư mục src. Không tìm thấy AGENTS.md trong dự án.
- Điểm tốt: phần lớn SQL nhận tham số; các luồng rút tiền, duyệt/từ chối giao dịch, thưởng VIP sử dụng transaction và khóa dòng; thưởng ngày có ràng buộc duy nhất; có kiểm tra đầu vào, giới hạn tần suất và giới hạn dung lượng body.

## Phát hiện theo ưu tiên

P0: cần xử lý ngay trước khi mở hệ thống. P1: ảnh hưởng nghiêm trọng đến tính đúng đắn hoặc kiểm soát truy cập. P2: cần cải thiện để vận hành ổn định.

### 1. P0 — Bỏ qua chữ ký Telegram, có thể mạo danh cả admin

`backend/src/services/auth.service.ts:40–45` vẫn lấy JSON user từ initData khi xác thực thất bại, kể cả production. Sau đó hệ thống tìm/tạo người dùng và cấp JWT. Quyền admin dựa trên telegram_id ở `backend/src/middleware/admin.middleware.ts` nên lỗi này có thể dẫn đến quyền duyệt tiền, chỉnh số dư và xóa dữ liệu.

Khắc phục: từ chối ngay khi chữ ký không hợp lệ, kiểm tra cấu trúc user và thời hạn; mock chỉ được bật rõ ràng trong môi trường phát triển. Bổ sung kiểm thử toàn luồng đăng nhập với dữ liệu giả mạo, không chỉ kiểm thử hàm HMAC.

### 2. P0 — API tự cộng Xu không cần thanh toán

`backend/src/routes/me.ts:8` mở POST /api/me/topup cho mọi tài khoản đăng nhập. `backend/src/services/me.service.ts:51` cộng trực tiếp từ 100 đến 100.000 Xu mỗi lần, không có điều kiện môi trường, duyệt admin hoặc bằng chứng thanh toán. Xu này nằm cùng số dư dùng để cược và yêu cầu rút.

Khắc phục: loại bỏ đường cộng Xu thử nghiệm khỏi production; nếu cần tiền demo, tách hẳn khỏi số dư có thể rút. Mọi biến động tiền phải có nguồn và bản ghi đối soát.

### 3. P0 — Thông tin nhạy cảm và giá trị mặc định không an toàn

`backend/src/config/index.ts:6–14` chứa chuỗi kết nối PostgreSQL có tên đăng nhập/mật khẩu và JWT secret mặc định. `backend/src/services/admin.service.ts:7–8` có thông tin đăng nhập admin mặc định. Báo cáo không sao chép các bí mật này. Chưa kiểm tra chúng còn hiệu lực hay môi trường triển khai có ghi đè hay không.

Khắc phục: thay thông tin DB đã lộ; thay JWT secret và thu hồi phiên cũ khi phù hợp; bắt buộc cấu hình bí mật khi khởi động production, không dùng fallback. Kiểm tra lịch sử Git và bản build đã chia sẻ để xử lý phạm vi lộ lọt.

### 4. P1 — Cược không giữ tiền, có thể tạo Xu không được bảo đảm

`backend/src/services/room.service.ts:251` chỉ kiểm tra số dư lúc tham gia, không giữ tiền. Khi quyết toán, dòng 553/562 dùng GREATEST(0, coins - bet), trong khi người thắng vẫn nhận đủ khoản thắng. Chơi lại không kiểm tra lại số dư. Nếu người thua đã tiêu/rút tiền hoặc tiếp tục chơi khi hết Xu, hệ thống vẫn trả thưởng đầy đủ và chỉ trừ đến 0.

Khắc phục: giữ đủ tiền hai bên trong transaction trước mỗi ván; thanh toán từ khoản giữ; khóa người dùng theo thứ tự nhất quán; kiểm tra số dư và trạng thái ở mỗi lần chơi lại.

### 5. P1 — Khóa tài khoản chưa được thực thi

`backend/src/services/admin.service.ts:235` đổi is_blocked nhưng `backend/src/middleware/auth.middleware.ts:35` vẫn chấp nhận người dùng mà không kiểm tra cờ này. Không tìm thấy bước từ chối tài khoản bị khóa ở các luồng nghiệp vụ.

Khắc phục: chặn tập trung tại middleware và đăng nhập, kiểm thử token đã được cấp trước khi khóa.

### 6. P1 — Trạng thái phòng dễ bị ghi đè và bỏ dở

`backend/src/services/room.service.ts:251` đọc rồi cập nhật khách vào phòng mà không khóa dòng hoặc UPDATE có điều kiện. Hai yêu cầu đồng thời có thể cùng vượt qua bước kiểm tra và ghi đè guest_id. Phòng expired cũng không bị từ chối rõ ràng. `resetRoom:622` và `leaveRoom:642` không yêu cầu ván đã kết thúc, cho phép xóa nước đi hoặc rời ván đang chạy. `playRoomMove:469` còn tự mở ván mới khi nhận request vào phòng completed, nên request lặp có thể bị hiểu thành ván tiếp theo.

Khắc phục: quy định chuyển trạng thái hợp lệ, dùng khóa/UPDATE có điều kiện, định danh riêng từng ván và chống xử lý request lặp. Xác định quy tắc bỏ cuộc, chơi lại cần sự đồng thuận và timeout.

### 7. P1 — Cơ chế trận đấu thiếu công bằng

`backend/src/services/room.service.ts:392–400` cho tài khoản công ty thấy nước đi chưa công bố. Dòng 505 trở đi chọn nước bot sau khi nhận nước người chơi, theo tỷ lệ thắng mặc định 70%. Đây là hành vi được viết rõ trong mã, khác với mô hình hai bên chọn độc lập.

Khắc phục: công khai nhận diện và quy tắc phòng bot; loại bỏ quyền xem trước trong trận cạnh tranh, chọn nước độc lập hoặc áp dụng cơ chế cam kết rồi công bố.

### 8. P1 — Cấu hình nhận tiền có thể quay về giá trị cũ sau khởi động

`backend/src/services/admin.service.ts:363` đọc cấu hình từ system_settings; khi cập nhật cũng ghi process.env. Nhưng `backend/src/services/wallet.service.ts:5` chỉ đọc process.env hoặc giá trị mặc định; bot trong room.service cũng chỉ đọc process.env. Không thấy bước nạp cấu hình lưu trong DB vào các luồng này sau restart. Admin có thể thấy cấu hình mới trong khi ví hiển thị tài khoản nhận tiền cũ.

Khắc phục: dùng chung một nguồn cấu hình bền vững cho admin, ví và bot; kiểm thử sau restart và khi chạy nhiều tiến trình.

### 9. P1 — Hoa hồng trên ván hòa và số liệu phí không đúng

`backend/src/services/room.service.ts:539` đặt phí 5% trước khi phân biệt kết quả, nên phòng hòa vẫn lưu fee_amount dù không trừ phí. Dòng 587 trở đi vẫn trả hoa hồng và tính doanh số VIP khi hòa. Hai người phối hợp hòa có thể tăng thưởng cho tuyến trên mà không mất tiền cược. Phí được lưu trên phòng và bị ghi đè khi chơi lại, trong khi báo cáo admin cộng phí từ rooms, nên không phản ánh đầy đủ lịch sử từng ván.

Khắc phục: định nghĩa điều kiện doanh số/hoa hồng hợp lệ, hạch toán phí thực thu theo từng ván bằng bản ghi bất biến, đối soát tổng cộng/trừ và loại bỏ ghi nhận phí không thực thu.

### 10. P2 — Sai đơn vị mức nạp USDT tối thiểu

`backend/src/validators/index.ts:44` và `backend/src/services/wallet.service.ts:68` yêu cầu amount >= 10.000 cho cả bank và usdt; với usdt, amount sau đó được nhân 25.000. Giao diện WalletPage cũng dùng cùng ngưỡng. Kết quả là người dùng phải nhập ít nhất 10.000 USDT thay vì một giá trị quy đổi tương ứng 10.000 Xu.

Khắc phục: kiểm tra theo đơn vị của từng phương thức hoặc đổi sang Xu trước khi kiểm tra ngưỡng; giới hạn để không vượt cột INT của coins.

### 11. P2 — Khởi động tự xóa người dùng theo tên

`backend/src/database/index.ts:104` chạy DELETE với tên giống tài khoản demo mỗi lần khởi động. Do các khóa ngoại ON DELETE CASCADE, dữ liệu liên quan có thể bị xóa theo. Tên hiển thị không phải tiêu chí đáng tin để nhận diện dữ liệu thử nghiệm.

Khắc phục: bỏ thao tác xóa khỏi khởi động thường; dùng tác vụ dọn dữ liệu riêng với định danh chính xác và khả năng kiểm tra trước.

### 12. P2 — CORS và xác minh chứng chỉ chưa chặt

`backend/src/index.ts:43` trả callback(null, true) ngay cả khi origin không thuộc danh sách, khiến danh sách cho phép không có tác dụng. `backend/src/database/index.ts:14` tắt xác minh chứng chỉ SSL bằng rejectUnauthorized:false.

Khắc phục: thực thi danh sách origin cần thiết; cấu hình chứng chỉ DB để xác minh được máy chủ. CORS không thay thế xác thực API và tự nó không chứng minh có thể lấy token của người dùng.

## Khả năng bảo trì và hiệu năng

- Sảnh thăm dò mỗi 5 giây; mỗi lần gọi getWaitingRooms đều ensureVirtualRooms, lặp 40 hồ sơ bot với nhiều truy vấn tuần tự. Nên khởi tạo bot riêng và bổ sung phòng bằng tác vụ nền hoặc cơ chế có khóa, tránh nhiều client tạo trùng.
- Hồ sơ thăm dò mỗi 4 giây và mỗi lần backend đếm lại lịch sử trận; chi phí tăng khi dữ liệu lớn. Nên duy trì thống kê lúc ghi trận và đối soát theo lịch.
- Migration chạy lẫn lúc khởi động và trong service; chưa có hệ thống migration có phiên bản được tìm thấy.
- README chưa phản ánh đầy đủ VIP, hoa hồng, phòng bot và cấu hình môi trường. Khái niệm ELO trong README hiện được triển khai bằng điểm thắng +12/thua -8 cố định.
- Frontend có script lint nhưng package.json không khai báo ESLint và không tìm thấy cấu hình ESLint được theo dõi trong Git.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| Build backend TypeScript | Đạt |
| Build frontend TypeScript + Vite | Đạt |
| Bundle frontend | JS 340,32 kB, gzip 90,10 kB; CSS 45,94 kB |
| Hai kiểm thử Telegram hiện có | 2/2 đạt |
| Test bảo mật toàn luồng, ví, cược đồng thời | Chưa có bộ test tương ứng được tìm thấy |
| Kiểm tra giao diện trên Telegram/điện thoại | Chưa thực hiện |
| Kiểm tra DB, thanh toán và máy chủ thật | Chưa thực hiện |
| Kiểm tra lỗ hổng thư viện theo dữ liệu CVE hiện tại | Chưa thực hiện |

Hai test hiện có chỉ kiểm tra dữ liệu được tạo theo cùng logic với hàm xác minh. Chúng không kiểm tra nhánh bỏ qua xác thực trong auth.service; việc test đạt không phủ nhận lỗi P0.

Lần build đầu bị giới hạn quyền đọc đường dẫn của môi trường thực thi; chạy lại với quyền phù hợp đã thành công. Không chỉnh sửa mã nguồn ứng dụng; chỉ tạo báo cáo này và đầu ra biên dịch được Git bỏ qua.

## Thứ tự xử lý đề xuất

1. Chặn API tự cộng Xu, sửa xác thực Telegram, thay bí mật đã lộ và bỏ thông tin đăng nhập mặc định.
2. Thực thi khóa tài khoản; sửa giữ tiền, quyết toán, chuyển trạng thái phòng và request đồng thời/lặp.
3. Chuẩn hóa sổ biến động Xu theo từng ván, phí và hoa hồng; sửa cấu hình thanh toán bền vững, mức nạp USDT và hành vi xóa lúc khởi động.
4. Bổ sung kiểm thử tích hợp trên DB thử nghiệm: giả mạo Telegram, topup trái phép, người dùng bị khóa, rút trong lúc cược, nhiều người vào cùng phòng, chơi lại, ván hòa và đổi cấu hình rồi restart.
5. Kiểm thử Telegram thực tế, cấu hình triển khai, sao lưu/khôi phục và tải đồng thời trước khi mở giao dịch thật.
