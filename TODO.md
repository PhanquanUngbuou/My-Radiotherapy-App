# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ (cho v2.8)

1. **Mã ICD-10 chỉ lấy 3 ký tự** (VD: C15, không có C15.1) cho dễ thống kê.
   - Ô nhập ICD: gõ C15.1 / C151 tự rút về C15; gợi ý chỉ hiện mã 3 ký tự kèm tên nhóm bệnh.
   - Danh mục ICD (`src/icd10.js`): chỉ giữ tên mã 3 ký tự, file nhẹ hơn.
   - Dữ liệu cũ có mã 4 ký tự: rút về 3 ký tự khi chạy `setup` (cả trang chính, lưu trữ, `ChiMuc`). Thống kê vốn đã gộp theo 3 ký tự nên số liệu không đổi.
   - Tìm danh sách BN theo ICD: chỉ nhập mã 3 ký tự.

2. **Báo cáo khoa theo mẫu đang dùng** (khoa Xạ trị TYC và khoa Xạ trị), kỳ: ngày / tuần / tháng / quý / bán niên / năm. Chờ anh duyệt kế hoạch (xem trao đổi ngày 18/11).
   - Báo cáo mô phỏng CT: ngày mô phỏng, BN (tuổi nam/nữ, số BA), chẩn đoán, mặt nạ, tiêm thuốc / không tiêm, BS, máy, ngày xạ dự kiến, kỹ thuật; số tổng.
   - Bảng theo dõi xạ trị theo tháng, tách 3D và IMRT/VMAT: mỗi BN một dòng, cột ngày 1–31 ghi ký hiệu KTV xạ buổi đó, BS, KS, số buổi, đơn giá, setup, thành tiền, dòng tổng, khung ký tên. Xuất ra trang tính để tải Excel.
3. **Chọn nhanh tổng liều / số buổi**: liều 70, 66, 60, 50,4, 50, 30 Gy; số buổi 10, 28, 30, 33, 35; vẫn tự nhập được; danh mục sửa trong Quản trị.
4. **Đã mô phỏng xong: chọn 1–2 người mô phỏng** (+ mặt nạ, tiêm thuốc cản quang).
5. **Ghi buổi xạ: chọn KTV xạ ca đó (thường 2 người)**, gợi ý sẵn theo bảng phân công / lần trước. Người dùng có thêm "ký hiệu" (VD: T, Đ) để in bảng.
6. **Tài khoản khoa làm được việc của ĐD và KTV thường.**

7. **Lỗi trên điện thoại: thêm BN hiện ra rồi mấy giây sau báo "network error" và mất.** (Ưu tiên cao; chờ anh chọn làm v2.7.1 hay gộp v2.8; chờ ảnh lỗi trong "Trình thực thi" Apps Script.)
   - Lỗi kết nối: tự gửi lại 2–3 lần; mỗi thao tác kèm mã riêng để máy chủ không tạo trùng.
   - Không mất dữ liệu đã nhập: giữ BN "Chưa lưu, đang thử lại" + nút "Gửi lại".
   - Thông báo lỗi tiếng Việt rõ ràng; rút gọn dữ liệu trả về sau mỗi lần lưu.

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
