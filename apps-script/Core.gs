// Điều phối Xạ trị · phiên bản v2.0
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
  var VERSION = '2.0';

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
      'ghi_chu', 'cap_nhat_luc', 'cap_nhat_boi', 'ly_do_ket_thuc', 'muc_lieu', 'vi_tri', 'muc_dich', 'ngay_mo_phong', 'nguoi_nhap'],
    GiaiDoan: ['id', 'bn_id', 'stt', 'ky_thuat', 'tong_lieu', 'so_buoi', 'muc_lieu', 'trang_thai', 'di_cung',
      'uu_tien', 'ngay_tao', 'ngay_mo_phong', 'ngay_contour_xong', 'ks_email', 'ngay_nhan_kh', 'ngay_kh_xong',
      'can_qa', 'qa_ket_qua', 'ngay_qa', 'ghi_chu', 'cap_nhat_luc', 'cap_nhat_boi'],
    BuoiXa: ['id', 'bn_id', 'ngay', 'buoi_so', 'ktv_email', 'thoi_gian', 'hinh_anh', 'ghi_chu',
      'da_huy', 'huy_boi', 'ly_do_huy', 'gd'],
    LichNgoaiLe: ['id', 'bn_id', 'may', 'ngay', 'loai', 'ghi_chu', 'nguoi', 'thoi_gian', 'da_xoa'],
    NguoiDung: ['email', 'ho_ten', 'vai_tro', 'kich_hoat', 'chuc_vu', 'khoa'],
    PhanCong: ['id', 'ngay', 'vi_tri', 'nhan_vien', 'ghi_chu', 'nguoi', 'thoi_gian'],
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
  var EDIT_FIELDS = ['ma_his', 'ho_ten', 'nam_sinh', 'gioi', 'chan_doan', 'vi_tri', 'muc_dich', 'ngay_mo_phong', 'khoa', 'bs_email', 'ky_thuat',
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
    if (p.tong_lieu !== '' && p.tong_lieu != null && !(num(p.tong_lieu) > 0)) fail('Tổng liều phải lớn hơn 0.');
    if (p.so_buoi !== '' && p.so_buoi != null) {
      var n = num(p.so_buoi);
      if (!(n >= 1 && n <= 60 && Math.round(n) === n)) fail('Số buổi phải là số nguyên từ 1 đến 60.');
    }
  }
  /** Phần chuyên môn còn thiếu (cần đủ trước khi chuyển kỹ sư) */
  function missingRx(p) {
    var m = [];
    if (!p.chan_doan) m.push('chẩn đoán');
    if (!p.ky_thuat) m.push('kỹ thuật');
    if (!(num(p.tong_lieu) > 0)) m.push('tổng liều');
    if (!(num(p.so_buoi) >= 1)) m.push('số buổi');
    return m;
  }
  function validate(p, today) {
    validateBasic(p, today);
    var m = missingRx(p);
    if (m.length) fail('Cần nhập đủ phần chuyên môn: ' + m.join(', ') + '.');
    validateRx(p);
  }
  var EARLY = ['MO_PHONG', 'CONTOUR'];   // bước được phép chưa có chỉ định chuyên môn
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
      if (EARLY.indexOf(step0) >= 0 && !a.boost) validateBasic(p, ctx.today); else validate(p, ctx.today);
      if (a.boost) validateRx(a.boost, ' của boost');
      var dup = ctx.patients.filter(function (x) { return x.ma_his === p.ma_his && x.trang_thai !== 'HOAN_THANH' && x.trang_thai !== 'HUY'; })[0];
      if (dup && !a.force) fail('DUP_HIS:' + dup.ho_ten + ' (' + dup.id + ', ' + STATUS[dup.trang_thai] + ')');
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
        var add = clean(a, ['chan_doan', 'vi_tri', 'muc_dich', 'ky_thuat', 'tong_lieu', 'so_buoi', 'muc_lieu', 'igrt', 'sgrt']);
        var merged = {};
        Object.keys(t.p).forEach(function (k) { merged[k] = t.p[k]; });
        Object.keys(add).forEach(function (k) { if (add[k] !== '') merged[k] = add[k]; });
        var miss = missingRx(merged);
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
        if (p.bs_email !== ctx.user.email) fail('Chỉ bác sĩ điều trị hoặc quản trị được huỷ hồ sơ này.');
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
      if (kh2 && (ctx.dm.KHOA || []).indexOf(kh2) < 0) fail('Khoa không có trong danh mục.');
      if (KHOA_STATS.indexOf(cv) >= 0 && !kh2) fail('Chức vụ "' + cv + '" cần chọn khoa.');
      if (cv && CHUC_VU.indexOf(cv) < 0) fail('Chức vụ không hợp lệ.');
      u.ho_ten = String(a.ho_ten).trim(); u.vai_tro = vt; u.kich_hoat = kh; u.chuc_vu = cv; u.khoa = kh2;
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
      me: { email: ctx.user.email, ho_ten: ctx.user.ho_ten, vai_tro: ctx.user.vai_tro, kich_hoat: ctx.user.kich_hoat || 'Có', chuc_vu: ctx.user.chuc_vu || '', khoa: ctx.user.khoa || '' },
      today: ctx.today,
      users: ctx.users.map(function (u) { return { email: u.email, ho_ten: u.ho_ten, vai_tro: u.vai_tro, kich_hoat: u.kich_hoat === 'Không' ? 'Không' : 'Có', chuc_vu: u.chuc_vu || '', khoa: u.khoa || '' }; }),
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
  function report(data, tu, den, u) {
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
      ovFx = fx.filter(function (f) { return P[f.bn_id].bs_email === u.email; });
      ovPts = Object.keys(P).map(function (k) { return P[k]; }).filter(function (p) { return p.bs_email === u.email; });
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
    // Theo bác sĩ: trưởng khoa / ĐD trưởng / tài khoản khoa / quản trị thấy cả khoa; bác sĩ chỉ thấy dòng của mình
    if (sc.byDoctor) out.theo_bac_si = rows(function (f) { return P[f.bn_id].bs_email; }, function (f) { return inKhoa(P[f.bn_id]); });
    else if (u.vai_tro === 'BS') out.theo_bac_si = rows(function (f) { return P[f.bn_id].bs_email; }, function (f, k) { return k === u.email; });
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
    VERSION: VERSION, CHUC_VU: CHUC_VU, isLead: isLead, statsScope: statsScope, report: report, STATUS: STATUS, STATUS_ORDER: STATUS_ORDER, PLAN_STATES: PLAN_STATES, ROLES: ROLES, PRIORITY_RANK: PRIORITY_RANK, DOW: DOW,
    COLS: COLS, DEFAULT_DM: DEFAULT_DM, DM_EDITABLE: DM_EDITABLE, can: can, handle: handle, view: view, localCtx: localCtx,
    makeEnv: makeEnv, course: course, segments: segments, totalFx: totalFx, planningQueue: planningQueue,
    isTreatDay: isTreatDay, baseDay: baseDay, patternDay: patternDay, isDown: isDown, exceptionOf: exceptionOf,
    scheduleLabel: scheduleLabel, missingRx: missingRx, needsOffDay: needsOffDay, offDay: offDay, dosePerFx: dosePerFx,
    addDays: addDays, diffDays: diffDays, dow: dow, monday: monday, isDate: isDate, num: num, splitList: splitList, fxOf: fxOf
  };
})();
if (typeof module !== 'undefined') module.exports = RT;
