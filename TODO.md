# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

## Bản sau (v2.6)

- **Nhận ca lập kế hoạch phải chọn kỹ sư phụ trách**, không mặc định là người bấm.
  - Bấm "Nhận ca" → hộp chọn kỹ sư (danh sách KS đang hoạt động, bắt buộc chọn).
  - Bấm "Lập KH xong" cho ca chưa ai nhận cũng phải chọn kỹ sư.
  - Ca đang lập có nút "Đổi kỹ sư" để giao lại; ghi nhật ký (kỹ sư cũ → mới).
  - Máy chủ kiểm tra email được chọn là KS đang hoạt động.

- **Làm lại phần Thống kê** (đang chờ anh Quân duyệt kế hoạch):
  - Người dùng chọn trước: loại thống kê, khoảng thời gian, điều kiện (mặt bệnh ICD, vị trí, kỹ thuật, BS, khoa, trạng thái…) → ra danh sách BN gọn; bấm từng BN mở đầy đủ thông tin; xuất Excel.
  - Báo cáo lượt xạ ngày/tuần/tháng cho điều dưỡng: tổng lượt, theo VMAT/IMRT/3D-CRT…, số BN, bảng theo từng ngày.
  - Ghi nhận BN vắng buổi xạ kèm lý do (KTV ghi, BS/ĐD bổ sung); thống kê vắng theo lý do; vắng chưa rõ lý do thì báo BS điều trị.
