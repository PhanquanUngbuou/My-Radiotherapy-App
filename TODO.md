# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ (gộp vào v2.8, anh chưa cài v2.8; chờ anh duyệt kế hoạch ngày 18/11)

1. **Sổ mô phỏng theo mẫu trang "tháng 10"**: Ngày · Họ tên BN · Tuổi (Nam / Nữ) · Số BA · Chẩn đoán · Bác sỹ · Mặt nạ (ghi loại) · Ngày xạ ĐT · Kỹ thuật xạ. Bỏ tiêm thuốc, máy A/B khỏi báo cáo (vẫn lưu tiêm thuốc để sau cần thì thêm).
2. **Bảng xạ trị**: bỏ tính setup (file thực tế cột setup để trống; thành tiền = số buổi × đơn giá), giữ cột Setup trống; đổi tên bảng "IMRT/VMAT" thành "IMRT" và bỏ cột VM / dMLC; cột KS để trống cho ĐD trưởng tích; không đưa mã ICD vào báo cáo.
3. **Form "Đã mô phỏng xong"**: người làm (gợi ý theo bảng phân công vị trí mô phỏng); Mặt nạ: Không / 3 điểm / 4 điểm / 5 điểm / 6 điểm; Tiêm thuốc: Có / Không; Dụng cụ khác: miếng bù da, nêm lưỡi, ô "khác" tự ghi. Danh mục mặt nạ và dụng cụ sửa trong Quản trị.
4. **BS không thấy BN chờ mô phỏng**: "Bệnh nhân của tôi" đang gộp chờ mô phỏng vào "Đang contour". Tách ô và mục riêng "Chờ mô phỏng" (ngày hẹn, nút Đã mô phỏng xong).
6. **Mục đích xạ trị thêm "Củng cố" và "Tân bổ trợ"** (danh mục MUC_DICH; `setup` tự thêm vào Sheet đang dùng nếu chưa có).
5. ICD → chẩn đoán tự điền theo danh mục, người nhập sửa được (đã có, kiểm tra lại).

## Chờ chị Lệ trả lời (đang làm theo giả định, sửa nhanh được)
- Setup 37.500 tính một lần ở buổi xạ đầu? Thành tiền = số buổi × 21.000 + setup? Hai khoa cùng đơn giá?
- Máy A / B trong sổ mô phỏng là máy gia tốc (đang dùng) hay máy CT?
- VM / dMLC = VMAT / IMRT? Cột KS "x" khi có kỹ sư lập KH?
- Tài khoản khoa làm việc KTV có cần thấy BN cả hai khoa?
- Buổi 2 KTV ghi "T/Đ" trong một ô? SRS/SBRT xếp vào bảng 3D? Khung ký tên có cần họ tên?

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
