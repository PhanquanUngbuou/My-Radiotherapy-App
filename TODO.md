# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ

### Cho bản sau v3.1 (anh dặn 20/11/2026)
1. **Bỏ hẳn đề xuất / duyệt lịch.** Chỉ người xếp lịch (`xep_lich` = Có, thực tế chỉ anh Thắng) và quản trị xếp lịch, đổi lịch, thêm / bớt ngày xạ. KTV khác, ĐD không có nút "Đề xuất lịch"; bỏ mục Xạ trị › Duyệt lịch / Chờ duyệt lịch, chuông "chờ duyệt lịch", các thao tác `approveSchedule`, `rejectSchedule`. KTV trưởng không còn quyền xếp lịch riêng (trừ khi được đánh dấu). Đề xuất cũ còn treo (`de_xuat_lich`): hiện cho người xếp lịch như ghi chú rồi xoá khi xếp. Sửa kiểm thử v3.0 về đề xuất / duyệt.
2. **Khớp tên bác sĩ viết tắt tên đệm** khi nhập sổ HIS: "Nguyễn T. Ngọc Hà" = "Nguyễn Thị Ngọc Hà" (chữ viết tắt "T." khớp mọi chữ đệm bắt đầu bằng T, chỉ nhận khi khớp duy nhất một bác sĩ).
3. **Tất cả BN có số tổng** cạnh tên mục trên menu (như các bước khác), và trên trang có số theo trạng thái.
4. **Sắp xếp danh sách BN theo ABC họ → tên đệm → tên** (so cả họ tên từ trái sang, bỏ dấu khi so, cùng chữ thì có dấu sau) để KTV tìm dễ: Tất cả BN, Xạ trị › Hôm nay (từng nhóm), Lịch tuần, Chờ mô phỏng, Contour. Giữ thứ tự ưu tiên (cấp cứu → boost → thời gian) ở Lập KH, QA, Chờ xếp lịch. *(Cần anh xác nhận phạm vi.)*

(v3.0 đã làm: Không xạ, Lập lại KH, KH đồng thời, Chuyển KH một phần, nhiều mã ICD; gộp v2.11–v2.12.)

(Đã làm trong v2.8: xem CHANGELOG.)

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
