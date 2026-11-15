# Hướng dẫn cài đặt: Điều phối Xạ trị trên Google Sheets

Ứng dụng chạy bằng Google Apps Script. Dữ liệu nằm trong một Google Sheet của anh. Mọi người dùng ứng dụng qua một đường link, trên máy tính hoặc điện thoại, đăng nhập bằng tài khoản Google.

Cài đặt mất khoảng 15 phút và chỉ làm một lần.

## Bước 1: Tạo Google Sheet

1. Vào [sheets.google.com](https://sheets.google.com), tạo một bảng tính trống.
2. Đặt tên, ví dụ: `Điều phối Xạ trị - Dữ liệu`.

## Bước 2: Dán mã nguồn

1. Trong Google Sheet, chọn menu **Tiện ích mở rộng → Apps Script**.
2. Trong file `Code.gs` có sẵn: xoá hết nội dung, dán toàn bộ nội dung file `apps-script/Code.gs`.
3. Bấm dấu **+** cạnh "Tệp" → **Tập lệnh** → đặt tên `Core` → dán nội dung `apps-script/Core.gs`.
4. Bấm dấu **+** → **HTML** → đặt tên `Index` (đúng chữ I hoa) → xoá nội dung có sẵn, dán nội dung `apps-script/Index.html`.
5. Bấm biểu tượng 💾 **Lưu**.

## Bước 3: Chạy cài đặt lần đầu

1. Ở thanh công cụ phía trên, chọn hàm **setup**, bấm **Chạy**.
2. Google sẽ hỏi cấp quyền: chọn tài khoản của anh. Nếu hiện "Google chưa xác minh ứng dụng này", bấm **Nâng cao → Đi tới … (không an toàn)** → **Cho phép**. Cảnh báo này xuất hiện vì đây là ứng dụng anh tự viết, không phải ứng dụng công khai.
3. Quay lại Google Sheet, sẽ thấy các trang tính: `BenhNhan`, `GiaiDoan` (boost), `BuoiXa`, `LichNgoaiLe` (đổi lịch, máy nghỉ), `NguoiDung`, `DanhMuc`, `NhatKy` và 4 trang `LuuTru_…` (lưu trữ).
4. Hàm setup cũng cài lịch **tự động lưu trữ lúc 1 giờ sáng** mỗi ngày. Google sẽ hỏi thêm quyền "chạy khi bạn không có mặt", bấm Cho phép.

## Bước 4: Thêm người dùng

Cách nhanh nhất: sau Bước 6, anh mở ứng dụng, vào tab **Quản trị → + Thêm người dùng**. Hoặc nhập trực tiếp vào trang tính **NguoiDung**, mỗi người một dòng:

| email | ho_ten | vai_tro | kich_hoat |
|---|---|---|---|
| (email Google của anh) | BS. … | ADMIN | Có |
| bacsi.a@gmail.com | BS. Nguyễn A | BS | Có |
| kysu.b@gmail.com | KS. Trần B | KS | Có |
| ktv.c@gmail.com | KTV. Lê C | KTV | Có |
| dieuduong.d@gmail.com | ĐD. Phạm D | DD | Có |

- **Vai trò**: `BS` bác sĩ, `KS` kỹ sư, `KTV` kỹ thuật viên, `DD` điều dưỡng, `ADMIN` quản trị (làm được tất cả).
- Dòng đầu tiên đã có sẵn email của anh với vai trò ADMIN. Nếu anh muốn dùng giao diện bác sĩ thì đổi thành `BS`.
- Khi có người nghỉ hoặc chuyển công tác, đổi `kich_hoat` thành `Không`.

## Bước 5: Chia sẻ Google Sheet

Bấm **Chia sẻ** trên Google Sheet, thêm email của từng người ở Bước 4 với quyền **Người chỉnh sửa**.

Lý do: ứng dụng chạy bằng tài khoản của chính người đang dùng, nên mỗi người cần quyền ghi vào Sheet. Nhắc mọi người chỉ thao tác qua ứng dụng, không sửa trực tiếp trên Sheet.

## Bước 6: Triển khai thành ứng dụng web

1. Trong Apps Script, bấm **Triển khai → Triển khai mới**.
2. Bấm biểu tượng ⚙ cạnh "Chọn loại" → **Ứng dụng web**.
3. Điền:
   - **Thực thi với tư cách:** `Người dùng truy cập ứng dụng web`
   - **Người có quyền truy cập:** `Bất kỳ ai có Tài khoản Google`
4. Bấm **Triển khai**, sao chép **URL ứng dụng web**.
5. Gửi URL này cho mọi người. Lần đầu mở, mỗi người cũng sẽ phải bấm cho phép như ở Bước 3.

Trên điện thoại: mở link bằng Chrome hoặc Safari, chọn **Thêm vào màn hình chính** để mở nhanh như một ứng dụng.

## Chỉnh danh mục

Vào tab **Quản trị** trong ứng dụng để thêm/xoá. Các danh mục gồm:

- `KY_THUAT`: kỹ thuật xạ (3D-CRT, IMRT, VMAT…)
- `IGRT`: phác đồ IGRT dự kiến
- `HINH_ANH`: các loại hình ảnh, định vị KTV tích mỗi buổi (CBCT, kV-kV, SGRT…)
- `MAY`: tên các máy gia tốc. Khi có máy mới, thêm một dòng.
- `KHOA`, `UU_TIEN`, `LY_DO_TAM_NGUNG`
- `NGAY_LE`: ngày nghỉ lễ. Ngày này không tính vào lịch xạ.
- `TEN_DON_VI`: tên khoa, bệnh viện hiện ở thanh trên cùng.

## Cập nhật khi có phiên bản mới

1. Dán lại nội dung các file mới vào Apps Script, bấm Lưu. Chạy lại hàm **setup** một lần (không mất dữ liệu, chỉ bổ sung cột mới nếu có).
2. **Triển khai → Quản lý các bản triển khai** → bấm ✏ → Phiên bản: **Phiên bản mới** → **Triển khai**. Link giữ nguyên.

## Nếu bệnh viện có Google Workspace (email tên miền riêng)

Nên cài vào tài khoản Workspace của viện, và ở Bước 6 chọn:
- **Thực thi với tư cách:** `Tôi`
- **Người có quyền truy cập:** `Bất kỳ ai trong [tên tổ chức]`

Khi đó **bỏ qua Bước 5**: không ai cần quyền vào Sheet, chỉ thao tác được qua ứng dụng. Cách này an toàn hơn.

## Ngày đầu đưa vào dùng

Bác sĩ nhập các bệnh nhân hiện có bằng nút **+ Thêm bệnh nhân**, chọn đúng **Bước hiện tại**:
- *Đang contour* hoặc *Đã contour xong*: như bệnh nhân mới.
- *Đã có kế hoạch, chờ vào xạ*: nhập thêm ngày xạ dự kiến và lịch tuần.
- *Đang xạ dở*: nhập ngày bắt đầu xạ và số buổi đã xạ. Ứng dụng tự điền các buổi đã xạ theo lịch tuần, ghi chú "Nhập ban đầu".

Nên chọn một nhóm nhỏ (ví dụ bệnh nhân của 1–2 bác sĩ trên 1 máy) chạy thử 2 tuần, song song với cách làm cũ, rồi mới mở rộng.

## Lưu ý về dữ liệu bệnh nhân

- Dữ liệu (mã HIS, họ tên, chẩn đoán) nằm trên Google Drive của tài khoản sở hữu Sheet. Nên xin ý kiến lãnh đạo khoa trước khi dùng dữ liệu thật.
- Bắt buộc mọi tài khoản tham gia bật **xác minh 2 bước** của Google.
- Chỉ chia sẻ Sheet cho đúng người trong danh sách, không bật "Bất kỳ ai có đường liên kết".
- Mọi thao tác được ghi vào trang tính **NhatKy** (ai, lúc nào, làm gì). Google Sheet cũng lưu lịch sử phiên bản để khôi phục khi cần.

## Cách ứng dụng xử lý các tình huống

- **Tốc độ:** khi bấm, màn hình cập nhật ngay; việc lưu lên Google chạy ngầm. Nếu lưu lỗi, ứng dụng báo đỏ và tải lại dữ liệu đúng.
- **Dữ liệu tăng theo năm:** mỗi đêm, đợt xạ đã kết thúc quá 60 ngày được chuyển sang các trang `LuuTru_…`. Trang chính luôn gọn. Tìm lại BN cũ ở tab **Tất cả BN → Tìm trong lưu trữ**, hoặc xem trong mục "Các đợt xạ của bệnh nhân này".
- **Boost:** trong chi tiết BN, bấm **+ Thêm boost** và chọn: lập KH cùng lúc với GĐ1 / contour boost trên CT cũ / cần mô phỏng lại / đã có KH boost. Boost đi qua các bước mô phỏng → contour → lập KH → QA như ca thường. Kỹ sư thấy cảnh báo "GĐ trước còn N buổi". Nếu hết GĐ1 mà KH boost chưa sẵn sàng, KTV không ghi được buổi tiếp theo.
- **Đổi lịch từng tuần:** tab **Lịch tuần**, bấm vào ô của ngày muốn đổi (xạ ↔ nghỉ). Dòng cuối cho biết tổng số ca mỗi ngày. Ngày máy bảo trì/hỏng: **+ Ghi ngày máy nghỉ**, lịch của BN tự lùi.
- **Xạ lại, xạ nhiều vị trí:** trong chi tiết BN, bấm **+ Đợt xạ mới cho BN này**. Thông tin hành chính được điền sẵn; chỉ cần nhập chẩn đoán, vị trí, liều. Mỗi đợt xạ hiện lịch sử các đợt trước (vị trí, liều, thời gian), kể cả đợt đã lưu trữ.

## Giới hạn còn lại

- Ứng dụng không cộng liều tích luỹ theo cơ quan (OAR) giữa các đợt; bác sĩ vẫn đánh giá trên TPS. Ứng dụng chỉ hiện liều kê toa của từng đợt.
- Mỗi lần mở ứng dụng mất 1–3 giây để tải dữ liệu từ Google Sheets.
