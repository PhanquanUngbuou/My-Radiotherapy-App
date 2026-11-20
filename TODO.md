# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ (gộp vào v3.0, chờ anh duyệt kế hoạch ngày 20/11)

1. **Chuyển KH một phần (VD KH 30 buổi, chỉ chuyển 20 buổi, gần hết BS đánh giá lại)**: nút nhỏ "Đánh giá lại ở buổi…" (BS đặt trên hồ sơ hoặc khi Contour xong; KS cũng đặt được khi Lập KH xong qua đường link nhỏ, mặc định ẩn). 2 buổi trước mốc: chuông báo BS + nhãn nhỏ trên danh sách Hôm nay. Tới mốc: KTV không ghi được buổi tiếp theo cho tới khi BS chọn: Xạ tiếp KH cũ / Lập lại KH (contour lại, mô phỏng lại) / Kết thúc. Dự kiến kết thúc vẫn tính đủ 30 buổi.
2. **Hiển thị KH đồng thời**: đặt tên vị trí cho từng KH (VD "Thực quản", "Đầu cổ"); hồ sơ, danh sách, form ghi buổi hiện gọn cả hai: "Thực quản 3D 50,4 Gy/28 · 11/28 + Đầu cổ VMAT 70 Gy/35 · 11/35"; tổng = số ngày xạ.
3. **Nhiều mã ICD**: ô ICD chính như cũ, dưới có link nhỏ "+ thêm mã ICD" (chỉ hiện ô khi bấm). Lưu cột mới `icd_phu`. Thống kê theo ICD: BN có 2 mã đếm ở cả hai mã; tìm BN khớp mọi mã; sổ mô phỏng ghi "C15, C13".

(Đã làm trong v2.8: xem CHANGELOG.)

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
