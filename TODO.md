# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ

### v3.4 (đề xuất 20/11/2026, chờ anh duyệt): nhập đầy đủ từ Excel HIS (mô phỏng + mặt nạ + thủ thuật xạ)
- Anh gửi Excel (tối T7): sổ mô phỏng từ 01/09, thủ thuật làm mặt nạ, thủ thuật xạ ("xạ trị bằng máy gia tốc" = 3D, "... có điều biến liều" = VMAT), **cần có ngày thực hiện từng thủ thuật**.
- Em xử lý ngoài app (không đưa lên GitHub), tạo 1 bảng nhập; app có hàm / nút nhập bảng này (trang "NhapDayDu"):
  - Mặt nạ (loại theo dịch vụ), tiêm thuốc có / không (theo tên dịch vụ mô phỏng), ngày mô phỏng, ICD suy từ chẩn đoán (đánh dấu để BS kiểm tra).
  - Có thủ thuật xạ: kỹ thuật, ngày bắt đầu, **các buổi xạ đúng ngày thực hiện** (không suy theo lịch tuần), lịch tuần suy từ ngày xạ (VMAT nghỉ ngày nào, bù T7).
  - Thiếu tổng liều / tổng số buổi → vào Chờ phân loại đã điền sẵn mọi thứ, BS / KTV chỉ nhập tổng liều + số buổi rồi bấm "Đang xạ" (hoặc "Đã xạ xong" nếu đủ).
  - Không có thủ thuật xạ → Chờ phân loại (đang contour / lập KH / QA / chờ xạ / không xạ: BS chọn).
  - Buổi xạ cuối cách hôm nay > 5 ngày làm việc → gợi ý "Đã xạ xong / tạm ngừng".
- Phân loại: thêm lựa chọn nhanh "Đang xạ" chỉ hỏi tổng liều + số buổi khi các thông tin khác đã có.
- Sửa nhỏ: dấu * ICD / kỹ thuật không hiện khi chọn "Đã xạ xong".

(Hiện chưa có việc khác. v3.3 đã làm: nhập sổ HIS vào Chờ phân loại, phân loại về mọi giai đoạn, hàm resetBenhNhan.)

(v3.2 đã làm: chỉ KTV trưởng xếp lịch, phân công Ca 1–4 + Mô phỏng T2–T7, khớp tên BS viết tắt, số tổng Tất cả BN, xếp BN theo ABC.)

(v3.0 đã làm: Không xạ, Lập lại KH, KH đồng thời, Chuyển KH một phần, nhiều mã ICD; gộp v2.11–v2.12.)

(Đã làm trong v2.8: xem CHANGELOG.)

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
