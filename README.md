# Điều phối Xạ trị

Ứng dụng kết nối bác sĩ, kỹ sư vật lý, kỹ thuật viên và điều dưỡng xạ trị. Chạy trên Google Sheets + Apps Script.

- **Bác sĩ:** thêm BN (mã HIS), báo contour xong kèm mức ưu tiên; xem số BN đang contour, kỹ sư đang lập KH, chờ QA, chờ vào xạ (ngày dự kiến), đang xạ, tạm ngừng; xem lịch xạ, số buổi, liều đã nhận, IGRT/SGRT từng ngày.
- **Kỹ sư:** hàng đợi lập KH theo ưu tiên (Cấp cứu → Ưu tiên → Thường, rồi ai contour xong trước làm trước); nhận ca, lập KH xong (cần QA hay chuyển xạ luôn), ghi QA đạt/không đạt.
- **Kỹ thuật viên:** danh sách xạ hôm nay; tích xác nhận đã xạ (bắt buộc xác nhận), ghi CBCT/kV/SGRT; xếp lịch (3D: T2–T6; IMRT/VMAT: nghỉ 1 ngày, xạ bù T7); tạm ngừng / tiếp tục.
- **Điều dưỡng:** chế độ xem.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/` | Mã nguồn: `core.js` (nghiệp vụ dùng chung), `Code.gs` (máy chủ), `app.js` + `styles.css` (giao diện), `demo.js` (dữ liệu giả) |
| `apps-script/` | File đã ghép sẵn để dán vào Apps Script: `Code.gs`, `Core.gs`, `Index.html` |
| `demo/index.html` | Bản demo chạy trong trình duyệt với dữ liệu giả |
| `test/` | Kiểm tra máy chủ với Google Sheets giả lập |

Sau khi sửa `src/`: chạy `python3 build.py` rồi `node test/gas-mock.test.js`.

Cài đặt: xem [HUONG-DAN-CAI-DAT.md](HUONG-DAN-CAI-DAT.md).
