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

## Mã ICD-10
- [ ] Ô "Mã ICD-10" đặt ngay trước ô Chẩn đoán; không bắt buộc khi nhập, bắt buộc khi Contour xong.
- [ ] Gõ mã ra tên bệnh (và gõ chữ tìm mã); chọn xong tự điền tên bệnh vào ô chẩn đoán. Danh mục ICD ung bướu tải cùng ứng dụng (~30–40 KB), tra cứu trên máy. Ưu tiên danh mục xuất từ HIS; nếu không có thì tự soạn C00–C97, D00–D09, u não lành, mã hay dùng.
- [ ] Thống kê theo mã ICD (gộp 3 ký tự) và theo vị trí xạ: BN bắt đầu xạ, BN có xạ trong kỳ, số lượt xạ; bấm dòng ra danh sách BN; đúng phân quyền; có trong trang báo cáo Excel. Không dùng danh sách "nhóm bệnh".

## Sắp xếp lại form Thêm bệnh nhân
- [ ] Thứ tự: Mã HIS · Họ tên · Năm sinh/tuổi · Giới → Bước hiện tại (ô chọn thả xuống, bắt buộc; ô phụ thuộc bước hiện ngay dưới) → Bác sĩ điều trị → nút Thêm. Phần "Thông tin thêm (không bắt buộc)" ở dưới: ICD, chẩn đoán, vị trí, kỹ thuật, liều, IGRT, boost…
