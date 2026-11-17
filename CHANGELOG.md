# Lịch sử phiên bản

## v2.7
- **Thống kê theo từng bác sĩ chỉ dành cho Trưởng khoa, Điều dưỡng trưởng và Quản trị.** Bảng "Theo bác sĩ" là một mục trong "Lượt xạ trị": số BN được xạ, lượt xạ, BN bắt đầu, BN kết thúc, lượt vắng, dòng cộng; bấm một bác sĩ để xem danh sách BN. Có trong trang Excel.
- **Tài khoản khoa** chỉ còn số tổng của khoa, không còn số theo từng bác sĩ.
- **Bác sĩ**: chọn phạm vi "Của tôi" hoặc "Cả khoa" (số tổng của khoa, không chia theo bác sĩ).
- **Tìm danh sách BN để nghiên cứu**: bác sĩ tìm trên toàn bộ BN hai khoa, lọc theo mã ICD, vị trí, kỹ thuật, khoa, mục đích, trạng thái; không có ô lọc theo từng bác sĩ. Kỹ sư, KTV vẫn chỉ tìm ca của mình; điều dưỡng tìm trong khoa mình.
- **Ô lọc theo bác sĩ** trong "Tất cả BN" và các bước chỉ còn cho lãnh đạo khoa; bác sĩ thường có lựa chọn "BN của tôi".
- **Điều dưỡng (kể cả ĐD trưởng) chỉ thấy BN khoa mình**: máy chủ chỉ gửi BN khoa đó, kể cả khi tìm lưu trữ; bỏ ô chọn khoa.
- **Thêm / sửa BN: khoa theo bác sĩ điều trị.** Danh sách bác sĩ chia nhóm theo khoa; chọn bác sĩ thì khoa tự điền và khoá. Máy chủ cũng tự gán. Bác sĩ chưa ghi khoa thì chọn khoa bằng tay.
- **Quản trị**: tài khoản bác sĩ và điều dưỡng bắt buộc chọn khoa.
- **Lý do ưu tiên / cấp cứu**: BN "Ưu tiên" và "Cấp cứu" bắt buộc ghi lý do (khi thêm BN, Contour xong, Đổi ưu tiên, sửa BN, boost). Lý do hiện dưới nhãn ưu tiên và trong chi tiết BN. Cột mới `ly_do_uu_tien`, `tg_nop_kh`, `de_xuat_lich`, `de_xuat_boi`, `de_xuat_luc`, `xn_tam_ngung` (cần chạy `setup`).
- **Tô màu BN đang chuẩn bị xạ** (mô phỏng → chờ vào xạ): cấp cứu nền đỏ, ưu tiên nền cam, thường để nguyên.
- **Xếp lịch xạ** (Chờ vào xạ chưa có lịch, Sắp chuyển xạ): xếp theo nhóm Cấp cứu → Boost → Thường / Ưu tiên, trong nhóm ai sẵn sàng trước xếp trước; có chú thích màu (đỏ cấp cứu, tím boost, cam ưu tiên). "Sắp chuyển xạ" có cả KH boost.
- **Chỉ tiêu số BN đang xạ của mỗi khoa** (danh mục CHI_TIEU trong Quản trị, mặc định Xạ trị 90–100, Xạ trị theo yêu cầu 80–90). Bảng "Chỗ theo chỉ tiêu khoa" 10 ngày tới ở Chờ xếp lịch / Duyệt lịch: số BN chiếm chỗ, còn bao nhiêu chỗ, số BN kết thúc. BN vắng, tạm ngừng vẫn giữ chỗ; chỗ "có thể" trống (BN gần đây có vắng) tách riêng. Điều dưỡng chỉ thấy khoa mình.
- **Xếp lịch có duyệt**: KTV trưởng xếp lịch trực tiếp. KTV và điều dưỡng các khoa gửi **đề xuất lịch**; KTV trưởng nhận thông báo trên chuông, mục **Xạ trị › Duyệt lịch** (có số đếm trên tab) hiện người đề xuất, lúc nào, chỗ của khoa ngày đó; KTV trưởng sửa nếu cần rồi duyệt, hoặc trả lại kèm lý do (người đề xuất được báo). KTV vẫn đổi lịch tuần cho BN đang xạ.
- **Khi khoa đủ chỉ tiêu**: form xếp lịch báo số chỗ của khoa ngày đó và gợi ý "ngày sớm nhất còn chỗ"; vượt chỉ tiêu thì phải đánh dấu "Vẫn xếp, đồng ý vượt chỉ tiêu" (người duyệt cũng phải đồng ý). BN cấp cứu luôn được xếp.
- **BN vắng từ 3 buổi liên tiếp**: báo bác sĩ cân nhắc chuyển Tạm ngừng (nút ngay trong danh sách).
- **BN tạm ngừng từ 7 ngày**: hỏi bác sĩ "còn xạ tiếp không?" (chuông + mục trong Bệnh nhân của tôi); bấm "Vẫn xạ tiếp" thì 7 ngày sau hỏi lại, hoặc "Kết thúc đợt". BN tạm ngừng không bị nhả chỗ.
- **Thứ tự trong Lập kế hoạch và QA**: cấp cứu lên trước, sau đó ai nộp trước (giờ bấm "Contour xong") làm trước; "Ưu tiên" không còn vượt lên trên, chỉ tô màu.

## v2.6
- **Thống kê làm lại**: chọn loại trước (Lượt xạ trị · Vắng buổi xạ · Tìm danh sách BN), chọn khoảng thời gian, rồi xem.
  - Lượt xạ trị: tổng lượt, BN được xạ, bắt đầu / kết thúc, lượt vắng, theo kỹ thuật, bảng theo từng ngày (khoảng ≤ 2 tháng), theo khoa, máy, người, ICD, vị trí.
  - Vắng buổi xạ: số lượt, số BN, theo lý do, danh sách từng buổi vắng (bấm để mở BN).
  - Tìm danh sách BN: theo mốc (có xạ / bắt đầu / kết thúc / nhập), mặt bệnh ICD (nhiều mã, gõ 3 ký tự lấy cả nhóm), vị trí, kỹ thuật, BS, khoa, mục đích, trạng thái. Danh sách gọn, bấm từng BN xem đầy đủ (kể cả đợt đã lưu trữ). Xuất Excel.
  - Điều dưỡng thường được dùng thống kê của khoa mình.
- **Màn hình điều dưỡng**: số liệu Hôm qua / Hôm nay / Tuần này (tổng lượt, theo kỹ thuật, BN mới vào, kết thúc, lượt vắng, BN vắng, buổi ghi bù), đang xạ / chờ vào xạ / tạm ngừng, sắp kết thúc xạ theo từng ngày, danh sách BN đang vắng (số buổi vắng liên tiếp, lý do). Bấm con số để xem danh sách BN.
- **Ghi vắng buổi xạ**: nút "Vắng" trong Xạ hôm nay, chọn lý do (danh mục LY_DO_VANG sửa được trong Quản trị). Buổi có lịch mà không ghi gì tính là "vắng chưa rõ lý do". Bấm ngày vắng trên lịch xạ của BN để ghi / sửa lý do. BS, ĐD, KTV đều ghi được.
- **Báo bác sĩ** khi BN của mình vắng từ 2 buổi liên tiếp (chuông + mục "BN vắng từ 2 buổi liên tiếp").
- **Ghi bù buổi xạ quên tích**: chọn ngày đã qua (trong 7 ngày) hoặc bấm ngày vắng trên lịch → "BN có xạ, quên ghi"; bắt buộc lý do, lưu vết trong nhật ký, ngày ghi bù có màu vàng trên lịch.
- **Nhận ca lập kế hoạch phải chọn kỹ sư phụ trách**; có nút "Đổi kỹ sư" cho ca đang lập.
- **Quản trị "Xem như"**: chọn một người (BS, KS, KTV, ĐD, tài khoản khoa) để xem đúng màn hình của họ, chỉ xem, không thao tác.

## v2.5
- Form "Thêm bệnh nhân" sắp xếp lại: Mã HIS · Họ tên · Năm sinh · Giới → Bước hiện tại (danh sách chọn, bắt buộc) kèm ô liên quan → Bác sĩ điều trị, Khoa. Phần còn lại gom vào mục "Thông tin thêm", tự mở khi bước đã chọn cần đủ thông tin chuyên môn.
- Mã ICD-10 (danh mục Bộ Y tế, mã C và D) đặt ngay trước Chẩn đoán: gõ mã hiện tên bệnh, ô chẩn đoán còn trống thì tự điền. Không bắt buộc lúc nhập, bắt buộc khi "Contour xong".
- Cảnh báo mã HIS: khi gõ mã HIS hiện các đợt xạ trước (kể cả đã lưu trữ), có nút điền lại họ tên, năm sinh, giới; cảnh báo đỏ nếu mã HIS đã dùng cho tên khác. Áp dụng cả khi sửa mã HIS.
- Thống kê theo mã ICD-10 (3 ký tự) và theo vị trí xạ: BN bắt đầu xạ, BN có xạ trong kỳ, số lượt xạ; bấm một dòng để xem danh sách BN. Có trong trang báo cáo Excel.
- Menu xếp theo đường đi của BN, chung cho mọi người: Bệnh nhân của tôi · Mô phỏng · Contour · Lập kế hoạch · QA · Xạ trị (Hôm nay / Lịch tuần / Chờ xếp lịch) · Tất cả BN · Phân công · Thống kê. Mỗi bước có số ca đang chờ; các mục ngăn bằng gạch mảnh. Trên điện thoại menu hiện hết thành các ô, không phải vuốt ngang.
- "Bệnh nhân của tôi" theo vai trò. Kỹ sư: ca contour xong chờ nhận, ca mình đang lập (BS điều trị, nhận từ ngày nào, mấy ngày, hạn), ca mình chờ QA, ca mình đã chuyển xạ. KTV gắn với máy và ca nên không có ô này: mở thẳng Xạ trị › Hôm nay, có thêm số BN chờ vào xạ (bao nhiêu chưa xếp lịch), mô phỏng hôm nay, danh sách chờ xếp lịch. BS, ĐD: như cũ.
- Điều dưỡng (và khi bấm "Cả khoa"): tổng quan theo khoa (mặc định khoa của mình, chọn được cả hai khoa): số BN từng bước, chờ vào xạ kèm ngày xạ dự kiến, đang xạ kèm ngày kết thúc dự kiến; dải "Vào xạ và kết thúc xạ 10 ngày tới" đếm số BN bắt đầu / kết thúc mỗi ngày. Bấm vào BN để xem nhật ký từng buổi xạ.
- Nút "+ Thêm bệnh nhân" chuyển lên hàng trên cạnh chuông, không bị menu dài đẩy khuất.
- Trên điện thoại danh sách BN hiện thành từng thẻ đọc dọc (tên BN trên cùng, các thông tin xếp 2 cột có nhãn, nút thao tác to bên dưới), không phải lướt ngang.
- Tăng độ tương phản chữ/nền: chữ chính và chữ phụ đậm hơn, đường kẻ rõ hơn, chữ phụ to hơn một chút.
- Trên điện thoại các form mở toàn màn hình, nút lưu luôn dính ở đáy, thêm nút "Lưu" ở góc trên; trang phía sau không bị cuộn theo.
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
