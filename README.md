# ✊✋✌️ OẲN TÙ TÌ - Telegram Mini App

Game Oẳn Tù Tì Telegram Mini App full-stack hiện đại dành cho thị trường Việt Nam.

## 🚀 Tính năng nổi bật

- 🎮 **Chơi với Máy (Single-player)**: Thao tác nhanh, animation mượt mà.
- 👥 **Chế độ Tạo Phòng PvP 1vs1**:
  - Mã phòng 6 số duy nhất.
  - Tự động sinh link Telegram (`https://t.me/BOT?startapp=room_CODE`).
  - Khóa nước đi bí mật, 10s đếm ngược mở kết quả.
  - Tùy chọn Mức cược Xu Game (`0 Xu`, `100 Xu`, `500 Xu`, `1,000 Xu`).
  - Thu phí dịch vụ 5% nền tảng từ người thắng.
- 💳 **Hệ thống Ví & Nạp/Rút Tiền**:
  - **Liên kết Ngân hàng cá nhân** (MBBank, Vietcombank, Techcombank, VPBank, ACB...).
  - **Nạp tiền Chuyển khoản Admin**: Tự động tạo QR VietQR chuẩn ngân hàng.
  - **Nạp USDT TRC20**: Tỷ giá `1 USDT = 25,000 Xu Game`.
  - **Nút Báo Admin 1-touch**: Chuyển hướng trực tiếp tới Telegram Admin (`ID: 8780377211`).
- 🛡️ **Panel Quản Trị Admin**:
  - Quản lý & duyệt danh sách đơn Nạp / Rút đang chờ.
  - Duyệt ➔ Hệ thống tự động cộng/hoàn Xu trên **Neon PostgreSQL Cloud**.
- 🏆 **Bảng Xếp Hạng & Nhiệm Vụ Ngày**: Phân hạng ELO Rating, chuỗi thắng, thưởng hằng ngày.

---

## 🛠️ Hướng dẫn Cài đặt & Khởi chạy

### 1. Cài đặt Dependencies
```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2. Khởi chạy Server (Backend + Frontend)
```bash
npm run dev
```

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🗄️ Công nghệ sử dụng

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Backend**: Node.js, Express, TypeScript, PG Client, HMAC-SHA256 Auth.
- **Database**: Cloud Neon PostgreSQL.
