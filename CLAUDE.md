# Điều phối Xạ trị: ghi chú cho Claude (đọc đầu mỗi phiên)

Ứng dụng web điều phối quy trình xạ trị (mô phỏng → contour → lập KH → QA → xạ) cho Khoa Xạ trị và Khoa Xạ trị theo yêu cầu, Bệnh viện Ung Bướu Hà Nội. Chạy trên **Google Sheets + Apps Script**. Có thể chuyển sang máy chủ nội bộ bệnh viện sau này.

## Người dùng và cách làm việc
- Chủ dự án: BS Phan Văn Quân (xưng "anh", Claude xưng "em"). Mọi trao đổi, nhãn giao diện, thông báo đều bằng **tiếng Việt**.
- **Trình bày kế hoạch trước khi làm thay đổi lớn**, chờ anh duyệt. Thay đổi nhỏ chưa gấp thì ghi vào `TODO.md` để gộp lần sau. Khi anh nói "ghi vào todo / để đó" thì không sửa code, chỉ ghi `TODO.md`.
- **Từ sau v2.7: mọi yêu cầu mới ghi vào `TODO.md`, KHÔNG sửa code, KHÔNG làm phiên bản mới cho tới khi anh bảo "làm đi / làm bản mới".** Tiết kiệm token: gom việc, chỉ chụp ảnh giao diện khi cần.
- **Mỗi lần gửi bản sửa (dù nhỏ) đều tăng số phiên bản** trong `VERSION` (2.6 → 2.7…) và ghi `CHANGELOG.md`. Ngoại lệ: anh chưa cài bản hiện tại và bảo gộp vào thì giữ số.
- Hướng dẫn cài đặt đưa từng bước, ngắn gọn. Ứng dụng phải nhẹ (vài chục người dùng cùng lúc). Không làm thông báo đẩy, chỉ thông báo trong ứng dụng (chuông). Không làm "giờ hẹn".
- **Dữ liệu cá nhân:** không đưa danh sách email nhân viên hay dữ liệu bệnh nhân vào GitHub.

## Cấu trúc mã
- `src/core.js`: lõi nghiệp vụ dùng chung máy chủ và trình duyệt (`RT`): cột các trang tính (`COLS`), quyền (`PERM`), xử lý thao tác (`handle`), `course()` (tiến độ, ngày vắng, `absent`, `streak`), `view()`, thống kê (`statsScope`, `report`, `summary`, `findPatients`), ICD (`normIcd`, `icdName`), chỉ mục (`indexRow`).
- `src/icd10.js`: danh mục ICD-10 mã C và D (Bộ Y tế), gộp vào `Core.gs`.
- `src/Code.gs`: máy chủ Apps Script: `api(action, payload)`, `setup()`, `archiveOld()` (chạy đêm, lưu trữ BN xong > 60 ngày, buổi xạ lưu theo năm `LuuTru_BuoiXa_YYYY`), trang `ChiMuc`, báo cáo Excel.
- `src/app.js`: giao diện. Menu chung theo quy trình: Bệnh nhân của tôi · Mô phỏng · Contour · Lập kế hoạch · QA · Xạ trị · Tất cả BN · Phân công · Thống kê.
  - "Bệnh nhân của tôi" khác nhau theo vai trò: BS xem BN của mình; KS xem việc của mình; ĐD xem số liệu hôm qua / hôm nay / tuần.
  - KTV không có mục này, mở thẳng Xạ trị › Hôm nay.
  - Quản trị có ô "Xem như" để xem đúng màn hình của người khác (chỉ xem).
- `src/xlsx.js` (`XL`): tạo file .xlsx trên trình duyệt bằng ExcelJS (tải từ cdnjs khi bấm), dựng y mẫu bảng thanh toán 3D / VMAT và sổ mô phỏng (thông số lấy từ file mẫu của khoa), `XL.simple` cho các bảng khác. Không tạo trang báo cáo trong Google Sheet.
- `src/demo.js`: dữ liệu giả cho bản demo. `src/styles.css`: giao diện (màu xanh ngọc, tương phản cao; điện thoại: bảng thành thẻ, form toàn màn hình).
- `build.py` tạo `apps-script/Core.gs`, `Code.gs`, `Index.html` (3 tệp anh dán vào Apps Script) và `demo/index.html`. `tools/build_copy_page.py` tạo `copy-code/index.html` (trang để anh sao chép mã).

## Quy trình mỗi lần sửa
1. Sửa trong `src/` (với sửa dài, viết script Python vào thư mục scratchpad rồi chạy; mỗi chỗ thay phải khớp đúng 1 lần).
2. `python3 build.py && python3 tools/build_copy_page.py`
3. Kiểm thử máy chủ: `node test/gas-mock.test.js` (phải in "Tất cả kiểm tra máy chủ đều đạt"). Thêm kiểm thử cho tính năng mới.
4. Thử giao diện bằng Playwright trên `demo/index.html`, cả khung điện thoại (bọc thêm thẻ meta viewport).
5. Commit với tên `PhanquanUngbuou` <PhanquanUngbuou@users.noreply.github.com>, đẩy: `git -c push.negotiate=true push origin main`.
6. Đăng lại trang demo (Artifact, `file_path` = `demo/index.html`, url `https://claude.ai/artifact/LjYCXtMgMPkLWorjdPjRdE`) và trang lấy mã (`copy-code/index.html`, `https://claude.ai/artifact/JMbm5Umxd5WQSyMEq1jeY5`).
7. Báo anh cách cài: dán đè 3 tệp → chạy `setup` một lần (khi có cột / trang mới) → Triển khai → Quản lý các bản triển khai → sửa → Phiên bản mới.

## Quy tắc nghiệp vụ đã chốt (tóm tắt)
- Vai trò: BS, KS (kỹ sư vật lý), KTV, DD (điều dưỡng), ADMIN. Chức vụ: Trưởng khoa, Phó trưởng khoa (như BS thường), Điều dưỡng trưởng, KTV trưởng, Trưởng phòng, Tài khoản khoa. Trợ lý BS (chỉ BS) thấy BN và thống kê của BS chính.
- Ai cũng thêm được BN (KTV, ĐD, KS nhập theo phiếu chỉ định). Lúc nhập chỉ bắt buộc thông tin hành chính và **bước hiện tại**. Đủ chuyên môn và **mã ICD-10** bắt buộc khi "Contour xong".
- Nhận ca lập KH phải **chọn kỹ sư phụ trách**, có nút đổi kỹ sư.
- Ưu tiên: "Ưu tiên" và "Cấp cứu" bắt buộc ghi lý do (`ly_do_uu_tien`), ô lý do không có câu gợi ý. Nền đỏ = cấp cứu, nền cam = ưu tiên (BN chưa vào xạ). Lập KH / QA xếp: cấp cứu → (boost sắp tới lượt) → nộp trước (`tg_nop_kh`) làm trước. Xếp lịch xạ: cấp cứu → boost → thường/ưu tiên theo thời gian sẵn sàng; boost nền tím.
- Cảnh báo mã HIS: trùng đợt đang hoạt động, hoặc cùng mã mà khác tên (tra cả lưu trữ qua `ChiMuc`).
- Khoa của BN theo khoa của BS điều trị (BS, ĐD bắt buộc có khoa). **ĐD (kể cả ĐD trưởng) chỉ thấy BN khoa mình** (lọc ở máy chủ).
- Thống kê (v2.7):
  - **Chỉ Quản trị, Trưởng khoa, ĐD trưởng** thống kê / lọc theo từng BS (Quản trị cả hai khoa). Tài khoản khoa và ĐD thường: số tổng của khoa.
  - BS: "Của tôi" hoặc "Cả khoa" (số tổng, không chia theo BS). Tìm danh sách BN để nghiên cứu: BS tìm trên toàn bộ BN hai khoa, lọc mọi tiêu chí trừ từng BS.
  - KS, KTV xem việc của mình (danh sách công việc vẫn thấy cả hai khoa). KTV trưởng xem nhóm KTV; trưởng khoa Vật lý xạ trị xem nhóm KS.
  - Danh sách công việc vẫn hiện tên BS cho mọi người; ô lọc theo BS chỉ cho lãnh đạo khoa.
- Vắng buổi xạ:
  - Ghi vắng bằng loại `VANG` trong `LichNgoaiLe`, lý do lấy từ danh mục `LY_DO_VANG`. Có lịch mà không ghi gì thì tính "vắng chưa rõ lý do".
  - BN vắng từ 2 buổi liên tiếp thì báo BS điều trị.
  - Ghi bù buổi quên tích (trong 7 ngày) bắt buộc lý do, lưu `ghi_bu` / `ly_do_bu`, ngày đó hiện màu vàng trên lịch.
- Chỉ tiêu khoa (`CHI_TIEU`, "Khoa: min-max"), kiểm tra 2 tuần đầu của BN mới (`quotaOver`): BN chiếm chỗ từ ngày bắt đầu tới hết đợt (kể cả boost, vắng, tạm ngừng). Đủ chỉ tiêu thì chỉ cảnh báo, đồng ý thì xếp; cấp cứu luôn được xếp; không tô màu bảng chỉ tiêu.
- Xếp lịch: KTV trưởng xếp thẳng; KTV, ĐD đề xuất (`de_xuat_lich`) → KTV trưởng duyệt / sửa / trả lại (Xạ trị › Duyệt lịch). Vắng ≥ 3 buổi liên tiếp: gợi ý tạm ngừng. Tạm ngừng ≥ 7 ngày: hỏi BS mỗi 7 ngày (`xn_tam_ngung`), không nhả chỗ.
- v2.8: thêm BN không hiện trước khi máy chủ lưu; lỗi mạng tự gửi lại (`_rid` + CacheService chống trùng), mở lại form "Gửi lại". Mô phỏng xong chọn 1–2 KTV (`nguoi_mo_phong`), mặt nạ theo loại (`MAT_NA`), tiêm thuốc có/không, dụng cụ (`DUNG_CU` + khác); BS, ĐD, KTV đều có mục Chờ mô phỏng. Ghi buổi xạ chọn KTV (`ktv_xa`). Báo cáo khoa (`khoaReport`): sổ mô phỏng theo mẫu tháng 10 + bảng xạ 3D / IMRT theo tháng (ký hiệu KTV `ky_hieu`, thành tiền = số buổi × `DON_GIA`, cột setup và KS để trống, `KY_TEN`); tổng hợp theo các đầu thông tin mô phỏng. Tài khoản khoa có quyền ĐD + KTV. ICD chỉ 3 ký tự.
- v2.9: Thống kê từng mục riêng (Sổ mô phỏng, Bảng thanh toán 3D, VMAT: tải Excel ngay; Tổng hợp mô phỏng, Theo KTV / BS, Lượt xạ, Vắng, Tìm BN: xem + tải). Mẫu Excel giữ y file khoa (chỉ đổi dMLC → IMRT, bỏ VARIAN).
- v2.10: Bảng 3D = 3D-CRT, bảng VMAT = mọi kỹ thuật khác (không cột KT). KTV xạ / người mô phỏng trong báo cáo lấy theo lịch phân công (`PhanCong`: vị trí bắt đầu bằng tên máy + ca sáng/chiều; vị trí có chữ "Mô phỏng"), không chọn tay. Xạ trị › Hôm nay có menu nhỏ (Xạ buổi đầu, Cần xạ, Đã xạ, Vắng, Nghỉ, Tạm ngừng).
- v2.11: trạng thái `CHO_PL` (Chờ phân loại) cho BN số hoá từ hồ sơ giấy: `importPatients` (Quản trị, KTV trưởng; dán bảng) và `classifyPatient` (KTV) chuyển sang CHO_XA / DANG_XA / TAM_NGUNG / HOAN_THANH / HUY, ghi bù buổi đã xạ. Dữ liệu đọc từ ảnh để ở Google Sheet trong Drive của anh, không đưa vào GitHub.
- v2.12: hàm `nhapBN()` (chạy tay trong Apps Script) đọc trang `NhapBN` → `importPatients`, ghi kết quả ở cột cuối.
- v3.0 (gộp v2.11–2.12, anh mới cài tới v2.10): trạng thái `KHONG_XA` (`noTreat`, BS; chỉ khi chưa xạ buổi nào; vẫn vào sổ mô phỏng, không vào bảng xạ; "Mô phỏng lại (đợt mới)" tạo đợt mới). Cột GiaiDoan `loai` ('' boost | `KH_LAI` | `SONG_SONG`), `thay_gd`, `cat_tai`, `bo_qua`. `replan` (BS): KH lại thay phần còn lại của GĐ đang xạ khi sẵn sàng (`activateReplan` chốt `cat_tai`), BS chọn vẫn xạ KH cũ hoặc tạm dừng ("Chờ lập lại kế hoạch"). KH đồng thời: buổi xạ kèm dòng `gd = 'S' + stt` (không tính vào tiến độ / thống kê lượt), phần dài hơn KH chính là đoạn đuôi; ngày bỏ KH đồng thời cộng `bo_qua` (xạ bù ở cuối). Bảng thanh toán mỗi ngày 1 thủ thuật: có KH không phải 3D thì tính VMAT.
- Lịch: 3D-CRT xạ T2–T6. IMRT/VMAT nghỉ 1 ngày trong tuần, bù Thứ Bảy. Boost: tuần tự (lên kế hoạch cùng lúc / contour trên CT cũ / mô phỏng lại).

## Trạng thái
- Phiên bản hiện tại: xem `VERSION` và `CHANGELOG.md`. Việc chờ: `TODO.md`.
- Bản demo và trang lấy mã: hai đường dẫn ở bước 6 phía trên.
