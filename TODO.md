# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ (v2.13, chờ anh duyệt kế hoạch ngày 19/11)

1. **Ca mô phỏng xong nhưng không xạ**: BS bấm "Không xạ" (lý do) ở mọi bước trước khi xạ → đợt đóng lại (không chiếm chỉ tiêu, không nằm trong danh sách việc), thống kê riêng "đợt không xạ". Khi BN quay lại: nút "Mô phỏng lại" trên hồ sơ cũ → tạo đợt mới, chép sẵn hành chính, chẩn đoán, ICD, BS; bắt đầu ở "Chờ mô phỏng".
2. **Lập lại kế hoạch giữa chừng (replan)**: BS bấm "Lập lại KH" trên BN đang xạ → tạo giai đoạn "KH lại" (cần mô phỏng lại / contour trên CT cũ), đi qua Mô phỏng → Contour → Lập KH → QA như boost, nhãn riêng; BN vẫn xạ KH cũ trong lúc chờ. Khi KH lại sẵn sàng: KH cũ dừng ở số buổi đã xạ, các buổi tiếp theo theo KH mới (BS nhập số buổi, liều còn lại).
3. **Hai kế hoạch xạ đồng thời** (VD thực quản 50,4 Gy/28 + đầu cổ 70 Gy/33–35): thêm loại giai đoạn "song song": mỗi KH có liều, số buổi, kỹ thuật riêng; mỗi ngày KTV xác nhận 1 lần cho cả hai KH (bỏ tích KH đã xong); tiến độ hiện riêng từng KH; KS lập 2 KH, QA riêng; bảng thanh toán tính theo từng KH (KH thực quản vào bảng 3D, KH đầu cổ vào bảng VMAT); chỉ tiêu khoa tính 1 BN.

(Đã làm trong v2.8: xem CHANGELOG.)

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
