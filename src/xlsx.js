/* Xuất Excel (.xlsx) ngay trên trình duyệt: tải thẳng về máy, không tạo trang trong Google Sheet.
   Thư viện ExcelJS chỉ tải về khi bấm "Tải Excel" lần đầu. Hai mẫu của khoa (bảng thanh toán thủ thuật gia tốc,
   sổ mô phỏng CT) dựng lại đúng độ rộng cột, phông, gộp ô, đường kẻ, công thức theo file mẫu. */
var XL = (function () {
  'use strict';
  var SRC = ['https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js', 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'];
  var loading = null;
  function load() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (loading) return loading;
    loading = new Promise(function (ok, bad) {
      var i = 0;
      var next = function () {
        if (i >= SRC.length) { loading = null; return bad(new Error('Không tải được bộ tạo Excel. Kiểm tra mạng rồi thử lại.')); }
        var s = document.createElement('script'); s.src = SRC[i++];
        s.onload = function () { window.ExcelJS ? ok(window.ExcelJS) : next(); };
        s.onerror = next;
        document.head.appendChild(s);
      };
      next();
    });
    return loading;
  }
  function save(wb, name) {
    return wb.xlsx.writeBuffer().then(function (buf) {
      var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name.replace(/[\\/:*?"<>|]/g, '-') + '.xlsx';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
    });
  }
  // ---- kiểu ô ----
  var TNR = 'Times New Roman';
  var THIN = { style: 'thin' }, DOT = { style: 'dotted' };
  var ACC = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';
  function colL(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }
  function put(ws, r, c, v, o) {
    var cell = ws.getCell(r, c);
    if (v !== undefined && v !== null && v !== '') cell.value = v;
    o = o || {};
    cell.font = { name: TNR, size: o.size || 12, bold: !!o.b, italic: !!o.i };
    if (o.h || o.v || o.wrap) cell.alignment = { horizontal: o.h, vertical: o.v, wrapText: !!o.wrap };
    if (o.bd) cell.border = o.bd;
    if (o.fmt) cell.numFmt = o.fmt;
    return cell;
  }
  function widths(ws, list) { list.forEach(function (x) { for (var c = x[0]; c <= x[1]; c++) ws.getColumn(c).width = x[2]; }); }

  /**
   * Bảng thanh toán thủ thuật gia tốc (mẫu file tháng 10, trang "3D" hoặc "VMAT").
   * g: nhóm trong r.thang[i].nhom; m: tháng (YYYY-MM); opt: { khoaLabel, legend: [[ký hiệu, tên]], kyTen: [..], donGia }
   */
  function thanhToan(wb, sheetName, kind, m, g, opt) {
    var vm = kind === 'VMAT';
    var ws = wb.addWorksheet(sheetName, { properties: { defaultRowHeight: 16.5 } });
    var D0 = 9, DN = D0 + 30, cTien = DN + 1, cGia = DN + 2, cBuoi = DN + 3, cSetup = DN + 4;
    if (vm) widths(ws, [[1, 1, 3.66], [2, 2, 13.22], [3, 3, 4.55], [4, 4, 7.0], [5, 5, 7.78], [6, 6, 9.0], [7, 7, 6.44], [8, 8, 4.66], [9, 39, 2.89], [40, 40, 9.55], [41, 41, 7.55], [42, 42, 5.55], [43, 43, 9.22], [44, 44, 9.0]]);
    else widths(ws, [[1, 1, 3.44], [2, 2, 16.66], [3, 3, 5.44], [4, 4, 4.55], [5, 5, 9.44], [6, 6, 10.89], [7, 7, 6.22], [8, 8, 5.66], [9, 17, 2.11], [18, 19, 2.44], [20, 26, 2.66], [27, 36, 2.55], [37, 37, 2.66], [38, 38, 2.55], [39, 39, 2.66], [40, 40, 10.11], [41, 41, 9.33], [42, 42, 8.11], [43, 43, 6.11], [44, 44, 2.55], [45, 45, 8.89]]);
    var y = m.slice(0, 4), mo = +m.slice(5, 7);
    // Dòng 1: (3D) số tháng + chú thích ký hiệu KTV
    if (!vm) {
      ws.mergeCells(1, 1, 1, 4); put(ws, 1, 1, String(mo), { b: true, h: 'center' });
      (opt.legend || []).forEach(function (x, i) { put(ws, 1, 16 + i * 3, x[0] + ': ' + x[1]); });
    }
    // Dòng 2: khoa (trang VMAT: kèm tên bảng và "(IMRT)")
    if (vm) { put(ws, 2, 1, opt.khoaLabel + '                                                                          BẢNG THANH TOÁN THỦ THUẬT GIA TỐC', { b: true }); put(ws, 2, 28, '(IMRT)', { b: true }); }
    else put(ws, 2, 1, opt.khoaLabel, { b: true, h: 'center' });
    // Dòng 3–4: tiêu đề
    ws.getRow(3).height = 31.5;
    var hd = function (r, c, v, o) { o = o || {}; o.b = o.b !== false; o.bd = { left: THIN, right: THIN, top: r === 3 ? THIN : DOT, bottom: r === 3 ? DOT : THIN }; return put(ws, r, c, v, o); };
    var last = cSetup;
    for (var c = 1; c <= last; c++) { hd(3, c, null); hd(4, c, null); }
    hd(3, 1, 'STT', { h: 'center', v: 'middle' }); hd(3, 2, 'Họ và tên BN', { h: 'left', v: 'middle' }); hd(3, 3, 'Tuổi', { h: 'center', v: 'middle' });
    hd(3, 5, 'Bệnh án', { h: 'center', v: 'middle' }); hd(3, 6, 'Chẩn đoán', { h: 'center', v: 'middle' });
    ws.mergeCells(3, 7, 3, 8); hd(3, 7, 'Người làm', { h: 'center' });
    ws.mergeCells(3, D0, 3, DN); hd(3, D0, 'Tháng ' + mo + ' năm ' + y, { h: 'center', i: true });
    hd(3, cTien, 'Thành \nTiền', { h: 'center', wrap: true, fmt: ACC });
    hd(4, 3, 'Nam', { v: 'middle' }); hd(4, 4, 'Nữ', { v: 'middle' }); hd(4, 7, 'BS', { h: 'center' }); hd(4, 8, 'KS', { h: 'center' });
    for (var d = 1; d <= 31; d++) hd(4, D0 + d - 1, d, { b: false, h: 'center', v: 'middle', wrap: true });
    if (!vm) hd(4, cGia, 'Đơn giá');
    hd(4, cBuoi, 'Số buổi'); hd(4, cSetup, vm ? 'Setup' : 'Setup (37500)');
    // Dữ liệu
    var size = vm ? 11 : 12, r0 = 5, rows = g ? g.rows : [];
    var bdD = { left: THIN, right: THIN, top: DOT, bottom: DOT };
    rows.forEach(function (x, i) {
      var r = r0 + i;
      for (var c2 = 1; c2 <= last; c2++) put(ws, r, c2, null, { size: c2 >= cTien ? 12 : size, bd: bdD });
      put(ws, r, 1, i + 1, { size: size, h: 'center', v: 'middle', bd: bdD });
      put(ws, r, 2, x.ho_ten, { size: vm ? 11 : 13, h: 'left', v: 'middle', wrap: true, bd: bdD });
      put(ws, r, 3, x.nam ? +x.nam || x.nam : null, { size: size, h: 'center', v: 'middle', bd: bdD });
      put(ws, r, 4, x.nu ? +x.nu || x.nu : null, { size: size, h: 'center', v: 'middle', bd: bdD });
      put(ws, r, 5, x.ma_his, { size: size, h: 'center', v: 'middle', bd: bdD });
      put(ws, r, 6, x.chan_doan, { size: size, h: 'center', v: 'middle', bd: bdD });
      put(ws, r, 7, x.bs_ten, { size: size, h: 'center', v: 'middle', wrap: true, bd: bdD });
      for (var dd = 1; dd <= 31; dd++) if (x.o[String(dd)]) put(ws, r, D0 + dd - 1, x.o[String(dd)], { size: size, h: 'center', bd: bdD });
      var L = colL;
      put(ws, r, cGia, opt.donGia, { size: 12, fmt: '#,##0', bd: bdD });
      put(ws, r, cBuoi, { formula: 'COUNTA(' + L(D0) + r + ':' + L(DN) + r + ')', result: x.so_buoi }, { size: 12, h: 'center', v: 'middle', bd: bdD });
      put(ws, r, cTien, { formula: L(cGia) + r + '*' + L(cBuoi) + r + '+' + L(cSetup) + r, result: x.so_buoi * opt.donGia }, { size: 12, fmt: ACC, bd: bdD });
      put(ws, r, cSetup, null, { size: 12, fmt: '#,##0', bd: bdD });
    });
    // Dòng tổng
    var rt = r0 + Math.max(rows.length, 1);
    var bdT = { left: THIN, right: THIN, top: THIN, bottom: THIN };
    for (var c3 = 1; c3 <= last; c3++) put(ws, rt, c3, null, { b: true, bd: bdT });
    if (vm) { ws.mergeCells(rt, 1, rt, 8); put(ws, rt, 1, 'Tổng cộng', { b: true, bd: bdT }); ws.mergeCells(rt, D0, rt, DN); }
    else { ws.mergeCells(rt, 1, rt, 5); ws.mergeCells(rt, 6, rt, DN); }
    var tot = rows.reduce(function (s, x) { return s + x.so_buoi; }, 0);
    put(ws, rt, cTien, { formula: 'SUM(' + colL(cTien) + r0 + ':' + colL(cTien) + (rt - 1) + ')', result: tot * opt.donGia }, { b: true, fmt: ACC, bd: bdT });
    put(ws, rt, cBuoi, { formula: 'SUM(' + colL(cBuoi) + r0 + ':' + colL(cBuoi) + (rt - 1) + ')', result: tot }, { b: true, h: 'center', bd: bdT });
    // Khung ký tên
    var pos = vm ? [[2, 3], [4, 5], [6, 11], [14, 19], [22, 29], [31, 36], [37, 41]] : [[2, 3], [4, 5], [6, 9], [12, 17], [22, 27], [29, 35], [36, 40]];
    var rk = rt + 2, rn = rt + (vm ? 5 : 6);
    (opt.kyTen || []).slice(0, pos.length).forEach(function (k, i) {
      var p = pos[i], t = String(k).split(':'), title = t[0].trim(), ten = (t.slice(1).join(':') || '').trim();
      ws.mergeCells(rk, p[0], rk, p[1]); put(ws, rk, p[0], title, { b: true, h: 'center' });
      ws.mergeCells(rn, p[0], rn, p[1]); if (ten) put(ws, rn, p[0], ten, { h: 'center' });
    });
    return ws;
  }

  /** Sổ mô phỏng CT (mẫu trang "tháng 10" file CT-sim) */
  function soMoPhong(wb, sheetName, rows) {
    var ws = wb.addWorksheet(sheetName, { properties: { defaultColWidth: 11.22 } });
    widths(ws, [[1, 1, 5.67], [2, 2, 24.0], [3, 3, 8.33], [4, 4, 6.56], [5, 5, 14.89], [6, 6, 19.89], [7, 7, 23.67], [8, 8, 7.22], [9, 9, 17.56], [10, 10, 14]]);
    var bd = { left: THIN, right: THIN, top: THIN, bottom: THIN };
    var h = function (r, c, v) { return put(ws, r, c, v, { size: 14, b: true, h: 'center', v: 'middle', bd: bd }); };
    for (var c = 1; c <= 10; c++) { h(1, c, null); h(2, c, null); }
    [[1, ''], [2, 'Họ tên BN'], [5, 'Số BA'], [6, 'Chẩn đoán'], [7, 'Bác sỹ'], [8, 'Mặt nạ'], [9, 'Ngày xạ ĐT'], [10, 'Kỹ thuật xạ']].forEach(function (x) { ws.mergeCells(1, x[0], 2, x[0]); h(1, x[0], x[1] || null); });
    ws.mergeCells(1, 3, 1, 4); h(1, 3, 'Tuổi'); h(2, 3, 'Nam'); h(2, 4, 'Nữ');
    var dm = function (d) { return d ? (+d.slice(8)) + '/' + (+d.slice(5, 7)) : ''; };
    rows.forEach(function (x, i) {
      var r = 3 + i, o = { size: 14, h: 'center', v: 'middle', bd: bd };
      put(ws, r, 1, String(+x.ngay.slice(8)), o); ws.getCell(r, 1).numFmt = '@';
      put(ws, r, 2, x.ho_ten, o); put(ws, r, 3, x.nam ? +x.nam || x.nam : null, o); put(ws, r, 4, x.nu ? +x.nu || x.nu : null, o);
      put(ws, r, 5, x.ma_his ? +x.ma_his || x.ma_his : null, o);
      put(ws, r, 6, x.chan_doan, { size: 14, h: 'center', v: 'middle', wrap: true, bd: bd }); put(ws, r, 7, x.bs, o);
      put(ws, r, 8, x.mat_na ? 'x' : null, o); put(ws, r, 9, dm(x.ngay_xa), o); ws.getCell(r, 9).numFmt = '@'; put(ws, r, 10, x.ky_thuat, o);
    });
    return ws;
  }

  /** Bảng đơn giản cho các mục thống kê khác: sections = [{ title, head: [..], rows: [[..]] }] */
  function simple(wb, sheetName, title, sub, sections) {
    var ws = wb.addWorksheet(sheetName.slice(0, 31));
    var bd = { left: THIN, right: THIN, top: THIN, bottom: THIN }, r = 1, w = {};
    put(ws, r++, 1, title, { size: 14, b: true });
    if (sub) put(ws, r++, 1, sub, { i: true });
    sections.forEach(function (s) {
      r++;
      if (s.title) put(ws, r++, 1, s.title, { b: true });
      s.head.forEach(function (x, c) { put(ws, r, c + 1, x, { b: true, h: 'center', v: 'middle', wrap: true, bd: bd }); w[c] = Math.max(w[c] || 6, String(x).length + 2); });
      r++;
      s.rows.forEach(function (row) {
        row.forEach(function (v, c) { put(ws, r, c + 1, v === '' ? null : v, { bd: bd, h: typeof v === 'number' ? 'right' : undefined, fmt: typeof v === 'number' && v >= 1000 ? '#,##0' : undefined }); w[c] = Math.max(w[c] || 6, Math.min(48, String(v == null ? '' : v).length + 2)); });
        r++;
      });
    });
    Object.keys(w).forEach(function (c) { ws.getColumn(+c + 1).width = w[c]; });
    return ws;
  }
  function book() { return load().then(function (E) { var wb = new E.Workbook(); wb.creator = 'Điều phối Xạ trị'; return wb; }); }
  return { load: load, book: book, save: save, thanhToan: thanhToan, soMoPhong: soMoPhong, simple: simple };
})();
