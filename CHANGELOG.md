# Lịch sử phiên bản

## v2.5
- Form "Thêm bệnh nhân" sắp xếp lại: Mã HIS · Họ tên · Năm sinh · Giới → Bước hiện tại (danh sách chọn, bắt buộc) kèm ô liên quan → Bác sĩ điều trị, Khoa. Phần còn lại gom vào mục "Thông tin thêm", tự mở khi bước đã chọn cần đủ thông tin chuyên môn.
- Mã ICD-10 (danh mục Bộ Y tế, mã C và D) đặt ngay trước Chẩn đoán: gõ mã hiện tên bệnh, ô chẩn đoán còn trống thì tự điền. Không bắt buộc lúc nhập, bắt buộc khi "Contour xong".
- Cảnh báo mã HIS: khi gõ mã HIS hiện các đợt xạ trước (kể cả đã lưu trữ), có nút điền lại họ tên, năm sinh, giới; cảnh báo đỏ nếu mã HIS đã dùng cho tên khác. Áp dụng cả khi sửa mã HIS.
- Thống kê theo mã ICD-10 (3 ký tự) và theo vị trí xạ: BN bắt đầu xạ, BN có xạ trong kỳ, số lượt xạ; bấm một dòng để xem danh sách BN. Có trong trang báo cáo Excel.
- Trang "ChiMuc" (chỉ mục mọi đợt xạ, kể cả lưu trữ) để tra mã HIS và tìm lưu trữ nhanh dù dữ liệu nhiều năm. Buổi xạ lưu trữ tách theo năm (LuuTru_BuoiXa_2026, …).

## v2.4
- Thanh "Đang dùng tài khoản: …" ngay dưới thanh xanh, hiện họ tên, vai trò, chức vụ, email, trên cả điện thoại; kèm liên kết "Không phải bạn? Đăng xuất Google" cho máy tính dùng chung.

## v2.3
- Trên điện thoại: nút nổi "+ Thêm BN" ở góc dưới phải (nút ở thanh tab bị khuất khi màn hình hẹp).
- Chỉ bác sĩ mới được gán làm trợ lý; ô "Trợ lý cho bác sĩ" chỉ hiện khi vai trò là Bác sĩ.

## v2.2
- **Bác sĩ trợ lý**: ô "Trợ lý cho bác sĩ" trong Quản trị. Trợ lý thấy BN của bác sĩ chính trong "Bệnh nhân của tôi", nhận chuông việc mới, thêm BN tự chọn bác sĩ chính, xem thống kê của bác sĩ chính. BN vẫn đứng tên bác sĩ chính. Mỗi bác sĩ chính tối đa 1 trợ lý.

## v2.1
- Người dùng chọn được khoa "Vật lý xạ trị" (khoa của kỹ sư; bệnh nhân vẫn chỉ thuộc Xạ trị / Xạ trị theo yêu cầu).
- Trưởng khoa Vật lý xạ trị và tài khoản khoa Vật lý xem thống kê theo từng kỹ sư.

## v2.0
- **Tab Thống kê**: lượt xạ, số BN xạ, BN bắt đầu/kết thúc/mới, CBCT, SGRT, theo kỹ thuật, theo máy; theo bác sĩ, theo KTV, theo kỹ sư.
- Phân quyền thống kê: quản trị gộp hai khoa; trưởng khoa, điều dưỡng trưởng, tài khoản khoa xem cả khoa mình; bác sĩ (kể cả phó khoa), KTV, kỹ sư chỉ xem số của mình; KTV trưởng xem nhóm KTV; trưởng phòng xem nhóm kỹ sư; điều dưỡng thường không có thống kê. Danh sách làm việc không thay đổi.
- Nút "Tạo trang báo cáo" ghi ra trang tính mới để tải về Excel.
- Người dùng có thêm ô Khoa; chức vụ mới "Tài khoản khoa".

## v1.9
- **Bảng phân công** theo tuần (tab Phân công): vị trí × ngày, KTV trưởng bấm ô để chọn người, sao chép từ tuần trước; ai cũng xem được.
- KTV thấy "Hôm nay bạn: …" ở đầu trang Xạ hôm nay.
- Danh mục "Vị trí phân công" sửa trong tab Quản trị.

## v1.8
- **Chức vụ** (KTV trưởng, Điều dưỡng trưởng, Trưởng khoa, Phó trưởng khoa, Trưởng phòng): xem nhật ký, đăng thông báo.
- KTV trưởng: huỷ buổi xạ ghi nhầm không giới hạn 2 ngày, ghi ngày máy nghỉ, lập phân công.
- **Thông báo tình trạng máy** hiện trên đầu ứng dụng của mọi người trong ngày.
- **Chuông việc mới** khi ứng dụng đang mở: báo đúng người (BS, kỹ sư, KTV) khi có thay đổi do người khác làm.
- Tự cập nhật nhẹ hơn: 30 giây kiểm tra nhanh, chỉ tải lại khi có thay đổi.

## v1.7
- Bác sĩ và kỹ sư (ngoài KTV) bấm được "Đã mô phỏng xong" để chuyển BN từ Chờ mô phỏng sang Đang contour; nút có ngay trong danh sách.
- Trang Lập kế hoạch của kỹ sư có thêm mục "Sắp tới: chờ mô phỏng / bác sĩ đang contour".
- Thêm BN: bắt buộc chọn bước hiện tại (không chọn sẵn); đổi tên bước thành "Chưa mô phỏng" và "Đã mô phỏng, đang contour".

## v1.6
- Thêm BN chỉ bắt buộc phần hành chính: họ tên, mã HIS, năm sinh (hoặc tuổi), bác sĩ điều trị. Phần chuyên môn có thể để trống ở bước Chờ mô phỏng / Đang contour.
- Bác sĩ bấm "Contour xong": nếu thiếu chẩn đoán, kỹ thuật, liều, số buổi thì nhập luôn trong hộp đó; đủ mới chuyển kỹ sư.
- BN thiếu chỉ định hiện nhãn "Chưa đủ chỉ định".

## v1.5
- Khi người dùng cấp thiếu quyền lúc đăng nhập lần đầu, ứng dụng tự hiện lại màn hình xin quyền.
- Thông báo lỗi tiếng Việt kèm cách xử lý: thiếu quyền, chưa được chia sẻ Sheet.

## v1.4
- **Kỹ sư, KTV, điều dưỡng thêm được bệnh nhân** theo phiếu chỉ định của bác sĩ (bắt buộc chọn bác sĩ điều trị).
- Ghi lại người nhập; chi tiết BN hiện "nhập bởi … theo phiếu chỉ định".
- Chỉ bác sĩ và quản trị sửa được chỉ định sau khi nhập.

## v1.3
- Thêm bước **Chờ mô phỏng** cho BN mới; KTV bấm "Đã mô phỏng xong".
- Ô **Vị trí xạ** có danh sách gợi ý (sửa ở tab Quản trị).
- Quản trị có tên bắt đầu bằng "BS" được tính là bác sĩ.
- Hiện số phiên bản ở thanh trên cùng.

## v1.2
- **Boost theo giai đoạn** (lập KH cùng lúc / contour trên CT cũ / mô phỏng lại / đã có KH).
- Tab **Lịch tuần** cho KTV: đổi ngày xạ ↔ nghỉ từng tuần, tổng số ca mỗi ngày, ngày máy nghỉ.
- **Lưu trữ tự động** đợt xạ cũ mỗi đêm; tìm lại trong lưu trữ.
- **Đợt xạ mới cho cùng BN**, lịch sử các đợt xạ; vị trí xạ, mục đích.
- Màn hình cập nhật ngay khi bấm (lưu chạy ngầm).

## v1.1
- Giao diện mới; tab **Quản trị** (người dùng, danh mục, nhật ký).
- Nhập BN đang xạ dở; kết thúc sớm; huỷ hồ sơ; tự tải lại mỗi phút.

## v1.0
- Bản đầu: quy trình contour → lập KH → QA → xạ; KTV xác nhận buổi xạ; xếp lịch 3D / IMRT-VMAT.
