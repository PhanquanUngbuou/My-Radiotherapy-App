# Việc chờ, gộp vào bản cập nhật sau

Các thay đổi đã thống nhất nhưng chưa làm, để tránh phải cập nhật lẻ từng lần.

## Cảnh báo trùng mã HIS (bổ sung)
- [ ] Sửa thông tin BN đổi mã HIS sang mã đang trùng với một đợt xạ đang hoạt động khác: cảnh báo, hỏi lại.
- [ ] Thêm BN mà mã HIS đã có đợt xạ đã kết thúc / đã lưu trữ: hiện "BN này từng xạ: vị trí, liều, thời gian" để biết là xạ lại.
- [ ] Trùng mã HIS nhưng khác họ tên (so sánh không dấu, không phân biệt hoa thường): cảnh báo đỏ "Mã HIS này đang gắn với BN tên …, kiểm tra lại".

## Chỉ mục bệnh nhân (tra cứu nhanh khi dữ liệu nhiều năm)
- [ ] Trang tính `ChiMuc`: mỗi đợt xạ một dòng (mã HIS, họ tên + bản không dấu, mã đợt, khoa, BS, vị trí, chẩn đoán, kỹ thuật, liều, số buổi đã xạ, ngày bắt đầu/kết thúc, trạng thái, nơi lưu). Tự cập nhật khi lưu đợt xạ; `setup` tự lập từ dữ liệu sẵn có.
- [ ] Tìm kiếm (kể cả lưu trữ), "Các đợt xạ của BN này" và cảnh báo trùng mã HIS đọc từ `ChiMuc` thay vì đọc toàn bộ lưu trữ.
- [ ] Chia lưu trữ buổi xạ theo năm (`LuuTru_BuoiXa_YYYY`); mở chi tiết đợt cũ và thống kê khoảng ngày cũ chỉ đọc đúng năm cần.
- [ ] Ghi chú lâu dài: sau 5–7 năm cân nhắc tách lưu trữ năm cũ sang file Google Sheet riêng (giới hạn 10 triệu ô/file) hoặc chuyển lên máy chủ của viện.
