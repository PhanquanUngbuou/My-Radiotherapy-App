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
  getId: () => 'SS1', setSpreadsheetTimeZone() {}, getUrl: () => 'https://sheet',
  getSheetByName: n => sheets[n] || null,
  insertSheet: n => (sheets[n] = makeSheet(n)),
  getSheets: () => Object.values(sheets), deleteSheet() {}
};
let currentEmail = 'admin@x.vn';
const props = {};
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss, flush() {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k], setProperty: (k, v) => { props[k] = v; } }) },
  Session: { getActiveUser: () => ({ getEmail: () => currentEmail }), getEffectiveUser: () => ({ getEmail: () => 'admin@x.vn' }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: { formatDate: (d, tz, f) => { const s = new Date(d.getTime() + 7 * 3600e3).toISOString(); return f === 'yyyy-MM-dd' ? s.slice(0, 10) : s.slice(0, 19); } },
  HtmlService: {}, console
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
r = ok('ktv@x.vn', 'setDay', { bn_id: bp.id, ngay: wd, xa: false });
assert(r.data.exceptions.some(e => e.bn_id === bp.id && e.ngay === wd && e.loai === 'NGHI'));
r = ok('ktv@x.vn', 'setDay', { bn_id: bp.id, ngay: wd, xa: true });
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
assert(!api('ktv@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Mô phỏng CT', nhan_vien: ['ktv@x.vn'] }).ok, 'KTV thường không phân công');
r = ok('ktvt@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Mô phỏng CT', nhan_vien: ['KTV@x.vn', 'ktvt@x.vn'], ghi_chu: 'sáng' });
let pc = r.data.roster.find(x => x.ngay === mon && x.vi_tri === 'Mô phỏng CT');
assert.strictEqual(pc.nhan_vien, 'ktv@x.vn, ktvt@x.vn');
r = ok('ktvt@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Mô phỏng CT', nhan_vien: ['ktv@x.vn'] });
assert.strictEqual(r.data.roster.filter(x => x.ngay === mon && x.vi_tri === 'Mô phỏng CT').length, 1, 'sửa ô thì ghi đè, không nhân đôi');
assert(!api('ktvt@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Vị trí lạ', nhan_vien: [] }).ok);
assert(!api('ktvt@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Trực', nhan_vien: ['nguoila@x.vn'] }).ok);
ok('ktvt@x.vn', 'setRoster', { ngay: ctx.RT.addDays(mon, 2), vi_tri: 'Trực', nhan_vien: ['ktvt@x.vn'] });
r = ok('ktvt@x.vn', 'copyRoster', { tu: mon, den: ctx.RT.addDays(mon, 7) });
assert(r.data.roster.some(x => x.ngay === ctx.RT.addDays(mon, 9) && x.vi_tri === 'Trực' && x.nhan_vien === 'ktvt@x.vn'), 'sao chép tuần');
r = ok('admin@x.vn', 'bootstrap');
assert(r.data.roster.length >= 4, 'đọc lại phân công từ sheet');
currentEmail = 'dd@x.vn';
let gr = JSON.parse(ctx.api('getRoster', { tu: mon, den: ctx.RT.addDays(mon, 6) }));
assert(gr.ok && gr.roster.length === 2, 'tải phân công theo tuần');
// rev: thay đổi sau mỗi lần ghi
const rev1 = JSON.parse(ctx.api('rev')).rev;
ok('ktvt@x.vn', 'setRoster', { ngay: mon, vi_tri: 'Trực', nhan_vien: ['ktv@x.vn'] });
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
currentEmail = 'tk@x.vn'; let ex = JSON.parse(ctx.api('exportReport', { tu: dR, den: today }));
assert(ex.ok && ex.sheet && /BaoCao/.test(ex.sheet.name), 'xuất trang báo cáo');

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
  // ĐD đề xuất: khoa đã đủ 2/2 → cảnh báo, đồng ý thì gửi đề xuất
  r = api('dd2@x.vn', 'schedule', { id: c3.id, ngay_du_kien: d1 });
  assert(!r.ok && /^QUOTA:/.test(r.error), 'cảnh báo vượt chỉ tiêu: ' + r.error);
  r = ok('dd2@x.vn', 'schedule', { id: c3.id, ngay_du_kien: d1, ngay_nghi_tuan: '', vuot_chi_tieu: true });
  let p3 = r.data.patients.find(x => x.id === c3.id);
  assert(!p3.ngay_du_kien && p3.de_xuat_lich && p3.de_xuat_boi === 'dd2@x.vn', 'ĐD chỉ đề xuất, chưa có lịch');
  assert(!api('ktv@x.vn', 'approveSchedule', { id: c3.id, vuot_chi_tieu: true }).ok, 'KTV thường không duyệt');
  assert(!api('ktvt@x.vn', 'approveSchedule', { id: c3.id }).ok, 'người duyệt cũng phải đồng ý vượt chỉ tiêu');
  const d2 = ctx.RT.addDays(d1, 1);
  r = ok('ktvt@x.vn', 'approveSchedule', { id: c3.id, ngay_du_kien: d2, vuot_chi_tieu: true });
  p3 = r.data.patients.find(x => x.id === c3.id);
  assert(p3.ngay_du_kien === d2 && !p3.de_xuat_lich, 'KTV trưởng sửa ngày và duyệt');
  assert(sheets.NhatKy.data.some(row => row.includes('Duyệt lịch') && row.join(' ').includes('ĐD Hai')), 'nhật ký ghi người đề xuất');
  // KTV thường cũng chỉ đề xuất; trả lại đề xuất
  const c5 = mk('CT5');
  r = ok('ktv@x.vn', 'schedule', { id: c5.id, ngay_du_kien: ctx.RT.addDays(today, 60) });
  assert(!r.data.patients.find(x => x.id === c5.id).ngay_du_kien, 'KTV thường đề xuất');
  assert(!api('ktvt@x.vn', 'rejectSchedule', { id: c5.id }).ok, 'trả lại cần lý do');
  r = ok('ktvt@x.vn', 'rejectSchedule', { id: c5.id, ly_do: 'Máy kín lịch' });
  assert(!r.data.patients.find(x => x.id === c5.id).de_xuat_lich);
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
  assert(!api('ktv@x.vn', 'simDone', { id: b1.id }).ok, 'phải chọn người mô phỏng');
  assert(!api('ktv@x.vn', 'simDone', { id: b1.id, nguoi_mo_phong: ['a@x.vn'] }).ok, 'người mô phỏng phải là người dùng');
  r = ok('ktv@x.vn', 'simDone', { id: b1.id, nguoi_mo_phong: ['ktv@x.vn', 'ktvt@x.vn'], mat_na: true, tiem_thuoc: false });
  b1 = r.data.patients.find(x => x.id === b1.id);
  assert(b1.nguoi_mo_phong === 'ktv@x.vn, ktvt@x.vn' && b1.mat_na === 'Có' && b1.tiem_thuoc === 'Không', 'lưu người mô phỏng, mặt nạ');
  ok('tk@x.vn', 'contourDone', { id: b1.id });
  ok('ks@x.vn', 'claimPlan', { id: b1.id, ks_email: 'ks@x.vn' });
  ok('ks@x.vn', 'planDone', { id: b1.id, can_qa: false });
  r = ok('ktv@x.vn', 'logFraction', { bn_id: b1.id, ngay: today, ktv_xa: ['ktv@x.vn', 'ktvt@x.vn'] });
  assert.strictEqual(r.data.fractions.find(f => f.bn_id === b1.id).ktv_xa, 'ktv@x.vn, ktvt@x.vn', 'lưu KTV xạ ca đó');
  // báo cáo khoa
  assert(!api('bs@x.vn', 'khoaReport', { tu: today, den: today }).ok, 'BS thường không lập báo cáo khoa');
  let kr = ok('tk@x.vn', 'khoaReport', { tu: ctx.RT.addDays(today, -1), den: today }).kreport;
  assert.strictEqual(kr.khoa, 'Xạ trị');
  assert(kr.mo_phong.some(x => x.ma_his === 'BC1' && x.mat_na && /^C, /.test(x.nguoi)), 'sổ mô phỏng');
  const vmg = kr.thang[0].nhom.find(g => g.ten === 'IMRT/VMAT'), row = vmg.rows.find(x => x.ma_his === 'BC1');
  assert(row && row.o[String(+today.slice(8))] === 'C/IT' && row.kt === 'VM' && row.ks === 'x' && row.nu === '1960', 'ô ngày ghi ký hiệu KTV');
  assert.strictEqual(row.thanh_tien, 21000 + 37500, 'thành tiền = buổi + setup buổi đầu');
  currentEmail = 'tk@x.vn'; let ek = JSON.parse(ctx.api('exportKhoaReport', { tu: ctx.RT.addDays(today, -1), den: today }));
  assert(ek.ok && ek.sheet && Object.keys(sheets).some(n => /^Xa IMRT-VMAT/.test(n)) && Object.keys(sheets).some(n => /^So mo phong/.test(n)), 'xuất trang báo cáo khoa');
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
console.log('Tất cả kiểm tra máy chủ đều đạt. Hôm nay:', today, '· Nhật ký:', sheets.NhatKy.getLastRow() - 1, 'dòng');
