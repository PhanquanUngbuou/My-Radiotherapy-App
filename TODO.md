# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ

### Việc chờ dữ liệu (không phải sửa code)
- Tối T7 (tuần này hoặc tuần sau) anh gửi Excel HIS: sổ mô phỏng từ 01/09 + thủ thuật mặt nạ + thủ thuật xạ ("máy gia tốc" = 3D, "có điều biến liều" = VMAT), **có ngày thực hiện**. Em lập bảng NhapDayDu (BS = BS chỉ định mô phỏng; liệt kê BN mà phần lớn buổi xạ dưới tên BS khác, BN có cả 3D và VMAT, BN mô phỏng 2 lần, ICD suy từ chẩn đoán cần BS kiểm tra).

(Hiện chưa có việc sửa code. v3.4 đã làm: nhập đầy đủ từ HIS (NhapDayDu), phân loại BN đã có buổi xạ, chuyển BS điều trị. v3.3 đã làm: nhập sổ HIS vào Chờ phân loại, phân loại về mọi giai đoạn, hàm resetBenhNhan.)

(v3.2 đã làm: chỉ KTV trưởng xếp lịch, phân công Ca 1–4 + Mô phỏng T2–T7, khớp tên BS viết tắt, số tổng Tất cả BN, xếp BN theo ABC.)

(v3.0 đã làm: Không xạ, Lập lại KH, KH đồng thời, Chuyển KH một phần, nhiều mã ICD; gộp v2.11–v2.12.)

(Đã làm trong v2.8: xem CHANGELOG.)

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
