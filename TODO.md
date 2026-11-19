# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ (v2.11, chờ anh duyệt)

1. **Số hoá BN từ hồ sơ giấy, không nhập từng BN.**
   - Trạng thái mới **"Chờ phân loại"**; mục riêng **Xạ trị › Chờ phân loại** (có số đếm).
   - **Nhập hàng loạt**: dán bảng (copy từ Google Sheet / Excel) vào một ô, mỗi dòng một BN; cột thiếu bỏ qua. Người nhập: Quản trị, KTV trưởng.
   - **KTV phân loại** từng ca: Chờ vào xạ · Đang xạ (ngày bắt đầu, số buổi đã xạ, lịch tuần) · Tạm ngừng (ngày, lý do, số buổi đã xạ) · Đã xạ xong · Huỷ (nhập nhầm). Lúc phân loại bắt buộc điền đủ phần còn thiếu: BS điều trị (→ khoa), mã ICD, kỹ thuật, tổng liều, số buổi.
   - Dữ liệu từ ảnh: em đọc phần in sẵn (mã NB, họ tên, năm sinh, giới, chẩn đoán, GPB, mục đích, kỹ thuật, BS, liều / số buổi / kỹ thuật từ phiếu Monaco), bỏ phần viết tay khó đọc; ghi ra 1 Google Sheet riêng trong Drive của anh (không đưa vào GitHub), anh copy dán vào app.

(Đã làm trong v2.8: xem CHANGELOG.)

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
