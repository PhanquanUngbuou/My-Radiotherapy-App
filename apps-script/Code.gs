// Điều phối Xạ trị · phiên bản v3.2
/**
 * Điều phối Xạ trị — phần máy chủ chạy trên Google Apps Script.
 * Dữ liệu lưu trong chính Google Sheet chứa script này.
 *
 * Cài đặt lần đầu: chọn hàm "setup" ở thanh công cụ rồi bấm Chạy (Run).
 * Xem hướng dẫn đầy đủ trong HUONG-DAN-CAI-DAT.md.
 */

var TZ = 'Asia/Ho_Chi_Minh';
var SHEET_NAMES = { BN: 'BenhNhan', GD: 'GiaiDoan', BUOI: 'BuoiXa', LICH: 'LichNgoaiLe', PC: 'PhanCong', IDX: 'ChiMuc', USER: 'NguoiDung', DM: 'DanhMuc', LOG: 'NhatKy' };
// Trang tính lưu trữ: đợt xạ đã kết thúc quá ARCHIVE_DAYS ngày được chuyển sang đây mỗi đêm
var ARCHIVE = { BenhNhan: 'LuuTru_BenhNhan', GiaiDoan: 'LuuTru_GiaiDoan', BuoiXa: 'LuuTru_BuoiXa', LichNgoaiLe: 'LuuTru_LichNgoaiLe' };
var ARCHIVE_DAYS = 60;

function doGet() {
  // Google cho người dùng bỏ tích từng quyền khi cấp phép. Nếu thiếu quyền nào,
  // dòng dưới tự hiện lại màn hình xin quyền thay vì để ứng dụng báo lỗi.
  try { if (ScriptApp.requireAllScopes) ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL); } catch (e) { if (!/requireAllScopes/.test(String(e))) throw e; }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Điều phối Xạ trị')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Chạy một lần từ trình soạn thảo Apps Script để tạo các trang tính. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Hãy mở Apps Script từ Google Sheet (Tiện ích mở rộng → Apps Script) rồi chạy lại.');
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  ss.setSpreadsheetTimeZone(TZ);

  var all = Object.keys(SHEET_NAMES).map(function (k) { return [SHEET_NAMES[k], RT.COLS[SHEET_NAMES[k]]]; })
    .concat(Object.keys(ARCHIVE).map(function (k) { return [ARCHIVE[k], RT.COLS[k]]; }));
  all.forEach(function (pair) {
    var name = pair[0], cols = pair[1];
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#e3f4ee');
      sh.setFrozenRows(1);
    } else {
      // Nâng cấp: bổ sung cột mới còn thiếu vào cuối
      var head = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
      cols.forEach(function (c) {
        if (head.indexOf(c) < 0) { head.push(c); sh.getRange(1, head.length).setValue(c).setFontWeight('bold').setBackground('#e3f4ee'); }
      });
    }
    // Định dạng văn bản thuần để Sheets không tự đổi mã HIS, ngày tháng
    sh.getRange(1, 1, sh.getMaxRows(), Math.max(cols.length, sh.getLastColumn())).setNumberFormat('@');
  });

  // Trang lưu trữ buổi xạ theo năm: bổ sung cột mới
  archiveFxSheets_(ss).forEach(function (n) {
    var sh = ss.getSheetByName(n), head = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
    RT.COLS.BuoiXa.forEach(function (c) { if (head.indexOf(c) < 0) { head.push(c); sh.getRange(1, head.length).setValue(c).setFontWeight('bold').setBackground('#e3f4ee'); } });
  });
  // v2.8: mã ICD-10 chỉ dùng 3 ký tự (C15.1 → C15)
  [SHEET_NAMES.BN, ARCHIVE.BenhNhan, SHEET_NAMES.IDX].forEach(function (n) {
    var t = readTable_(ss, n), col = t.head.indexOf('icd');
    if (col < 0 || !t.rows.length) return;
    var rng = t.sheet.getRange(2, col + 1, t.sheet.getLastRow() - 1, 1), vals = rng.getValues(), changed = false;
    vals.forEach(function (r) { var v = String(r[0] || ''); if (v && RT.normIcd(v) !== v) { r[0] = RT.normIcd(v); changed = true; } });
    if (changed) rng.setNumberFormat('@').setValues(vals);
  });

  // Trang "NhapBN": dán BN từ hồ sơ giấy rồi chạy hàm nhapBN
  if (!ss.getSheetByName(NHAP_SHEET)) nhapSheet_(ss);

  var dm = ss.getSheetByName(SHEET_NAMES.DM);
  // Bổ sung các danh mục còn thiếu (lần đầu, hoặc danh mục mới khi nâng cấp)
  var have = {};
  if (dm.getLastRow() > 1) dm.getRange(2, 1, dm.getLastRow() - 1, 1).getValues().forEach(function (r) { have[String(r[0]).toUpperCase()] = 1; });
  var rows = [];
  Object.keys(RT.DEFAULT_DM).forEach(function (loai) {
    if (!have[loai]) RT.DEFAULT_DM[loai].forEach(function (v) { rows.push([loai, v]); });
  });
  if (!have.NGAY_LE && dm.getLastRow() <= 1) rows.push(['NGAY_LE', '2027-01-01']);
  // v2.8: bổ sung giá trị mới vào danh mục đã có; bỏ giá setup
  var cur = dm.getLastRow() > 1 ? dm.getRange(2, 1, dm.getLastRow() - 1, 2).getValues() : [];
  var hasV = function (l, v) { return cur.some(function (r) { return String(r[0]).toUpperCase() === l && String(r[1]) === v; }); };
  [['MUC_DICH', 'Tân bổ trợ'], ['MUC_DICH', 'Củng cố']].forEach(function (x) { if (have[x[0]] && !hasV(x[0], x[1])) rows.push(x); });
  cur.forEach(function (r, i) { if (String(r[0]).toUpperCase() === 'DON_GIA' && /^setup/i.test(String(r[1]))) dm.getRange(i + 2, 1, 1, 2).setValues([['', '']]); });
  // v3.2: phân công chỉ Ca 1–4 và Mô phỏng (đổi một lần, sau đó quản trị sửa được trong Quản trị)
  var sp = PropertiesService.getScriptProperties();
  if (have.VI_TRI_PC && !sp.getProperty('PC_V32')) {
    cur.forEach(function (r, i) { if (String(r[0]).toUpperCase() === 'VI_TRI_PC') dm.getRange(i + 2, 1, 1, 2).setValues([['', '']]); });
    RT.DEFAULT_DM.VI_TRI_PC.forEach(function (v) { rows.push(['VI_TRI_PC', v]); });
  }
  sp.setProperty('PC_V32', '1');
  if (rows.length) dm.getRange(Math.max(dm.getLastRow(), 1) + 1, 1, rows.length, 2).setNumberFormat('@').setValues(rows);

  var users = ss.getSheetByName(SHEET_NAMES.USER);
  if (users.getLastRow() <= 1) {
    var email = Session.getEffectiveUser().getEmail();
    users.getRange(2, 1, 1, 4).setNumberFormat('@').setValues([[email, 'Quản trị', 'ADMIN', 'Có']]);
  }

  // Lưu trữ tự động lúc 1–2 giờ sáng mỗi ngày
  if (typeof ScriptApp !== 'undefined') {
    var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'archiveOld'; });
    if (!has) ScriptApp.newTrigger('archiveOld').timeBased().everyDays(1).atHour(1).inTimezone(TZ).create();
  }

  if (ss.getSheetByName(SHEET_NAMES.IDX).getLastRow() <= 1) buildIndex_();

  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  return 'Đã cài đặt xong.';
}

var NHAP_SHEET = 'NhapBN';
function nhapSheet_(ss) {
  var sh = ss.insertSheet(NHAP_SHEET);
  var head = RT.IMPORT_COLS.map(function (c) { return c[1]; }).concat(['Kết quả (app tự ghi)']);
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#e3f4ee');
  sh.setFrozenRows(1);
  sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
  return sh;
}
/**
 * Chạy tay trong trình soạn thảo Apps Script: nhập BN ở trang "NhapBN" vào mục "Chờ phân loại".
 * Mỗi dòng một BN (cột như dòng tiêu đề). Dòng đã có kết quả ở cột cuối sẽ bỏ qua, nên chạy lại không bị trùng.
 */
function nhapBN() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = ss_(), sh = ss.getSheetByName(NHAP_SHEET);
    if (!sh) { nhapSheet_(ss); return 'Đã tạo trang "' + NHAP_SHEET + '". Dán danh sách BN vào trang này rồi chạy lại nhapBN.'; }
    var vals = sh.getDataRange().getValues(), nc = RT.IMPORT_COLS.length, rows = [], at = [];
    for (var r = 1; r < vals.length; r++) {
      var v = vals[r];
      if (String(v[nc] || '').trim()) continue;
      var o = {}, any = false;
      RT.IMPORT_COLS.forEach(function (c, i) { var x = normalize_(v[i]); if (x !== '') { o[c[0]] = x; any = true; } });
      if (!any) continue;
      rows.push(o); at.push(r + 1);
    }
    if (!rows.length) return 'Không có dòng mới để nhập.';
    var ctx = buildCtx_();
    var msg = RT.handle(ctx, 'importPatients', { rows: rows });
    at.forEach(function (row, i) { sh.getRange(row, nc + 1).setValue((ctx.importResult || [])[i] || ''); });
    SpreadsheetApp.flush();
    PropertiesService.getScriptProperties().setProperty('REV', String(Date.now()));
    Logger.log(msg);
    return msg;
  } finally {
    lock.releaseLock();
  }
}

/** Điểm vào duy nhất cho giao diện: google.script.run.api(action, payload) */
function api(action, payload) {
  var lock = null;
  try {
    // Kiểm tra nhanh có thay đổi không (không đọc Google Sheet) để giao diện biết khi nào cần tải lại
    if (action === 'rev') return JSON.stringify({ ok: true, rev: PropertiesService.getScriptProperties().getProperty('REV') || '0' });
    if (action === 'searchArchive') return JSON.stringify(searchArchive_(payload || {}));
    var READ_ONLY = { lookupHisMany: 1, bootstrap: 1, getLog: 1, getRoster: 1, report: 1, lookupHis: 1, archiveCourse: 1, findPatients: 1, khoaReport: 1 };
    if (!READ_ONLY[action]) {
      lock = LockService.getScriptLock();
      lock.waitLock(30000);
    }
    var ctx = buildCtx_();
    var msg = '', extra = {};
    if (action === 'getLog') {
      if (ctx.user.vai_tro !== 'ADMIN' && !RT.isLead(ctx.user)) throw new Error('Chỉ quản trị và trưởng khoa/phòng xem được nhật ký.');
      extra.log = readLog_(300);
    } else if (action === 'lookupHis') {
      extra.his = ctx.hisLookup(String((payload || {}).ma_his || '').trim()).map(stripRow_);
    } else if (action === 'lookupHisMany') {
      extra.his = {};
      ((payload || {}).ma || []).slice(0, 500).forEach(function (m) { m = String(m).trim(); if (m) extra.his[m] = ctx.hisLookup(m).map(stripRow_); });
    } else if (action === 'archiveCourse') {
      extra.course = archiveCourse_(String((payload || {}).id || ''));
      var nk0 = RT.nurseKhoa(ctx.user, ctx.dm);
      if (nk0 && extra.course.patients[0].khoa !== nk0) throw new Error('Bệnh nhân này thuộc khoa khác.');
    } else if (action === 'report' || action === 'findPatients') {
      var p0 = payload || {};
      var data = statsData_(ctx, p0.tu, p0.den);
      // Quản trị "xem như" người khác: thống kê theo phạm vi của người đó
      var who = ctx.user;
      if (p0.as && ctx.user.vai_tro === 'ADMIN') who = ctx.users.filter(function (u) { return u.email === String(p0.as).toLowerCase(); })[0] || ctx.user;
      if (action === 'findPatients') extra.found = RT.findPatients(data, p0, who);
      else extra.report = RT.report(data, p0.tu, p0.den, who, p0.chi_tiet, p0.pv);
    } else if (action === 'khoaReport') {
      var k0 = payload || {};
      var kd = statsData_(ctx, k0.tu, k0.den);
      var kwho = ctx.user;
      if (k0.as && ctx.user.vai_tro === 'ADMIN') kwho = ctx.users.filter(function (u) { return u.email === String(k0.as).toLowerCase(); })[0] || ctx.user;
      extra.kreport = RT.khoaReport(kd, k0, kwho);
    } else if (action === 'getRoster') {
      var a0 = (payload || {}).tu, b0 = (payload || {}).den;
      extra.roster = ctx.roster.filter(function (r) { return r.ngay >= a0 && r.ngay <= b0; }).map(function (r) { var o = {}; RT.COLS.PhanCong.forEach(function (c) { o[c] = r[c] || ''; }); return o; });
    } else if (action !== 'bootstrap') {
      // Gửi lại sau lỗi mạng: nếu máy chủ đã làm thao tác này rồi thì không làm lại (tránh tạo trùng BN)
      var rid = payload && payload._rid ? 'rid_' + String(payload._rid).slice(0, 60) : '';
      var cache = rid && typeof CacheService !== 'undefined' ? CacheService.getScriptCache() : null;
      var done = cache ? cache.get(rid) : null;
      if (done !== null && done !== undefined) {
        msg = done;
      } else {
      msg = RT.handle(ctx, action, payload || {});
      if (cache) cache.put(rid, msg || 'Đã lưu.', 1800);
      SpreadsheetApp.flush();
      PropertiesService.getScriptProperties().setProperty('REV', String(Date.now()));
      }
    }
    return JSON.stringify({ ok: true, msg: msg, data: RT.view(ctx), log: extra.log, roster: extra.roster, report: extra.report, kreport: extra.kreport, found: extra.found, his: extra.his, course: extra.course, rev: PropertiesService.getScriptProperties().getProperty('REV') || '0' });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String(e && e.message || e) });
  } finally {
    if (lock) lock.releaseLock();
  }
}

// ---------------- Lớp truy cập Google Sheet ----------------

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Chưa cài đặt. Quản trị cần chạy hàm setup trong Apps Script.');
  return ss;
}

function normalize_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return v == null ? '' : String(v).trim();
}

function readTable_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Thiếu trang tính "' + name + '". Quản trị cần chạy hàm setup.');
  var values = sh.getDataRange().getValues();
  var head = values[0].map(function (h) { return String(h).trim(); });
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r], o = {}, empty = true;
    for (var c = 0; c < head.length; c++) {
      if (!head[c]) continue;
      o[head[c]] = normalize_(row[c]);
      if (o[head[c]] !== '') empty = false;
    }
    if (empty) continue;
    o._row = r + 1;
    out.push(o);
  }
  return { sheet: sh, head: head, rows: out };
}

function writeRow_(table, obj) {
  var vals = [table.head.map(function (h) { return h ? (obj[h] == null ? '' : String(obj[h])) : ''; })];
  var row = obj._row;
  if (!row) {
    row = Math.max(table.sheet.getLastRow(), 1) + 1;
    obj._row = row;
  }
  table.sheet.getRange(row, 1, 1, table.head.length).setNumberFormat('@').setValues(vals);
}

function buildCtx_() {
  var email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) {
    throw new Error('Không xác định được tài khoản Google của bạn. Quản trị cần triển khai ứng dụng với chế độ ' +
      '"Thực thi với tư cách: Người dùng truy cập ứng dụng web" (xem hướng dẫn cài đặt).');
  }
  var ss = ss_();
  var tU = readTable_(ss, SHEET_NAMES.USER);
  var users = tU.rows.filter(function (u) { return u.email; }).map(function (u) {
    u.email = u.email.toLowerCase(); u.vai_tro = String(u.vai_tro).toUpperCase().trim();
    u.kich_hoat = u.kich_hoat === 'Không' ? 'Không' : 'Có';
    u.chuc_vu = String(u.chuc_vu || '').trim();
    u.khoa = String(u.khoa || '').trim();
    u.tro_ly_cho = String(u.tro_ly_cho || '').trim().toLowerCase();
    return u;
  });
  var user = users.filter(function (u) { return u.email === email && u.kich_hoat !== 'Không'; })[0];
  if (!user) throw new Error('NO_ACCESS:' + email);
  if (!RT.ROLES[user.vai_tro]) throw new Error('Vai trò "' + user.vai_tro + '" của ' + email + ' không hợp lệ. Dùng BS, KS, KTV, DD hoặc ADMIN.');

  var tBN = readTable_(ss, SHEET_NAMES.BN);
  var tGD = readTable_(ss, SHEET_NAMES.GD);
  var tBX = readTable_(ss, SHEET_NAMES.BUOI);
  var tLich = readTable_(ss, SHEET_NAMES.LICH);
  var tPC = readTable_(ss, SHEET_NAMES.PC);
  var props = PropertiesService.getScriptProperties();
  var tDM = readTable_(ss, SHEET_NAMES.DM);
  var tLog = { sheet: ss.getSheetByName(SHEET_NAMES.LOG) };

  var dm = {};
  Object.keys(RT.DEFAULT_DM).forEach(function (k) { dm[k] = []; });
  tDM.rows.forEach(function (r) {
    var k = String(r.loai).toUpperCase();
    if (!dm[k]) dm[k] = [];
    if (r.gia_tri) dm[k].push(r.gia_tri);
  });
  var fromDefault = {};
  Object.keys(RT.DEFAULT_DM).forEach(function (k) {
    if (!dm[k].length && k !== 'NGAY_LE') { dm[k] = RT.DEFAULT_DM[k].slice(); fromDefault[k] = true; }
  });
  // Danh mục đang dùng giá trị mặc định (chưa có trên sheet): lần sửa đầu tiên ghi cả danh sách xuống sheet
  var materialize = function (loai, removed) {
    fromDefault[loai] = false;
    dm[loai].filter(function (v) { return v !== removed; }).forEach(function (v) { writeRow_(tDM, { loai: loai, gia_tri: v }); });
  };

  var now = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss");
  var ctx = {
    user: user,
    today: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'),
    now: now,
    users: users,
    dm: dm,
    holidays: dm.NGAY_LE.filter(RT.isDate),
    patients: tBN.rows,
    fractions: tBX.rows,
    phases: tGD.rows,
    exceptions: tLich.rows,
    roster: tPC.rows,
    saveRoster: function (r) { writeRow_(tPC, r); },
    idFloor: function (prefix) { return parseInt(props.getProperty('ID_FLOOR_' + prefix) || '0', 10); },
    savePatient: function (p) { writeRow_(tBN, p); upsertIdx(p); },
    savePhase: function (g) { writeRow_(tGD, g); var p = tBN.rows.filter(function (x) { return x.id === g.bn_id; })[0]; if (p) upsertIdx(p); },
    hisLookup: function (ma) { if (!ma) return []; idx(); return tIdx.rows.filter(function (r) { return r.ma_his === ma; }); },
    saveEx: function (e) { writeRow_(tLich, e); },
    saveUser: function (u) { writeRow_(tU, u); },
    addDmRow: function (loai, v) { if (fromDefault[loai]) return materialize(loai); writeRow_(tDM, { loai: loai, gia_tri: v }); },
    removeDmRow: function (loai, v) {
      if (fromDefault[loai]) return materialize(loai, v);
      var rows = tDM.sheet.getDataRange().getValues();
      for (var r = rows.length - 1; r >= 1; r--) {
        if (String(rows[r][0]).toUpperCase() === loai && normalize_(rows[r][1]) === v) { tDM.sheet.deleteRow(r + 1); break; }
      }
    },
    addFraction: function (f) { writeRow_(tBX, f); },
    updateFraction: function (f) { writeRow_(tBX, f); },
    log: function (action, bnId, detail) {
      if (tLog.sheet) {
        var r = tLog.sheet.getLastRow() + 1;
        tLog.sheet.getRange(r, 1, 1, 5).setNumberFormat('@').setValues([[now, email, action, bnId || '', detail || '']]);
      }
    }
  };
  // Chỉ mục: chỉ đọc khi cần (khi lưu đợt xạ hoặc tra mã HIS)
  var tIdx = null, idxMap = null;
  function idx() {
    if (tIdx) return;
    tIdx = readTable_(ss, SHEET_NAMES.IDX); idxMap = {};
    tIdx.rows.forEach(function (r) { idxMap[r.id] = r; });
  }
  function upsertIdx(p) {
    idx();
    var row = RT.indexRow(p, ctx.fractions, ctx.phases, false);
    var cur = idxMap[p.id];
    if (cur) row._row = cur._row; else tIdx.rows.push(row);
    idxMap[p.id] = row;
    writeRow_(tIdx, row);
  }
  return ctx;
}

function readLog_(n) {
  var sh = ss_().getSheetByName(SHEET_NAMES.LOG);
  if (!sh || sh.getLastRow() < 2) return [];
  var last = sh.getLastRow(), start = Math.max(2, last - n + 1);
  return sh.getRange(start, 1, last - start + 1, 5).getValues().reverse().map(function (r) {
    return { thoi_gian: normalize_(r[0]), email: normalize_(r[1]), thao_tac: normalize_(r[2]), bn_id: normalize_(r[3]), chi_tiet: normalize_(r[4]) };
  });
}

function currentUser_() {
  var email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  var rows = readTable_(ss_(), SHEET_NAMES.USER).rows;
  var u = rows.filter(function (r) { return String(r.email).toLowerCase() === email && r.kich_hoat !== 'Không'; })[0];
  if (!u) throw new Error('NO_ACCESS:' + email);
  return u;
}

function fold_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/** Tìm bệnh nhân đã chuyển sang lưu trữ (theo mã HIS, tên hoặc mã đợt): chỉ đọc trang chỉ mục nên luôn nhanh. */
function searchArchive_(a) {
  try {
    var me = currentUser_();
    var nk = me.vai_tro === 'DD' ? String(me.khoa || '') : '';
    var q = fold_(a.q).trim();
    if (q.length < 2) return { ok: true, archive: { patients: [], phases: [], fractions: [] } };
    var ss = ss_();
    var pts = readTable_(ss, SHEET_NAMES.IDX).rows.filter(function (p) {
      return p.luu_tru === 'Có' && p.trang_thai !== 'HUY' && (!nk || p.khoa === nk) && (fold_(p.ma_his).indexOf(q) >= 0 || (p.ten_kd || fold_(p.ho_ten)).indexOf(q) >= 0 || fold_(p.id).indexOf(q) >= 0);
    }).slice(0, 50).map(function (p) { p = stripRow_(p); p._idx = true; return p; });
    return { ok: true, archive: { patients: pts, phases: [], fractions: [] } };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

/** Chạy tự động mỗi đêm: chuyển đợt xạ đã kết thúc (hoặc đã huỷ) quá ARCHIVE_DAYS ngày sang trang tính lưu trữ. */
function archiveOld() {
  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    var ss = ss_();
    var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    var cutoff = RT.addDays(today, -ARCHIVE_DAYS);
    var tBN = readTable_(ss, SHEET_NAMES.BN);
    var move = {};
    tBN.rows.forEach(function (p) {
      var end = p.ngay_ket_thuc || String(p.cap_nhat_luc).slice(0, 10);
      if ((p.trang_thai === 'HOAN_THANH' || p.trang_thai === 'HUY' || p.trang_thai === 'KHONG_XA') && end && end < cutoff) move[p.id] = 1;
    });
    var n = Object.keys(move).length;
    if (!n) { moveRows_(ss, SHEET_NAMES.LICH, ARCHIVE.LichNgoaiLe, function (r) { return (r.loai === 'THONG_BAO' && r.ngay < today) || r.da_xoa === 'Có'; }); return 'Không có gì cần lưu trữ.'; }
    var props = PropertiesService.getScriptProperties();
    Object.keys(move).forEach(function (id) {
      var m = /^(XT\d\d-)(\d+)$/.exec(id);
      if (m) {
        var k = 'ID_FLOOR_' + m[1], cur = parseInt(props.getProperty(k) || '0', 10);
        if (parseInt(m[2], 10) > cur) props.setProperty(k, String(parseInt(m[2], 10)));
      }
    });
    // Cập nhật chỉ mục lần cuối (đủ số buổi đã xạ) và đánh dấu đã lưu trữ, trước khi chuyển dữ liệu
    var tI = readTable_(ss, SHEET_NAMES.IDX), byId = {};
    tI.rows.forEach(function (r) { byId[r.id] = r; });
    var fx = readTable_(ss, SHEET_NAMES.BUOI).rows, gd = readTable_(ss, SHEET_NAMES.GD).rows;
    tBN.rows.forEach(function (p) {
      if (!move[p.id]) return;
      var row = RT.indexRow(p, fx, gd, true);
      if (byId[p.id]) row._row = byId[p.id]._row;
      writeRow_(tI, row);
    });
    moveRows_(ss, SHEET_NAMES.BN, ARCHIVE.BenhNhan, function (r) { return move[r.id]; });
    moveRows_(ss, SHEET_NAMES.GD, ARCHIVE.GiaiDoan, function (r) { return move[r.bn_id]; });
    moveRows_(ss, SHEET_NAMES.BUOI, function (r) { return move[r.bn_id] ? ARCHIVE.BuoiXa + '_' + String(r.ngay).slice(0, 4) : null; });
    moveRows_(ss, SHEET_NAMES.LICH, ARCHIVE.LichNgoaiLe, function (r) { return move[r.bn_id] || (r.loai === 'MAY_NGHI' && r.ngay < cutoff) || (r.loai === 'THONG_BAO' && r.ngay < today) || r.da_xoa === 'Có'; });
    var log = ss.getSheetByName(SHEET_NAMES.LOG);
    log.getRange(log.getLastRow() + 1, 1, 1, 5).setNumberFormat('@')
      .setValues([[Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"), 'hệ thống', 'Lưu trữ', '', n + ' đợt xạ']]);
    return 'Đã lưu trữ ' + n + ' đợt xạ.';
  } finally {
    lock.releaseLock();
  }
}

/** Chuyển các dòng thoả điều kiện sang trang lưu trữ. toName là tên trang, hoặc hàm (dòng) → tên trang / null (giữ lại). */
function moveRows_(ss, fromName, toName, pred) {
  var target = typeof toName === 'function' ? toName : function (r) { return pred(r) ? toName : null; };
  var from = readTable_(ss, fromName);
  var keep = [], groups = {};
  from.rows.forEach(function (r) { var t = target(r); if (t) (groups[t] = groups[t] || []).push(r); else keep.push(r); });
  if (!Object.keys(groups).length) return;
  var asRow = function (head) { return function (o) { return head.map(function (h) { return h ? (o[h] == null ? '' : String(o[h])) : ''; }); }; };
  Object.keys(groups).forEach(function (name) {
    ensureSheet_(ss, name, from.head.filter(function (h) { return h; }));
    var to = readTable_(ss, name);
    var start = Math.max(to.sheet.getLastRow(), 1) + 1;
    to.sheet.getRange(start, 1, groups[name].length, to.head.length).setNumberFormat('@').setValues(groups[name].map(asRow(to.head)));
  });
  var last = from.sheet.getLastRow();
  if (last > 1) from.sheet.getRange(2, 1, last - 1, from.head.length).clearContent();
  if (keep.length) from.sheet.getRange(2, 1, keep.length, from.head.length).setNumberFormat('@').setValues(keep.map(asRow(from.head)));
}

function stripRow_(r) { var o = {}; Object.keys(r).forEach(function (k) { if (k !== '_row') o[k] = r[k]; }); return o; }

/** Các trang lưu trữ buổi xạ: bản cũ (LuuTru_BuoiXa) và theo năm (LuuTru_BuoiXa_2027…) */
function archiveFxSheets_(ss) {
  return ss.getSheets().map(function (s) { return s.getName(); }).filter(function (n) { return /^LuuTru_BuoiXa(_\d{4})?$/.test(n); });
}
/** Đọc buổi xạ đã lưu trữ, chỉ các năm nằm trong [tu, den] (để trống = tất cả) */
function readArchiveFx_(ss, tu, den) {
  var y1 = tu ? parseInt(String(tu).slice(0, 4), 10) : 0, y2 = den ? parseInt(String(den).slice(0, 4), 10) : 9999;
  var out = [];
  archiveFxSheets_(ss).forEach(function (n) {
    var m = /_(\d{4})$/.exec(n);
    if (m && (+m[1] < y1 || +m[1] > y2)) return;
    out = out.concat(readTable_(ss, n).rows);
  });
  return out;
}
function ensureSheet_(ss, name, cols) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#e3f4ee');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');
  }
  return sh;
}

/** Lập lại toàn bộ chỉ mục từ dữ liệu đang có và lưu trữ. setup tự gọi khi chỉ mục còn trống. */
function buildIndex_() {
  var ss = ss_();
  var sh = ensureSheet_(ss, SHEET_NAMES.IDX, RT.COLS.ChiMuc);
  var live = readTable_(ss, SHEET_NAMES.BN).rows, liveG = readTable_(ss, SHEET_NAMES.GD).rows, liveF = readTable_(ss, SHEET_NAMES.BUOI).rows;
  var arc = readTable_(ss, ARCHIVE.BenhNhan).rows, arcG = readTable_(ss, ARCHIVE.GiaiDoan).rows, arcF = readArchiveFx_(ss, '', '');
  var rows = live.map(function (p) { return RT.indexRow(p, liveF, liveG, false); })
    .concat(arc.map(function (p) { return RT.indexRow(p, arcF, arcG, true); }));
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, RT.COLS.ChiMuc.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, RT.COLS.ChiMuc.length).setNumberFormat('@')
    .setValues(rows.map(function (r) { return RT.COLS.ChiMuc.map(function (c) { return r[c] || ''; }); }));
  return 'Đã lập chỉ mục ' + rows.length + ' đợt xạ.';
}

/** Lấy đầy đủ một đợt xạ đã lưu trữ (dữ liệu bệnh nhân, giai đoạn, buổi xạ của đúng các năm liên quan) */
function archiveCourse_(id) {
  var ss = ss_();
  var p = readTable_(ss, ARCHIVE.BenhNhan).rows.filter(function (x) { return x.id === id; })[0];
  if (!p) throw new Error('Không tìm thấy đợt xạ trong lưu trữ.');
  return {
    patients: [stripRow_(p)],
    phases: readTable_(ss, ARCHIVE.GiaiDoan).rows.filter(function (g) { return g.bn_id === id && g.trang_thai !== 'HUY'; }).map(stripRow_),
    fractions: readArchiveFx_(ss, p.ngay_bat_dau || p.ngay_tao, p.ngay_ket_thuc || '').filter(function (f) { return f.bn_id === id && f.da_huy !== 'Có'; }).map(stripRow_)
  };
}

/** Dữ liệu cho thống kê: trang chính, thêm lưu trữ nếu khoảng ngày cũ hơn 60 ngày */
function statsData_(ctx, tu, den) {
  var data = { patients: ctx.patients, phases: ctx.phases, fractions: ctx.fractions, exceptions: ctx.exceptions, holidays: ctx.holidays,
    users: ctx.users, dm: ctx.dm, today: ctx.today, roster: ctx.roster };
  if (tu && tu < RT.addDays(ctx.today, -ARCHIVE_DAYS)) {
    var ss2 = ss_();
    data.patients = data.patients.concat(readTable_(ss2, ARCHIVE.BenhNhan).rows.map(function (p) { p._luu = 1; return p; }));
    data.phases = data.phases.concat(readTable_(ss2, ARCHIVE.GiaiDoan).rows);
    data.fractions = data.fractions.concat(readArchiveFx_(ss2, tu, ''));
    data.exceptions = data.exceptions.concat(readTable_(ss2, ARCHIVE.LichNgoaiLe).rows.filter(function (e) { return e.loai === 'VANG' && e.ngay >= tu; }));
  }
  return data;
}

