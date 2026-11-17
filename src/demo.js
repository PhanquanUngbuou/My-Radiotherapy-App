/* Chế độ demo: dữ liệu giả trong bộ nhớ trình duyệt, dùng chung lõi RT với máy chủ thật. */
window.DEMO = (function () {
  'use strict';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var now = new Date();
  var today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  var shifted = false;
  if (RT.dow(today) === 0) { today = RT.addDays(today, 1); shifted = true; } // Chủ nhật → giả lập Thứ Hai

  var users = [
    { email: 'bs.hai@demo', ho_ten: 'BS. Trần Hải', vai_tro: 'BS', chuc_vu: 'Trưởng khoa', khoa: 'Xạ trị theo yêu cầu' },
    { email: 'bs.thu@demo', ho_ten: 'BS. Lê Thu', vai_tro: 'BS', khoa: 'Xạ trị' },
    { email: 'bs.chi@demo', ho_ten: 'BS. Vũ Chi', vai_tro: 'BS', khoa: 'Xạ trị', tro_ly_cho: 'bs.thu@demo' },
    { email: 'ks.nam@demo', ho_ten: 'KS. Đỗ Nam', vai_tro: 'KS' },
    { email: 'ks.ha@demo', ho_ten: 'KS. Vũ Hà', vai_tro: 'KS' },
    { email: 'ktv.linh@demo', ho_ten: 'KTV. Hoàng Linh', vai_tro: 'KTV', chuc_vu: 'KTV trưởng' },
    { email: 'ktv.son@demo', ho_ten: 'KTV. Trần Sơn', vai_tro: 'KTV' },
    { email: 'ktv.ha@demo', ho_ten: 'KTV. Lê Hà', vai_tro: 'KTV' },
    { email: 'dd.mai@demo', ho_ten: 'ĐD. Mai Anh', vai_tro: 'DD', chuc_vu: 'Điều dưỡng trưởng', khoa: 'Xạ trị theo yêu cầu' },
    { email: 'dd.lan@demo', ho_ten: 'ĐD. Phạm Lan', vai_tro: 'DD', khoa: 'Xạ trị' },
    { email: 'quantri@demo', ho_ten: 'Quản trị khoa', vai_tro: 'ADMIN' }
  ];
  users.forEach(function (u) { u.kich_hoat = 'Có'; u.chuc_vu = u.chuc_vu || ''; u.khoa = u.khoa || ''; u.tro_ly_cho = u.tro_ly_cho || ''; });
  var roster = [], rev = 1;
  var logs = [];
  var dm = JSON.parse(JSON.stringify(RT.DEFAULT_DM));
  var holidays = [];
  var patients = [], fractions = [], phases = [], exceptions = [];
  var archive = { patients: [], phases: [], fractions: [] };
  var current = 'bs.hai@demo';
  var seq = 0;

  function back(p, n) { // lùi n ngày xạ tính từ hôm qua
    var s = RT.addDays(today, -1), c = 0;
    for (var i = 0; i < 200; i++) { if (RT.isTreatDay(p, s, holidays)) { c++; if (c === n) return s; } s = RT.addDays(s, -1); }
    return s;
  }
  function wdAgo(n) { var s = today, c = 0; while (c < n) { s = RT.addDays(s, -1); if (RT.dow(s) >= 1 && RT.dow(s) <= 5) c++; } return s; }
  function fwd(n) { var s = today, c = 0; while (c < n) { s = RT.addDays(s, 1); if (RT.dow(s) >= 1 && RT.dow(s) <= 5) c++; } return s; }

  // Mã ICD-10 và vị trí xạ cho dữ liệu giả, suy từ chẩn đoán
  var DX = [[/vòm họng/i, 'C11.9', 'Vòm họng'], [/cổ tử cung/i, 'C53.9', 'Tiểu khung'], [/nội mạc tử cung/i, 'C54.1', 'Tiểu khung'],
    [/di căn não/i, 'C79.3', 'Não (toàn não)'], [/di căn (xương|cột sống)/i, 'C79.5', 'Cột sống'], [/phổi/i, 'C34.9', 'Lồng ngực'],
    [/vú trái/i, 'C50.9', 'Vú trái'], [/vú phải/i, 'C50.9', 'Vú phải'], [/tiền liệt/i, 'C61', 'Tiểu khung'], [/trực tràng/i, 'C20', 'Tiểu khung'],
    [/thực quản/i, 'C15.9', 'Lồng ngực'], [/hạ họng/i, 'C13.9', 'Đầu cổ'], [/thanh quản/i, 'C32.9', 'Đầu cổ'], [/tuyến giáp/i, 'C73', 'Đầu cổ'],
    [/amidan/i, 'C09.9', 'Đầu cổ'], [/lưỡi/i, 'C02.9', 'Đầu cổ'], [/bàng quang/i, 'C67.9', 'Tiểu khung']];
  function demoIcd(p) {
    var m = DX.filter(function (x) { return x[0].test(p.chan_doan); })[0];
    if (!m) return;
    if (['MO_PHONG', 'CONTOUR'].indexOf(p.trang_thai) < 0) p.icd = m[1];
    if (!p.vi_tri) p.vi_tri = m[2];
  }
  function mk(o) {
    seq++;
    var p = {};
    RT.COLS.BenhNhan.forEach(function (c) { p[c] = ''; });
    p.id = 'XT' + today.slice(2, 4) + '-' + ('000' + seq).slice(-4);
    p.ma_his = String(26000000 + seq * 7919 % 99991 * 13);
    p.khoa = 'Xạ trị theo yêu cầu'; p.may = 'Máy gia tốc 1'; p.uu_tien = 'Thường'; p.igrt = 'Không'; p.sgrt = 'Không';
    p.bs_email = 'bs.hai@demo';
    Object.keys(o).forEach(function (k) { p[k] = o[k]; });
    if (p.bs_email === 'bs.thu@demo' || p.bs_email === 'bs.chi@demo') p.khoa = 'Xạ trị';
    if (p.uu_tien === 'Ưu tiên' && !p.ly_do_uu_tien) p.ly_do_uu_tien = ['Người nhà nhân viên bệnh viện', 'Theo chỉ đạo Ban Giám đốc', 'BN ở xa, cần xạ sớm để về'][seq % 3];
    if (p.uu_tien === 'Cấp cứu' && !p.ly_do_uu_tien) p.ly_do_uu_tien = /chèn ép/i.test(p.chan_doan) ? 'Chèn ép tủy' : 'Đau nhiều, dọa chèn ép tủy';
    if (p.chan_doan && !p.icd) demoIcd(p);
    patients.push(p);
    return p;
  }
  function img(p, n) {
    var a = [];
    if (/CBCT/.test(p.igrt)) {
      if (/hằng ngày/.test(p.igrt) || (/3 buổi/.test(p.igrt) && (n <= 3 || n % 5 === 1)) || (/hằng tuần/.test(p.igrt) && !/3 buổi/.test(p.igrt) && n % 5 === 1)) a.push('CBCT');
    }
    if (/kV-kV/.test(p.igrt) && (/hằng ngày/.test(p.igrt) || n % 5 === 1)) a.push('kV-kV (2D)');
    if (p.sgrt === 'Có') a.push('SGRT (C-RAD)');
    return a.join(', ');
  }
  // Tạo các buổi xạ từ ngày bắt đầu tới `upto`, bỏ các ngày trong `skip`
  function ph(p, o) {
    var g = {};
    RT.COLS.GiaiDoan.forEach(function (c) { g[c] = ''; });
    g.stt = '2'; g.id = p.id + '-G2'; g.bn_id = p.id; g.uu_tien = p.uu_tien || 'Thường'; g.ngay_tao = wdAgo(5);
    Object.keys(o).forEach(function (k) { g[k] = o[k]; });
    phases.push(g);
    return g;
  }
  function treat(p, start, upto, skip, limit) {
    skip = skip || [];
    limit = limit || RT.num(p.so_buoi);
    var n = 0;
    for (var s = start, i = 0; s <= upto && n < limit && i < 400; s = RT.addDays(s, 1), i++) {
      if (!RT.isTreatDay(p, s, holidays) || skip.indexOf(s) >= 0) continue;
      n++;
      var f = {};
      RT.COLS.BuoiXa.forEach(function (c) { f[c] = ''; });
      f.id = 'B' + p.id + '-' + n; f.bn_id = p.id; f.ngay = s; f.buoi_so = String(n); f.gd = n > RT.num(p.so_buoi) ? '2' : '1';
      f.ktv_email = 'ktv.linh@demo'; f.thoi_gian = s + 'T' + pad(7 + n % 9) + ':' + pad(n * 7 % 60) + ':00'; f.hinh_anh = img(p, n);
      fractions.push(f);
    }
    p.ngay_bat_dau = start;
    p.ngay_contour_xong = p.ngay_contour_xong || RT.addDays(start, -12);
    p.ngay_tao = p.ngay_tao || RT.addDays(start, -16);
    p.ngay_nhan_kh = p.ngay_nhan_kh || RT.addDays(start, -10);
    p.ngay_kh_xong = p.ngay_kh_xong || RT.addDays(start, -6);
    p.ks_email = p.ks_email || 'ks.nam@demo';
    p.can_qa = p.can_qa || (/IMRT|VMAT|SRS/.test(p.ky_thuat) ? 'Có' : 'Không');
    p.qa_ket_qua = p.can_qa === 'Có' ? 'Đạt' : 'Không cần';
    if (p.can_qa === 'Có') p.ngay_qa = RT.addDays(start, -4);
    p.ngay_du_kien = start;
    if (n >= limit) { p.trang_thai = 'HOAN_THANH'; p.ngay_ket_thuc = fractions[fractions.length - 1].ngay; }
  }

  function seed() {
    var p;
    // Đang xạ
    p = mk({ ho_ten: 'Nguyễn Văn Hùng', nam_sinh: '1968', gioi: 'Nam', chan_doan: 'K vòm họng T3N2M0', ky_thuat: 'VMAT', tong_lieu: '70', so_buoi: '35', igrt: 'CBCT 3 buổi đầu, sau đó hằng tuần', sgrt: 'Có', ngay_nghi_tuan: '3', trang_thai: 'DANG_XA', uu_tien: 'Ưu tiên' });
    var st = back(p, 20); treat(p, st, today, [back(p, 6)]);
    p = mk({ ho_ten: 'Trần Thị Lan', nam_sinh: '1979', gioi: 'Nữ', chan_doan: 'K cổ tử cung IIB', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25', igrt: 'CBCT hằng tuần', ngay_nghi_tuan: '5', trang_thai: 'DANG_XA', bs_email: 'bs.thu@demo', khoa: 'Xạ trị' });
    treat(p, back(p, 11), RT.addDays(today, -1));
    p = mk({ ho_ten: 'Phạm Minh Khôi', nam_sinh: '1960', gioi: 'Nam', chan_doan: 'K phổi không tế bào nhỏ IIIA', ky_thuat: 'VMAT', tong_lieu: '60', so_buoi: '30', igrt: 'CBCT hằng ngày', ngay_nghi_tuan: '2', trang_thai: 'DANG_XA' });
    treat(p, back(p, 22), RT.addDays(today, -1), [back(p, 2), back(p, 1)]);
    p = mk({ ho_ten: 'Lê Thị Hoa', nam_sinh: '1974', gioi: 'Nữ', chan_doan: 'K vú trái sau phẫu thuật bảo tồn', ky_thuat: '3D-CRT', tong_lieu: '40.05', so_buoi: '15', igrt: 'kV-kV hằng tuần', sgrt: 'Có', trang_thai: 'DANG_XA' });
    treat(p, back(p, 11), today);
    ph(p, { ky_thuat: '3D-CRT', tong_lieu: '10', so_buoi: '5', trang_thai: 'DANG_KH', ks_email: 'ks.nam@demo', ngay_contour_xong: wdAgo(2), ngay_nhan_kh: wdAgo(1), ghi_chu: 'Boost nền u, contour trên CT cũ' });
    p = mk({ ho_ten: 'Đặng Quốc Bảo', nam_sinh: '1955', gioi: 'Nam', chan_doan: 'K tuyến tiền liệt nguy cơ cao', ky_thuat: 'VMAT', tong_lieu: '46', so_buoi: '23', igrt: 'CBCT hằng ngày', trang_thai: 'DANG_XA', bs_email: 'bs.thu@demo' });
    ph(p, { ky_thuat: 'VMAT', tong_lieu: '32', so_buoi: '16', trang_thai: 'SAN_SANG', di_cung: 'Có', ks_email: 'ks.nam@demo', ngay_tao: wdAgo(50), ngay_contour_xong: wdAgo(48), ngay_nhan_kh: wdAgo(47), ngay_kh_xong: wdAgo(45), can_qa: 'Có', qa_ket_qua: 'Đạt', ngay_qa: wdAgo(44), ghi_chu: 'Boost tuyến tiền liệt, lập KH cùng lúc với GĐ1' });
    treat(p, back(p, 30), RT.addDays(today, -1), [], 39);
    p = mk({ ho_ten: 'Vũ Thị Mai', nam_sinh: '1983', gioi: 'Nữ', chan_doan: 'K trực tràng cT3N1', ky_thuat: '3D-CRT', tong_lieu: '45', so_buoi: '25', igrt: 'kV-kV hằng tuần', trang_thai: 'DANG_XA' });
    treat(p, back(p, 23), today);
    ph(p, { ky_thuat: '3D-CRT', tong_lieu: '5.4', so_buoi: '3', trang_thai: 'MO_PHONG', ngay_mo_phong: today, ngay_tao: wdAgo(1), ghi_chu: 'Boost u, cần mô phỏng lại tư thế' });
    p = mk({ ho_ten: 'Hoàng Văn Tâm', nam_sinh: '1949', gioi: 'Nam', chan_doan: 'Di căn xương cột sống thắt lưng', ky_thuat: '3D-CRT', tong_lieu: '30', so_buoi: '10', trang_thai: 'DANG_XA', uu_tien: 'Cấp cứu' });
    treat(p, back(p, 4), RT.addDays(today, -1));
    p = mk({ ho_ten: 'Bùi Thị Ngọc', nam_sinh: '1990', gioi: 'Nữ', chan_doan: 'K vú phải sau cắt toàn bộ', ky_thuat: 'VMAT', tong_lieu: '50', so_buoi: '25', igrt: 'CBCT hằng tuần', sgrt: 'Có', ngay_nghi_tuan: '4', trang_thai: 'DANG_XA', bs_email: 'bs.thu@demo' });
    treat(p, back(p, 7), today);
    p = mk({ ho_ten: 'Ngô Đức Long', nam_sinh: '1971', gioi: 'Nam', chan_doan: 'K thực quản 1/3 giữa', ky_thuat: 'IMRT', tong_lieu: '50.4', so_buoi: '28', igrt: 'CBCT 3 buổi đầu, sau đó hằng tuần', trang_thai: 'DANG_XA' });
    treat(p, back(p, 3), RT.addDays(today, -1));
    // Tạm ngừng
    p = mk({ ho_ten: 'Đinh Văn Sơn', nam_sinh: '1963', gioi: 'Nam', chan_doan: 'K hạ họng T3N1', ky_thuat: 'VMAT', tong_lieu: '70', so_buoi: '35', igrt: 'CBCT hằng tuần', ngay_nghi_tuan: '1', trang_thai: 'DANG_XA', uu_tien: 'Ưu tiên' });
    var ps = back(p, 4); treat(p, back(p, 21), RT.addDays(ps, -1));
    p.trang_thai = 'TAM_NGUNG'; p.tam_ngung_tu = ps; p.ly_do_tam_ngung = 'Tác dụng phụ: viêm niêm mạc độ 3, nuôi ăn qua sonde';
    p = mk({ ho_ten: 'Lý Thị Thảo', nam_sinh: '1958', gioi: 'Nữ', chan_doan: 'K nội mạc tử cung sau phẫu thuật', ky_thuat: '3D-CRT', tong_lieu: '45', so_buoi: '25', trang_thai: 'DANG_XA', bs_email: 'bs.thu@demo' });
    var ps2 = back(p, 1); treat(p, back(p, 13), RT.addDays(ps2, -1));
    p.trang_thai = 'TAM_NGUNG'; p.tam_ngung_tu = ps2; p.ly_do_tam_ngung = 'Không liên lạc được';
    // Hoàn thành
    p = mk({ ho_ten: 'Mai Văn Đức', nam_sinh: '1966', gioi: 'Nam', chan_doan: 'K thanh quản T2N0', ky_thuat: '3D-CRT', tong_lieu: '66', so_buoi: '33', igrt: 'kV-kV hằng tuần', trang_thai: 'DANG_XA' });
    treat(p, back(p, 40), RT.addDays(today, -1));
    // Chờ vào xạ
    var base = { ks_email: 'ks.ha@demo', ngay_tao: wdAgo(12), ngay_contour_xong: wdAgo(9), ngay_nhan_kh: wdAgo(8), ngay_kh_xong: wdAgo(3) };
    function w(o) { var x = {}; Object.keys(base).forEach(function (k) { x[k] = base[k]; }); Object.keys(o).forEach(function (k) { x[k] = o[k]; }); return x; }
    mk(w({ ho_ten: 'Cao Thị Hằng', nam_sinh: '1981', gioi: 'Nữ', chan_doan: 'K vú trái sau cắt toàn bộ', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25', igrt: 'CBCT hằng tuần', sgrt: 'Có', trang_thai: 'CHO_XA', can_qa: 'Có', qa_ket_qua: 'Đạt', ngay_qa: wdAgo(1), ngay_du_kien: today, ngay_nghi_tuan: '2' }));
    mk(w({ ho_ten: 'Tạ Văn Minh', nam_sinh: '1959', gioi: 'Nam', chan_doan: 'K phổi T2N0, SBRT', ky_thuat: 'SRS/SBRT', tong_lieu: '50', so_buoi: '5', igrt: 'CBCT hằng ngày', trang_thai: 'CHO_XA', can_qa: 'Có', qa_ket_qua: 'Đạt', ngay_qa: wdAgo(1), ngay_du_kien: fwd(1), bs_email: 'bs.thu@demo' }));
    mk(w({ ho_ten: 'Phan Thị Yến', nam_sinh: '1970', gioi: 'Nữ', chan_doan: 'K cổ tử cung IIIB', ky_thuat: 'VMAT', tong_lieu: '50.4', so_buoi: '28', igrt: 'CBCT 3 buổi đầu, sau đó hằng tuần', trang_thai: 'CHO_XA', can_qa: 'Có', qa_ket_qua: 'Đạt', ngay_qa: wdAgo(1), uu_tien: 'Ưu tiên' }));
    mk(w({ ho_ten: 'Kiều Văn Thắng', nam_sinh: '1952', gioi: 'Nam', chan_doan: 'Di căn não đa ổ', ky_thuat: '3D-CRT', tong_lieu: '30', so_buoi: '10', trang_thai: 'CHO_XA', can_qa: 'Không', qa_ket_qua: 'Không cần', ngay_du_kien: fwd(2) }));
    // Chờ QA
    mk(w({ ho_ten: 'Dương Thị Thu', nam_sinh: '1985', gioi: 'Nữ', chan_doan: 'K vòm họng T2N1M0', ky_thuat: 'VMAT', tong_lieu: '70', so_buoi: '33', igrt: 'CBCT 3 buổi đầu, sau đó hằng tuần', sgrt: 'Có', trang_thai: 'CHO_QA', can_qa: 'Có', qa_ket_qua: 'Chờ QA', ngay_kh_xong: wdAgo(1), uu_tien: 'Ưu tiên' }));
    mk(w({ ho_ten: 'Lương Văn Hải', nam_sinh: '1964', gioi: 'Nam', chan_doan: 'K tuyến tiền liệt', ky_thuat: 'VMAT', tong_lieu: '70', so_buoi: '28', igrt: 'CBCT hằng ngày', trang_thai: 'CHO_QA', can_qa: 'Có', qa_ket_qua: 'Chờ QA', ngay_kh_xong: today, bs_email: 'bs.thu@demo' }));
    // Đang lập KH
    mk({ ho_ten: 'Hà Thị Bích', nam_sinh: '1976', gioi: 'Nữ', chan_doan: 'K tuyến giáp sau phẫu thuật, vét hạch', ky_thuat: 'IMRT', tong_lieu: '66', so_buoi: '33', igrt: 'CBCT hằng tuần', trang_thai: 'DANG_KH', ks_email: 'ks.nam@demo', ngay_tao: wdAgo(6), ngay_contour_xong: wdAgo(3), ngay_nhan_kh: wdAgo(2) });
    mk({ ho_ten: 'Chu Văn Phong', nam_sinh: '1957', gioi: 'Nam', chan_doan: 'K thực quản 1/3 dưới', ky_thuat: 'VMAT', tong_lieu: '50.4', so_buoi: '28', igrt: 'CBCT 3 buổi đầu, sau đó hằng tuần', trang_thai: 'DANG_KH', ks_email: 'ks.ha@demo', ngay_tao: wdAgo(5), ngay_contour_xong: wdAgo(3), ngay_nhan_kh: wdAgo(1), bs_email: 'bs.thu@demo' });
    // Chờ lập KH
    mk({ ho_ten: 'Trịnh Văn Lộc', nam_sinh: '1961', gioi: 'Nam', chan_doan: 'Di căn cột sống ngực, chèn ép tủy', ky_thuat: '3D-CRT', tong_lieu: '20', so_buoi: '5', trang_thai: 'CHO_KH', uu_tien: 'Cấp cứu', ngay_tao: today, ngay_contour_xong: today });
    mk({ ho_ten: 'Đoàn Thị Hương', nam_sinh: '1969', gioi: 'Nữ', chan_doan: 'K vú phải sau bảo tồn', ky_thuat: '3D-CRT', tong_lieu: '40.05', so_buoi: '15', sgrt: 'Có', trang_thai: 'CHO_KH', ngay_tao: wdAgo(4), ngay_contour_xong: wdAgo(2), bs_email: 'bs.thu@demo' });
    mk({ ho_ten: 'Quách Văn Tú', nam_sinh: '1972', gioi: 'Nam', chan_doan: 'K amidan T2N2b', ky_thuat: 'VMAT', tong_lieu: '70', so_buoi: '35', igrt: 'CBCT 3 buổi đầu, sau đó hằng tuần', trang_thai: 'CHO_KH', uu_tien: 'Ưu tiên', ngay_tao: wdAgo(3), ngay_contour_xong: wdAgo(1) });
    mk({ ho_ten: 'Tô Thị Nhung', nam_sinh: '1980', gioi: 'Nữ', chan_doan: 'K cổ tử cung IIB', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25', igrt: 'CBCT hằng tuần', trang_thai: 'CHO_KH', ngay_tao: wdAgo(3), ngay_contour_xong: wdAgo(1) });
    // Do KTV nhập theo phiếu chỉ định, chưa có phần chuyên môn
    mk({ ho_ten: 'Hồ Thị Nga', nam_sinh: '1959', gioi: 'Nữ', chan_doan: '', ky_thuat: '', tong_lieu: '', so_buoi: '', trang_thai: 'CONTOUR', ngay_tao: today, nguoi_nhap: 'ktv.linh@demo' });
    // Chờ mô phỏng
    mk({ ho_ten: 'Kim Văn Hưng', nam_sinh: '1962', gioi: 'Nam', chan_doan: 'K phổi di căn não', vi_tri: 'Não (toàn não)', muc_dich: 'Giảm nhẹ / triệu chứng', ky_thuat: '3D-CRT', tong_lieu: '30', so_buoi: '10', trang_thai: 'MO_PHONG', ngay_mo_phong: fwd(1), ngay_tao: today, uu_tien: 'Ưu tiên' });
    // Đang contour
    p = mk({ ho_ten: 'Lã Văn Thành', nam_sinh: '1965', gioi: 'Nam', chan_doan: 'K lưỡi T2N1 sau phẫu thuật', ky_thuat: 'VMAT', tong_lieu: '60', so_buoi: '30', igrt: 'CBCT 3 buổi đầu, sau đó hằng tuần', trang_thai: 'CONTOUR', ngay_tao: wdAgo(2) });
    ph(p, { ky_thuat: 'VMAT', tong_lieu: '6', so_buoi: '3', trang_thai: 'CONTOUR', di_cung: 'Có', ngay_tao: wdAgo(2) });
    mk({ ho_ten: 'Mạc Thị Loan', nam_sinh: '1977', gioi: 'Nữ', chan_doan: 'K vú trái sau bảo tồn', ky_thuat: '3D-CRT', tong_lieu: '40.05', so_buoi: '15', sgrt: 'Có', trang_thai: 'CONTOUR', ngay_tao: wdAgo(1) });
    mk({ ho_ten: 'Văn Đình Quý', nam_sinh: '1950', gioi: 'Nam', chan_doan: 'K bàng quang cT2N0', ky_thuat: 'VMAT', tong_lieu: '64', so_buoi: '32', igrt: 'CBCT hằng ngày', trang_thai: 'CONTOUR', ngay_tao: today, bs_email: 'bs.thu@demo' });
  }
  seed();
  // Bảng phân công mẫu tuần này
  (function () {
    var mon = RT.monday(today), plan = {
      'Máy gia tốc 1 – ca sáng': ['ktv.linh@demo, ktv.son@demo', 'ktv.son@demo, ktv.ha@demo', 'ktv.linh@demo, ktv.ha@demo', 'ktv.linh@demo, ktv.son@demo', 'ktv.son@demo, ktv.ha@demo', 'ktv.ha@demo'],
      'Máy gia tốc 1 – ca chiều': ['ktv.ha@demo', 'ktv.linh@demo', 'ktv.son@demo', 'ktv.ha@demo', 'ktv.linh@demo', ''],
      'Mô phỏng CT': ['ktv.ha@demo', 'ktv.linh@demo', 'ktv.son@demo', 'ktv.ha@demo', 'ktv.linh@demo', ''],
      'Làm mặt nạ / cố định': ['ktv.son@demo', 'ktv.ha@demo', 'ktv.linh@demo', 'ktv.son@demo', 'ktv.ha@demo', ''],
      'Trực': ['ktv.linh@demo', 'ktv.son@demo', 'ktv.ha@demo', 'ktv.linh@demo', 'ktv.son@demo', 'ktv.ha@demo']
    };
    Object.keys(plan).forEach(function (vt) {
      plan[vt].forEach(function (nv, i) { if (nv) roster.push({ id: 'P' + vt.length + i, ngay: RT.addDays(mon, i), vi_tri: vt, nhan_vien: nv, ghi_chu: '', nguoi: 'ktv.linh@demo', thoi_gian: today + 'T07:00:00' }); });
    });
  })();
  // Lịch ngoại lệ & máy nghỉ
  (function () {
    var hung = patients[0], d = fwd(2);
    exceptions.push({ id: 'L1', bn_id: hung.id, may: '', ngay: d, loai: 'NGHI', ghi_chu: 'BN xin nghỉ đi khám răng', nguoi: 'ktv.linh@demo', thoi_gian: today + 'T08:00:00', da_xoa: '' });
    exceptions.push({ id: 'L2', bn_id: '', may: 'Máy gia tốc 1', ngay: fwd(7), loai: 'MAY_NGHI', ghi_chu: 'Bảo trì định kỳ', nguoi: 'ktv.linh@demo', thoi_gian: today + 'T08:00:00', da_xoa: '' });
    // Vắng có lý do (một số ngày vắng để trống lý do), một buổi ghi bù
    var env0 = RT.makeEnv(today, holidays, exceptions, phases, 'Máy gia tốc 1'), why = ['Mệt / tác dụng phụ', 'Bận việc riêng', 'Đang điều trị khác (nội trú, cấp cứu…)'], k = 0;
    patients.forEach(function (pp) {
      if (pp.trang_thai !== 'DANG_XA') return;
      var c0 = RT.course(pp, fractions, env0);
      c0.missed.slice(-3, -1).forEach(function (d0) { exceptions.push({ id: 'V' + (++k), bn_id: pp.id, may: '', ngay: d0, loai: 'VANG', ghi_chu: why[k % 3], nguoi: 'ktv.linh@demo', thoi_gian: d0 + 'T16:00:00', da_xoa: '' }); });
    });
    var fb = fractions.filter(function (f) { return f.ngay < today && f.ngay >= RT.addDays(today, -5); })[0];
    if (fb) { fb.ghi_bu = 'Có'; fb.ly_do_bu = 'BN có xạ, quên tích xác nhận'; }
    // BN đã chuyển sang lưu trữ
    var old = { id: 'XT25-0418', ma_his: '25118003', ho_ten: 'Lò Văn Pao', nam_sinh: '1958', gioi: 'Nam', chan_doan: 'K vòm họng T2N1M0', khoa: 'Xạ trị theo yêu cầu', bs_email: 'bs.hai@demo', ky_thuat: 'VMAT', tong_lieu: '70', so_buoi: '35', igrt: 'CBCT hằng tuần', sgrt: 'Không', uu_tien: 'Thường', trang_thai: 'HOAN_THANH', may: 'Máy gia tốc 1' };
    RT.COLS.BenhNhan.forEach(function (c) { if (old[c] == null) old[c] = ''; });
    var st = RT.addDays(today, -150), n = 0;
    for (var s2 = st; n < 35; s2 = RT.addDays(s2, 1)) if (RT.isTreatDay(old, s2, [])) {
      n++; var f = {}; RT.COLS.BuoiXa.forEach(function (c) { f[c] = ''; });
      f.id = 'BA' + n; f.bn_id = old.id; f.ngay = s2; f.buoi_so = String(n); f.gd = '1'; f.ktv_email = 'ktv.linh@demo'; f.thoi_gian = s2 + 'T09:00:00'; f.hinh_anh = n % 5 === 1 ? 'CBCT' : '';
      archive.fractions.push(f);
    }
    old.ngay_bat_dau = st; old.ngay_ket_thuc = archive.fractions[34].ngay; old.ngay_tao = RT.addDays(st, -14);
    demoIcd(old);
    archive.patients.push(old);
  })();

  function archIdx() { return archive.patients.map(function (p) { return RT.indexRow(p, archive.fractions, archive.phases, true); }); }
  function ctx() {
    var u = users.filter(function (x) { return x.email === current; })[0];
    var t = new Date();
    return {
      user: u, today: today, now: today + 'T' + pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds()),
      patients: patients, fractions: fractions, phases: phases, exceptions: exceptions, users: users, dm: dm, holidays: holidays, roster: roster,
      saveRoster: function () {},
      savePatient: function () {}, addFraction: function () {}, updateFraction: function () {}, savePhase: function () {}, saveEx: function () {},
      idFloor: function () { return 1; },
      hisLookup: function (ma) { return archIdx().filter(function (r) { return r.ma_his === ma; }); },
      saveUser: function () {}, addDmRow: function () {}, removeDmRow: function () {},
      log: function (a, id, d) { logs.unshift({ thoi_gian: today + 'T' + pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds()), email: current, thao_tac: a, bn_id: id || '', chi_tiet: d || '' }); }
    };
  }
  function api(action, payload) {
    try {
      var c = ctx(), msg = '';
      if (action === 'demoSwitch') {
        current = payload.email; c = ctx();
        msg = 'Đang xem với tài khoản ' + c.user.ho_ten + ' (' + RT.ROLES[c.user.vai_tro] + ').';
      } else if (action === 'searchArchive') {
        var q = String(payload.q || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
        var f = function (x) { return String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase(); };
        var ps = archIdx().filter(function (p) { return q.length >= 2 && (f(p.ma_his).indexOf(q) >= 0 || f(p.ho_ten).indexOf(q) >= 0); });
        ps.forEach(function (p) { p._idx = true; });
        return JSON.stringify({ ok: true, archive: { patients: ps, phases: [], fractions: [] } });
      } else if (action === 'lookupHis') {
        return JSON.stringify({ ok: true, his: archIdx().filter(function (r) { return r.ma_his === String(payload.ma_his || '').trim(); }) });
      } else if (action === 'archiveCourse') {
        var ap = archive.patients.filter(function (p) { return p.id === payload.id; });
        if (!ap.length) throw new Error('Không tìm thấy đợt xạ trong lưu trữ.');
        return JSON.stringify({ ok: true, course: { patients: JSON.parse(JSON.stringify(ap)), phases: archive.phases.filter(function (g) { return g.bn_id === payload.id; }), fractions: archive.fractions.filter(function (x) { return x.bn_id === payload.id; }) } });
      } else if (action === 'rev') {
        return JSON.stringify({ ok: true, rev: String(rev) });
      } else if (action === 'getRoster') {
        return JSON.stringify({ ok: true, data: RT.view(c), roster: roster.filter(function (r) { return r.ngay >= payload.tu && r.ngay <= payload.den; }), rev: String(rev) });
      } else if (action === 'report') {
        var who = payload.as ? users.filter(function (x) { return x.email === payload.as; })[0] || c.user : c.user;
        var dta = { patients: patients.concat(archive.patients), phases: phases, fractions: fractions.concat(archive.fractions), exceptions: exceptions, holidays: holidays, users: users, dm: dm, today: today };
        return JSON.stringify({ ok: true, report: RT.report(dta, payload.tu, payload.den, who, payload.chi_tiet, payload.pv) });
      } else if (action === 'findPatients') {
        var who2 = payload.as ? users.filter(function (x) { return x.email === payload.as; })[0] || c.user : c.user;
        var arc = archive.patients.map(function (x) { var o = JSON.parse(JSON.stringify(x)); o._luu = 1; return o; });
        return JSON.stringify({ ok: true, found: RT.findPatients({ patients: patients.concat(arc), phases: phases, fractions: fractions.concat(archive.fractions), users: users, dm: dm }, payload, who2) });
      } else if (action === 'exportPatients') {
        throw new Error('Bản demo không tạo được trang Excel. Bản thật sẽ ghi ra Google Sheet.');
      } else if (action === 'exportReport') {
        throw new Error('Bản demo không tạo được trang báo cáo. Bản thật sẽ ghi ra Google Sheet.');
      } else if (action === 'getLog') {
        if (c.user.vai_tro !== 'ADMIN' && !RT.isLead(c.user)) throw new Error('Chỉ quản trị và trưởng khoa/phòng xem được nhật ký.');
      } else if (action !== 'bootstrap') { msg = RT.handle(c, action, payload || {}); rev++; }
      return JSON.stringify({ ok: true, msg: msg, data: RT.view(c), log: action === 'getLog' ? logs.slice(0, 300) : undefined, rev: String(rev) });
    } catch (e) { return JSON.stringify({ ok: false, error: String(e && e.message || e) }); }
  }
  /** Mô phỏng một người khác thao tác (dùng khi thử chuông việc mới) */
  function asOther(email, action, payload) { var save = current; current = email; try { return api(action, payload); } finally { current = save; } }
  return { api: api, today: today, shifted: shifted, asOther: asOther };
})();
