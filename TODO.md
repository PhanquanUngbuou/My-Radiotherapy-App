# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ

### (v5.0 đã làm, xem CHANGELOG)

### Bản sau (anh yêu cầu 23/11, chưa làm): lọc "Tất cả BN" theo thời gian
- Thêm ô chọn nhanh: Tất cả · 1 tháng gần đây · 3 tháng gần đây · 6 tháng · Năm nay · Tự chọn (Từ ngày – Đến ngày).
- Anh chốt: tính theo **có hoạt động trong khoảng** (mô phỏng, xạ hoặc đang điều trị bất kỳ lúc nào trong khoảng; BN chưa xạ xong vẫn hiện). Không thêm ô "Tính theo".
- Tải Excel theo đúng khoảng đang lọc. Nhớ lựa chọn trên máy (localStorage).

### Để sau (anh bảo từ từ 23/11): nhúng ứng dụng vào Google Sites để không hiện dòng "Ứng dụng này do một người dùng Google Apps Script tạo" (cần `XFrameOptionsMode.ALLOWALL` + thử đăng nhập / cấp quyền trên Sites, nhất là iPhone).


### (v4.9 đã làm, xem CHANGELOG)

### (v4.8 đã làm, xem CHANGELOG)

### Bảo mật: đăng nhập bằng mã qua email (anh chốt dùng Gmail cá nhân 23/11; chờ anh bảo "làm đi", thay đổi lớn)
- Ứng dụng chạy bằng tài khoản Quản trị ("Thực thi với tư cách: Tôi"), **bỏ chia sẻ Google Sheet** cho mọi người (chỉ Quản trị mở Sheet).
- Đăng nhập: nhập email (phải có trong NguoiDung, đang kích hoạt) → mã 6 số gửi qua email (MailApp, hạn 10 phút, sai 5 lần khoá 15 phút) → nhập mã.
- "Ghi nhớ thiết bị này" (mặc định tích): lưu mã thiết bị ngẫu nhiên trong trình duyệt, máy chủ lưu bản băm + hạn **90 ngày**; cùng máy, cùng trình duyệt vào thẳng. Máy dùng chung: bỏ tích. Nút "Đăng xuất".
- Quản trị: nút "Đăng xuất mọi thiết bị" của từng người (mất điện thoại, nghỉ việc); khoá tài khoản thì mọi thiết bị mất hiệu lực.
- Lưu ý: iPhone Safari có thể xoá ghi nhớ nếu ~7 ngày không mở; Gmail gửi tối đa ~100 email/ngày (đủ dùng).
- Video: thêm đoạn "Bảo mật dữ liệu" (quy tắc người dùng: không chia sẻ link / tài khoản, bật xác minh 2 bước, đăng xuất máy chung, khoá điện thoại, không chụp màn hình BN gửi Zalo, không mở / sửa Sheet, file Excel dùng xong xoá, nghiên cứu bỏ họ tên + mã HIS, mất máy / nghỉ việc báo Quản trị).

### (v4.6 đã làm, xem CHANGELOG)

### (v4.5 đã làm, xem CHANGELOG)

### (v4.4 đã làm, xem CHANGELOG)

### (v4.3 đã làm, xem CHANGELOG)

### (v4.1 đã làm, xem CHANGELOG)
<!-- v4.1 cũ:
1. **Đợt xạ mới chép sẵn chẩn đoán + ICD (cả ICD thêm)** từ đợt trước (hiện chỉ chép hành chính, BS điều trị). Vị trí, kỹ thuật, liều để trống (KH mới). BS sửa được trước khi lưu.
2. **KS đổi kỹ thuật (CHỈ kỹ thuật, không đổi liều / số buổi; anh chốt 21/11) khi lập KH** (trước khi "Lập KH xong" chuyển QA / chờ xạ): nút "Đổi kỹ thuật" ở bước Đang lập KH / Chờ QA, có xác nhận (Trước → Sau), lưu vết, báo BS điều trị trên chuông. Áp dụng cả GĐ boost.
3. **Vị trí xạ: dấu "+ thêm vị trí"** (như ICD thêm) khi BN xạ 2 vị trí; lưu nhiều vị trí, thống kê theo vị trí đếm BN ở mọi vị trí.
4. **Phân loại BN đã có buổi xạ: đủ số buổi thì tự vào "Đã xạ xong"**. VD đã đếm 30 buổi, BS nhập 60 Gy / 30 buổi, chọn "Đang xạ" → ứng dụng hỏi xác nhận rồi chuyển Đã xạ xong (hiện đang báo lỗi bắt chọn lại). Sửa thông tin BN đang xạ chưa có tổng mà số buổi = số đã xạ thì đã tự hoàn thành (có sẵn).

5. **Form Phân loại gọn theo bước:** "Lịch trong tuần" chỉ hiện khi chọn Chờ vào xạ / Đang xạ / Tạm ngừng / Đã xạ xong (không hiện ở Đang contour, Chờ lập KH, Đang lập KH, Chờ QA). **Thêm ô "Vị trí xạ"** (gợi ý từ danh mục, có "+ thêm vị trí" như mục 3). Bước "Đang contour": chỉ hỏi BS điều trị, chẩn đoán, ICD (không bắt buộc), vị trí; ẩn kỹ thuật / liều / số buổi.

6. **BN của tôi (BS): thanh số liệu trên cùng thành thanh chọn mục.** Bấm ô nào chỉ hiện danh sách BN của ô đó (không xếp dọc tất cả nữa). Ô đầu tiên **"Tất cả BN"**: xếp theo giai đoạn (thứ tự các ô trên thanh), cùng giai đoạn thì ABC họ → tên đệm → tên, trùng cả họ tên thì theo tuổi (anh chốt 21/11). Các ô khác giữ thứ tự hiện có (theo thời gian / ưu tiên). Thanh đầy đủ hơn: Tất cả · Cần phân loại · Chờ mô phỏng · Đang contour · Lập KH · Chờ QA · Chờ vào xạ · Đang xạ · Tạm ngừng · **Đã xạ xong** (60 ngày gần nhất, kèm Không xạ) · Cần chú ý (vắng ≥ 2 buổi, chưa có tổng liều, cần đánh giá lại KH, tạm ngừng ≥ 7 ngày); ô 0 BN làm mờ. Nhớ ô đang chọn. Điện thoại: thanh cuộn ngang / lưới ô.

   - BN đang xạ mà đang mô phỏng lại / contour / lập KH giai đoạn 2 (boost, KH lại, KH đồng thời): hiện ở ô **Đang xạ** VÀ ở ô của bước giai đoạn 2 (Chờ mô phỏng / Đang contour / Lập KH / Chờ QA) có nhãn "Boost GĐ2" / "KH lại"; trong "Tất cả BN" chỉ 1 dòng ở nhóm Đang xạ kèm nhãn giai đoạn 2 đang ở bước nào. (Chờ anh xác nhận.)
7. **Bỏ nút "Chuyển BN giữa các BS" ở màn hình BN của tôi**; chuyển BS điều trị chỉ ở nút trong hồ sơ từng BN (có xác nhận như cũ).

8. **Hồ sơ BN Chờ phân loại có nút "Phân loại"** ngay trong hồ sơ (cạnh "Sửa thông tin"), không phải thoát ra danh sách. Form Phân loại có ô Vị trí xạ (mục 5), lấy sẵn thông tin vừa sửa.

-->

### Việc chờ dữ liệu (không phải sửa code)
- Tối T7 (tuần này hoặc tuần sau) anh gửi Excel HIS: sổ mô phỏng từ 01/09 + thủ thuật mặt nạ + thủ thuật xạ ("máy gia tốc" = 3D, "có điều biến liều" = VMAT), **có ngày thực hiện**. Em lập bảng NhapDayDu (BS = BS chỉ định mô phỏng; liệt kê BN mà phần lớn buổi xạ dưới tên BS khác, BN có cả 3D và VMAT, BN mô phỏng 2 lần, ICD suy từ chẩn đoán cần BS kiểm tra).

(Hiện chưa có việc sửa code. v3.4 đã làm: nhập đầy đủ từ HIS (NhapDayDu), phân loại BN đã có buổi xạ, chuyển BS điều trị. v3.3 đã làm: nhập sổ HIS vào Chờ phân loại, phân loại về mọi giai đoạn, hàm resetBenhNhan.)

(v3.2 đã làm: chỉ KTV trưởng xếp lịch, phân công Ca 1–4 + Mô phỏng T2–T7, khớp tên BS viết tắt, số tổng Tất cả BN, xếp BN theo ABC.)

(v3.0 đã làm: Không xạ, Lập lại KH, KH đồng thời, Chuyển KH một phần, nhiều mã ICD; gộp v2.11–v2.12.)

(Đã làm trong v2.8: xem CHANGELOG.)

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
