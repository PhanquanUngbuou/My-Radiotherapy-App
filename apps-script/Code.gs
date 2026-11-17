// Điều phối Xạ trị · phiên bản v1.7
/**
 * Điều phối Xạ trị — phần máy chủ chạy trên Google Apps Script.
 * Dữ liệu lưu trong chính Google Sheet chứa script này.
 *
 * Cài đặt lần đầu: chọn hàm "setup" ở thanh công cụ rồi bấm Chạy (Run).
 * Xem hướng dẫn đầy đủ trong HUONG-DAN-CAI-DAT.md.
 */

var TZ = 'Asia/Ho_Chi_Minh';
var SHEET_NAMES = { BN: 'BenhNhan', GD: 'GiaiDoan', BUOI: 'BuoiXa', LICH: 'LichNgoaiLe', USER: 'NguoiDung', DM: 'DanhMuc', LOG: 'NhatKy' };
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

  var dm = ss.getSheetByName(SHEET_NAMES.DM);
  // Bổ sung các danh mục còn thiếu (lần đầu, hoặc danh mục mới khi nâng cấp)
  var have = {};
  if (dm.getLastRow() > 1) dm.getRange(2, 1, dm.getLastRow() - 1, 1).getValues().forEach(function (r) { have[String(r[0]).toUpperCase()] = 1; });
  var rows = [];
  Object.keys(RT.DEFAULT_DM).forEach(function (loai) {
    if (!have[loai]) RT.DEFAULT_DM[loai].forEach(function (v) { rows.push([loai, v]); });
  });
  if (!have.NGAY_LE && dm.getLastRow() <= 1) rows.push(['NGAY_LE', '2027-01-01']);
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

  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  return 'Đã cài đặt xong.';
}

/** Điểm vào duy nhất cho giao diện: google.script.run.api(action, payload) */
function api(action, payload) {
  var lock = null;
  try {
    if (action === 'searchArchive') return JSON.stringify(searchArchive_(payload || {}));
    if (action !== 'bootstrap' && action !== 'getLog') {
      lock = LockService.getScriptLock();
      lock.waitLock(30000);
    }
    var ctx = buildCtx_();
    var msg = '', extra = {};
    if (action === 'getLog') {
      if (ctx.user.vai_tro !== 'ADMIN') throw new Error('Chỉ quản trị xem được nhật ký.');
      extra.log = readLog_(300);
    } else if (action !== 'bootstrap') {
      msg = RT.handle(ctx, action, payload || {});
      SpreadsheetApp.flush();
    }
    return JSON.stringify({ ok: true, msg: msg, data: RT.view(ctx), log: extra.log });
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
    return u;
  });
  var user = users.filter(function (u) { return u.email === email && u.kich_hoat !== 'Không'; })[0];
  if (!user) throw new Error('NO_ACCESS:' + email);
  if (!RT.ROLES[user.vai_tro]) throw new Error('Vai trò "' + user.vai_tro + '" của ' + email + ' không hợp lệ. Dùng BS, KS, KTV, DD hoặc ADMIN.');

  var tBN = readTable_(ss, SHEET_NAMES.BN);
  var tGD = readTable_(ss, SHEET_NAMES.GD);
  var tBX = readTable_(ss, SHEET_NAMES.BUOI);
  var tLich = readTable_(ss, SHEET_NAMES.LICH);
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
  return {
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
    idFloor: function (prefix) { return parseInt(props.getProperty('ID_FLOOR_' + prefix) || '0', 10); },
    savePatient: function (p) { writeRow_(tBN, p); },
    savePhase: function (g) { writeRow_(tGD, g); },
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

/** Tìm bệnh nhân đã chuyển sang lưu trữ (theo mã HIS, tên hoặc mã đợt). */
function searchArchive_(a) {
  try {
    currentUser_();
    var q = fold_(a.q).trim();
    if (q.length < 2) return { ok: true, archive: { patients: [], phases: [], fractions: [] } };
    var ss = ss_();
    var pts = readTable_(ss, ARCHIVE.BenhNhan).rows.filter(function (p) {
      return p.trang_thai !== 'HUY' && (fold_(p.ma_his).indexOf(q) >= 0 || fold_(p.ho_ten).indexOf(q) >= 0 || fold_(p.id).indexOf(q) >= 0);
    }).slice(0, 30);
    var ids = {};
    pts.forEach(function (p) { ids[p.id] = 1; delete p._row; });
    var strip = function (r) { delete r._row; return r; };
    return { ok: true, archive: {
      patients: pts,
      phases: readTable_(ss, ARCHIVE.GiaiDoan).rows.filter(function (g) { return ids[g.bn_id] && g.trang_thai !== 'HUY'; }).map(strip),
      fractions: readTable_(ss, ARCHIVE.BuoiXa).rows.filter(function (f) { return ids[f.bn_id] && f.da_huy !== 'Có'; }).map(strip)
    } };
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
      if ((p.trang_thai === 'HOAN_THANH' || p.trang_thai === 'HUY') && end && end < cutoff) move[p.id] = 1;
    });
    var n = Object.keys(move).length;
    if (!n) return 'Không có gì cần lưu trữ.';
    var props = PropertiesService.getScriptProperties();
    Object.keys(move).forEach(function (id) {
      var m = /^(XT\d\d-)(\d+)$/.exec(id);
      if (m) {
        var k = 'ID_FLOOR_' + m[1], cur = parseInt(props.getProperty(k) || '0', 10);
        if (parseInt(m[2], 10) > cur) props.setProperty(k, String(parseInt(m[2], 10)));
      }
    });
    moveRows_(ss, SHEET_NAMES.BN, ARCHIVE.BenhNhan, function (r) { return move[r.id]; });
    moveRows_(ss, SHEET_NAMES.GD, ARCHIVE.GiaiDoan, function (r) { return move[r.bn_id]; });
    moveRows_(ss, SHEET_NAMES.BUOI, ARCHIVE.BuoiXa, function (r) { return move[r.bn_id]; });
    moveRows_(ss, SHEET_NAMES.LICH, ARCHIVE.LichNgoaiLe, function (r) { return move[r.bn_id] || (r.loai === 'MAY_NGHI' && r.ngay < cutoff) || r.da_xoa === 'Có'; });
    var log = ss.getSheetByName(SHEET_NAMES.LOG);
    log.getRange(log.getLastRow() + 1, 1, 1, 5).setNumberFormat('@')
      .setValues([[Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"), 'hệ thống', 'Lưu trữ', '', n + ' đợt xạ']]);
    return 'Đã lưu trữ ' + n + ' đợt xạ.';
  } finally {
    lock.releaseLock();
  }
}

function moveRows_(ss, fromName, toName, pred) {
  var from = readTable_(ss, fromName), to = readTable_(ss, toName);
  var keep = [], moved = [];
  from.rows.forEach(function (r) { (pred(r) ? moved : keep).push(r); });
  if (!moved.length) return;
  var asRow = function (head) { return function (o) { return head.map(function (h) { return h ? (o[h] == null ? '' : String(o[h])) : ''; }); }; };
  var start = Math.max(to.sheet.getLastRow(), 1) + 1;
  to.sheet.getRange(start, 1, moved.length, to.head.length).setNumberFormat('@').setValues(moved.map(asRow(to.head)));
  var last = from.sheet.getLastRow();
  if (last > 1) from.sheet.getRange(2, 1, last - 1, from.head.length).clearContent();
  if (keep.length) from.sheet.getRange(2, 1, keep.length, from.head.length).setNumberFormat('@').setValues(keep.map(asRow(from.head)));
}
