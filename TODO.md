# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ (v2.10, đã chốt, chờ anh bảo "làm đi")

1. **Hai bảng thanh toán phải đủ toàn bộ lượt xạ của khoa, mọi kỹ thuật** (ý chị Vân Anh):
   - Bảng **3D** = 3D-CRT. Bảng **VMAT** = VMAT, IMRT, SRS/SBRT (tính chung, không chia VM / IMRT). Đã chốt: chỉ 3D-CRT vào bảng 3D, mọi kỹ thuật còn lại (kể cả "Khác", kỹ thuật mới) vào bảng VMAT.
   - Mỗi buổi xạ vào đúng 1 bảng theo kỹ thuật của giai đoạn đó (BN 3D có boost VMAT thì có mặt ở cả hai bảng, mỗi bảng đúng số buổi của nó).
   - Đối chiếu khi tải: "3D x buổi + VMAT y buổi = tổng z buổi của khoa" để chắc không sót.
   - Đã chốt: bỏ hẳn cột KT (VM / IMRT) trên trang VMAT (trang VMAT có cùng bố cục cột như trang 3D).

2. **Bỏ chọn KTV khi "Đã mô phỏng xong" và khi ghi buổi xạ**; thống kê lấy người theo **lịch phân công tuần** của KTV trưởng.
   - Mô phỏng: người mô phỏng = người được phân công vị trí có chữ "Mô phỏng" ngày đó. Form mô phỏng chỉ còn mặt nạ, tiêm thuốc, dụng cụ.
   - Xạ trị: ô ngày trên bảng thanh toán = ký hiệu KTV được phân công máy của BN, ca sáng / chiều theo giờ ghi buổi xạ (trước 12 giờ là ca sáng).
   - Ngày chưa có phân công: tạm lấy người bấm ghi buổi xạ, báo "x ngày chưa có lịch phân công" khi tải.
   - Dữ liệu cũ đã chọn tay (v2.8–v2.9) vẫn giữ; báo cáo ưu tiên lịch phân công.
   - Chờ anh chốt: tên vị trí phân công đang dùng; sửa lịch phân công về sau thì báo cáo đổi theo (đề xuất: đổi theo).

(Đã làm trong v2.8: xem CHANGELOG.)

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
