# Lịch sử phiên bản

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
