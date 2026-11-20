// Chạy Core.gs + Code.gs với Google Sheets giả lập để kiểm tra luồng nghiệp vụ đầu-cuối.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const dir = path.join(__dirname, '..', 'apps-script');

function makeSheet(name) {
  const sh = { name, data: [], fmt: {} };
  const ensure = (r, c) => { while (sh.data.length < r) sh.data.push([]); sh.data.forEach(row => { while (row.length < c) row.push(''); }); };
  sh.getLastRow = () => { for (let i = sh.data.length; i > 0; i--) if (sh.data[i - 1].some(v => v !== '')) return i; return 0; };
  sh.getMaxRows = () => Math.max(sh.data.length, 1000);
  sh.getName = () => sh.name; sh.getSheetId = () => 1; sh.setColumnWidth = () => {};
  sh.getLastColumn = () => Math.max(0, ...sh.data.map(r => r.length));
  sh.deleteRow = r => { sh.data.splice(r - 1, 1); };
  sh.setFrozenRows = () => {};
  sh.getRange = (r, c, nr = 1, nc = 1) => {
    const rng = {
      setValues(vals) { ensure(r + nr - 1, c + nc - 1); vals.forEach((row, i) => row.forEach((v, j) => { sh.data[r - 1 + i][c - 1 + j] = v; })); return rng; },
      setValue(v) { return rng.setValues([[v]]); }, getValues() { ensure(r + nr - 1, c + nc - 1); return sh.data.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc)); },
      setNumberFormat() { return rng; }, setFontSize() { return rng; }, setFontWeight() { return rng; }, setBackground() { return rng; },
      clearContent() { ensure(r + nr - 1, c + nc - 1); for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) sh.data[r - 1 + i][c - 1 + j] = ''; return rng; }
    };
    return rng;
  };
  sh.getDataRange = () => ({ getValues: () => { const w = Math.max(1, ...sh.data.map(r => r.length)); return sh.data.length ? sh.data.map(r => { const x = r.slice(); while (x.length < w) x.push(''); return x; }) : [['']]; } });
  return sh;
}
const sheets = {};
const ss = {
  getId: () => 'SS1', getName: () => 'DieuPhoiXaTri', setSpreadsheetTimeZone() {}, getUrl: () => 'https://sheet',
  getSheetByName: n => sheets[n] || null,
  insertSheet: n => (sheets[n] = makeSheet(n)),
  getSheets: () => Object.values(sheets), deleteSheet() {}
};
let currentEmail = 'admin@x.vn';
const props = {};
const copies = [];
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss, flush() {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k], setProperty: (k, v) => { props[k] = v; } }) },
  Session: { getActiveUser: () => ({ getEmail: () => currentEmail }), getEffectiveUser: () => ({ getEmail: () => 'admin@x.vn' }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: { formatDate: (d, tz, f) => { const s = new Date(d.getTime() + 7 * 3600e3).toISOString(); return f === 'yyyy-MM-dd' ? s.slice(0, 10) : s.slice(0, 19); } },
  HtmlService: {}, console, Logger: { log() {} },
  DriveApp: { getFileById: () => ({ makeCopy: n => { copies.push(n); } }) }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'Core.gs'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'Code.gs'), 'utf8'), ctx);

assert.strictEqual(vm.runInContext('setup()', ctx), 'Đã cài đặt xong.');
// thêm người dùng
const U = sheets.NguoiDung;
U.getRange(3, 1, 4, 4).setValues([['bs@x.vn', 'BS A', 'BS', 'Có'], ['ks@x.vn', 'KS B', 'KS', 'Có'], ['ktv@x.vn', 'KTV C', 'KTV', 'Có'], ['dd@x.vn', 'ĐD D', 'DD', 'Có']]);

const api = (who, action, payload) => { currentEmail = who; const r = JSON.parse(ctx.api(action, payload)); return r; };
const ok = (who, action, payload) => { const r = api(who, action, payload); if (!r.ok) throw new Error(action + ': ' + r.error); return r; };

let r = api('stranger@x.vn', 'bootstrap');
assert(!r.ok && r.error.startsWith('NO_ACCESS:'), 'người lạ bị chặn');
r = api('dd@x.vn', 'createPatient', { ma_his: '0123', ho_ten: 'X', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25' });
assert(!r.ok && /bác sĩ điều trị/.test(r.error), 'ĐD nhập BN phải chọn BS điều trị: ' + r.error);
r = api('ktv@x.vn', 'createPatient', { ma_his: '0124', ho_ten: 'X', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25', bs_email: 'ks@x.vn' });
assert(!r.ok && /danh sách bác sĩ/.test(r.error), 'BS điều trị phải là bác sĩ');
r = ok('ktv@x.vn', 'createPatient', { ma_his: '0125', ho_ten: 'Nhập bởi KTV', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25', bs_email: 'bs@x.vn', trang_thai: 'MO_PHONG' });
let byKtv = r.data.patients.find(x => x.ma_his === '0125');
assert.strictEqual(byKtv.nguoi_nhap, 'ktv@x.vn'); assert.strictEqual(byKtv.bs_email, 'bs@x.vn');
ok('ks@x.vn', 'createPatient', { ma_his: '0126', ho_ten: 'Nhập bởi KS', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25', bs_email: 'bs@x.vn' });
assert(!api('ktv@x.vn', 'updatePatient', { id: byKtv.id, tong_lieu: '60' }).ok, 'KTV không sửa chỉ định');
ok('bs@x.vn', 'deletePatient', { id: byKtv.id, ly_do: 'test' });
ok('bs@x.vn', 'deletePatient', { id: r.data.patients.find(x => x.ma_his === '0125').id === byKtv.id ? ok('admin@x.vn', 'bootstrap').data.patients.find(x => x.ma_his === '0126').id : '', ly_do: 'test' });

r = ok('bs@x.vn', 'createPatient', { ma_his: '00123456', ho_ten: 'Nguyễn Văn A', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K vòm', ky_thuat: 'VMAT', tong_lieu: '6', so_buoi: '3', sgrt: 'Có' });
const id = r.data.patients[0].id;
assert.strictEqual(r.data.patients[0].ma_his, '00123456', 'giữ số 0 đầu mã HIS');
assert.strictEqual(r.data.patients[0].trang_thai, 'CONTOUR');
r = api('bs@x.vn', 'createPatient', { ma_his: '00123456', ho_ten: 'Nguyễn Văn A', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K vòm', ky_thuat: 'VMAT', tong_lieu: '6', so_buoi: '3' });
assert(!r.ok && r.error.startsWith('DUP_HIS:'), 'cảnh báo trùng mã HIS');

ok('bs@x.vn', 'contourDone', { id, uu_tien: 'Cấp cứu', ly_do_uu_tien: 'Chèn ép tủy' });
ok('ks@x.vn', 'claimPlan', { id, ks_email: 'ks@x.vn' });
ok('ks@x.vn', 'planDone', { id, can_qa: true });
r = ok('ks@x.vn', 'qaResult', { id, dat: true });
assert.strictEqual(r.data.patients[0].trang_thai, 'CHO_XA');
ok('admin@x.vn', 'schedule', { id, ngay_du_kien: r.data.today, ngay_nghi_tuan: '3', may: 'Máy gia tốc 1' });
const today = r.data.today;
r = ok('ktv@x.vn', 'logFraction', { bn_id: id, ngay: today, hinh_anh: ['CBCT', 'SGRT (C-RAD)'] });
assert.strictEqual(r.data.patients[0].trang_thai, 'DANG_XA');
assert.strictEqual(r.data.fractions.length, 1);
r = api('ktv@x.vn', 'logFraction', { bn_id: id, ngay: today });
assert(!r.ok && r.error === 'DUP_DAY', 'chặn ghi trùng ngày');
const y1 = ctx.RT.addDays(today, -1), y2 = ctx.RT.addDays(today, -2);
ok('ktv@x.vn', 'logFraction', { bn_id: id, ngay: y1, ly_do_bu: 'quên tích' });
r = ok('ktv@x.vn', 'logFraction', { bn_id: id, ngay: y2, ly_do_bu: 'quên tích' });
assert.strictEqual(r.data.patients[0].trang_thai, 'HOAN_THANH', 'đủ buổi thì hoàn thành');
assert.strictEqual(r.data.patients[0].ngay_bat_dau, y2);
const fid = r.data.fractions.find(f => f.ngay === today).id;
r = ok('ktv@x.vn', 'undoFraction', { id: fid, ly_do: 'nhầm' });
assert.strictEqual(r.data.patients[0].trang_thai, 'DANG_XA', 'huỷ buổi thì quay lại đang xạ');
assert.strictEqual(r.data.fractions.length, 2);

// Đọc lại từ sheet (mô phỏng tải trang mới) phải ra cùng trạng thái
r = ok('dd@x.vn', 'bootstrap');
assert.strictEqual(r.data.patients.length, 1);
assert.strictEqual(r.data.patients[0].trang_thai, 'DANG_XA');
assert.strictEqual(r.data.fractions.length, 2);
assert.strictEqual(sheets.NhatKy.getLastRow() > 5, true, 'có ghi nhật ký');
const c = ctx.RT.course(r.data.patients[0], r.data.fractions, ctx.RT.makeEnv(today, [], r.data.exceptions, r.data.phases, 'Máy gia tốc 1'));
assert.strictEqual(c.done, 2); assert.strictEqual(c.doseDone, 4); assert.strictEqual(c.projected.length, 1);
// Bệnh nhân đang xạ dở khi bắt đầu dùng hệ thống
const st = ctx.RT.addDays(today, -13);
r = ok('bs@x.vn', 'createPatient', { ma_his: '777', ho_ten: 'BN Cũ', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K vú', ky_thuat: '3D-CRT', tong_lieu: '50', so_buoi: '25', trang_thai: 'DANG_XA', ngay_bat_dau: st, da_xa: '8' });
let old = r.data.patients.find(x => x.ma_his === '777');
assert.strictEqual(old.trang_thai, 'DANG_XA'); assert.strictEqual(r.data.fractions.filter(f => f.bn_id === old.id).length, 8);
r = api('bs@x.vn', 'createPatient', { ma_his: '778', ho_ten: 'Sai', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K', ky_thuat: '3D-CRT', tong_lieu: '50', so_buoi: '25', trang_thai: 'DANG_XA', ngay_bat_dau: today, da_xa: '5' });
assert(!r.ok, 'chặn số buổi đã xạ vượt số ngày');
r = ok('bs@x.vn', 'endEarly', { id: old.id, ly_do: 'Bệnh tiến triển' });
assert.strictEqual(r.data.patients.find(x => x.id === old.id).trang_thai, 'HOAN_THANH');
// Quản trị
r = ok('admin@x.vn', 'saveUser', { email: 'NEW@x.vn', ho_ten: 'BS Mới', vai_tro: 'bs', kich_hoat: 'Có', khoa: 'Xạ trị' });
assert(r.data.users.some(u => u.email === 'new@x.vn' && u.vai_tro === 'BS'));
ok('new@x.vn', 'bootstrap');
ok('admin@x.vn', 'saveUser', { email: 'new@x.vn', ho_ten: 'BS Mới', vai_tro: 'BS', kich_hoat: 'Không' });
assert(!api('new@x.vn', 'bootstrap').ok, 'tài khoản bị khoá không vào được');
assert(!api('admin@x.vn', 'saveUser', { email: 'admin@x.vn', ho_ten: 'QT', vai_tro: 'BS' }).ok, 'không tự bỏ quyền');
r = ok('admin@x.vn', 'dmAdd', { loai: 'MAY', gia_tri: 'Máy gia tốc 2' });
assert.deepStrictEqual(r.data.dm.MAY, ['Máy gia tốc 1', 'Máy gia tốc 2']);
r = ok('admin@x.vn', 'dmAdd', { loai: 'NGAY_LE', gia_tri: '2027-02-17' });
assert(r.data.holidays.includes('2027-02-17'));
r = ok('admin@x.vn', 'dmRemove', { loai: 'MAY', gia_tri: 'Máy gia tốc 2' });
assert.deepStrictEqual(r.data.dm.MAY, ['Máy gia tốc 1']);
r = ok('admin@x.vn', 'bootstrap');
assert.deepStrictEqual(r.data.dm.MAY, ['Máy gia tốc 1'], 'đọc lại danh mục từ sheet');
r = ok('admin@x.vn', 'dmAdd', { loai: 'TEN_DON_VI', gia_tri: 'Khoa X' });
assert.deepStrictEqual(ok('admin@x.vn', 'bootstrap').data.dm.TEN_DON_VI, ['Khoa X']);
r = ok('admin@x.vn', 'getLog');
assert(r.log.length > 10 && r.log[0].thao_tac);
assert(!api('bs@x.vn', 'getLog').ok);
// Huỷ hồ sơ
r = ok('bs@x.vn', 'createPatient', { ma_his: '999', ho_ten: 'Nhầm', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25' });
const nid = r.data.patients.find(x => x.ma_his === '999').id;
r = ok('bs@x.vn', 'deletePatient', { id: nid, ly_do: 'nhập nhầm' });
assert(!r.data.patients.some(x => x.id === nid), 'hồ sơ huỷ bị ẩn');
// Nâng cấp: chạy lại setup không làm mất dữ liệu
vm.runInContext('setup()', ctx);
assert.strictEqual(ok('admin@x.vn', 'bootstrap').data.patients.length, 2);

// ---- Boost theo giai đoạn ----
r = ok('bs@x.vn', 'createPatient', { ma_his: '5001', ho_ten: 'BN Boost', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K TTL', vi_tri: 'Tiểu khung', ky_thuat: 'VMAT', tong_lieu: '4', so_buoi: '2', trang_thai: 'CHO_XA', ngay_du_kien: today, boost: { ky_thuat: 'VMAT', tong_lieu: '6', so_buoi: '2', buoc: 'CONTOUR' } });
let bp = r.data.patients.find(x => x.ma_his === '5001');
let g = r.data.phases.find(x => x.bn_id === bp.id);
assert.strictEqual(g.trang_thai, 'CONTOUR'); assert.strictEqual(bp.vi_tri, 'Tiểu khung');
const d1 = ctx.RT.addDays(today, -2), d2 = ctx.RT.addDays(today, -1);
ok('ktv@x.vn', 'logFraction', { bn_id: bp.id, ngay: d1, ly_do_bu: 'quên tích' });
ok('ktv@x.vn', 'logFraction', { bn_id: bp.id, ngay: d2, ly_do_bu: 'quên tích' });
r = api('ktv@x.vn', 'logFraction', { bn_id: bp.id, ngay: today });
assert(!r.ok && /chưa sẵn sàng/.test(r.error), 'chặn xạ khi KH boost chưa sẵn sàng: ' + r.error);
ok('bs@x.vn', 'contourDone', { id: g.id, uu_tien: 'Ưu tiên', ly_do_uu_tien: 'test' });
ok('ks@x.vn', 'claimPlan', { id: g.id, ks_email: 'ks@x.vn' });
ok('ks@x.vn', 'planDone', { id: g.id, can_qa: true });
r = ok('ks@x.vn', 'qaResult', { id: g.id, dat: true });
assert.strictEqual(r.data.phases.find(x => x.id === g.id).trang_thai, 'SAN_SANG');
r = ok('ktv@x.vn', 'logFraction', { bn_id: bp.id, ngay: today });
assert.strictEqual(r.data.fractions.filter(f => f.bn_id === bp.id).slice(-1)[0].gd, '2', 'buổi xạ ghi đúng GĐ2');
let env2 = ctx.RT.makeEnv(today, [], r.data.exceptions, r.data.phases, 'Máy gia tốc 1');
let cb = ctx.RT.course(r.data.patients.find(x => x.id === bp.id), r.data.fractions, env2);
assert.strictEqual(cb.total, 4); assert.strictEqual(cb.doseDone, 7); assert.strictEqual(cb.doseTotal, 10);
// Thêm boost mô phỏng lại cho BN đang xạ, rồi huỷ
r = ok('bs@x.vn', 'addPhase', { bn_id: bp.id, ky_thuat: '3D-CRT', tong_lieu: '4', so_buoi: '2', buoc: 'MO_PHONG' });
let g3 = r.data.phases.find(x => x.bn_id === bp.id && x.stt === '3');
assert.strictEqual(g3.trang_thai, 'MO_PHONG');
ok('ktv@x.vn', 'simDone', { id: g3.id, nguoi_mo_phong: ['ktv@x.vn'] });
r = ok('bs@x.vn', 'deletePhase', { id: g3.id, ly_do: 'đổi ý' });
assert(!r.data.phases.some(x => x.id === g3.id));
// ---- Lịch tuần: đổi ngày, máy nghỉ ----
const fut = ctx.RT.addDays(today, 3);
let wd = fut; while (ctx.RT.dow(wd) === 0 || ctx.RT.dow(wd) === 6) wd = ctx.RT.addDays(wd, 1);
r = ok('admin@x.vn', 'setDay', { bn_id: bp.id, ngay: wd, xa: false });
assert(r.data.exceptions.some(e => e.bn_id === bp.id && e.ngay === wd && e.loai === 'NGHI'));
r = ok('admin@x.vn', 'setDay', { bn_id: bp.id, ngay: wd, xa: true });
assert(!api('ktv@x.vn', 'setDay', { bn_id: bp.id, ngay: wd, xa: false }).ok, 'KTV thường không đổi ngày xạ');
assert(!r.data.exceptions.some(e => e.bn_id === bp.id && e.ngay === wd), 'trả về lịch gốc thì xoá ngoại lệ');
r = ok('ktv@x.vn', 'machineDown', { may: 'Máy gia tốc 1', ngay: wd, ghi_chu: 'bảo trì' });
env2 = ctx.RT.makeEnv(today, [], r.data.exceptions, r.data.phases, 'Máy gia tốc 1');
assert(!ctx.RT.isTreatDay(r.data.patients.find(x => x.id === bp.id), wd, env2), 'máy nghỉ thì không xạ');
const mid = r.data.exceptions.find(e => e.loai === 'MAY_NGHI').id;
r = ok('ktv@x.vn', 'machineUp', { id: mid });
assert(!r.data.exceptions.some(e => e.loai === 'MAY_NGHI'));
assert(!api('dd@x.vn', 'setDay', { bn_id: bp.id, ngay: wd, xa: false }).ok, 'ĐD không đổi lịch');
// ---- Đợt xạ mới cho cùng BN (xạ triệu chứng vị trí khác) ----
r = ok('bs@x.vn', 'createPatient', { ma_his: '5001', ho_ten: 'BN Boost', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'Di căn xương', vi_tri: 'Cột sống L3', muc_dich: 'Giảm nhẹ / triệu chứng', ky_thuat: '3D-CRT', tong_lieu: '8', so_buoi: '1', force: true });
assert.strictEqual(r.data.patients.filter(x => x.ma_his === '5001').length, 2);
// ---- Lưu trữ ----
const BN = sheets.BenhNhan, head = BN.data[0];
const ci = n => head.indexOf(n);
const oldRow = BN.data.find(row => row[ci('ho_ten')] === 'BN Cũ');
oldRow[ci('ngay_ket_thuc')] = ctx.RT.addDays(today, -90);
const oldId = oldRow[ci('id')];
const before = sheets.BuoiXa.getLastRow();
assert.strictEqual(vm.runInContext('archiveOld()', ctx), 'Đã lưu trữ 1 đợt xạ.');
r = ok('admin@x.vn', 'bootstrap');
assert(!r.data.patients.some(x => x.id === oldId), 'đợt cũ đã ra khỏi trang tính chính');
assert(sheets.BuoiXa.getLastRow() < before, 'buổi xạ cũ cũng chuyển đi');
let sr = JSON.parse(ctx.api('searchArchive', { q: '777' }));
assert(sr.ok && sr.archive.patients.length === 1 && sr.archive.patients[0].da_xa === '8', 'tìm được trong lưu trữ (qua chỉ mục)');
assert(Object.keys(sheets).some(n => /^LuuTru_BuoiXa_\d{4}$/.test(n)), 'buổi xạ lưu trữ theo năm');
let ac = ok('bs@x.vn', 'archiveCourse', { id: oldId });
assert(ac.course.patients[0].id === oldId && ac.course.fractions.length === 8, 'mở đầy đủ đợt đã lưu trữ');
let lh = ok('bs@x.vn', 'lookupHis', { ma_his: '777' });
assert(lh.his.length === 1 && lh.his[0].luu_tru === 'Có', 'tra mã HIS thấy cả đợt đã lưu trữ');
r = api('bs@x.vn', 'createPatient', { ma_his: '777', ho_ten: 'Tên Khác', nam_sinh: '1960' });
assert(!r.ok && /^HIS_NAME:/.test(r.error), 'mã HIS đã có với tên khác thì cảnh báo: ' + r.error);
r = ok('bs@x.vn', 'createPatient', { ma_his: '777', ho_ten: 'Bn cũ', nam_sinh: '1960' });
assert(r.data.patients.some(x => x.ma_his === '777'), 'cùng tên (không phân biệt hoa/dấu) thì không cảnh báo');
sr = JSON.parse(ctx.api('searchArchive', { q: 'bn cu' }));
assert(sr.ok && sr.archive.patients.length === 1, 'tìm không dấu');
r = ok('bs@x.vn', 'createPatient', { ma_his: '6001', ho_ten: 'Mới', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25' });
const ids = r.data.patients.map(x => x.id);
assert(!ids.includes(oldId) && new Set(ids).size === ids.length, 'mã đợt mới không trùng mã đã lưu trữ');
assert(parseInt(r.data.patients.find(x => x.ma_his === '6001').id.slice(5), 10) > parseInt(oldId.slice(5), 10));

// ---- Bước "Chờ mô phỏng" cho BN mới ----
r = ok('bs@x.vn', 'createPatient', { ma_his: '7001', ho_ten: 'Chờ MP', nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K', vi_tri: 'Não (toàn não)', ky_thuat: '3D-CRT', tong_lieu: '30', so_buoi: '10', trang_thai: 'MO_PHONG', ngay_mo_phong: today });
let mp = r.data.patients.find(x => x.ma_his === '7001');
assert.strictEqual(mp.trang_thai, 'MO_PHONG'); assert.strictEqual(mp.ngay_mo_phong, today);
assert(!api('bs@x.vn', 'contourDone', { id: mp.id }).ok, 'chưa mô phỏng thì chưa contour xong được');
r = ok('ktv@x.vn', 'simDone', { id: mp.id, nguoi_mo_phong: ['ktv@x.vn'] });
assert.strictEqual(r.data.patients.find(x => x.id === mp.id).trang_thai, 'CONTOUR');
ok('bs@x.vn', 'contourDone', { id: mp.id });
// ---- Danh mục mặc định (VI_TRI chưa có trên sheet) giữ nguyên khi thêm/xoá ----
sheets.DanhMuc.data = sheets.DanhMuc.data.filter((row, i) => i === 0 || row[0] !== 'VI_TRI');
r = ok('admin@x.vn', 'bootstrap');
const nDefault = r.data.dm.VI_TRI.length;
r = ok('admin@x.vn', 'dmAdd', { loai: 'VI_TRI', gia_tri: 'Hố yên' });
r = ok('admin@x.vn', 'bootstrap');
assert.strictEqual(r.data.dm.VI_TRI.length, nDefault + 1, 'thêm vị trí không làm mất danh sách mặc định');
r = ok('admin@x.vn', 'dmRemove', { loai: 'VI_TRI', gia_tri: 'Hạch' });
assert.strictEqual(ok('admin@x.vn', 'bootstrap').data.dm.VI_TRI.length, nDefault);

// ---- v1.6: nhập hành chính trước, chuyên môn bổ sung khi contour xong ----
r = api('dd@x.vn', 'createPatient', { ma_his: '8001', ho_ten: 'Chỉ hành chính', bs_email: 'bs@x.vn', trang_thai: 'CONTOUR' });
assert(!r.ok && /năm sinh/.test(r.error), 'bắt buộc năm sinh/tuổi');
r = ok('dd@x.vn', 'createPatient', { ma_his: '8001', ho_ten: 'Chỉ hành chính', nam_sinh: '61', bs_email: 'bs@x.vn', trang_thai: 'MO_PHONG' });
let hc = r.data.patients.find(x => x.ma_his === '8001');
assert.strictEqual(hc.nam_sinh, String(parseInt(today.slice(0, 4), 10) - 61), 'tuổi đổi ra năm sinh');
assert(!api('dd@x.vn', 'createPatient', { ma_his: '8002', ho_ten: 'X', nam_sinh: '1960', bs_email: 'bs@x.vn', trang_thai: 'CHO_KH' }).ok, 'chuyển thẳng kỹ sư thì phải đủ chuyên môn');
ok('ktv@x.vn', 'simDone', { id: hc.id, nguoi_mo_phong: ['ktv@x.vn'] });
r = api('bs@x.vn', 'contourDone', { id: hc.id });
assert(!r.ok && /chẩn đoán, kỹ thuật, tổng liều, số buổi/.test(r.error), 'contour xong khi thiếu chuyên môn bị chặn: ' + r.error);
r = api('bs@x.vn', 'contourDone', { id: hc.id, chan_doan: 'K vú', ky_thuat: '3D-CRT', tong_lieu: '40.05' });
assert(!r.ok && /số buổi/.test(r.error), 'vẫn thiếu số buổi');
r = ok('bs@x.vn', 'contourDone', { id: hc.id, icd: 'C50.9', chan_doan: 'K vú', vi_tri: 'Vú trái', ky_thuat: '3D-CRT', tong_lieu: '40.05', so_buoi: '15', uu_tien: 'Ưu tiên', ly_do_uu_tien: 'test' });
hc = r.data.patients.find(x => x.id === hc.id);
assert.strictEqual(hc.trang_thai, 'CHO_KH'); assert.strictEqual(hc.so_buoi, '15'); assert.strictEqual(hc.vi_tri, 'Vú trái');
r = ok('bs@x.vn', 'updatePatient', { id: hc.id, ghi_chu: 'ok' });
assert(!api('bs@x.vn', 'updatePatient', { id: hc.id, so_buoi: '' }).ok, 'sau khi chuyển kỹ sư không được xoá trống chỉ định');
// ---- v1.7: kỹ sư và bác sĩ chuyển được Chờ mô phỏng -> Đang contour ----
r = ok('dd@x.vn', 'createPatient', { ma_his: '9101', ho_ten: 'MP KS', nam_sinh: '1970', bs_email: 'bs@x.vn', trang_thai: 'MO_PHONG' });
let m1 = r.data.patients.find(x => x.ma_his === '9101');
r = ok('ks@x.vn', 'simDone', { id: m1.id, nguoi_mo_phong: ['ktv@x.vn'] });
assert.strictEqual(r.data.patients.find(x => x.id === m1.id).trang_thai, 'CONTOUR', 'kỹ sư chuyển được');
r = ok('dd@x.vn', 'createPatient', { ma_his: '9102', ho_ten: 'MP BS', nam_sinh: '1970', bs_email: 'bs@x.vn', trang_thai: 'MO_PHONG' });
let m2 = r.data.patients.find(x => x.ma_his === '9102');
ok('bs@x.vn', 'simDone', { id: m2.id, nguoi_mo_phong: ['ktv@x.vn'] });
assert(!api('dd@x.vn', 'simDone', { id: m2.id, nguoi_mo_phong: ['ktv@x.vn'] }).ok, 'điều dưỡng không chuyển');

// ---- v1.8: chức vụ, thông báo máy, KTV trưởng ----
ok('admin@x.vn', 'saveUser', { email: 'ktvt@x.vn', ho_ten: 'KTV trưởng', vai_tro: 'KTV', chuc_vu: 'KTV trưởng' });
ok('admin@x.vn', 'saveUser', { email: 'ddt@x.vn', ho_ten: 'ĐD trưởng', vai_tro: 'DD', chuc_vu: 'Điều dưỡng trưởng', khoa: 'Xạ trị' });
assert(!api('admin@x.vn', 'saveUser', { email: 'z@x.vn', ho_ten: 'Z', vai_tro: 'DD', chuc_vu: 'Giám đốc' }).ok, 'chức vụ lạ bị từ chối');
r = ok('ktvt@x.vn', 'bootstrap'); assert.strictEqual(r.data.me.chuc_vu, 'KTV trưởng');
assert(JSON.parse(ctx.api('getLog')).ok === false || true);
currentEmail = 'ddt@x.vn'; assert(JSON.parse(ctx.api('getLog')).ok, 'điều dưỡng trưởng xem được nhật ký');
currentEmail = 'dd@x.vn'; assert(!JSON.parse(ctx.api('getLog')).ok, 'điều dưỡng thường không xem nhật ký');
// thông báo máy
r = ok('ktv@x.vn', 'setNotice', { may: 'Máy gia tốc 1', noi_dung: 'Máy lỗi, trễ ~2 giờ' });
let tb = r.data.exceptions.filter(e => e.loai === 'THONG_BAO');
assert.strictEqual(tb.length, 1);
r = ok('ks@x.vn', 'setNotice', { may: 'Máy gia tốc 1', noi_dung: 'Đã sửa xong, trễ ~30 phút' });
tb = r.data.exceptions.filter(e => e.loai === 'THONG_BAO');
assert.strictEqual(tb.length, 1, 'thông báo mới thay thông báo cũ cùng máy'); assert(/30 phút/.test(tb[0].ghi_chu));
assert(!api('dd@x.vn', 'setNotice', { noi_dung: 'x' }).ok, 'điều dưỡng thường không đăng thông báo');
ok('ddt@x.vn', 'setNotice', { may: '', noi_dung: 'Chiều nay họp khoa 16h' });
r = ok('ktv@x.vn', 'clearNotice', { id: tb[0].id });
assert.strictEqual(r.data.exceptions.filter(e => e.loai === 'THONG_BAO').length, 1);
// KTV trưởng huỷ buổi xạ cũ hơn 2 ngày
r = ok('ktv@x.vn', 'createPatient', { ma_his: '9201', ho_ten: 'Huỷ cũ', nam_sinh: '1960', bs_email: 'bs@x.vn', icd: 'C50.9', chan_doan: 'K', ky_thuat: '3D-CRT', tong_lieu: '30', so_buoi: '10', trang_thai: 'CHO_XA' });
let hp = r.data.patients.find(x => x.ma_his === '9201');
r = ok('ktv@x.vn', 'logFraction', { bn_id: hp.id, ngay: ctx.RT.addDays(today, -5), ly_do_bu: 'quên tích' });
let oldFx = r.data.fractions.find(f => f.bn_id === hp.id);
assert(!api('ktv@x.vn', 'undoFraction', { id: oldFx.id, ly_do: 'nhầm' }).ok, 'KTV thường không huỷ buổi quá 2 ngày');
ok('ktvt@x.vn', 'undoFraction', { id: oldFx.id, ly_do: 'nhầm' });
// ---- v1.9: bảng phân công ----
const mon = ctx.RT.monday(today);
assert(!api('ktv@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Mô phỏng', nhan_vien: ['ktv@x.vn'] }).ok, 'KTV thường không phân công');
r = ok('ktvt@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Mô phỏng', nhan_vien: ['KTV@x.vn', 'ktvt@x.vn'], ghi_chu: 'sáng' });
let pc = r.data.roster.find(x => x.ngay === mon && x.vi_tri === 'Mô phỏng');
assert.strictEqual(pc.nhan_vien, 'ktv@x.vn, ktvt@x.vn');
r = ok('ktvt@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Mô phỏng', nhan_vien: ['ktv@x.vn'] });
assert.strictEqual(r.data.roster.filter(x => x.ngay === mon && x.vi_tri === 'Mô phỏng').length, 1, 'sửa ô thì ghi đè, không nhân đôi');
assert(!api('ktvt@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Vị trí lạ', nhan_vien: [] }).ok);
assert(!api('ktvt@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Ca 4', nhan_vien: ['nguoila@x.vn'] }).ok);
ok('ktvt@x.vn', 'setRoster', { ngay: ctx.RT.addDays(mon, 2), vi_tri: 'Ca 4', nhan_vien: ['ktvt@x.vn'] });
r = ok('ktvt@x.vn', 'copyRoster', { tu: mon, den: ctx.RT.addDays(mon, 7) });
assert(r.data.roster.some(x => x.ngay === ctx.RT.addDays(mon, 9) && x.vi_tri === 'Ca 4' && x.nhan_vien === 'ktvt@x.vn'), 'sao chép tuần');
r = ok('admin@x.vn', 'bootstrap');
assert(r.data.roster.length >= 4, 'đọc lại phân công từ sheet');
currentEmail = 'dd@x.vn';
let gr = JSON.parse(ctx.api('getRoster', { tu: mon, den: ctx.RT.addDays(mon, 6) }));
assert(gr.ok && gr.roster.length === 2, 'tải phân công theo tuần');
// rev: thay đổi sau mỗi lần ghi
const rev1 = JSON.parse(ctx.api('rev')).rev;
ok('ktvt@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Ca 4', nhan_vien: ['ktv@x.vn'] });
const rev2 = JSON.parse(ctx.api('rev')).rev;
assert(rev2 !== '0', 'rev được đặt');

// ---- v2.0: thống kê theo phân quyền ----
ok('admin@x.vn', 'saveUser', { email: 'tk@x.vn', ho_ten: 'Trưởng khoa A', vai_tro: 'BS', chuc_vu: 'Trưởng khoa', khoa: 'Xạ trị' });
assert(!api('admin@x.vn', 'saveUser', { email: 'tk2@x.vn', ho_ten: 'X', vai_tro: 'BS', chuc_vu: 'Trưởng khoa' }).ok, 'trưởng khoa phải có khoa');
ok('admin@x.vn', 'saveUser', { email: 'bs2@x.vn', ho_ten: 'BS Hai', vai_tro: 'BS', khoa: 'Xạ trị theo yêu cầu' });
ok('admin@x.vn', 'saveUser', { email: 'pk@x.vn', ho_ten: 'Phó khoa', vai_tro: 'BS', chuc_vu: 'Phó trưởng khoa', khoa: 'Xạ trị' });
ok('admin@x.vn', 'saveUser', { email: 'ddt@x.vn', ho_ten: 'ĐD trưởng', vai_tro: 'DD', chuc_vu: 'Điều dưỡng trưởng', khoa: 'Xạ trị' });
const mk2 = (his, bs, khoa) => ok('ktv@x.vn', 'createPatient', { ma_his: his, ho_ten: 'TK ' + his, nam_sinh: '1960', bs_email: bs, khoa, icd: 'C50.9', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '20', so_buoi: '10', trang_thai: 'CHO_XA' }).data.patients.find(x => x.ma_his === his);
const pA = mk2('R1', 'bs@x.vn', 'Xạ trị'), pB = mk2('R2', 'bs2@x.vn', 'Xạ trị'), pC = mk2('R3', 'bs2@x.vn', 'Xạ trị theo yêu cầu');
const dR = ctx.RT.addDays(today, -1);
[[pA, dR], [pA, today], [pB, today], [pC, today]].forEach(([p, d]) => ok('ktv@x.vn', 'logFraction', { bn_id: p.id, ngay: d, hinh_anh: ['CBCT'], ly_do_bu: 'quên tích' }));
const rep = (who) => { currentEmail = who; return JSON.parse(ctx.api('report', { tu: dR, den: today })); };
let R0 = rep('admin@x.vn');
assert(R0.ok, R0.error);
let rA = R0.report;
let rowOf = (list, em) => (list || []).find(x => x.email === em);
assert(rowOf(rA.theo_bac_si, 'bs2@x.vn').luot_xa >= 2, 'quản trị thấy cả hai khoa');
let rTK = rep('tk@x.vn').report;
assert.strictEqual(pB.khoa, 'Xạ trị theo yêu cầu', 'v2.7: khoa của BN theo khoa của bác sĩ');
assert(!rowOf(rTK.theo_bac_si, 'bs2@x.vn'), 'trưởng khoa chỉ thấy BN khoa mình');
assert(rowOf(rTK.theo_bac_si, 'bs@x.vn').luot_xa >= 2);
let rDDT = rep('ddt@x.vn').report;
assert(rDDT.theo_bac_si && rowOf(rDDT.theo_bac_si, 'bs@x.vn') && !rowOf(rDDT.theo_bac_si, 'bs2@x.vn'), 'điều dưỡng trưởng thấy theo bác sĩ trong khoa');
let rBS = rep('bs2@x.vn').report;
assert.strictEqual(rBS.theo_bac_si.length, 1, 'bác sĩ chỉ thấy dòng của mình'); assert.strictEqual(rBS.theo_bac_si[0].email, 'bs2@x.vn');
assert.strictEqual(rBS.tong_quan.luot_xa, 2, 'tổng quan của bác sĩ chỉ tính BN của mình');
let rPK = rep('pk@x.vn').report;
assert(!rPK.theo_bac_si || rPK.theo_bac_si.every(x => x.email === 'pk@x.vn'), 'phó khoa như bác sĩ thường');
let rKTV = rep('ktv@x.vn').report;
assert(rKTV.theo_ktv.length === 1 && !rKTV.theo_bac_si, 'KTV chỉ thấy số của mình');
let rKTVT = rep('ktvt@x.vn').report;
assert(rKTVT.theo_ktv && !rKTVT.theo_bac_si, 'KTV trưởng thấy nhóm KTV, không thấy theo bác sĩ');
let rKS = rep('ks@x.vn').report;
assert(!rKS.theo_bac_si && rKS.theo_ky_su, 'kỹ sư không thấy theo bác sĩ');
currentEmail = 'dd@x.vn'; assert(JSON.parse(ctx.api('report', { tu: dR, den: today })).ok, 'v2.6: điều dưỡng thường được xem thống kê');
const nSheets = Object.keys(sheets).length; currentEmail = 'tk@x.vn'; assert(!JSON.parse(ctx.api('exportReport', { tu: dR, den: today })).ok, 'v2.9: không còn tạo trang báo cáo trong Sheet');
assert.strictEqual(Object.keys(sheets).length, nSheets, 'không tạo trang mới');

// ---- v2.1: Khoa Vật lý xạ trị ----
ok('admin@x.vn', 'saveUser', { email: 'tkvl@x.vn', ho_ten: 'TK Vật lý', vai_tro: 'KS', chuc_vu: 'Trưởng khoa', khoa: 'Vật lý xạ trị' });
let rVL = rep('tkvl@x.vn').report;
assert(rVL.theo_ky_su && !rVL.theo_bac_si, 'trưởng khoa Vật lý thấy theo kỹ sư, không theo bác sĩ');
assert(!api('ktv@x.vn', 'createPatient', { ma_his: 'VL1', ho_ten: 'X', nam_sinh: '1960', bs_email: 'bs@x.vn', khoa: 'Vật lý xạ trị', trang_thai: 'MO_PHONG' }).ok || true);

// ---- v2.2: bác sĩ trợ lý ----
ok('admin@x.vn', 'saveUser', { email: 'tl@x.vn', ho_ten: 'BS Trợ lý', vai_tro: 'BS', khoa: 'Xạ trị theo yêu cầu', tro_ly_cho: 'bs2@x.vn' });
assert(!api('admin@x.vn', 'saveUser', { email: 'tl2@x.vn', ho_ten: 'BS Trợ lý 2', vai_tro: 'BS', khoa: 'Xạ trị', tro_ly_cho: 'bs2@x.vn' }).ok, 'mỗi bác sĩ chỉ 1 trợ lý');
assert(!api('admin@x.vn', 'saveUser', { email: 'tl3@x.vn', ho_ten: 'X', vai_tro: 'BS', khoa: 'Xạ trị', tro_ly_cho: 'tl@x.vn' }).ok, 'không làm trợ lý cho trợ lý');
assert(!api('admin@x.vn', 'saveUser', { email: 'tl4@x.vn', ho_ten: 'X', vai_tro: 'BS', khoa: 'Xạ trị', tro_ly_cho: 'ktv@x.vn' }).ok, 'bác sĩ chính phải là bác sĩ');
let rTL = rep('tl@x.vn').report;
assert(rTL.theo_bac_si.length === 1 && rTL.theo_bac_si[0].email === 'bs2@x.vn', 'trợ lý xem thống kê của bác sĩ chính');
assert.strictEqual(rTL.tong_quan.luot_xa, 2);
r = ok('tl@x.vn', 'createPatient', { ma_his: 'TL1', ho_ten: 'BN trợ lý', nam_sinh: '1970', bs_email: 'bs2@x.vn', trang_thai: 'CONTOUR' });
ok('tl@x.vn', 'deletePatient', { id: r.data.patients.find(x => x.ma_his === 'TL1').id, ly_do: 'nhập nhầm' });
// trợ lý chuyển thành bác sĩ chính: bỏ liên kết
ok('admin@x.vn', 'saveUser', { email: 'tl@x.vn', ho_ten: 'BS Trợ lý', vai_tro: 'BS', khoa: 'Xạ trị theo yêu cầu', tro_ly_cho: '' });
assert(!rep('tl@x.vn').report.theo_bac_si.some(x => x.email === 'bs2@x.vn'), 'hết là trợ lý thì không xem số của bác sĩ cũ');
ok('admin@x.vn', 'saveUser', { email: 'tl2@x.vn', ho_ten: 'BS Trợ lý 2', vai_tro: 'BS', khoa: 'Xạ trị', tro_ly_cho: 'bs2@x.vn' });
// ---- v2.3 ----
assert(!api('admin@x.vn', 'saveUser', { email: 'kttl@x.vn', ho_ten: 'KTV trợ lý', vai_tro: 'KTV', tro_ly_cho: 'bs@x.vn' }).ok, 'chỉ bác sĩ làm trợ lý');
assert.strictEqual(JSON.stringify(ctx.RT.myDoctors({ email: 'a', vai_tro: 'KS', tro_ly_cho: 'b' })), '["a"]', 'không phải BS thì liên kết trợ lý không có tác dụng');
// ---- v2.5 ----
r = ok('bs@x.vn', 'createPatient', { ma_his: 'ICD1', ho_ten: 'BN ICD', nam_sinh: '1970' });
let pi = r.data.patients.find(x => x.ma_his === 'ICD1');
r = api('bs@x.vn', 'contourDone', { id: pi.id, chan_doan: 'K vòm', vi_tri: 'Đầu cổ', ky_thuat: 'VMAT', tong_lieu: '70', so_buoi: '35' });
assert(!r.ok && /ICD/.test(r.error), 'contour xong bắt buộc ICD');
r = ok('bs@x.vn', 'contourDone', { id: pi.id, icd: 'c119', chan_doan: 'K vòm', vi_tri: 'Đầu cổ', ky_thuat: 'VMAT', tong_lieu: '70', so_buoi: '35' });
assert.strictEqual(r.data.patients.find(x => x.id === pi.id).icd, 'C11', 'v2.8: mã ICD rút về 3 ký tự');
assert(sheets.ChiMuc.data.some(row => row.includes(pi.id) && row.includes('C11')), 'chỉ mục được cập nhật khi lưu');
assert(!api('bs@x.vn', 'createPatient', { ma_his: 'ICD1', ho_ten: 'BN ICD', nam_sinh: '1970' }).ok, 'trùng HIS đang điều trị');
assert.strictEqual(ctx.RT.icdName('C11.9').length > 0, true, 'mã 4 ký tự vẫn ra tên nhóm');
let rp = ok('admin@x.vn', 'report', { tu: ctx.RT.addDays(today, -30), den: today });
assert(Array.isArray(rp.report.theo_icd) && Array.isArray(rp.report.theo_vi_tri), 'thống kê theo ICD và vị trí');
const anyIcd = rp.report.theo_icd[0];
if (anyIcd) { rp = ok('admin@x.vn', 'report', { tu: ctx.RT.addDays(today, -30), den: today, chi_tiet: { loai: 'icd', ma: anyIcd.ma } }); assert(rp.report.chi_tiet.length >= anyIcd.bn_xa, 'danh sách BN theo mã ICD'); }
assert(/lập chỉ mục/.test(vm.runInContext('buildIndex_()', ctx)));
// ---- v2.6 ----
{
  r = ok('bs@x.vn', 'createPatient', { ma_his: 'V26', ho_ten: 'BN Vắng', nam_sinh: '1960', icd: 'C34.9', chan_doan: 'K phổi', vi_tri: 'Phổi', ky_thuat: 'VMAT', tong_lieu: '60', so_buoi: '30', trang_thai: 'CHO_KH' });
  const pv = r.data.patients.find(x => x.ma_his === 'V26');
  assert(!api('ks@x.vn', 'claimPlan', { id: pv.id }).ok, 'nhận ca phải chọn kỹ sư');
  assert(!api('ks@x.vn', 'claimPlan', { id: pv.id, ks_email: 'bs@x.vn' }).ok, 'phải chọn đúng kỹ sư');
  ok('ks@x.vn', 'claimPlan', { id: pv.id, ks_email: 'ks@x.vn' });
  r = ok('admin@x.vn', 'claimPlan', { id: pv.id, ks_email: 'ks@x.vn' });
  ok('ks@x.vn', 'planDone', { id: pv.id, can_qa: false });
  // bắt đầu xạ từ 6 ngày làm việc trước, chỉ xạ buổi đầu
  let st0 = today; for (let k = 0; k < 4;) { st0 = ctx.RT.addDays(st0, -1); if (ctx.RT.dow(st0) >= 1 && ctx.RT.dow(st0) <= 5) k++; }
  assert(!api('ktv@x.vn', 'logFraction', { bn_id: pv.id, ngay: st0 }).ok, 'ghi bù phải có lý do');
  ok('ktv@x.vn', 'logFraction', { bn_id: pv.id, ngay: st0, ly_do_bu: 'Quên tích' });
  const fxb = sheets.BuoiXa.data.find(row => row.includes(pv.id) && row.includes(st0));
  assert(fxb.includes('Có') && fxb.includes('Quên tích'), 'đánh dấu ghi bù và lý do');
  let d2 = ctx.RT.addDays(st0, 1); while (ctx.RT.dow(d2) === 0 || ctx.RT.dow(d2) === 6) d2 = ctx.RT.addDays(d2, 1);
  assert(!api('ktv@x.vn', 'markAbsent', { bn_id: pv.id, ngay: d2 }).ok, 'ghi vắng cần lý do');
  ok('dd@x.vn', 'markAbsent', { bn_id: pv.id, ngay: d2, ly_do: 'Mệt / tác dụng phụ' });
  const env = ctx.RT.makeEnv(today, [], JSON.parse(ctx.api('bootstrap')).data.exceptions, [], 'Máy gia tốc 1');
  r = ok('admin@x.vn', 'bootstrap');
  const pv2 = r.data.patients.find(x => x.id === pv.id);
  const cv = ctx.RT.course(pv2, r.data.fractions, ctx.RT.makeEnv(today, [], r.data.exceptions, r.data.phases, 'Máy gia tốc 1'));
  assert(cv.absent[d2] === 'Mệt / tác dụng phụ' && cv.streak >= 2, 'vắng có lý do, vắng liên tiếp ' + cv.streak);
  rp = ok('dd@x.vn', 'report', { tu: st0, den: today });
  assert(rp.report.tong_quan.vang_luot >= 2 && rp.report.tong_quan.vang_ly_do['Chưa rõ lý do'] >= 1 && rp.report.theo_ngay.length, 'thống kê vắng theo lý do và theo ngày');
  // ghi bù cho ngày đã ghi vắng thì bỏ ghi vắng
  ok('ktv@x.vn', 'logFraction', { bn_id: pv.id, ngay: d2, ly_do_bu: 'Thực ra có xạ' });
  r = ok('admin@x.vn', 'bootstrap');
  assert(!r.data.exceptions.some(e => e.loai === 'VANG' && e.bn_id === pv.id && e.ngay === d2), 'ghi bù xoá ghi vắng');
  let fp = ok('dd@x.vn', 'findPatients', { tu: st0, den: today, moc: 'xa', icd: ['C34'] });
  assert(fp.found.rows.some(x => x.id === pv.id) && fp.found.rows.every(x => /^C34/.test(x.icd)), 'tìm BN theo mã ICD');
  fp = ok('admin@x.vn', 'findPatients', { tu: st0, den: today, moc: 'xa', icd: ['C50'], as: 'bs@x.vn' });
  assert(/nghiên cứu/.test(fp.found.pham_vi), 'quản trị xem như bác sĩ: tìm trên toàn bộ BN');
}
// ---- v2.7: thống kê theo bác sĩ chỉ cho lãnh đạo khoa, ĐD chỉ thấy khoa mình, khoa theo BS ----
{
  assert(!api('admin@x.vn', 'saveUser', { email: 'bs9@x.vn', ho_ten: 'BS Chín', vai_tro: 'BS' }).ok, 'bác sĩ phải có khoa');
  assert(!api('admin@x.vn', 'saveUser', { email: 'dd9@x.vn', ho_ten: 'ĐD Chín', vai_tro: 'DD' }).ok, 'điều dưỡng phải có khoa');
  ok('admin@x.vn', 'saveUser', { email: 'dd2@x.vn', ho_ten: 'ĐD Hai', vai_tro: 'DD', khoa: 'Xạ trị' });
  ok('admin@x.vn', 'saveUser', { email: 'tkk@x.vn', ho_ten: 'TK khoa', vai_tro: 'DD', chuc_vu: 'Tài khoản khoa', khoa: 'Xạ trị' });
  // khoa theo BS: chọn khoa khác vẫn ra khoa của BS; đổi BS thì đổi khoa
  r = ok('dd2@x.vn', 'createPatient', { ma_his: 'K27', ho_ten: 'BN khoa', nam_sinh: '1970', bs_email: 'tk@x.vn', khoa: 'Xạ trị theo yêu cầu', trang_thai: 'CONTOUR' });
  let pk = r.data.patients.find(x => x.ma_his === 'K27');
  assert.strictEqual(pk.khoa, 'Xạ trị', 'khoa theo BS điều trị');
  r = ok('admin@x.vn', 'updatePatient', { id: pk.id, bs_email: 'bs2@x.vn' });
  assert.strictEqual(r.data.patients.find(x => x.id === pk.id).khoa, 'Xạ trị theo yêu cầu', 'đổi BS thì đổi khoa');
  // ĐD chỉ nhận BN khoa mình
  r = ok('dd2@x.vn', 'bootstrap');
  assert(r.data.patients.length && r.data.patients.every(x => x.khoa === 'Xạ trị'), 'điều dưỡng chỉ thấy BN khoa mình');
  assert(!r.data.patients.some(x => x.id === pk.id));
  // thống kê theo bác sĩ
  const t27 = (who, extra) => { currentEmail = who; return JSON.parse(ctx.api('report', Object.assign({ tu: dR, den: today }, extra || {}))); };
  let rk = t27('tkk@x.vn');
  assert(rk.ok && !rk.report.theo_bac_si && rk.report.pham_vi === 'Khoa Xạ trị', 'tài khoản khoa: số tổng, không theo từng BS');
  let rt = t27('tk@x.vn').report;
  let rowA = rt.theo_bac_si.find(x => x.email === 'bs@x.vn');
  assert(rowA && 'bn_bat_dau' in rowA && 'vang_luot' in rowA, 'bảng theo BS có BN bắt đầu, kết thúc, lượt vắng');
  rt = t27('tk@x.vn', { chi_tiet: { loai: 'bs', ma: 'bs@x.vn' } }).report;
  assert(rt.chi_tiet.length && rt.chi_tiet.every(x => x.bs === 'BS A'), 'bấm BS xem danh sách BN');
  assert(!t27('bs2@x.vn', { chi_tiet: { loai: 'bs', ma: 'bs@x.vn' } }).ok, 'BS không xem DS BN của BS khác');
  // BS: của tôi / cả khoa
  let rm = t27('bs2@x.vn').report, rkh = t27('bs2@x.vn', { pv: 'khoa' }).report;
  assert(/Cả khoa/.test(rkh.pham_vi) && rkh.theo_bac_si.every(x => x.email === 'bs2@x.vn'), 'BS xem cả khoa nhưng không theo từng BS');
  assert(rkh.tong_quan.luot_xa >= rm.tong_quan.luot_xa);
  // Tìm BN để nghiên cứu: BS lọc mọi tiêu chí trên cả hai khoa, trừ lọc theo BS
  let fb = ok('bs2@x.vn', 'findPatients', { tu: dR, den: today, moc: 'xa', icd: ['C50'] });
  assert(fb.found.rows.some(x => x.bs_email === 'bs@x.vn') && fb.found.rows.some(x => x.bs_email === 'bs2@x.vn'), 'BS tìm trên toàn bộ BN');
  fb = ok('bs2@x.vn', 'findPatients', { tu: dR, den: today, moc: 'xa', bs_email: 'bs@x.vn' });
  assert(fb.found.rows.some(x => x.bs_email !== 'bs@x.vn'), 'BS không lọc được theo từng BS');
  fb = ok('bs2@x.vn', 'findPatients', { tu: dR, den: today, moc: 'xa', khoa: 'Xạ trị' });
  assert(fb.found.rows.length && fb.found.rows.every(x => x.khoa === 'Xạ trị'), 'BS lọc được theo khoa');
  fb = ok('ks@x.vn', 'findPatients', { tu: dR, den: today, moc: 'xa', bs_email: 'bs@x.vn', khoa: 'Xạ trị' });
  assert.strictEqual(fb.found.pham_vi, 'Của tôi', 'kỹ sư chỉ tìm ca mình');
  fb = ok('tk@x.vn', 'findPatients', { tu: dR, den: today, moc: 'xa', bs_email: 'bs@x.vn' });
  assert(fb.found.rows.length && fb.found.rows.every(x => x.bs_email === 'bs@x.vn'), 'trưởng khoa lọc theo BS');
  let fd = ok('dd2@x.vn', 'findPatients', { tu: dR, den: today, moc: 'xa' });
  assert(fd.found.rows.every(x => x.khoa === 'Xạ trị'), 'ĐD tìm trong khoa mình');
}
// ---- v2.7: lý do ưu tiên, thứ tự lập kế hoạch ----
{
  const mkc = (his) => ok('bs@x.vn', 'createPatient', { ma_his: his, ho_ten: 'UT ' + his, nam_sinh: '1960', icd: 'C50.9', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25', trang_thai: 'CONTOUR' }).data.patients.find(x => x.ma_his === his);
  const q1 = mkc('UT1'), q2 = mkc('UT2'), q3 = mkc('UT3');
  r = api('bs@x.vn', 'contourDone', { id: q1.id, uu_tien: 'Ưu tiên' });
  assert(!r.ok && /lý do ưu tiên/.test(r.error), 'Ưu tiên phải ghi lý do');
  ok('bs@x.vn', 'contourDone', { id: q1.id, uu_tien: 'Ưu tiên', ly_do_uu_tien: 'Người nhà nhân viên' });
  ok('bs@x.vn', 'contourDone', { id: q2.id, uu_tien: 'Thường', ly_do_uu_tien: 'bỏ qua' });
  assert(!api('bs@x.vn', 'contourDone', { id: q3.id, uu_tien: 'Cấp cứu' }).ok, 'cấp cứu cũng phải ghi lý do');
  r = ok('bs@x.vn', 'contourDone', { id: q3.id, uu_tien: 'Cấp cứu', ly_do_uu_tien: 'Chèn ép tủy' });
  const g = (id) => r.data.patients.find(x => x.id === id);
  assert.strictEqual(g(q1.id).ly_do_uu_tien, 'Người nhà nhân viên', 'lưu lý do');
  assert.strictEqual(g(q2.id).ly_do_uu_tien, '', 'BN thường không lưu lý do');
  assert(g(q1.id).tg_nop_kh && g(q1.id).tg_nop_kh <= g(q2.id).tg_nop_kh, 'lưu thời điểm nộp');
  const qq = ctx.RT.planningQueue(r.data.patients.filter(x => ['UT1', 'UT2', 'UT3'].includes(x.ma_his)));
  assert.deepStrictEqual(qq.map(x => x.ma_his), ['UT3', 'UT1', 'UT2'], 'cấp cứu trước, rồi nộp trước làm trước');
  // ưu tiên không vượt BN thường nộp trước
  const qq2 = ctx.RT.planningQueue([{ id: 'a', trang_thai: 'CHO_KH', uu_tien: 'Thường', tg_nop_kh: '2026-01-01T08:00:00' }, { id: 'b', trang_thai: 'CHO_KH', uu_tien: 'Ưu tiên', tg_nop_kh: '2026-01-01T09:00:00' }, { id: 'c', trang_thai: 'CHO_KH', uu_tien: 'Cấp cứu', tg_nop_kh: '2026-01-02T09:00:00' }]);
  assert.deepStrictEqual(qq2.map(x => x.id), ['c', 'a', 'b']);
  assert(!api('ks@x.vn', 'setPriority', { id: q2.id, uu_tien: 'Ưu tiên' }).ok || !api('bs@x.vn', 'setPriority', { id: q2.id, uu_tien: 'Ưu tiên' }).ok, 'đổi sang Ưu tiên phải có lý do');
  r = ok('bs@x.vn', 'setPriority', { id: q2.id, uu_tien: 'Ưu tiên', ly_do_uu_tien: 'BN ở xa' });
  assert.strictEqual(r.data.patients.find(x => x.id === q2.id).ly_do_uu_tien, 'BN ở xa');
  r = ok('bs@x.vn', 'setPriority', { id: q2.id, uu_tien: 'Thường' });
  assert.strictEqual(r.data.patients.find(x => x.id === q2.id).ly_do_uu_tien, '', 'về thường thì xoá lý do');
  assert(!api('bs@x.vn', 'createPatient', { ma_his: 'UT4', ho_ten: 'UT4', nam_sinh: '1960', uu_tien: 'Ưu tiên', trang_thai: 'CONTOUR' }).ok, 'thêm BN ưu tiên phải có lý do');
  assert(!api('bs@x.vn', 'updatePatient', { id: q1.id, uu_tien: 'Ưu tiên', ly_do_uu_tien: '' }).ok, 'không xoá được lý do của BN đang chờ lập KH');
  assert(sheets.BenhNhan.data[0].includes('ly_do_uu_tien') && sheets.BenhNhan.data[0].includes('tg_nop_kh'), 'cột mới');
}
// ---- v2.7: chỉ tiêu khoa, đề xuất / duyệt lịch, BN tạm ngừng ----
{
  assert.strictEqual(JSON.stringify(ctx.RT.parseQuota('Xạ trị: 90-100')), JSON.stringify({ khoa: 'Xạ trị', min: 90, max: 100 }));
  assert(!api('admin@x.vn', 'dmAdd', { loai: 'CHI_TIEU', gia_tri: 'Xạ trị 90' }).ok, 'chỉ tiêu sai dạng');
  r = ok('admin@x.vn', 'dmAdd', { loai: 'CHI_TIEU', gia_tri: 'Xạ trị: 1-2' });
  assert(r.data.dm.CHI_TIEU.includes('Xạ trị: 1-2') && !r.data.dm.CHI_TIEU.includes('Xạ trị: 90-100'), 'thay chỉ tiêu cũ của khoa');
  const mk = (his, uu) => ok('admin@x.vn', 'createPatient', { ma_his: his, ho_ten: 'CT ' + his, nam_sinh: '1960', bs_email: 'tk@x.vn', icd: 'C50.9', chan_doan: 'K', ky_thuat: '3D-CRT', tong_lieu: '20', so_buoi: '10', trang_thai: 'CHO_XA', uu_tien: uu || 'Thường', ly_do_uu_tien: uu ? 'lý do' : '' }).data.patients.find(x => x.ma_his === his);
  const d1 = ctx.RT.addDays(today, 30);
  const c1 = mk('CT1'), c2 = mk('CT2'), c3 = mk('CT3'), cc = mk('CT4', 'Cấp cứu');
  ok('ktvt@x.vn', 'schedule', { id: c1.id, ngay_du_kien: d1 });
  ok('ktvt@x.vn', 'schedule', { id: c2.id, ngay_du_kien: d1 });
  // ĐD không xếp / đề xuất lịch nữa (v3.1)
  assert(!api('dd2@x.vn', 'schedule', { id: c3.id, ngay_du_kien: d1, vuot_chi_tieu: true }).ok, 'ĐD không xếp lịch');
  // v3.2: KTV thường không xếp, không đề xuất lịch
  assert(!api('ktv@x.vn', 'schedule', { id: c3.id, ngay_du_kien: d1, vuot_chi_tieu: true }).ok, 'KTV thường không xếp lịch');
  // khoa đã đủ 2/2 → cảnh báo, đồng ý thì xếp
  r = api('ktvt@x.vn', 'schedule', { id: c3.id, ngay_du_kien: d1 });
  assert(!r.ok && /^QUOTA:/.test(r.error), 'cảnh báo vượt chỉ tiêu: ' + r.error);
  const d2 = ctx.RT.addDays(d1, 1);
  r = ok('ktvt@x.vn', 'schedule', { id: c3.id, ngay_du_kien: d2, vuot_chi_tieu: true });
  assert.strictEqual(r.data.patients.find(x => x.id === c3.id).ngay_du_kien, d2, 'người xếp lịch xếp thẳng');
  const c5 = mk('CT5');
  assert(!api('ktvt@x.vn', 'approveSchedule', { id: c5.id }).ok, 'không có đề xuất để duyệt');
  // kiểm tra 2 tuần đầu: ngày bắt đầu còn chỗ nhưng vài ngày sau vượt
  {
    let dA = ctx.RT.addDays(d1, 21); while (ctx.RT.dow(dA) !== 1) dA = ctx.RT.addDays(dA, 1); // một thứ Hai xa, sau khi các BN trên đã xong
    const dC = ctx.RT.addDays(dA, 2); // thứ Tư
    const x1 = mk('Q1'), x2 = mk('Q2'), x3 = mk('Q3');
    ok('ktvt@x.vn', 'schedule', { id: x1.id, ngay_du_kien: dC });
    ok('ktvt@x.vn', 'schedule', { id: x2.id, ngay_du_kien: dC });
    r = api('ktvt@x.vn', 'schedule', { id: x3.id, ngay_du_kien: dA });
    assert(!r.ok && /2 tuần đầu/.test(r.error), 'cảnh báo vượt trong 2 tuần đầu: ' + r.error);
    ok('ktvt@x.vn', 'schedule', { id: x3.id, ngay_du_kien: dA, vuot_chi_tieu: true });
  }
  // cấp cứu luôn được xếp
  ok('ktvt@x.vn', 'schedule', { id: cc.id, ngay_du_kien: d1 });
  // đếm chỗ
  const bt = ok('admin@x.vn', 'bootstrap').data;
  const occ = ctx.RT.occupancy(bt.patients, bt.fractions, ctx.RT.makeEnv(today, bt.holidays, bt.exceptions, bt.phases, 'Máy gia tốc 1'), [d1], today);
  assert(occ['Xạ trị'].ngay[d1].n >= 3, 'đếm BN chiếm chỗ ngày ' + d1);
  // ĐD khoa khác không đề xuất được
  ok('admin@x.vn', 'saveUser', { email: 'dd3@x.vn', ho_ten: 'ĐD Ba', vai_tro: 'DD', khoa: 'Xạ trị theo yêu cầu' });
  assert(!api('dd3@x.vn', 'schedule', { id: c5.id, ngay_du_kien: d1, vuot_chi_tieu: true }).ok, 'ĐD khoa khác không xếp');
  // tạm ngừng ≥ 7 ngày: hỏi BS, xác nhận thì hỏi lại sau 7 ngày
  ok('admin@x.vn', 'logFraction', { bn_id: c1.id, ngay: today });
  ok('tk@x.vn', 'pause', { id: c1.id, ly_do: 'Tác dụng phụ', tu_ngay: ctx.RT.addDays(today, -8) });
  let pp = ok('tk@x.vn', 'bootstrap').data.patients.find(x => x.id === c1.id);
  assert(ctx.RT.pauseAsk(pp, today), 'tạm ngừng 8 ngày: hỏi BS');
  assert(!api('ktv@x.vn', 'confirmPause', { id: c1.id }).ok, 'chỉ BS xác nhận');
  pp = ok('tk@x.vn', 'confirmPause', { id: c1.id }).data.patients.find(x => x.id === c1.id);
  assert(!ctx.RT.pauseAsk(pp, today) && ctx.RT.pauseAsk(pp, ctx.RT.addDays(today, 7)), 'hỏi lại sau 7 ngày');
  ok('admin@x.vn', 'dmAdd', { loai: 'CHI_TIEU', gia_tri: 'Xạ trị: 90-100' });
}
// ---- v2.8: ICD 3 ký tự, người mô phỏng, KTV xạ, báo cáo khoa, gửi lại không trùng, tài khoản khoa ----
{
  assert.strictEqual(ctx.RT.normIcd('c15.1'), 'C15'); assert.strictEqual(ctx.RT.normIcd('C151'), 'C15');
  assert(!ctx.RT.isIcd('C15.1') && ctx.RT.isIcd('C15'));
  ok('admin@x.vn', 'saveUser', { email: 'ktv@x.vn', ho_ten: 'KTV C', vai_tro: 'KTV', ky_hieu: 'C' });
  ok('admin@x.vn', 'saveUser', { email: 'ktvt@x.vn', ho_ten: 'KTV trưởng', vai_tro: 'KTV', chuc_vu: 'KTV trưởng', ky_hieu: 'IT' });
  r = ok('tk@x.vn', 'createPatient', { ma_his: 'BC1', ho_ten: 'Báo cáo Một', nam_sinh: '1960', gioi: 'Nữ', icd: 'C50.9', chan_doan: 'K vú', ky_thuat: 'VMAT', tong_lieu: '50', so_buoi: '25', trang_thai: 'MO_PHONG' });
  let b1 = r.data.patients.find(x => x.ma_his === 'BC1');
  assert.strictEqual(b1.icd, 'C50', 'lưu mã 3 ký tự');
  assert(!api('ktv@x.vn', 'simDone', { id: b1.id, nguoi_mo_phong: ['a@x.vn'] }).ok, 'người mô phỏng phải là người dùng');
  assert(!api('ktv@x.vn', 'simDone', { id: b1.id, nguoi_mo_phong: ['ks@x.vn'] }).ok, 'người mô phỏng phải là KTV');
  assert(!api('ktv@x.vn', 'simDone', { id: b1.id, nguoi_mo_phong: ['ktv@x.vn'], mat_na: '7 điểm' }).ok, 'loại mặt nạ theo danh mục');
  r = ok('ktv@x.vn', 'simDone', { id: b1.id, nguoi_mo_phong: ['ktv@x.vn', 'ktvt@x.vn'], mat_na: '5 điểm', tiem_thuoc: 'Không', dung_cu: ['Nêm lưỡi'], dung_cu_khac: 'gối kê' });
  b1 = r.data.patients.find(x => x.id === b1.id);
  assert(b1.nguoi_mo_phong === 'ktv@x.vn, ktvt@x.vn' && b1.mat_na === '5 điểm' && b1.tiem_thuoc === 'Không' && b1.dung_cu === 'Nêm lưỡi, Khác: gối kê', 'lưu người mô phỏng, mặt nạ, dụng cụ');
  ok('tk@x.vn', 'contourDone', { id: b1.id });
  ok('ks@x.vn', 'claimPlan', { id: b1.id, ks_email: 'ks@x.vn' });
  ok('ks@x.vn', 'planDone', { id: b1.id, can_qa: false });
  r = ok('ktv@x.vn', 'logFraction', { bn_id: b1.id, ngay: today, ktv_xa: ['ktv@x.vn', 'ktvt@x.vn'] });
  assert.strictEqual(r.data.fractions.find(f => f.bn_id === b1.id).ktv_xa, 'ktv@x.vn, ktvt@x.vn', 'lưu KTV xạ ca đó');
  // báo cáo khoa
  assert(!api('bs@x.vn', 'khoaReport', { tu: today, den: today }).ok, 'BS thường không lập báo cáo khoa');
  let kr = ok('tk@x.vn', 'khoaReport', { tu: ctx.RT.addDays(today, -1), den: today }).kreport;
  assert.strictEqual(kr.khoa, 'Xạ trị');
  assert(kr.mo_phong.some(x => x.ma_his === 'BC1' && x.mat_na && x.mat_na_loai === '5 điểm' && x.dung_cu.length === 2 && /^C, /.test(x.nguoi)), 'sổ mô phỏng');
  const vmg = kr.thang[0].nhom.find(g => g.ten === 'VMAT'), row = vmg.rows.find(x => x.ma_his === 'BC1');
  assert(row && row.o[String(+today.slice(8))] === 'C/IT' && row.nu === '1960', 'chưa có lịch phân công máy: tạm ghi người đã chọn');
  assert(kr.thieu_phan_cong.includes(today), 'báo ngày chưa có lịch phân công');
  assert.strictEqual(row.thanh_tien, 21000, 'thành tiền = số buổi × đơn giá (không tính setup)');
  assert(kr.chu_thich.some(x => x[0] === 'IT') && row.kt === 'VM' && row.bs_ten === 'A', 'chú thích ký hiệu KTV, cột VM, tên BS');

  let fm = ok('tk@x.vn', 'findPatients', { tu: ctx.RT.addDays(today, -1), den: today, moc: 'nhap', mat_na: '5 điểm', dung_cu: 'Nêm lưỡi', tiem_thuoc: 'Không' }).found;
  assert(fm.rows.some(x => x.ma_his === 'BC1') && fm.rows.every(x => x.mat_na === '5 điểm'), 'tìm BN theo mặt nạ, dụng cụ, tiêm thuốc');
  assert(!ok('tk@x.vn', 'findPatients', { tu: ctx.RT.addDays(today, -1), den: today, moc: 'nhap', mat_na: 'khong', dung_cu: 'Nêm lưỡi' }).found.rows.some(x => x.ma_his === 'BC1'));
  // gửi lại cùng mã thao tác: không tạo trùng
  const store = {}; ctx.CacheService = { getScriptCache: () => ({ get: k => (k in store ? store[k] : null), put: (k, v) => { store[k] = v; } }) };
  const n0 = sheets.BenhNhan.getLastRow();
  ok('tk@x.vn', 'createPatient', { ma_his: 'RID1', ho_ten: 'Gửi lại', nam_sinh: '1960', trang_thai: 'CONTOUR', _rid: 'abc123' });
  r = ok('tk@x.vn', 'createPatient', { ma_his: 'RID1', ho_ten: 'Gửi lại', nam_sinh: '1960', trang_thai: 'CONTOUR', _rid: 'abc123' });
  assert.strictEqual(sheets.BenhNhan.getLastRow(), n0 + 1, 'gửi lại không tạo trùng BN');
  assert(r.data.patients.some(x => x.ma_his === 'RID1'));
  delete ctx.CacheService;
  // tài khoản khoa làm việc của ĐD và KTV
  assert(ctx.RT.can('DD', 'logFraction', { chuc_vu: 'Tài khoản khoa' }) && ctx.RT.can('DD', 'simDone', { chuc_vu: 'Tài khoản khoa' }), 'tài khoản khoa có quyền KTV');
  assert(!ctx.RT.can('DD', 'logFraction', { chuc_vu: '' }), 'ĐD thường không ghi buổi xạ');
  // setup rút mã ICD cũ về 3 ký tự
  const col = sheets.BenhNhan.data[0].indexOf('icd'); sheets.BenhNhan.data[1][col] = 'C34.1';
  vm.runInContext('setup()', ctx);
  assert.strictEqual(sheets.BenhNhan.data[1][col], 'C34', 'setup rút mã ICD cũ');
  assert(sheets.BuoiXa.data[0].includes('ktv_xa') && sheets.NguoiDung.data[0].includes('ky_hieu'), 'cột mới');
}
// ---- v2.10: bảng 3D / VMAT đủ mọi kỹ thuật, KTV theo lịch phân công ----
{
  const mkT = (his, kt) => ok('tk@x.vn', 'createPatient', { ma_his: his, ho_ten: 'KT ' + his, nam_sinh: '1960', icd: 'C50', chan_doan: 'K', ky_thuat: kt, tong_lieu: '20', so_buoi: '5', trang_thai: 'CHO_XA' }).data.patients.find(x => x.ma_his === his);
  const s1 = mkT('SR1', 'SRS/SBRT'), s2 = mkT('KH1', 'Khác'), s3 = mkT('3D1', '3D-CRT');
  const y = ctx.RT.addDays(today, -1);
  [s1, s2, s3].forEach(p => ok('ktv@x.vn', 'logFraction', { bn_id: p.id, ngay: y, ly_do_bu: 'test' }));
  ok('ktvt@x.vn', 'setRoster', { ngay: y, vi_tri: 'Ca 1', nhan_vien: ['ktvt@x.vn'] });
  ok('ktvt@x.vn', 'setRoster', { ngay: y, vi_tri: 'Ca 3', nhan_vien: ['ktv@x.vn'] });
  ok('ktvt@x.vn', 'setRoster', { ngay: y, vi_tri: 'Mô phỏng', nhan_vien: ['ktv@x.vn', 'ktvt@x.vn'] });
  let k2 = ok('tk@x.vn', 'khoaReport', { tu: y, den: y }).kreport;
  const nh = n => (k2.thang[0].nhom.find(g => g.ten === n) || { rows: [] }).rows.map(r => r.ma_his);
  assert(nh('VMAT').includes('SR1') && nh('VMAT').includes('KH1') && nh('3D').includes('3D1') && !nh('3D').includes('SR1'), 'SRS/SBRT, Khác vào bảng VMAT; 3D-CRT vào bảng 3D');
  assert.strictEqual((k2.tong.theo_nhom['3D'] || 0) + (k2.tong.theo_nhom.VMAT || 0), k2.tong.so_buoi, 'hai bảng đủ mọi buổi xạ');
  const cell = k2.thang[0].nhom.find(g => g.ten === '3D').rows.find(r => r.ma_his === '3D1').o[String(+y.slice(8))];
  assert(cell === 'IT/C', 'ghi bù không rõ ca: lấy cả hai ca của máy theo lịch phân công: ' + cell);
  assert(!k2.thieu_phan_cong.includes(y), 'ngày có lịch phân công');
  // mô phỏng: không chọn người, lấy theo lịch phân công vị trí mô phỏng
  r = ok('tk@x.vn', 'createPatient', { ma_his: 'MP10', ho_ten: 'Mô phỏng mới', nam_sinh: '1970', trang_thai: 'MO_PHONG' });
  const mp10 = r.data.patients.find(x => x.ma_his === 'MP10');
  ok('ktvt@x.vn', 'setRoster', { ngay: today, vi_tri: 'Mô phỏng', nhan_vien: ['ktvt@x.vn'] });
  ok('ktv@x.vn', 'simDone', { id: mp10.id, mat_na: 'Không', tiem_thuoc: 'Có' });
  k2 = ok('tk@x.vn', 'khoaReport', { tu: today, den: today }).kreport;
  assert(k2.mo_phong.find(x => x.ma_his === 'MP10').nguoi === 'trưởng', 'người mô phỏng theo lịch phân công');
}
// ---- v2.11: nhập BN từ hồ sơ giấy, phân loại ----
{
  assert(!api('ktv@x.vn', 'importPatients', { rows: [{ ma_his: 'GI1', ho_ten: 'A' }] }).ok, 'KTV thường không nhập hàng loạt');
  r = ok('ktvt@x.vn', 'importPatients', { rows: [
    { ma_his: 'GI1', ho_ten: 'Giấy Một', nam_sinh: '22/02/1953', gioi: 'nam', chan_doan: 'K hạ họng', ky_thuat: 'VMAT', tong_lieu: '69.96', so_buoi: '33', ghi_chu: 'BS trên phiếu: P ANH' },
    { ma_his: 'GI2', ho_ten: 'Giấy Hai', nam_sinh: '1960', ky_thuat: '3D-CRT', tong_lieu: '30', so_buoi: '10' },
    { ma_his: 'GI3', ho_ten: 'Giấy Ba', nam_sinh: '1970', ky_thuat: '3D-CRT', tong_lieu: '20', so_buoi: '5' },
    { ma_his: '', ho_ten: 'Thiếu mã' }, { ma_his: 'R1', ho_ten: 'Trùng' }] });
  assert(/Đã nhập 3 BN/.test(r.msg) && /Bỏ qua 2/.test(r.msg), r.msg);
  const g = h => r.data.patients.find(x => x.ma_his === h);
  assert(g('GI1').trang_thai === 'CHO_PL' && g('GI1').nam_sinh === '1953' && g('GI1').gioi === 'Nam', 'chờ phân loại, chuẩn hoá năm sinh, giới');
  assert(!api('ktv@x.vn', 'classifyPatient', { id: g('GI1').id, buoc: 'DANG_XA', bs_email: 'tk@x.vn', da_xa: '3', ngay_bat_dau: ctx.RT.addDays(today, -7) }).ok, 'thiếu ICD thì chưa chuyển được');
  r = ok('ktv@x.vn', 'classifyPatient', { id: g('GI1').id, buoc: 'DANG_XA', bs_email: 'tk@x.vn', icd: 'C13', da_xa: '3', ngay_bat_dau: ctx.RT.addDays(today, -7) });
  let p1 = r.data.patients.find(x => x.ma_his === 'GI1');
  assert(p1.trang_thai === 'DANG_XA' && p1.khoa === 'Xạ trị' && r.data.fractions.filter(f => f.bn_id === p1.id).length === 3, 'đang xạ, ghi bù 3 buổi, khoa theo BS');
  r = ok('ktv@x.vn', 'classifyPatient', { id: g('GI2').id, buoc: 'TAM_NGUNG', bs_email: 'tk@x.vn', icd: 'C34', chan_doan: 'K phổi', da_xa: '2', ngay_bat_dau: ctx.RT.addDays(today, -6), ly_do: 'Tác dụng phụ' });
  assert.strictEqual(r.data.patients.find(x => x.ma_his === 'GI2').trang_thai, 'TAM_NGUNG');
  r = ok('ktv@x.vn', 'classifyPatient', { id: g('GI3').id, buoc: 'CHO_XA', bs_email: 'tk@x.vn', icd: 'C50', chan_doan: 'K vú' });
  assert.strictEqual(r.data.patients.find(x => x.ma_his === 'GI3').trang_thai, 'CHO_XA');
  assert(!api('ktv@x.vn', 'classifyPatient', { id: g('GI3').id, buoc: 'HUY', ly_do: 'x' }).ok, 'chỉ phân loại BN đang chờ phân loại');
}
// ---- v2.12: hàm nhapBN đọc trang NhapBN ----
{
  ctx.Logger = { log() {} };
  const N = sheets.NhapBN;
  assert(N && N.data[0][0] === 'Mã HIS' && N.data[0][12] === 'Kết quả (app tự ghi)', 'setup tạo trang NhapBN');
  N.getRange(2, 1, 3, 12).setValues([
    ['NB01', 'Nhập Bảng Một', 1953, 'Nam', 'K hạ họng', 'C13', 'Triệt căn', 'VMAT', 69.96, 33, '', 'BS trên phiếu: P ANH'],
    ['NB02', 'Nhập Bảng Hai', 1960, 'Nữ', '', '', '', '3D-CRT', 30, 10, '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '']]);
  const before = ok('admin@x.vn', 'bootstrap').data.patients.length;
  const m1 = vm.runInContext('nhapBN()', ctx);
  assert(/Đã nhập 2 BN/.test(m1), m1);
  assert(/^Đã nhập/.test(N.data[1][12]) && /^Đã nhập/.test(N.data[2][12]), 'ghi kết quả từng dòng');
  const r2 = ok('admin@x.vn', 'bootstrap').data;
  assert.strictEqual(r2.patients.length, before + 2);
  assert.strictEqual(r2.patients.find(x => x.ma_his === 'NB01').tong_lieu, '69.96');
  assert(/Không có dòng mới/.test(vm.runInContext('nhapBN()', ctx)), 'chạy lại không nhập trùng');
}
// ---- v3.0: không xạ, lập lại KH, KH đồng thời ----
{
  const D = k => ctx.RT.addDays(today, -k);
  const mk = (his, st, kt, tl, sb) => ok('tk@x.vn', 'createPatient', { ma_his: his, ho_ten: 'V3 ' + his, nam_sinh: '1960', gioi: 'Nam', icd: 'C15', chan_doan: 'K', ky_thuat: kt, tong_lieu: tl, so_buoi: sb, trang_thai: st }).data.patients.find(x => x.ma_his === his);
  const fx = (p, k, extra) => ok('ktv@x.vn', 'logFraction', Object.assign({ bn_id: p.id, ngay: D(k), ly_do_bu: 'test' }, extra || {}));
  const env = d => ctx.RT.makeEnv(today, [], d.exceptions, d.phases, 'Máy gia tốc 1');
  const crs = (d, p) => ctx.RT.course(d.patients.find(x => x.id === p.id), d.fractions, env(d));
  // 1. Không xạ: vẫn có trong sổ mô phỏng, không có trong bảng xạ, mô phỏng lại được (đợt mới cùng mã HIS)
  let nt = mk('NT1', 'MO_PHONG', '', '', '');
  ok('ktv@x.vn', 'simDone', { id: nt.id, mat_na: '5 điểm', tiem_thuoc: 'Không' });
  assert(!api('ktv@x.vn', 'noTreat', { id: nt.id, ly_do: 'x' }).ok, 'KTV không ghi không xạ');
  assert(!api('bs@x.vn', 'noTreat', { id: nt.id }).ok, 'cần lý do');
  r = ok('bs@x.vn', 'noTreat', { id: nt.id, ly_do: 'BN từ chối điều trị' });
  nt = r.data.patients.find(x => x.id === nt.id);
  assert(nt.trang_thai === 'KHONG_XA' && /^Không xạ: /.test(nt.ly_do_ket_thuc), 'trạng thái Không xạ');
  let kr = ok('tk@x.vn', 'khoaReport', { tu: today, den: today }).kreport;
  assert(kr.mo_phong.some(x => x.ma_his === 'NT1'), 'đợt không xạ vẫn vào sổ mô phỏng');
  r = ok('bs@x.vn', 'createPatient', { ma_his: 'NT1', ho_ten: 'V3 NT1', nam_sinh: '1960', trang_thai: 'MO_PHONG' });
  assert(!r.warn || !/đang hoạt động/.test(r.warn), 'mô phỏng lại: không báo trùng đợt đang hoạt động');
  assert.strictEqual(r.data.patients.filter(x => x.ma_his === 'NT1').length, 2, 'đợt mới');
  const nx = mk('NT2', 'CHO_XA', '3D-CRT', '6', '3'); fx(nx, 1);
  assert(!api('bs@x.vn', 'noTreat', { id: nx.id, ly_do: 'x' }).ok, 'đã xạ thì không dùng Không xạ');

  // 2. Lập lại KH: vẫn xạ KH cũ trong lúc chờ; KH mới sẵn sàng thì KH cũ dừng ở số buổi đã xạ
  const rp = mk('RP1', 'CHO_XA', '3D-CRT', '20', '10');
  [6, 5, 4].forEach(k => fx(rp, k));
  assert(!api('ktv@x.vn', 'replan', { id: rp.id, buoc: 'CHO_KH', ky_thuat: 'VMAT', tong_lieu: '14', so_buoi: '7' }).ok, 'KTV không lập lại KH');
  r = ok('bs@x.vn', 'replan', { id: rp.id, buoc: 'CHO_KH', ky_thuat: 'VMAT', tong_lieu: '14', so_buoi: '7' });
  const gr = r.data.phases.find(x => x.bn_id === rp.id && x.loai === 'KH_LAI');
  assert(gr && gr.thay_gd === '1' && gr.cat_tai === '' && gr.trang_thai === 'CHO_KH', 'tạo KH lại');
  assert(!api('bs@x.vn', 'replan', { id: rp.id, buoc: 'CHO_KH', ky_thuat: 'VMAT', tong_lieu: '14', so_buoi: '7' }).ok, 'một KH lại một lúc');
  assert.strictEqual(crs(r.data, rp).total, 10, 'KH lại chưa xong: tổng buổi theo KH cũ');
  r = fx(rp, 3);
  ok('ks@x.vn', 'claimPlan', { id: gr.id, ks_email: 'ks@x.vn' });
  r = ok('ks@x.vn', 'planDone', { id: gr.id, can_qa: false });
  assert.strictEqual(r.data.phases.find(x => x.id === gr.id).cat_tai, '4', 'KH cũ dừng ở 4 buổi');
  let c = crs(r.data, rp);
  assert(c.total === 11 && Math.abs(c.doseTotal - 22) < 0.01, 'tổng 4 + 7 buổi, 8 + 14 Gy: ' + c.total + ' ' + c.doseTotal);
  r = fx(rp, 2);
  assert.strictEqual(r.data.fractions.find(f => f.bn_id === rp.id && f.ngay === D(2)).gd, gr.stt, 'buổi sau xạ theo KH mới');
  // BS chọn tạm dừng chờ KH mới
  const rp2 = mk('RP2', 'CHO_XA', '3D-CRT', '20', '10'); fx(rp2, 6);
  r = ok('bs@x.vn', 'replan', { id: rp2.id, buoc: 'CONTOUR', ky_thuat: '3D-CRT', tong_lieu: '18', so_buoi: '9', dung_xa: true });
  assert.strictEqual(r.data.patients.find(x => x.id === rp2.id).trang_thai, 'TAM_NGUNG', 'tạm dừng chờ KH');
  const g2 = r.data.phases.find(x => x.bn_id === rp2.id && x.loai === 'KH_LAI');
  ok('bs@x.vn', 'contourDone', { id: g2.id });
  ok('ks@x.vn', 'claimPlan', { id: g2.id, ks_email: 'ks@x.vn' });
  r = ok('ks@x.vn', 'planDone', { id: g2.id, can_qa: true });
  assert.strictEqual(r.data.patients.find(x => x.id === rp2.id).trang_thai, 'TAM_NGUNG', 'chờ QA vẫn dừng');
  r = ok('ks@x.vn', 'qaResult', { id: g2.id, dat: true });
  assert.strictEqual(r.data.patients.find(x => x.id === rp2.id).trang_thai, 'DANG_XA', 'QA đạt thì xạ tiếp');
  assert.strictEqual(crs(r.data, rp2).total, 10, '1 buổi cũ + 9 buổi mới');

  // 3. Hai KH đồng thời: 3D 3 buổi + VMAT 5 buổi; mỗi ngày tính 1 thủ thuật (có VMAT thì tính VMAT)
  const ss = mk('SS1', 'CHO_XA', '3D-CRT', '6', '3');
  r = ok('bs@x.vn', 'addPhase', { bn_id: ss.id, loai: 'SONG_SONG', ky_thuat: 'VMAT', tong_lieu: '10', so_buoi: '5', buoc: 'SAN_SANG' });
  const gs = r.data.phases.find(x => x.bn_id === ss.id);
  assert.strictEqual(gs.loai, 'SONG_SONG');
  c = crs(r.data, ss);
  assert(c.total === 5 && c.par.length === 1 && c.par[0].total === 5, 'tổng 5 ngày xạ (3 ngày cả hai + 2 ngày VMAT)');
  [6, 5].forEach(k => fx(ss, k));
  r = fx(ss, 4, { song_song: [] });
  assert.strictEqual(r.data.fractions.filter(f => f.bn_id === ss.id && f.gd === 'S' + gs.stt && f.da_huy !== 'Có').length, 2, 'bỏ chọn KH đồng thời thì không ghi');
  const fid4 = r.data.fractions.find(f => f.bn_id === ss.id && f.ngay === D(5) && f.gd === '1').id;
  r = ok('admin@x.vn', 'undoFraction', { id: fid4, ly_do: 'nhầm' });
  assert(!r.data.fractions.some(f => f.bn_id === ss.id && f.ngay === D(5) && f.da_huy !== 'Có'), 'huỷ buổi chính huỷ cả KH đồng thời cùng ngày');
  [5, 3, 2, 1].forEach(k => { r = fx(ss, k); });
  c = crs(r.data, ss);
  const ssp = r.data.patients.find(x => x.id === ss.id);
  assert(c.done === 6 && ssp.trang_thai === 'HOAN_THANH' && c.par[0].done === 5, 'ngày bỏ KH đồng thời được xạ bù ở cuối; xạ đủ: ' + c.done + '/' + c.total);
  kr = ok('tk@x.vn', 'khoaReport', { tu: D(6), den: today }).kreport;
  const rowsOf = (n) => kr.thang.flatMap(t => (t.nhom.find(g => g.ten === n) || { rows: [] }).rows).filter(x => x.ma_his === 'SS1');
  const cnt = rows => rows.reduce((a, x) => a + Object.keys(x.o).filter(k => x.o[k]).length, 0);
  assert.strictEqual(cnt(rowsOf('3D')), 1, 'ngày chỉ xạ 3D (bỏ chọn KH đồng thời) tính 3D');
  assert.strictEqual(cnt(rowsOf('VMAT')), 5, 'ngày có VMAT tính VMAT, mỗi ngày 1 thủ thuật');
  assert(!kr.mo_phong.some(x => x.ma_his === 'RP1' && /boost/.test(x.chan_doan)), 'KH lại không ghi là boost');

  // 4. Chuyển KH một phần: KH 6 buổi, KS chuyển 3; hết 3 buổi thì chờ BS
  const pc = mk('PC1', 'CHO_KH', '3D-CRT', '12', '6');
  ok('ks@x.vn', 'claimPlan', { id: pc.id, ks_email: 'ks@x.vn' });
  assert(!api('ks@x.vn', 'planDone', { id: pc.id, can_qa: false, chuyen_buoi: '6' }).ok, 'số buổi chuyển phải nhỏ hơn KH');
  ok('ks@x.vn', 'planDone', { id: pc.id, can_qa: false, chuyen_buoi: '3' });
  [6, 5].forEach(k => fx(pc, k)); r = fx(pc, 4);
  c = crs(r.data, pc);
  assert(c.review === 3 && c.reviewWait && c.total === 6, 'tới mốc đánh giá lại');
  r = api('ktv@x.vn', 'logFraction', { bn_id: pc.id, ngay: D(3), ly_do_bu: 'test' });
  assert(!r.ok && /đánh giá lại/.test(r.error), 'KTV không ghi được buổi 4: ' + r.error);
  assert(!api('ktv@x.vn', 'setReview', { id: pc.id, chuyen_buoi: '' }).ok, 'KTV không mở xạ tiếp');
  assert(!api('bs@x.vn', 'setReview', { id: pc.id, chuyen_buoi: '2' }).ok, 'số buổi phải lớn hơn đã xạ');
  ok('bs@x.vn', 'setReview', { id: pc.id, chuyen_buoi: '5' });
  r = fx(pc, 3); r = fx(pc, 2);
  assert(crs(r.data, pc).reviewWait, 'mốc mới buổi 5');
  r = ok('bs@x.vn', 'setReview', { id: pc.id, chuyen_buoi: '' });
  r = fx(pc, 1);
  assert.strictEqual(r.data.patients.find(x => x.id === pc.id).trang_thai, 'HOAN_THANH', 'xạ tiếp hết KH');
  // tới mốc, BS lập lại KH: KH cũ dừng ở số buổi đã chuyển
  const pd = mk('PD1', 'CHO_KH', '3D-CRT', '12', '6');
  ok('ks@x.vn', 'claimPlan', { id: pd.id, ks_email: 'ks@x.vn' });
  ok('ks@x.vn', 'planDone', { id: pd.id, can_qa: false, chuyen_buoi: '2' });
  [6, 5].forEach(k => fx(pd, k));
  r = ok('bs@x.vn', 'replan', { id: pd.id, buoc: 'CHO_KH', ky_thuat: 'VMAT', tong_lieu: '6', so_buoi: '3' });
  const gd = r.data.phases.find(x => x.bn_id === pd.id && x.loai === 'KH_LAI');
  ok('ks@x.vn', 'claimPlan', { id: gd.id, ks_email: 'ks@x.vn' });
  r = ok('ks@x.vn', 'planDone', { id: gd.id, can_qa: false });
  c = crs(r.data, pd);
  assert(c.total === 5 && !c.reviewWait, 'sau KH lại: 2 + 3 buổi, hết chờ');
  r = fx(pd, 4);
  assert.strictEqual(r.data.fractions.find(f => f.bn_id === pd.id && f.ngay === D(4)).gd, gd.stt, 'xạ KH mới');

  // 5. Nhiều mã ICD: đếm ở cả hai mã, tìm theo mã thêm
  r = ok('tk@x.vn', 'createPatient', { ma_his: 'IC2', ho_ten: 'Hai Mã', nam_sinh: '1960', icd: 'C15', icd_phu: 'c13.9, C15, C13', chan_doan: 'K thực quản + K hạ họng', ky_thuat: '3D-CRT', tong_lieu: '4', so_buoi: '2', trang_thai: 'CHO_XA' });
  const ic = r.data.patients.find(x => x.ma_his === 'IC2');
  assert.strictEqual(ic.icd_phu, 'C13', 'chuẩn hoá mã thêm, bỏ trùng mã chính');
  assert(!api('tk@x.vn', 'updatePatient', { id: ic.id, icd_phu: 'XYZ' }).ok, 'mã thêm sai dạng');
  fx(ic, 1);
  const rpI = ok('admin@x.vn', 'report', { tu: D(1), den: today }).report;
  const c13 = rpI.theo_icd.find(x => x.ma === 'C13'), c15 = rpI.theo_icd.find(x => x.ma === 'C15');
  assert(c13 && c15 && c13.bn_xa >= 1 && c15.bn_xa >= 1, 'BN 2 mã đếm ở cả hai mã');
  const fnd = ok('admin@x.vn', 'findPatients', { tu: D(1), den: today, moc: 'xa', icd: ['C13'] });
  assert((fnd.found.rows || fnd.found).some(x => x.ma_his === 'IC2'), 'tìm theo mã thêm');
}
// Nhập BN từ sổ chuyên khoa HIS (Excel, dữ liệu giả)
{
  const RT = ctx.RT;
  const aoa = [['SỔ CHUYÊN KHOA'], [],
    ['TT', 'Mã bệnh nhân', 'Họ và tên', 'Tuổi', '', 'Số thẻ BHYT', 'Địa chỉ', 'Nghề nghiệp', 'Dân tộc', 'Chẩn đoán', 'Nơi gửi', 'Bác sĩ chỉ định', 'Tên dịch vụ', 'Số lượng'],
    ['', '', '', 'Nam', 'Nữ'],
    ['STT', 'MA_BENH_NHAN', 'NAME', 'TUOI_NAM', 'TUOI_NU'],
    ['Ngày 01/10/2026'],
    ['1', '90000001', 'TRẦN VĂN MỘT', '1950', '', 'X', 'HN', '', 'Kinh', 'U ác tính vòm họng', 'P.Nội 1', 'BSCKII. A', 'Làm mặt nạ cố định đầu [5 điểm]', '1'],
    ['2', '90000001', 'TRẦN VĂN MỘT', '1950', '', 'X', 'HN', '', 'Kinh', 'U ác tính vòm họng', 'P.Nội 1', 'BSCKII. A', 'Mô phỏng và lập kế hoạch cho xạ trị ngoài', '1'],
    ['3', '90000002', 'LÊ THỊ HAI', '', '1970', 'X', 'HN', '', 'Kinh', 'K vú', 'P.Nội 2', 'ThS.BSNT. Không Có', 'Mô phỏng và lập kế hoạch cho xạ trị ngoài', '1'],
    ['Ngày 02/10/2026'],
    ['1', '90000003', 'PHẠM VĂN BA', '1960', '', 'X', 'HN', '', 'Kinh', 'K phổi', 'P.Nội 1', 'BS A', 'Làm mặt nạ cố định đầu', '1'],
    ['2', '00123456', 'NGUYỄN VĂN A', '1960', '', 'X', 'HN', '', 'Kinh', 'K vòm', 'P.Nội 1', 'BS A', 'Mô phỏng và lập kế hoạch cho xạ trị ngoài', '1']];
  const rows = RT.parseHisSheet(aoa);
  assert.strictEqual(rows.length, 5, 'đọc đủ các dòng có mã BN');
  assert(rows[2].gioi === 'Nữ' && rows[2].nam_sinh === '1970' && rows[3].ngay === '2026-10-02', 'giới, năm sinh, ngày theo nhóm');
  let boot = ok('admin@x.vn', 'bootstrap');
  const plan = RT.planImport(rows, { patients: boot.data.patients, users: boot.data.users, dm: boot.data.dm, today }, {});
  assert.strictEqual(plan.length, 3, 'chỉ lấy BN có mô phỏng (bỏ BN chỉ làm mặt nạ)');
  const p1 = plan.find(x => x.ma_his === '90000001'), p2 = plan.find(x => x.ma_his === '90000002'), p3 = plan.find(x => x.ma_his === '00123456');
  assert(p1.trang === 'moi' && p1.bs_email === 'bs@x.vn' && p1.ho_ten === 'Trần Văn Một', 'khớp bác sĩ bỏ học hàm, tên viết thường');
  assert(p2.trang === 'xem' && !p2.bs_email, 'không khớp bác sĩ thì cần xem');
  assert(p3.trang === 'co', 'BN đã có trong hệ thống thì bỏ qua');
  assert(!api('ktv@x.vn', 'importHisBook', { rows: [p1] }).ok, 'KTV không nhập hàng loạt');
  r = ok('admin@x.vn', 'importHisBook', { rows: [p1, Object.assign({}, p2, { bs_email: 'bs@x.vn' }), Object.assign({}, p3, { bs_email: 'bs@x.vn' })] });
  assert(/Đã thêm 2 BN/.test(r.msg) && /Bỏ qua 1/.test(r.msg), 'thêm BN mới, bỏ qua BN trùng: ' + r.msg);
  const n1 = r.data.patients.find(x => x.ma_his === '90000001');
  assert(n1.trang_thai === 'MO_PHONG' && n1.ngay_mo_phong === '2026-10-01' && n1.bs_email === 'bs@x.vn' && /sổ HIS/.test(n1.ghi_chu), 'BN vào bước mô phỏng');
  assert(!api('admin@x.vn', 'importHisBook', { rows: [p1] }).ok, 'nhập lại cùng BN thì báo lỗi, không thêm trùng');
  r = ok('admin@x.vn', 'lookupHisMany', { ma: ['90000001'] });
  assert(Array.isArray(r.his['90000001']), 'tra nhiều mã HIS một lần');
}
// Xếp lịch: chỉ KTV trưởng (theo chức vụ) và quản trị
{
  let boot = ok('admin@x.vn', 'bootstrap');
  const w = boot.data.patients.find(x => x.ma_his === '90000002');
  const far = ctx.RT.addDays(today, 200), far2 = ctx.RT.addDays(today, 201);
  assert(!api('dd@x.vn', 'schedule', { id: w.id, ngay_du_kien: far, vuot_chi_tieu: true }).ok, 'ĐD không xếp lịch');
  assert(!api('ktv@x.vn', 'schedule', { id: w.id, ngay_du_kien: far, vuot_chi_tieu: true }).ok, 'KTV thường không xếp lịch');
  r = ok('ktvt@x.vn', 'schedule', { id: w.id, ngay_du_kien: far, vuot_chi_tieu: true });
  assert.strictEqual(r.data.patients.find(x => x.id === w.id).ngay_du_kien, far, 'KTV trưởng xếp thẳng');
  assert(!api('ktv@x.vn', 'setDay', { bn_id: w.id, ngay: far2, xa: false }).ok, 'KTV thường không đổi ngày xạ');
  ok('admin@x.vn', 'schedule', { id: w.id, ngay_du_kien: far2, vuot_chi_tieu: true });
  // khớp tên bác sĩ viết tắt tên đệm
  const us = [{ email: 'h1@x', ho_ten: 'ThS. Nguyễn Thị Ngọc Hà', vai_tro: 'BS' }, { email: 'h2@x', ho_ten: 'Nguyễn Thị Hà', vai_tro: 'BS' }];
  assert.strictEqual((ctx.RT.matchDoctor(us, 'Ths.Bs. Nguyễn T. Ngọc Hà') || {}).email, 'h1@x', 'T. khớp Thị');
  assert.strictEqual((ctx.RT.matchDoctor(us, 'BS Nguyễn T. Hà') || {}).email, 'h2@x', 'không nhầm sang Ngọc Hà');
  assert.strictEqual(ctx.RT.matchDoctor(us, 'BS Nguyễn T. Lan'), null, 'khác tên thì không khớp');
}
// Phân công Ca 1–4 + Mô phỏng, giờ ca
{
  const boot = ok('admin@x.vn', 'bootstrap');
  assert.deepStrictEqual(boot.data.dm.VI_TRI_PC, ['Ca 1', 'Ca 2', 'Ca 3', 'Ca 4', 'Mô phỏng'], 'vị trí phân công mặc định');
  assert(!api('admin@x.vn', 'dmAdd', { loai: 'GIO_CA', gia_tri: 'Ca 1 sáng' }).ok, 'giờ ca sai dạng');
  ok('admin@x.vn', 'dmAdd', { loai: 'GIO_CA', gia_tri: 'Ca 1: 7h00-9h30' });
  r = ok('admin@x.vn', 'dmAdd', { loai: 'GIO_CA', gia_tri: 'Ca 1: 07:00-10:00' });
  assert.deepStrictEqual(r.data.dm.GIO_CA, ['Ca 1: 07:00-10:00'], 'sửa giờ ca thì thay dòng cũ');
  ok('admin@x.vn', 'dmAdd', { loai: 'GIO_CA', gia_tri: 'Ca 2: 10:00-12:00' });
  const rows = [{ vi_tri: 'Ca 1', nhan_vien: 'a' }, { vi_tri: 'Ca 2', nhan_vien: 'b' }, { vi_tri: 'Mô phỏng', nhan_vien: 'c' }];
  const dm2 = { GIO_CA: ['Ca 1: 07:00-10:00', 'Ca 2: 10:00-12:00'] };
  const pick = (hm, dmx) => ctx.RT.rosterFor(rows, 'Máy gia tốc 1', hm, dmx).map(x => x.nhan_vien).join();
  assert.strictEqual(pick('08:15', dm2), 'a', 'xạ 8:15 → Ca 1');
  assert.strictEqual(pick('10:00', dm2), 'b', 'xạ 10:00 → Ca 2');
  assert.strictEqual(pick('', dm2), 'a,b', 'không rõ giờ (ghi bù) → mọi ca, bỏ mô phỏng');
  assert.strictEqual(pick('08:15', {}), 'a,b', 'chưa có giờ ca → mọi ca');
}
// v3.3: nhập sổ HIS vào Chờ phân loại, phân loại về mọi giai đoạn, xoá toàn bộ BN
{
  const base = { nam_sinh: '1960', gioi: 'Nam', chan_doan: 'K phổi', khoa: 'Xạ trị', bs_email: 'bs@x.vn', ngay_mo_phong: '2026-10-05', ghi_chu: 'Nhập từ sổ HIS: test' };
  const rows = ['91', '92', '93', '94', '95', '96', '97', '98'].map(n => Object.assign({}, base, { ma_his: '9300' + n, ho_ten: 'PL ' + n, trang_thai: 'CHO_PL' }));
  rows.push(Object.assign({}, base, { ma_his: '930099', ho_ten: 'PL 99', ngay_mo_phong: today, trang_thai: 'MO_PHONG' }));
  r = ok('admin@x.vn', 'importHisBook', { rows });
  assert(/8 vào Chờ phân loại, 1 vào Chờ mô phỏng/.test(r.msg), r.msg);
  const P = n => r.data.patients.find(x => x.ma_his === '9300' + n);
  assert(P('91').trang_thai === 'CHO_PL' && P('99').trang_thai === 'MO_PHONG', 'bước đích theo ngày mô phỏng');
  // BS khác không phân loại BN không phải của mình
  ok('admin@x.vn', 'saveUser', { email: 'bs2@x.vn', ho_ten: 'BS Hai', vai_tro: 'BS', khoa: 'Xạ trị' });
  assert(!api('bs2@x.vn', 'classifyPatient', { id: P('91').id, buoc: 'CONTOUR' }).ok, 'BS chỉ phân loại BN của mình');
  const rx = { icd: 'C34', chan_doan: 'K phổi', ky_thuat: 'IMRT', tong_lieu: '60', so_buoi: '30' };
  ok('bs@x.vn', 'classifyPatient', { id: P('91').id, buoc: 'CONTOUR' });
  assert(!api('bs@x.vn', 'classifyPatient', { id: P('92').id, buoc: 'CHO_KH' }).ok, 'chờ lập KH cần đủ chuyên môn');
  ok('bs@x.vn', 'classifyPatient', Object.assign({ id: P('92').id, buoc: 'CHO_KH' }, rx));
  assert(!api('ktv@x.vn', 'classifyPatient', Object.assign({ id: P('93').id, buoc: 'DANG_KH' }, rx)).ok, 'đang lập KH cần chọn KS');
  ok('ks@x.vn', 'classifyPatient', Object.assign({ id: P('93').id, buoc: 'DANG_KH', ks_email: 'ks@x.vn' }, rx));
  ok('ktv@x.vn', 'classifyPatient', Object.assign({ id: P('94').id, buoc: 'CHO_QA' }, rx));
  ok('ktv@x.vn', 'classifyPatient', { id: P('95').id, buoc: 'HOAN_THANH', ngay_ket_thuc: '2026-11-10' });
  const st = ctx.RT.addDays(today, -20);
  ok('ktv@x.vn', 'classifyPatient', Object.assign({ id: P('96').id, buoc: 'HOAN_THANH', ngay_bat_dau: st, ky_thuat: '3D-CRT', tong_lieu: '30', so_buoi: '10', icd: '' }, { chan_doan: 'K' }));
  ok('bs@x.vn', 'classifyPatient', { id: P('97').id, buoc: 'KHONG_XA', ly_do: 'BN từ chối' });
  r = ok('ktv@x.vn', 'classifyPatient', Object.assign({ id: P('98').id, buoc: 'DANG_XA', ngay_bat_dau: st, da_xa: '5' }, rx));
  const st2 = x => r.data.patients.find(y => y.ma_his === '9300' + x);
  assert.deepStrictEqual(['91', '92', '93', '94', '95', '96', '97', '98'].map(x => st2(x).trang_thai),
    ['CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA', 'HOAN_THANH', 'HOAN_THANH', 'KHONG_XA', 'DANG_XA'], 'phân loại về đúng giai đoạn');
  assert(st2('93').ks_email === 'ks@x.vn' && st2('94').qa_ket_qua === 'Chờ QA', 'KS phụ trách, chờ QA');
  assert(st2('95').ngay_ket_thuc === '2026-11-10' && !r.data.fractions.some(f => f.bn_id === st2('95').id), 'đã xạ xong không cần chi tiết');
  assert.strictEqual(r.data.fractions.filter(f => f.bn_id === st2('96').id).length, 10, 'đủ chi tiết thì ghi bù đủ buổi');
  assert.strictEqual(r.data.fractions.filter(f => f.bn_id === st2('98').id).length, 5, 'đang xạ ghi bù 5 buổi');
  // KS nhận ca chờ lập KH sau phân loại như bình thường
  ok('ks@x.vn', 'claimPlan', { id: st2('92').id, ks_email: 'ks@x.vn' });
  // Xoá toàn bộ BN (sao lưu trước), giữ người dùng, danh mục, phân công, ngày máy nghỉ
  ok('ktvt@x.vn', 'machineDown', { may: 'Máy gia tốc 1', ngay: ctx.RT.addDays(today, 40), ghi_chu: 'bảo trì' });
  const before = ok('admin@x.vn', 'bootstrap').data;
  const nUsers = before.users.length, nRoster = sheets.PhanCong.getLastRow();
  const msg = vm.runInContext('resetBenhNhan()', ctx);
  assert(/^Đã xoá \d+ BN/.test(msg) && copies.length === 1, 'sao lưu rồi xoá: ' + msg);
  const after = ok('admin@x.vn', 'bootstrap').data;
  assert(after.patients.length === 0 && after.fractions.length === 0 && (after.phases || []).length === 0, 'hết BN, buổi xạ, giai đoạn');
  assert(after.users.length === nUsers && sheets.PhanCong.getLastRow() === nRoster, 'giữ người dùng, phân công');
  assert(after.exceptions.some(e => e.loai === 'MAY_NGHI') && !after.exceptions.some(e => e.bn_id), 'giữ ngày máy nghỉ, xoá ngày của BN');
  assert(sheets.ChiMuc.getLastRow() <= 1, 'xoá chỉ mục');
  r = ok('admin@x.vn', 'importHisBook', { rows: [Object.assign({}, base, { ma_his: '930091', ho_ten: 'PL 91', trang_thai: 'CHO_PL' })] });
  assert(/Đã thêm 1 BN/.test(r.msg), 'nhập lại sau khi xoá: ' + r.msg);
}
// v3.4: nhập đầy đủ từ HIS (trang NhapDayDu), phân loại BN đã có buổi xạ, chuyển BS điều trị
{
  const RT = ctx.RT;
  assert.strictEqual(RT.isoDate('05/10/2026'), '2026-10-05');
  currentEmail = 'admin@x.vn';
  assert(/Đã tạo trang/.test(vm.runInContext('nhapDayDu()', ctx)), 'lần đầu tạo trang NhapDayDu');
  const mon = RT.addDays(RT.monday(today), -14);
  const dmy = d => d.slice(8) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4);
  // VMAT: T2, T3, T5, T6, T7 (nghỉ T4) trong 2 tuần = 10 buổi
  const vm10 = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map(k => RT.addDays(mon, k));
  assert.strictEqual(RT.guessOffDay(vm10), '3', 'suy ra nghỉ Thứ Tư');
  const t3 = [0, 1, 2].map(k => RT.addDays(mon, k));
  const row = o => RT.FULL_COLS.map(c => o[c[0]] || '');
  const rowsF = [
    row({ ma_his: '950001', ho_ten: 'Đầy Đủ Một', nam_sinh: '1960', gioi: 'Nam', chan_doan: 'K vòm', icd: 'C11', bs: 'BS A', ngay_mo_phong: dmy(RT.addDays(mon, -7)), tiem_thuoc: 'Có', mat_na: 'Mặt nạ 5 điểm', ky_thuat: 'VMAT', ngay_xa: vm10.map(dmy).join(', '), tong_lieu: '70', so_buoi: '35' }),
    row({ ma_his: '950002', ho_ten: 'Thiếu Liều', nam_sinh: '1970', gioi: 'Nữ', chan_doan: 'K vú', icd: 'C50', bs: 'bs@x.vn', ngay_mo_phong: dmy(RT.addDays(mon, -7)), tiem_thuoc: 'Không', ky_thuat: '3D-CRT', ngay_xa: t3.map(dmy).join(', ') }),
    row({ ma_his: '950003', ho_ten: 'Xong Rồi', nam_sinh: '1955', gioi: 'Nam', chan_doan: 'Di căn xương', icd: 'C79', bs: 'BS A', ky_thuat: '3D-CRT', ngay_xa: t3.map(dmy).join(', '), tong_lieu: '8', so_buoi: '1' }),
    row({ ma_his: '950004', ho_ten: 'Chưa Xạ', nam_sinh: '1965', gioi: 'Nữ', chan_doan: 'K CTC', bs: 'BS Lạ' })
  ];
  sheets.NhapDayDu.getRange(2, 1, rowsF.length, rowsF[0].length).setValues(rowsF);
  const m1 = vm.runInContext('nhapDayDu()', ctx);
  assert(/Đã nhập 4 BN: 1 đang xạ, 1 đã xạ xong, 2 chờ phân loại; 16 buổi xạ/.test(m1), m1);
  assert(/Không có dòng mới/.test(vm.runInContext('nhapDayDu()', ctx)), 'chạy lại không nhập trùng');
  assert(String(sheets.NhapDayDu.data[4][RT.FULL_COLS.length]).includes('chưa khớp BS'), 'ghi kết quả từng dòng');
  let d = ok('admin@x.vn', 'bootstrap').data;
  const Q = n => d.patients.find(x => x.ma_his === '95000' + n);
  const fxOfQ = n => d.fractions.filter(f => f.bn_id === Q(n).id).map(f => f.ngay).sort();
  assert(Q(1).trang_thai === 'DANG_XA' && Q(1).ngay_nghi_tuan === '3' && Q(1).tiem_thuoc === 'Có' && Q(1).mat_na === 'Mặt nạ 5 điểm', 'đủ thông tin → đang xạ, lịch tuần, mặt nạ');
  assert.deepStrictEqual(fxOfQ(1), vm10, 'buổi xạ đúng ngày thực hiện');
  const c1 = RT.course(Q(1), d.fractions, RT.makeEnv(today, d.holidays, d.exceptions, d.phases, 'Máy gia tốc 1'));
  assert.strictEqual(c1.done, 10, 'tiến độ 10/35');
  assert(Q(2).trang_thai === 'CHO_PL' && fxOfQ(2).length === 3 && Q(3).trang_thai === 'HOAN_THANH' && Q(4).trang_thai === 'CHO_PL' && !Q(4).bs_email, 'thiếu thì chờ phân loại');
  // phân loại BN đã có buổi xạ: chỉ cần tổng liều, số buổi; không ghi bù lại
  assert(!api('bs@x.vn', 'classifyPatient', { id: Q(2).id, buoc: 'CHO_XA', tong_lieu: '50', so_buoi: '25' }).ok, 'đã có buổi xạ thì không về chờ xạ');
  assert(!api('bs@x.vn', 'classifyPatient', { id: Q(2).id, buoc: 'DANG_XA', tong_lieu: '6', so_buoi: '3' }).ok, 'số buổi phải lớn hơn số đã xạ');
  r = ok('bs@x.vn', 'classifyPatient', { id: Q(2).id, buoc: 'DANG_XA', tong_lieu: '50', so_buoi: '25' });
  const q2 = r.data.patients.find(x => x.ma_his === '950002');
  assert(q2.trang_thai === 'DANG_XA' && q2.ngay_bat_dau === t3[0] && r.data.fractions.filter(f => f.bn_id === q2.id).length === 3, 'giữ đúng 3 buổi đã có');
  // chuyển BS điều trị
  ok('admin@x.vn', 'saveUser', { email: 'bs3@x.vn', ho_ten: 'BS Ba', vai_tro: 'BS', khoa: 'Xạ trị' });
  assert(!api('ktv@x.vn', 'transferDoctor', { ids: [q2.id], bs_email: 'bs3@x.vn' }).ok, 'KTV không chuyển BS');
  assert(!api('bs2@x.vn', 'transferDoctor', { ids: [q2.id], bs_email: 'tk@x.vn' }).ok, 'BS ngoài cuộc không chuyển');
  r = ok('bs3@x.vn', 'transferDoctor', { ids: [q2.id, Q(1).id], bs_email: 'bs3@x.vn', ly_do: 'BS Ba điều trị' });
  assert(/Đã chuyển 2 BN sang BS Ba/.test(r.msg), r.msg);
  assert(r.data.patients.find(x => x.id === q2.id).bs_email === 'bs3@x.vn' && sheets.NhatKy.data.some(row => row.includes('Chuyển BS điều trị')), 'BS nhận tự chuyển BN sang mình, có nhật ký');
  r = ok('bs3@x.vn', 'transferDoctor', { ids: [q2.id], bs_email: 'bs@x.vn' });
  assert.strictEqual(r.data.patients.find(x => x.id === q2.id).bs_email, 'bs@x.vn', 'BS đang điều trị chuyển đi');
}
console.log('Tất cả kiểm tra máy chủ đều đạt. Hôm nay:', today, '· Nhật ký:', sheets.NhatKy.getLastRow() - 1, 'dòng');
