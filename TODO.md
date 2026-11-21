# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ

### v4.1 (anh yêu cầu 21/11/2026, chờ anh bảo "làm đi")
1. **Đợt xạ mới chép sẵn chẩn đoán + ICD (cả ICD thêm)** từ đợt trước (hiện chỉ chép hành chính, BS điều trị). Vị trí, kỹ thuật, liều để trống (KH mới). BS sửa được trước khi lưu.
2. **KS đổi kỹ thuật (CHỈ kỹ thuật, không đổi liều / số buổi; anh chốt 21/11) khi lập KH** (trước khi "Lập KH xong" chuyển QA / chờ xạ): nút "Đổi kỹ thuật" ở bước Đang lập KH / Chờ QA, có xác nhận (Trước → Sau), lưu vết, báo BS điều trị trên chuông. Áp dụng cả GĐ boost.
3. **Vị trí xạ: dấu "+ thêm vị trí"** (như ICD thêm) khi BN xạ 2 vị trí; lưu nhiều vị trí, thống kê theo vị trí đếm BN ở mọi vị trí.
4. **Phân loại BN đã có buổi xạ: đủ số buổi thì tự vào "Đã xạ xong"**. VD đã đếm 30 buổi, BS nhập 60 Gy / 30 buổi, chọn "Đang xạ" → ứng dụng hỏi xác nhận rồi chuyển Đã xạ xong (hiện đang báo lỗi bắt chọn lại). Sửa thông tin BN đang xạ chưa có tổng mà số buổi = số đã xạ thì đã tự hoàn thành (có sẵn).

5. **Form Phân loại gọn theo bước:** "Lịch trong tuần" chỉ hiện khi chọn Chờ vào xạ / Đang xạ / Tạm ngừng / Đã xạ xong (không hiện ở Đang contour, Chờ lập KH, Đang lập KH, Chờ QA). **Thêm ô "Vị trí xạ"** (gợi ý từ danh mục, có "+ thêm vị trí" như mục 3). Bước "Đang contour": chỉ hỏi BS điều trị, chẩn đoán, ICD (không bắt buộc), vị trí; ẩn kỹ thuật / liều / số buổi.

6. **BN của tôi (BS): thanh số liệu trên cùng thành thanh chọn mục.** Bấm ô nào chỉ hiện danh sách BN của ô đó (không xếp dọc tất cả nữa). Ô đầu tiên **"Tất cả BN"**: xếp theo giai đoạn (thứ tự các ô trên thanh), cùng giai đoạn thì ABC họ → tên đệm → tên. Các ô khác giữ thứ tự hiện có (theo thời gian / ưu tiên). Thanh đầy đủ hơn: Tất cả · Cần phân loại · Chờ mô phỏng · Đang contour · Lập KH · Chờ QA · Chờ vào xạ · Đang xạ · Tạm ngừng · Cần chú ý (vắng ≥ 2 buổi, chưa có tổng liều, cần đánh giá lại KH, tạm ngừng ≥ 7 ngày); ô 0 BN làm mờ. Nhớ ô đang chọn. Điện thoại: thanh cuộn ngang / lưới ô.

### Việc chờ dữ liệu (không phải sửa code)
- Tối T7 (tuần này hoặc tuần sau) anh gửi Excel HIS: sổ mô phỏng từ 01/09 + thủ thuật mặt nạ + thủ thuật xạ ("máy gia tốc" = 3D, "có điều biến liều" = VMAT), **có ngày thực hiện**. Em lập bảng NhapDayDu (BS = BS chỉ định mô phỏng; liệt kê BN mà phần lớn buổi xạ dưới tên BS khác, BN có cả 3D và VMAT, BN mô phỏng 2 lần, ICD suy từ chẩn đoán cần BS kiểm tra).

(Hiện chưa có việc sửa code. v3.4 đã làm: nhập đầy đủ từ HIS (NhapDayDu), phân loại BN đã có buổi xạ, chuyển BS điều trị. v3.3 đã làm: nhập sổ HIS vào Chờ phân loại, phân loại về mọi giai đoạn, hàm resetBenhNhan.)

(v3.2 đã làm: chỉ KTV trưởng xếp lịch, phân công Ca 1–4 + Mô phỏng T2–T7, khớp tên BS viết tắt, số tổng Tất cả BN, xếp BN theo ABC.)

(v3.0 đã làm: Không xạ, Lập lại KH, KH đồng thời, Chuyển KH một phần, nhiều mã ICD; gộp v2.11–v2.12.)

(Đã làm trong v2.8: xem CHANGELOG.)

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
