# Lịch sử phiên bản

## v5.1
- **Xạ trị › Theo ngày** (KTV trưởng, Quản trị): chọn Hôm qua / Hôm nay / ‹ ngày › / Khoảng từ – đến. Cột Tổng các khoa và từng khoa: tổng lượt xạ, từng kỹ thuật, **tỉ lệ 3D-CRT / kỹ thuật khác**, theo máy, **giờ xạ buổi đầu → buổi cuối** (ghi "rạng sáng" nếu quá nửa đêm), BN được xạ, mới vào, kết thúc, vắng, ghi bù. Ngày sắp tới (đến 3 tuần): số **dự kiến** (BN dự kiến xạ theo kỹ thuật, vào xạ, kết thúc, đang tạm ngừng). Bấm số ra danh sách, tải Excel. KTV khác không có mục này.
- **Số liệu điều dưỡng xem ngày khác**: cùng thanh chọn ngày (Gần đây = như cũ). Ngày đã qua, khoảng ngày: số của khoa / tổng các khoa (máy chủ tính số tổng). Ngày sắp tới: số dự kiến. Có dữ liệu 60 ngày gần đây; cũ hơn xem Thống kê.
- **Xạ quá nửa đêm**: danh mục mới "Hết ngày làm việc lúc" (mặc định **04:00**). Trước giờ này ứng dụng vẫn tính là ngày hôm trước: Xạ trị › Hôm nay vẫn là lịch hôm trước, ghi buổi xạ không phải ghi bù, BN không bị tính vắng; giờ thực vẫn lưu.
- **Tạm ngừng có "Dự kiến nghỉ"**: 3 ngày · 1 tuần (mặc định) · 2 tuần · Chưa rõ · Tự chọn ngày xạ lại (cột mới `du_kien_xa_lai`). Hiện ở hồ sơ, danh sách Tạm ngừng, lịch (ô viền xanh). Trước 1 ngày chuông báo BS điều trị. Tới ngày: BN hiện ở Xạ trị › Hôm nay › **Dự kiến xạ lại**, KTV ghi buổi xạ là về Đang xạ. Quá ngày mà chưa xạ: hỏi BS (nút "Vẫn xạ tiếp" chọn nghỉ thêm); chưa rõ ngày thì hỏi mỗi 7 ngày như cũ. Ngày kết thúc dự kiến tính từ ngày xạ lại.
- **Ngày tạm ngừng không còn bị tính "vắng chưa rõ lý do"** (trước đây mỗi ngày có lịch trong lúc tạm ngừng bị đếm vắng). Khi BN xạ lại, khoảng đã nghỉ được lưu (cột mới `tn_cac_dot`) để vẫn không tính vắng. Đợt tạm ngừng đã kết thúc trước bản này không truy lại được.
- **Số BN theo khoa từng ngày** (đề xuất của a Thắng): bảng chung 2 tuần, mỗi khoa một dòng + dòng Tổng; ngày đã qua = số BN đã xạ, hôm nay và sắp tới = số BN đang điều trị / chỉ tiêu (nếu có). Ở Lịch tuần (theo tuần đang xem) và Chờ xếp lịch (nút ‹ ›). Thay bảng "Chỗ theo chỉ tiêu khoa" và "Số BN dự kiến xạ 6 ngày tới". Xạ trị › Hôm nay có dòng nhỏ từng khoa: đã xạ / có lịch, vắng.
- **Trang Chờ xếp lịch gọn**: thanh mục Chưa có lịch · Đã có lịch · Sắp chuyển xạ · Đang xạ (đổi lịch); bỏ mục Chờ mô phỏng (đã có ở tab Mô phỏng).
- **Form xếp lịch có lịch nhỏ 3 tuần**: mỗi ngày ghi số BN của khoa / chỉ tiêu (xanh còn chỗ, xám đủ), bấm ngày để chọn ngày bắt đầu, hiện ngay ngày kết thúc.
- **Tất cả BN lọc theo thời gian**: 1 / 3 / 6 tháng gần đây, Năm nay, Tự chọn (từ – đến): BN có mô phỏng, xạ hoặc đang điều trị trong khoảng. Tải Excel theo đúng khoảng; máy nhớ lựa chọn.
- Kiểm thử: sửa một kiểm thử phụ thuộc ngày (hôm qua là Thứ Hai).
- **Cần chạy `setup` một lần** (2 cột mới ở BenhNhan).

## v5.0
- **Số liệu điều dưỡng: mọi con số của khoa bấm được** (tổng lượt xạ, từng kỹ thuật, BN được xạ, mới vào, kết thúc, lượt vắng, BN vắng, ghi bù). Danh sách hiện ra có ô tìm tên / mã HIS, **sắp xếp** (ABC họ tên, theo BS, theo kỹ thuật, theo ngày), **lọc theo BS điều trị** (mọi ĐD dùng được), nút **⬇ Tải Excel** đúng danh sách đang xem; bấm dòng mở hồ sơ. Số tổng các khoa không bấm (ĐD chỉ xem BN khoa mình).
- **Trang "Tất cả BN" có nút "⬇ Tải Excel"**: tải đúng danh sách đang lọc (trạng thái, BS, khoa, ô tìm) gồm họ tên, mã HIS, năm sinh, giới, ICD, chẩn đoán, vị trí, kỹ thuật, liều, số buổi, BS, khoa, trạng thái, đã xạ, bắt đầu, kết thúc / dự kiến.
- **Quyền "Sửa thông tin":** chỉ BS điều trị của BN (kể cả trợ lý khi trợ lý là BS điều trị), Trưởng khoa, Quản trị; máy chủ chặn người khác. BS khác mở hồ sơ vẫn xem đủ thông tin, không có nút "Sửa thông tin". **Form sửa không đổi được BS điều trị** (ô chỉ đọc): đổi BS dùng nút "Chuyển BS điều trị" (lý do, xác nhận, chuông, lưu vết).
- Không có cột mới: không cần chạy `setup`.

## v4.10
- **Sửa lỗi "Chuyển BS điều trị" từ hồ sơ BN báo "Chưa chọn BN nào"** dù đã chọn BN (form gửi mã BN dạng chữ, máy chủ chờ danh sách). Nay chuyển được từ hồ sơ; máy chủ nhận cả hai dạng.
- Không có cột mới: không cần chạy `setup`.

## v4.9
- **Hồ sơ BN có mục "Mô phỏng"** (mọi vai trò đều xem được, chỉ nút chức năng khác nhau): ngày mô phỏng (hoặc "chưa mô phỏng · hẹn …"), KTV mô phỏng, **mặt nạ** (loại / không làm; mặt nạ mới hay dùng lại), **tiêm thuốc cản quang Có / Không**, dụng cụ, chỉ định mô phỏng lại trên HIS (vào sổ hay không). BN có boost / KH lại mô phỏng lại: mỗi lần một khối.
- **Sửa đếm vắng:** BN chờ phân loại / không xạ có buổi xạ cũ nhập từ HIS không còn bị tính "vắng chưa rõ lý do" mỗi ngày. Số vắng trên bảng ĐD, thống kê Vắng, danh sách "BN đang vắng xạ" chỉ còn BN đang trong đợt xạ (đang xạ, tạm ngừng, chờ vào xạ, đã xạ xong trong thời gian xạ).
- Sửa: Quản trị dùng "Xem như" một ĐD / tài khoản khoa thì cột "tổng các khoa" trong số liệu ĐD bị tính bằng số của khoa. Nay tính trên toàn bộ BN như khi ĐD đăng nhập thật (ĐD đăng nhập thật không bị lỗi này).
- Không có cột mới: không cần chạy `setup`.

## v4.8
- **Tìm kiếm ngay tại tab đang đứng** (Bệnh nhân của tôi, Mô phỏng, Contour, Lập kế hoạch, QA, Xạ trị): không chuyển trang; khung "Kết quả tìm" hiện ở đầu tab, tìm trên toàn bộ BN (BN thuộc bước của tab lên trước), mỗi BN có nút đúng bước và đúng quyền người xem: Đã mô phỏng xong, Contour xong, Nhận ca, Lập KH xong, Đổi kỹ thuật, QA đạt / không đạt, Phân loại, Xếp lịch, ✓ Xác nhận xạ, Vắng, Mở hồ sơ. Nút "Xoá tìm kiếm" (hoặc xoá chữ) → danh sách của tab hiện lại. Tab khác (Phân công, Thống kê, Quản trị) vẫn chuyển sang "Tất cả BN".
- **Số liệu điều dưỡng: mỗi ô "số của khoa / tổng các khoa"** (lượt xạ, theo kỹ thuật, BN được xạ, mới vào, kết thúc, vắng, ghi bù) để báo cáo xạ của khoa trên tổng số. Máy chủ chỉ gửi con số tổng, ĐD vẫn chỉ thấy danh sách BN khoa mình. Người xem lọc theo một khoa (Quản trị, ĐD trưởng…) cũng thấy số tổng.
- **Ghi buổi xạ không cần tích xác nhận nữa:** đầu form có thanh vàng cam với **họ tên và mã HIS chữ to** (kèm tuổi, giới, chẩn đoán, buổi n/tổng, liều) để KTV nhìn lại đúng BN rồi bấm "Ghi buổi xạ" ngay. Vẫn giữ cảnh báo "đã có buổi xạ hôm nay"; BN đang tạm ngừng vẫn phải tích ô chuyển về Đang xạ.
- Không có cột mới: không cần chạy `setup`.

## v4.7
- **KTV tìm BN trong tab Xạ trị và xác nhận xạ ngay:**
  - Đang ở tab Xạ trị, gõ mã HIS hoặc tên vào ô tìm kiếm thì không chuyển trang; khung "Kết quả tìm" hiện ở đầu tab, mỗi BN có nút **"✓ Xác nhận xạ"**, "Vắng", "Mở hồ sơ". Bấm Enter không tự mở form (KTV tự bấm sau khi kiểm tra đúng BN).
  - Báo tình trạng ngay trên dòng: đã xạ hôm nay (giờ), tạm ngừng (từ ngày, lý do), chưa xếp lịch / lịch bắt đầu ngày khác, hôm nay không có lịch, đã ghi vắng, chưa có tổng liều, chưa rõ ngày nghỉ (bấm chọn luôn). Các trường hợp này vẫn ghi buổi xạ được.
  - Không cho ghi (báo lý do đỏ): đã xạ hôm nay, chờ BS đánh giá lại KH, KH tiếp theo chưa sẵn sàng, đã đủ số buổi, chưa tới bước xạ / đã xạ xong.
  - Nút "Xoá tìm kiếm". Ngoài tab Xạ trị, tìm kiếm vẫn sang "Tất cả BN"; với KTV danh sách đó có thêm nút "✓ Xác nhận xạ".
- **Ghi buổi xạ cho BN đang tạm ngừng:** phải tích ô xác nhận "ghi buổi xạ sẽ chuyển BN về Đang xạ"; ghi chú BN lưu vết "Tiếp tục xạ … sau tạm ngừng từ …".
- Kiểm thử: phần sổ mô phỏng không còn phụ thuộc ngày chạy (thứ Hai).
- Không có cột mới: không cần chạy `setup`.

## v4.6
- **Số liệu điều dưỡng sau ngày nghỉ:** cột "Hôm qua" thay bằng các ngày từ ngày làm việc trước, **mỗi ngày một cột riêng**. Sáng thứ Hai: cột "Thứ Sáu" và "Thứ Bảy (xạ bù)", rồi Hôm nay, Tuần này. Chủ nhật / ngày lễ chỉ hiện khi có buổi xạ bù. Ngày đầu sau nghỉ lễ cũng vậy.
- Sửa các khung nhắc màu vàng bị vỡ thành nhiều cột chữ (form Phân loại, Thêm bệnh nhân…).
- Tiêu đề bảng số liệu điều dưỡng xuống dòng trên điện thoại, không đè chữ.
- Không có cột mới: không cần chạy `setup`.

## v4.5
- **Không bao giờ có 2 BN trùng mã HIS:**
  - Form "Thêm bệnh nhân": gõ mã HIS là tra ngay (trang `ChiMuc`, gồm cả đợt đã lưu trữ).
  - Đang có đợt hoạt động: báo bước hiện tại, nút "Mở hồ sơ BN", không cho lưu; máy chủ chặn hẳn (bỏ "vẫn tạo đợt mới").
  - Chỉ có đợt đã kết thúc: liệt kê các đợt cũ, nút "Thêm đợt xạ mới" (chép sẵn hành chính, chẩn đoán, ICD).
- **Mô phỏng lại / đợt mới: hỏi BS "Đã tích chỉ định mô phỏng lại trên HIS?"** (boost, KH lại, KH đồng thời chọn mô phỏng lại; đợt xạ mới):
  - Có → vào sổ mô phỏng. Không → vẫn theo dõi quy trình, không vào sổ.
  - BS sửa được câu trả lời trong "Sửa thông tin" / sửa giai đoạn. Hồ sơ BN hiện dòng "Mô phỏng lại".
- **Mặt nạ khi mô phỏng lại** (form "Mô phỏng xong" của KTV):
  - Nói rõ lần mô phỏng trước BN có dùng mặt nạ loại nào không.
  - Cùng loại với lần trước: chọn "Dùng lại mặt nạ cũ" hoặc "Làm mặt nạ mới". Khác loại (hoặc lần trước không có): là mặt nạ mới, không hỏi.
  - Mặt nạ mới: phải tích "Đã có thủ thuật làm mặt nạ trên HIS" → vào sổ mô phỏng và thống kê mặt nạ. Dùng lại: không ghi mặt nạ vào sổ.
- **Cột mới `mp_his`, `mat_na_cu` (BenhNhan, GiaiDoan): cần chạy `setup` một lần.**

## v4.4
- **BS trợ lý chỉ đứng tên BS điều trị khi Quản trị cho phép:**
  - Quản trị › sửa người dùng: ô tích "Được làm BS điều trị" (hiện khi có "Trợ lý cho bác sĩ"). Bảng người dùng ghi "chưa nhận BN" / "được làm BS điều trị".
  - Chưa tích: trợ lý không có trong danh sách chọn BS điều trị (thêm BN, phân loại, chuyển BS); máy chủ cũng chặn khi thêm BN, sửa đổi BS, phân loại, chuyển BS. Trợ lý tự thêm BN thì mặc định đứng tên BS chính.
  - BN cũ đang đứng tên trợ lý giữ nguyên, vẫn sửa thông tin được.
  - Nhập từ HIS: tên BS là trợ lý thì giữ đúng trợ lý; kết quả nhập nhắc Quản trị tích ô nếu chưa tích.
- **Huỷ hồ sơ chỉ khi BN chưa mô phỏng** (Chờ mô phỏng, hoặc chờ phân loại không có ngày mô phỏng): BN huỷ không vào sổ mô phỏng. **Từ Đang contour trở đi không huỷ được nữa, chỉ chọn Không xạ** (vẫn vào sổ mô phỏng); máy chủ cũng chặn. Form huỷ nhắc: đã mô phỏng thì không được huỷ vì sai lệch báo cáo mô phỏng, phải tích ô xác nhận BN chưa mô phỏng. Form Phân loại BN có ngày mô phỏng không còn mục Huỷ.
- **Cột mới `nhan_bn` trong trang NguoiDung: cần chạy `setup` một lần.**

## v4.3
- **Thanh chọn mục ở Bệnh nhân của tôi (BS) gọn hơn:**
  - Màn hình máy tính: 11 ô trên một hàng. Màn hẹp / điện thoại: ô nhỏ, xuống dòng.
  - Dòng phụ (sắp kết thúc, chưa xếp lịch, cấp cứu) thành chấm màu cạnh số, rê chuột xem.
- **Ô "Lập KH"** (Của tôi và Cả khoa):
  - BN chờ lập KH lên trên, theo hàng đợi của phòng (cấp cứu → boost sắp tới lượt → nộp trước làm trước).
  - BN đang lập KH xuống dưới (cấp cứu → nộp trước).
- **Chuông:** thông báo đã xem không sáng lại khi tải lại trang. Nhắc việc hằng ngày (vắng từ 2 buổi, tạm ngừng 7 ngày, mốc đánh giá lại KH) báo mỗi BN một lần mỗi ngày; danh sách việc mới giữ lại sau khi tải trang (nhớ trong trình duyệt, theo từng tài khoản).
- Không có cột mới: không cần chạy `setup`.

## v4.2
- Hàm **`suaLichTuan()`** (chạy tay một lần trong Apps Script, quyền Quản trị) cho BN đã nhập từ HIS bằng bản trước v4.1:
  - BN VMAT / IMRT chưa rõ lịch tuần được suy lại từ các buổi đã xạ.
  - Đã qua Thứ 7 mà không xạ Thứ 7 nào → T2–T6. Đoán được ngày nghỉ → T2–T7 nghỉ ngày đó.
  - Không đoán được thì giữ cờ "Chưa rõ ngày nghỉ" để KTV sửa.
  - Các buổi "vắng" Thứ 7 cũ của BN được sửa tự mất.
- Không có cột mới: không cần chạy `setup`.

## v4.1
- **BN của tôi (BS): thanh chọn mục.** Bấm ô nào chỉ hiện danh sách của ô đó:
  - Các ô: Tất cả BN · Cần phân loại · Chờ mô phỏng · Đang contour · Lập KH · Chờ QA · Chờ vào xạ · Đang xạ · Tạm ngừng · Đã xạ xong (60 ngày gần nhất, kèm Không xạ) · Cần chú ý (vắng từ 2 buổi, chưa có tổng liều, cần đánh giá lại KH, tạm ngừng từ 7 ngày).
  - Ô 0 BN làm mờ; ứng dụng nhớ ô đang chọn. Điện thoại: thanh vuốt ngang.
  - "Tất cả BN" xếp theo giai đoạn, cùng giai đoạn ABC họ → tên đệm → tên, trùng cả họ tên thì người nhiều tuổi trước.
  - BN đang xạ mà giai đoạn 2 (boost, KH lại, KH đồng thời) đang mô phỏng / contour / lập KH: hiện ở ô Đang xạ (kèm nhãn giai đoạn 2 đang ở bước nào) và ở ô của bước đó.
  - Bỏ nút "Chuyển BN giữa các BS"; chuyển BS điều trị bằng nút trong hồ sơ từng BN.
- **KS đổi kỹ thuật** (chỉ kỹ thuật, giữ liều / số buổi) khi đang lập KH hoặc chờ QA, cả boost:
  - Có xác nhận Trước → Sau.
  - Lưu vết trong nhật ký và ghi chú BN.
  - BS điều trị nhận thông báo trên chuông.
- **Vị trí xạ: "+ thêm vị trí"** cho BN xạ 2 vị trí; thống kê theo vị trí đếm BN ở mọi vị trí.
- **Đợt xạ mới chép sẵn chẩn đoán và ICD** (cả ICD thêm) từ đợt trước.
- **Phân loại:**
  - Nút "Phân loại" ngay trong hồ sơ BN chờ phân loại.
  - Form có ô Vị trí xạ. "Lịch trong tuần" chỉ hiện ở Chờ vào xạ / Đang xạ / Tạm ngừng / Đã xạ xong.
  - "Đang contour" chỉ hỏi BS, chẩn đoán, ICD, vị trí.
  - BN đã có buổi xạ, nhập số buổi bằng số đã xạ: hỏi xác nhận rồi chuyển "Đã xạ xong".
- **Lịch tuần VMAT / IMRT:**
  - Chưa rõ BN nghỉ ngày nào thì tạm tính xạ cả Thứ 7, gắn cờ "Chưa rõ ngày nghỉ".
  - KTV (không chỉ KTV trưởng) sửa được bằng nút "Sửa lịch tuần" trong hồ sơ, hoặc bấm cờ ở Xạ trị › Tuần. Chọn được "Thứ 2 → Thứ 6 (không xạ Thứ 7)".
  - Nhập từ HIS: BN VMAT đã qua Thứ 7 mà không xạ Thứ 7 nào → T2–T6. Không suy được ngày nghỉ → ghi chú cho KTV.
- Không có cột mới trong Google Sheet: không cần chạy `setup`.

## v4.0
- **BN có 2 ung thư hiện cả 2 mã ICD:**
  - Danh sách BN: mã chính là nhãn đặc, mã thêm là nhãn viền; rê chuột xem tên bệnh.
  - Hồ sơ BN: mỗi mã một dòng kèm tên bệnh, ghi "chính" / "thêm", tiêu đề "Mã ICD-10 (BN có 2 ung thư)".
  - Áp dụng cả kết quả Tìm BN và tra lưu trữ. Thống kê theo ICD đếm BN ở mọi mã (như v3.0).
- **Nhập đầy đủ từ HIS** (`nhapDayDu`) thêm cột cuối **"ICD thêm"** (nhiều mã cách nhau dấu phẩy, bỏ trùng mã chính).
- Không có cột mới trong Google Sheet: không cần chạy `setup`.

## v3.9
- **Sửa thông tin BN: xác nhận trước khi lưu.** Bấm "Lưu thay đổi" sẽ hiện bảng từng mục **Trước → Sau** (VD Chẩn đoán, ICD, BS điều trị, mặt nạ…); phải tích "Tôi đã kiểm tra, xác nhận sửa thông tin bệnh nhân" mới lưu. Không có gì thay đổi thì không lưu.
- **Lưu vết mọi lần sửa:** nhật ký ghi ai sửa, lúc nào, từng mục giá trị cũ → mới; ghi chú của BN thêm dòng "[ngày] Sửa thông tin (tên người sửa): …" để ai mở hồ sơ cũng thấy. Phục vụ sửa sai sót cho BN nhập hàng loạt từ HIS.
- Không có cột mới: không cần chạy `setup`.

## v3.8
- **BS sửa được thông tin BN nhập hàng loạt** (nút "Sửa thông tin" trong hồ sơ BN): BN Chờ phân loại, Đã xạ xong / Không xạ, Đang xạ chưa có tổng số buổi sửa được hành chính, chẩn đoán, ICD, kỹ thuật, BS điều trị… mà không bắt buộc đủ tổng liều, số buổi. Khi đã điền số buổi (BN không có KH thứ hai) thì phải đủ tổng liều, ICD như thường.
- Form sửa thông tin có thêm **Ngày mô phỏng, Mặt nạ, Tiêm thuốc cản quang** (BN nhập từ HIS có thể thiếu hoặc sai).
- Không có cột mới: không cần chạy `setup`.

## v3.7
- **BN chờ phân loại quay lại xạ: KTV ghi buổi xạ luôn**, không cần phân loại trước. Áp dụng cho BN đã có buổi xạ (nhập từ HIS) và có kỹ thuật: nút "Quay lại xạ: ghi buổi" ở Xạ trị › Chờ phân loại và "✓ BN quay lại xạ: ghi buổi xạ" trong hồ sơ BN (tìm theo tên / mã HIS). Ghi xong BN tự chuyển sang Đang xạ (chưa có tổng số buổi thì BS bổ sung sau).

## v3.6
- **Đang xạ, chưa có tổng số buổi** (BN nhập từ HIS): KTV vẫn ghi buổi xạ bình thường ("Buổi 9 / ?"), ứng dụng không tự kết thúc đợt, chưa tính ngày kết thúc. Danh sách hiện "Đã xạ N buổi · Chưa có tổng liều / số buổi". BS có mục **"BN đang xạ chưa có tổng liều / số buổi"** trong Bệnh nhân của tôi; bổ sung tổng liều, số buổi (sửa chỉ định) là ứng dụng tính lại ngày kết thúc như thường.
- **Chờ phân loại → Đang xạ khi chưa biết tổng**: BN đã có buổi xạ, KTV (hoặc BS) chọn "Đang xạ", để trống tổng liều / số buổi, chỉ cần kỹ thuật. Dùng khi BN xạ trước 16/11 quay lại xạ tiếp.
- **Nhập đầy đủ từ HIS** (`nhapDayDu`) thêm 3 cột: Trạng thái (Đang xạ / Đã xạ xong / để trống), Kỹ thuật GĐ2, Các ngày xạ GĐ2:
  - "Đang xạ": vào thẳng Đang xạ (chưa có tổng thì như trên).
  - "Đã xạ xong": đợt cũ, ngày kết thúc = buổi cuối.
  - 2 KH liên tiếp khác kỹ thuật (VD VMAT rồi 3D): GĐ1 = các buổi kỹ thuật đầu, GĐ2 (boost, sẵn sàng) = kỹ thuật sau; buổi xạ gắn đúng giai đoạn để bảng thanh toán 3D / VMAT đúng.
- Không có cột mới trong Google Sheet: không cần chạy `setup`.

## v3.5
- **`nhapDayDu` nhập nhanh hàng trăm BN**: gom lại rồi ghi một lần mỗi trang (BN, buổi xạ, nhật ký, kết quả), dựng lại chỉ mục ở cuối. 550 BN với khoảng 7.700 buổi xạ chạy trong thời gian cho phép của Apps Script (trước đây ghi từng dòng sẽ quá 6 phút). Giới hạn mỗi lần nhập nâng lên 1500 BN.

## v3.4
- **Nhập đầy đủ từ HIS** (chuẩn bị cho đợt nhập BN từ 01/09): trang tính **NhapDayDu** + hàm **`nhapDayDu`** chạy trong Apps Script (lần đầu chạy tạo trang có dòng tiêu đề; chạy lại không nhập trùng, cột cuối ghi kết quả từng dòng).
  - Mỗi dòng một BN: mã HIS, họ tên, năm sinh, giới, chẩn đoán, ICD, BS điều trị (email hoặc tên), ngày mô phỏng, tiêm thuốc, mặt nạ, kỹ thuật, **các ngày đã xạ**, tổng liều, tổng số buổi, ghi chú.
  - Các buổi xạ được ghi **đúng ngày thực hiện** (không suy theo lịch tuần); lịch tuần VMAT (nghỉ thứ mấy, bù Thứ Bảy) suy từ các ngày đã xạ.
  - Đủ BS, ICD, chẩn đoán, kỹ thuật, tổng liều, tổng số buổi → vào thẳng **Đang xạ** (hoặc **Đã xạ xong** nếu đủ buổi). Thiếu → **Chờ phân loại**, kết quả ghi rõ thiếu gì.
- **Phân loại BN đã có buổi xạ**: chỉ còn chọn Đang xạ / Tạm ngừng / Đã xạ xong / Huỷ, chỉ cần điền tổng liều + tổng số buổi (không ghi bù lại các buổi đã có). Mục Chờ phân loại có cột "Đã xạ" (số buổi, từ ngày → ngày), cảnh báo BN lâu chưa xạ (có thể đã xong / tạm ngừng).
- **Chuyển BS điều trị**: nút "Chuyển BS điều trị" trong hồ sơ BN và "Chuyển BN giữa các BS" trong Bệnh nhân của tôi (chọn nhiều BN). BS đang điều trị, BS nhận (tự nhận BN về mình), trưởng khoa, quản trị làm được. Có cảnh báo và ô xác nhận; khoa của BN đổi theo BS mới; ghi nhật ký và ghi chú; BS nhận được báo trên chuông.
- Sửa: khi phân loại "Đã xạ xong" / "Đang contour", các ô không bắt buộc không còn dấu *.
- Không có cột mới: không cần chạy `setup` (trang NhapDayDu tự tạo khi chạy `nhapDayDu` lần đầu).

## v3.3
- **Xoá toàn bộ BN để nhập lại từ đầu**: hàm `resetBenhNhan` chạy trong trình soạn thảo Apps Script.
  - Trước khi xoá, tự sao lưu cả file Google Sheet vào Drive (tên file có chữ "sao lưu trước khi xoá BN").
  - Xoá mọi BN, giai đoạn, buổi xạ, ngày vắng / nghỉ của BN, chỉ mục, lưu trữ, trang NhapBN.
  - Giữ người dùng, danh mục, phân công, nhật ký, ngày máy nghỉ.
- **Nhập sổ HIS chia bước theo ngày mô phỏng**: ô "BN mô phỏng trước ngày này vào Chờ phân loại" (mặc định hôm qua). BN mô phỏng từ hôm kia trở về trước vào **Chờ phân loại**, BN mô phỏng hôm qua / hôm nay vào Chờ mô phỏng. Mỗi dòng xem trước ghi rõ BN sẽ vào đâu.
- **Phân loại về mọi giai đoạn**: Đang contour · Chờ lập KH · Đang lập KH (chọn KS) · Chờ QA · Chờ vào xạ · Đang xạ · Tạm ngừng · Đã xạ xong · Không xạ · Huỷ.
  - Đang contour: chỉ cần BS điều trị.
  - Chờ lập KH trở đi: cần ICD, chẩn đoán, kỹ thuật, liều, số buổi (như "Contour xong").
  - Đang xạ / Tạm ngừng: thêm ngày bắt đầu và số buổi đã xạ; app tự ghi bù các buổi theo lịch tuần.
  - **Đã xạ xong: chi tiết không bắt buộc.** Có đủ kỹ thuật, liều, số buổi, ngày bắt đầu thì app ghi bù đủ các buổi (thống kê, bảng thanh toán đủ); không thì chỉ ghi đã xong, có thể nhập ngày kết thúc.
- **Ai phân loại**: KTV, KS, quản trị, và BS (BN của mình). BS có mục "BN cần phân loại về đúng giai đoạn" trong Bệnh nhân của tôi. Mục Xạ trị › Chờ phân loại có thêm cột BS điều trị, ngày mô phỏng.
- Không có cột / trang mới: không cần chạy `setup`.

## v3.2
- **Xếp lịch xạ giao cho KTV trưởng** (theo chức vụ, hiện là anh Thắng) và quản trị. Bỏ ô "Người xếp lịch xạ" của v3.1 (cột `xep_lich` không dùng nữa). Bỏ đề xuất / duyệt lịch: KTV khác, ĐD không còn nút "Xếp lịch", "Đề xuất lịch", "Đổi lịch", không thêm / bớt ngày xạ trên lịch. Bỏ mục Duyệt lịch. Đề xuất cũ còn treo (nếu có) hiện cho KTV trưởng với nút "Xếp theo đề xuất" / "Xếp lịch khác".
- **Phân công chỉ Ca 1, Ca 2, Ca 3, Ca 4 và Mô phỏng, từ Thứ Hai đến Thứ Bảy.** Chạy `setup` một lần để đổi danh mục vị trí cũ sang 5 vị trí này (sau đó vẫn sửa được trong Quản trị › Vị trí phân công).
  - Mới: Quản trị › **Giờ các ca xạ** (VD "Ca 1: 07:00-09:30"). Có giờ ca thì form ghi buổi xạ chọn sẵn đúng KTV của ca, bảng thanh toán ghi đúng KTV từng buổi. Chưa ghi giờ thì lấy mọi KTV các ca trong ngày.
- **Nhập sổ HIS: khớp tên bác sĩ viết tắt tên đệm** ("Nguyễn T. Ngọc Hà" = "Nguyễn Thị Ngọc Hà"; chỉ nhận khi khớp đúng một bác sĩ).
- **Tất cả BN**: số tổng BN đang trong quy trình cạnh tên mục trên menu; trong trang có hàng số theo từng trạng thái, bấm để lọc (bấm lần nữa bỏ lọc).
- **Xếp BN theo ABC họ → tên đệm → tên**: Tất cả BN, Xạ trị › Hôm nay (mọi nhóm), Lịch tuần, Contour, Chờ mô phỏng (theo ngày mô phỏng, cùng ngày thì theo ABC). Lập KH, QA, Chờ xếp lịch vẫn theo thứ tự ưu tiên.
- Cài bản này cần chạy `setup` một lần (đổi vị trí phân công).

## v3.1
- **Nhập BN từ sổ chuyên khoa HIS (tệp Excel)**: nút "Nhập từ sổ HIS" ở mục Tất cả BN (quản trị, trưởng khoa, ĐD trưởng, tài khoản khoa, KTV trưởng). Chọn tệp Excel sổ "mô phỏng và mặt nạ" xuất từ HIS (.xls / .xlsx). Ứng dụng đọc ngay trên máy, không dùng AI, tệp không gửi đi đâu:
  - Chỉ lấy BN có dịch vụ "Mô phỏng…", bỏ BN chỉ làm mặt nạ. Gộp các dòng cùng mã BN.
  - Lấy mã HIS, họ tên (đổi về chữ thường), năm sinh, giới (cột Nam/Nữ), chẩn đoán, ngày mô phỏng (theo dòng "Ngày dd/mm/yyyy"). Tự khớp bác sĩ chỉ định với danh sách bác sĩ, bỏ học hàm như "BSCKII.", "ThS.BSNT.". Khoa lấy theo khoa của bác sĩ.
  - Bảng xem trước:
    - Mới: chọn sẵn.
    - Đã có: trùng đợt đang hoạt động hoặc đã nhập trong 30 ngày, tra cả lưu trữ.
    - Cần xem: chưa khớp bác sĩ (chọn bác sĩ ngay trên dòng), hoặc mã HIS đã dùng cho tên khác.
  - Lọc theo ngày, mặc định 7 ngày gần nhất.
  - BN vào bước **Chờ mô phỏng**, ghi chú "Nhập từ sổ HIS", kèm BS chỉ định và nơi gửi. Mỗi lần tối đa 150 BN.
- **Điều dưỡng không xếp / đề xuất lịch xạ nữa.**
- **Người xếp lịch xạ**: Quản trị › Sửa người dùng › ô "Người xếp lịch xạ".
  - Khi đã đánh dấu ít nhất một người, chỉ người đó (và quản trị) xếp lịch thẳng, duyệt / trả lại đề xuất, thêm / bớt ngày xạ. KTV khác chỉ gửi đề xuất.
  - Chưa đánh dấu ai thì như cũ: KTV trưởng xếp và duyệt.
- Cột mới: `xep_lich` trong trang NguoiDung (chạy `setup` một lần).

## v3.0
Gộp cả v2.11 và v2.12 (số hoá BN từ hồ sơ giấy: mục "Chờ phân loại", nhập danh sách, trang NhapBN, hàm `nhapBN`), vì anh mới cài tới v2.10.
- **Không xạ**: BS bấm "Không xạ" (bắt buộc lý do) khi BN chưa xạ buổi nào → đợt đóng lại (trạng thái "Không xạ"). Không vào bảng xạ 3D / VMAT, vẫn có trong sổ mô phỏng nếu đã mô phỏng. Khi BN quay lại: mở hồ sơ, bấm **"Mô phỏng lại (đợt mới)"**: chép sẵn hành chính, chẩn đoán, ICD, BS, bắt đầu ở bước Chờ mô phỏng, không báo trùng đợt.
- **Lập lại KH giữa đợt**: BS bấm "Lập lại KH" trên BN đang xạ, chọn làm lại từ: mô phỏng lại / contour lại trên CT cũ / chỉ lập lại KH; trong lúc chờ: **vẫn xạ KH cũ** hoặc **tạm dừng xạ** (BS chọn). KH lại đi qua Mô phỏng → Contour → Lập KH → QA như boost. Khi KH lại sẵn sàng: KH cũ dừng ở số buổi đã xạ, các buổi sau xạ theo KH mới; BN đang tạm dừng chờ KH thì tự chuyển Đang xạ. Sổ mô phỏng ghi "(KH lại)".
- **Hai KH đồng thời** (VD thực quản 3D + đầu cổ VMAT): "+ Thêm boost / KH đồng thời" → chọn "KH đồng thời". Mỗi lần ghi buổi xạ, KTV tích luôn KH đồng thời (mặc định có tích; bỏ tích nếu hôm đó chỉ xạ KH chính, buổi thiếu tự xạ bù ở cuối). Hồ sơ hiện tiến độ riêng từng KH. KH dài hơn thì sau khi xong KH chính BN xạ tiếp phần còn lại.
- **Chuyển KH một phần** (VD KH 30 buổi, KS chuyển 20): KS ghi "Chỉ chuyển một phần KH" khi Lập KH xong (mục nhỏ, mặc định đóng), hoặc BS / KS bấm "Chuyển KH một phần" trên hồ sơ. Còn 2 buổi tới mốc: chuông báo BS, BN hiện trong mục "BN cần đánh giá lại kế hoạch" của BS. Hết số buổi được chuyển: KTV không ghi được buổi tiếp theo, BS chọn **Xạ tiếp KH cũ** (hết KH hoặc thêm một phần) / **Lập lại KH** / **Kết thúc đợt**.
- **KH đồng thời hiện gọn cả hai**: mỗi KH có tên vị trí (VD Thực quản, Đầu cổ); danh sách, hồ sơ, form ghi buổi hiện liều / số buổi / tiến độ riêng từng KH; tổng = số ngày xạ.
- **Nhiều mã ICD**: dưới ô ICD có "+ thêm mã ICD" (chỉ khi cần). Thống kê theo ICD đếm BN ở mọi mã; tìm BN khớp mọi mã; sổ mô phỏng ghi đủ các mã.
- Cài bản này cần chạy `setup` một lần (cột mới: BenhNhan `icd_phu`, `chuyen_buoi`; GiaiDoan `loai`, `thay_gd`, `cat_tai`, `bo_qua`, `vi_tri`, `chuyen_buoi`).
- **Bảng thanh toán: mỗi ngày 1 thủ thuật** cho BN có KH đồng thời: hai KH đều 3D → 1 lượt 3D; có ít nhất 1 KH không phải 3D → 1 lượt VMAT.

## v2.12
- **Hàm `nhapBN` trong Apps Script**: dán danh sách BN (từ hồ sơ giấy) vào trang tính **"NhapBN"** (`setup` tạo sẵn, có dòng tiêu đề), chạy `nhapBN` trong trình soạn thảo là BN vào mục "Chờ phân loại". Cột cuối ghi "Đã nhập" hoặc lý do bỏ qua từng dòng; chạy lại không nhập trùng.

## v2.11
- **Số hoá BN từ hồ sơ giấy, không nhập từng BN**: Xạ trị › **Chờ phân loại** (trạng thái mới). Quản trị / KTV trưởng bấm "Nhập danh sách BN", dán bảng copy từ Google Sheet / Excel (Mã HIS · Họ tên · Năm sinh · Giới · Chẩn đoán · ICD · Mục đích · Kỹ thuật · Tổng liều · Số buổi · Các mức liều · Ghi chú; cột thiếu để trống; bỏ qua dòng thiếu mã HIS / họ tên hoặc trùng đợt đang hoạt động).
- **KTV phân loại** từng ca sang Chờ vào xạ · Đang xạ · Tạm ngừng · Đã xạ xong · Huỷ, điền đủ BS điều trị (→ khoa), ICD, chẩn đoán, kỹ thuật, liều, số buổi; Đang xạ / Tạm ngừng / Đã xong ghi ngày bắt đầu, số buổi đã xạ (app tự ghi bù các buổi theo lịch tuần).

## v2.10
- **Hai bảng thanh toán đủ toàn bộ lượt xạ của khoa**: bảng 3D = 3D-CRT; bảng VMAT = mọi kỹ thuật còn lại (VMAT, IMRT, SRS/SBRT, Khác…), tính chung, bỏ cột KT (VM / IMRT). Khi tải có dòng đối chiếu "3D … + VMAT … = tổng … buổi của khoa".
- **Không chọn KTV khi mô phỏng xong và khi ghi buổi xạ nữa.** Báo cáo lấy người theo **lịch phân công tuần**: KTV xạ = người phân công máy của BN đúng ca (trước 12 giờ là ca sáng; buổi ghi bù lấy cả hai ca); người mô phỏng = người phân công vị trí "Mô phỏng". Ngày chưa có lịch phân công máy: tạm ghi người bấm xác nhận và báo danh sách ngày đó khi tải.
- **Xạ trị › Hôm nay có menu nhỏ hàng ngang**: Xạ buổi đầu (đã làm / tổng ca setup, gồm cả buổi đầu giai đoạn boost) · Cần xạ hôm nay · Đã xạ · Vắng hôm nay · Nghỉ hôm nay · Tạm ngừng. Bấm mục nào hiện danh sách mục đó; trên điện thoại thành ô bấm 2 cột. BN chờ mô phỏng xem ở tab Mô phỏng; chờ xếp lịch ở Xạ trị › Chờ xếp lịch.

## v2.9
- **Thống kê chia thành từng mục riêng, hỏi gì trả lời đó**: chọn mục → chọn kỳ (ngày / tuần / tháng / quý / 6 tháng / năm) → tải hoặc xem đúng mục đó.
  - Tải Excel ngay: **Sổ mô phỏng CT**, **Bảng thanh toán 3D**, **Bảng thanh toán VMAT** (mỗi tháng một trang).
  - Xem trên app + tải Excel: Tổng hợp mô phỏng (mặt nạ, tiêm thuốc, dụng cụ, kỹ thuật, mục đích, BS, KTV; bấm dòng ra danh sách BN), Theo KTV / bác sĩ, Lượt xạ trị, Vắng buổi xạ, Tìm danh sách BN.
- **Tải file .xlsx thẳng về máy** (máy tính và điện thoại); **không còn tạo trang báo cáo trong Google Sheet**. Bộ tạo Excel chỉ tải về khi bấm nút lần đầu, app mở bình thường không nặng thêm.
- **Bảng thanh toán thủ thuật gia tốc giống y file mẫu tháng 10**: trang "3D" và "VMAT", dòng chú thích ký hiệu KTV, "Khoa …" (bỏ chữ VARIAN; trang VMAT có "BẢNG THANH TOÁN THỦ THUẬT GIA TỐC", "(IMRT)"), tiêu đề gộp ô (Tuổi Nam / Nữ, Người làm BS / KS, KT VM / IMRT, Tháng … năm … trên 31 cột ngày), Thành tiền · Đơn giá · Số buổi · Setup với công thức như file, dòng tổng, khung ký tên đúng vị trí; độ rộng cột, phông Times New Roman, đường kẻ như mẫu. Trang VMAT gồm BN VMAT (x cột VM) và IMRT (x cột IMRT); cột BS ghi tên gọi.
- **Sổ mô phỏng CT giống y trang "tháng 10"**: tiêu đề 2 dòng gộp ô, cột Ngày ghi số ngày, phông Times New Roman 14, kẻ khung.

## v2.8
- **Thêm BN chỉ hiện khi máy chủ đã lưu xong** (không còn hiện trước rồi biến mất). Lỗi mạng thì tự gửi lại 3 lần; vẫn lỗi thì mở lại form giữ nguyên thông tin đã nhập, bấm "Gửi lại". Mọi thao tác lưu đều tự gửi lại khi lỗi mạng và có mã riêng để máy chủ không làm trùng (không tạo trùng BN).
- **Báo cáo khoa** (Thống kê › Báo cáo khoa) theo mẫu khoa đang dùng; kỳ ngày / tuần / tháng / quý / 6 tháng / năm; Quản trị, KTV trưởng chọn khoa, Trưởng khoa / ĐD trưởng / tài khoản khoa xem khoa mình.
  - Sổ mô phỏng CT theo mẫu sổ tháng 10: Ngày · Họ tên BN · Tuổi (Nam / Nữ) · Số BA · Chẩn đoán · Bác sỹ · Mặt nạ (x) · Ngày xạ ĐT · Kỹ thuật xạ.
  - Bảng theo dõi xạ trị mỗi tháng, tách 3D và IMRT: cột ngày ghi ký hiệu KTV xạ buổi đó, BS, KS (để trống cho ĐD trưởng tích), Thành tiền = số buổi × đơn giá, Đơn giá, Số buổi, Setup (để trống), dòng tổng.
  - Tổng hợp: mô phỏng theo mặt nạ (loại), tiêm thuốc, dụng cụ khác, kỹ thuật, mục đích, bác sĩ, KTV mô phỏng (bấm một dòng ra danh sách BN); xạ trị theo KTV, theo bác sĩ, thành tiền.
  - "Tạo trang Excel": mỗi tháng / nhóm kỹ thuật một trang, có khung ký tên.
- **Đã mô phỏng xong**: chọn 1–2 KTV mô phỏng (gợi ý theo bảng phân công vị trí mô phỏng); mặt nạ: không / 3 / 4 / 5 / 6 điểm; tiêm thuốc cản quang: có / không; dụng cụ khác: miếng bù da, nêm lưỡi, ô "khác" tự ghi.
- **Chờ mô phỏng có mục riêng**: BS (Bệnh nhân của tôi), điều dưỡng (màn hình khoa), KTV (Xạ trị › Hôm nay: cả BN chưa có ngày hẹn).
- **Tìm danh sách BN** lọc thêm theo mặt nạ, tiêm thuốc, dụng cụ khác.
- **Mục đích xạ trị** thêm "Tân bổ trợ", "Củng cố" (`setup` tự thêm vào danh mục đang dùng).
- **Ghi buổi xạ**: chọn KTV xạ ca đó (thường 2 người), chọn sẵn theo bảng phân công máy / ca hôm nay hoặc lần ghi trước.
- **Ký hiệu nhân viên** (VD: T, Đ, IT) trong Quản trị, in trên bảng xạ trị.
- **Chọn nhanh tổng liều** (70, 66, 60, 50,4, 50, 30 Gy) và **số buổi** (10, 28, 30, 33, 35) dưới ô nhập; vẫn tự gõ được; danh sách sửa trong Quản trị.
- **Tài khoản khoa** làm được việc của điều dưỡng và KTV thường (ghi buổi xạ, ghi vắng, mô phỏng xong, đề xuất lịch, thêm BN).
- **Mã ICD-10 chỉ 3 ký tự** (C15, không C15.1); `setup` tự rút mã cũ về 3 ký tự; danh mục ICD gọn hơn.
- Quản trị: danh mục mới "Tổng liều hay dùng", "Số buổi hay dùng", "Đơn giá" (buổi xạ 21.000), "Khung ký tên", "Loại mặt nạ", "Dụng cụ khác khi mô phỏng".
- Cột mới (cần chạy `setup`): BenhNhan / GiaiDoan `nguoi_mo_phong`, `mat_na`, `tiem_thuoc`, `dung_cu`; BuoiXa `ktv_xa`; NguoiDung `ky_hieu`.

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
- **Khi khoa đủ chỉ tiêu**: kiểm tra cả 2 tuần đầu của BN (không chỉ ngày bắt đầu); form xếp lịch báo số chỗ của khoa ngày đó, ngày nào trong 2 tuần đầu sẽ vượt và gợi ý "ngày sớm nhất còn chỗ"; vượt chỉ tiêu thì phải đánh dấu "Vẫn xếp, đồng ý vượt chỉ tiêu" (người duyệt cũng phải đồng ý). BN cấp cứu luôn được xếp.
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
