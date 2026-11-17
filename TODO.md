# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ (cho v2.8)

1. **Mã ICD-10 chỉ lấy 3 ký tự** (VD: C15, không có C15.1) cho dễ thống kê.
   - Ô nhập ICD: gõ C15.1 / C151 tự rút về C15; gợi ý chỉ hiện mã 3 ký tự kèm tên nhóm bệnh.
   - Danh mục ICD (`src/icd10.js`): chỉ giữ tên mã 3 ký tự, file nhẹ hơn.
   - Dữ liệu cũ có mã 4 ký tự: rút về 3 ký tự khi chạy `setup` (cả trang chính, lưu trữ, `ChiMuc`). Thống kê vốn đã gộp theo 3 ký tự nên số liệu không đổi.
   - Tìm danh sách BN theo ICD: chỉ nhập mã 3 ký tự.

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
