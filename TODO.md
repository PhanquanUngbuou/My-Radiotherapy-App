# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ

### v3.3 (đề xuất 20/11/2026, chờ anh duyệt): đưa BN nhập từ sổ HIS về đúng giai đoạn
Vấn đề: sổ HIS 01/10 → hôm qua có nhiều BN đã xạ xong / đang xạ / chờ xếp lịch / đang lập KH…, nhập vào đều nằm ở Chờ mô phỏng.
1. **Nhập sổ HIS chọn bước đích**: BN mô phỏng hôm nay / hôm qua → Chờ mô phỏng (như cũ); mô phỏng cũ hơn → **Chờ phân loại** (`CHO_PL`). Ô chọn mốc ngày trong bảng xem trước.
2. **Chuyển hàng loạt BN đã nhập** (đang Chờ mô phỏng, ghi chú "Nhập từ sổ HIS", chưa có buổi xạ) sang Chờ phân loại: nút ở Xạ trị › Chờ phân loại / Quản trị.
3. **Mở rộng phân loại** (`classifyPatient`): thêm Contour, Chờ lập KH, Đang lập KH (chọn KS), Chờ QA, Không xạ, bên cạnh Chờ vào xạ / Đang xạ / Tạm ngừng / Đã xạ xong / Huỷ. Bước trước xạ không bắt buộc liều. Đang xạ / Tạm ngừng / Đã xong: kỹ thuật, liều, số buổi, ngày bắt đầu, số buổi đã xạ (app tự ghi bù buổi theo lịch tuần).
4. **Ai phân loại**: KTV, BS (BN của mình, thấy mục "Chờ phân loại" trong BN của tôi), KS, quản trị. Phân loại nhanh từng dòng (chọn bước → form ngắn chỉ hỏi ô cần cho bước đó).

(Hiện chưa có việc khác. v3.2 đã làm: chỉ KTV trưởng xếp lịch, phân công Ca 1–4 + Mô phỏng T2–T7, khớp tên BS viết tắt, số tổng Tất cả BN, xếp BN theo ABC.)

(v3.0 đã làm: Không xạ, Lập lại KH, KH đồng thời, Chuyển KH một phần, nhiều mã ICD; gộp v2.11–v2.12.)

(Đã làm trong v2.8: xem CHANGELOG.)

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
