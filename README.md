# Toolkits — AppThermoEngine

Bộ tra cứu nhanh cho kỹ sư lạnh, HVAC và cơ điện: tính chất môi chất lạnh, không khí ẩm (psychrometric), chọn cỡ
ống gió, tổn thất áp suất đường ống, cách nhiệt và một số mô-đun khác. Mỗi công cụ ghi rõ tiêu chuẩn hoặc tương quan
áp dụng ngay trong giao diện.

- Địa chỉ: https://decoolboy-source.github.io/Toolkits/AppThermoEngine.html
- Ứng dụng web cài được (PWA), chạy offline sau lần mở đầu, không cần máy chủ.
- Dữ liệu dự án lưu trong trình duyệt (IndexedDB, dự phòng localStorage) trên thiết bị người dùng.

> Kết quả chỉ để tham khảo sơ bộ, không thay thế thiết kế có thẩm tra.

## Chạy tại chỗ

```bash
python -m http.server 8080
# mở http://localhost:8080/AppThermoEngine.html
```

## Kiểm thử tự động

```bash
npm install
npx playwright install chromium   # lần đầu
npm test
```

## Cấu trúc

```
AppThermoEngine.html     Ứng dụng (một file)
manifest.webmanifest     Khai báo PWA
sw.js                    Service worker (cache offline)
icons/                   Biểu tượng
tests/                   Kiểm thử Playwright
.github/workflows/       Kiểm thử và deploy GitHub Pages
```

Khi sửa `AppThermoEngine.html`, tăng số phiên bản cache trong `sw.js` (`Toolkits-v<số>`).

## Lịch sử phiên bản

### 2026-11-15 — bản cache `Toolkits-v2`

Chuẩn hóa để chạy chung origin `decoolboy-source.github.io` với các PWA khác:

- Service worker đăng ký bằng đường dẫn tương đối: `register('./sw.js', { scope: './' })`.
- `manifest`: đã có `"id"`, `"scope": "./"`; giữ `"start_url": "./AppThermoEngine.html"` vì repo không có trang `index.html`.
- Tên cache đổi sang `Toolkits-v<số>` (trước là `appthermoengine-v<số>`). Khi kích hoạt chỉ xóa cache của chính app này (cả tiền tố mới và cũ), không đụng cache của app khác.
- Khóa localStorage có tiền tố `Toolkits:` (`thermoengine_lang`, `thermoengine_projects`, `thermoengine_disclaimer_dismissed_v1`). Lần đầu mở bản mới, app tự chép dữ liệu từ khóa cũ sang khóa mới nếu khóa mới chưa có. Khóa cũ được giữ nguyên.
- CSDL IndexedDB đổi tên sang `Toolkits:thermoengine_db`. Lần đầu mở, app chép toàn bộ bảng và bản ghi từ CSDL cũ `thermoengine_db` sang. CSDL cũ được giữ nguyên.
