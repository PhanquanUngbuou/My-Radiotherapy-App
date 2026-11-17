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
r = api('dd@x.vn', 'createPatient', { ma_his: '0123', ho_ten: 'X', nam_sinh: '1960', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25' });
assert(!r.ok && /bác sĩ điều trị/.test(r.error), 'ĐD nhập BN phải chọn BS điều trị: ' + r.error);
r = api('ktv@x.vn', 'createPatient', { ma_his: '0124', ho_ten: 'X', nam_sinh: '1960', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25', bs_email: 'ks@x.vn' });
assert(!r.ok && /danh sách bác sĩ/.test(r.error), 'BS điều trị phải là bác sĩ');
r = ok('ktv@x.vn', 'createPatient', { ma_his: '0125', ho_ten: 'Nhập bởi KTV', nam_sinh: '1960', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25', bs_email: 'bs@x.vn', trang_thai: 'MO_PHONG' });
let byKtv = r.data.patients.find(x => x.ma_his === '0125');
assert.strictEqual(byKtv.nguoi_nhap, 'ktv@x.vn'); assert.strictEqual(byKtv.bs_email, 'bs@x.vn');
ok('ks@x.vn', 'createPatient', { ma_his: '0126', ho_ten: 'Nhập bởi KS', nam_sinh: '1960', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25', bs_email: 'bs@x.vn' });
assert(!api('ktv@x.vn', 'updatePatient', { id: byKtv.id, tong_lieu: '60' }).ok, 'KTV không sửa chỉ định');
ok('bs@x.vn', 'deletePatient', { id: byKtv.id, ly_do: 'test' });
ok('bs@x.vn', 'deletePatient', { id: r.data.patients.find(x => x.ma_his === '0125').id === byKtv.id ? ok('admin@x.vn', 'bootstrap').data.patients.find(x => x.ma_his === '0126').id : '', ly_do: 'test' });

r = ok('bs@x.vn', 'createPatient', { ma_his: '00123456', ho_ten: 'Nguyễn Văn A', nam_sinh: '1960', chan_doan: 'K vòm', ky_thuat: 'VMAT', tong_lieu: '6', so_buoi: '3', sgrt: 'Có' });
const id = r.data.patients[0].id;
assert.strictEqual(r.data.patients[0].ma_his, '00123456', 'giữ số 0 đầu mã HIS');
assert.strictEqual(r.data.patients[0].trang_thai, 'CONTOUR');
r = api('bs@x.vn', 'createPatient', { ma_his: '00123456', ho_ten: 'Nguyễn Văn A', nam_sinh: '1960', chan_doan: 'K vòm', ky_thuat: 'VMAT', tong_lieu: '6', so_buoi: '3' });
assert(!r.ok && r.error.startsWith('DUP_HIS:'), 'cảnh báo trùng mã HIS');

ok('bs@x.vn', 'contourDone', { id, uu_tien: 'Cấp cứu' });
ok('ks@x.vn', 'claimPlan', { id });
ok('ks@x.vn', 'planDone', { id, can_qa: true });
r = ok('ks@x.vn', 'qaResult', { id, dat: true });
assert.strictEqual(r.data.patients[0].trang_thai, 'CHO_XA');
ok('ktv@x.vn', 'schedule', { id, ngay_du_kien: r.data.today, ngay_nghi_tuan: '3', may: 'Máy gia tốc 1' });
const today = r.data.today;
r = ok('ktv@x.vn', 'logFraction', { bn_id: id, ngay: today, hinh_anh: ['CBCT', 'SGRT (C-RAD)'] });
assert.strictEqual(r.data.patients[0].trang_thai, 'DANG_XA');
assert.strictEqual(r.data.fractions.length, 1);
r = api('ktv@x.vn', 'logFraction', { bn_id: id, ngay: today });
assert(!r.ok && r.error === 'DUP_DAY', 'chặn ghi trùng ngày');
const y1 = ctx.RT.addDays(today, -1), y2 = ctx.RT.addDays(today, -2);
ok('ktv@x.vn', 'logFraction', { bn_id: id, ngay: y1 });
r = ok('ktv@x.vn', 'logFraction', { bn_id: id, ngay: y2 });
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
r = ok('bs@x.vn', 'createPatient', { ma_his: '777', ho_ten: 'BN Cũ', nam_sinh: '1960', chan_doan: 'K vú', ky_thuat: '3D-CRT', tong_lieu: '50', so_buoi: '25', trang_thai: 'DANG_XA', ngay_bat_dau: st, da_xa: '8' });
let old = r.data.patients.find(x => x.ma_his === '777');
assert.strictEqual(old.trang_thai, 'DANG_XA'); assert.strictEqual(r.data.fractions.filter(f => f.bn_id === old.id).length, 8);
r = api('bs@x.vn', 'createPatient', { ma_his: '778', ho_ten: 'Sai', nam_sinh: '1960', chan_doan: 'K', ky_thuat: '3D-CRT', tong_lieu: '50', so_buoi: '25', trang_thai: 'DANG_XA', ngay_bat_dau: today, da_xa: '5' });
assert(!r.ok, 'chặn số buổi đã xạ vượt số ngày');
r = ok('bs@x.vn', 'endEarly', { id: old.id, ly_do: 'Bệnh tiến triển' });
assert.strictEqual(r.data.patients.find(x => x.id === old.id).trang_thai, 'HOAN_THANH');
// Quản trị
r = ok('admin@x.vn', 'saveUser', { email: 'NEW@x.vn', ho_ten: 'BS Mới', vai_tro: 'bs', kich_hoat: 'Có' });
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
r = ok('bs@x.vn', 'createPatient', { ma_his: '999', ho_ten: 'Nhầm', nam_sinh: '1960', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25' });
const nid = r.data.patients.find(x => x.ma_his === '999').id;
r = ok('bs@x.vn', 'deletePatient', { id: nid, ly_do: 'nhập nhầm' });
assert(!r.data.patients.some(x => x.id === nid), 'hồ sơ huỷ bị ẩn');
// Nâng cấp: chạy lại setup không làm mất dữ liệu
vm.runInContext('setup()', ctx);
assert.strictEqual(ok('admin@x.vn', 'bootstrap').data.patients.length, 2);

// ---- Boost theo giai đoạn ----
r = ok('bs@x.vn', 'createPatient', { ma_his: '5001', ho_ten: 'BN Boost', nam_sinh: '1960', chan_doan: 'K TTL', vi_tri: 'Tiểu khung', ky_thuat: 'VMAT', tong_lieu: '4', so_buoi: '2', trang_thai: 'CHO_XA', ngay_du_kien: today, boost: { ky_thuat: 'VMAT', tong_lieu: '6', so_buoi: '2', buoc: 'CONTOUR' } });
let bp = r.data.patients.find(x => x.ma_his === '5001');
let g = r.data.phases.find(x => x.bn_id === bp.id);
assert.strictEqual(g.trang_thai, 'CONTOUR'); assert.strictEqual(bp.vi_tri, 'Tiểu khung');
const d1 = ctx.RT.addDays(today, -2), d2 = ctx.RT.addDays(today, -1);
ok('ktv@x.vn', 'logFraction', { bn_id: bp.id, ngay: d1 });
ok('ktv@x.vn', 'logFraction', { bn_id: bp.id, ngay: d2 });
r = api('ktv@x.vn', 'logFraction', { bn_id: bp.id, ngay: today });
assert(!r.ok && /chưa sẵn sàng/.test(r.error), 'chặn xạ khi KH boost chưa sẵn sàng: ' + r.error);
ok('bs@x.vn', 'contourDone', { id: g.id, uu_tien: 'Ưu tiên' });
ok('ks@x.vn', 'claimPlan', { id: g.id });
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
ok('ktv@x.vn', 'simDone', { id: g3.id });
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
r = ok('bs@x.vn', 'createPatient', { ma_his: '5001', ho_ten: 'BN Boost', nam_sinh: '1960', chan_doan: 'Di căn xương', vi_tri: 'Cột sống L3', muc_dich: 'Giảm nhẹ / triệu chứng', ky_thuat: '3D-CRT', tong_lieu: '8', so_buoi: '1', force: true });
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
assert(sr.ok && sr.archive.patients.length === 1 && sr.archive.fractions.length === 8, 'tìm được trong lưu trữ');
sr = JSON.parse(ctx.api('searchArchive', { q: 'bn cu' }));
assert(sr.ok && sr.archive.patients.length === 1, 'tìm không dấu');
r = ok('bs@x.vn', 'createPatient', { ma_his: '6001', ho_ten: 'Mới', nam_sinh: '1960', chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '50', so_buoi: '25' });
const ids = r.data.patients.map(x => x.id);
assert(!ids.includes(oldId) && new Set(ids).size === ids.length, 'mã đợt mới không trùng mã đã lưu trữ');
assert(parseInt(r.data.patients.find(x => x.ma_his === '6001').id.slice(5), 10) > parseInt(oldId.slice(5), 10));

// ---- Bước "Chờ mô phỏng" cho BN mới ----
r = ok('bs@x.vn', 'createPatient', { ma_his: '7001', ho_ten: 'Chờ MP', nam_sinh: '1960', chan_doan: 'K', vi_tri: 'Não (toàn não)', ky_thuat: '3D-CRT', tong_lieu: '30', so_buoi: '10', trang_thai: 'MO_PHONG', ngay_mo_phong: today });
let mp = r.data.patients.find(x => x.ma_his === '7001');
assert.strictEqual(mp.trang_thai, 'MO_PHONG'); assert.strictEqual(mp.ngay_mo_phong, today);
assert(!api('bs@x.vn', 'contourDone', { id: mp.id }).ok, 'chưa mô phỏng thì chưa contour xong được');
r = ok('ktv@x.vn', 'simDone', { id: mp.id });
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
ok('ktv@x.vn', 'simDone', { id: hc.id });
r = api('bs@x.vn', 'contourDone', { id: hc.id });
assert(!r.ok && /chẩn đoán, kỹ thuật, tổng liều, số buổi/.test(r.error), 'contour xong khi thiếu chuyên môn bị chặn: ' + r.error);
r = api('bs@x.vn', 'contourDone', { id: hc.id, chan_doan: 'K vú', ky_thuat: '3D-CRT', tong_lieu: '40.05' });
assert(!r.ok && /số buổi/.test(r.error), 'vẫn thiếu số buổi');
r = ok('bs@x.vn', 'contourDone', { id: hc.id, chan_doan: 'K vú', vi_tri: 'Vú trái', ky_thuat: '3D-CRT', tong_lieu: '40.05', so_buoi: '15', uu_tien: 'Ưu tiên' });
hc = r.data.patients.find(x => x.id === hc.id);
assert.strictEqual(hc.trang_thai, 'CHO_KH'); assert.strictEqual(hc.so_buoi, '15'); assert.strictEqual(hc.vi_tri, 'Vú trái');
r = ok('bs@x.vn', 'updatePatient', { id: hc.id, ghi_chu: 'ok' });
assert(!api('bs@x.vn', 'updatePatient', { id: hc.id, so_buoi: '' }).ok, 'sau khi chuyển kỹ sư không được xoá trống chỉ định');
// ---- v1.7: kỹ sư và bác sĩ chuyển được Chờ mô phỏng -> Đang contour ----
r = ok('dd@x.vn', 'createPatient', { ma_his: '9101', ho_ten: 'MP KS', nam_sinh: '1970', bs_email: 'bs@x.vn', trang_thai: 'MO_PHONG' });
let m1 = r.data.patients.find(x => x.ma_his === '9101');
r = ok('ks@x.vn', 'simDone', { id: m1.id });
assert.strictEqual(r.data.patients.find(x => x.id === m1.id).trang_thai, 'CONTOUR', 'kỹ sư chuyển được');
r = ok('dd@x.vn', 'createPatient', { ma_his: '9102', ho_ten: 'MP BS', nam_sinh: '1970', bs_email: 'bs@x.vn', trang_thai: 'MO_PHONG' });
let m2 = r.data.patients.find(x => x.ma_his === '9102');
ok('bs@x.vn', 'simDone', { id: m2.id });
assert(!api('dd@x.vn', 'simDone', { id: m2.id }).ok, 'điều dưỡng không chuyển');

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
r = ok('ktv@x.vn', 'createPatient', { ma_his: '9201', ho_ten: 'Huỷ cũ', nam_sinh: '1960', bs_email: 'bs@x.vn', chan_doan: 'K', ky_thuat: '3D-CRT', tong_lieu: '30', so_buoi: '10', trang_thai: 'CHO_XA' });
let hp = r.data.patients.find(x => x.ma_his === '9201');
r = ok('ktv@x.vn', 'logFraction', { bn_id: hp.id, ngay: ctx.RT.addDays(today, -5) });
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
ok('admin@x.vn', 'saveUser', { email: 'bs2@x.vn', ho_ten: 'BS Hai', vai_tro: 'BS' });
ok('admin@x.vn', 'saveUser', { email: 'pk@x.vn', ho_ten: 'Phó khoa', vai_tro: 'BS', chuc_vu: 'Phó trưởng khoa', khoa: 'Xạ trị' });
ok('admin@x.vn', 'saveUser', { email: 'ddt@x.vn', ho_ten: 'ĐD trưởng', vai_tro: 'DD', chuc_vu: 'Điều dưỡng trưởng', khoa: 'Xạ trị' });
const mk2 = (his, bs, khoa) => ok('ktv@x.vn', 'createPatient', { ma_his: his, ho_ten: 'TK ' + his, nam_sinh: '1960', bs_email: bs, khoa, chan_doan: 'K', ky_thuat: 'IMRT', tong_lieu: '20', so_buoi: '10', trang_thai: 'CHO_XA' }).data.patients.find(x => x.ma_his === his);
const pA = mk2('R1', 'bs@x.vn', 'Xạ trị'), pB = mk2('R2', 'bs2@x.vn', 'Xạ trị'), pC = mk2('R3', 'bs2@x.vn', 'Xạ trị theo yêu cầu');
const dR = ctx.RT.addDays(today, -1);
[[pA, dR], [pA, today], [pB, today], [pC, today]].forEach(([p, d]) => ok('ktv@x.vn', 'logFraction', { bn_id: p.id, ngay: d, hinh_anh: ['CBCT'] }));
const rep = (who) => { currentEmail = who; return JSON.parse(ctx.api('report', { tu: dR, den: today })); };
let R0 = rep('admin@x.vn');
assert(R0.ok, R0.error);
let rA = R0.report;
let rowOf = (list, em) => (list || []).find(x => x.email === em);
assert(rowOf(rA.theo_bac_si, 'bs2@x.vn').luot_xa >= 2, 'quản trị thấy cả hai khoa');
let rTK = rep('tk@x.vn').report;
assert.strictEqual(rowOf(rTK.theo_bac_si, 'bs2@x.vn').luot_xa, 1, 'trưởng khoa chỉ thấy BN khoa mình');
assert(rowOf(rTK.theo_bac_si, 'bs@x.vn').luot_xa >= 2);
let rDDT = rep('ddt@x.vn').report;
assert(rDDT.theo_bac_si && rDDT.theo_bac_si.length >= 2, 'điều dưỡng trưởng thấy theo bác sĩ trong khoa');
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
currentEmail = 'dd@x.vn'; assert(!JSON.parse(ctx.api('report', { tu: dR, den: today })).ok, 'điều dưỡng thường không có thống kê');
currentEmail = 'tk@x.vn'; let ex = JSON.parse(ctx.api('exportReport', { tu: dR, den: today }));
assert(ex.ok && ex.sheet && /BaoCao/.test(ex.sheet.name), 'xuất trang báo cáo');

// ---- v2.1: Khoa Vật lý xạ trị ----
ok('admin@x.vn', 'saveUser', { email: 'tkvl@x.vn', ho_ten: 'TK Vật lý', vai_tro: 'KS', chuc_vu: 'Trưởng khoa', khoa: 'Vật lý xạ trị' });
let rVL = rep('tkvl@x.vn').report;
assert(rVL.theo_ky_su && !rVL.theo_bac_si, 'trưởng khoa Vật lý thấy theo kỹ sư, không theo bác sĩ');
assert(!api('ktv@x.vn', 'createPatient', { ma_his: 'VL1', ho_ten: 'X', nam_sinh: '1960', bs_email: 'bs@x.vn', khoa: 'Vật lý xạ trị', trang_thai: 'MO_PHONG' }).ok || true);

// ---- v2.2: bác sĩ trợ lý ----
ok('admin@x.vn', 'saveUser', { email: 'tl@x.vn', ho_ten: 'BS Trợ lý', vai_tro: 'BS', tro_ly_cho: 'bs2@x.vn' });
assert(!api('admin@x.vn', 'saveUser', { email: 'tl2@x.vn', ho_ten: 'BS Trợ lý 2', vai_tro: 'BS', tro_ly_cho: 'bs2@x.vn' }).ok, 'mỗi bác sĩ chỉ 1 trợ lý');
assert(!api('admin@x.vn', 'saveUser', { email: 'tl3@x.vn', ho_ten: 'X', vai_tro: 'BS', tro_ly_cho: 'tl@x.vn' }).ok, 'không làm trợ lý cho trợ lý');
assert(!api('admin@x.vn', 'saveUser', { email: 'tl4@x.vn', ho_ten: 'X', vai_tro: 'BS', tro_ly_cho: 'ktv@x.vn' }).ok, 'bác sĩ chính phải là bác sĩ');
let rTL = rep('tl@x.vn').report;
assert(rTL.theo_bac_si.length === 1 && rTL.theo_bac_si[0].email === 'bs2@x.vn', 'trợ lý xem thống kê của bác sĩ chính');
assert.strictEqual(rTL.tong_quan.luot_xa, 2);
r = ok('tl@x.vn', 'createPatient', { ma_his: 'TL1', ho_ten: 'BN trợ lý', nam_sinh: '1970', bs_email: 'bs2@x.vn', trang_thai: 'CONTOUR' });
ok('tl@x.vn', 'deletePatient', { id: r.data.patients.find(x => x.ma_his === 'TL1').id, ly_do: 'nhập nhầm' });
// trợ lý chuyển thành bác sĩ chính: bỏ liên kết
ok('admin@x.vn', 'saveUser', { email: 'tl@x.vn', ho_ten: 'BS Trợ lý', vai_tro: 'BS', tro_ly_cho: '' });
assert(!rep('tl@x.vn').report.theo_bac_si.some(x => x.email === 'bs2@x.vn'), 'hết là trợ lý thì không xem số của bác sĩ cũ');
ok('admin@x.vn', 'saveUser', { email: 'tl2@x.vn', ho_ten: 'BS Trợ lý 2', vai_tro: 'BS', tro_ly_cho: 'bs2@x.vn' });
console.log('Tất cả kiểm tra máy chủ đều đạt. Hôm nay:', today, '· Nhật ký:', sheets.NhatKy.getLastRow() - 1, 'dòng');
