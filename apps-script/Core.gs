// Điều phối Xạ trị · phiên bản v2.5
/**
 * Lõi nghiệp vụ dùng chung cho máy chủ (Google Apps Script) và giao diện.
 * Không phụ thuộc Google: chỉ làm việc với mảng đối tượng thuần.
 * Ngày luôn lưu dạng chuỗi 'yyyy-mm-dd'.
 *
 * Một "đợt xạ" (BenhNhan) gồm giai đoạn 1 (lưu ngay trên dòng bệnh nhân) và có thể có
 * các giai đoạn boost (GiaiDoan). Mỗi giai đoạn có quy trình lập kế hoạch riêng.
 */
var RT = (function () {
  'use strict';
  var VERSION = '2.5';

  var STATUS_ORDER = ['MO_PHONG', 'CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA', 'CHO_XA', 'DANG_XA', 'TAM_NGUNG', 'HOAN_THANH'];
  var STATUS = {
    MO_PHONG: 'Chờ mô phỏng',
    CONTOUR: 'Đang contour',
    CHO_KH: 'Chờ lập KH',
    DANG_KH: 'Đang lập KH',
    CHO_QA: 'Chờ QA',
    CHO_XA: 'Chờ vào xạ',
    SAN_SANG: 'KH đã sẵn sàng',
    DANG_XA: 'Đang xạ',
    TAM_NGUNG: 'Tạm ngừng',
    HOAN_THANH: 'Hoàn thành',
    HUY: 'Đã huỷ'
  };
  var ROLES = { BS: 'Bác sĩ', KS: 'Kỹ sư', KTV: 'Kỹ thuật viên', DD: 'Điều dưỡng', ADMIN: 'Quản trị' };
  var PRIORITY_RANK = { 'Cấp cứu': 0, 'Ưu tiên': 1, 'Thường': 2 };
  var DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  var PLAN_STATES = ['MO_PHONG', 'CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA'];

  var COLS = {
    BenhNhan: ['id', 'ma_his', 'ho_ten', 'nam_sinh', 'gioi', 'chan_doan', 'khoa', 'bs_email', 'ky_thuat',
      'tong_lieu', 'so_buoi', 'igrt', 'sgrt', 'uu_tien', 'trang_thai', 'ngay_tao', 'ngay_contour_xong',
      'ks_email', 'ngay_nhan_kh', 'ngay_kh_xong', 'can_qa', 'qa_ket_qua', 'ngay_qa', 'ngay_du_kien',
      'ngay_nghi_tuan', 'may', 'ngay_bat_dau', 'ngay_ket_thuc', 'tam_ngung_tu', 'ly_do_tam_ngung',
      'ghi_chu', 'cap_nhat_luc', 'cap_nhat_boi', 'ly_do_ket_thuc', 'muc_lieu', 'vi_tri', 'muc_dich', 'ngay_mo_phong', 'nguoi_nhap', 'icd'],
    GiaiDoan: ['id', 'bn_id', 'stt', 'ky_thuat', 'tong_lieu', 'so_buoi', 'muc_lieu', 'trang_thai', 'di_cung',
      'uu_tien', 'ngay_tao', 'ngay_mo_phong', 'ngay_contour_xong', 'ks_email', 'ngay_nhan_kh', 'ngay_kh_xong',
      'can_qa', 'qa_ket_qua', 'ngay_qa', 'ghi_chu', 'cap_nhat_luc', 'cap_nhat_boi'],
    BuoiXa: ['id', 'bn_id', 'ngay', 'buoi_so', 'ktv_email', 'thoi_gian', 'hinh_anh', 'ghi_chu',
      'da_huy', 'huy_boi', 'ly_do_huy', 'gd'],
    LichNgoaiLe: ['id', 'bn_id', 'may', 'ngay', 'loai', 'ghi_chu', 'nguoi', 'thoi_gian', 'da_xoa'],
    NguoiDung: ['email', 'ho_ten', 'vai_tro', 'kich_hoat', 'chuc_vu', 'khoa', 'tro_ly_cho'],
    PhanCong: ['id', 'ngay', 'vi_tri', 'nhan_vien', 'ghi_chu', 'nguoi', 'thoi_gian'],
    ChiMuc: ['id', 'ma_his', 'ho_ten', 'ten_kd', 'nam_sinh', 'khoa', 'bs_email', 'icd', 'chan_doan', 'vi_tri', 'ky_thuat', 'tong_lieu', 'so_buoi',
      'da_xa', 'ngay_tao', 'ngay_bat_dau', 'ngay_ket_thuc', 'trang_thai', 'luu_tru', 'cap_nhat'],
    DanhMuc: ['loai', 'gia_tri'],
    NhatKy: ['thoi_gian', 'email', 'thao_tac', 'bn_id', 'chi_tiet']
  };

  var DEFAULT_DM = {
    TEN_DON_VI: ['Khoa Xạ trị theo yêu cầu · Bệnh viện Ung Bướu Hà Nội'],
    KY_THUAT: ['3D-CRT', 'IMRT', 'VMAT', 'SRS/SBRT', 'Khác'],
    IGRT: ['Không', 'CBCT hằng ngày', 'CBCT 3 buổi đầu, sau đó hằng tuần', 'CBCT hằng tuần', 'kV-kV hằng ngày', 'kV-kV hằng tuần'],
    HINH_ANH: ['CBCT', 'kV-kV (2D)', 'MV portal', 'SGRT (C-RAD)'],
    KHOA: ['Xạ trị theo yêu cầu', 'Xạ trị'],
    MAY: ['Máy gia tốc 1'],
    UU_TIEN: ['Cấp cứu', 'Ưu tiên', 'Thường'],
    LY_DO_TAM_NGUNG: ['Tác dụng phụ', 'Máy hỏng / bảo trì', 'BN xin nghỉ', 'Bệnh lý khác, đang điều trị', 'Không liên lạc được', 'Khác'],
    NGAY_LE: []
  };
  DEFAULT_DM.MUC_DICH = ['Triệt căn', 'Bổ trợ', 'Giảm nhẹ / triệu chứng', 'Xạ lại'];
  DEFAULT_DM.VI_TRI = ['Đầu cổ', 'Vòm họng', 'Não (toàn não)', 'Não (khu trú)', 'Vú trái', 'Vú phải', 'Thành ngực',
    'Phổi', 'Thực quản', 'Trung thất', 'Dạ dày', 'Tuỵ', 'Gan', 'Trực tràng', 'Cổ tử cung', 'Nội mạc tử cung',
    'Tuyến tiền liệt', 'Bàng quang', 'Tiểu khung', 'Cột sống cổ', 'Cột sống ngực', 'Cột sống thắt lưng',
    'Xương chậu', 'Xương chi', 'Hạch', 'Da / mô mềm'];
  DEFAULT_DM.VI_TRI_PC = ['Máy gia tốc 1 – ca sáng', 'Máy gia tốc 1 – ca chiều', 'Mô phỏng CT', 'Làm mặt nạ / cố định', 'Trực'];
  var CHUC_VU = ['KTV trưởng', 'Điều dưỡng trưởng', 'Trưởng khoa', 'Phó trưởng khoa', 'Trưởng phòng', 'Tài khoản khoa'];
  /** Chức vụ được xem thống kê theo người của cả khoa mình */
  var KHOA_STATS = ['Trưởng khoa', 'Điều dưỡng trưởng', 'Tài khoản khoa'];
  /** Đơn vị của nhân viên: các khoa điều trị (danh mục KHOA) + khoa không nhận bệnh nhân */
  var KHOA_KHAC = ['Vật lý xạ trị'];
  function staffKhoa(dm) { return (dm.KHOA || []).concat(KHOA_KHAC.filter(function (k) { return (dm.KHOA || []).indexOf(k) < 0; })); }
  var DM_EDITABLE = ['VI_TRI_PC', 'VI_TRI', 'MUC_DICH', 'MAY', 'NGAY_LE', 'KY_THUAT', 'IGRT', 'HINH_ANH', 'KHOA', 'LY_DO_TAM_NGUNG', 'TEN_DON_VI'];

  var PERM = {
    createPatient: ['BS', 'KS', 'KTV', 'DD', 'ADMIN'],
    updatePatient: ['BS', 'ADMIN'],
    contourDone: ['BS', 'ADMIN'],
    setPriority: ['BS', 'KS', 'ADMIN'],
    claimPlan: ['KS', 'ADMIN'],
    planDone: ['KS', 'ADMIN'],
    qaResult: ['KS', 'ADMIN'],
    returnToDoctor: ['KS', 'ADMIN'],
    schedule: ['KTV', 'ADMIN'],
    setDay: ['KTV', 'ADMIN'],
    machineDown: ['KTV', 'ADMIN'],
    machineUp: ['KTV', 'ADMIN'],
    logFraction: ['KTV', 'ADMIN'],
    undoFraction: ['KTV', 'ADMIN'],
    pause: ['BS', 'KTV', 'ADMIN'],
    resume: ['BS', 'KTV', 'ADMIN'],
    endEarly: ['BS', 'ADMIN'],
    deletePatient: ['BS', 'ADMIN'],
    addPhase: ['BS', 'ADMIN'],
    updatePhase: ['BS', 'ADMIN'],
    deletePhase: ['BS', 'ADMIN'],
    simDone: ['KTV', 'BS', 'KS', 'ADMIN'],
    saveUser: ['ADMIN'],
    dmAdd: ['ADMIN'],
    dmRemove: ['ADMIN']
  };
  PERM.setNotice = ['KTV', 'KS', 'ADMIN'];
  PERM.clearNotice = ['KTV', 'KS', 'ADMIN'];
  PERM.setRoster = ['ADMIN'];
  PERM.copyRoster = ['ADMIN'];
  // Quyền thêm theo chức vụ (ngoài quyền của vai trò)
  var LEAD_PERM = {
    setRoster: ['KTV trưởng'], copyRoster: ['KTV trưởng'], machineDown: ['KTV trưởng'], machineUp: ['KTV trưởng'],
    setNotice: CHUC_VU, clearNotice: CHUC_VU
  };
  /** Các bác sĩ mà người này phụ trách bệnh nhân: chính mình + bác sĩ chính nếu là trợ lý */
  function myDoctors(u) { return u ? [u.email].concat(u.tro_ly_cho && u.vai_tro === 'BS' ? [u.tro_ly_cho] : []) : []; }
  function isLead(u) { return !!(u && u.chuc_vu && CHUC_VU.indexOf(u.chuc_vu) >= 0); }
  function can(role, action, user) {
    if ((PERM[action] || []).indexOf(role) >= 0) return true;
    return !!(user && user.chuc_vu && (LEAD_PERM[action] || []).indexOf(user.chuc_vu) >= 0);
  }

  // ---------- Ngày ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function d2s(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function s2d(s) { var p = String(s).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function addDays(s, n) { var d = s2d(s); d.setUTCDate(d.getUTCDate() + n); return d2s(d); }
  function dow(s) { return s2d(s).getUTCDay(); }
  function diffDays(a, b) { return Math.round((s2d(b) - s2d(a)) / 86400000); }
  function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')); }
  function monday(s) { return addDays(s, -((dow(s) + 6) % 7)); }

  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; }
  function round2(n) { return Math.round(n * 100) / 100; }
  function splitList(s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }

  // ---------- Môi trường lịch: ngày lễ, máy nghỉ, ngoại lệ từng BN, giai đoạn ----------
  /** env = { today, holidays[], exBy{bn_id:{ngay:'XA'|'NGHI'}}, down{may:{ngay:row}}, phasesBy{bn_id:[...]}, defMay } */
  function makeEnv(today, holidays, exceptions, phases, defMay) {
    var env = { today: today, holidays: holidays || [], exBy: {}, down: {}, phasesBy: {}, defMay: defMay || '' };
    (exceptions || []).forEach(function (e) {
      if (e.da_xoa === 'Có') return;
      if (e.loai === 'MAY_NGHI') { (env.down[e.may] = env.down[e.may] || {})[e.ngay] = e; return; }
      if (e.bn_id) (env.exBy[e.bn_id] = env.exBy[e.bn_id] || {})[e.ngay] = e.loai;
    });
    (phases || []).forEach(function (g) {
      if (g.trang_thai === 'HUY') return;
      (env.phasesBy[g.bn_id] = env.phasesBy[g.bn_id] || []).push(g);
    });
    Object.keys(env.phasesBy).forEach(function (k) { env.phasesBy[k].sort(function (a, b) { return num(a.stt) - num(b.stt); }); });
    return env;
  }
  function asEnv(e) { return Array.isArray(e) || !e || typeof e !== 'object' ? makeEnv('', Array.isArray(e) ? e : [], [], [], '') : e; }
  function envOf(ctx) { return makeEnv(ctx.today, ctx.holidays, ctx.exceptions, ctx.phases, (ctx.dm.MAY || [])[0]); }

  function offDay(p) { var o = parseInt(p.ngay_nghi_tuan, 10); return o >= 1 && o <= 5 ? o : 0; }
  function patternDay(p, s) {
    var w = dow(s), off = offDay(p);
    if (off) return w >= 1 && w <= 6 && w !== off;
    return w >= 1 && w <= 5;
  }
  function machineOf(p, env) { return p.may || env.defMay; }
  function isDown(p, s, env) { env = asEnv(env); var m = machineOf(p, env); return !!(env.down[m] && env.down[m][s]); }
  /** Ngày xạ theo lịch, chưa tính ngoại lệ riêng của BN */
  function baseDay(p, s, env) {
    env = asEnv(env);
    if (env.holidays.indexOf(s) >= 0 || isDown(p, s, env)) return false;
    return patternDay(p, s);
  }
  function isTreatDay(p, s, env) {
    env = asEnv(env);
    if (env.holidays.indexOf(s) >= 0 || isDown(p, s, env)) return false;
    var e = env.exBy[p.id] && env.exBy[p.id][s];
    if (e === 'XA') return true;
    if (e === 'NGHI') return false;
    return patternDay(p, s);
  }
  function exceptionOf(p, s, env) { env = asEnv(env); return (env.exBy[p.id] && env.exBy[p.id][s]) || ''; }
  function scheduleLabel(p) { var off = offDay(p); return off ? 'T2–T7, nghỉ ' + DOW[off] : 'T2–T6'; }
  function needsOffDay(p) { return /IMRT|VMAT/i.test(p.ky_thuat || '') && !offDay(p); }

  function dosePerFx(x) { var n = num(x.so_buoi); return n ? round2(num(x.tong_lieu) / n) : 0; }

  function fxOf(p, fractions) {
    return fractions.filter(function (f) { return f.bn_id === p.id && f.da_huy !== 'Có'; })
      .sort(function (a, b) {
        if (a.ngay !== b.ngay) return a.ngay < b.ngay ? -1 : 1;
        return String(a.thoi_gian) < String(b.thoi_gian) ? -1 : 1;
      });
  }
  function phasesOf(p, env) { return (asEnv(env).phasesBy[p.id] || []).slice(); }
  /** Các giai đoạn của đợt xạ, theo thứ tự: GĐ1 (trên dòng BN) rồi các boost */
  function segments(p, env) {
    var segs = [{ stt: 1, label: 'GĐ1', ky_thuat: p.ky_thuat, so_buoi: Math.round(num(p.so_buoi)), tong_lieu: num(p.tong_lieu), d: dosePerFx(p), ready: true, g: null }];
    phasesOf(p, env).forEach(function (g) {
      segs.push({ stt: num(g.stt), label: 'GĐ' + g.stt, ky_thuat: g.ky_thuat, so_buoi: Math.round(num(g.so_buoi)), tong_lieu: num(g.tong_lieu), d: dosePerFx(g), ready: g.trang_thai === 'SAN_SANG', g: g });
    });
    var from = 0;
    segs.forEach(function (s) { s.from = from; from += s.so_buoi; s.to = from; });
    return segs;
  }
  function segAt(segs, idx) { for (var i = 0; i < segs.length; i++) if (idx < segs[i].to) return segs[i]; return segs[segs.length - 1]; }
  function totalFx(p, env) { var s = segments(p, env); return s[s.length - 1].to; }

  /** Tiến độ, ngày vắng, lịch dự kiến của một đợt xạ (gồm cả boost). */
  function course(p, fractions, env) {
    env = asEnv(env);
    var today = env.today;
    var fx = fxOf(p, fractions);
    var segs = segments(p, env);
    var total = segs[segs.length - 1].to;
    var doseTotal = round2(segs.reduce(function (a, s) { return a + s.tong_lieu; }, 0));
    var readyTo = 0;
    for (var r = 0; r < segs.length && segs[r].ready; r++) readyTo = segs[r].to;
    var doneDates = {}, doseDone = 0;
    fx.forEach(function (f, i) { doneDates[f.ngay] = (doneDates[f.ngay] || 0) + 1; doseDone += segAt(segs, i).d; });
    var start = p.ngay_bat_dau || (fx[0] && fx[0].ngay) || p.ngay_du_kien || '';
    var missed = [], projected = [];
    if (fx.length && isDate(start)) {
      var stop = p.trang_thai === 'HOAN_THANH' ? fx[fx.length - 1].ngay : addDays(today, -1);
      for (var s = start, i = 0; s <= stop && i < 800; s = addDays(s, 1), i++) {
        if (isTreatDay(p, s, env) && !doneDates[s]) missed.push(s);
      }
    }
    var remaining = total - fx.length;
    if (remaining > 0 && p.trang_thai !== 'HOAN_THANH' && isDate(start)) {
      var c = start > today ? start : today;
      if (c === today && doneDates[today]) c = addDays(today, 1);
      for (var j = 0; remaining > 0 && j < 800; j++, c = addDays(c, 1)) {
        if (isTreatDay(p, c, env)) { projected.push(c); remaining--; }
      }
    }
    var end = projected.length ? projected[projected.length - 1] : (fx.length ? fx[fx.length - 1].ngay : '');
    var imaging = {};
    fx.forEach(function (f) { splitList(f.hinh_anh).forEach(function (k) { (imaging[k] = imaging[k] || []).push(f.ngay); }); });
    var cur = segAt(segs, Math.min(fx.length, total - 1));
    return {
      fx: fx, done: fx.length, total: total, segs: segs, cur: cur, multi: segs.length > 1,
      dosePerFx: cur.d, doseDone: round2(doseDone), doseTotal: doseTotal,
      readyTo: readyTo, blocked: fx.length >= readyTo && fx.length < total,
      leftBeforeBlock: Math.max(0, readyTo - fx.length),
      start: start, missed: missed, projected: projected, tentativeFrom: Math.max(0, readyTo - fx.length), end: end, imaging: imaging,
      doneToday: !!doneDates[today], treatToday: isTreatDay(p, today, env), doneDates: doneDates
    };
  }

  /** Hàng đợi lập kế hoạch (cả GĐ1 và boost). Cấp cứu → Ưu tiên → Thường; boost sắp hết GĐ trước lên trước; còn lại ai contour xong trước làm trước. */
  function planningQueue(items, urgentOf) {
    return items.filter(function (x) { return x.trang_thai === 'CHO_KH'; }).sort(function (a, b) {
      var ra = PRIORITY_RANK[a.uu_tien] != null ? PRIORITY_RANK[a.uu_tien] : 2;
      var rb = PRIORITY_RANK[b.uu_tien] != null ? PRIORITY_RANK[b.uu_tien] : 2;
      if (ra !== rb) return ra - rb;
      var ua = urgentOf ? urgentOf(a) : 99, ub = urgentOf ? urgentOf(b) : 99;
      if (ua !== ub) return ua - ub;
      var da = a.ngay_contour_xong || a.ngay_tao, db = b.ngay_contour_xong || b.ngay_tao;
      if (da !== db) return da < db ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
  }

  // ---------- Thao tác ----------
  var EDIT_FIELDS = ['ma_his', 'ho_ten', 'nam_sinh', 'gioi', 'icd', 'chan_doan', 'vi_tri', 'muc_dich', 'ngay_mo_phong', 'khoa', 'bs_email', 'ky_thuat',
    'tong_lieu', 'so_buoi', 'muc_lieu', 'igrt', 'sgrt', 'uu_tien', 'may', 'ghi_chu'];
  var PHASE_FIELDS = ['ky_thuat', 'tong_lieu', 'so_buoi', 'muc_lieu', 'uu_tien', 'ngay_mo_phong', 'ghi_chu'];

  function fail(msg) { throw new Error(msg); }
  function findP(ctx, id) {
    for (var i = 0; i < ctx.patients.length; i++) if (ctx.patients[i].id === id) return ctx.patients[i];
    return fail('Không tìm thấy bệnh nhân.');
  }
  function findG(ctx, id) {
    for (var i = 0; i < ctx.phases.length; i++) if (ctx.phases[i].id === id && ctx.phases[i].trang_thai !== 'HUY') return ctx.phases[i];
    return null;
  }
  /** Đối tượng được thao tác: bệnh nhân (GĐ1) hoặc một giai đoạn boost */
  function target(ctx, id) {
    var g = findG(ctx, id);
    if (g) return { g: g, p: findP(ctx, g.bn_id), x: g, name: findP(ctx, g.bn_id).ho_ten + ' (boost GĐ' + g.stt + ')' };
    var p = findP(ctx, id);
    return { g: null, p: p, x: p, name: p.ho_ten };
  }
  function need(x, statuses, msg) {
    if (statuses.indexOf(x.trang_thai) < 0) fail(msg || ('Không thực hiện được khi đang ở trạng thái "' + (STATUS[x.trang_thai] || x.trang_thai) + '".'));
  }
  function save(ctx, p, action, detail) {
    p.cap_nhat_luc = ctx.now; p.cap_nhat_boi = ctx.user.email;
    ctx.savePatient(p);
    ctx.log(action, p.id, detail || '');
  }
  function saveT(ctx, t, action, detail) {
    if (!t.g) return save(ctx, t.p, action, detail);
    t.g.cap_nhat_luc = ctx.now; t.g.cap_nhat_boi = ctx.user.email;
    ctx.savePhase(t.g);
    ctx.log(action, t.p.id, 'Boost GĐ' + t.g.stt + (detail ? ': ' + detail : ''));
  }
  function clean(a, fields) {
    var o = {};
    fields.forEach(function (k) { if (a[k] !== undefined && a[k] !== null) o[k] = String(a[k]).trim(); });
    return o;
  }
  function validateRx(x, what) {
    if (!x.ky_thuat) fail('Cần chọn kỹ thuật xạ' + (what || '') + '.');
    if (!(num(x.tong_lieu) > 0)) fail('Tổng liều' + (what || '') + ' phải lớn hơn 0.');
    var n = num(x.so_buoi);
    if (!(n >= 1 && n <= 60 && Math.round(n) === n)) fail('Số buổi' + (what || '') + ' phải là số nguyên từ 1 đến 60.');
  }
  /** Phần hành chính: luôn bắt buộc */
  function validateBasic(p, today) {
    if (!p.ma_his) fail('Cần nhập mã BN trên HIS.');
    if (!p.ho_ten) fail('Cần nhập họ tên bệnh nhân.');
    var y = num(p.nam_sinh), cur = parseInt(String(today || '').slice(0, 4), 10) || new Date().getFullYear();
    if (y > 0 && y < 130 && Math.round(y) === y) p.nam_sinh = String(cur - y);   // nhập tuổi → đổi ra năm sinh
    y = num(p.nam_sinh);
    if (!(y >= 1900 && y <= cur)) fail('Cần nhập năm sinh (hoặc tuổi) của bệnh nhân.');
    if (p.icd) { p.icd = normIcd(p.icd); if (!isIcd(p.icd)) fail('Mã ICD-10 không đúng dạng (VD: C11 hoặc C11.9).'); }
    if (p.tong_lieu !== '' && p.tong_lieu != null && !(num(p.tong_lieu) > 0)) fail('Tổng liều phải lớn hơn 0.');
    if (p.so_buoi !== '' && p.so_buoi != null) {
      var n = num(p.so_buoi);
      if (!(n >= 1 && n <= 60 && Math.round(n) === n)) fail('Số buổi phải là số nguyên từ 1 đến 60.');
    }
  }
  /** Phần chuyên môn còn thiếu (cần đủ trước khi chuyển kỹ sư) */
  function normIcd(v) { return String(v || '').trim().toUpperCase().replace(/\s+/g, '').replace(/^([A-Z]\d\d)(\d)/, '$1.$2'); }
  function isIcd(v) { return /^[A-Z]\d\d(\.\d{1,3})?$/.test(v); }
  var icdMap = null;
  /** Tên bệnh theo mã ICD-10 (danh mục BYT, mã C và D). Mã con có tên ngắn thì ghép thêm tên mã cha. */
  function icdName(v) {
    if (typeof ICD10 === 'undefined') return '';
    if (!icdMap) { icdMap = {}; ICD10.forEach(function (x) { icdMap[x[0]] = x[1]; }); }
    var c = normIcd(v), n = icdMap[c];
    if (!n) return '';
    if (c.length > 3) {
      var parent = icdMap[c.slice(0, 3)];
      if (parent && !/^(u |ung thư|carcinom|sarcom|lymphom|bệnh|đa u|bạch cầu|tân sinh)/i.test(n)) n = parent + ': ' + n.charAt(0).toLowerCase() + n.slice(1);
    }
    return n;
  }
  /** Phần chuyên môn còn thiếu. needIcd: bắt buộc mã ICD (khi chuyển kỹ sư) */
  function missingRx(p, needIcd) {
    var m = [];
    if (needIcd && !isIcd(normIcd(p.icd))) m.push('mã ICD-10');
    if (!p.chan_doan) m.push('chẩn đoán');
    if (!p.ky_thuat) m.push('kỹ thuật');
    if (!(num(p.tong_lieu) > 0)) m.push('tổng liều');
    if (!(num(p.so_buoi) >= 1)) m.push('số buổi');
    return m;
  }
  function validate(p, today, needIcd) {
    validateBasic(p, today);
    var m = missingRx(p, needIcd);
    if (m.length) fail('Cần nhập đủ phần chuyên môn: ' + m.join(', ') + '.');
    validateRx(p);
  }
  var EARLY = ['MO_PHONG', 'CONTOUR'];
  function fold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim(); }
  /** Các đợt xạ cùng mã HIS: đang có trong hệ thống + chỉ mục (gồm đợt đã lưu trữ) */
  function hisCourses(ctx, ma, exceptId) {
    var seen = {}, out = [];
    ctx.patients.forEach(function (p) { if (p.ma_his === ma && p.trang_thai !== 'HUY' && p.id !== exceptId) { seen[p.id] = 1; out.push(p); } });
    (ctx.hisLookup ? ctx.hisLookup(ma) : []).forEach(function (r) { if (!seen[r.id] && r.trang_thai !== 'HUY' && r.id !== exceptId) out.push(r); });
    return out;
  }
  /** Kiểm tra mã HIS khi thêm/sửa: chặn trùng đợt đang hoạt động và trùng mã khác tên (trừ khi người dùng xác nhận) */
  function checkHis(ctx, p, a, exceptId) {
    var others = hisCourses(ctx, p.ma_his, exceptId);
    var active = others.filter(function (x) { return ['HOAN_THANH', 'HUY'].indexOf(x.trang_thai) < 0 && x.luu_tru !== 'Có'; })[0];
    if (active && !a.force) fail('DUP_HIS:' + active.ho_ten + ' (' + active.id + ', ' + (STATUS[active.trang_thai] || active.trang_thai) + ')');
    var diff = others.filter(function (x) { return fold(x.ho_ten) !== fold(p.ho_ten); })[0];
    if (diff && !a.force_name) fail('HIS_NAME:' + diff.ho_ten + ' (' + diff.id + ')');
  }
  function nextId(ctx) {
    var prefix = 'XT' + ctx.today.slice(2, 4) + '-', max = ctx.idFloor ? ctx.idFloor(prefix) : 0;
    ctx.patients.forEach(function (p) {
      if (String(p.id).indexOf(prefix) === 0) max = Math.max(max, parseInt(String(p.id).slice(prefix.length), 10) || 0);
    });
    var n = String(max + 1);
    while (n.length < 4) n = '0' + n;
    return prefix + n;
  }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function blank(cols) { var o = {}; cols.forEach(function (c) { o[c] = ''; }); return o; }
  function note(x, today, text) { x.ghi_chu = (x.ghi_chu ? x.ghi_chu + '\n' : '') + '[' + today + '] ' + text; }

  function newPhase(ctx, p, a) {
    var o = clean(a, PHASE_FIELDS);
    var g = blank(COLS.GiaiDoan);
    Object.keys(o).forEach(function (k) { g[k] = o[k]; });
    validateRx(g, ' của boost');
    var buoc = a.buoc || 'CONTOUR';
    if (['CUNG_LUC', 'MO_PHONG', 'CONTOUR', 'CHO_KH', 'SAN_SANG'].indexOf(buoc) < 0) fail('Kiểu boost không hợp lệ.');
    var maxStt = 1;
    ctx.phases.forEach(function (x) { if (x.bn_id === p.id) maxStt = Math.max(maxStt, num(x.stt)); });
    g.stt = String(maxStt + 1);
    g.id = p.id + '-G' + g.stt;
    g.bn_id = p.id;
    g.ngay_tao = ctx.today;
    if (!g.uu_tien) g.uu_tien = p.uu_tien || 'Thường';
    if (buoc === 'CUNG_LUC') {
      g.di_cung = 'Có';
      buoc = p.trang_thai === 'MO_PHONG' ? 'MO_PHONG' : p.trang_thai === 'CONTOUR' ? 'CONTOUR' : 'CHO_KH';
    }
    g.trang_thai = buoc;
    if (buoc === 'MO_PHONG' && g.ngay_mo_phong && !isDate(g.ngay_mo_phong)) fail('Ngày mô phỏng không hợp lệ.');
    if (buoc !== 'MO_PHONG') g.ngay_mo_phong = '';
    if (buoc === 'CHO_KH' || buoc === 'SAN_SANG') g.ngay_contour_xong = ctx.today;
    if (buoc === 'SAN_SANG') { g.ngay_kh_xong = ctx.today; g.qa_ket_qua = 'Nhập ban đầu'; }
    ctx.phases.push(g);
    return g;
  }

  function finishIfDone(ctx, p) {
    var env = envOf(ctx), done = fxOf(p, ctx.fractions).length, total = totalFx(p, env);
    if ((p.trang_thai === 'DANG_XA' || p.trang_thai === 'TAM_NGUNG') && done >= total) {
      p.trang_thai = 'HOAN_THANH';
      var fx = fxOf(p, ctx.fractions);
      p.ngay_ket_thuc = fx.length ? fx[fx.length - 1].ngay : ctx.today;
      return true;
    }
    return false;
  }

  var H = {
    createPatient: function (ctx, a) {
      var o = clean(a, EDIT_FIELDS);
      var p = blank(COLS.BenhNhan);
      Object.keys(o).forEach(function (k) { p[k] = o[k]; });
      if (!p.bs_email && ctx.user.vai_tro === 'BS') p.bs_email = ctx.user.email;
      // Người không phải bác sĩ nhập theo phiếu chỉ định: bắt buộc chọn bác sĩ điều trị
      if (!p.bs_email) fail('Cần chọn bác sĩ điều trị (bác sĩ ghi trên phiếu chỉ định).');
      var bsU = ctx.users.filter(function (u) { return u.email === p.bs_email && u.kich_hoat !== 'Không'; })[0];
      if (!bsU || (bsU.vai_tro !== 'BS' && bsU.vai_tro !== 'ADMIN')) fail('Bác sĩ điều trị không có trong danh sách bác sĩ.');
      p.nguoi_nhap = ctx.user.email;
      if (!p.uu_tien) p.uu_tien = 'Thường';
      if (!p.igrt) p.igrt = 'Không';
      if (!p.sgrt) p.sgrt = 'Không';
      var step0 = a.trang_thai || 'CONTOUR';
      if (EARLY.indexOf(step0) >= 0 && !a.boost) validateBasic(p, ctx.today); else validate(p, ctx.today, step0 === 'CHO_KH');
      if (a.boost) validateRx(a.boost, ' của boost');
      checkHis(ctx, p, a, '');
      var step = a.trang_thai || 'CONTOUR';
      if (['MO_PHONG', 'CONTOUR', 'CHO_KH', 'CHO_XA', 'DANG_XA'].indexOf(step) < 0) fail('Bước hiện tại không hợp lệ.');
      if (step === 'MO_PHONG' && p.ngay_mo_phong && !isDate(p.ngay_mo_phong)) fail('Ngày hẹn mô phỏng không hợp lệ.');
      if (step !== 'MO_PHONG') p.ngay_mo_phong = p.ngay_mo_phong || '';
      var nn = String(a.ngay_nghi_tuan || '');
      if (nn && !/^[1-5]$/.test(nn)) fail('Ngày nghỉ trong tuần không hợp lệ.');
      p.ngay_nghi_tuan = nn;
      p.id = nextId(ctx);
      var env = envOf(ctx);
      var backfill = [];
      if (step === 'DANG_XA') {
        var start = a.ngay_bat_dau, done = num(a.da_xa);
        if (!isDate(start) || start > ctx.today) fail('Cần nhập ngày bắt đầu xạ (không sau hôm nay).');
        if (!(done >= 1 && Math.round(done) === done)) fail('Số buổi đã xạ phải là số nguyên từ 1.');
        var lim = num(p.so_buoi) + (a.boost && a.boost.buoc === 'SAN_SANG' ? num(a.boost.so_buoi) : 0);
        if (done >= lim) fail('Số buổi đã xạ phải nhỏ hơn tổng số buổi.');
        if (done > num(p.so_buoi) && !(a.boost && a.boost.buoc === 'SAN_SANG')) fail('Số buổi đã xạ vượt GĐ1; hãy chọn boost "Đã có KH boost".');
        for (var s = start, i = 0; backfill.length < done && s <= ctx.today && i < 400; s = addDays(s, 1), i++) {
          if (isTreatDay(p, s, env)) backfill.push(s);
        }
        if (backfill.length < done) fail('Từ ' + start + ' tới hôm nay chỉ có ' + backfill.length + ' ngày xạ theo lịch tuần đã chọn, ít hơn số buổi đã xạ.');
      }
      if (step === 'CHO_XA' && a.ngay_du_kien) {
        if (!isDate(a.ngay_du_kien)) fail('Ngày xạ dự kiến không hợp lệ.');
        p.ngay_du_kien = a.ngay_du_kien;
      }
      p.ngay_tao = ctx.today;
      p.trang_thai = step;
      if (step !== 'CONTOUR' && step !== 'MO_PHONG') p.ngay_contour_xong = ctx.today;
      if (step === 'CHO_XA' || step === 'DANG_XA') { p.ngay_kh_xong = ctx.today; p.qa_ket_qua = 'Nhập ban đầu'; }
      if (step === 'DANG_XA') { p.ngay_bat_dau = backfill[0]; p.ngay_du_kien = backfill[0]; }
      ctx.patients.push(p);
      var g = null;
      if (a.boost) { g = newPhase(ctx, p, a.boost); ctx.savePhase(g); }
      var segs = segments(p, envOf(ctx));
      backfill.forEach(function (d, k) {
        var f = blank(COLS.BuoiXa);
        f.id = uid('B') + k; f.bn_id = p.id; f.ngay = d; f.buoi_so = String(k + 1); f.ktv_email = ctx.user.email;
        f.thoi_gian = ctx.now; f.ghi_chu = 'Nhập ban đầu'; f.gd = String(segAt(segs, k).stt);
        ctx.fractions.push(f);
        ctx.addFraction(f);
      });
      save(ctx, p, 'Thêm BN', p.ho_ten + ' · ' + p.ky_thuat + ' ' + p.tong_lieu + ' Gy/' + p.so_buoi + ' buổi · ' + STATUS[step] +
        (g ? ' · boost ' + g.tong_lieu + ' Gy/' + g.so_buoi : '') + (backfill.length ? ' · đã xạ ' + backfill.length + ' buổi' : ''));
      return 'Đã thêm ' + p.ho_ten + ' (' + STATUS[p.trang_thai] + ').';
    },
    updatePatient: function (ctx, a) {
      var p = findP(ctx, a.id), o = clean(a, EDIT_FIELDS), merged = {};
      Object.keys(p).forEach(function (k) { merged[k] = p[k]; });
      Object.keys(o).forEach(function (k) { merged[k] = o[k]; });
      if (EARLY.indexOf(p.trang_thai) >= 0) validateBasic(merged, ctx.today); else validate(merged, ctx.today);
      if (merged.icd !== (o.icd === undefined ? merged.icd : o.icd)) o.icd = merged.icd;
      if (o.icd !== undefined) o.icd = merged.icd;
      if ((o.ma_his !== undefined && o.ma_his !== p.ma_his) || (o.ho_ten !== undefined && fold(o.ho_ten) !== fold(p.ho_ten))) checkHis(ctx, merged, a, p.id);
      if (merged.nam_sinh !== p.nam_sinh) o.nam_sinh = merged.nam_sinh;
      var done = fxOf(p, ctx.fractions).length;
      if (num(merged.so_buoi) !== num(p.so_buoi)) {
        var hasPhases = phasesOf(p, envOf(ctx)).length > 0;
        if (hasPhases && done >= num(p.so_buoi)) fail('GĐ1 đã xạ xong, không đổi được số buổi GĐ1.');
        if (num(merged.so_buoi) < done && !hasPhases) fail('Số buổi không được nhỏ hơn số buổi đã xạ (' + done + ').');
        if (hasPhases && num(merged.so_buoi) < done) fail('Số buổi GĐ1 không được nhỏ hơn số buổi đã xạ (' + done + ').');
      }
      var changed = [];
      Object.keys(o).forEach(function (k) { if (String(p[k]) !== o[k]) { changed.push(k); p[k] = o[k]; } });
      if (!changed.length) return 'Không có gì thay đổi.';
      finishIfDone(ctx, p);
      save(ctx, p, 'Sửa thông tin', changed.join(', '));
      return 'Đã lưu thông tin ' + p.ho_ten + '.';
    },
    contourDone: function (ctx, a) {
      var t = target(ctx, a.id);
      need(t.x, ['CONTOUR']);
      if (!t.g) {
        var add = clean(a, ['icd', 'chan_doan', 'vi_tri', 'muc_dich', 'ky_thuat', 'tong_lieu', 'so_buoi', 'muc_lieu', 'igrt', 'sgrt']);
        if (add.icd) add.icd = normIcd(add.icd);
        var merged = {};
        Object.keys(t.p).forEach(function (k) { merged[k] = t.p[k]; });
        Object.keys(add).forEach(function (k) { if (add[k] !== '') merged[k] = add[k]; });
        var miss = missingRx(merged, true);
        if (miss.length) fail('Chưa chuyển kỹ sư được. Cần nhập đủ: ' + miss.join(', ') + '.');
        validateRx(merged);
        Object.keys(add).forEach(function (k) { if (add[k] !== '') t.p[k] = add[k]; });
      }
      if (a.uu_tien) t.x.uu_tien = a.uu_tien;
      t.x.trang_thai = 'CHO_KH';
      t.x.ngay_contour_xong = ctx.today;
      saveT(ctx, t, 'Contour xong', 'Ưu tiên: ' + t.x.uu_tien);
      var extra = 0;
      if (!t.g) {
        ctx.phases.forEach(function (g) {
          if (g.bn_id === t.p.id && g.di_cung === 'Có' && g.trang_thai === 'CONTOUR') {
            g.trang_thai = 'CHO_KH'; g.ngay_contour_xong = ctx.today; if (a.uu_tien) g.uu_tien = a.uu_tien;
            saveT(ctx, { g: g, p: t.p, x: g }, 'Contour xong', 'cùng GĐ1'); extra++;
          }
        });
      }
      return 'Đã chuyển ' + t.name + ' sang kỹ sư lập kế hoạch' + (extra ? ' (kèm KH boost)' : '') + '.';
    },
    setPriority: function (ctx, a) {
      var t = target(ctx, a.id);
      if (PRIORITY_RANK[a.uu_tien] == null) fail('Mức ưu tiên không hợp lệ.');
      t.x.uu_tien = a.uu_tien;
      saveT(ctx, t, 'Đổi ưu tiên', a.uu_tien);
      return 'Đã đặt ưu tiên "' + a.uu_tien + '" cho ' + t.name + '.';
    },
    claimPlan: function (ctx, a) {
      var t = target(ctx, a.id);
      need(t.x, ['CHO_KH']);
      t.x.trang_thai = 'DANG_KH'; t.x.ks_email = ctx.user.email; t.x.ngay_nhan_kh = ctx.today;
      saveT(ctx, t, 'Nhận lập KH', '');
      return 'Bạn đã nhận lập kế hoạch cho ' + t.name + '.';
    },
    planDone: function (ctx, a) {
      var t = target(ctx, a.id), x = t.x;
      need(x, ['CHO_KH', 'DANG_KH']);
      if (!x.ks_email) x.ks_email = ctx.user.email;
      if (!x.ngay_nhan_kh) x.ngay_nhan_kh = ctx.today;
      x.ngay_kh_xong = ctx.today;
      var ready = t.g ? 'SAN_SANG' : 'CHO_XA';
      if (a.can_qa) { x.can_qa = 'Có'; x.qa_ket_qua = 'Chờ QA'; x.trang_thai = 'CHO_QA'; }
      else { x.can_qa = 'Không'; x.qa_ket_qua = 'Không cần'; x.trang_thai = ready; }
      saveT(ctx, t, 'Lập KH xong', a.can_qa ? 'Cần QA' : 'Không cần QA');
      if (a.can_qa) return 'Đã lập KH xong, chuyển sang chờ QA.';
      return t.g ? 'KH boost của ' + t.p.ho_ten + ' đã sẵn sàng.' : 'Đã lập KH xong, chuyển ' + t.name + ' sang chờ vào xạ.';
    },
    qaResult: function (ctx, a) {
      var t = target(ctx, a.id), x = t.x;
      need(x, ['CHO_QA']);
      x.ngay_qa = ctx.today;
      if (a.dat) {
        x.qa_ket_qua = 'Đạt';
        x.trang_thai = t.g ? 'SAN_SANG' : 'CHO_XA';
        saveT(ctx, t, 'QA đạt', a.ghi_chu || '');
        return 'QA đạt. ' + (t.g ? 'KH boost của ' + t.p.ho_ten + ' đã sẵn sàng.' : t.name + ' chuyển sang chờ vào xạ.');
      }
      if (!a.ghi_chu) fail('Cần ghi lý do QA không đạt.');
      x.qa_ket_qua = 'Không đạt'; x.trang_thai = 'DANG_KH';
      note(x, ctx.today, 'QA không đạt: ' + a.ghi_chu);
      saveT(ctx, t, 'QA không đạt', a.ghi_chu);
      return 'Đã ghi QA không đạt. Quay lại bước lập kế hoạch.';
    },
    returnToDoctor: function (ctx, a) {
      var t = target(ctx, a.id);
      need(t.x, ['CHO_KH', 'DANG_KH']);
      if (!a.ly_do) fail('Cần ghi lý do trả lại.');
      t.x.trang_thai = 'CONTOUR';
      note(t.x, ctx.today, 'Kỹ sư trả lại contour: ' + a.ly_do);
      saveT(ctx, t, 'Trả lại BS', a.ly_do);
      return 'Đã trả lại bác sĩ để chỉnh contour.';
    },
    addPhase: function (ctx, a) {
      var p = findP(ctx, a.bn_id);
      need(p, ['MO_PHONG', 'CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA', 'CHO_XA', 'DANG_XA', 'TAM_NGUNG']);
      if (ctx.user.vai_tro === 'BS' && p.bs_email && p.bs_email !== ctx.user.email && !a.force) { /* BS khác vẫn được thêm, chỉ ghi nhật ký */ }
      var g = newPhase(ctx, p, a);
      saveT(ctx, { g: g, p: p, x: g }, 'Thêm boost', g.ky_thuat + ' ' + g.tong_lieu + ' Gy/' + g.so_buoi + ' buổi · ' + STATUS[g.trang_thai]);
      return 'Đã thêm boost GĐ' + g.stt + ' cho ' + p.ho_ten + ' (' + STATUS[g.trang_thai] + ').';
    },
    updatePhase: function (ctx, a) {
      var g = findG(ctx, a.id); if (!g) fail('Không tìm thấy giai đoạn.');
      var p = findP(ctx, g.bn_id), o = clean(a, PHASE_FIELDS), merged = {};
      Object.keys(g).forEach(function (k) { merged[k] = g[k]; });
      Object.keys(o).forEach(function (k) { merged[k] = o[k]; });
      validateRx(merged, ' của boost');
      var seg = segments(p, envOf(ctx)).filter(function (s) { return s.g === g; })[0];
      var deliveredIn = Math.max(0, Math.min(fxOf(p, ctx.fractions).length, seg.to) - seg.from);
      if (num(merged.so_buoi) < deliveredIn) fail('Số buổi boost không được nhỏ hơn số buổi boost đã xạ (' + deliveredIn + ').');
      var changed = [];
      Object.keys(o).forEach(function (k) { if (String(g[k]) !== o[k]) { changed.push(k); g[k] = o[k]; } });
      if (!changed.length) return 'Không có gì thay đổi.';
      finishIfDone(ctx, p) && save(ctx, p, 'Hoàn thành', 'sau khi sửa boost');
      saveT(ctx, { g: g, p: p, x: g }, 'Sửa boost', changed.join(', '));
      return 'Đã lưu boost GĐ' + g.stt + '.';
    },
    deletePhase: function (ctx, a) {
      var g = findG(ctx, a.id); if (!g) fail('Không tìm thấy giai đoạn.');
      var p = findP(ctx, g.bn_id);
      if (!a.ly_do) fail('Cần ghi lý do huỷ boost.');
      var seg = segments(p, envOf(ctx)).filter(function (s) { return s.g === g; })[0];
      if (fxOf(p, ctx.fractions).length > seg.from) fail('Boost này đã có buổi xạ, không huỷ được. Dùng "Kết thúc sớm" nếu cần.');
      g.trang_thai = 'HUY';
      note(g, ctx.today, 'Huỷ boost: ' + a.ly_do);
      saveT(ctx, { g: g, p: p, x: g }, 'Huỷ boost', a.ly_do);
      if (finishIfDone(ctx, p)) save(ctx, p, 'Hoàn thành', 'sau khi huỷ boost');
      return 'Đã huỷ boost GĐ' + g.stt + ' của ' + p.ho_ten + '.';
    },
    simDone: function (ctx, a) {
      var t = target(ctx, a.id);
      need(t.x, ['MO_PHONG']);
      t.x.trang_thai = 'CONTOUR'; t.x.ngay_mo_phong = ctx.today;
      saveT(ctx, t, t.g ? 'Mô phỏng lại xong' : 'Mô phỏng xong', '');
      ctx.phases.forEach(function (g) {
        if (!t.g && g.bn_id === t.p.id && g.di_cung === 'Có' && g.trang_thai === 'MO_PHONG') {
          g.trang_thai = 'CONTOUR'; g.ngay_mo_phong = ctx.today; saveT(ctx, { g: g, p: t.p, x: g }, 'Mô phỏng xong', 'cùng GĐ1');
        }
      });
      return 'Đã ghi mô phỏng xong cho ' + t.name + '. Bác sĩ có thể contour.';
    },
    schedule: function (ctx, a) {
      var p = findP(ctx, a.id);
      need(p, ['MO_PHONG', 'CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA', 'CHO_XA', 'DANG_XA', 'TAM_NGUNG']);
      var parts = [];
      if (a.ngay_du_kien !== undefined) {
        if (a.ngay_du_kien && !isDate(a.ngay_du_kien)) fail('Ngày dự kiến không hợp lệ.');
        p.ngay_du_kien = a.ngay_du_kien || '';
        parts.push('ngày dự kiến ' + (p.ngay_du_kien || 'trống'));
      }
      if (a.ngay_nghi_tuan !== undefined) {
        var v = String(a.ngay_nghi_tuan || '');
        if (v && !/^[1-5]$/.test(v)) fail('Ngày nghỉ trong tuần không hợp lệ.');
        p.ngay_nghi_tuan = v;
        parts.push('lịch ' + scheduleLabel(p));
      }
      if (a.may !== undefined) { p.may = String(a.may || ''); parts.push('máy ' + p.may); }
      save(ctx, p, 'Xếp lịch', parts.join(', '));
      return 'Đã lưu lịch xạ cho ' + p.ho_ten + '.';
    },
    setDay: function (ctx, a) {
      var p = findP(ctx, a.bn_id);
      need(p, ['MO_PHONG', 'CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA', 'CHO_XA', 'DANG_XA', 'TAM_NGUNG']);
      if (!isDate(a.ngay) || a.ngay < ctx.today) fail('Chỉ đổi lịch từ hôm nay trở đi.');
      var env = envOf(ctx);
      if (env.holidays.indexOf(a.ngay) >= 0) fail('Ngày này là ngày nghỉ lễ.');
      if (isDown(p, a.ngay, env)) fail('Máy nghỉ ngày này.');
      if (a.xa && dow(a.ngay) === 0 && !a.force) fail('Không xếp lịch vào Chủ nhật.');
      var want = !!a.xa, base = patternDay(p, a.ngay);
      var cur = ctx.exceptions.filter(function (e) { return e.bn_id === p.id && e.ngay === a.ngay && e.da_xoa !== 'Có' && e.loai !== 'MAY_NGHI'; })[0];
      if (want === base) {
        if (cur) { cur.da_xoa = 'Có'; ctx.saveEx(cur); }
      } else {
        if (!cur) {
          cur = blank(COLS.LichNgoaiLe); cur.id = uid('L'); cur.bn_id = p.id; cur.ngay = a.ngay;
          ctx.exceptions.push(cur);
        }
        cur.loai = want ? 'XA' : 'NGHI'; cur.ghi_chu = a.ghi_chu || ''; cur.nguoi = ctx.user.email; cur.thoi_gian = ctx.now; cur.da_xoa = '';
        ctx.saveEx(cur);
      }
      ctx.log('Đổi lịch ngày', p.id, a.ngay + ': ' + (want ? 'xạ' : 'nghỉ'));
      return p.ho_ten + ': ' + DOW[dow(a.ngay)] + ' ' + a.ngay.slice(8) + '/' + a.ngay.slice(5, 7) + (want ? ' xạ' : ' nghỉ') + '.';
    },
    machineDown: function (ctx, a) {
      var may = String(a.may || (ctx.dm.MAY || [])[0] || '');
      if ((ctx.dm.MAY || []).indexOf(may) < 0) fail('Máy không có trong danh mục.');
      if (!isDate(a.ngay) || a.ngay < ctx.today) fail('Chọn ngày từ hôm nay trở đi.');
      var env = envOf(ctx);
      if (env.down[may] && env.down[may][a.ngay]) fail('Đã ghi máy nghỉ ngày này.');
      var affected = ctx.patients.filter(function (p) {
        return ['CHO_XA', 'DANG_XA'].indexOf(p.trang_thai) >= 0 && machineOf(p, env) === may && isTreatDay(p, a.ngay, env);
      });
      var e = blank(COLS.LichNgoaiLe);
      e.id = uid('L'); e.may = may; e.ngay = a.ngay; e.loai = 'MAY_NGHI'; e.ghi_chu = a.ghi_chu || ''; e.nguoi = ctx.user.email; e.thoi_gian = ctx.now;
      ctx.exceptions.push(e);
      ctx.saveEx(e);
      ctx.log('Máy nghỉ', '', may + ' · ' + a.ngay + (a.ghi_chu ? ' · ' + a.ghi_chu : ''));
      return 'Đã ghi ' + may + ' nghỉ ngày ' + a.ngay.slice(8) + '/' + a.ngay.slice(5, 7) + '. ' + affected.length + ' BN được lùi lịch thêm 1 buổi.';
    },
    machineUp: function (ctx, a) {
      var e = ctx.exceptions.filter(function (x) { return x.id === a.id && x.loai === 'MAY_NGHI' && x.da_xoa !== 'Có'; })[0];
      if (!e) fail('Không tìm thấy ngày máy nghỉ.');
      e.da_xoa = 'Có'; ctx.saveEx(e);
      ctx.log('Bỏ máy nghỉ', '', e.may + ' · ' + e.ngay);
      return 'Đã bỏ ngày máy nghỉ ' + e.ngay.slice(8) + '/' + e.ngay.slice(5, 7) + '.';
    },
    logFraction: function (ctx, a) {
      var p = findP(ctx, a.bn_id);
      need(p, ['CHO_XA', 'DANG_XA', 'TAM_NGUNG'], 'BN chưa ở bước chờ vào xạ hoặc đang xạ, chưa ghi buổi xạ được.');
      var ngay = a.ngay || ctx.today;
      if (!isDate(ngay)) fail('Ngày xạ không hợp lệ.');
      if (ngay > ctx.today) fail('Không ghi buổi xạ cho ngày trong tương lai.');
      if (diffDays(ngay, ctx.today) > 7) fail('Chỉ ghi bù buổi xạ trong vòng 7 ngày gần nhất.');
      var env = envOf(ctx), segs = segments(p, env), total = segs[segs.length - 1].to;
      var fx = fxOf(p, ctx.fractions);
      if (fx.length >= total) fail('BN đã xạ đủ ' + total + ' buổi.');
      var seg = segAt(segs, fx.length);
      if (!seg.ready) fail('Đã xạ xong ' + segs[segs.indexOf(seg) - 1].label + '. Kế hoạch boost ' + seg.label + ' chưa sẵn sàng (' + STATUS[seg.g.trang_thai] + ').');
      if (!a.force && fx.some(function (f) { return f.ngay === ngay; })) fail('DUP_DAY');
      var img = (a.hinh_anh || []).join(', ');
      var f = blank(COLS.BuoiXa);
      f.id = uid('B'); f.bn_id = p.id; f.ngay = ngay; f.buoi_so = String(fx.length + 1); f.gd = String(seg.stt);
      f.ktv_email = ctx.user.email; f.thoi_gian = ctx.now; f.hinh_anh = img; f.ghi_chu = a.ghi_chu || '';
      ctx.fractions.push(f);
      ctx.addFraction(f);
      var n = fx.length + 1;
      p.ngay_bat_dau = fx.length ? (fx[0].ngay < ngay ? fx[0].ngay : ngay) : ngay;
      if (p.trang_thai === 'TAM_NGUNG') { p.tam_ngung_tu = ''; p.ly_do_tam_ngung = ''; }
      p.trang_thai = 'DANG_XA';
      var finished = finishIfDone(ctx, p);
      save(ctx, p, 'Ghi buổi xạ', 'Buổi ' + n + '/' + total + (segs.length > 1 ? ' (' + seg.label + ')' : '') + ' ngày ' + ngay + (img ? ' · ' + img : ''));
      var msg = 'Đã ghi buổi ' + n + '/' + total + ' cho ' + p.ho_ten + '.';
      if (finished) msg += ' BN đã xạ đủ liệu trình.';
      else if (n === seg.to && segs.length > 1) {
        var nx = segAt(segs, n);
        msg += ' Đã xong ' + seg.label + '.' + (nx.ready ? ' Buổi sau chuyển sang ' + nx.label + ' (' + nx.ky_thuat + ').' : ' KH ' + nx.label + ' chưa sẵn sàng!');
      }
      return msg;
    },
    undoFraction: function (ctx, a) {
      var f = ctx.fractions.filter(function (x) { return x.id === a.id && x.da_huy !== 'Có'; })[0];
      if (!f) fail('Không tìm thấy buổi xạ.');
      if (ctx.user.vai_tro !== 'ADMIN' && ctx.user.chuc_vu !== 'KTV trưởng' && diffDays(f.ngay, ctx.today) > 2) fail('Chỉ huỷ được buổi xạ trong 2 ngày gần nhất. Liên hệ KTV trưởng hoặc quản trị.');
      if (!a.ly_do) fail('Cần ghi lý do huỷ.');
      f.da_huy = 'Có'; f.huy_boi = ctx.user.email; f.ly_do_huy = a.ly_do;
      ctx.updateFraction(f);
      var p = findP(ctx, f.bn_id), fx = fxOf(p, ctx.fractions);
      if (!fx.length) { p.ngay_bat_dau = ''; if (p.trang_thai !== 'TAM_NGUNG') p.trang_thai = 'CHO_XA'; }
      else {
        p.ngay_bat_dau = fx[0].ngay;
        if (p.trang_thai === 'HOAN_THANH' && !p.ly_do_ket_thuc) { p.trang_thai = 'DANG_XA'; p.ngay_ket_thuc = ''; }
      }
      save(ctx, p, 'Huỷ buổi xạ', 'Ngày ' + f.ngay + ': ' + a.ly_do);
      return 'Đã huỷ buổi xạ ngày ' + f.ngay + ' của ' + p.ho_ten + '.';
    },
    pause: function (ctx, a) {
      var p = findP(ctx, a.id);
      need(p, ['CHO_XA', 'DANG_XA']);
      if (!a.ly_do) fail('Cần chọn lý do tạm ngừng.');
      p.trang_thai = 'TAM_NGUNG';
      p.tam_ngung_tu = a.tu_ngay && isDate(a.tu_ngay) ? a.tu_ngay : ctx.today;
      p.ly_do_tam_ngung = a.ly_do + (a.ghi_chu ? ': ' + a.ghi_chu : '');
      save(ctx, p, 'Tạm ngừng', p.ly_do_tam_ngung);
      return 'Đã ghi tạm ngừng xạ cho ' + p.ho_ten + '.';
    },
    resume: function (ctx, a) {
      var p = findP(ctx, a.id);
      need(p, ['TAM_NGUNG']);
      var days = p.tam_ngung_tu ? diffDays(p.tam_ngung_tu, ctx.today) : 0;
      p.trang_thai = fxOf(p, ctx.fractions).length ? 'DANG_XA' : 'CHO_XA';
      p.tam_ngung_tu = ''; p.ly_do_tam_ngung = '';
      save(ctx, p, 'Tiếp tục xạ', 'Sau ' + days + ' ngày');
      return p.ho_ten + ' tiếp tục xạ.';
    },
    endEarly: function (ctx, a) {
      var p = findP(ctx, a.id);
      need(p, ['CHO_XA', 'DANG_XA', 'TAM_NGUNG']);
      if (!a.ly_do) fail('Cần ghi lý do kết thúc sớm.');
      var fx = fxOf(p, ctx.fractions);
      p.trang_thai = 'HOAN_THANH';
      p.ngay_ket_thuc = fx.length ? fx[fx.length - 1].ngay : ctx.today;
      p.ly_do_ket_thuc = 'Kết thúc sớm sau ' + fx.length + '/' + totalFx(p, envOf(ctx)) + ' buổi: ' + a.ly_do;
      p.tam_ngung_tu = ''; p.ly_do_tam_ngung = '';
      save(ctx, p, 'Kết thúc sớm', p.ly_do_ket_thuc);
      return 'Đã kết thúc đợt xạ của ' + p.ho_ten + '.';
    },
    deletePatient: function (ctx, a) {
      var p = findP(ctx, a.id);
      if (!a.ly_do) fail('Cần ghi lý do huỷ hồ sơ.');
      if (ctx.user.vai_tro !== 'ADMIN') {
        if (myDoctors(ctx.user).indexOf(p.bs_email) < 0) fail('Chỉ bác sĩ điều trị hoặc quản trị được huỷ hồ sơ này.');
        if (fxOf(p, ctx.fractions).length) fail('BN đã có buổi xạ, chỉ quản trị được huỷ hồ sơ.');
      }
      p.trang_thai = 'HUY';
      note(p, ctx.today, 'Huỷ hồ sơ: ' + a.ly_do);
      save(ctx, p, 'Huỷ hồ sơ', a.ly_do);
      return 'Đã huỷ hồ sơ ' + p.ho_ten + '.';
    },
    saveUser: function (ctx, a) {
      var email = String(a.email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('Email không hợp lệ.');
      var vt = String(a.vai_tro || '').toUpperCase();
      if (!ROLES[vt]) fail('Vai trò không hợp lệ.');
      if (!a.ho_ten) fail('Cần nhập họ tên.');
      var kh = a.kich_hoat === 'Không' ? 'Không' : 'Có';
      if (email === ctx.user.email && (vt !== 'ADMIN' || kh === 'Không')) fail('Không thể tự bỏ quyền quản trị của chính mình.');
      var u = ctx.users.filter(function (x) { return x.email === email; })[0];
      var isNew = !u;
      if (isNew) { u = { email: email }; ctx.users.push(u); }
      var cv = String(a.chuc_vu || '');
      var kh2 = String(a.khoa || '');
      var tl = String(a.tro_ly_cho || '').trim().toLowerCase();
      if (tl && vt !== 'BS') fail('Chỉ bác sĩ mới được gán làm trợ lý cho bác sĩ khác.');
      if (tl) {
        if (tl === email) fail('Không thể là trợ lý cho chính mình.');
        var chinh = ctx.users.filter(function (x) { return x.email === tl && x.kich_hoat !== 'Không'; })[0];
        if (!chinh || (chinh.vai_tro !== 'BS' && chinh.vai_tro !== 'ADMIN')) fail('Bác sĩ chính không có trong danh sách bác sĩ.');
        if (chinh.tro_ly_cho) fail(chinh.ho_ten + ' đang là trợ lý, không thể có trợ lý riêng.');
        var khac = ctx.users.filter(function (x) { return x.email !== email && x.tro_ly_cho === tl && x.kich_hoat !== 'Không'; })[0];
        if (khac && kh !== 'Không') fail(chinh.ho_ten + ' đã có trợ lý ' + khac.ho_ten + '. Mỗi bác sĩ tạm thời chỉ có 1 trợ lý; hãy bỏ trợ lý cũ trước.');
      }
      if (kh2 && staffKhoa(ctx.dm).indexOf(kh2) < 0) fail('Khoa không có trong danh mục.');
      if (KHOA_STATS.indexOf(cv) >= 0 && !kh2) fail('Chức vụ "' + cv + '" cần chọn khoa.');
      if (cv && CHUC_VU.indexOf(cv) < 0) fail('Chức vụ không hợp lệ.');
      u.ho_ten = String(a.ho_ten).trim(); u.vai_tro = vt; u.kich_hoat = kh; u.chuc_vu = cv; u.khoa = kh2; u.tro_ly_cho = tl;
      ctx.saveUser(u);
      ctx.log(isNew ? 'Thêm người dùng' : 'Sửa người dùng', '', email + ' · ' + vt + (cv ? ' · ' + cv : '') + ' · ' + kh);
      return (isNew ? 'Đã thêm ' : 'Đã cập nhật ') + u.ho_ten + '.';
    },
    dmAdd: function (ctx, a) {
      var loai = String(a.loai || ''), v = String(a.gia_tri || '').trim();
      if (DM_EDITABLE.indexOf(loai) < 0) fail('Danh mục không hợp lệ.');
      if (!v) fail('Cần nhập giá trị.');
      if (loai === 'NGAY_LE' && !isDate(v)) fail('Ngày nghỉ lễ không hợp lệ.');
      ctx.dm[loai] = ctx.dm[loai] || [];
      if (ctx.dm[loai].indexOf(v) >= 0) fail('Giá trị này đã có trong danh mục.');
      if (loai === 'TEN_DON_VI') { ctx.dm[loai].slice().forEach(function (old) { ctx.removeDmRow(loai, old); }); ctx.dm[loai] = []; }
      ctx.dm[loai].push(v);
      if (loai === 'NGAY_LE') ctx.holidays.push(v);
      ctx.addDmRow(loai, v);
      ctx.log('Thêm danh mục', '', loai + ': ' + v);
      return 'Đã thêm "' + v + '".';
    },
    setNotice: function (ctx, a) {
      var may = String(a.may || '').trim(), text = String(a.noi_dung || '').trim();
      if (!text) fail('Cần nhập nội dung thông báo.');
      if (text.length > 200) fail('Thông báo tối đa 200 ký tự.');
      ctx.exceptions.forEach(function (e) {
        if (e.loai === 'THONG_BAO' && e.ngay === ctx.today && e.may === may && e.da_xoa !== 'Có') { e.da_xoa = 'Có'; ctx.saveEx(e); }
      });
      var e = blank(COLS.LichNgoaiLe);
      e.id = uid('T'); e.may = may; e.ngay = ctx.today; e.loai = 'THONG_BAO'; e.ghi_chu = text; e.nguoi = ctx.user.email; e.thoi_gian = ctx.now;
      ctx.exceptions.push(e); ctx.saveEx(e);
      ctx.log('Thông báo máy', '', (may ? may + ': ' : '') + text);
      return 'Đã đăng thông báo. Mọi người sẽ thấy khi mở ứng dụng.';
    },
    clearNotice: function (ctx, a) {
      var e = ctx.exceptions.filter(function (x) { return x.id === a.id && x.loai === 'THONG_BAO' && x.da_xoa !== 'Có'; })[0];
      if (!e) fail('Không tìm thấy thông báo.');
      e.da_xoa = 'Có'; ctx.saveEx(e);
      ctx.log('Gỡ thông báo máy', '', e.ghi_chu);
      return 'Đã gỡ thông báo.';
    },
    setRoster: function (ctx, a) {
      if (!isDate(a.ngay)) fail('Ngày không hợp lệ.');
      if ((ctx.dm.VI_TRI_PC || []).indexOf(a.vi_tri) < 0) fail('Vị trí phân công không có trong danh mục.');
      var emails = (a.nhan_vien || []).map(function (x) { return String(x).toLowerCase(); }).filter(Boolean);
      emails.forEach(function (em) {
        if (!ctx.users.some(function (u) { return u.email === em && u.kich_hoat !== 'Không'; })) fail('Người được phân công không có trong danh sách người dùng.');
      });
      var row = ctx.roster.filter(function (r) { return r.ngay === a.ngay && r.vi_tri === a.vi_tri; })[0];
      if (!row) { row = blank(COLS.PhanCong); row.id = uid('P'); row.ngay = a.ngay; row.vi_tri = a.vi_tri; ctx.roster.push(row); }
      row.nhan_vien = emails.join(', '); row.ghi_chu = String(a.ghi_chu || '').trim(); row.nguoi = ctx.user.email; row.thoi_gian = ctx.now;
      ctx.saveRoster(row);
      ctx.log('Phân công', '', a.ngay + ' · ' + a.vi_tri + ': ' + (row.nhan_vien || 'trống'));
      return 'Đã lưu phân công ' + a.vi_tri + ' ngày ' + a.ngay.slice(8) + '/' + a.ngay.slice(5, 7) + '.';
    },
    copyRoster: function (ctx, a) {
      if (!isDate(a.tu) || !isDate(a.den)) fail('Tuần không hợp lệ.');
      var from = monday(a.tu), to = monday(a.den), n = 0;
      if (from === to) fail('Tuần nguồn và tuần đích trùng nhau.');
      for (var i = 0; i < 7; i++) {
        var dFrom = addDays(from, i), dTo = addDays(to, i);
        ctx.roster.filter(function (r) { return r.ngay === dFrom; }).forEach(function (src) {
          var row = ctx.roster.filter(function (r) { return r.ngay === dTo && r.vi_tri === src.vi_tri; })[0];
          if (!row) { row = blank(COLS.PhanCong); row.id = uid('P') + i; row.ngay = dTo; row.vi_tri = src.vi_tri; ctx.roster.push(row); }
          row.nhan_vien = src.nhan_vien; row.ghi_chu = src.ghi_chu; row.nguoi = ctx.user.email; row.thoi_gian = ctx.now;
          ctx.saveRoster(row); n++;
        });
      }
      if (!n) fail('Tuần nguồn chưa có phân công nào để sao chép.');
      ctx.log('Sao chép phân công', '', from + ' → ' + to + ' (' + n + ' ô)');
      return 'Đã sao chép ' + n + ' ô phân công sang tuần mới.';
    },
    dmRemove: function (ctx, a) {
      var loai = String(a.loai || ''), v = String(a.gia_tri || '');
      if (DM_EDITABLE.indexOf(loai) < 0 || !ctx.dm[loai] || ctx.dm[loai].indexOf(v) < 0) fail('Không tìm thấy giá trị trong danh mục.');
      if (loai !== 'NGAY_LE' && ctx.dm[loai].length <= 1) fail('Danh mục cần giữ ít nhất một giá trị.');
      ctx.dm[loai].splice(ctx.dm[loai].indexOf(v), 1);
      if (loai === 'NGAY_LE') { var i = ctx.holidays.indexOf(v); if (i >= 0) ctx.holidays.splice(i, 1); }
      ctx.removeDmRow(loai, v);
      ctx.log('Xoá danh mục', '', loai + ': ' + v);
      return 'Đã xoá "' + v + '".';
    }
  };

  function handle(ctx, action, a) {
    if (!H[action]) fail('Thao tác không tồn tại: ' + action);
    if (!can(ctx.user.vai_tro, action, ctx.user) || ctx.user.kich_hoat === 'Không') fail('Tài khoản ' + ROLES[ctx.user.vai_tro] + ' không có quyền thực hiện thao tác này.');
    ctx.phases = ctx.phases || [];
    ctx.exceptions = ctx.exceptions || [];
    ctx.roster = ctx.roster || [];
    ['savePhase', 'saveEx', 'saveRoster'].forEach(function (k) { if (!ctx[k]) ctx[k] = function () {}; });
    return H[action](ctx, a || {});
  }

  /** Dữ liệu gửi xuống giao diện. */
  function view(ctx) {
    var cutoff = addDays(ctx.today, -60);
    var pts = ctx.patients.filter(function (p) {
      if (p.trang_thai === 'HUY') return false;
      return p.trang_thai !== 'HOAN_THANH' || !p.ngay_ket_thuc || p.ngay_ket_thuc >= cutoff;
    });
    var ids = {};
    pts.forEach(function (p) { ids[p.id] = 1; });
    function pick(o, cols) { var r = {}; cols.forEach(function (c) { r[c] = o[c] == null ? '' : String(o[c]); }); return r; }
    return {
      me: { email: ctx.user.email, ho_ten: ctx.user.ho_ten, vai_tro: ctx.user.vai_tro, kich_hoat: ctx.user.kich_hoat || 'Có', chuc_vu: ctx.user.chuc_vu || '', khoa: ctx.user.khoa || '', tro_ly_cho: ctx.user.tro_ly_cho || '' },
      today: ctx.today,
      users: ctx.users.map(function (u) { return { email: u.email, ho_ten: u.ho_ten, vai_tro: u.vai_tro, kich_hoat: u.kich_hoat === 'Không' ? 'Không' : 'Có', chuc_vu: u.chuc_vu || '', khoa: u.khoa || '', tro_ly_cho: u.tro_ly_cho || '' }; }),
      dm: ctx.dm,
      holidays: ctx.holidays,
      patients: pts.map(function (p) { return pick(p, COLS.BenhNhan); }),
      phases: (ctx.phases || []).filter(function (g) { return ids[g.bn_id] && g.trang_thai !== 'HUY'; }).map(function (g) { return pick(g, COLS.GiaiDoan); }),
      fractions: ctx.fractions.filter(function (f) { return ids[f.bn_id] && f.da_huy !== 'Có'; }).map(function (f) { return pick(f, COLS.BuoiXa); }),
      exceptions: (ctx.exceptions || []).filter(function (e) {
        if (e.da_xoa === 'Có') return false;
        if (e.loai === 'THONG_BAO') return e.ngay === ctx.today;
        return e.loai === 'MAY_NGHI' ? e.ngay >= cutoff : ids[e.bn_id];
      }).map(function (e) { return pick(e, COLS.LichNgoaiLe); }),
      roster: rosterWindow(ctx.roster || [], ctx.today).map(function (r) { return pick(r, COLS.PhanCong); })
    };
  }


  // ---------- Thống kê ----------
  /** Phạm vi thống kê của một người */
  function statsScope(u) {
    if (!u) return null;
    var s = { all: false, khoa: '', self: u.email, byDoctor: false, byKtv: false, byKs: false, label: '' };
    if (u.vai_tro === 'ADMIN') { s.all = true; s.byDoctor = s.byKtv = s.byKs = true; s.self = ''; s.label = 'Cả hai khoa'; return s; }
    // Trưởng khoa / tài khoản khoa Vật lý xạ trị (vai trò kỹ sư): thống kê theo từng kỹ sư
    if (u.vai_tro === 'KS' && (u.chuc_vu === 'Trưởng khoa' || u.chuc_vu === 'Tài khoản khoa' || u.chuc_vu === 'Trưởng phòng')) { s.byKs = true; s.label = 'Khoa ' + (u.khoa || 'Vật lý xạ trị') + ' (theo kỹ sư)'; return s; }
    if (KHOA_STATS.indexOf(u.chuc_vu) >= 0 && u.khoa) { s.khoa = u.khoa; s.byDoctor = true; s.self = ''; s.label = 'Khoa ' + u.khoa; return s; }
    if (u.chuc_vu === 'KTV trưởng') { s.byKtv = true; s.label = 'Nhóm KTV'; return s; }
    if (u.chuc_vu === 'Trưởng phòng') { s.byKs = true; s.label = 'Nhóm kỹ sư'; return s; }
    if (u.vai_tro === 'BS' || u.vai_tro === 'KTV' || u.vai_tro === 'KS' || u.vai_tro === 'ADMIN') { s.label = 'Của tôi'; return s; }
    return null;   // điều dưỡng thường: không có thống kê
  }
  /**
   * Tính thống kê trong khoảng [tu, den] theo đúng phạm vi người xem.
   * data = { patients, phases, fractions, users, dm }
   */
  function report(data, tu, den, u, detail) {
    var sc = statsScope(u);
    if (!sc) fail('Tài khoản của bạn không có quyền xem thống kê.');
    if (!isDate(tu) || !isDate(den) || tu > den) fail('Khoảng ngày không hợp lệ.');
    if (diffDays(tu, den) > 400) fail('Chỉ thống kê tối đa 400 ngày một lần.');
    var defMay = (data.dm.MAY || [])[0] || '';
    var P = {}; data.patients.forEach(function (p) { if (p.trang_thai !== 'HUY') P[p.id] = p; });
    var G = {}; (data.phases || []).forEach(function (g) { if (g.trang_thai !== 'HUY') G[g.bn_id + '|' + g.stt] = g; });
    var inKhoa = function (p) { return sc.all || !sc.khoa || p.khoa === sc.khoa; };
    var fx = data.fractions.filter(function (f) { return f.da_huy !== 'Có' && f.ngay >= tu && f.ngay <= den && P[f.bn_id]; });
    var techOf = function (f) { var p = P[f.bn_id], g = f.gd && f.gd !== '1' ? G[f.bn_id + '|' + f.gd] : null; return (g ? g.ky_thuat : p.ky_thuat) || 'Khác'; };
    // Phạm vi phần tổng quan
    var ovFx, ovPts;
    if (sc.all || sc.khoa) {
      ovFx = fx.filter(function (f) { return inKhoa(P[f.bn_id]); });
      ovPts = Object.keys(P).map(function (k) { return P[k]; }).filter(inKhoa);
    } else if (u.vai_tro === 'BS' || u.vai_tro === 'ADMIN') {
      var docs = myDoctors(u);
      ovFx = fx.filter(function (f) { return docs.indexOf(P[f.bn_id].bs_email) >= 0; });
      ovPts = Object.keys(P).map(function (k) { return P[k]; }).filter(function (p) { return docs.indexOf(p.bs_email) >= 0; });
    } else if (u.vai_tro === 'KTV') {
      ovFx = fx.filter(function (f) { return f.ktv_email === u.email || sc.byKtv; });
      ovPts = [];
    } else { ovFx = sc.byKs ? fx : []; ovPts = []; }
    var inRange = function (d) { return d && d >= tu && d <= den; };
    var count = function (arr, key) { var o = {}; arr.forEach(function (x) { var k = key(x); o[k] = (o[k] || 0) + 1; }); return o; };
    var ov = {
      luot_xa: ovFx.length,
      bn_xa: Object.keys(count(ovFx, function (f) { return f.bn_id; })).length,
      bn_moi: ovPts.filter(function (p) { return inRange(p.ngay_tao); }).length,
      bn_bat_dau: ovPts.filter(function (p) { return inRange(p.ngay_bat_dau); }).length,
      bn_ket_thuc: ovPts.filter(function (p) { return p.trang_thai === 'HOAN_THANH' && inRange(p.ngay_ket_thuc); }).length,
      ket_thuc_som: ovPts.filter(function (p) { return p.ly_do_ket_thuc && inRange(p.ngay_ket_thuc); }).length,
      dang_xa: ovPts.filter(function (p) { return p.trang_thai === 'DANG_XA'; }).length,
      tam_ngung: ovPts.filter(function (p) { return p.trang_thai === 'TAM_NGUNG'; }).length,
      cbct: ovFx.filter(function (f) { return /CBCT/i.test(f.hinh_anh); }).length,
      sgrt: ovFx.filter(function (f) { return /SGRT|C-RAD/i.test(f.hinh_anh); }).length,
      kv: ovFx.filter(function (f) { return /kV/i.test(f.hinh_anh); }).length,
      theo_ky_thuat: count(ovFx, techOf),
      theo_may: count(ovFx, function (f) { return P[f.bn_id].may || defMay; }),
      theo_khoa: (sc.all ? count(ovFx, function (f) { return P[f.bn_id].khoa || '(chưa ghi khoa)'; }) : null)
    };
    var name = {}; data.users.forEach(function (x) { name[x.email] = x.ho_ten; });
    var rows = function (byKey, filterKey) {
      var m = {};
      fx.forEach(function (f) {
        var k = byKey(f); if (!k || (filterKey && !filterKey(f, k))) return;
        m[k] = m[k] || { email: k, ten: name[k] || k, luot: 0, bn: {} };
        m[k].luot++; m[k].bn[f.bn_id] = 1;
      });
      return Object.keys(m).map(function (k) { var r = m[k]; return { email: r.email, ten: r.ten, luot_xa: r.luot, bn_xa: Object.keys(r.bn).length }; })
        .sort(function (a, b) { return b.luot_xa - a.luot_xa; });
    };
    var out = { tu: tu, den: den, pham_vi: sc.label, tong_quan: ov };
    // Theo mã ICD (3 ký tự) và vị trí xạ, trong đúng phạm vi tổng quan
    var ovIds = {}; ovFx.forEach(function (f) { ovIds[f.bn_id] = (ovIds[f.bn_id] || 0) + 1; });
    var scopePts = ovPts.length ? ovPts : Object.keys(ovIds).map(function (k) { return P[k]; });
    var grp = function (keyOf) {
      var m = {};
      var add = function (p) { var k = keyOf(p); m[k] = m[k] || { ma: k, bn_bat_dau: {}, bn_xa: {}, luot_xa: 0, dot: {} }; return m[k]; };
      scopePts.forEach(function (p) { if (inRange(p.ngay_bat_dau)) { var g = add(p); g.bn_bat_dau[p.ma_his || p.id] = 1; g.dot[p.id] = 1; } });
      Object.keys(ovIds).forEach(function (id) { var p = P[id]; var g = add(p); g.bn_xa[p.ma_his || p.id] = 1; g.luot_xa += ovIds[id]; g.dot[id] = 1; });
      return Object.keys(m).map(function (k) { var g = m[k]; return { ma: g.ma, bn_bat_dau: Object.keys(g.bn_bat_dau).length, bn_xa: Object.keys(g.bn_xa).length, luot_xa: g.luot_xa, so_dot: Object.keys(g.dot).length }; })
        .sort(function (a, b) { return b.bn_xa - a.bn_xa || b.bn_bat_dau - a.bn_bat_dau; });
    };
    var icd3 = function (p) { var c = normIcd(p.icd); return isIcd(c) ? c.slice(0, 3) : '(chưa có ICD)'; };
    var vtKey = function (p) { var v = String(p.vi_tri || '').trim(); return v ? v.charAt(0).toUpperCase() + v.slice(1) : '(chưa ghi vị trí)'; };
    out.theo_icd = grp(icd3);
    var vt = grp(function (p) { return fold(p.vi_tri) || '~'; }), label = {};
    scopePts.concat(Object.keys(ovIds).map(function (k) { return P[k]; })).forEach(function (p) { var k = fold(p.vi_tri) || '~'; if (!label[k]) label[k] = vtKey(p); });
    vt.forEach(function (r) { r.ma = label[r.ma] || r.ma; });
    out.theo_vi_tri = vt;
    if (detail && detail.loai && detail.ma) {
      var match = detail.loai === 'icd' ? function (p) { return icd3(p) === detail.ma; } : function (p) { return vtKey(p) === detail.ma || (fold(p.vi_tri) || '~') === fold(detail.ma); };
      var ids = {};
      scopePts.forEach(function (p) { if (inRange(p.ngay_bat_dau) && match(p)) ids[p.id] = 1; });
      Object.keys(ovIds).forEach(function (id) { if (match(P[id])) ids[id] = 1; });
      out.chi_tiet = Object.keys(ids).map(function (id) {
        var p = P[id];
        return { id: p.id, ma_his: p.ma_his, ho_ten: p.ho_ten, nam_sinh: p.nam_sinh, icd: p.icd, chan_doan: p.chan_doan, vi_tri: p.vi_tri, ky_thuat: p.ky_thuat,
          tong_lieu: p.tong_lieu, so_buoi: p.so_buoi, bs: name[p.bs_email] || p.bs_email, khoa: p.khoa, ngay_bat_dau: p.ngay_bat_dau, ngay_ket_thuc: p.ngay_ket_thuc, luot_trong_ky: ovIds[id] || 0 };
      }).sort(function (a, b) { return (a.ngay_bat_dau || '9') < (b.ngay_bat_dau || '9') ? -1 : 1; });
    }
    // Theo bác sĩ: trưởng khoa / ĐD trưởng / tài khoản khoa / quản trị thấy cả khoa; bác sĩ chỉ thấy dòng của mình
    if (sc.byDoctor) out.theo_bac_si = rows(function (f) { return P[f.bn_id].bs_email; }, function (f) { return inKhoa(P[f.bn_id]); });
    else if (u.vai_tro === 'BS') out.theo_bac_si = rows(function (f) { return P[f.bn_id].bs_email; }, function (f, k) { return myDoctors(u).indexOf(k) >= 0; });
    if (sc.byKtv) out.theo_ktv = rows(function (f) { return f.ktv_email; });
    else if (u.vai_tro === 'KTV') out.theo_ktv = rows(function (f) { return f.ktv_email; }, function (f, k) { return k === u.email; });
    if (sc.byKs || u.vai_tro === 'KS') {
      var plans = [];
      data.patients.forEach(function (p) { if (p.trang_thai !== 'HUY' && inRange(p.ngay_kh_xong) && p.ks_email) plans.push({ ks: p.ks_email, qa: p.can_qa === 'Có' }); });
      (data.phases || []).forEach(function (g) { if (g.trang_thai !== 'HUY' && inRange(g.ngay_kh_xong) && g.ks_email) plans.push({ ks: g.ks_email, qa: g.can_qa === 'Có' }); });
      var m = {};
      plans.forEach(function (x) {
        if (!sc.byKs && x.ks !== u.email) return;
        m[x.ks] = m[x.ks] || { email: x.ks, ten: name[x.ks] || x.ks, ke_hoach: 0, co_qa: 0 };
        m[x.ks].ke_hoach++; if (x.qa) m[x.ks].co_qa++;
      });
      out.theo_ky_su = Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.ke_hoach - a.ke_hoach; });
    }
    return out;
  }
  /** Dòng chỉ mục (tra cứu nhanh) của một đợt xạ */
  function indexRow(p, fractions, phases, luuTru) {
    var env = makeEnv('', [], [], phases || [], '');
    var o = {};
    COLS.ChiMuc.forEach(function (c) { o[c] = ''; });
    ['id', 'ma_his', 'ho_ten', 'nam_sinh', 'khoa', 'bs_email', 'icd', 'chan_doan', 'vi_tri', 'ky_thuat', 'tong_lieu', 'so_buoi', 'ngay_tao', 'ngay_bat_dau', 'ngay_ket_thuc', 'trang_thai']
      .forEach(function (k) { o[k] = p[k] == null ? '' : String(p[k]); });
    o.ten_kd = fold(p.ho_ten);
    var segs = segments(p, env);
    o.so_buoi = String(segs[segs.length - 1].to);
    o.tong_lieu = String(round2(segs.reduce(function (s, x) { return s + x.tong_lieu; }, 0)));
    o.da_xa = String(fxOf(p, fractions || []).length);
    o.luu_tru = luuTru ? 'Có' : '';
    o.cap_nhat = p.cap_nhat_luc || '';
    return o;
  }
  /** Phân công gửi kèm: từ tuần trước tới 4 tuần sau (xa hơn thì tải riêng) */
  function rosterWindow(rows, today) {
    var a = addDays(monday(today), -7), b = addDays(monday(today), 34);
    return rows.filter(function (r) { return r.ngay >= a && r.ngay <= b && (r.nhan_vien || r.ghi_chu); });
  }
  /** Dựng ctx chạy ngay trên trình duyệt từ dữ liệu view (để màn hình cập nhật tức thì) */
  function localCtx(data, now) {
    var d = JSON.parse(JSON.stringify(data));
    var me = d.users.filter(function (u) { return u.email === d.me.email; })[0] || d.me;
    var noop = function () {};
    return {
      user: me, today: d.today, now: now, users: d.users, dm: d.dm, holidays: d.holidays,
      patients: d.patients, phases: d.phases || [], fractions: d.fractions, exceptions: d.exceptions || [], roster: d.roster || [],
      savePatient: noop, savePhase: noop, addFraction: noop, updateFraction: noop, saveEx: noop, saveRoster: noop,
      saveUser: noop, addDmRow: noop, removeDmRow: noop, log: noop
    };
  }

  return {
    VERSION: VERSION, CHUC_VU: CHUC_VU, isLead: isLead, statsScope: statsScope, report: report, staffKhoa: staffKhoa, myDoctors: myDoctors,
    normIcd: normIcd, isIcd: isIcd, icdName: icdName, fold: fold, indexRow: indexRow, STATUS: STATUS, STATUS_ORDER: STATUS_ORDER, PLAN_STATES: PLAN_STATES, ROLES: ROLES, PRIORITY_RANK: PRIORITY_RANK, DOW: DOW,
    COLS: COLS, DEFAULT_DM: DEFAULT_DM, DM_EDITABLE: DM_EDITABLE, can: can, handle: handle, view: view, localCtx: localCtx,
    makeEnv: makeEnv, course: course, segments: segments, totalFx: totalFx, planningQueue: planningQueue,
    isTreatDay: isTreatDay, baseDay: baseDay, patternDay: patternDay, isDown: isDown, exceptionOf: exceptionOf,
    scheduleLabel: scheduleLabel, missingRx: missingRx, needsOffDay: needsOffDay, offDay: offDay, dosePerFx: dosePerFx,
    addDays: addDays, diffDays: diffDays, dow: dow, monday: monday, isDate: isDate, num: num, splitList: splitList, fxOf: fxOf
  };
})();
if (typeof module !== 'undefined') module.exports = RT;

/* Danh mục ICD-10 mã C và D, theo danh mục Bộ Y tế (19/08/2021). Chỉ dùng để tra tên bệnh. */
var ICD10 = [["C00","U ác của môi"],["C00.0","U ác của môi phần ngoài môi trên"],["C00.1","Phần ngoài môi dưới"],["C00.2","U ác của phần ngoài môi không đặc hiệu"],["C00.3","U ác của môi trên, mặt trong"],["C00.4","U ác của môi dưới, mặt trong"],["C00.5","U ác của môi, mặt trong không đặc hiệu"],["C00.6","U ác của mép môi"],["C00.8","U ác với tổn thương chồng lấn của môi"],["C00.9","U ác của môi, không đặc hiệu"],["C01","U ác của đáy lưỡi"],["C02","U ác của phần khác và không xác định của lưỡi"],["C02.0","U ác mặt lưng của lưỡi"],["C02.1","U ác bờ của lưỡi"],["C02.2","U ác mặt bụng của lưỡi"],["C02.3","U ác hai phần ba trước của lưỡi, phần không xác định"],["C02.4","U ác của Amiđan đáy lưỡi"],["C02.8","U ác với tổn thương chồng lấn của lưỡi"],["C02.9","U ác của lưỡi không đặc hiệu"],["C03","U ác của lợi (nướu) răng"],["C03.0","U ác của nướu hàm trên"],["C03.1","U ác của nướu hàm dưới"],["C03.9","U ác của nướu, không đặc hiệu"],["C04","U ác của sàn miệng"],["C04.0","U ác của sàn trước miệng"],["C04.1","U ác của sàn miệng bên"],["C04.8","U ác với tổn thương chồng lấn của sàn miệng"],["C04.9","U ác của sàn miệng không đặc hiệu"],["C05","U ác của khẩu cái"],["C05.0","U ác của khẩu cái cứng"],["C05.1","U ác của khẩu cái mềm"],["C05.2","U ác của lưỡi gà"],["C05.8","U ác với tổn thương chồng lấn của khẩu cái"],["C05.9","U ác của khẩu cái, không đặc hiệu"],["C06","U ác của phần khác và không xác định của miệng"],["C06.0","U ác của niêm mạc má"],["C06.1","U ác của tiền đình của miệng"],["C06.2","U ác của vùng sau răng hàm"],["C06.8","U ác với tổn thương chồng lấn của phần khác và không xác định của miệng"],["C06.9","U ác của miệng, không đặc hiệu"],["C07","U ác tuyến mang tai"],["C08","U ác của các tuyến nước bọt chính khác và không xác định"],["C08.0","U ác của tuyến nước bọt dưới hàm dưới"],["C08.1","U ác của tuyến nước bọt dưới lưỡi"],["C08.8","U ác với tổn thương chồng lấn của tuyến nước bọt chính"],["C08.9","U ác của tuyến nước bọt chính, không đặc hiệu"],["C09","U ác của amiđan"],["C09.0","U ác của hố amiđan"],["C09.1","U ác của trụ amiđan (trước) (sau)"],["C09.8","U ác với tổn thương chồng lấn của amiđan"],["C09.9","U ác của amiđan không đặc hiệu"],["C10","U ác của hầu miệng"],["C10.0","U ác của nắp thanh quản"],["C10.1","U ác của mặt trước của nắp thanh môn"],["C10.2","U ác của thành bên hầu-miệng"],["C10.3","U ác của thành sau hầu-miệng"],["C10.4","Khe cạch cổ"],["C10.8","U ác với tổn thương chồng lấn của hầu miệng"],["C10.9","U ác của hầu-miệng, không đặc hiệu"],["C11","U ác của hầu-mũi"],["C11.0","U ác của vách trên của hầu-mũi"],["C11.1","U ác của vách sau của hầu-mũi"],["C11.2","U ác của vách bên của hầu-mũi"],["C11.3","U ác của vách trước của hầu-mũi"],["C11.8","U ác với tổn thương chồng lấn của hầu-mũi"],["C11.9","U ác của mũi hầu không đặc hiệu"],["C12","U ác của xoang lê"],["C13","U ác của hạ hầu"],["C13.0","U ác của vùng sau sụn nhẫn"],["C13.1","U ác của nếp phễu nắp, mặt hạ hầu"],["C13.2","U ác của vách sau của hạ hầu"],["C13.8","U ác với tổn thương chồng lấn của hạ hầu"],["C13.9","U ác của hạ hầu không đặc hiệu"],["C14","U ác vị trí khác và không rõ ràng của môi, khoang miệng và hầu"],["C14.0","U ác của hầu, không đặc hiệu"],["C14.2","U ác của hầu thanh quản"],["C14.8","U ác với tổn thương chồng lấn của môi, khoang miệng và hầu họng"],["C15","U ác thực quản"],["C15.0","U ác của thực quản phần cổ"],["C15.1","U ác của thực quản phần ngực"],["C15.2","U ác của thực quản phần bụng"],["C15.3","U ác của phần ba trên thực quản"],["C15.4","U ác của phần ba giữa thực quản"],["C15.5","U ác của phần ba dưới thực quản"],["C15.8","U ác với tổn thương chồng lấn của thực quản"],["C15.9","U ác của thực quản, không đặc hiệu"],["C16","U ác của dạ dày"],["C16.0","U ác của tâm vị"],["C16.1","U ác của đáy vị"],["C16.2","U ác của thân vị"],["C16.3","U ác của hang môn vị"],["C16.4","U ác của môn vị"],["C16.5","U ác của bờ cong nhỏ dạ dày, không đặc hiệu"],["C16.6","U ác của bờ cong lớn dạ dày, không đặc hiệu"],["C16.8","U ác với tổn thương chồng lấn của dạ dày"],["C16.9","U ác của dạ dày không đặc hiệu"],["C17","U ác ruột non"],["C17.0","U ác của tá tràng"],["C17.1","U ác của hỗng tràng"],["C17.2","U ác của hồi tràng"],["C17.3","U ác của túi thừa Meckel"],["C17.8","U ác với tổn thương chồng lấn của ruột non"],["C17.9","U ác của ruột non, không đặc hiệu"],["C18","U ác đại tràng"],["C18.0","U ác của manh tràng"],["C18.1","U ác của ruột thừa"],["C18.2","U ác của đại tràng lên"],["C18.3","U ác của đại tràng góc gan"],["C18.4","U ác của đại tràng ngang"],["C18.5","U ác của đại tràng góc lách"],["C18.6","U ác của đại tràng xuống"],["C18.7","U ác của đại tràng xích ma"],["C18.8","U ác với tổn thương chồng lấn của đại tràng"],["C18.9","U ác của đại tràng không đặc hiệu"],["C19","U ác của nơi nối trực tràng-xích ma"],["C20","U ác trực tràng"],["C21","U ác của hậu môn và ống hậu môn"],["C21.0","U ác của hậu môn, không đặc hiệu"],["C21.1","U ác của ống hậu môn"],["C21.2","U ác của vùng có nguồn gốc từ ổ nhớp"],["C21.8","U ác với tổn thương chồng lấn của đại tràng, hậu môn và ống hậu môn"],["C22","U ác của gan và đường mật trong gan"],["C22.0","Ung thư biểu mô tế bào gan"],["C22.1","Ung thư biểu mô đường mật trong gan"],["C22.2","U nguyên bào gan"],["C22.3","Ung thư mô liên kết mạch máu của gan"],["C22.4","Ung thư mô liên kết khác của gan"],["C22.7","Ung thư biểu mô xác định khác của gan"],["C22.9","U ác của gan, không đặc hiệu"],["C23","U ác túi mật"],["C24","U ác của phần khác và không xác định của đường mật"],["C24.0","U ác của đường mật ngoài gan"],["C24.1","U ác của bóng Vater"],["C24.8","U ác với tổn thương chồng lấn của đường mật"],["C24.9","U ác của đường mật, không đặc hiệu"],["C25","U ác tụy"],["C25.0","U ác của đầu tụy"],["C25.1","U ác của thân tụy"],["C25.2","U ác của đuôi tụy"],["C25.3","U ác của ống tụy"],["C25.4","U ác của tụy nội tiết"],["C25.7","U ác phần khác của tụy"],["C25.8","U ác với tổn thương chồng lấn của tụy"],["C25.9","U ác của tụỵ, không đặc hiệu"],["C26","U ác của cơ quan tiêu hóa khác và không rõ ràng"],["C26.0","U ác của đường ruột phần không xác định vị trí"],["C26.1","U ác tính ở lách"],["C26.8","U ác với tổn thương chồng lấn của hệ tiêu hóa"],["C26.9","U ác ở vị trí không rõ ràng trong hệ tiêu hóa"],["C30","U ác của hốc mũi và tai giữa"],["C30.0","U ác của hốc mũi"],["C30.1","U ác của tai giữa"],["C31","U ác của các xoang phụ"],["C31.0","U ác của xoang hàm"],["C31.1","U ác của xoang sàng"],["C31.2","U ác của xoang trán"],["C31.3","U ác của xoang bướm"],["C31.8","U ác với tổn thương lan rộng của xoang phụ"],["C31.9","U ác của xoang phụ, không đặc hiệu"],["C32","U ác thanh quản"],["C32.0","U ác của thanh môn"],["C32.1","U ác vùng trên thanh môn"],["C32.2","U ác vùng dưới thanh môn"],["C32.3","U ác của sụn thanh quản"],["C32.8","U ác với tổn thương chồng lấn của thanh quản"],["C32.9","U ác của thanh quản, không đặc hiệu"],["C33","U ác khí quản"],["C34","U ác của phế quản và phổi"],["C34.0","U ác của phế quản chính"],["C34.1","U ác của thuỳ trên, phế quản hoặc phổi"],["C34.2","U ác của thuỳ giữa, phế quản hoặc phổi"],["C34.3","U ác của thuỳ dưới, phế quản hoặc phổi"],["C34.8","U ác với tổn thương chồng lấn của phế quản và phổi"],["C34.9","U ác của khí quản hoặc phổi, không đặc hiệu"],["C37","U ác tuyến ức"],["C38","U ác của tim, trung thất và màng phổi"],["C38.0","U ác của tim"],["C38.1","U ác của trung thất trước"],["C38.2","U ác của trung thất sau"],["C38.3","U ác của trung thất, phần không xác định"],["C38.4","U ác của màng phổi"],["C38.8","U ác với tổn thương chồng lấn của tim, trung thất, màng phổi"],["C39","U ác ở những vị trí khác và không rõ ràng của hệ hô hấp và cơ quan trong lồng ngực"],["C39.0","U ác của đường hô hấp trên, phần không xác định vị trí"],["C39.8","U ác với tổn thương chồng lấn của cơ quan hô hấp và trong lồng ngực"],["C39.9","U ác ở vị trí khó xác định trong hệ hô hấp"],["C40","U ác của xương và sụn khớp của các chi"],["C40.0","U ác của xương bả vai và xương dài của chi trên"],["C40.1","U ác của xương ngắn của chi trên"],["C40.2","U ác của xương dài của chi dưới"],["C40.3","U ác của xương ngắn của chi dưới"],["C40.8","U ác với tổn thương chồng lấn của xương và sụn khớp của các chi"],["C40.9","U ác của xương và sụn khớp của chi, không đặc hiệu"],["C41","U ác của xương và sụn khớp ở vị trí khác và không xác định"],["C41.0","U ác của xương sọ và mặt"],["C41.1","U ác của xương hàm dưới"],["C41.2","U ác của cột sống"],["C41.3","U ác của xương sườn, xương ức và xương đòn"],["C41.4","U ác của xương chậu, xương cùng và xương cụt"],["C41.8","U ác với tổn thương chồng lấn của xương và sụn khớp"],["C41.9","U ác của xương và sụn khớp không đặc hiệu"],["C43","U hắc tố ác của da"],["C43.0","U hắc tố ác của môi"],["C43.1","U hắc tố ác của mi mắt, bao gồm khóe mắt"],["C43.2","U hắc tố ác của tai và ống tai ngoài"],["C43.3","U hắc tố ác của phần khác và phần không xác định vị trí của mặt"],["C43.4","U hắc tố ác của đầu và cổ"],["C43.5","U hắc tố ác của thân mình"],["C43.6","U hắc tố ác của chi trên, bao gồm vai"],["C43.7","U hắc tố ác của chi dưới, bao gồm háng"],["C43.8","U hắc tố ác lan rông của da"],["C43.9","U hắc tố ác của da, không đặc hiệu"],["C44","U ác khác của da"],["C44.0","U da ác tính của môi"],["C44.1","U da ác tính của mi mắt, bao gồm khóe mắt"],["C44.2","U da ác tính của tai và ống tai ngoài"],["C44.3","U da ác tính của phần khác và không xác định vị trí của mặt"],["C44.4","U da ác tính đầu và da cổ"],["C44.5","U da ác tính của thân mình"],["C44.6","U da ác tính của chi trên, bao gồm vai"],["C44.7","U da ác tính của chi dưới, bao gồm háng"],["C44.8","U ác với tổn thương chồng lấn của da"],["C44.9","U da ác tính không đặc hiệu"],["C45","U trung biểu mô"],["C45.0","U trung biểu mô của màng phổi"],["C45.1","U trung biểu mô của phúc mạc"],["C45.2","U trung biểu mô màng ngoài tim"],["C45.7","U trung biểu mô của các vị trí khác"],["C45.9","U trung biểu mô không đặc hiệu"],["C46","Ung thư mô liên kết Kaposi"],["C46.0","Ung thư mô liên kết Kaposi của da"],["C46.1","Ung thư mô liên kết Kaposi của mô mềm"],["C46.2","Ung thư mô liên kết Kaposi của vòm khẩu cái"],["C46.3","Ung thư mô liên kết Kaposi của hạch lympho"],["C46.7","Ung thư mô liên kết Kaposi của các nơi khác"],["C46.8","Ung thư mô liên kết Kaposi của nhiều cơ quan"],["C46.9","Ung thư mô liên kết Kaposi không đặc hiệu"],["C47","U ác của dây thần kinh ngoại biên và của hệ thần kinh tự động"],["C47.0","U ác của dây thần kinh ngoại biên của đầu, mặt, cổ"],["C47.1","U ác của dây thần kinh ngoại biên của chi trên, bao gồm vai"],["C47.2","U ác của dây thần kinh ngoại biên của chi dưới, bao gồm háng"],["C47.3","U ác của dây thần kinh ngoại biên của lồng ngực"],["C47.4","U ác của dây thần kinh ngoại biên của bụng"],["C47.5","U ác của dây thần kinh ngoại biên của chậu"],["C47.6","U ác của dây thần kinh ngoại biên của thân mình, không đặc hiệu"],["C47.8","U ác với tổn thương chồng lấn của dây thần kinh ngoại biên và của hệ thần kinh tự động"],["C47.9","U ác của dây thần kinh ngoại biên và hệ thần kinh tự động, không đặc hiệu"],["C48","U ác của vùng sau phúc mạc và phúc mạc"],["C48.0","U ác của vùng sau phúc mạc"],["C48.1","U ác của các phần xác định của phúc mạc"],["C48.2","U ác của phúc mạc không đặc hiệu"],["C48.8","U ác với tổn thương chồng lấn của vùng sau phúc mạc và phúc mạc"],["C49","U ác của mô liên kết và mô mềm khác"],["C49.0","U ác của mô liên kết và mềm của đầu, mặt và cổ"],["C49.1","U ác của mô liên kết và mô mềm của chi trên bao gồm vai"],["C49.2","U ác của mô liên kết và mô mềm của chi dưới bao gồm háng"],["C49.3","U ác của mô liên kết và mô mềm của lồng ngực"],["C49.4","U ác của mô liên kết và mô mềm của bụng"],["C49.5","U ác của mô liên kết và mô mềm của vùng chậu"],["C49.6","U ác của mô liên kết và mô mềm của thân mình, không đặc hiệu"],["C49.8","U ác với tổn thương chồng lấn của mô liên kết và mô mềm"],["C49.9","U ác của mô liên kết và mô mềm, không đặc hiệu"],["C50","U ác của vú"],["C50.0","U ác của núm và quầng vú"],["C50.1","U ác của vùng trung tâm vú"],["C50.2","U ác của 1/4 trên - trong vú"],["C50.3","U ác của 1/4 dưới - trong vú"],["C50.4","U ác của 1/4 trên - ngoài vú"],["C50.5","U ác của 1/4 dưới - ngoài vú"],["C50.6","U ác của đuôi nách của vú"],["C50.8","U ác với tổn thương chồng lấn của vú"],["C50.9","U ác của vú không đặc hiệu"],["C51","U ác âm hộ"],["C51.0","U ác của môi lớn"],["C51.1","U ác của môi nhỏ"],["C51.2","U ác của âm vật"],["C51.8","U ác với tổn thương lan rộng của âm hộ"],["C51.9","U ác của âm hộ không đặc hiệu"],["C52","U ác của âm đạo"],["C53","U ác của cổ tử cung"],["C53.0","U ác của cổ tử cung trong"],["C53.1","U ác của cổ tử cung ngoài"],["C53.8","U ác với tổn thương chồng lấn của cổ tử cung"],["C53.9","U ác của cổ tử cung không đặc hiệu"],["C54","U ác của thân tử cung"],["C54.0","U ác của eo tử cung"],["C54.1","U ác của nội mạc tử cung"],["C54.2","U ác của cơ tử cung"],["C54.3","U ác của đáy tử cung"],["C54.8","U ác với tổn thương chồng lấn của thân tử cung"],["C54.9","U ác của thân tử cung không đặc hiệu"],["C55","U ác tử cung phần không xác định"],["C56","U ác buồng trứng"],["C57","U ác của cơ quan sinh dục nữ khác và không xác định"],["C57.0","U ác của vòi Fallop"],["C57.1","U ác của dây chằng rộng"],["C57.2","U ác của dây chằng tròn"],["C57.3","U ác của cận tử cung"],["C57.4","U ác của phần phụ tử cung không đặc hiệu"],["C57.7","U ác của cơ quan sinh dục nữ xác định khác"],["C57.8","U ác với tổn thương chồng lấn của cơ quan sinh dục nữ"],["C57.9","U ác của cơ quan sinh dục nữ không đặc hiệu"],["C58","U ác của rau thai (nhau thai)"],["C60","U ác của dương vật"],["C60.0","U da ác tính bao quy đầu"],["C60.1","U da ác của quy đầu dương vật"],["C60.2","U ác của thân dương vật"],["C60.8","U ác với tổn thương chồng lấn của dương vật"],["C60.9","U ác của dương vật không đặc hiệu"],["C61","U ác của tuyến tiền liệt"],["C62","U ác của tinh hoàn"],["C62.0","U ác của tinh hoàn không xuống"],["C62.1","U ác của tinh hoàn đã xuống"],["C62.9","U ác của tinh hoàn không đặc hiệu"],["C63","U ác của cơ quan sinh dục nam khác và không xác định"],["C63.0","U ác của mào tinh"],["C63.1","U ác của thừng tinh"],["C63.2","U ác của bìu (Dái)"],["C63.7","U ác của cơ quan sinh dục nam xác định khác"],["C63.8","U ác với tổn thương chồng lấn của cơ quan sinh dục nam"],["C63.9","U ác của cơ quan sinh dục nam không xác định"],["C64","U ác của thận ngoại trừ bể thận"],["C65","U ác của bể thận"],["C66","U ác niệu quản"],["C67","U ác của bàng quang"],["C67.0","U ác của tam giác bàng quang"],["C67.1","U ác của đáy bàng quang"],["C67.2","U ác của thành bên bàng quang"],["C67.3","U ác của thành trước bàng quang"],["C67.4","U ác của thành sau bàng quang"],["C67.5","U ác của cổ bàng quang"],["C67.6","U ác của lỗ niệu quản"],["C67.7","U ác của dây treo bàng quang"],["C67.8","U ác với tổn thương chồng lấn của bàng quang"],["C67.9","U ác của bàng quang không đặc hiệu"],["C68","U ác của cơ quan tiết niệu khác và không xác định"],["C68.0","U ác của niệu đạo"],["C68.1","U ác của tuyến cận niệu đạo"],["C68.8","U ác với tổn thương chồng lấn của cơ quan tiết niệu"],["C68.9","U ác của cơ quan tiết niệu, không đặc hiệu"],["C69","U ác của mắt và phần phụ"],["C69.0","U ác của kết mạc"],["C69.1","U ác của củng mạc"],["C69.2","U ác của võng mạc"],["C69.3","U ác của màng mạch"],["C69.4","U ác của thể mi"],["C69.5","U ác của tuyến lệ và ống"],["C69.6","U ác của hốc mắt"],["C69.8","U ác với tổn thương chồng lấn của mắt và phần phụ"],["C69.9","U ác của mắt không đặc hiệu"],["C70","U ác của màng não"],["C70.0","U ác của màng não"],["C70.1","U ác của màng tủy"],["C70.9","U ác của màng não, không đặc hiệu"],["C71","U ác của não"],["C71.0","U ác của đại não ngoại trừ thùy não và não thất"],["C71.1","U ác của thuỳ trán"],["C71.2","U ác của thuỳ thái dương"],["C71.3","U ác của thuỳ đỉnh"],["C71.4","U ác của thùy chẩm"],["C71.5","U ác của não thất"],["C71.6","U ác của tiểu não"],["C71.7","U ác của cuống não"],["C71.8","U ác với tổn thương chồng lấn của não"],["C71.9","U ác của não không đặc hiệu"],["C72","U ác của tủy sống, dây thần kinh sọ và các phần khác của hệ thần kinh trung ương"],["C72.0","U ác của tủy sống"],["C72.1","U ác của chùm đuôi ngựa"],["C72.2","U ác của thần kinh khứu giác"],["C72.3","U ác của thần kinh thị giác"],["C72.4","U ác của thần kinh thính giác"],["C72.5","U ác của dây thần kinh sọ khác và không xác định"],["C72.8","U ác với tổn thương chồng lấn của não và các phần khác của hệ thần kinh trung ương"],["C72.9","U ác của hệ thần kinh trung ương không đặc hiệu"],["C73","U ác của tuyến giáp"],["C74","U ác của tuyến thượng thận"],["C74.0","U ác của vỏ tuyến thượng thận"],["C74.1","U ác của tủy tuyến thượng thận"],["C74.9","U ác của tuyến thượng thận, không đặc hiệu"],["C75","U ác của các tuyến nội tiết khác và các cơ quan liên quan"],["C75.0","U ác của tuyến cận giáp"],["C75.1","U ác của tuyến yên"],["C75.2","U ác của ống sọ hầu"],["C75.3","U ác của tuyến tùng"],["C75.4","U ác của thể cảnh"],["C75.5","U ác của thể động mạch chủ và phó hạch khác"],["C75.8","U ác ảnh hưởng nhiều tuyến không đặc hiệu"],["C75.9","U ác của tuyến nội tiết không đặc hiệu"],["C76","U ác có vị trí khác và không rõ ràng"],["C76.0","U ác của đầu mặt và cổ"],["C76.1","U ác của ngực"],["C76.2","U ác của bụng"],["C76.3","U ác của chậu"],["C76.4","U ác của chi trên"],["C76.5","U ác của chi dưới"],["C76.7","U ác ở vị trí không rõ ràng khác"],["C76.8","U ác với tổn thương chồng lấn của các vị trí khác và không rõ ràng"],["C77","U ác thứ phát và không xác định của hạch lympho"],["C77.0","U ác của hạch của vùng đầu mặt cổ"],["C77.1","U ác thứ phát và không xác định của hạch trong lồng ngực"],["C77.2","U ác thứ phát và không đặc hiệu của hạch trong xoang bụng"],["C77.3","U ác thứ phát và không đặc hiệu của hạch nách và hạch chi trên"],["C77.4","U ác thứ phát và không đặc hiệu của hạch bẹn và hạch chi dưới"],["C77.5","U ác thứ phát và không đặc hiệu của hạch trong vùng chậu"],["C77.8","U ác thứ phát và không đặc hiệu của hạch của nhiều vùng"],["C77.9","U ác thứ phát và không đặc hiệu của hạch lympho, không xác định"],["C78","U ác thứ phát của cơ quan hô hấp và tiêu ho"],["C78.0","U ác thứ phát của phổi"],["C78.1","U ác thứ phát của trung thất"],["C78.2","U ác thứ phát của màng phổi"],["C78.3","U ác thứ phát của cơ quan hô hấp và không xác định"],["C78.4","U ác thứ phát của ruột non"],["C78.5","U ác thứ phát của đại tràng và trực tràng"],["C78.6","U ác thứ phát của sau phúc mạc và phúc mạc"],["C78.7","U ác thứ phát của gan và đường mật trong gan"],["C78.8","U ác thứ phát của cơ quan tiêu hóa khác và không xác định"],["C79","U ác thứ phát có vị trí khác và không xác định"],["C79.0","U ác thứ phát của thận và bể thận"],["C79.1","U ác thứ phát của bàng quang và cơ quan tiết niệu khác và không xác định"],["C79.2","U ác thứ phát của da"],["C79.3","U ác thứ phát của não và màng não"],["C79.4","U ác thứ phát không xác định vị trí của hệ thần kinh"],["C79.5","U ác thứ phát của xương và tủy xương"],["C79.6","U ác thứ phát của buồng trứng"],["C79.7","U ác thứ phát của tuyến thượng thận"],["C79.8","U ác thứ phát của các vị trí xác định rõ khác"],["C79.9","U ác tính thứ phát, không xác định vị trí"],["C80","U ác không xác định vị trí"],["C80.0","U ác tính, không biết vị trí nguyên phát"],["C80.9","U ác, không đặc hiệu"],["C81","U lympho Hodgkin"],["C81.0","U lympho Hodgkin dạng nốt ưu thế lympho bào"],["C81.1","U lympho Hodgkin (kinh điển) xơ nốt"],["C81.2","U lympho Hodgkin (kinh điển) hỗn hợp tế bào"],["C81.3","U lympho Hodgkin (kinh điển) giảm lympho bào"],["C81.4","U lympho Hodgkin (kinh điển) giàu lympho bào"],["C81.7","U lympho Hodgkin (kinh điển) khác"],["C81.9","U lympho Hodgkin, không đặc hiệu"],["C82","U lympho dạng nang"],["C82.0","U lympho dạng nang độ 1"],["C82.1","U lympho dạng nang độ II"],["C82.2","U lympho dạng nang độ III, không xác định"],["C82.3","U lympho dạng nang độ IIIa"],["C82.4","U lympho dạng nang độ IIIb"],["C82.5","U lympho trung tâm nang tỏa rộng"],["C82.6","U lympho trung tâm nang da"],["C82.7","Loại khác của u lympho dạng nang"],["C82.9","U lympho dạng nang, không xác định"],["C83","U Lympho dạng không phải nang"],["C83.0","U lympho không Hodgkin tế bào B nhỏ"],["C83.1","U lympho không Hodgkin tế bào Mantle"],["C83.2","U lympho không Hodgkin hỗn hợp tế bào nhỏ-tế bào lớn (toả rộng)"],["C83.3","U lympho không Hodgkin tế bào B lớn tỏa rộng"],["C83.4","U lympho không Hodgkin nguyên bào miễn dịch (toả rộng)"],["C83.5","U lympho không Hodgkin dạng nguyên bào lympho (tỏa rộng)"],["C83.6","U lympho không Hodgkin không biệt hóa tỏa rộng"],["C83.7","U lympho Burkitt"],["C83.8","U lympho không phải dạng nang khác"],["C83.9","U lympho không Hodgkin lan tỏa, không xác định"],["C84","Các loại U lympho tế bào T/NK trưởng thành"],["C84.0","U sùi dạng nấm"],["C84.1","Bệnh Sézary"],["C84.2","U lympho vùng T"],["C84.3","U lympho loại u lympho-biểu mô"],["C84.4","U lympho tế bào T ngoại vi, không phân loại ở nơi khác"],["C84.5","U lympho tế bào T/NK trưởng thành khác"],["C84.6","U lympho tế bào lớn bất sản, ALK- dương tính"],["C84.7","U lympho tế bào lớn bất sản, ALK âm tính"],["C84.8","U lympho tế bào T ở da, không đặc hiệu"],["C84.9","U lympho tế bào T/NK trưởng thành, không đặc hiệu"],["C85","U lympho không Hodgkin, loại khác và không xác định"],["C85.0","U lympho sarcom"],["C85.1","U lympho tế bào B, không đặc hiệu"],["C85.2","U lympho tế bào B lớn trung thất (tuyến ức)"],["C85.7","Loại xác định khác của u lympho không Hodgkin"],["C85.9","U lympho không Hodgkin, loại không xác định"],["C86","Loại xác định khác của u lympho tế bào T/NK"],["C86.0","U lympho tế bào NK/T ngoại nút, loại mũi"],["C86.1","U lympho tế bào T gan- lách"],["C86.2","U lympho tế bào T loại bệnh lý ruột"],["C86.3","U lympho tế bào T giống viêm mô mỡ dưới da"],["C86.4","U lympho nguyên bào NK"],["C86.5","U lympho tế bào T nguyên bào mạch- nguyên bào miễn dịch"],["C86.6","Tăng sinh tế bào T da nguyên phát CD-30 dương tính"],["C88","Bệnh tăng sinh miễn dịch ác tính"],["C88.0","Macroglogulin máu của WaldenstrÖn"],["C88.1","Bệnh chuỗi alpha nặng"],["C88.2","Bệnh chuỗi gamma nặng"],["C88.3","Bệnh tăng sinh miễn dịch ruột non"],["C88.4","U lympho tế bào B ngoài hạch của các mô lympho chế nhầy"],["C88.7","Bệnh tăng sinh miễn dịch ác tính khác"],["C88.9","Bệnh tăng sinh miễn dịch ác tính không đặc hiệu"],["C90","Đa u tủy và các u tương bào"],["C90.0","Đa u tủy"],["C90.1","Bệnh bạch cầu dạng tương bào"],["C90.2","U tương bào ngoài tủy"],["C90.3","Bướu tương bào đơn độc"],["C91","Bệnh bạch cầu dạng lympho"],["C91.0","Bệnh bạch cầu dạng nguyên bào lympho cấp (ALL)"],["C91.1","Bệnh bạch cầu dạng lympho mãn tính của loại tế bào B"],["C91.2","Bệnh bạch cầu dạng lympho bán cấp"],["C91.3","Bệnh bạch cầu dạng tiền lympho của tế bào B"],["C91.4","Bệnh bạch cầu dạng tế bào có lông"],["C91.5","Bệnh bạch cầu dạng tế bào T trưởng thành"],["C91.6","Bệnh bạch cầu dạng tiền lympho của tế bào T"],["C91.7","Bệnh bạch cầu dạng lympho khác"],["C91.8","Bệnh bạch cầu tế bào B trưởng thành loại Burkitt"],["C91.9","Bệnh bạch cầu dạng lympho, không đặc hiệu"],["C92","Bệnh bạch cầu tủy"],["C92.0","Bệnh bạch cầu dạng tủy cấp"],["C92.1","Bệnh bạch cầu dạng tủy mạn [CML], BCR/ABL- dương tính"],["C92.2","Bệnh bạch cầu dạng tủy mãn tính không điển hình, BCR/ABL âm tính"],["C92.3","Ung thư mô liên kết dòng tủy"],["C92.4","Bệnh bạch cầu dạng tiền tủy bào (PML)"],["C92.5","Bệnh bạch cầu dạng tủy đơn nhân cấp"],["C92.6","Bệnh bạch cầu dạng tủy cấp tính có bất thường 11Q23"],["C92.7","Bệnh bạch cầu dạng tủy khác"],["C92.8","Bệnh bạch cầu dạng tủy cấp tính có loạn sản đa dòng"],["C92.9","Bệnh bạch cầu dạng tủy, không đặc hiệu"],["C93","Bệnh bạch cầu đơn nhân"],["C93.0","Bệnh bạch cầu đơn nhân/nguyên bào đơn nhân cấp tính"],["C93.1","Bệnh bạch cầu dòng tủy đơn nhân mãn tính"],["C93.2","Bệnh bạch cầu đơn nhân bán cấp"],["C93.3","Bệnh bạch cầu dòng tủy đơn nhân tuổi vị thành niên"],["C93.7","Bệnh bạch cầu đơn nhân khác"],["C93.9","Bệnh bạch cầu đơn nhân không đặc hiệu"],["C94","Bệnh bạch cầu khác có loại tế bào xác định"],["C94.0","Bệnh bạch cầu dạng tăng hồng cầu"],["C94.1","Bệnh tăng hồng cầu mạn"],["C94.2","Bệnh bạch cầu dạng tiền nguyên tiểu cầu cấp"],["C94.3","Bệnh bạch cầu dạng dưỡng bào"],["C94.4","Bệnh toàn tủy cấp tính có xơ tủy"],["C94.5","Bệnh xơ tủy cấp"],["C94.6","Bệnh loạn sản tủy và tăng sinh tủy, chưa phân loại nơi khác"],["C94.7","Bệnh bạch cầu xác định khác"],["C95","Bệnh bạch cầu có loại tế bào không xác định"],["C95.0","Bệnh bạch cầu cấp loại tế bào không xác định"],["C95.1","Bệnh bạch cầu mạn loại tế bào không xác định"],["C95.2","Bệnh bạch cầu bán cấp loại tế bào không xác định"],["C95.7","Bệnh bạch cầu khác, loại tế bào không xác định"],["C95.9","Bệnh bạch cầu không xác định"],["C96","U ác khác và không xác định của hệ lympho, hệ tạo máu và mô liên quan"],["C96.0","Bệnh tổ chức bào tế bào Langerhans đa ổ và đa hệ thống (rải rác) [bệnh Letterer-Siwe]"],["C96.1","Bệnh mô bào ác tính"],["C96.2","Bệnh dưỡng bào hệ thống xâm lấn"],["C96.3","U lympho mô bào thực sự"],["C96.4","Sarcom tế bào đuôi gai (tế bào phụ)"],["C96.5","Bệnh tổ chức bào tế bào Langerhans đa ổ và đơn hệ thống"],["C96.6","Bệnh tổ chức bào Langerhans đơn ổ"],["C96.7","U ác tính khác của mô dạng lympho, hệ tạo máu và mô liên quan"],["C96.8","Sarcom tổ chức bào"],["C96.9","U ác tính không đặc hiệu của mô dạng lympho, hệ tạo máu và mô liên quan"],["C97","U ác có nhiều vị trí độc lập (nguyên phát) nhiều chỗ"],["D00","Ung thư biểu mô tại chỗ của khoang miệng, thực quản và dạ dày"],["D00.0","Ung thư biểu mô tại chỗ của của môi khoang miệng và hầu"],["D00.1","Ung thư biểu mô tại chỗ của của thực quản"],["D00.2","U ác của Dạ dày"],["D01","Ung thư biểu mô tại chỗ của cơ quan tiêu hóa khác và không xác định"],["D01.0","Ung thư biểu mô tại chỗ của đại tràng"],["D01.1","Ung thư biểu mô tại chỗ nơi nối trực tràng - đại tràng sigma"],["D01.2","Ung thư biểu mô tại chỗ của trực tràng"],["D01.3","Ung thư biểu mô tại chỗ của hậu môn và ống hậu môn"],["D01.4","Ung thư biểu mô tại chỗ của phần khác và không xác định của ruột non"],["D01.5","Ung thư biểu mô tại chỗ của gan, túi mật và đường dẫn mật"],["D01.7","Ung thư biểu mô tại chỗ của cơ quan tiêu hóa xác định khác"],["D01.9","Ung thư biểu mô tại chỗ của cơ quan tiêu hóa không đặc hiệu"],["D02","Ung thư biểu mô tại chỗ của tai giữa và hệ hô hấp"],["D02.0","Ung thư biểu mô tại chỗ của thanh quản"],["D02.1","Ung thư biểu mô tại chỗ của khí quản"],["D02.2","Ung thư biểu mô tại chỗ của phế quản và phổi"],["D02.3","Ung thư biểu mô tại chỗ của phần khác và hệ hô hấp"],["D02.4","Ung thư biểu mô tại chỗ của hệ hô hấp không đặc hiệu"],["D03","U hắc tố tại chỗ"],["D03.0","U hắc tố tại chỗ của môi"],["D03.1","U hắc tố tại chỗ của mi mắt, bao gồm góc mắt"],["D03.2","U hắc tố tại chỗ của tai và ống ngoài tai"],["D03.3","U hắc tố tại chỗ của phần khác và phần không xác định của mặt"],["D03.4","U hắc tố tại chỗ của da đầu và cổ"],["D03.5","U hắc tố tại chỗ của thân mình"],["D03.6","U hắc tố tại chỗ của chi trên, bao gồm vai"],["D03.7","U hắc tố tại chỗ của chi dưới, bao gồm vùng háng"],["D03.8","U hắc tố tại chỗ của vị trí khác"],["D03.9","U hắc tố tại chỗ, không đặc hiệu"],["D04","Ung thư biểu mô tại chỗ của da"],["D04.0","Ung thư biểu mô tại chỗ của da môi"],["D04.1","Ung thư biểu mô tại chỗ của da mí mắt bao gồm góc mắt"],["D04.2","Ung thư biểu mô tại chỗ của da vùng tai và ống tai ngoài"],["D04.3","Ung thư biểu mô tại chỗ của da của phần khác và không xác định của mặt"],["D04.4","Ung thư biểu mô tại chỗ của da đầu và cổ"],["D04.5","Ung thư biểu mô tại chỗ của da thân mình"],["D04.6","Ung thư biểu mô tại chỗ của da chi trên, bao gồm vai"],["D04.7","Ung thư biểu mô tại chỗ của da chi dưới, bao gồm háng"],["D04.8","Ung thư biểu mô tại chỗ của da ở vị trí khác"],["D04.9","Ung thư biểu mô tại chỗ của da, không đặc hiệu"],["D05","Ung thư biểu mô tại chỗ của vú"],["D05.0","Ung thư biểu mô tiểu thuỳ tại chỗ"],["D05.1","Ung thư biểu mô ống tuyến vú tại chỗ"],["D05.7","Ung thư biểu mô ống tuyến khác tại chỗ của vú"],["D05.9","Ung thư biểu mô tại chỗ của vú, không đặc hiệu"],["D06","Ung thư biểu mô tại chỗ của cổ tử cung"],["D06.0","Ung thư biểu mô tại chỗ của nội mạc"],["D06.1","Ung thư biểu mô tại chỗ của ngoại mạc"],["D06.7","Ung thư biểu mô tại chỗ của phần khác của cổ tử cung"],["D06.9","Ung thư biểu mô tại chỗ của cổ tử cung, không đặc hiệu"],["D07","Ung thư biểu mô tại chỗ của cơ quan sinh dục khác và không xác định"],["D07.0","Ung thư biểu mô tại chỗ của nội mạc tử cung"],["D07.1","Ung thư biểu mô tại chỗ của âm hộ"],["D07.2","Ung thư biểu mô tại chỗ của âm đạo"],["D07.3","Ung thư biểu mô tại chỗ của cơ quan sinh dục nữ khác và không xác định"],["D07.4","Ung thư biểu mô tại chỗ của dương vật"],["D07.5","Ung thư biểu mô tại chỗ của tuyến tiền liệt"],["D07.6","Ung thư biểu mô tại chỗ của cơ quan sinh dục nam khác và không xác định"],["D09","Ung thư biểu mô tại chỗ ở vị trí khác và không xác định"],["D09.0","Ung thư biểu mô tại chỗ của bàng quang"],["D09.1","Ung thư biểu mô tại chỗ của cơ quan tiết niệu khác và không xác định"],["D09.2","Ung thư biểu mô tại chỗ của mắt"],["D09.3","Ung thư biểu mô tại chỗ của tuyến giáp và tuyến nội tiết khác"],["D09.7","Ung thư biểu mô tại chỗ ở vị trí xác định khác"],["D09.9","Ung thư biểu mô tại chỗ, không xác định"],["D10","U lành của miệng và hầu"],["D10.0","U lành của môi"],["D10.1","U lành của lưỡi"],["D10.2","U lành của sàn miệng"],["D10.3","U lành của phần khác và không xác định của miệng"],["D10.4","U lành của amiđan"],["D10.5","U lành của phần khác của hầu - khẩu"],["D10.6","U lành của hầu - mũi"],["D10.7","U lành của hạ hầu"],["D10.9","U lành của hầu, không đặc hiệu"],["D11","U lành của các tuyến nước bọt chính"],["D11.0","U lành của tuyến mang tai"],["D11.7","U lành của tuyến nước bọt chính khác"],["D11.9","U lành của tuyến nước bọt chính không đặc hiệu"],["D12","U lành của đại tràng, trực tràng, hậu môn và ống hậu môn"],["D12.0","U lành của manh tràng"],["D12.1","U lành của ruột thừa"],["D12.2","U lành của đại tràng lên"],["D12.3","U lành của đại tràng ngang"],["D12.4","U lành của đại tràng xuống"],["D12.5","U lành của đại tràng sigma"],["D12.6","U lành của Đại tràng không đặc hiệu"],["D12.7","U lành của nơi nối trực tràng sigma - trực tràng"],["D12.8","U lành của trực tràng"],["D12.9","U lành của hậu môn và ống hậu môn"],["D13","U lành của phần khác và không rõ ràng của hệ tiêu hóa"],["D13.0","U lành của thực quản"],["D13.1","U lành của dạ dày"],["D13.2","U lành của tá tràng"],["D13.3","U lành của phần khác và không xác định của ruột non"],["D13.4","U lành của gan"],["D13.5","U lành của đường mật ngoài gan"],["D13.6","U lành của tụy"],["D13.7","U lành của tụy nội tiết"],["D13.9","U lành của vị trí không rõ ràng trong hệ tiêu hóa"],["D14","U lành tai giữa và hệ hô hấp"],["D14.0","U lành của tai giữa, hốc mũi và các xoang phụ"],["D14.1","U lành của thanh quản"],["D14.2","U lành của khí quản"],["D14.3","U lành của phế quản và phổi"],["D14.4","U lành của hệ hô hấp, không đặc hiệu"],["D15","U lành của cơ quan khác và không xác định trong lồng ngực"],["D15.0","U lành của tuyến ức"],["D15.1","U lành của tim"],["D15.2","U lành của trung thất"],["D15.7","U lành của cơ quan trong lồng ngực xác định khác"],["D15.9","U lành của cơ quan trong lồng ngực không đặc hiệu"],["D16","U lành của xương và sụn khớp"],["D16.0","U lành của xương bả vai và xương dài của chi trên"],["D16.1","U lành của xương ngắn của chi trên"],["D16.2","U lành của xương dài của chi dưới"],["D16.3","U lành của xương ngắn của chi dưới"],["D16.4","U lành của xương sọ và mặt"],["D16.5","U lành của xương hàm dưới"],["D16.6","Cột sống"],["D16.7","U lành của xương sườn, xương ức và xương đòn"],["D16.8","U lành của xương chậu, xương thiêng và xương cụt"],["D16.9","U lành của xương và sụn khớp không đặc hiệu"],["D17","U mỡ"],["D17.0","U mỡ lành tính của da và mô dưới da ở đầu, mặt và cổ"],["D17.1","U mỡ lành tính của da và mô dưới da ở thân hình"],["D17.2","U mỡ lành tính của da và mô dưới da ở các chi"],["D17.3","U mỡ lành tính của da và mô dưới da ở vị trí khác và không xác định"],["D17.4","U mỡ lành tính của cơ quan trong lồng ngực"],["D17.5","U mỡ lành tính của cơ quan trong ổ bụng"],["D17.6","U mỡ lành tính của thừng tinh"],["D17.7","U mỡ lành tính của vị trí khác"],["D17.9","U mỡ lành tính không đặc hiệu"],["D18","U mạch máu và u hạch bạch huyết, vị trí bất kỳ"],["D18.0","U mạch máu, vị trí bất kỳ"],["D18.1","U mạch bạch huyết, vị trí bất kỳ"],["D19","U lành của trung mô"],["D19.0","U lành trung mô của màng phổi"],["D19.1","U lành trung mô của phúc mạc"],["D19.7","U lành trung mô của các vị trí khác"],["D19.9","U lành trung mô không xác định"],["D20","U lành mô mềm sau phúc mạc và phúc mạc"],["D20.0","U lành mô mềm sau phúc mạc"],["D20.1","U lành mô mềm phúc mạc"],["D21","U lành khác của mô liên kết và mô mềm khác"],["D21.0","U lành mô liên kết và mô mềm khác của đầu, mặt và cổ"],["D21.1","U lành mô liên kết và mô mềm khác của chi trên bao gồm vai"],["D21.2","U lành mô liên kết và mô mềm khác của chi dưới, bào gồm háng"],["D21.3","U lành mô liên kết và mô mềm khác của lồng ngực"],["D21.4","U lành mô liên kết và mô mềm khác của bụng"],["D21.5","U lành mô liên kết và mô mềm khác của chậu"],["D21.6","U lành mô liên kết và mô mềm khác của thân mình, không đặc hiệu"],["D21.9","U lành mô liên kết và mô mềm khác, không đặc hiệu"],["D22","Nốt ruồi"],["D22.0","Nốt ruồi của môi"],["D22.1","Nốt ruồi của khóe mắt bao gồm mí mắt"],["D22.2","Nốt ruồi của tai và ống tai ngoài"],["D22.3","Nốt ruồi của phần khác và phần không xác định của mặt"],["D22.4","Nốt ruồi của da đầu và cổ"],["D22.5","Nốt ruồi của thân mình"],["D22.6","Nốt ruồi của chi trên bao gồm vai"],["D22.7","Nốt ruồi của chi dưới bao gồm háng"],["D22.9","Nốt ruồi không có gì đặc hiệu"],["D23","U lành khác của da"],["D23.0","U lành da của môi"],["D23.1","U lành da của mi mắt kể cả góc mắt"],["D23.2","U lành da tai và ống tai ngoài"],["D23.3","U lành ở da các phần không xác định khác của mặt"],["D23.4","U lành da đầu và cổ"],["D23.5","U lành da thân mình"],["D23.6","U lành da chi trên, bao gồm vai"],["D23.7","U lành da chi dưới bao gồm háng"],["D23.9","U lành của da, không đặc hiệu"],["D24","U lành vú"],["D25","U cơ trơn tử cung"],["D25.0","U cơ trơn dưới niêm mạc tử cung"],["D25.1","U cơ trơn trong vách tử cung"],["D25.2","U cơ trơn dưới thanh mạc tử cung"],["D25.9","U cơ trơn tử cung, không đặc hiệu"],["D26","U lành khác của tử cung"],["D26.0","U lành cổ tử cung"],["D26.1","U lành thân tử cung"],["D26.7","U lành phần khác của tử cung"],["D26.9","U lành tử cung, không đặc hiệu"],["D27","U lành buồng trứng"],["D28","U lành của cơ quan sinh dục khác và không xác định"],["D28.0","U lành âm hộ"],["D28.1","U lành âm đạo"],["D28.2","U lành vòi tử cung và dây chằng"],["D28.7","U lành cơ quan sinh dục nữ xác định khác"],["D28.9","U lành cơ quan sinh dục nữ, không đặc hiệu"],["D29","U lành của cơ quan sinh dục nam"],["D29.0","U lành của Dương vật"],["D29.1","U lành của Tuyến tiền liệt"],["D29.2","U lành của Tinh hoàn"],["D29.3","U lành của Mào tinh hoàn"],["D29.4","Bìu"],["D29.7","Cơ quan sinh dục nam khác"],["D29.9","Cơ quan sinh dục nam, không đặc hiệu"],["D30","U lành của cơ quan tiết niệu"],["D30.0","U lành của Thận"],["D30.1","U lành của Bồn thận"],["D30.2","U lành của Niệu quản"],["D30.3","U lành của Bàng quang"],["D30.4","U lành của Niệu đạo"],["D30.7","Cơ quan tiết niệu khác"],["D30.9","Cơ quan tiết niệu không đặc hiệu"],["D31","U lành của mắt và phần phụ"],["D31.0","U lành kết mạc"],["D31.1","U lành giác mạc"],["D31.2","U lành võng mạc"],["D31.3","U lành màng mạch mắt"],["D31.4","U lành thể mi"],["D31.5","U lành tuyến và ống lệ"],["D31.6","U lành hốc mắt không đặc hiệu"],["D31.9","U lành của mắt, không đặc hiệu"],["D32","U lành của màng não"],["D32.0","U lành màng não"],["D32.1","U lành màng não tủy sống"],["D32.9","U lành màng não, không đặc hiệu"],["D33","U lành của não và các phần khác của hệ thần kinh trung ương"],["D33.0","U lành của não trên lều"],["D33.1","U lành của não, lều dưới"],["D33.2","U lành của não, không đặc hiệu"],["D33.3","U lành thần kinh sọ não"],["D33.4","U lành của tủy sống"],["D33.7","U lành của phần xác định khác của hệ thần kinh trung ương"],["D33.9","U lành của hệ thần kinh trung ương, không đặc hiệu"],["D34","U lành của tuyến giáp"],["D35","U lành của tuyến nội tiết và không xác định"],["D35.0","U lành tuyến thượng thận"],["D35.1","U lành tuyến cận giáp"],["D35.2","U lành tuyến yên"],["D35.3","U lành ống sọ hầu"],["D35.4","U lành tuyến tùng"],["D35.5","U lành thể cảnh"],["D35.6","U lành thể động mạch chủ và thể cận hạch khác"],["D35.7","U lành tuyến nội tiết xác định khác"],["D35.8","U lành liên quan nhiều tuyến nội tiết"],["D35.9","U lành của tuyến nội tiết, không đặc hiệu"],["D36","U lành có vị trí khác và không xác định"],["D36.0","U lành hạch lympho"],["D36.1","U lành thần kinh ngoại biên và hệ thần kinh tự động"],["D36.7","U lành vị trí xác định khác"],["D36.9","U lành của vị trí không xác định"],["D37","U tân sinh không rõ hoặc không biết tính chất của khoang miệng và cơ quan tiêu hóa"],["D37.0","U tân sinh chưa rõ tính chất của môi, xoang miệng và hầu"],["D37.1","U tân sinh chưa rõ tính chất của dạ dày"],["D37.2","U tân sinh chưa rõ tính chất của ruột non"],["D37.3","U tân sinh chưa rõ tính chất của ruột thừa"],["D37.4","U tân sinh chưa rõ tính chất của đại tràng"],["D37.5","U tân sinh chưa rõ tính chất của trực tràng"],["D37.6","U tân sinh chưa rõ tính chất của gan, túi mật và ống dẫn mật"],["D37.7","U tân sinh chưa rõ tính chất của cơ quan tiêu hóa khác"],["D37.9","U tân sinh chưa rõ tính chất của cơ quan tiêu hóa không đặc hiệu"],["D38","U tân sinh không rõ hoặc không biết tính chất của tai giữa, cơ quan hô hấp và cơ quan trong lồng ngực"],["D38.0","U tân sinh chưa rõ tính chất của thanh quản"],["D38.1","U tân sinh chưa rõ tính chất của khí quản, phế quản và phổi"],["D38.2","U tân sinh chưa rõ tính chất màng phổi"],["D38.3","U tân sinh chưa rõ tính chất của trung thất"],["D38.4","U tân sinh chưa rõ tính chất của tuyến ức"],["D38.5","U tân sinh chưa rõ tính chất của cơ quan hô hấp khác"],["D38.6","U tân sinh chưa rõ tính chất của cơ quan hô hấp không đặc hiệu"],["D39","U không chắc chắn hoặc không biết tính chất của cơ quan sinh dục nữ"],["D39.0","U tân sinh không chắc chắn hoặc không biết tính chất của tử cung"],["D39.1","U tân sinh không chắc chắn hoặc không biết tính chất của buồng trứng"],["D39.2","U tân sinh không chắc chắn hoặc không biết tính chất của nhau (rau) thai"],["D39.7","U tân sinh không chắc chắn hoặc không biết tính chất của cơ quan sinh dục nữ khác"],["D39.9","U tân sinh không chắc chắn hoặc không biết tính chất của cơ quan sinh dục nữ không đặc hiệu"],["D40","U tân sinh không chắc chắn hoặc không biết tính chất của cơ quan sinh dục nam"],["D40.0","U tân sinh không chắc chắn hoặc không biết tính chất của Tiền liệt tuyến"],["D40.1","U tân sinh không chắc chắn hoặc không biết tính chất của Tinh hoàn"],["D40.7","U tân sinh không chắc chắn hoặc không biết tính chất của Các cơ quan sinh dục nam khác"],["D40.9","U tân sinh không chắc chắn hoặc không biết tính chất của Cơ quan sinh dục nam không đặc hiệu"],["D41","U tân sinh không chắc chắn hoặc không biết tính chất của cơ quan tiết niệu"],["D41.0","U tân sinh không chắc chắn hoặc không biết tính chất của Thận"],["D41.1","U tân sinh không chắc chắn hoặc không biết tính chất của Bể thận"],["D41.2","U tân sinh không chắc chắn hoặc không biết tính chất của Niệu quản"],["D41.3","U tân sinh không chắc chắn hoặc không biết tính chất của Niệu đạo"],["D41.4","U tân sinh không chắc chắn hoặc không biết tính chất của Bàng quang"],["D41.7","U tân sinh không chắc chắn hoặc không biết tính chất của Cơ quan tiết niệu khác"],["D41.9","U tân sinh không chắc chắn hoặc không biết tính chất của Cơ quan tiết niệu không đặc hiệu"],["D42","U tân sinh không chắc chắn hoặc không biết tính chất của màng não"],["D42.0","U tân sinh không chắc chắn hoặc không biết tính chất của màng não thuộc não"],["D42.1","U tân sinh không chắc chắn hoặc không biết tính chất của màng não thuộc tủy sống"],["D42.9","U tân sinh không chắc chắn hoặc không biết tính chất của màng não, không đặc hiệu"],["D43","U tân sinh không chắc chắn hoặc không biết tính chất của màng não"],["D43.0","U tân sinh không chắc chắn hoặc không biết tính chất của Não, trên lều não"],["D43.1","U tân sinh không chắc chắn hoặc không biết tính chất của Não, dưới lều não"],["D43.2","U tân sinh không chắc chắn hoặc không biết tính chất của Não, không đặc hiệu"],["D43.3","U tân sinh không chắc chắn hoặc không biết tính chất của Thần kinh sọ"],["D43.4","U tân sinh không chắc chắn hoặc không biết tính chất của tủy sống"],["D43.7","U tân sinh không chắc chắn hoặc không biết tính chất của Phần khác của hệ thần kinh trung ương"],["D43.9","U tân sinh không chắc chắn hoặc không biết tính chất của Hệ thần kinh trung ương, không đặc hiệu"],["D44","U tân sinh không chắc chắn hoặc không biết tính chất của tuyến nội tiết"],["D44.0","U tân sinh không chắc chắn hoặc không biết tính chất của Tuyến giáp"],["D44.1","U tân sinh không chắc chắn hoặc không biết tính chất của Tuyến thượng thận"],["D44.2","U tân sinh không chắc chắn hoặc không biết tính chất của Tuyến cận giáp"],["D44.3","U tân sinh không chắc chắn hoặc không biết tính chất của Tuyến yên"],["D44.4","U tân sinh không chắc chắn hoặc không biết tính chất của Ống sọ-hầu"],["D44.5","U tân sinh không chắc chắn hoặc không biết tính chất của Tuyến tùng"],["D44.6","U tân sinh không chắc chắn hoặc không biết tính chất của Thể cảnh"],["D44.7","U tân sinh không chắc chắn hoặc không biết tính chất của Thể động mạch chủ và thể cận hạch khác"],["D44.8","U tân sinh không chắc chắn hoặc không biết tính chất liên quan nhiều tuyến nội tiết"],["D44.9","U lành của tuyến nội tiết không đặc hiệu"],["D45","U tân sinh không chắc chắn hoặc không biết tính chất của tuyến nội tiết"],["D46","Hội chứng loạn sản tủy xương"],["D46.0","Thiếu máu kháng điều trị không có nguyên hồng cầu sắc hình vòng, được xác lập như vậy"],["D46.1","Thiếu máu kháng điều trị có nguyên hồng cầu hình vòng"],["D46.2","Thiếu máu đề kháng với quá nhiều nguyên bào"],["D46.3","Thiếu máu đề kháng với quá nhiều nguyên bào chuyển dạng"],["D46.4","Thiếu máu đề kháng, không đặc hiệu"],["D46.5","Thiếu máu kháng điều trị có loạn sản đa dòng"],["D46.6","Hội chứng loạn sản tủy có bất thường nhiễm sắc thể del (5q) đơn độc"],["D46.7","Hội chứng loạn sản tủy xương khác"],["D46.9","Hội chứng loạn tủy xương không đặc hiệu"],["D47","U tân sinh khác không chắc chắn hoặc không biết sinh chất của mô ulympho, mô tạo huyết và mô liên quan"],["D47.0","Bệnh dưỡng bào hệ thống không triệu chứng"],["D47.1","Bệnh bạch cầu dòng trung tính mãn tính"],["D47.2","Bệnh lý gamma globulin đơn dòng chưa xác định ý nghĩa"],["D47.3","Bệnh tăng tiểu cầu (xuất huyết) vô căn"],["D47.4","Bệnh xơ hóa tủy xương"],["D47.5","Bệnh bạch cầu dòng tế bào ưa acid mãn tính [hội chứng tăng bạch cầu ưa acid]"],["D47.7","U tân sinh xác định khác, không rõ hoặc không biết tính chất của mô lympho, mô tạo huyết và mô liên quan"],["D47.9","U tân sinh không đặc hiệu, không chắc chắn hoặc không biết rõ tính chất của mô lympho, mô tạo huyết và mô liên quan"],["D48","U tân sinh không chắc chắn hoặc không biết tính chất có vị trí khác và không xác định"],["D48.0","U tân sinh không xác định, không chắc chắn hoặc không biết rõ tính chất của xương và sụn khớp"],["D48.1","U tân sinh không xác định, không chắc chắn hoặc không biết rõ tính chất của mô liên kết và mô mềm khác"],["D48.2","U tân sinh không xác định, không chắc chắn hoặc không biết rõ tính chất của thần kinh ngoại biên và hệ thần kinh tự động"],["D48.3","U tân sinh không xác định, không chắc chắn hoặc không biết rõ tính chất của vùng sau phúc mạc"],["D48.4","U tân sinh không xác định, không chắc chắn hoặc không biết rõ tính chất của phúc mạc"],["D48.5","U tân sinh không xác định, không chắc chắn hoặc không biết rõ tính chất của da"],["D48.6","U tân sinh không xác định, không chắc chắn hoặc không biết rõ tính chất của vú"],["D48.7","U tân sinh không xác định, không chắc chắn hoặc không biết rõ tính chất của vị trí xác định khác"],["D48.9","U tân sinh không chắc chắn hoặc không biết tính chất, không đặc hiệu"],["D50","Thiếu máu do thiếu sắt"],["D50.0","Thiếu máu thiếu sắt thứ phát do mất máu (mãn tính)"],["D50.1","Chứng khó nuốt do thiếu sắt"],["D50.8","Các thiếu máu thiếu sắt khác"],["D50.9","Thiếu máu thiếu sắt không đặc hiệu"],["D51","Thiếu máu do thiếu vitamin B12"],["D51.0","Thiếu máu thiếu vitamin B12 do thiếu yếu tố nội"],["D51.1","Thiếu vitamin B12 do giảm hấp thu chọn lọc vitamin B12 kèm theo đái protein"],["D51.2","Thiếu Transcobalamin II"],["D51.3","Thiếu máu thiếu vitamin B12 khác do dinh dưỡng"],["D51.8","Các thiếu máu thiếu vitamin B12 khác"],["D51.9","Thiếu máu thiếu vitamin B12 không đặc hiệu"],["D52","Thiếu máu do chế độ dinh dưỡng"],["D52.0","Thiếu máu thiếu folate do chế độ dinh dưỡng"],["D52.1","Thiếu máu thiếu folate do thuốc"],["D52.8","Các thiếu máu thiếu folate khác"],["D52.9","Thiếu máu thiếu folate không đặc hiệu"],["D53","Các thiếu máu dinh dưỡng khác"],["D53.0","Thiếu máu do thiếu protein"],["D53.1","Các thiếu máu nguyên hồng cầu khổng lồ khác, chưa được phân loại ở phần khác"],["D53.2","Thiếu máu thiếu vitamin C"],["D53.8","Các thiếu máu dinh dưỡng đặc hiệu khác"],["D53.9","Thiếu máu dinh dưỡng không đặc hiệu"],["D55","Thiếu máu do rối loạn men"],["D55.0","Thiếu máu do thiếu men glucose-6-phosphate dehydrogenase"],["D55.1","Thiếu máu do các rối loạn chuyển hóa glutathione khác"],["D55.2","Thiếu máu do rối loạn các men phân giải glucose"],["D55.3","Thiếu máu do rối loạn chuyển hóa nucleotide"],["D55.8","Các thiếu máu khác do rối loạn men"],["D55.9","Thiếu máu do rối loạn men, không đặc hiệu"],["D56","Bệnh Thalassaemia"],["D56.0","Alpha thalassaemia"],["D56.1","Beta thalassaemia"],["D56.2","Delta-beta thalassaemia"],["D56.3","Thalassaemia vết"],["D56.4","Tồn tại di truyền huyết sắc tố bào thai [HPFH]"],["D56.8","Các thalassaemias khác"],["D56.9","Thalassaemia không đặc hiệu"],["D57","Bệnh hồng cầu liềm"],["D57.0","Thiếu máu hồng cầu liềm có cơn tan máu"],["D57.1","Thiếu máu hồng cầu liềm không có cơn tan máu"],["D57.2","Di hợp tử kép hồng cầu hình liềm với các Hb bất thường khác"],["D57.3","Hồng cầu liềm thể nhẹ"],["D57.8","Các rối loạn hồng cầu liềm khác"],["D58","Các thiếu máu tan máu di truyền khác"],["D58.0","Hồng cầu hình cầu di truyền"],["D58.1","Hồng cầu hình elip di truyền"],["D58.2","Các bệnh huyết sắc tố khác"],["D58.8","Các thiếu máu tan máu di truyền đặc hiệu khác"],["D58.9","Thiếu máu tan máu di truyền không đặc hiệu"],["D59","Thiếu máu tan máu mắc phải"],["D59.0","Thiếu máu tan máu tự miễn dịch do thuốc"],["D59.1","Các thiếu máu tan máu tự miễn dịch khác"],["D59.2","Thiếu máu tan máu do thuốc không phải tự miễn dịch"],["D59.3","Hội chứng tan máu urê máu cao"],["D59.4","Các thiếu máu tan máu không phải tự miễn dịch khác"],["D59.5","Đái huyết sắc tố kịch phát ban đêm [Hội chứng Marchifava-Micheli]"],["D59.6","Đái huyết sắc tố do tan máu từ những nguyên nhân bên ngoài khác"],["D59.8","Các thiếu máu tan máu mắc phải khác"],["D59.9","Thiếu máu tan máu mắc phải không đặc hiệu"],["D60","Suy tủy xương một dòng hồng cầu mắc phải (giảm nguyên hồng cầu)"],["D60.0","Suy tủy xương một dòng hồng cầu mắc phải mãn tính"],["D60.1","Suy tủy xương một dòng hồng cầu mắc phải thoáng qua"],["D60.8","Suy tủy xương một dòng hồng cầu mắc phải khác"],["D60.9","Suy tủy xương một dòng hồng cầu mắc phải không đặc hiệu"],["D61","Các thể suy tủy xương khác"],["D61.0","Suy tủy xương bẩm sinh"],["D61.1","Suy tủy xương do thuốc"],["D61.2","Suy tủy xương do các nguyên nhân bên ngoài khác"],["D61.3","Suy tủy xương vô căn"],["D61.8","Suy tủy xương đặc hiệu khác"],["D61.9","Suy tủy xương không đặc hiệu khác"],["D62","Thiếu máu sau chảy máu cấp tính"],["D63","Thiếu máu trong các bệnh mãn tính đã được phân loại ở phần khác"],["D63*","Thiếu máu trong các bệnh mãn tính đã được phân loại ở phần khác"],["D63.0","Thiếu máu trong bệnh ác tính (C00-D48†)"],["D63.0*","Thiếu máu trong bệnh ác tính (C00-D48†)"],["D63.8","Thiếu máu trong các bệnh mãn tính đã được phân loại ở phần khác"],["D63.8*","Thiếu máu trong các bệnh mãn tính đã được phân loại ở phần khác"],["D64","Các thiếu máu khác"],["D64.0","Thiếu máu nhược sắc có nguyên hồng cầu"],["D64.1","Thiếu máu nguyên hồng cầu sắt thứ phát do bệnh lý"],["D64.2","Thiếu máu nguyên hồng cầu sắt thứ phát do thuốc và độc chất"],["D64.3","Các thiếu máu nguyên hồng cầu sắt khác"],["D64.4","Thiếu máu rối loạn sinh sản dòng hồng cầu bẩm sinh"],["D64.8","Các thiếu máu đặc hiệu khác"],["D64.9","Thiếu máu không đặc hiệu"],["D65","Đông máu nội mạch rải rác (hội chứng tiêu fibrin)"],["D66","Thiếu yếu tố VIII di truyền"],["D67","Thiếu yếu tố IX di truyền"],["D68","Các bất thường đông máu khác"],["D68.0","Bệnh Von Willebrand"],["D68.1","Thiếu yếu tố XI di truyền"],["D68.2","Thiếu các yếu tố đông máu khác do di truyền"],["D68.3","Xuất huyết trong khi sử dụng dài ngày các chất chống đông máu"],["D68.4","Thiếu hụt yếu tố đông máu mắc phải"],["D68.5","Bệnh tăng đông máu nguyên phát"],["D68.6","Bệnh tăng đông máu khác"],["D68.8","Các rối loạn đông máu đặc biệt khác"],["D68.9","Rối loạn đông máu không đặc hiệu"],["D69","Ban xuất huyết và các tình trạng xuất huyết khác"],["D69.0","Ban xuất huyết dị ứng"],["D69.1","Bất thường chất lượng tiểu cầu"],["D69.2","Ban xuất huyết không giảm tiểu cầu khác"],["D69.3","Ban xuất huyết giảm tiểu cầu vô căn"],["D69.4","Giảm tiểu cầu tiên phát khác"],["D69.5","Giảm tiểu cầu thứ phát"],["D69.6","Giảm tiểu cầu không đặc hiệu"],["D69.8","Các tình trạng xuất huyết đặc hiệu khác"],["D69.9","Tình trạng xuất huyết không đặc hiệu"],["D70","Tình trạng không có bạch cầu hạt"],["D71","Rối loạn chức năng bạch cầu hạt trung tính"],["D72","Các rối loạn khác của bạch cầu"],["D72.0","Bất thường di truyền của bạch cầu"],["D72.1","Tình trạng tăng bạch cầu ưa acid"],["D72.8","Các rối loạn đặc hiệu khác của bạch cầu"],["D72.9","Rối loạn bạch cầu không đặc hiệu"],["D73","Bệnh lý lách"],["D73.0","Thiểu năng lách"],["D73.1","Cường lách"],["D73.2","Lách to sung huyết mãn tính"],["D73.3","Áp xe lách"],["D73.4","Nang lách"],["D73.5","Nhồi máu lách"],["D73.8","Các bệnh khác của lách"],["D73.9","Bệnh lách không đặc hiệu"],["D74","methemoglobin máu"],["D74.0","methemoglobin máu bẩm sinh"],["D74.8","methaemoglobin máu khác"],["D74.9","Methaemoglobin máu không đặc hiệu"],["D75","Các bệnh máu và cơ quan tạo máu khác"],["D75.0","Tăng hồng cầu gia đình"],["D75.1","Bệnh tăng hồng cầu thứ phát"],["D75.2","Tăng tiểu cầu tiền phát"],["D75.8","Các bệnh đặc hiệu khác của máu và cơ quan tạo máu"],["D75.9","Bệnh của máu và cơ quan tạo máu không đặc hiệu"],["D76","Các bệnh của tổ chức lympho- liên võng và - (tổ chức bào) mô bào- liên võng xác định khác"],["D76.0","Bệnh tổ chức bào tế bào langerhans, chưa được phân loại ở phần khác"],["D76.1","Bệnh tổ chức bào thực bào đơn nhân"],["D76.2","Hội chứng thực bào tế bào máu liên quan đến nhiễm trùng"],["D76.3","Các hội chứng mô bào khác"],["D77","Rối loạn của máu và cơ quan tạo máu trong các bệnh khác"],["D77*","Rối loạn của máu và cơ quan tạo máu trong các bệnh khác"],["D80","Thiếu hụt miễn dịch chủ yếu do bất thường kháng thể"],["D80.0","Giảm gammaglobulin máu di truyền"],["D80.1","Giảm gammaglobulin máu không có yếu tố gia đình"],["D80.2","Thiếu hụt immunoglobulin A IgA chọn lọc"],["D80.3","Thiếu hụt immunoglobulin A IgA chọn lọc"],["D80.4","Thiếu hụt immunoglobulin M [IgM] chọn lọc"],["D80.5","Suy giảm miễn dịch có tăng immunoglobulin M [IgM]"],["D80.6","Thiếu hụt kháng thể với hàm lượng các immunoglobulin giảm ít hoặc tăng ịmmuglobulin máu"],["D80.7","Thiếu hụt gammaglobulin máu thoáng qua ở trẻ nhỏ"],["D80.8","Suy giảm miễn dịch khác do thiếu kháng thể là chủ yếu"],["D80.9","Thiếu hụt miễn dịch do thiếu kháng thể là chủ yếu, không đặc hiệu"],["D81","Suy giảm miễn dịch kết hợp"],["D81.0","Suy giảm miễn dịch hỗn hợp nặng [SCID] với loạn sinh liên võng"],["D81.1","Suy giảm miễn dịch hỗn hợp nặng [SCID] với giảm số lượng lympho T và B"],["D81.2","Thiếu hụt miễn dịch kết hợp nguy kịch [SCID] với số lượng lympho B thấp hoặc bình thường"],["D81.3","Thiếu hụt enzim adenosine deaminase [ADA]"],["D81.4","Hội chứng Nezelof"],["D81.5","Thiếu hụt emzim purine nucleoside phosphorylase [PNP]"],["D81.6","Thiếu hụt phức hợp hoà hợp tổ chức lớp I (MHC I)"],["D81.7","Thiếu hụt phức hợp hoà hợp tổ chức lớp II (MHC II)"],["D81.8","Các suy giảm miễn dịch kết hợp khác"],["D81.9","Suy giảm miễn dịch hỗn hợp không đặc hiệu"],["D82","Suy giảm miễn dịch liên quan đến các bất thường nặng khác"],["D82.0","Hội chứng Wiskott-Aldrich"],["D82.1","Hội chứng Di George s"],["D82.2","Suy giảm miễn dịch kèm chứng ngắn chi"],["D82.3","Suy giảm miễn dịch sau đáp ứng với virus Epstein-Barr bị khuyết thiếu mang tính di truyền"],["D82.4","Hội chứng tăng immunoglobulin E [IgE]"],["D82.8","Suy giảm miễn dịch liên quan với các bất thường lớn đặc hiệu khác"],["D82.9","Suy giảm miễn dịch khiếm khuyết chủ yếu, không đặc hiệu"],["D83","Một số các biến thể khác của suy giảm miễn dịch"],["D83.0","Suy giảm miễn dịch một số biến thể do bất thường về số lượng và chức năng lympho B"],["D83.1","Suy giảm miễn dịch biến thể chủ yếu do rối loạn điều hoà miễn dịch của lympho T"],["D83.2","Suy giảm miễn dịch biến thể phổ biến với tự kháng thể chống lympho B hoặc T"],["D83.8","Các suy giảm miễn dịch biến thiên phổ biến khác"],["D83.9","Suy giảm miễn dịch biến thiên phổ biến không đặc hiệu"],["D84","Các suy giảm miễn dịch khác"],["D84.0","Bất thường kháng nguyên chức năng 1 của lymphocyte [LFA-1]"],["D84.1","Các bất thường của hệ thống bổ thể"],["D84.8","Các suy giảm miễn dịch đặc hiệu khác"],["D84.9","Suy giảm miễn dịch không đặc hiệu"],["D86","Bệnh sarcoid"],["D86.0","Bệnh sarcoid phổi"],["D86.1","Bệnh sarcoid hạch bạch huyết"],["D86.2","Bệnh sarcoid phổi và hạch bạch huyết"],["D86.3","Bệnh sarcoid da"],["D86.8","Bệnh sarcoid hỗn hợp và tại các khu vực khác"],["D86.9","Bệnh sarcoid không đặc hiệu"],["D89","Rối loạn liên quan đến cơ chế miễn dịch, chưa phân loại nơi khác"],["D89.0","Tăng gammaglobulin máu đa dòng"],["D89.1","Bệnh kháng thể (tăng globulin) ngưng kết lạnh"],["D89.2","Tăng gammaglobulin máu không đặc hiệu"],["D89.3","Hội chứng tái tạo miễn dịch"],["D89.8","Các rối loạn xác định khác liên quan đến cơ chế miễn dịch, chưa được phân loại ở phần khác"],["D89.9","Rối loạn liên quan đến cơ chế miễn dịch, không đặc hiệu"]];
if (typeof module !== "undefined") module.exports = ICD10;
