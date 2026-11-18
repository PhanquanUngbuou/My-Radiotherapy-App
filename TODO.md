# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

**Quy ước:** từ sau v2.5, mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản (2.6, 2.7…) và ghi vào CHANGELOG.md.

**Từ sau v2.7: yêu cầu mới ghi vào đây, chỉ làm phiên bản mới khi anh bảo.**

## Việc chờ v2.9 (anh đã cài v2.8; chờ anh duyệt kế hoạch)

1. **Bảng thanh toán thủ thuật gia tốc giống y file tháng 10**: một file mỗi tháng, 2 trang "3D" và "VMAT".
   - Dòng 1: chú thích ký hiệu KTV (IT: …, T: …) lấy từ ô "Ký hiệu"; dòng 2: "Khoa …" (bỏ chữ VARIAN; trang VMAT giữ "BẢNG THANH TOÁN THỦ THUẬT GIA TỐC" và "(IMRT)").
   - Tiêu đề 2 dòng gộp ô: Tuổi → Nam / Nữ; Người làm → BS / KS; trang VMAT: KT → VM / IMRT (đổi chữ dMLC thành IMRT); "Tháng … năm …" trên đủ 31 cột ngày.
   - Thành tiền · Đơn giá · Số buổi · Setup; dòng tổng; khung ký tên đúng vị trí; phông Times New Roman, độ rộng cột, chiều cao dòng, kẻ khung lấy từ file mẫu.
   - Trang VMAT gồm BN VMAT (đánh x cột VM) và IMRT (x cột IMRT); trang 3D gồm các kỹ thuật còn lại.
2. **Sổ mô phỏng CT giống y trang "tháng 10"** của file CT-sim: bắt đầu từ dòng 1, tiêu đề 2 dòng gộp ô, cột Ngày chỉ ghi số ngày, không thêm tiêu đề / tổng / ký tên; phông, độ rộng như mẫu.
3. **Thống kê làm lại thành từng mục riêng, hỏi gì trả lời đó**: chọn mục → chọn kỳ → xem đúng mục đó trên màn hình dạng bảng như Excel → nút "Tải Excel" của riêng mục đó.
   - Mục: Sổ mô phỏng CT · Bảng thanh toán 3D · Bảng thanh toán VMAT · Tổng hợp mô phỏng (mặt nạ, tiêm thuốc, dụng cụ, kỹ thuật, mục đích, BS, KTV) · Lượt xạ trị · Theo KTV / BS · Vắng buổi xạ · Tìm danh sách BN.
4. **Tải Excel thẳng về máy** (.xlsx tạo trên trình duyệt), bỏ hẳn việc tạo trang mới trong Google Sheet ở mọi nút xuất.

(Đã làm trong v2.8: xem CHANGELOG.)

(Đã làm trong v2.7: phân quyền thống kê, ĐD theo khoa, khoa theo BS, lý do ưu tiên / cấp cứu, màu và thứ tự lập KH / xếp lịch, chỉ tiêu khoa, đề xuất / duyệt lịch, nhắc vắng và tạm ngừng.)
