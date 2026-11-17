# Điều phối Xạ trị: ghi chú cho Claude (đọc đầu mỗi phiên)

Ứng dụng web điều phối quy trình xạ trị (mô phỏng → contour → lập KH → QA → xạ) cho Khoa Xạ trị và Khoa Xạ trị theo yêu cầu, Bệnh viện Ung Bướu Hà Nội. Chạy trên **Google Sheets + Apps Script**. Có thể chuyển sang máy chủ nội bộ bệnh viện sau này.

## Người dùng và cách làm việc
- Chủ dự án: BS Phan Văn Quân (xưng "anh", Claude xưng "em"). Mọi trao đổi, nhãn giao diện, thông báo đều bằng **tiếng Việt**.
- **Trình bày kế hoạch trước khi làm thay đổi lớn**, chờ anh duyệt. Thay đổi nhỏ chưa gấp thì ghi vào `TODO.md` để gộp lần sau. Khi anh nói "ghi vào todo / để đó" thì không sửa code, chỉ ghi `TODO.md`.
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
- Ưu tiên: "Ưu tiên" bắt buộc ghi lý do (`ly_do_uu_tien`). Nền đỏ = cấp cứu, nền cam = ưu tiên (BN chưa vào xạ). Lập KH / QA xếp: cấp cứu → (boost sắp tới lượt) → nộp trước (`tg_nop_kh`) làm trước.
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
- Lịch: 3D-CRT xạ T2–T6. IMRT/VMAT nghỉ 1 ngày trong tuần, bù Thứ Bảy. Boost: tuần tự (lên kế hoạch cùng lúc / contour trên CT cũ / mô phỏng lại).

## Trạng thái
- Phiên bản hiện tại: xem `VERSION` và `CHANGELOG.md`. Việc chờ: `TODO.md`.
- Bản demo và trang lấy mã: hai đường dẫn ở bước 6 phía trên.
