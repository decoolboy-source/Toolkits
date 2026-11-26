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
vendor/                  Thư viện + font nhúng sẵn (xem vendor/README.md)
tests/                   Kiểm thử Playwright
.github/workflows/       Kiểm thử và deploy GitHub Pages
```

Khi sửa `AppThermoEngine.html`, tăng số phiên bản cache trong `sw.js` (`Toolkits-v<số>`).

## Lịch sử phiên bản

### 2026-11-26 — bản cache `Toolkits-v4`

Sửa 6 chỗ tính toán đi ngược logic thiết kế:

1. **Ống hồi dịch bơm (M7)**: trước đây tính vận tốc bằng khối lượng riêng LỎNG nên ra cỡ ống quá nhỏ
   (NH3 200 kW, n=3 → DN15). Nay tính dòng 2 pha theo mô hình đồng nhất (x = 1/n) và kiểm tra thêm tổn
   thất ≤1K → DN100.
2. **Tính chất môi chất lạnh (M1, M3, M7)**: thay correlation Lee-Kesler/Rackett/Watson (sai 13–44%)
   bằng bảng bão hòa sinh từ CoolProp, nhúng sẵn, chạy offline. Môi chất hỗn hợp hiện cả điểm sương và
   điểm sôi. Ngoài phạm vi bảng mới dùng correlation, có cảnh báo. Sinh lại bảng:
   `python tools/gen_sat_tables.py > sat.json` rồi `python tools/inject_sat_tables.py sat.json`.
3. **Cách nhiệt chống đọng sương (M2)**: h₀ mặc định 23 → 9 W/m²K (không khí lặng); thêm nút chọn theo
   vỏ bọc (5,7 / 9) và cảnh báo khi h₀ > 12.
4. **Sụt áp (M4)**: điện trở tính ở nhiệt độ làm việc (PVC 70°C, XLPE 90°C) thay vì 20°C; giới hạn 3%
   chiếu sáng / 5% động lực.
5. **Panel kho lạnh (M2)**: độ dày = max(tiêu chí dòng nhiệt q ≤ q mục tiêu, tiêu chí đọng sương).
   Cột ứng dụng của bảng U-value tính lại theo q ≤ 8 W/m², Ta = 35°C.
6. **Pipe Sizing (M3)**: bỏ các loại ống môi chất lạnh (hút/xả/lỏng) — phải chọn theo tổn thất ở M7.
   Dự án cũ đang chọn các loại này được tự đưa về "Water/Glycol".

Kiểm thử mới: `tests/design-logic.spec.js`.

### 2026-11-20 — bản cache `Toolkits-v3`

Bỏ hoàn toàn việc gọi CDN khi chạy (theo quy tắc "thư viện nhúng, không gọi CDN"):

- Lucide (ghim 1.77.0, trước là `lucide@latest`) và font Inter, JetBrains Mono (latin + tiếng Việt) nằm trong `vendor/`; nguồn, phiên bản, giấy phép ở `vendor/README.md`.
- `vendor/` nằm trong app shell của service worker: icon và font hiển thị đúng cả khi offline (trước đây offline thì mất icon, font về mặc định).

### 2026-11-15 — bản cache `Toolkits-v2`

Chuẩn hóa để chạy chung origin `decoolboy-source.github.io` với các PWA khác:

- Service worker đăng ký bằng đường dẫn tương đối: `register('./sw.js', { scope: './' })`.
- `manifest`: đã có `"id"`, `"scope": "./"`; giữ `"start_url": "./AppThermoEngine.html"` vì repo không có trang `index.html`.
- Tên cache đổi sang `Toolkits-v<số>` (trước là `appthermoengine-v<số>`). Khi kích hoạt chỉ xóa cache của chính app này (cả tiền tố mới và cũ), không đụng cache của app khác.
- Khóa localStorage có tiền tố `Toolkits:` (`thermoengine_lang`, `thermoengine_projects`, `thermoengine_disclaimer_dismissed_v1`). Lần đầu mở bản mới, app tự chép dữ liệu từ khóa cũ sang khóa mới nếu khóa mới chưa có. Khóa cũ được giữ nguyên.
- CSDL IndexedDB đổi tên sang `Toolkits:thermoengine_db`. Lần đầu mở, app chép toàn bộ bảng và bản ghi từ CSDL cũ `thermoengine_db` sang. CSDL cũ được giữ nguyên.

#### Xuất/Nhập dữ liệu (cùng bản)

Tab Dự án: file `Toolkits_YYYYMMDD.json` chứa toàn bộ dự án. Vẫn nhận file `thermoengine_export.json` kiểu cũ. Bỏ lựa chọn tải lên CSV ở mục này (trước đây chỉ báo "chưa hỗ trợ").

- File gồm các trường `app`, `schemaVersion` (= 1), `exportedAt`, `projectCount`, `data`.
- Khi nhập: kiểm tra định dạng JSON, đúng `app` và `schemaVersion` **trước khi ghi**; báo số dự án; hỏi **Gộp** hay
  **Thay thế**; xác nhận lần cuối. File sai định dạng thì báo lỗi tiếng Việt và không ghi gì.
- Xử lý hoàn toàn trên trình duyệt, không gửi dữ liệu đi đâu.
- Gộp: dự án trùng mã được thay bằng bản trong file. Thay thế: xóa hết dự án rồi ghi theo file.
