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
  var VERSION = '__VERSION__';

  var STATUS_ORDER = ['CHO_PL', 'MO_PHONG', 'CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA', 'CHO_XA', 'DANG_XA', 'TAM_NGUNG', 'HOAN_THANH', 'KHONG_XA'];
  var STATUS = {
    CHO_PL: 'Chờ phân loại',
    KHONG_XA: 'Không xạ',
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
      'ghi_chu', 'cap_nhat_luc', 'cap_nhat_boi', 'ly_do_ket_thuc', 'muc_lieu', 'vi_tri', 'muc_dich', 'ngay_mo_phong', 'nguoi_nhap', 'icd', 'ly_do_uu_tien', 'tg_nop_kh',
      'de_xuat_lich', 'de_xuat_boi', 'de_xuat_luc', 'xn_tam_ngung', 'nguoi_mo_phong', 'mat_na', 'tiem_thuoc', 'dung_cu', 'icd_phu', 'chuyen_buoi', 'mp_his', 'mat_na_cu'],
    GiaiDoan: ['id', 'bn_id', 'stt', 'ky_thuat', 'tong_lieu', 'so_buoi', 'muc_lieu', 'trang_thai', 'di_cung',
      'uu_tien', 'ngay_tao', 'ngay_mo_phong', 'ngay_contour_xong', 'ks_email', 'ngay_nhan_kh', 'ngay_kh_xong',
      'can_qa', 'qa_ket_qua', 'ngay_qa', 'ghi_chu', 'cap_nhat_luc', 'cap_nhat_boi', 'ly_do_uu_tien', 'tg_nop_kh', 'nguoi_mo_phong', 'mat_na', 'tiem_thuoc', 'dung_cu', 'loai', 'thay_gd', 'cat_tai', 'bo_qua', 'vi_tri', 'chuyen_buoi', 'mp_his', 'mat_na_cu'],
    BuoiXa: ['id', 'bn_id', 'ngay', 'buoi_so', 'ktv_email', 'thoi_gian', 'hinh_anh', 'ghi_chu',
      'da_huy', 'huy_boi', 'ly_do_huy', 'gd', 'ghi_bu', 'ly_do_bu', 'ktv_xa'],
    LichNgoaiLe: ['id', 'bn_id', 'may', 'ngay', 'loai', 'ghi_chu', 'nguoi', 'thoi_gian', 'da_xoa'],
    NguoiDung: ['email', 'ho_ten', 'vai_tro', 'kich_hoat', 'chuc_vu', 'khoa', 'tro_ly_cho', 'ky_hieu', 'nhan_bn'],
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
  DEFAULT_DM.MUC_DICH = ['Triệt căn', 'Bổ trợ', 'Tân bổ trợ', 'Củng cố', 'Giảm nhẹ / triệu chứng', 'Xạ lại'];
  /** Mô phỏng: loại mặt nạ, dụng cụ khác */
  DEFAULT_DM.MAT_NA = ['3 điểm', '4 điểm', '5 điểm', '6 điểm'];
  DEFAULT_DM.DUNG_CU = ['Miếng bù da', 'Nêm lưỡi'];
  /** Chỉ tiêu số BN đang xạ của mỗi khoa, dạng "Khoa: tối thiểu-tối đa" */
  DEFAULT_DM.CHI_TIEU = ['Xạ trị: 90-100', 'Xạ trị theo yêu cầu: 80-90'];
  /** Chọn nhanh khi nhập tổng liều (Gy) và số buổi */
  DEFAULT_DM.LIEU_HAY_DUNG = ['70', '66', '60', '50.4', '50', '30'];
  DEFAULT_DM.SO_BUOI_HAY_DUNG = ['10', '28', '30', '33', '35'];
  /** Báo cáo khoa: đơn giá mỗi buổi xạ (thành tiền = số buổi × đơn giá; cột setup để trống như sổ khoa) */
  DEFAULT_DM.DON_GIA = ['Buổi xạ: 21000'];
  /** Khung ký tên cuối báo cáo, dạng "Chức danh: Họ tên" (họ tên để trống được) */
  DEFAULT_DM.KY_TEN = ['Người lập biểu', 'Trưởng khoa', 'Khoa Vật lý xạ trị', 'Phòng TCCB', 'Phòng TCKT', 'Phòng KHTH', 'Giám đốc'];
  DEFAULT_DM.LY_DO_VANG = ['Mệt / tác dụng phụ', 'Bận việc riêng', 'Đang điều trị khác (nội trú, cấp cứu…)', 'Không đến, không báo', 'Khác'];
  DEFAULT_DM.VI_TRI = ['Đầu cổ', 'Vòm họng', 'Não (toàn não)', 'Não (khu trú)', 'Vú trái', 'Vú phải', 'Thành ngực',
    'Phổi', 'Thực quản', 'Trung thất', 'Dạ dày', 'Tuỵ', 'Gan', 'Trực tràng', 'Cổ tử cung', 'Nội mạc tử cung',
    'Tuyến tiền liệt', 'Bàng quang', 'Tiểu khung', 'Cột sống cổ', 'Cột sống ngực', 'Cột sống thắt lưng',
    'Xương chậu', 'Xương chi', 'Hạch', 'Da / mô mềm'];
  DEFAULT_DM.VI_TRI_PC = ['Ca 1', 'Ca 2', 'Ca 3', 'Ca 4', 'Mô phỏng'];
  /** Giờ các ca xạ ("Ca 1: 07:00-09:30"): để biết KTV nào xạ buổi nào. Để trống thì lấy mọi ca của ngày. */
  DEFAULT_DM.GIO_CA = [];
  var CHUC_VU = ['KTV trưởng', 'Điều dưỡng trưởng', 'Trưởng khoa', 'Phó trưởng khoa', 'Trưởng phòng', 'Tài khoản khoa'];
  /** Chức vụ được xem thống kê theo người của cả khoa mình */
  var KHOA_STATS = ['Trưởng khoa', 'Điều dưỡng trưởng', 'Tài khoản khoa'];
  /** Lãnh đạo khoa: thống kê và lọc theo từng bác sĩ trong khoa mình (v2.7: tài khoản khoa không còn quyền này) */
  var KHOA_LEAD = ['Trưởng khoa', 'Điều dưỡng trưởng'];
  /** Đơn vị của nhân viên: các khoa điều trị (danh mục KHOA) + khoa không nhận bệnh nhân */
  var KHOA_KHAC = ['Vật lý xạ trị'];
  function staffKhoa(dm) { return (dm.KHOA || []).concat(KHOA_KHAC.filter(function (k) { return (dm.KHOA || []).indexOf(k) < 0; })); }
  var DM_EDITABLE = ['VI_TRI_PC', 'GIO_CA', 'VI_TRI', 'MUC_DICH', 'MAY', 'NGAY_LE', 'KY_THUAT', 'IGRT', 'HINH_ANH', 'KHOA', 'LY_DO_TAM_NGUNG', 'LY_DO_VANG', 'TEN_DON_VI', 'CHI_TIEU', 'LIEU_HAY_DUNG', 'SO_BUOI_HAY_DUNG', 'DON_GIA', 'KY_TEN', 'MAT_NA', 'DUNG_CU'];

  var PERM = {
    createPatient: ['BS', 'KS', 'KTV', 'DD', 'ADMIN'],
    updatePatient: ['BS', 'ADMIN'],
    contourDone: ['BS', 'ADMIN'],
    setPriority: ['BS', 'KS', 'ADMIN'],
    claimPlan: ['KS', 'ADMIN'],
    markAbsent: ['BS', 'KTV', 'DD', 'ADMIN'],
    planDone: ['KS', 'ADMIN'],
    qaResult: ['KS', 'ADMIN'],
    returnToDoctor: ['KS', 'ADMIN'],
    schedule: ['KTV', 'ADMIN'],
    approveSchedule: ['KTV', 'ADMIN'],
    importPatients: ['ADMIN'],
    setReview: ['BS', 'KS', 'ADMIN'],
    noTreat: ['BS', 'ADMIN'],
    replan: ['BS', 'ADMIN'],
    classifyPatient: ['KTV', 'BS', 'KS', 'ADMIN'],
    changeTech: ['KS', 'ADMIN'],
    setOffDay: ['KTV', 'ADMIN'],
    fixOffDays: ['ADMIN'],
    importFull: ['ADMIN'],
    transferDoctor: ['BS', 'ADMIN'],
    rejectSchedule: ['KTV', 'ADMIN'],
    confirmPause: ['BS', 'ADMIN'],
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
  PERM.importHisBook = ['ADMIN'];
  // Quyền thêm theo chức vụ (ngoài quyền của vai trò)
  var LEAD_PERM = {
    setRoster: ['KTV trưởng'], copyRoster: ['KTV trưởng'], importPatients: ['KTV trưởng'], machineDown: ['KTV trưởng'], machineUp: ['KTV trưởng'],
    setNotice: CHUC_VU, clearNotice: CHUC_VU,
    importHisBook: ['Trưởng khoa', 'Điều dưỡng trưởng', 'Tài khoản khoa', 'KTV trưởng']
  };
  /** Xếp lịch xạ, đổi ngày xạ: chỉ KTV trưởng (theo chức vụ) và quản trị. Không còn đề xuất lịch (v3.2). */
  var SCHED_ACTIONS = ['schedule', 'setDay', 'approveSchedule', 'rejectSchedule'];
  /** Các bác sĩ mà người này phụ trách bệnh nhân: chính mình + bác sĩ chính nếu là trợ lý */
  function myDoctors(u) { return u ? [u.email].concat(u.tro_ly_cho && u.vai_tro === 'BS' ? [u.tro_ly_cho] : []) : []; }
  /** Được đứng tên BS điều trị: bác sĩ đang hoạt động; BS trợ lý chỉ khi Quản trị tích "Được làm BS điều trị" (nhan_bn) */
  /** Huỷ hồ sơ chỉ khi BN CHƯA mô phỏng (Chờ mô phỏng, hoặc chờ phân loại không có ngày mô phỏng / buổi xạ). Đã mô phỏng → chỉ Không xạ. */
  function canCancel(p, fractions) { return p.trang_thai === 'MO_PHONG' || (p.trang_thai === 'CHO_PL' && !p.ngay_mo_phong && !fxOf(p, fractions || []).length); }
  function canTreat(u) { return !!u && u.kich_hoat !== 'Không' && (u.vai_tro === 'BS' || u.vai_tro === 'ADMIN') && !(u.vai_tro === 'BS' && u.tro_ly_cho && u.nhan_bn !== 'Có'); }
  /** Chặn gán BN mới / đổi BS sang trợ lý chưa được phép (BN cũ đứng tên trợ lý giữ nguyên) */
  function checkTreat(ctx, email, old) {
    if (!email || email === old) return;
    var u = ctx.users.filter(function (x) { return x.email === email; })[0];
    if (u && u.vai_tro === 'BS' && u.tro_ly_cho && u.nhan_bn !== 'Có') fail(u.ho_ten + ' là BS trợ lý, chưa được Quản trị cho phép làm BS điều trị. Chọn BS chính (' + userName(ctx, u.tro_ly_cho) + '), hoặc nhờ Quản trị tích ô "Được làm BS điều trị".');
  }
  function isLead(u) { return !!(u && u.chuc_vu && CHUC_VU.indexOf(u.chuc_vu) >= 0); }
  function can(role, action, user, users) {
    if (SCHED_ACTIONS.indexOf(action) >= 0) return !!(user && user.kich_hoat !== 'Không') && isKtvLead(user);
    if ((PERM[action] || []).indexOf(role) >= 0) return true;
    if (user && user.chuc_vu === 'Tài khoản khoa' && ((PERM[action] || []).indexOf('DD') >= 0 || (PERM[action] || []).indexOf('KTV') >= 0)) return true;
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
    var env = { today: today, holidays: holidays || [], exBy: {}, absBy: {}, down: {}, phasesBy: {}, defMay: defMay || '' };
    (exceptions || []).forEach(function (e) {
      if (e.da_xoa === 'Có') return;
      if (e.loai === 'MAY_NGHI') { (env.down[e.may] = env.down[e.may] || {})[e.ngay] = e; return; }
      if (e.loai === 'VANG') { if (e.bn_id) (env.absBy[e.bn_id] = env.absBy[e.bn_id] || {})[e.ngay] = e; return; }
      if (e.loai === 'THONG_BAO') return;
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
    if (needsOffDay(p)) return w >= 1 && w <= 6;
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
  function scheduleLabel(p) { var off = offDay(p); return off ? 'T2–T7, nghỉ ' + DOW[off] : needsOffDay(p) ? 'T2–T7, chưa rõ ngày nghỉ' : 'T2–T6'; }
  /** IMRT/VMAT chưa chọn lịch tuần (ô trống): tạm xạ cả Thứ 7, nhắc KTV chọn ngày nghỉ. '0' = đã chọn T2–T6 (không xạ Thứ 7). */
  function needsOffDay(p) { return /IMRT|VMAT/i.test(p.ky_thuat || '') && String(p.ngay_nghi_tuan == null ? '' : p.ngay_nghi_tuan).trim() === ''; }
  /** Các vị trí xạ của BN (nhiều vị trí cách nhau dấu phẩy / chấm phẩy / dấu +) */
  function viTris(p) { return String((p && p.vi_tri) || '').split(/\s*[,;+]\s*/).map(function (x) { return x.trim(); }).filter(Boolean); }

  function dosePerFx(x) { var n = num(x.so_buoi); return n ? round2(num(x.tong_lieu) / n) : 0; }

  /** Dòng buổi xạ của kế hoạch đồng thời (ghi cùng ngày với buổi chính) có gd bắt đầu bằng "S" */
  function isParFx(f) { return String(f.gd || '').charAt(0) === 'S'; }
  function fxOf(p, fractions) {
    return fractions.filter(function (f) { return f.bn_id === p.id && f.da_huy !== 'Có' && !isParFx(f); })
      .sort(function (a, b) {
        if (a.ngay !== b.ngay) return a.ngay < b.ngay ? -1 : 1;
        return String(a.thoi_gian) < String(b.thoi_gian) ? -1 : 1;
      });
  }
  function phasesOf(p, env) { return (asEnv(env).phasesBy[p.id] || []).slice(); }
  /** Các giai đoạn của đợt xạ, theo thứ tự: GĐ1 (trên dòng BN) rồi các boost */
  function segments(p, env) {
    var segs = [{ stt: 1, label: 'GĐ1', ky_thuat: p.ky_thuat, so_buoi: Math.round(num(p.so_buoi)), tong_lieu: num(p.tong_lieu), d: dosePerFx(p), ready: true, g: null }];
    var all = phasesOf(p, env);
    var mk = function (g, label, n) { var d = dosePerFx(g), k = n == null ? Math.round(num(g.so_buoi)) : n; return { stt: num(g.stt), label: label, ky_thuat: g.ky_thuat, so_buoi: k, tong_lieu: round2(k * d), d: d, ready: g.trang_thai === 'SAN_SANG', g: g }; };
    all.forEach(function (g) { if (!g.loai) segs.push(mk(g, 'GĐ' + g.stt)); });
    all.forEach(function (g) {
      if (g.loai !== 'KH_LAI' || g.cat_tai === '' || g.cat_tai == null) return;
      var i = -1; segs.forEach(function (s, j) { if (s.stt === num(g.thay_gd)) i = j; });
      if (i < 0) i = segs.length - 1;
      var s = segs[i]; s.so_buoi = Math.min(s.so_buoi, Math.round(num(g.cat_tai))); s.tong_lieu = round2(s.so_buoi * s.d); s.cut = true;
      segs.splice(i + 1, 0, mk(g, 'KH lại'));
    });
    var mainN = segs.reduce(function (a, s) { return a + s.so_buoi; }, 0), tail = null;
    all.forEach(function (g) { var k = Math.round(num(g.so_buoi)) - mainN + Math.round(num(g.bo_qua)); if (g.loai === 'SONG_SONG' && k > (tail ? tail.so_buoi : 0)) tail = mk(g, 'KH đồng thời', k); });
    // Giai đoạn cuối chưa có số buổi (BN nhập từ HIS, chưa biết tổng): xạ tiếp được, không tự kết thúc
    var lastMain = segs[segs.length - 1];
    if (!(lastMain.so_buoi >= 1)) { lastMain.so_buoi = OPEN_FX; lastMain.open = true; }
    if (tail) { tail.tail = true; segs.push(tail); }
    var from = 0;
    segs.forEach(function (s) { s.from = from; from += s.so_buoi; s.to = from; });
    return segs;
  }
  var OPEN_FX = 999;
  /** Đợt xạ chưa có tổng số buổi (giai đoạn cuối chưa nhập số buổi) */
  function isOpen(p, env) { var s = segments(p, env); return !!s.filter(function (x) { return x.open; }).length; }
  function segAt(segs, idx) { for (var i = 0; i < segs.length; i++) if (idx < segs[i].to) return segs[i]; return segs[segs.length - 1]; }
  function totalFx(p, env) { var s = segments(p, env); return s[s.length - 1].to; }

  /** Tiến độ, ngày vắng, lịch dự kiến của một đợt xạ (gồm cả boost). */
  function course(p, fractions, env) {
    env = asEnv(env);
    var today = env.today;
    var fx = fxOf(p, fractions);
    var segs = segments(p, env);
    var total = segs[segs.length - 1].to;
    var doseTotal = round2(segs.reduce(function (a, s) { return a + (s.tail ? 0 : s.tong_lieu); }, 0));
    var readyTo = 0;
    for (var r = 0; r < segs.length && segs[r].ready; r++) readyTo = segs[r].to;
    var review = 0, reviewSeg = null;
    segs.forEach(function (s) { var cb = Math.round(num(s.g ? s.g.chuyen_buoi : p.chuyen_buoi)); if (!review && !s.tail && cb > 0 && cb < s.so_buoi) { review = s.from + cb; reviewSeg = s; } });
    if (review && review < readyTo) readyTo = review;
    var mainTotal = segs.reduce(function (a, s) { return a + (s.tail ? 0 : s.so_buoi); }, 0);
    var doneDates = {}, doseDone = 0;
    fx.forEach(function (f, i) { doneDates[f.ngay] = (doneDates[f.ngay] || 0) + 1; var sg = segAt(segs, i); if (!sg.tail) doseDone += sg.d; });
    var par = phasesOf(p, env).filter(function (g) { return g.loai === 'SONG_SONG'; }).map(function (g) {
      var key = 'S' + num(g.stt), tl = segs.filter(function (s) { return s.tail && s.g === g; })[0];
      var n = fractions.filter(function (f) { return f.bn_id === p.id && f.da_huy !== 'Có' && f.gd === key; }).length + (tl ? Math.max(0, Math.min(tl.so_buoi, fx.length - tl.from)) : 0);
      var tot = Math.round(num(g.so_buoi));
      return { g: g, stt: num(g.stt), key: key, ky_thuat: g.ky_thuat, total: tot, done: n, ready: g.trang_thai === 'SAN_SANG', open: g.trang_thai === 'SAN_SANG' && n < tot && !(tl && fx.length >= tl.from) };
    });
    var start = p.ngay_bat_dau || (fx[0] && fx[0].ngay) || p.ngay_du_kien || '';
    var missed = [], projected = [];
    if (fx.length && isDate(start)) {
      var stop = p.trang_thai === 'HOAN_THANH' ? fx[fx.length - 1].ngay : addDays(today, -1);
      for (var s = start, i = 0; s <= stop && i < 800; s = addDays(s, 1), i++) {
        if (isTreatDay(p, s, env) && !doneDates[s]) missed.push(s);
      }
    }
    var open = segs.some(function (s) { return s.open; });
    var remaining = open ? 0 : total - fx.length;
    if (remaining > 0 && p.trang_thai !== 'HOAN_THANH' && isDate(start)) {
      var c = start > today ? start : today;
      if (c === today && doneDates[today]) c = addDays(today, 1);
      for (var j = 0; remaining > 0 && j < 800; j++, c = addDays(c, 1)) {
        if (isTreatDay(p, c, env)) { projected.push(c); remaining--; }
      }
    }
    var end = open && p.trang_thai !== 'HOAN_THANH' ? '' : projected.length ? projected[projected.length - 1] : (fx.length ? fx[fx.length - 1].ngay : '');
    var abs = (env.absBy && env.absBy[p.id]) || {}, absent = {};
    missed.forEach(function (d) { absent[d] = abs[d] ? abs[d].ghi_chu || 'Khác' : ''; });
    if (abs[today] && !doneDates[today]) absent[today] = abs[today].ghi_chu || 'Khác';
    // Vắng liên tiếp gần nhất (tính đến hôm qua, hoặc hôm nay nếu đã ghi vắng)
    var streak = 0;
    if (p.trang_thai === 'DANG_XA' || p.trang_thai === 'TAM_NGUNG') {
      for (var k = missed.length - 1, dd = absent[today] !== undefined ? today : addDays(today, -1), guard = 0; guard < 60; guard++, dd = addDays(dd, -1)) {
        if (doneDates[dd] || dd < start) break;
        if (absent[dd] !== undefined) streak++;
        else if (isTreatDay(p, dd, env)) break;
      }
    }
    var imaging = {};
    fx.forEach(function (f) { splitList(f.hinh_anh).forEach(function (k) { (imaging[k] = imaging[k] || []).push(f.ngay); }); });
    var cur = segAt(segs, Math.min(fx.length, total - 1));
    return {
      review: review, reviewSeg: reviewSeg, reviewWait: !!review && fx.length >= review && fx.length < total, mainTotal: mainTotal, mainDone: Math.min(fx.length, mainTotal),
      par: par, fx: fx, done: fx.length, total: open ? '?' : total, open: open, segs: segs, cur: cur, multi: segs.length > 1,
      dosePerFx: cur.d, doseDone: round2(doseDone), doseTotal: doseTotal,
      readyTo: readyTo, blocked: fx.length >= readyTo && fx.length < total,
      leftBeforeBlock: Math.max(0, readyTo - fx.length),
      start: start, missed: missed, projected: projected, tentativeFrom: Math.max(0, readyTo - fx.length), end: end, imaging: imaging,
      doneToday: !!doneDates[today], treatToday: isTreatDay(p, today, env), doneDates: doneDates, absent: absent, streak: streak
    };
  }

  /** Thời điểm nộp cho kỹ sư (contour xong); dữ liệu cũ chỉ có ngày */
  function submitTime(x) { return x.tg_nop_kh || x.ngay_contour_xong || x.ngay_tao || ''; }
  /** Thứ tự trong phần lập kế hoạch: Cấp cứu lên trước; còn lại (Ưu tiên, Thường) nộp trước làm trước */
  function planOrder(a, b) {
    var ra = a.uu_tien === 'Cấp cứu' ? 0 : 1, rb = b.uu_tien === 'Cấp cứu' ? 0 : 1;
    if (ra !== rb) return ra - rb;
    var da = submitTime(a), db = submitTime(b);
    if (da !== db) return da < db ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  }
  /** Hàng đợi lập kế hoạch (cả GĐ1 và boost): Cấp cứu → boost sắp tới lượt xạ → nộp trước làm trước. */
  function planningQueue(items, urgentOf) {
    return items.filter(function (x) { return x.trang_thai === 'CHO_KH'; }).sort(function (a, b) {
      var ra = a.uu_tien === 'Cấp cứu' ? 0 : 1, rb = b.uu_tien === 'Cấp cứu' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      var ua = urgentOf ? urgentOf(a) : 99, ub = urgentOf ? urgentOf(b) : 99;
      if (ua !== ub) return ua - ub;
      return planOrder(a, b);
    });
  }
  /** Cột của bảng nhập BN từ hồ sơ giấy (dán trong app, hoặc trang "NhapBN" chạy hàm nhapBN) */
  /** Bảng nhập đầy đủ từ HIS (trang "NhapDayDu", hàm nhapDayDu): mỗi dòng một BN, kèm các ngày đã xạ */
  var FULL_COLS = [['ma_his', 'Mã HIS'], ['ho_ten', 'Họ tên'], ['nam_sinh', 'Năm sinh'], ['gioi', 'Giới'], ['chan_doan', 'Chẩn đoán'], ['icd', 'ICD'],
    ['bs', 'BS điều trị (email hoặc tên)'], ['ngay_mo_phong', 'Ngày mô phỏng'], ['tiem_thuoc', 'Tiêm thuốc (Có/Không)'], ['mat_na', 'Mặt nạ'],
    ['ky_thuat', 'Kỹ thuật'], ['ngay_xa', 'Các ngày đã xạ (dd/mm/yyyy, cách nhau dấu phẩy)'], ['tong_lieu', 'Tổng liều (Gy)'], ['so_buoi', 'Tổng số buổi'], ['ghi_chu', 'Ghi chú'],
    ['trang_thai', 'Trạng thái (Đang xạ / Đã xạ xong / trống)'], ['ky_thuat_2', 'Kỹ thuật GĐ2'], ['ngay_xa_2', 'Các ngày xạ GĐ2'],
    ['icd_phu', 'ICD thêm (BN có 2 ung thư; nhiều mã cách nhau dấu phẩy)']];
  function isoDate(s) {
    s = String(s || '').trim();
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
  }
  /** Ngày nghỉ trong tuần suy từ các ngày đã xạ: có xạ Thứ Bảy thì ngày thường ít buổi nhất là ngày nghỉ */
  function guessOffDay(dates) {
    var c = [0, 0, 0, 0, 0, 0, 0];
    dates.forEach(function (d) { c[dow(d)]++; });
    if (!c[6]) {
      // Không xạ Thứ 7 nào: đã qua ít nhất một Thứ 7 giữa buổi đầu và buổi cuối thì là T2–T6 ('0'), chưa thì chưa rõ
      var s = dates.slice().sort();
      return s.length && diffDays(s[0], s[s.length - 1]) > (6 - dow(s[0]) + 7) % 7 ? '0' : '';
    }
    var min = Infinity, at = '';
    for (var i = 1; i <= 5; i++) if (c[i] < min) { min = c[i]; at = String(i); }
    var ties = [1, 2, 3, 4, 5].filter(function (i) { return c[i] === min; }).length;
    return ties === 1 ? at : '';
  }
  var IMPORT_COLS = [['ma_his', 'Mã HIS'], ['ho_ten', 'Họ tên'], ['nam_sinh', 'Năm sinh'], ['gioi', 'Giới'], ['chan_doan', 'Chẩn đoán'], ['icd', 'ICD'], ['muc_dich', 'Mục đích'],
    ['ky_thuat', 'Kỹ thuật'], ['tong_lieu', 'Tổng liều (Gy)'], ['so_buoi', 'Số buổi'], ['muc_lieu', 'Các mức liều'], ['ghi_chu', 'Ghi chú']];
  /** KH lại vừa sẵn sàng: chốt giai đoạn cũ ở số buổi đã xạ; BN đang tạm dừng chờ KH thì xạ tiếp */
  function activateReplan(ctx, t) {
    var g = t.g; if (!g || g.loai !== 'KH_LAI' || (g.cat_tai !== '' && g.cat_tai != null)) return;
    var p = t.p, env = envOf(ctx), segs = segments(p, env), n = fxOf(p, ctx.fractions).length;
    var old = segs.filter(function (s) { return s.stt === num(g.thay_gd); })[0] || segs[segs.length - 1];
    g.cat_tai = String(Math.max(0, Math.min(old.so_buoi, n - old.from)));
    if (p.trang_thai === 'TAM_NGUNG' && p.ly_do_tam_ngung === 'Chờ lập lại kế hoạch') { p.trang_thai = n ? 'DANG_XA' : 'CHO_XA'; p.tam_ngung_tu = ''; p.ly_do_tam_ngung = ''; save(ctx, p, 'Xạ tiếp', 'KH lại đã sẵn sàng'); }
  }
  /** Mức ưu tiên và lý do: "Cấp cứu" và "Ưu tiên" bắt buộc ghi lý do; "Thường" thì xoá lý do. */
  function checkPrio(x, reason, strict) {
    if (x.uu_tien && PRIORITY_RANK[x.uu_tien] == null) fail('Mức ưu tiên không hợp lệ.');
    if (!x.uu_tien || x.uu_tien === 'Thường') { x.ly_do_uu_tien = ''; return; }
    if (reason !== undefined) x.ly_do_uu_tien = String(reason || '').trim();
    if (strict !== false && !x.ly_do_uu_tien) fail('BN "' + x.uu_tien + '" cần ghi rõ lý do ' + (x.uu_tien === 'Cấp cứu' ? 'cấp cứu' : 'ưu tiên') + '.');
  }

  // ---------- Thao tác ----------
  var EDIT_FIELDS = ['ma_his', 'ho_ten', 'nam_sinh', 'gioi', 'icd', 'icd_phu', 'chan_doan', 'vi_tri', 'muc_dich', 'ngay_mo_phong', 'khoa', 'bs_email', 'ky_thuat',
    'tong_lieu', 'so_buoi', 'muc_lieu', 'igrt', 'sgrt', 'uu_tien', 'ly_do_uu_tien', 'may', 'ghi_chu', 'mat_na', 'tiem_thuoc', 'mp_his'];
  /** Tên hiển thị các trường khi sửa thông tin BN (lưu vết, xác nhận) */
  var FIELD_LABELS = { ma_his: 'Mã HIS', ho_ten: 'Họ tên', nam_sinh: 'Năm sinh', gioi: 'Giới', icd: 'ICD', icd_phu: 'ICD thêm', chan_doan: 'Chẩn đoán',
    vi_tri: 'Vị trí xạ', muc_dich: 'Mục đích', ngay_mo_phong: 'Ngày mô phỏng', khoa: 'Khoa', bs_email: 'BS điều trị', ky_thuat: 'Kỹ thuật', tong_lieu: 'Tổng liều (Gy)',
    so_buoi: 'Số buổi', muc_lieu: 'Các mức liều', igrt: 'IGRT', sgrt: 'SGRT', uu_tien: 'Ưu tiên', ly_do_uu_tien: 'Lý do ưu tiên', may: 'Máy', ghi_chu: 'Ghi chú',
    mat_na: 'Mặt nạ', tiem_thuoc: 'Tiêm thuốc', mp_his: 'Chỉ định mô phỏng lại trên HIS' };
  /** BN nhập hàng loạt còn thiếu chuyên môn (chờ phân loại, đã xong / không xạ, đang xạ chưa có tổng): sửa thông tin không bắt buộc đủ liều, số buổi */
  function lenientEdit(p, merged, env) {
    if (['CHO_PL', 'HOAN_THANH', 'KHONG_XA'].indexOf(p.trang_thai) >= 0) return true;
    if (['DANG_XA', 'TAM_NGUNG'].indexOf(p.trang_thai) >= 0 && isOpen(p, env)) return phasesOf(p, env).length > 0 || !(num(merged.so_buoi) >= 1);
    return false;
  }
  var PHASE_FIELDS = ['ky_thuat', 'tong_lieu', 'so_buoi', 'muc_lieu', 'uu_tien', 'ly_do_uu_tien', 'ngay_mo_phong', 'ghi_chu', 'vi_tri', 'mp_his'];
  function checkMpHis(v) { if (v !== undefined && ['Có', 'Không', ''].indexOf(String(v)) < 0) fail('Chỉ định mô phỏng lại trên HIS: chọn Có hoặc Không.'); }
  /** Lần mô phỏng trước của BN (cùng mã HIS, các đợt / giai đoạn đã mô phỏng), trừ chính lần đang ghi */
  function prevSim(data, bnId, gId) {
    var P = data.patients || [], p = P.filter(function (x) { return x.id === bnId; })[0];
    if (!p) return null;
    var ids = {}, c = [];
    P.forEach(function (x) { if (x.ma_his === p.ma_his && x.trang_thai !== 'HUY') ids[x.id] = 1; });
    var done = function (x) { return x.ngay_mo_phong && x.trang_thai !== 'MO_PHONG' && x.trang_thai !== 'HUY' && (x.nguoi_mo_phong || x.mat_na); };
    P.forEach(function (x) { if (ids[x.id] && !(x.id === bnId && !gId) && done(x)) c.push(x); });
    (data.phases || []).forEach(function (g) { if (ids[g.bn_id] && g.id !== gId && done(g)) c.push(g); });
    c.sort(function (a, b) { return a.ngay_mo_phong < b.ngay_mo_phong ? 1 : -1; });
    return c[0] ? { ngay: c[0].ngay_mo_phong, mat_na: c[0].mat_na && c[0].mat_na !== 'Không' ? c[0].mat_na : '' } : null;
  }

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
    if (p.icd_phu) p.icd_phu = normIcdList(p.icd_phu, p.icd);
    if (p.tong_lieu !== '' && p.tong_lieu != null && !(num(p.tong_lieu) > 0)) fail('Tổng liều phải lớn hơn 0.');
    if (p.so_buoi !== '' && p.so_buoi != null) {
      var n = num(p.so_buoi);
      if (!(n >= 1 && n <= 60 && Math.round(n) === n)) fail('Số buổi phải là số nguyên từ 1 đến 60.');
    }
  }
  /** Phần chuyên môn còn thiếu (cần đủ trước khi chuyển kỹ sư) */
  /** Mã ICD-10 chỉ dùng 3 ký tự (VD: C15); gõ C15.1 hay C151 đều rút về C15 */
  function normIcd(v) { var s = String(v || '').trim().toUpperCase().replace(/\s+/g, ''); var m = s.match(/^([A-Z]\d\d)/); return m ? m[1] : s; }
  function isIcd(v) { return /^[A-Z]\d\d$/.test(v); }
  /** Mã ICD thêm (BN nhiều ung thư cùng lúc): chuỗi "C15, C13", bỏ trùng và bỏ mã chính */
  function normIcdList(v, main) {
    var o = [];
    String(v || '').split(/[,;\s]+/).forEach(function (x) { var c = normIcd(x); if (!c) return; if (!isIcd(c)) fail('Mã ICD-10 thêm "' + x + '" không đúng dạng (VD: C13).'); if (c !== normIcd(main) && o.indexOf(c) < 0) o.push(c); });
    return o.join(', ');
  }
  /** Mọi mã ICD của BN: mã chính trước, rồi các mã thêm */
  function icdsOf(p) {
    var o = []; [p.icd].concat(String(p.icd_phu || '').split(/,\s*/)).forEach(function (x) { var c = normIcd(x); if (isIcd(c) && o.indexOf(c) < 0) o.push(c); });
    return o;
  }
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
    var active = others.filter(function (x) { return ['HOAN_THANH', 'HUY', 'KHONG_XA'].indexOf(x.trang_thai) < 0 && x.luu_tru !== 'Có'; })[0];
    if (active) fail('DUP_HIS:' + active.ho_ten + ' (' + active.id + ', ' + (STATUS[active.trang_thai] || active.trang_thai) + ')');
    var diff = others.filter(function (x) { return fold(x.ho_ten) !== fold(p.ho_ten); })[0];
    if (diff && !a.force_name) fail('HIS_NAME:' + diff.ho_ten + ' (' + diff.id + ')');
  }
  /** Kỹ sư phụ trách phải được chọn rõ ràng (không mặc định người bấm) */
  function pickKs(ctx, em) {
    em = String(em || '').trim().toLowerCase();
    if (!em) fail('Cần chọn kỹ sư phụ trách lập kế hoạch.');
    var u = ctx.users.filter(function (x) { return x.email === em && x.vai_tro === 'KS' && x.kich_hoat !== 'Không'; })[0];
    if (!u) fail('Kỹ sư được chọn không có trong danh sách kỹ sư đang hoạt động.');
    return em;
  }
  function ksName(ctx, em) { var u = ctx.users.filter(function (x) { return x.email === em; })[0]; return u ? u.ho_ten : (em || '—'); }
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
    if (!g.uu_tien) { g.uu_tien = p.uu_tien || 'Thường'; g.ly_do_uu_tien = p.ly_do_uu_tien || ''; }
    checkPrio(g);
    if (buoc === 'CUNG_LUC') {
      g.di_cung = 'Có';
      buoc = p.trang_thai === 'MO_PHONG' ? 'MO_PHONG' : p.trang_thai === 'CONTOUR' ? 'CONTOUR' : 'CHO_KH';
    }
    g.trang_thai = buoc;
    if (buoc === 'MO_PHONG' && g.di_cung !== 'Có') {
      if (['Có', 'Không'].indexOf(String(a.mp_his || '')) < 0) fail('Mô phỏng lại: cần trả lời BS đã tích chỉ định mô phỏng lại trên HIS chưa.');
      g.mp_his = String(a.mp_his);
    } else g.mp_his = '';
    if (buoc === 'MO_PHONG' && g.ngay_mo_phong && !isDate(g.ngay_mo_phong)) fail('Ngày mô phỏng không hợp lệ.');
    if (buoc !== 'MO_PHONG') g.ngay_mo_phong = '';
    if (buoc === 'CHO_KH' || buoc === 'SAN_SANG') { g.ngay_contour_xong = ctx.today; g.tg_nop_kh = ctx.now || ''; }
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

  /** Khoa của BN đi theo khoa của bác sĩ điều trị; BS chưa ghi khoa thì dùng khoa chọn tay */
  function doctorKhoa(users, dm, email) {
    var u = (users || []).filter(function (x) { return x.email === email; })[0];
    return u && u.khoa && ((dm || {}).KHOA || []).indexOf(u.khoa) >= 0 ? u.khoa : '';
  }
  function setKhoa(ctx, p) {
    var k = doctorKhoa(ctx.users, ctx.dm, p.bs_email);
    if (k) p.khoa = k;
    else if (p.khoa && (ctx.dm.KHOA || []).indexOf(p.khoa) < 0) fail('Khoa "' + p.khoa + '" không có trong danh mục khoa điều trị.');
  }

  var H = {
    createPatient: function (ctx, a) {
      var o = clean(a, EDIT_FIELDS);
      var p = blank(COLS.BenhNhan);
      Object.keys(o).forEach(function (k) { p[k] = o[k]; });
      if (!p.bs_email && ctx.user.vai_tro === 'BS') p.bs_email = canTreat(ctx.user) ? ctx.user.email : ctx.user.tro_ly_cho;
      // Người không phải bác sĩ nhập theo phiếu chỉ định: bắt buộc chọn bác sĩ điều trị
      if (!p.bs_email) fail('Cần chọn bác sĩ điều trị (bác sĩ ghi trên phiếu chỉ định).');
      var bsU = ctx.users.filter(function (u) { return u.email === p.bs_email && u.kich_hoat !== 'Không'; })[0];
      if (!bsU || (bsU.vai_tro !== 'BS' && bsU.vai_tro !== 'ADMIN')) fail('Bác sĩ điều trị không có trong danh sách bác sĩ.');
      if (!ctx._import) checkTreat(ctx, p.bs_email, '');
      setKhoa(ctx, p);
      p.nguoi_nhap = ctx.user.email;
      if (!p.uu_tien) p.uu_tien = 'Thường';
      checkPrio(p);
      if (!p.igrt) p.igrt = 'Không';
      if (!p.sgrt) p.sgrt = 'Không';
      var step0 = a.trang_thai || 'CONTOUR';
      if (EARLY.indexOf(step0) >= 0 && !a.boost) validateBasic(p, ctx.today); else validate(p, ctx.today, step0 === 'CHO_KH');
      if (a.boost) validateRx(a.boost, ' của boost');
      checkHis(ctx, p, a, '');
      // Mã HIS đã có (đợt đã đóng): chỉ thêm đợt mới từ hồ sơ cũ; mọi lần mô phỏng sau lần đầu hỏi chỉ định mô phỏng lại trên HIS
      var prior = hisCourses(ctx, p.ma_his, '');
      if (prior.length && !ctx._import && !(a.dot_moi === true || a.dot_moi === 'Có')) fail('HAS_HIS:' + prior[0].ho_ten + ' (' + prior[0].id + ', ' + (STATUS[prior[0].trang_thai] || prior[0].trang_thai) + ')');
      if (prior.length) {
        var mh = ctx._import ? 'Có' : String(a.mp_his || '');
        if (['Có', 'Không'].indexOf(mh) < 0) fail('Đợt xạ mới: cần trả lời BS đã tích chỉ định mô phỏng lại trên HIS chưa.');
        p.mp_his = mh;
      } else p.mp_his = '';
      var step = a.trang_thai || 'CONTOUR';
      if (['MO_PHONG', 'CONTOUR', 'CHO_KH', 'CHO_XA', 'DANG_XA'].indexOf(step) < 0) fail('Bước hiện tại không hợp lệ.');
      if (step === 'MO_PHONG' && p.ngay_mo_phong && !isDate(p.ngay_mo_phong)) fail('Ngày hẹn mô phỏng không hợp lệ.');
      if (step !== 'MO_PHONG') p.ngay_mo_phong = p.ngay_mo_phong || '';
      var nn = String(a.ngay_nghi_tuan || '');
      if (nn && !/^[0-5]$/.test(nn)) fail('Ngày nghỉ trong tuần không hợp lệ.');
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
      if (step !== 'CONTOUR' && step !== 'MO_PHONG') { p.ngay_contour_xong = ctx.today; p.tg_nop_kh = ctx.now || ''; }
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
      if (o.bs_email !== undefined) checkTreat(ctx, o.bs_email, p.bs_email);
      checkMpHis(o.mp_his);
      if (o.mp_his !== undefined && !p.mp_his && o.mp_his) fail('Lần mô phỏng đầu tiên của BN không cần chỉ định mô phỏng lại.');
      if (o.bs_email !== undefined || o.khoa !== undefined) { setKhoa(ctx, merged); o.khoa = merged.khoa; }
      if (o.uu_tien !== undefined || o.ly_do_uu_tien !== undefined) {
        checkPrio(merged, undefined, merged.uu_tien !== p.uu_tien || PLAN_STATES.indexOf(p.trang_thai) >= 0);
        o.ly_do_uu_tien = merged.ly_do_uu_tien;
      }
      if (o.tiem_thuoc !== undefined && ['', 'Có', 'Không'].indexOf(o.tiem_thuoc) < 0) fail('Tiêm thuốc chỉ chọn Có hoặc Không.');
      if (o.ngay_mo_phong && !isDate(o.ngay_mo_phong)) fail('Ngày mô phỏng không hợp lệ.');
      if (EARLY.indexOf(p.trang_thai) >= 0 || lenientEdit(p, merged, envOf(ctx))) validateBasic(merged, ctx.today); else validate(merged, ctx.today);
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
      var changed = [], trace = [];
      var show = function (k, v) { return k === 'bs_email' ? (userName(ctx, v) || '—') : (String(v == null ? '' : v) || '—'); };
      Object.keys(o).forEach(function (k) {
        if (String(p[k] == null ? '' : p[k]) !== o[k]) {
          changed.push(k);
          // lưu vết: trường, giá trị cũ → mới (ghi chú dài chỉ ghi là đã sửa)
          trace.push((FIELD_LABELS[k] || k) + (k === 'ghi_chu' ? ' (đã sửa)' : ': ' + show(k, p[k]) + ' → ' + show(k, o[k])));
          p[k] = o[k];
        }
      });
      if (!changed.length) return 'Không có gì thay đổi.';
      var noteTrace = trace.filter(function (t) { return t.indexOf(FIELD_LABELS.ghi_chu) !== 0; });
      if (noteTrace.length) note(p, ctx.today, 'Sửa thông tin (' + (ctx.user.ho_ten || ctx.user.email) + '): ' + noteTrace.join('; '));
      finishIfDone(ctx, p);
      save(ctx, p, 'Sửa thông tin', trace.join('; '));
      return 'Đã lưu thông tin ' + p.ho_ten + '.';
    },
    contourDone: function (ctx, a) {
      var t = target(ctx, a.id);
      need(t.x, ['CONTOUR']);
      if (!t.g) {
        var add = clean(a, ['icd', 'icd_phu', 'chan_doan', 'vi_tri', 'muc_dich', 'ky_thuat', 'tong_lieu', 'so_buoi', 'muc_lieu', 'igrt', 'sgrt']);
        if (add.icd) add.icd = normIcd(add.icd);
        if (add.icd_phu !== undefined) add.icd_phu = normIcdList(add.icd_phu, add.icd || t.p.icd);
        var merged = {};
        Object.keys(t.p).forEach(function (k) { merged[k] = t.p[k]; });
        Object.keys(add).forEach(function (k) { if (add[k] !== '') merged[k] = add[k]; });
        var miss = missingRx(merged, true);
        if (miss.length) fail('Chưa chuyển kỹ sư được. Cần nhập đủ: ' + miss.join(', ') + '.');
        validateRx(merged);
        Object.keys(add).forEach(function (k) { if (add[k] !== '') t.p[k] = add[k]; });
      }
      if (a.uu_tien) t.x.uu_tien = a.uu_tien;
      checkPrio(t.x, a.uu_tien ? a.ly_do_uu_tien : undefined);
      t.x.trang_thai = 'CHO_KH';
      t.x.ngay_contour_xong = ctx.today;
      t.x.tg_nop_kh = ctx.now || '';
      saveT(ctx, t, 'Contour xong', 'Ưu tiên: ' + t.x.uu_tien + (t.x.ly_do_uu_tien ? ' (' + t.x.ly_do_uu_tien + ')' : ''));
      var extra = 0;
      if (!t.g) {
        ctx.phases.forEach(function (g) {
          if (g.bn_id === t.p.id && g.di_cung === 'Có' && g.trang_thai === 'CONTOUR') {
            g.trang_thai = 'CHO_KH'; g.ngay_contour_xong = ctx.today; g.tg_nop_kh = ctx.now || ''; if (a.uu_tien) { g.uu_tien = t.x.uu_tien; g.ly_do_uu_tien = t.x.ly_do_uu_tien; }
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
      checkPrio(t.x, a.ly_do_uu_tien);
      saveT(ctx, t, 'Đổi ưu tiên', a.uu_tien + (t.x.ly_do_uu_tien ? ' (' + t.x.ly_do_uu_tien + ')' : ''));
      return 'Đã đặt ưu tiên "' + a.uu_tien + '" cho ' + t.name + '.';
    },
    claimPlan: function (ctx, a) {
      var t = target(ctx, a.id);
      need(t.x, ['CHO_KH', 'DANG_KH']);
      var ks = pickKs(ctx, a.ks_email), old = t.x.ks_email, re = t.x.trang_thai === 'DANG_KH';
      if (re && old === ks) return 'Kỹ sư phụ trách không đổi.';
      t.x.trang_thai = 'DANG_KH'; t.x.ks_email = ks;
      if (!re) t.x.ngay_nhan_kh = ctx.today;
      saveT(ctx, t, re ? 'Đổi KS phụ trách' : 'Nhận lập KH', ksName(ctx, ks) + (re ? ' (trước: ' + ksName(ctx, old) + ')' : ''));
      return (re ? 'Đã đổi kỹ sư phụ trách ' : 'Đã giao lập kế hoạch ') + t.name + ' cho ' + ksName(ctx, ks) + '.';
    },
    planDone: function (ctx, a) {
      var t = target(ctx, a.id), x = t.x;
      need(x, ['CHO_KH', 'DANG_KH']);
      if (!x.ks_email) x.ks_email = pickKs(ctx, a.ks_email);
      if (!x.ngay_nhan_kh) x.ngay_nhan_kh = ctx.today;
      x.ngay_kh_xong = ctx.today;
      var ready = t.g ? 'SAN_SANG' : 'CHO_XA';
      if (a.chuyen_buoi) {
        var cb = num(a.chuyen_buoi);
        if (!(cb >= 1 && cb < num(x.so_buoi) && Math.round(cb) === cb)) fail('Số buổi chuyển phải nhỏ hơn số buổi của KH (' + x.so_buoi + ').');
        x.chuyen_buoi = String(cb);
      }
      if (a.can_qa) { x.can_qa = 'Có'; x.qa_ket_qua = 'Chờ QA'; x.trang_thai = 'CHO_QA'; }
      else { x.can_qa = 'Không'; x.qa_ket_qua = 'Không cần'; x.trang_thai = ready; activateReplan(ctx, t); }
      saveT(ctx, t, 'Lập KH xong', (a.can_qa ? 'Cần QA' : 'Không cần QA') + (x.chuyen_buoi && a.chuyen_buoi ? ' · chuyển trước ' + x.chuyen_buoi + '/' + x.so_buoi + ' buổi' : ''));
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
        activateReplan(ctx, t);
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
      var g = newPhase(ctx, p, a), ss = a.loai === 'SONG_SONG';
      if (ss) { g.loai = 'SONG_SONG'; g.bo_qua = String(fxOf(p, ctx.fractions).length); ctx.savePhase(g); }
      saveT(ctx, { g: g, p: p, x: g }, ss ? 'Thêm KH đồng thời' : 'Thêm boost', g.ky_thuat + ' ' + g.tong_lieu + ' Gy/' + g.so_buoi + ' buổi · ' + STATUS[g.trang_thai]);
      return 'Đã thêm ' + (ss ? 'KH đồng thời' : 'boost') + ' GĐ' + g.stt + ' cho ' + p.ho_ten + ' (' + STATUS[g.trang_thai] + ').';
    },
    updatePhase: function (ctx, a) {
      var g = findG(ctx, a.id); if (!g) fail('Không tìm thấy giai đoạn.');
      var p = findP(ctx, g.bn_id), o = clean(a, PHASE_FIELDS), merged = {};
      checkMpHis(o.mp_his);
      if (o.mp_his !== undefined && !g.mp_his) delete o.mp_his;
      Object.keys(g).forEach(function (k) { merged[k] = g[k]; });
      Object.keys(o).forEach(function (k) { merged[k] = o[k]; });
      validateRx(merged, ' của boost');
      if (o.uu_tien !== undefined || o.ly_do_uu_tien !== undefined) {
        checkPrio(merged, undefined, merged.uu_tien !== g.uu_tien || PLAN_STATES.indexOf(g.trang_thai) >= 0);
        o.ly_do_uu_tien = merged.ly_do_uu_tien;
      }
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
      var nguoi = staffList(ctx, a.nguoi_mo_phong);  // v2.10: không chọn nữa, người mô phỏng lấy theo lịch phân công
      if (nguoi.length > 2) fail('Chọn tối đa 2 người mô phỏng.');
      nguoi.forEach(function (e) { if (!ctx.users.some(function (u) { return u.email === e && u.vai_tro === 'KTV'; })) fail(userName(ctx, e) + ' không phải KTV.'); });
      var mn = String(a.mat_na || 'Không').trim();
      if (mn !== 'Không' && (ctx.dm.MAT_NA || DEFAULT_DM.MAT_NA).indexOf(mn) < 0) fail('Loại mặt nạ không có trong danh mục.');
      var dc = (Array.isArray(a.dung_cu) ? a.dung_cu : String(a.dung_cu || '').split(/,\s*/)).map(function (x) { return String(x).trim(); }).filter(Boolean);
      if (a.dung_cu_khac && String(a.dung_cu_khac).trim()) dc.push('Khác: ' + String(a.dung_cu_khac).trim().replace(/,/g, ';'));
      var cu = '';
      if (t.x.mp_his && mn !== 'Không') {
        var pv = prevSim(ctx, t.p.id, t.g ? t.g.id : '');
        if (pv && pv.mat_na === mn) {
          cu = String(a.mat_na_cu || '');
          if (['Có', 'Không'].indexOf(cu) < 0) fail('Lần trước BN dùng mặt nạ ' + mn + ': chọn dùng lại mặt nạ cũ hay làm mặt nạ mới.');
        } else cu = 'Không';
        if (cu === 'Không' && !(a.mat_na_his === true || a.mat_na_his === 'Có')) fail('Mặt nạ mới: cần xác nhận đã có thủ thuật làm mặt nạ trên HIS.');
      }
      t.x.mat_na_cu = cu;
      t.x.trang_thai = 'CONTOUR'; t.x.ngay_mo_phong = ctx.today;
      t.x.nguoi_mo_phong = nguoi.join(', '); t.x.mat_na = mn; t.x.tiem_thuoc = a.tiem_thuoc === true || a.tiem_thuoc === 'Có' ? 'Có' : 'Không'; t.x.dung_cu = dc.join(', ');
      saveT(ctx, t, t.g ? 'Mô phỏng lại xong' : 'Mô phỏng xong', 'mặt nạ: ' + mn + (cu === 'Có' ? ' (dùng lại mặt nạ cũ)' : cu === 'Không' ? ' (mới, có thủ thuật trên HIS)' : '') + ' · tiêm thuốc: ' + t.x.tiem_thuoc + (dc.length ? ' · ' + dc.join(', ') : ''));
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
      var nk = nurseKhoa(ctx.user, ctx.dm);
      if (nk && p.khoa !== nk) fail('Bệnh nhân này thuộc khoa khác.');
      var started = ['DANG_XA', 'TAM_NGUNG'].indexOf(p.trang_thai) >= 0 || fxOf(p, ctx.fractions).length > 0;
      if (a.ngay_du_kien) quotaGuard(ctx, p, a.ngay_du_kien, a.vuot_chi_tieu, a.ngay_nghi_tuan);
      if (!isKtvLead(ctx.user, ctx.users)) fail('Chỉ người xếp lịch xạ được xếp, đổi lịch.');
      if (a.ngay_du_kien !== undefined) { p.de_xuat_lich = ''; p.de_xuat_boi = ''; p.de_xuat_luc = ''; }
      return applySchedule(ctx, p, a, 'Xếp lịch' + (a.vuot_chi_tieu ? ' (vượt chỉ tiêu)' : ''));
    },
    approveSchedule: function (ctx, a) {
      if (!isKtvLead(ctx.user, ctx.users)) fail('Chỉ người xếp lịch xạ được duyệt lịch.');
      var p = findP(ctx, a.id);
      if (!p.de_xuat_lich) fail('BN này không có đề xuất lịch đang chờ duyệt.');
      var d = {}; try { d = JSON.parse(p.de_xuat_lich); } catch (e) { d = {}; }
      ['ngay_du_kien', 'ngay_nghi_tuan', 'may'].forEach(function (k) { if (a[k] !== undefined) d[k] = a[k]; });
      if (!isDate(d.ngay_du_kien)) fail('Ngày bắt đầu dự kiến không hợp lệ.');
      quotaGuard(ctx, p, d.ngay_du_kien, a.vuot_chi_tieu, d.ngay_nghi_tuan);
      var who = p.de_xuat_boi;
      p.de_xuat_lich = ''; p.de_xuat_boi = ''; p.de_xuat_luc = '';
      return applySchedule(ctx, p, { ngay_du_kien: d.ngay_du_kien, ngay_nghi_tuan: d.ngay_nghi_tuan || '', may: d.may || p.may }, 'Duyệt lịch', ' · đề xuất bởi ' + userName(ctx, who) + (a.vuot_chi_tieu ? ' · vượt chỉ tiêu' : ''));
    },
    rejectSchedule: function (ctx, a) {
      if (!isKtvLead(ctx.user, ctx.users)) fail('Chỉ người xếp lịch xạ được duyệt lịch.');
      var p = findP(ctx, a.id);
      if (!p.de_xuat_lich) fail('BN này không có đề xuất lịch đang chờ duyệt.');
      if (!a.ly_do) fail('Cần ghi lý do trả lại.');
      var who = p.de_xuat_boi;
      p.de_xuat_lich = ''; p.de_xuat_boi = ''; p.de_xuat_luc = '';
      save(ctx, p, 'Trả lại đề xuất lịch', a.ly_do + ' · đề xuất bởi ' + userName(ctx, who));
      return 'Đã trả lại đề xuất lịch của ' + p.ho_ten + '.';
    },
    /** Nhập hàng loạt BN từ hồ sơ giấy: vào "Chờ phân loại", trường thiếu để trống */
    /** Nhập đầy đủ từ HIS: BN + mặt nạ / tiêm thuốc + các buổi đã xạ đúng ngày. Đủ liều / số buổi / ICD / BS thì vào Đang xạ hoặc Hoàn thành, thiếu thì Chờ phân loại. */
    importFull: function (ctx, a) {
      var rows = Array.isArray(a.rows) ? a.rows : [];
      if (!rows.length) fail('Chưa có dòng nào để nhập.');
      if (rows.length > 1500) fail('Mỗi lần nhập tối đa 1500 BN.');
      var res = ctx.importResult = [], cnt = { CHO_PL: 0, DANG_XA: 0, HOAN_THANH: 0 }, skip = 0, nFx = 0;
      rows.forEach(function (x, i) {
        var ho = String(x.ho_ten || '').trim(), his = String(x.ma_his || '').trim();
        if (!ho || !his) { res[i] = 'Bỏ qua: thiếu họ tên hoặc mã HIS'; skip++; return; }
        if (ctx.patients.some(function (p) { return p.ma_his === his && ['HUY', 'HOAN_THANH', 'KHONG_XA'].indexOf(p.trang_thai) < 0; })) { res[i] = 'Bỏ qua: mã HIS đã có đợt xạ đang hoạt động'; skip++; return; }
        var p = blank(COLS.BenhNhan);
        ['chan_doan', 'ky_thuat', 'mat_na', 'ghi_chu'].forEach(function (k) { if (x[k] != null) p[k] = String(x[k]).trim(); });
        p.ma_his = his; p.ho_ten = ho;
        var ns = String(x.nam_sinh || '').match(/(19|20)\d\d/); p.nam_sinh = ns ? ns[0] : '';
        var g = fold(x.gioi); p.gioi = /^n(u|ữ)/.test(g) ? 'Nữ' : /^nam/.test(g) ? 'Nam' : '';
        if (x.icd) { var ic = normIcd(x.icd); if (isIcd(ic)) p.icd = ic; }
        if (x.icd_phu) p.icd_phu = normIcdList(x.icd_phu, p.icd);
        if (num(x.tong_lieu) > 0) p.tong_lieu = String(num(x.tong_lieu));
        if (num(x.so_buoi) >= 1) p.so_buoi = String(Math.round(num(x.so_buoi)));
        var tt = fold(x.tiem_thuoc); p.tiem_thuoc = /^(co|x|yes|1)/.test(tt) ? 'Có' : /^(khong|0|no)/.test(tt) ? 'Không' : '';
        p.ngay_mo_phong = isoDate(x.ngay_mo_phong);
        var bs = String(x.bs || '').trim(), doc = null;
        if (bs.indexOf('@') > 0) doc = ctx.users.filter(function (u) { return u.email === bs.toLowerCase() && u.kich_hoat !== 'Không' && (u.vai_tro === 'BS' || u.vai_tro === 'ADMIN'); })[0];
        else if (bs) doc = matchDoctor(ctx.users, bs);
        if (doc) { p.bs_email = doc.email; setKhoa(ctx, p); }
        var parse = function (s) { var l = String(s || '').split(/[,;\s]+/).map(isoDate).filter(function (d) { return d && d <= ctx.today; }); return l.filter(function (d, k) { return l.indexOf(d) === k; }).sort(); };
        var dates1 = parse(x.ngay_xa), dates2 = x.ky_thuat_2 ? parse(x.ngay_xa_2).filter(function (d) { return dates1.indexOf(d) < 0; }) : [];
        var dates = dates1.concat(dates2).sort();
        var want = fold(x.trang_thai), wantDx = /^dang xa/.test(want), wantXong = /xong|hoan thanh/.test(want);
        p.id = nextId(ctx); p.ngay_tao = ctx.today; p.nguoi_nhap = ctx.user.email; p.uu_tien = 'Thường'; p.igrt = 'Không'; p.sgrt = 'Không';
        var notes = [];
        if (bs && !doc) notes.push('chưa khớp BS "' + bs + '"');
        if (doc && doc.vai_tro === 'BS' && !canTreat(doc)) notes.push('BS ' + doc.ho_ten + ' đang là trợ lý: Quản trị tích ô "Được làm BS điều trị"');
        if (x.icd && !p.icd) notes.push('ICD "' + x.icd + '" không đúng dạng');
        p.trang_thai = 'CHO_PL';
        if (dates.length) {
          p.ngay_bat_dau = dates[0]; p.ngay_du_kien = dates[0];
          p.ngay_contour_xong = p.ngay_mo_phong || dates[0]; p.ngay_kh_xong = dates[0]; p.qa_ket_qua = 'Nhập từ HIS';
          var curKt = dates2.length ? String(x.ky_thuat_2) : p.ky_thuat, curDates = dates2.length ? dates2 : dates1;
          if (!/3d/i.test(curKt)) p.ngay_nghi_tuan = guessOffDay(curDates);
          if (!/3d/i.test(curKt) && !p.ngay_nghi_tuan && /IMRT|VMAT/i.test(curKt)) {
            notes.push('VMAT chưa rõ ngày nghỉ trong tuần (tạm xạ cả Thứ 7, KTV sửa lịch tuần)');
            note(p, ctx.today, 'VMAT chưa rõ BN nghỉ ngày nào trong tuần: tạm tính xạ cả Thứ 7. KTV sửa “Lịch tuần” khi BN tới xạ.');
          }
          if (dates2.length) { p.so_buoi = String(dates1.length); p.tong_lieu = p.tong_lieu || ''; }
          var full = p.bs_email && p.icd && p.chan_doan && p.ky_thuat && p.tong_lieu && p.so_buoi && !dates2.length;
          if (wantXong) { p.trang_thai = 'HOAN_THANH'; p.ngay_ket_thuc = dates[dates.length - 1]; }
          else if (wantDx && p.bs_email && p.ky_thuat) {
            p.trang_thai = 'DANG_XA';
            if (!dates2.length && !(num(p.so_buoi) > dates.length)) { p.so_buoi = ''; notes.push('chưa có tổng số buổi'); }
          } else if (wantDx) { notes.push('thiếu ' + (p.bs_email ? 'kỹ thuật' : 'BS') + ' nên chưa vào Đang xạ'); }
          else if (full) {
            if (dates.length >= num(p.so_buoi)) { p.trang_thai = 'HOAN_THANH'; p.ngay_ket_thuc = dates[dates.length - 1]; }
            else p.trang_thai = 'DANG_XA';
          } else notes.push('thiếu ' + ['bs_email', 'icd', 'chan_doan', 'ky_thuat', 'tong_lieu', 'so_buoi'].filter(function (k) { return !p[k]; }).map(function (k) { return { bs_email: 'BS', icd: 'ICD', chan_doan: 'chẩn đoán', ky_thuat: 'kỹ thuật', tong_lieu: 'tổng liều', so_buoi: 'tổng số buổi' }[k]; }).join(', '));
        }
        if (dates.length) note(p, ctx.today, 'Nhập từ HIS: ' + dates.length + ' buổi đã xạ (' + dates[0] + ' → ' + dates[dates.length - 1] + ')');
        ctx.patients.push(p);
        save(ctx, p, 'Nhập đầy đủ từ HIS', STATUS[p.trang_thai] + (dates.length ? ' · ' + dates.length + ' buổi' : ''));
        if (dates2.length) {
          var g2 = blank(COLS.GiaiDoan);
          g2.id = uid('G'); g2.bn_id = p.id; g2.stt = '2'; g2.ky_thuat = String(x.ky_thuat_2); g2.trang_thai = 'SAN_SANG'; g2.uu_tien = 'Thường';
          g2.ngay_tao = ctx.today; g2.ngay_contour_xong = dates2[0]; g2.ngay_kh_xong = dates2[0]; g2.qa_ket_qua = 'Nhập từ HIS';
          g2.ghi_chu = 'Nhập từ HIS: KH thứ hai (' + g2.ky_thuat + ') từ ' + dates2[0]; g2.cap_nhat_luc = ctx.now; g2.cap_nhat_boi = ctx.user.email;
          ctx.phases.push(g2); ctx.savePhase(g2);
          if (p.trang_thai !== 'HOAN_THANH') notes.push('GĐ2 ' + g2.ky_thuat + ' chưa có tổng số buổi');
        }
        dates.forEach(function (d, k) {
          var f = blank(COLS.BuoiXa);
          f.id = uid('B') + k; f.bn_id = p.id; f.ngay = d; f.buoi_so = String(k + 1); f.gd = dates2.indexOf(d) >= 0 ? '2' : '1'; f.ktv_email = ctx.user.email;
          f.thoi_gian = d + 'T00:00:00'; f.ghi_chu = 'Nhập từ HIS';
          ctx.fractions.push(f); ctx.addFraction(f); nFx++;
        });
        cnt[p.trang_thai]++;
        res[i] = 'Đã nhập (' + p.id + ') → ' + STATUS[p.trang_thai] + (dates.length ? ', ' + dates.length + ' buổi' : '') + (notes.length ? '; ' + notes.join('; ') : '');
      });
      return 'Đã nhập ' + (cnt.CHO_PL + cnt.DANG_XA + cnt.HOAN_THANH) + ' BN: ' + cnt.DANG_XA + ' đang xạ, ' + cnt.HOAN_THANH + ' đã xạ xong, ' + cnt.CHO_PL + ' chờ phân loại; ' + nFx + ' buổi xạ.' + (skip ? ' Bỏ qua ' + skip + ' dòng.' : '');
    },
    /** Chuyển BS điều trị (một hoặc nhiều BN). BS chuyển đi, BS nhận, trưởng khoa, quản trị đều làm được. */
    transferDoctor: function (ctx, a) {
      var ids = Array.isArray(a.ids) ? a.ids : [a.id];
      ids = ids.filter(Boolean);
      if (!ids.length) fail('Chưa chọn BN nào.');
      var to = String(a.bs_email || '').toLowerCase();
      var toU = ctx.users.filter(function (u) { return u.email === to && u.kich_hoat !== 'Không' && (u.vai_tro === 'BS' || u.vai_tro === 'ADMIN'); })[0];
      if (!toU) fail('Chọn bác sĩ nhận BN.');
      checkTreat(ctx, to, '');
      var mine = myDoctors(ctx.user), boss = ctx.user.vai_tro === 'ADMIN' || ctx.user.chuc_vu === 'Trưởng khoa';
      var n = 0;
      ids.forEach(function (id) {
        var p = findP(ctx, id);
        if (p.trang_thai === 'HUY') fail(p.ho_ten + ': đợt xạ đã huỷ.');
        if (p.bs_email === to) return;
        if (!boss && mine.indexOf(p.bs_email) < 0 && mine.indexOf(to) < 0) fail(p.ho_ten + ': chỉ BS đang điều trị, BS nhận, trưởng khoa hoặc quản trị được chuyển.');
        var from = p.bs_email;
        p.bs_email = to; setKhoa(ctx, p);
        note(p, ctx.today, 'Chuyển BS điều trị: ' + (userName(ctx, from) || '—') + ' → ' + toU.ho_ten + (a.ly_do ? ' (' + a.ly_do + ')' : ''));
        save(ctx, p, 'Chuyển BS điều trị', (userName(ctx, from) || '—') + ' → ' + toU.ho_ten + (a.ly_do ? ' · ' + a.ly_do : ''));
        n++;
      });
      return n ? 'Đã chuyển ' + n + ' BN sang ' + toU.ho_ten + '.' : 'Không có BN nào cần chuyển.';
    },
    importPatients: function (ctx, a) {
      var rows = Array.isArray(a.rows) ? a.rows : [];
      if (!rows.length) fail('Chưa có dòng nào để nhập.');
      if (rows.length > 300) fail('Mỗi lần nhập tối đa 300 BN.');
      var added = [], skip = [], res = ctx.importResult = [];
      rows.forEach(function (x, i) {
        var ho = String(x.ho_ten || '').trim(), his = String(x.ma_his || '').trim();
        if (!ho || !his) { skip.push('dòng ' + (i + 1) + ': thiếu họ tên hoặc mã HIS'); res[i] = 'Bỏ qua: thiếu họ tên hoặc mã HIS'; return; }
        if (ctx.patients.some(function (p) { return p.ma_his === his && ['HUY', 'HOAN_THANH', 'KHONG_XA'].indexOf(p.trang_thai) < 0; })) { skip.push(ho + ' (' + his + '): đã có đợt xạ đang hoạt động'); res[i] = 'Bỏ qua: mã HIS đã có đợt xạ đang hoạt động'; return; }
        var p = blank(COLS.BenhNhan);
        ['ma_his', 'ho_ten', 'nam_sinh', 'gioi', 'chan_doan', 'muc_dich', 'ky_thuat', 'tong_lieu', 'so_buoi', 'muc_lieu', 'vi_tri', 'ghi_chu'].forEach(function (k) { if (x[k] != null) p[k] = String(x[k]).trim(); });
        p.ma_his = his; p.ho_ten = ho;
        if (x.icd) p.icd = normIcd(x.icd);
        ['tong_lieu', 'so_buoi'].forEach(function (k) { if (p[k]) p[k] = String(num(p[k])); });
        var ns = String(p.nam_sinh).match(/(19|20)\d\d/); p.nam_sinh = ns ? ns[0] : '';
        if (p.gioi && !/^(Nam|Nữ)$/.test(p.gioi)) p.gioi = /n[uữ]/i.test(fold(p.gioi)) ? 'Nữ' : /nam/i.test(fold(p.gioi)) ? 'Nam' : '';
        p.id = nextId(ctx); p.trang_thai = 'CHO_PL'; p.ngay_tao = ctx.today; p.nguoi_nhap = ctx.user.email; p.uu_tien = 'Thường'; p.igrt = 'Không'; p.sgrt = 'Không';
        ctx.patients.push(p);
        save(ctx, p, 'Nhập từ hồ sơ giấy', p.ho_ten);
        added.push(p.ho_ten); res[i] = 'Đã nhập ' + ctx.today + ' (' + p.id + ')';
      });
      return 'Đã nhập ' + added.length + ' BN vào "Chờ phân loại".' + (skip.length ? ' Bỏ qua ' + skip.length + ': ' + skip.join('; ') + '.' : '');
    },
    /** KS đổi kỹ thuật (chỉ kỹ thuật, không đổi liều / số buổi) khi đang lập KH / chờ QA; báo BS điều trị */
    changeTech: function (ctx, a) {
      var t = target(ctx, a.id), x = t.x;
      need(x, ['CHO_KH', 'DANG_KH', 'CHO_QA'], 'Chỉ đổi kỹ thuật khi đang lập kế hoạch hoặc chờ QA.');
      var kt = String(a.ky_thuat || '').trim();
      if (!kt) fail('Chọn kỹ thuật mới.');
      if ((ctx.dm.KY_THUAT || []).length && ctx.dm.KY_THUAT.indexOf(kt) < 0) fail('Kỹ thuật không có trong danh mục.');
      if (kt === x.ky_thuat) fail('Kỹ thuật mới giống kỹ thuật hiện tại.');
      var old = x.ky_thuat || '(trống)';
      x.ky_thuat = kt;
      var txt = 'Đổi kỹ thuật' + (t.g ? ' ' + (t.g.loai === 'KH_LAI' ? 'KH lại' : t.g.loai === 'SONG_SONG' ? 'KH đồng thời' : 'boost GĐ' + t.g.stt) : '') + ': ' + old + ' → ' + kt + ' (KS ' + userName(ctx, ctx.user.email) + (a.ly_do ? ': ' + a.ly_do : '') + ')';
      note(t.p, ctx.today, txt);
      if (t.g) { t.g.cap_nhat_luc = ctx.now; t.g.cap_nhat_boi = ctx.user.email; ctx.savePhase(t.g); }
      save(ctx, t.p, 'Đổi kỹ thuật', txt);
      return 'Đã đổi kỹ thuật ' + t.name + ': ' + old + ' → ' + kt + '. BS điều trị sẽ nhận thông báo.';
    },
    /** KTV sửa lịch trong tuần (T2–T6, hoặc T2–T7 nghỉ 1 ngày) cho BN chờ / đang xạ */
    setOffDay: function (ctx, a) {
      var p = findP(ctx, a.id);
      need(p, ['CHO_XA', 'DANG_XA', 'TAM_NGUNG']);
      var v = String(a.ngay_nghi_tuan == null ? '' : a.ngay_nghi_tuan).trim();
      if (!/^[0-5]$/.test(v)) fail('Chọn lịch trong tuần.');
      var old = scheduleLabel(p);
      p.ngay_nghi_tuan = v;
      save(ctx, p, 'Sửa lịch tuần', old + ' → ' + scheduleLabel(p));
      return 'Đã lưu lịch tuần của ' + p.ho_ten + ': ' + scheduleLabel(p) + '.';
    },
    /** Chạy một lần (suaLichTuan): BN VMAT/IMRT chưa rõ lịch tuần → suy từ các buổi đã xạ (không xạ T7 nào mà đã qua T7 → T2–T6) */
    fixOffDays: function (ctx) {
      var done = [], left = 0;
      ctx.patients.forEach(function (p) {
        if (['CHO_XA', 'DANG_XA', 'TAM_NGUNG'].indexOf(p.trang_thai) < 0 || !needsOffDay(p)) return;
        var g = guessOffDay(fxOf(p, ctx.fractions).map(function (f) { return f.ngay; }));
        if (!g) { left++; return; }
        p.ngay_nghi_tuan = g;
        save(ctx, p, 'Sửa lịch tuần theo buổi đã xạ', scheduleLabel(p));
        done.push(p.ho_ten + ' (' + p.ma_his + '): ' + scheduleLabel(p));
      });
      return 'Đã sửa lịch tuần ' + done.length + ' BN' + (done.length ? ':\n' + done.join('\n') : '.') +
        '\nCòn ' + left + ' BN VMAT/IMRT chưa rõ ngày nghỉ (tạm xạ cả T7): KTV sửa bằng nút "Sửa lịch tuần".';
    },
    /** KTV phân loại BN nhập từ hồ sơ giấy: điền đủ thông tin còn thiếu rồi chuyển luồng */
    classifyPatient: function (ctx, a) {
      var p = findP(ctx, a.id);
      need(p, ['CHO_PL']);
      if (ctx.user.vai_tro === 'BS' && p.bs_email && myDoctors(ctx.user).indexOf(p.bs_email) < 0) fail('Bác sĩ chỉ phân loại BN của mình.');
      var buoc = String(a.buoc || '');
      if (buoc === 'KHONG_XA') {
        if (fxOf(p, ctx.fractions).length) fail('BN đã có buổi xạ, không chọn "Không xạ" được.');
        if (!a.ly_do) fail('Cần ghi lý do không xạ.');
        p.trang_thai = 'KHONG_XA'; p.ngay_ket_thuc = p.ngay_mo_phong || ctx.today; p.ly_do_ket_thuc = 'Không xạ: ' + a.ly_do;
        save(ctx, p, 'Không xạ (phân loại)', a.ly_do);
        return 'Đã ghi ' + p.ho_ten + ' không xạ.';
      }
      if (buoc === 'HUY') {
        if (!canCancel(p, ctx.fractions)) fail('BN đã mô phỏng: không huỷ hồ sơ được vì sẽ làm sai lệch sổ / báo cáo mô phỏng. BN không xạ nữa thì chọn "Không xạ".');
        if (!a.ly_do) fail('Cần ghi lý do huỷ.');
        p.trang_thai = 'HUY'; note(p, ctx.today, 'Huỷ khi phân loại: ' + a.ly_do);
        save(ctx, p, 'Huỷ (phân loại)', a.ly_do);
        return 'Đã huỷ ' + p.ho_ten + '.';
      }
      var PRE = ['CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA'];
      if (PRE.concat(['CHO_XA', 'DANG_XA', 'TAM_NGUNG', 'HOAN_THANH']).indexOf(buoc) < 0) fail('Chọn mục cần chuyển tới.');
      var hadFx = fxOf(p, ctx.fractions);
      if (hadFx.length && PRE.concat(['CHO_XA']).indexOf(buoc) >= 0) fail('BN đã có ' + hadFx.length + ' buổi xạ: chọn Đang xạ, Tạm ngừng hoặc Đã xạ xong.');
      var o = clean(a, EDIT_FIELDS), oldBs = p.bs_email;
      Object.keys(o).forEach(function (k) { if (o[k] !== '') p[k] = o[k]; });
      if (p.icd) p.icd = normIcd(p.icd);
      var autoDone = hadFx.length && (buoc === 'DANG_XA' || buoc === 'TAM_NGUNG') && num(p.so_buoi) >= 1 && hadFx.length === num(p.so_buoi);
      if (autoDone) buoc = 'HOAN_THANH';
      if (!p.bs_email) fail('Chọn bác sĩ điều trị.');
      var bsU = ctx.users.filter(function (u) { return u.email === p.bs_email && u.kich_hoat !== 'Không'; })[0];
      if (!bsU || (bsU.vai_tro !== 'BS' && bsU.vai_tro !== 'ADMIN')) fail('Bác sĩ điều trị không có trong danh sách bác sĩ.');
      checkTreat(ctx, p.bs_email, oldBs);
      setKhoa(ctx, p);
      if (buoc === 'CONTOUR') {
        validateBasic(p, ctx.today);
        p.trang_thai = 'CONTOUR';
        save(ctx, p, 'Phân loại', STATUS.CONTOUR);
        return 'Đã chuyển ' + p.ho_ten + ' sang "' + STATUS.CONTOUR + '".';
      }
      // Đã xạ xong: chi tiết không bắt buộc (đủ kỹ thuật, liều, số buổi, ngày bắt đầu thì ghi bù các buổi để thống kê)
      if (buoc === 'HOAN_THANH' && !(p.ky_thuat && num(p.tong_lieu) > 0 && num(p.so_buoi) >= 1 && (isDate(a.ngay_bat_dau) || hadFx.length))) {
        validateBasic(p, ctx.today);
        p.trang_thai = 'HOAN_THANH';
        p.ngay_ket_thuc = isDate(a.ngay_ket_thuc) && a.ngay_ket_thuc <= ctx.today ? a.ngay_ket_thuc : hadFx.length ? hadFx[hadFx.length - 1].ngay : (p.ngay_mo_phong || ctx.today);
        if (isDate(a.ngay_bat_dau)) p.ngay_bat_dau = a.ngay_bat_dau;
        note(p, ctx.today, 'Phân loại: đã xạ xong (không nhập chi tiết buổi xạ)');
        save(ctx, p, 'Phân loại', STATUS.HOAN_THANH + ' · không nhập chi tiết');
        return 'Đã chuyển ' + p.ho_ten + ' sang "' + STATUS.HOAN_THANH + '".';
      }
      if (hadFx.length && (buoc === 'DANG_XA' || buoc === 'TAM_NGUNG') && !(num(p.so_buoi) >= 1)) {
        // Chưa biết tổng: vẫn cho xạ tiếp, BS bổ sung liều / số buổi sau
        if (!p.ky_thuat) fail('Cần chọn kỹ thuật xạ.');
        validateBasic(p, ctx.today);
        p.so_buoi = ''; p.ngay_bat_dau = hadFx[0].ngay; p.ngay_du_kien = p.ngay_du_kien || hadFx[0].ngay;
        p.ngay_contour_xong = p.ngay_contour_xong || hadFx[0].ngay; p.ngay_kh_xong = p.ngay_kh_xong || hadFx[0].ngay; p.qa_ket_qua = p.qa_ket_qua || 'Nhập từ HIS';
        var nn0 = String(a.ngay_nghi_tuan || p.ngay_nghi_tuan || ''); if (nn0 && !/^[0-5]$/.test(nn0)) fail('Ngày nghỉ trong tuần không hợp lệ.'); p.ngay_nghi_tuan = nn0;
        if (buoc === 'TAM_NGUNG') { if (!a.ly_do) fail('Cần chọn lý do tạm ngừng.'); p.trang_thai = 'TAM_NGUNG'; p.tam_ngung_tu = isDate(a.tam_ngung_tu) ? a.tam_ngung_tu : ctx.today; p.ly_do_tam_ngung = a.ly_do; p.xn_tam_ngung = ''; }
        else p.trang_thai = 'DANG_XA';
        save(ctx, p, 'Phân loại', STATUS[p.trang_thai] + ' · đã xạ ' + hadFx.length + ' buổi · chưa có tổng số buổi');
        return 'Đã chuyển ' + p.ho_ten + ' sang "' + STATUS[p.trang_thai] + '" (đã xạ ' + hadFx.length + ' buổi, chưa có tổng: BS bổ sung sau).';
      }
      validate(p, ctx.today, buoc !== 'HOAN_THANH');
      if (PRE.indexOf(buoc) >= 0) {
        p.ngay_contour_xong = p.ngay_contour_xong || ctx.today;
        if (!p.tg_nop_kh) p.tg_nop_kh = ctx.now || ctx.today;
        if (buoc === 'DANG_KH' || (buoc === 'CHO_QA' && a.ks_email)) { p.ks_email = pickKs(ctx, a.ks_email); p.ngay_nhan_kh = p.ngay_nhan_kh || ctx.today; }
        if (buoc === 'CHO_QA') { p.ngay_kh_xong = ctx.today; p.can_qa = 'Có'; p.qa_ket_qua = 'Chờ QA'; }
        p.trang_thai = buoc;
        save(ctx, p, 'Phân loại', STATUS[buoc] + (p.ks_email ? ' · KS ' + userName(ctx, p.ks_email) : ''));
        return 'Đã chuyển ' + p.ho_ten + ' sang "' + STATUS[buoc] + '".';
      }
      var nn = String(a.ngay_nghi_tuan || '');
      if (nn && !/^[0-5]$/.test(nn)) fail('Ngày nghỉ trong tuần không hợp lệ.');
      p.ngay_nghi_tuan = nn;
      p.ngay_contour_xong = p.ngay_contour_xong || ctx.today; p.ngay_kh_xong = p.ngay_kh_xong || ctx.today; p.qa_ket_qua = p.qa_ket_qua || 'Nhập từ hồ sơ giấy';
      var done = hadFx.length ? hadFx.length : buoc === 'HOAN_THANH' ? Math.round(num(p.so_buoi)) : buoc === 'CHO_XA' ? 0 : num(a.da_xa);
      if (buoc !== 'CHO_XA') {
        if (!(done >= 0 && Math.round(done) === done)) fail('Số buổi đã xạ phải là số nguyên.');
        if (buoc === 'DANG_XA' && done < 1) fail('BN đang xạ cần số buổi đã xạ từ 1.');
        if (buoc !== 'HOAN_THANH' && done >= num(p.so_buoi)) fail(hadFx.length ? 'BN đã xạ ' + done + ' buổi, bằng hoặc hơn tổng số buổi: chọn "Đã xạ xong" hoặc sửa tổng số buổi.' : 'Số buổi đã xạ phải nhỏ hơn tổng số buổi.');
      }
      var days = hadFx.map(function (f) { return f.ngay; });
      if (hadFx.length) { p.ngay_bat_dau = days[0]; p.ngay_du_kien = p.ngay_du_kien || days[0]; }
      else if (done > 0) {
        var start = a.ngay_bat_dau, env = envOf(ctx);
        if (!isDate(start) || start > ctx.today) fail('Cần ngày bắt đầu xạ (không sau hôm nay).');
        for (var s = start, i = 0; days.length < done && s <= ctx.today && i < 500; s = addDays(s, 1), i++) if (isTreatDay(p, s, env)) days.push(s);
        if (days.length < done) fail('Từ ' + start + ' tới hôm nay chỉ có ' + days.length + ' ngày xạ theo lịch tuần đã chọn, ít hơn số buổi đã xạ.');
        days.forEach(function (d, k) {
          var f = blank(COLS.BuoiXa);
          f.id = uid('B') + k; f.bn_id = p.id; f.ngay = d; f.buoi_so = String(k + 1); f.gd = '1'; f.ktv_email = ctx.user.email;
          f.thoi_gian = ctx.now; f.ghi_chu = 'Nhập từ hồ sơ giấy';
          ctx.fractions.push(f); ctx.addFraction(f);
        });
        p.ngay_bat_dau = days[0]; p.ngay_du_kien = days[0];
      }
      if (buoc === 'CHO_XA') { p.trang_thai = 'CHO_XA'; if (a.ngay_du_kien && isDate(a.ngay_du_kien)) p.ngay_du_kien = a.ngay_du_kien; }
      else if (buoc === 'DANG_XA') p.trang_thai = 'DANG_XA';
      else if (buoc === 'TAM_NGUNG') {
        if (!a.ly_do) fail('Cần chọn lý do tạm ngừng.');
        p.trang_thai = 'TAM_NGUNG'; p.tam_ngung_tu = isDate(a.tam_ngung_tu) ? a.tam_ngung_tu : ctx.today; p.ly_do_tam_ngung = a.ly_do; p.xn_tam_ngung = '';
      } else { p.trang_thai = 'HOAN_THANH'; p.ngay_ket_thuc = isDate(a.ngay_ket_thuc) && a.ngay_ket_thuc <= ctx.today && a.ngay_ket_thuc >= days[days.length - 1] ? a.ngay_ket_thuc : days[days.length - 1]; }
      save(ctx, p, 'Phân loại', STATUS[p.trang_thai] + (done ? ' · đã xạ ' + done + ' buổi' : '') + (autoDone ? ' · đủ số buổi nên tự chuyển Đã xạ xong' : ''));
      return 'Đã chuyển ' + p.ho_ten + ' sang "' + STATUS[p.trang_thai] + '"' + (autoDone ? ' (đã xạ đủ ' + done + '/' + num(p.so_buoi) + ' buổi)' : '') + '.';
    },
    /** BS quyết định không xạ (trước khi xạ buổi nào): đợt đóng lại, vẫn có trong sổ mô phỏng */
    /** Chuyển KH một phần: đặt / bỏ mốc đánh giá lại (số buổi được chuyển của giai đoạn đang xạ). Để trống = xạ tiếp hết KH. */
    setReview: function (ctx, a) {
      var p = findP(ctx, a.id);
      need(p, ['CHO_KH', 'DANG_KH', 'CHO_QA', 'CHO_XA', 'DANG_XA', 'TAM_NGUNG']);
      var env = envOf(ctx), c = course(p, ctx.fractions, env), seg = c.reviewSeg || segAt(c.segs, c.done);
      if (seg.tail) fail('BN đang ở phần KH đồng thời.');
      var x = seg.g || p, dn = Math.max(0, c.done - seg.from), v = String(a.chuyen_buoi == null ? '' : a.chuyen_buoi).trim();
      if (v === '' || num(v) >= seg.so_buoi) {
        x.chuyen_buoi = '';
      } else {
        var n = num(v);
        if (!(n >= 1 && Math.round(n) === n)) fail('Số buổi chuyển không hợp lệ.');
        if (n <= dn) fail('BN đã xạ ' + dn + ' buổi của ' + seg.label + ', số buổi chuyển phải lớn hơn.');
        x.chuyen_buoi = String(n);
      }
      if (seg.g) ctx.savePhase(seg.g);
      save(ctx, p, x.chuyen_buoi ? 'Chuyển KH một phần' : 'Xạ tiếp KH', seg.label + ': ' + (x.chuyen_buoi ? 'chuyển ' + x.chuyen_buoi + '/' + seg.so_buoi + ' buổi, đánh giá lại sau buổi ' + (seg.from + num(x.chuyen_buoi)) : 'xạ tiếp đủ ' + seg.so_buoi + ' buổi') + (a.ghi_chu ? ' · ' + a.ghi_chu : ''));
      return x.chuyen_buoi ? 'Đã đặt: chuyển ' + x.chuyen_buoi + '/' + seg.so_buoi + ' buổi, BS đánh giá lại sau buổi ' + (seg.from + num(x.chuyen_buoi)) + '.' : 'Đã mở xạ tiếp KH cũ cho ' + p.ho_ten + '.';
    },
    noTreat: function (ctx, a) {
      var p = findP(ctx, a.id);
      need(p, ['CHO_PL', 'MO_PHONG', 'CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA', 'CHO_XA']);
      if (fxOf(p, ctx.fractions).length) fail('BN đã xạ, dùng "Kết thúc sớm" thay vì "Không xạ".');
      if (!a.ly_do) fail('Cần ghi lý do không xạ.');
      p.trang_thai = 'KHONG_XA'; p.ngay_ket_thuc = ctx.today; p.ly_do_ket_thuc = 'Không xạ: ' + a.ly_do;
      ctx.phases.forEach(function (g) { if (g.bn_id === p.id && g.trang_thai !== 'HUY') { g.trang_thai = 'HUY'; ctx.savePhase(g); } });
      save(ctx, p, 'Không xạ', a.ly_do);
      return 'Đã ghi ' + p.ho_ten + ' không xạ. Khi BN quay lại, mở hồ sơ và bấm "Mô phỏng lại".';
    },
    /** BS lập lại kế hoạch cho BN đang xạ: phần còn lại của giai đoạn đang xạ thay bằng KH mới khi KH mới sẵn sàng */
    replan: function (ctx, a) {
      var p = findP(ctx, a.id);
      need(p, ['DANG_XA', 'TAM_NGUNG']);
      if (ctx.phases.some(function (g) { return g.bn_id === p.id && g.loai === 'KH_LAI' && !g.cat_tai && g.trang_thai !== 'HUY'; })) fail('BN đang có một KH lại chưa xong.');
      var env = envOf(ctx), segs = segments(p, env), fx = fxOf(p, ctx.fractions), cur = segAt(segs, fx.length);
      if (cur.tail) fail('BN đang ở phần KH đồng thời, không lập lại KH ở đây được.');
      if (['MO_PHONG', 'CONTOUR', 'CHO_KH'].indexOf(a.buoc) < 0) fail('Chọn cần mô phỏng lại hay contour trên CT cũ.');
      var g = newPhase(ctx, p, { ky_thuat: a.ky_thuat, tong_lieu: a.tong_lieu, so_buoi: a.so_buoi, muc_lieu: a.muc_lieu, uu_tien: p.uu_tien, ngay_mo_phong: a.ngay_mo_phong, ghi_chu: a.ghi_chu, buoc: a.buoc, mp_his: a.mp_his });
      g.loai = 'KH_LAI'; g.thay_gd = String(cur.stt); g.cat_tai = '';
      ctx.savePhase(g);
      if (a.dung_xa && p.trang_thai === 'DANG_XA') { p.trang_thai = 'TAM_NGUNG'; p.tam_ngung_tu = ctx.today; p.ly_do_tam_ngung = 'Chờ lập lại kế hoạch'; p.xn_tam_ngung = ''; }
      save(ctx, p, 'Lập lại KH', cur.label + ' đã xạ ' + Math.max(0, fx.length - cur.from) + ' buổi · KH mới ' + g.ky_thuat + ' ' + g.tong_lieu + ' Gy/' + g.so_buoi + ' buổi' + (a.dung_xa ? ' · tạm dừng xạ chờ KH' : ' · vẫn xạ KH cũ trong lúc chờ'));
      return 'Đã tạo KH lại cho ' + p.ho_ten + (a.dung_xa ? ', BN tạm dừng xạ chờ KH mới.' : ', BN vẫn xạ KH cũ cho tới khi KH mới sẵn sàng.');
    },
    confirmPause: function (ctx, a) {
      var p = findP(ctx, a.id);
      need(p, ['TAM_NGUNG']);
      p.xn_tam_ngung = ctx.today;
      save(ctx, p, 'Xác nhận còn xạ', a.ghi_chu || 'BN tạm ngừng, bác sĩ xác nhận vẫn xạ tiếp');
      return 'Đã ghi nhận ' + p.ho_ten + ' vẫn xạ tiếp. Ứng dụng sẽ hỏi lại sau 7 ngày nếu BN vẫn tạm ngừng.';
    },
    _scheduleOld: function (ctx, p, a, title, extra) {
      var parts = [];
      if (a.ngay_du_kien !== undefined) {
        if (a.ngay_du_kien && !isDate(a.ngay_du_kien)) fail('Ngày dự kiến không hợp lệ.');
        p.ngay_du_kien = a.ngay_du_kien || '';
        parts.push('ngày dự kiến ' + (p.ngay_du_kien || 'trống'));
      }
      if (a.ngay_nghi_tuan !== undefined) {
        var v = String(a.ngay_nghi_tuan || '');
        if (v && !/^[0-5]$/.test(v)) fail('Ngày nghỉ trong tuần không hợp lệ.');
        p.ngay_nghi_tuan = v;
        parts.push('lịch ' + scheduleLabel(p));
      }
      if (a.may !== undefined) { p.may = String(a.may || ''); parts.push('máy ' + p.may); }
      save(ctx, p, title || 'Xếp lịch', parts.join(', ') + (extra || ''));
      return (title === 'Duyệt lịch' ? 'Đã duyệt lịch xạ cho ' : 'Đã lưu lịch xạ cho ') + p.ho_ten + '.';
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
      // BN chờ phân loại đã có buổi xạ (nhập từ HIS) quay lại xạ: KTV ghi buổi luôn, BN chuyển sang Đang xạ (chưa có tổng thì BS bổ sung sau)
      var fromPl = p.trang_thai === 'CHO_PL' && fxOf(p, ctx.fractions).length > 0;
      if (fromPl) {
        if (!p.ky_thuat) fail('BN chưa có kỹ thuật xạ: phân loại BN trước rồi ghi buổi xạ.');
        p.trang_thai = 'DANG_XA';
        var f0 = fxOf(p, ctx.fractions)[0].ngay;
        p.ngay_du_kien = p.ngay_du_kien || f0; p.ngay_contour_xong = p.ngay_contour_xong || f0; p.ngay_kh_xong = p.ngay_kh_xong || f0; p.qa_ket_qua = p.qa_ket_qua || 'Nhập từ HIS';
        if (num(p.so_buoi) >= 1 && num(p.so_buoi) <= fxOf(p, ctx.fractions).length && !phasesOf(p, envOf(ctx)).length) p.so_buoi = '';
      }
      need(p, ['CHO_XA', 'DANG_XA', 'TAM_NGUNG'], 'BN chưa ở bước chờ vào xạ hoặc đang xạ, chưa ghi buổi xạ được.');
      var ngay = a.ngay || ctx.today;
      if (!isDate(ngay)) fail('Ngày xạ không hợp lệ.');
      if (ngay > ctx.today) fail('Không ghi buổi xạ cho ngày trong tương lai.');
      if (diffDays(ngay, ctx.today) > 7) fail('Chỉ ghi bù buổi xạ trong vòng 7 ngày gần nhất.');
      var env = envOf(ctx), segs = segments(p, env), total = segs[segs.length - 1].to;
      var fx = fxOf(p, ctx.fractions);
      if (fx.length >= total) fail('BN đã xạ đủ ' + total + ' buổi.');
      var seg = segAt(segs, fx.length);
      var cr = course(p, ctx.fractions, env);
      if (cr.reviewWait) fail('BN đã xạ hết ' + cr.review + ' buổi được chuyển. Chờ BS đánh giá lại (xạ tiếp KH cũ, lập lại KH hoặc kết thúc) rồi mới ghi buổi tiếp theo.');
      if (!seg.ready) fail('Đã xạ xong ' + segs[segs.indexOf(seg) - 1].label + '. Kế hoạch boost ' + seg.label + ' chưa sẵn sàng (' + STATUS[seg.g.trang_thai] + ').');
      if (!a.force && fx.some(function (f) { return f.ngay === ngay; })) fail('DUP_DAY');
      var late = ngay < ctx.today, lyDoBu = String(a.ly_do_bu || '').trim();
      if (late && !lyDoBu) fail('Ghi buổi xạ cho ngày đã qua cần ghi lý do (VD: quên tích xác nhận).');
      var img = (a.hinh_anh || []).join(', ');
      var f = blank(COLS.BuoiXa);
      f.id = uid('B'); f.bn_id = p.id; f.ngay = ngay; f.buoi_so = String(fx.length + 1); f.gd = String(seg.stt);
      f.ktv_email = ctx.user.email; f.thoi_gian = ctx.now; f.hinh_anh = img; f.ghi_chu = a.ghi_chu || '';
      var xa = staffList(ctx, a.ktv_xa);
      if (xa.length > 3) fail('Chọn tối đa 3 KTV cho một buổi xạ.');
      f.ktv_xa = (xa.length ? xa : [ctx.user.email]).join(', ');
      if (late) { f.ghi_bu = 'Có'; f.ly_do_bu = lyDoBu; }
      ctx.exceptions.forEach(function (e) { if (e.bn_id === p.id && e.ngay === ngay && e.loai === 'VANG' && e.da_xoa !== 'Có') { e.da_xoa = 'Có'; ctx.saveEx(e); } });
      ctx.fractions.push(f);
      ctx.addFraction(f);
      if (!seg.tail) course(p, ctx.fractions.filter(function (x) { return x !== f; }), env).par.forEach(function (q) {
        if (q.done >= q.total) return;
        if (!q.open || (Array.isArray(a.song_song) && a.song_song.map(String).indexOf(String(q.stt)) < 0)) { q.g.bo_qua = String(num(q.g.bo_qua) + 1); ctx.savePhase(q.g); return; }
        var s2 = blank(COLS.BuoiXa);
        s2.id = uid('B'); s2.bn_id = p.id; s2.ngay = ngay; s2.buoi_so = String(q.done + 1); s2.gd = q.key; s2.ktv_email = f.ktv_email; s2.ktv_xa = f.ktv_xa;
        s2.thoi_gian = ctx.now; s2.hinh_anh = img; s2.ghi_chu = 'KH đồng thời'; if (late) { s2.ghi_bu = 'Có'; s2.ly_do_bu = lyDoBu; }
        ctx.fractions.push(s2); ctx.addFraction(s2);
      });
      var n = fx.length + 1;
      p.ngay_bat_dau = fx.length ? (fx[0].ngay < ngay ? fx[0].ngay : ngay) : ngay;
      if (p.trang_thai === 'TAM_NGUNG') { p.tam_ngung_tu = ''; p.ly_do_tam_ngung = ''; }
      p.trang_thai = 'DANG_XA';
      var finished = finishIfDone(ctx, p);
      save(ctx, p, late ? 'Ghi bù buổi xạ' : 'Ghi buổi xạ', 'Buổi ' + n + '/' + (seg.open ? '?' : total) + (segs.length > 1 ? ' (' + seg.label + ')' : '') + ' ngày ' + ngay + (img ? ' · ' + img : '') + (late ? ' · lý do ghi bù: ' + lyDoBu : ''));
      var msg = 'Đã ghi buổi ' + n + '/' + (seg.open ? '?' : total) + ' cho ' + p.ho_ten + '.' + (seg.open ? ' BN chưa có tổng số buổi: BS cần bổ sung.' : '');
      if (finished) msg += ' BN đã xạ đủ liệu trình.';
      else if (n === seg.to && segs.length > 1) {
        var nx = segAt(segs, n);
        msg += ' Đã xong ' + seg.label + '.' + (nx.ready ? ' Buổi sau chuyển sang ' + nx.label + ' (' + nx.ky_thuat + ').' : ' KH ' + nx.label + ' chưa sẵn sàng!');
      }
      return msg;
    },
    markAbsent: function (ctx, a) {
      var p = findP(ctx, a.bn_id);
      need(p, ['CHO_XA', 'DANG_XA', 'TAM_NGUNG'], 'BN không ở giai đoạn xạ trị.');
      var ngay = a.ngay || ctx.today;
      if (!isDate(ngay) || ngay > ctx.today) fail('Ngày vắng không hợp lệ.');
      if (diffDays(ngay, ctx.today) > 30) fail('Chỉ ghi lý do vắng trong vòng 30 ngày gần nhất.');
      if (!a.ly_do) fail('Cần chọn lý do vắng.');
      var env = envOf(ctx);
      if (fxOf(p, ctx.fractions).some(function (f) { return f.ngay === ngay; })) fail('Ngày này BN đã có buổi xạ được ghi.');
      if (!isTreatDay(p, ngay, env)) fail('Ngày này BN không có lịch xạ.');
      var text = a.ly_do + (a.ghi_chu ? ': ' + a.ghi_chu : '');
      var cur = ctx.exceptions.filter(function (e) { return e.bn_id === p.id && e.ngay === ngay && e.loai === 'VANG' && e.da_xoa !== 'Có'; })[0];
      if (!cur) { cur = blank(COLS.LichNgoaiLe); cur.id = uid('V'); cur.bn_id = p.id; cur.ngay = ngay; cur.loai = 'VANG'; ctx.exceptions.push(cur); }
      cur.ghi_chu = text; cur.nguoi = ctx.user.email; cur.thoi_gian = ctx.now;
      ctx.saveEx(cur);
      ctx.log('Ghi vắng', p.id, ngay + ': ' + text);
      return 'Đã ghi ' + p.ho_ten + ' vắng ngày ' + ngay.split('-').reverse().join('/') + ' (' + a.ly_do + ').';
    },
    undoFraction: function (ctx, a) {
      var f = ctx.fractions.filter(function (x) { return x.id === a.id && x.da_huy !== 'Có'; })[0];
      if (!f) fail('Không tìm thấy buổi xạ.');
      if (ctx.user.vai_tro !== 'ADMIN' && ctx.user.chuc_vu !== 'KTV trưởng' && diffDays(f.ngay, ctx.today) > 2) fail('Chỉ huỷ được buổi xạ trong 2 ngày gần nhất. Liên hệ KTV trưởng hoặc quản trị.');
      if (!a.ly_do) fail('Cần ghi lý do huỷ.');
      f.da_huy = 'Có'; f.huy_boi = ctx.user.email; f.ly_do_huy = a.ly_do;
      ctx.updateFraction(f);
      if (!isParFx(f)) {
        ctx.phases.forEach(function (g) {
          if (g.bn_id !== f.bn_id || g.loai !== 'SONG_SONG' || g.trang_thai === 'HUY' || f.gd === String(g.stt) || !num(g.bo_qua)) return;
          if (!ctx.fractions.some(function (x) { return x.bn_id === f.bn_id && x.ngay === f.ngay && x.da_huy !== 'Có' && x.gd === 'S' + g.stt; })) { g.bo_qua = String(num(g.bo_qua) - 1); ctx.savePhase(g); }
        });
        ctx.fractions.forEach(function (x) { if (x.bn_id === f.bn_id && x.ngay === f.ngay && x.da_huy !== 'Có' && isParFx(x)) { x.da_huy = 'Có'; x.huy_boi = ctx.user.email; x.ly_do_huy = a.ly_do; ctx.updateFraction(x); } });
      }
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
      p.xn_tam_ngung = '';
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
      p.ly_do_ket_thuc = 'Kết thúc sớm sau ' + fx.length + '/' + (isOpen(p, envOf(ctx)) ? '?' : totalFx(p, envOf(ctx))) + ' buổi: ' + a.ly_do;
      p.tam_ngung_tu = ''; p.ly_do_tam_ngung = '';
      save(ctx, p, 'Kết thúc sớm', p.ly_do_ket_thuc);
      return 'Đã kết thúc đợt xạ của ' + p.ho_ten + '.';
    },
    deletePatient: function (ctx, a) {
      var p = findP(ctx, a.id);
      if (!a.ly_do) fail('Cần ghi lý do huỷ hồ sơ.');
      if (!canCancel(p, ctx.fractions)) fail('BN đã mô phỏng: không huỷ hồ sơ được vì sẽ làm sai lệch sổ / báo cáo mô phỏng. BN không xạ nữa thì chọn "Không xạ".');
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
      if ((vt === 'BS' || vt === 'DD') && kh !== 'Không' && (ctx.dm.KHOA || []).indexOf(kh2) < 0) fail((vt === 'BS' ? 'Bác sĩ' : 'Điều dưỡng') + ' cần chọn khoa (' + (ctx.dm.KHOA || []).join(' / ') + ').');
      if (cv && CHUC_VU.indexOf(cv) < 0) fail('Chức vụ không hợp lệ.');
      u.ho_ten = String(a.ho_ten).trim(); u.vai_tro = vt; u.kich_hoat = kh; u.chuc_vu = cv; u.khoa = kh2; u.tro_ly_cho = tl;
      u.ky_hieu = String(a.ky_hieu || '').trim().slice(0, 4);
      u.nhan_bn = tl && (a.nhan_bn === true || a.nhan_bn === 'Có') ? 'Có' : '';
      ctx.saveUser(u);
      ctx.log(isNew ? 'Thêm người dùng' : 'Sửa người dùng', '', email + ' · ' + vt + (cv ? ' · ' + cv : '') + ' · ' + kh);
      return (isNew ? 'Đã thêm ' : 'Đã cập nhật ') + u.ho_ten + '.';
    },
    /** Nhập hàng loạt BN từ sổ chuyên khoa HIS: mỗi BN vào bước Mô phỏng, BN lỗi thì bỏ qua và báo lại */
    importHisBook: function (ctx, a) {
      var rows = Array.isArray(a.rows) ? a.rows : [];
      if (!rows.length) fail('Chưa chọn bệnh nhân nào.');
      if (rows.length > 150) fail('Mỗi lần nhập tối đa 150 bệnh nhân. Hãy lọc theo ngày rồi nhập từng đợt.');
      var ok = 0, nPl = 0, bad = [], asst = {};
      ctx._import = true;
      rows.forEach(function (r) {
        var o = {};
        ['ma_his', 'ho_ten', 'nam_sinh', 'gioi', 'chan_doan', 'khoa', 'bs_email', 'ngay_mo_phong', 'ghi_chu'].forEach(function (k) { o[k] = r[k] == null ? '' : String(r[k]).trim(); });
        o.trang_thai = 'MO_PHONG'; o.force_name = !!r.force_name;
        var toPl = r.trang_thai === 'CHO_PL';
        if ((ctx.dm.KHOA || []).indexOf(o.khoa) < 0) o.khoa = (ctx.dm.KHOA || [''])[0];
        try {
          H.createPatient(ctx, o); ok++;
          var au = ctx.users.filter(function (x) { return x.email === o.bs_email; })[0];
          if (au && !canTreat(au) && au.vai_tro === 'BS') asst[au.ho_ten] = 1;
          if (toPl) {
            var np = ctx.patients[ctx.patients.length - 1];
            np.trang_thai = 'CHO_PL'; nPl++;
            save(ctx, np, 'Chờ phân loại', 'Nhập từ sổ HIS, mô phỏng ' + o.ngay_mo_phong);
          }
        } catch (e) {
          var m = String(e && e.message || e);
          if (m.indexOf('DUP_HIS:') === 0) m = 'đang có đợt xạ ' + m.slice(8);
          if (m.indexOf('HIS_NAME:') === 0) m = 'mã HIS đã dùng cho ' + m.slice(9);
          bad.push((o.ho_ten || o.ma_his) + ': ' + m);
        }
      });
      ctx.log('Nhập từ sổ HIS', '', 'Thêm ' + ok + ' BN' + (bad.length ? '; bỏ qua ' + bad.length + ': ' + bad.join(' | ') : ''));
      if (!ok) fail('Không thêm được bệnh nhân nào. ' + bad.slice(0, 3).join('; '));
      ctx._import = false;
      var asstL = Object.keys(asst);
      return 'Đã thêm ' + ok + ' BN từ sổ HIS' + (nPl ? ' (' + nPl + ' vào Chờ phân loại, ' + (ok - nPl) + ' vào Chờ mô phỏng).' : ' (Chờ mô phỏng).') + (bad.length ? ' Bỏ qua ' + bad.length + ': ' + bad.slice(0, 3).join('; ') + (bad.length > 3 ? '…' : '') : '') + (asstL.length ? ' Lưu ý: ' + asstL.join(', ') + ' đang là BS trợ lý; Quản trị tích ô "Được làm BS điều trị" nếu đã làm BS chính.' : '');
    },
    dmAdd: function (ctx, a) {
      var loai = String(a.loai || ''), v = String(a.gia_tri || '').trim();
      if (DM_EDITABLE.indexOf(loai) < 0) fail('Danh mục không hợp lệ.');
      if (!v) fail('Cần nhập giá trị.');
      if (loai === 'NGAY_LE' && !isDate(v)) fail('Ngày nghỉ lễ không hợp lệ.');
      if (loai === 'GIO_CA') {
        var mg = parseCa(v);
        if (!mg) fail('Ghi theo dạng "Tên ca: giờ bắt đầu-giờ kết thúc", VD: Ca 1: 07:00-09:30.');
        v = mg.ten + ': ' + mg.tu + '-' + mg.den;
        (ctx.dm.GIO_CA || []).slice().forEach(function (old) { var o = parseCa(old); if (o && fold(o.ten) === fold(mg.ten)) { ctx.dm.GIO_CA.splice(ctx.dm.GIO_CA.indexOf(old), 1); ctx.removeDmRow(loai, old); } });
      }
      if (loai === 'DON_GIA') {
        var md = v.match(/^(.+?)\s*:\s*[\d.,]+\s*$/);
        if (!md) fail('Ghi theo dạng "Tên: số tiền", VD: Buổi xạ: 21000.');
        (ctx.dm.DON_GIA || []).slice().forEach(function (old) { var o = String(old).match(/^(.+?)\s*:/); if (o && fold(o[1]) === fold(md[1])) { ctx.dm.DON_GIA.splice(ctx.dm.DON_GIA.indexOf(old), 1); ctx.removeDmRow(loai, old); } });
      }
      if (loai === 'CHI_TIEU') {
        var mq = parseQuota(v);
        if (!mq) fail('Ghi theo dạng "Tên khoa: tối thiểu-tối đa", VD: Xạ trị: 90-100.');
        if ((ctx.dm.KHOA || []).indexOf(mq.khoa) < 0) fail('Khoa "' + mq.khoa + '" không có trong danh mục khoa.');
        (ctx.dm.CHI_TIEU || []).slice().forEach(function (old) { var o = parseQuota(old); if (o && o.khoa === mq.khoa) { ctx.dm.CHI_TIEU.splice(ctx.dm.CHI_TIEU.indexOf(old), 1); ctx.removeDmRow(loai, old); } });
      }
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
    if (!can(ctx.user.vai_tro, action, ctx.user, ctx.users) || ctx.user.kich_hoat === 'Không') fail('Tài khoản ' + ROLES[ctx.user.vai_tro] + ' không có quyền thực hiện thao tác này.');
    ctx.phases = ctx.phases || [];
    ctx.exceptions = ctx.exceptions || [];
    ctx.roster = ctx.roster || [];
    ['savePhase', 'saveEx', 'saveRoster'].forEach(function (k) { if (!ctx[k]) ctx[k] = function () {}; });
    return H[action](ctx, a || {});
  }

  /** Dữ liệu gửi xuống giao diện. */
  function view(ctx) {
    var cutoff = addDays(ctx.today, -60);
    var nk = nurseKhoa(ctx.user, ctx.dm);
    var pts = ctx.patients.filter(function (p) {
      if (p.trang_thai === 'HUY') return false;
      if (nk && p.khoa !== nk) return false;
      return (p.trang_thai !== 'HOAN_THANH' && p.trang_thai !== 'KHONG_XA') || !p.ngay_ket_thuc || p.ngay_ket_thuc >= cutoff;
    });
    var ids = {};
    pts.forEach(function (p) { ids[p.id] = 1; });
    function pick(o, cols) { var r = {}; cols.forEach(function (c) { r[c] = o[c] == null ? '' : String(o[c]); }); return r; }
    return {
      me: { email: ctx.user.email, ho_ten: ctx.user.ho_ten, vai_tro: ctx.user.vai_tro, kich_hoat: ctx.user.kich_hoat || 'Có', chuc_vu: ctx.user.chuc_vu || '', khoa: ctx.user.khoa || '', tro_ly_cho: ctx.user.tro_ly_cho || '', nhan_bn: ctx.user.nhan_bn || '' },
      today: ctx.today,
      users: ctx.users.map(function (u) { return { email: u.email, ho_ten: u.ho_ten, vai_tro: u.vai_tro, kich_hoat: u.kich_hoat === 'Không' ? 'Không' : 'Có', chuc_vu: u.chuc_vu || '', khoa: u.khoa || '', tro_ly_cho: u.tro_ly_cho || '', ky_hieu: u.ky_hieu || '', nhan_bn: u.nhan_bn || '' }; }),
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
  /** Danh sách email nhân viên đang hoạt động từ mảng / chuỗi "a, b" */
  function staffList(ctx, v) {
    var arr = Array.isArray(v) ? v : String(v || '').split(/[,;]/);
    var out = [];
    arr.forEach(function (e) {
      e = String(e || '').trim().toLowerCase(); if (!e || out.indexOf(e) >= 0) return;
      if (!ctx.users.some(function (u) { return u.email === e && u.kich_hoat !== 'Không'; })) fail('Nhân viên ' + e + ' không có trong danh sách người dùng.');
      out.push(e);
    });
    return out;
  }

  // ---------- Báo cáo khoa (sổ mô phỏng, bảng xạ trị theo tháng) ----------
  /** Ai được lập báo cáo khoa, và khoa nào: '' = chọn được cả hai khoa */
  function khoaReportScope(u) {
    if (!u) return null;
    if (u.vai_tro === 'ADMIN' || (u.vai_tro === 'KTV' && u.chuc_vu === 'KTV trưởng')) return { khoa: '' };
    if (['Trưởng khoa', 'Điều dưỡng trưởng', 'Tài khoản khoa'].indexOf(u.chuc_vu) >= 0 && u.khoa && u.vai_tro !== 'KS') return { khoa: u.khoa };
    return null;
  }
  function priceOf(dm, key, def) {
    var v = def; ((dm || {}).DON_GIA || DEFAULT_DM.DON_GIA).forEach(function (s) { var m = String(s).match(/^(.+?)\s*:\s*([\d.,]+)\s*$/); if (m && fold(m[1]).indexOf(key) === 0) v = +m[2].replace(/[.,]/g, ''); });
    return v;
  }
  /** Ký hiệu KTV trên bảng: ô "Ký hiệu" của người dùng, nếu trống lấy chữ cái đầu của tên */
  function initials(users, email) {
    var u = (users || []).filter(function (x) { return x.email === email; })[0];
    if (!u) return email ? email.charAt(0).toUpperCase() : '';
    if (u.ky_hieu) return u.ky_hieu;
    var w = String(u.ho_ten || '').replace(/^(KTV|BS|KS|ĐD|ThS|TS)\.?\s*/i, '').trim().split(/\s+/);
    return (w[w.length - 1] || '').charAt(0).toUpperCase();
  }
  function shortName(users, email) {
    var u = (users || []).filter(function (x) { return x.email === email; })[0];
    return u ? String(u.ho_ten || '').replace(/^(KTV|BS|KS|ĐD|ThS|TS)\.?\s*/i, '').trim() : (email || '');
  }
  /**
   * f = { tu, den, khoa }. Trả về sổ mô phỏng, bảng xạ trị (mỗi tháng một bảng, tách 3D và IMRT/VMAT) và số tổng.
   * data = { patients, phases, fractions, users, dm }
   */
  function khoaReport(data, f, u) {
    var sc = khoaReportScope(u);
    if (!sc) fail('Chỉ Quản trị, KTV trưởng, Trưởng khoa, ĐD trưởng và tài khoản khoa lập được báo cáo khoa.');
    var tu = f.tu, den = f.den, khoa = sc.khoa || f.khoa || '';
    if (!isDate(tu) || !isDate(den) || tu > den) fail('Khoảng ngày không hợp lệ.');
    if (diffDays(tu, den) > 370) fail('Báo cáo tối đa 1 năm.');
    var users = data.users, dm = data.dm;
    var inR = function (d) { return d && d >= tu && d <= den; };
    var P = {}; data.patients.forEach(function (p) { if (p.trang_thai !== 'HUY' && (!khoa || p.khoa === khoa)) P[p.id] = p; });
    var G = {}; (data.phases || []).forEach(function (g) { if (g.trang_thai !== 'HUY') G[g.bn_id + '|' + g.stt] = g; });
    var age = function (p) { return { nam: p.gioi === 'Nam' ? p.nam_sinh : '', nu: p.gioi === 'Nữ' ? p.nam_sinh : '', khac: p.gioi ? '' : p.nam_sinh }; };
    // Sổ mô phỏng: người mô phỏng = người phân công vị trí có chữ "mô phỏng" ngày đó
    var simPeople = function (x) {
      var o = []; (data.roster || []).forEach(function (r) { if (r.ngay === x.ngay_mo_phong && /mo phong/.test(fold(r.vi_tri))) splitList(r.nhan_vien).forEach(function (e) { if (o.indexOf(e) < 0) o.push(e); }); });
      return o.length ? o : String(x.nguoi_mo_phong || '').split(/,\s*/).filter(Boolean);
    };
    var mp = [];
    var addMp = function (p, x, nhan) {
      if (!inR(x.ngay_mo_phong) || x.trang_thai === 'MO_PHONG' || x.mp_his === 'Không') return;  // mô phỏng lại không có chỉ định trên HIS: không vào sổ
      if (x.mat_na_cu === 'Có') x = Object.assign({}, x, { mat_na: 'Không' });  // dùng lại mặt nạ cũ: không ghi mặt nạ vào sổ
      var a = age(p);
      mp.push({ id: p.id, ngay: x.ngay_mo_phong, ho_ten: p.ho_ten, nam: a.nam, nu: a.nu || a.khac, ma_his: p.ma_his, chan_doan: p.chan_doan + (nhan ? ' (' + nhan + ')' : ''), icd: icdsOf(p).join(', ') || p.icd,
        mat_na: !!x.mat_na && x.mat_na !== 'Không', mat_na_loai: x.mat_na && x.mat_na !== 'Có' ? x.mat_na : (x.mat_na === 'Có' ? 'Có (chưa ghi loại)' : 'Không'),
        tiem: x.tiem_thuoc === 'Có', dung_cu: String(x.dung_cu || '').split(/,\s*/).filter(Boolean), muc_dich: p.muc_dich || '',
        bs: shortName(users, p.bs_email), ngay_xa: p.ngay_bat_dau || p.ngay_du_kien || '',
        ky_thuat: x.ky_thuat || p.ky_thuat || '', nguoi: simPeople(x).map(function (e) { return shortName(users, e); }).join(', ') });
    };
    Object.keys(P).forEach(function (id) { var p = P[id]; if (p.nguoi_mo_phong || p.mat_na) addMp(p, p, ''); });
    (data.phases || []).forEach(function (g) { var p = P[g.bn_id]; if (p && (g.trang_thai !== 'HUY' || p.trang_thai === 'KHONG_XA') && (g.nguoi_mo_phong || g.mat_na)) addMp(p, g, g.loai === 'KH_LAI' ? 'KH lại' : g.loai === 'SONG_SONG' ? 'KH đồng thời' : 'boost'); });
    mp.sort(function (a, b) { return a.ngay < b.ngay ? -1 : a.ngay > b.ngay ? 1 : a.ho_ten.localeCompare(b.ho_ten, 'vi'); });
    // Bảng xạ trị
    var gia = priceOf(dm, 'buoi', 21000);
    var techOf = function (fx) { var p = P[fx.bn_id], g = fx.gd && fx.gd !== '1' ? G[fx.bn_id + '|' + fx.gd] : null; return (g ? g.ky_thuat : p.ky_thuat) || ''; };
    var grpOf = function (k) { return /3D/i.test(k) ? '3D' : 'VMAT'; };  // chỉ 3D-CRT vào bảng 3D, mọi kỹ thuật khác vào bảng VMAT
    var given = function (e) { var w = shortName(users, e).split(/\s+/); return w[w.length - 1] || ''; };
    var parVm = {};
    data.fractions.forEach(function (x) { if (x.da_huy !== 'Có' && inR(x.ngay) && P[x.bn_id] && isParFx(x)) { var g = G[x.bn_id + '|' + x.gd.slice(1)]; if (g && !/3D/i.test(g.ky_thuat || '')) parVm[x.bn_id + '|' + x.ngay] = 1; } });
    var fx = data.fractions.filter(function (x) { return x.da_huy !== 'Có' && inR(x.ngay) && P[x.bn_id] && !isParFx(x); }).sort(function (a, b) { return a.ngay < b.ngay ? -1 : 1; });
    // Người theo lịch phân công tuần: KTV xạ = các ca xạ (Ca 1–4, hoặc vị trí bắt đầu bằng tên máy), đúng ca theo giờ ghi buổi xạ
    var RO = {}; (data.roster || []).forEach(function (r) { if (inR(r.ngay) && r.nhan_vien) (RO[r.ngay] = RO[r.ngay] || []).push(r); });
    var thieu = {}, defMay = ((dm || {}).MAY || [])[0] || '';
    var people = function (rows) { var o = []; rows.forEach(function (r) { splitList(r.nhan_vien).forEach(function (e) { if (o.indexOf(e) < 0) o.push(e); }); }); return o; };
    function rosterKtv(x, p) {
      var o = people(rosterFor(RO[x.ngay] || [], p.may || defMay, x.ghi_bu === 'Có' ? '' : String(x.thoi_gian || '').slice(11, 16), dm));
      if (o.length) return o;
      thieu[x.ngay] = 1;
      return String(x.ktv_xa || x.ktv_email || '').split(/,\s*/).filter(Boolean);
    }
    var months = {}, ktvCount = {}, bsCount = {}, tong = { so_buoi: 0, tien: 0, theo_nhom: {} };
    fx.forEach(function (x) {
      var p = P[x.bn_id], k = techOf(x), grp = parVm[x.bn_id + '|' + x.ngay] ? 'VMAT' : grpOf(k), m = x.ngay.slice(0, 7);
      var M = months[m] = months[m] || { thang: m, nhom: {} };
      var T = M.nhom[grp] = M.nhom[grp] || { ten: grp, rows: {}, order: [] };
      var key = p.id;
      if (!T.rows[key]) {
        var a = age(p);
        T.rows[key] = { id: p.id, ho_ten: p.ho_ten, nam: a.nam, nu: a.nu || a.khac, ma_his: p.ma_his, chan_doan: p.chan_doan, bs: shortName(users, p.bs_email), bs_ten: given(p.bs_email),
          kt: /VMAT/i.test(k) ? 'VM' : /IMRT/i.test(k) ? 'IMRT' : '', o: {}, so_buoi: 0, thanh_tien: 0 };
        T.order.push(key);
      }
      var r = T.rows[key];
      var ktvs = rosterKtv(x, p);
      var day = String(+x.ngay.slice(8));
      r.o[day] = (r.o[day] ? r.o[day] + '/' : '') + ktvs.map(function (e) { return initials(users, e); }).join('/');
      r.so_buoi++;
      ktvs.forEach(function (e) { ktvCount[e] = (ktvCount[e] || 0) + 1; });
      bsCount[p.bs_email] = (bsCount[p.bs_email] || 0) + 1;
      tong.so_buoi++; tong.theo_nhom[grp] = (tong.theo_nhom[grp] || 0) + 1;
    });
    var thang = Object.keys(months).sort().map(function (m) {
      var M = months[m];
      var first = m + '-01' < tu ? tu : m + '-01', lastDay = addDays(addDays(m + '-01', 32).slice(0, 7) + '-01', -1), last = lastDay > den ? den : lastDay;
      var days = []; for (var d = first; d <= last; d = addDays(d, 1)) days.push(String(+d.slice(8)));
      return { thang: m, ngay: days, nhom: ['3D', 'VMAT'].filter(function (g) { return M.nhom[g]; }).map(function (g) {
        var T = M.nhom[g], rows = T.order.map(function (k) { var r = T.rows[k]; r.thanh_tien = r.so_buoi * gia; tong.tien += r.thanh_tien; return r; });
        return { ten: g, rows: rows, so_buoi: rows.reduce(function (s, r) { return s + r.so_buoi; }, 0), thanh_tien: rows.reduce(function (s, r) { return s + r.thanh_tien; }, 0) };
      }) };
    });
    var bnXa = {}; fx.forEach(function (x) { bnXa[x.bn_id] = 1; });
    return {
      tu: tu, den: den, khoa: khoa, don_gia: gia,
      thieu_phan_cong: Object.keys(thieu).sort(),
      chu_thich: users.filter(function (x) { return x.vai_tro === 'KTV' && x.kich_hoat !== 'Không'; }).map(function (x) { return [initials(users, x.email), shortName(users, x.email)]; }),
      ky_ten: (dm.KY_TEN || DEFAULT_DM.KY_TEN).slice(),
      mo_phong: mp, thang: thang,
      tong: { mo_phong: mp.length, mat_na: mp.filter(function (x) { return x.mat_na; }).length, tiem: mp.filter(function (x) { return x.tiem; }).length,
        bn_xa: Object.keys(bnXa).length, so_buoi: tong.so_buoi, theo_nhom: tong.theo_nhom, thanh_tien: tong.tien,
        theo_ktv: Object.keys(ktvCount).map(function (e) { return { ten: shortName(users, e), ky_hieu: initials(users, e), so_buoi: ktvCount[e] }; }).sort(function (a, b) { return b.so_buoi - a.so_buoi; }),
        theo_bs: Object.keys(bsCount).map(function (e) { return { ten: shortName(users, e), so_buoi: bsCount[e] }; }).sort(function (a, b) { return b.so_buoi - a.so_buoi; }),
        mp_theo_bs: (function () { var o = {}; mp.forEach(function (x) { o[x.bs] = (o[x.bs] || 0) + 1; }); return Object.keys(o).map(function (k) { return { ten: k, so: o[k] }; }).sort(function (a, b) { return b.so - a.so; }); })() }
    };
  }

  // ---------- Chỉ tiêu khoa, xếp lịch ----------
  function parseQuota(s) { var m = String(s || '').match(/^(.+?)\s*:\s*(\d+)\s*[-–]\s*(\d+)\s*$/); return m && +m[2] <= +m[3] ? { khoa: m[1].trim(), min: +m[2], max: +m[3] } : null; }
  function quotas(dm) { var o = {}; ((dm || {}).CHI_TIEU || DEFAULT_DM.CHI_TIEU).forEach(function (s) { var q = parseQuota(s); if (q) o[q.khoa] = q; }); return o; }
  /**
   * Số BN chiếm chỗ của mỗi khoa theo ngày. BN chiếm chỗ từ ngày bắt đầu (hoặc ngày dự kiến) tới hết đợt, kể cả boost;
   * BN vắng, tạm ngừng vẫn giữ chỗ. "co_the": BN theo dự tính đã xong trước ngày đó nhưng gần đây có vắng, nên có thể còn xạ.
   */
  function occupancy(pts, fractions, env, days, today) {
    var out = {}, since = addDays(today, -14);
    pts.forEach(function (p) {
      if (['CHO_XA', 'DANG_XA', 'TAM_NGUNG'].indexOf(p.trang_thai) < 0 || !p.khoa) return;
      var c = course(p, fractions, env);
      var start = p.trang_thai === 'CHO_XA' && !c.done ? p.ngay_du_kien : (c.start || p.ngay_bat_dau);
      var end = p.trang_thai === 'TAM_NGUNG' ? '9999' : (c.end || '9999');
      var shaky = p.trang_thai === 'DANG_XA' && (c.streak > 0 || Object.keys(c.absent).some(function (d) { return d >= since; }));
      var k = out[p.khoa] = out[p.khoa] || { ngay: {}, dang_xa: 0, vang: 0, tam_ngung: 0, cho_lich: 0 };
      if (p.trang_thai === 'DANG_XA') { k.dang_xa++; if (c.streak > 0) k.vang++; }
      if (p.trang_thai === 'TAM_NGUNG') k.tam_ngung++;
      if (p.trang_thai === 'CHO_XA' && !p.ngay_du_kien) k.cho_lich++;
      days.forEach(function (d) {
        var x = k.ngay[d] = k.ngay[d] || { n: 0, co_the: 0, ket_thuc: 0 };
        if (!start || start > d) return;
        if (end >= d) x.n++; else if (shaky) x.co_the++;
        if (end === d) x.ket_thuc++;
      });
    });
    return out;
  }
  /**
   * Kiểm tra chỉ tiêu trong 2 tuần đầu của BN nếu bắt đầu ngày start (theo lịch tuần nghi).
   * Trả về ngày đầu tiên khoa vượt mức tối đa khi thêm BN này: { ngay, n (kể cả BN này), max, min }, hoặc null.
   */
  function quotaOver(pts, fractions, env, dm, p, start, nghi, today) {
    var q = quotas(dm)[p.khoa]; if (!q || !isDate(start)) return null;
    var t = {}; Object.keys(p).forEach(function (k) { t[k] = p[k]; });
    t.ngay_du_kien = start; t.ngay_bat_dau = ''; t.trang_thai = 'CHO_XA'; if (nghi !== undefined) t.ngay_nghi_tuan = String(nghi || '');
    var lim = addDays(start, 13);
    var days = course(t, [], env).projected.filter(function (d) { return d <= lim; });
    if (!days.length) days = [start];
    var occ = occupancy(pts.filter(function (x) { return x.id !== p.id; }), fractions, env, days, today)[p.khoa];
    for (var i = 0; i < days.length; i++) {
      var n = (occ ? occ.ngay[days[i]].n : 0) + 1;
      if (n > q.max) return { ngay: days[i], n: n, max: q.max, min: q.min, dau: i === 0 };
    }
    return null;
  }
  /** Khoa vượt chỉ tiêu tối đa trong 2 tuần đầu của BN: chỉ cảnh báo, người xếp đồng ý thì cho thêm. BN cấp cứu luôn được xếp. */
  function quotaGuard(ctx, p, day, ok, nghi) {
    if (p.uu_tien === 'Cấp cứu' || ok) return;
    var o = quotaOver(ctx.patients, ctx.fractions, envOf(ctx), ctx.dm, p, day, nghi, ctx.today);
    if (o) fail('QUOTA:Khoa ' + p.khoa + ' ngày ' + o.ngay.slice(8) + '/' + o.ngay.slice(5, 7) + (o.dau ? '' : ' (trong 2 tuần đầu của BN)') + ' sẽ có ' + o.n + '/' + o.max + ' BN (chỉ tiêu ' + o.min + '–' + o.max + '). Đánh dấu "Vẫn xếp, đồng ý vượt chỉ tiêu" nếu đồng ý thêm.');
  }
  function isKtvLead(u) {
    return !!u && (u.vai_tro === 'ADMIN' || (u.vai_tro === 'KTV' && u.chuc_vu === 'KTV trưởng'));
  }
  function userName(ctx, email) { var u = ctx.users.filter(function (x) { return x.email === email; })[0]; return u ? u.ho_ten : (email || ''); }
  function applySchedule(ctx, p, a, title, extra) { return H._scheduleOld(ctx, p, a, title, extra); }
  /** BN tạm ngừng từ 7 ngày (và sau đó mỗi 7 ngày) mà bác sĩ chưa xác nhận: hỏi bác sĩ còn xạ tiếp không */
  function pauseAsk(p, today) {
    if (p.trang_thai !== 'TAM_NGUNG' || !p.tam_ngung_tu) return false;
    var from = p.xn_tam_ngung && p.xn_tam_ngung > p.tam_ngung_tu ? p.xn_tam_ngung : p.tam_ngung_tu;
    return diffDays(from, today) >= 7;
  }
  /** Điều dưỡng chỉ thấy BN khoa mình (chưa ghi khoa thì thấy cả hai khoa) */
  function nurseKhoa(u, dm) { return u && u.vai_tro === 'DD' && u.khoa && ((dm || {}).KHOA || []).indexOf(u.khoa) >= 0 ? u.khoa : ''; }
  /** Được lọc / thống kê theo từng bác sĩ: quản trị, trưởng khoa, ĐD trưởng */
  function canByDoctor(u) { var s = statsScope(u); return !!(s && s.byDoctor); }
  /** Phạm vi thống kê của một người */
  function statsScope(u, pv) {
    if (!u) return null;
    var s = { all: false, khoa: '', self: u.email, byDoctor: false, byKtv: false, byKs: false, label: '', khoaOpt: '' };
    if (u.vai_tro === 'ADMIN') { s.all = true; s.byDoctor = s.byKtv = s.byKs = true; s.self = ''; s.label = 'Cả hai khoa'; return s; }
    // Trưởng khoa / tài khoản khoa Vật lý xạ trị (vai trò kỹ sư): thống kê theo từng kỹ sư
    if (u.vai_tro === 'KS' && (u.chuc_vu === 'Trưởng khoa' || u.chuc_vu === 'Tài khoản khoa' || u.chuc_vu === 'Trưởng phòng')) { s.byKs = true; s.label = 'Khoa ' + (u.khoa || 'Vật lý xạ trị') + ' (theo kỹ sư)'; return s; }
    if (KHOA_LEAD.indexOf(u.chuc_vu) >= 0 && u.khoa) { s.khoa = u.khoa; s.byDoctor = true; s.self = ''; s.label = 'Khoa ' + u.khoa; return s; }
    if (u.chuc_vu === 'Tài khoản khoa' && u.khoa) { s.khoa = u.khoa; s.self = ''; s.label = 'Khoa ' + u.khoa; return s; }
    if (u.chuc_vu === 'KTV trưởng') { s.byKtv = true; s.label = 'Nhóm KTV'; return s; }
    if (u.chuc_vu === 'Trưởng phòng') { s.byKs = true; s.label = 'Nhóm kỹ sư'; return s; }
    // Bác sĩ: số của mình, hoặc tổng của cả khoa mình (không chia theo từng bác sĩ)
    if (u.vai_tro === 'BS') {
      s.khoaOpt = u.khoa || '';
      if (pv === 'khoa' && u.khoa) { s.khoa = u.khoa; s.self = ''; s.label = 'Cả khoa ' + u.khoa; return s; }
      s.label = 'Của tôi'; return s;
    }
    if (u.vai_tro === 'KTV' || u.vai_tro === 'KS') { s.label = 'Của tôi'; return s; }
    if (u.vai_tro === 'DD') { if (u.khoa) { s.khoa = u.khoa; s.self = ''; s.label = 'Khoa ' + u.khoa; } else { s.all = true; s.self = ''; s.label = 'Cả hai khoa'; } return s; }
    return null;
  }
  /**
   * Tính thống kê trong khoảng [tu, den] theo đúng phạm vi người xem.
   * data = { patients, phases, fractions, users, dm }
   */
  /**
   * Tổng hợp trong [tu, den] cho một nhóm BN: lượt xạ theo kỹ thuật, BN bắt đầu / kết thúc, vắng theo lý do, từng ngày.
   * data = { patients (đã lọc phạm vi), phases, fractions, exceptions, holidays, dm }
   */
  function summary(data, tu, den, today) {
    var env = makeEnv(today, data.holidays || [], data.exceptions || [], data.phases || [], ((data.dm || {}).MAY || [])[0]);
    var P = {}; data.patients.forEach(function (p) { if (p.trang_thai !== 'HUY') P[p.id] = p; });
    var G = {}; (data.phases || []).forEach(function (g) { if (g.trang_thai !== 'HUY') G[g.bn_id + '|' + g.stt] = g; });
    var techOf = function (f) { var p = P[f.bn_id], g = f.gd && f.gd !== '1' ? G[f.bn_id + '|' + f.gd] : null; return (g ? g.ky_thuat : p.ky_thuat) || 'Khác'; };
    var inR = function (d) { return d && d >= tu && d <= den; };
    var fx = data.fractions.filter(function (f) { return f.da_huy !== 'Có' && inR(f.ngay) && P[f.bn_id] && !isParFx(f); });
    var o = { tu: tu, den: den, luot: fx.length, bn: 0, ky_thuat: {}, bat_dau: [], ket_thuc: [], ghi_bu: 0,
      vang_luot: 0, vang_bn: 0, vang_ly_do: {}, vang: [], ngay: {} };
    var bn = {};
    fx.forEach(function (f) {
      var k = techOf(f); o.ky_thuat[k] = (o.ky_thuat[k] || 0) + 1; bn[f.bn_id] = 1;
      if (f.ghi_bu === 'Có') o.ghi_bu++;
      var d = o.ngay[f.ngay] = o.ngay[f.ngay] || { luot: 0, ky_thuat: {}, vang: 0 };
      d.luot++; d.ky_thuat[k] = (d.ky_thuat[k] || 0) + 1;
    });
    o.bn = Object.keys(bn).length;
    var vbn = {};
    Object.keys(P).forEach(function (id) {
      var p = P[id];
      if (inR(p.ngay_bat_dau)) o.bat_dau.push(id);
      if (p.trang_thai === 'HOAN_THANH' && inR(p.ngay_ket_thuc)) o.ket_thuc.push(id);
      if (!p.ngay_bat_dau || p.ngay_bat_dau > den || (p.trang_thai === 'HOAN_THANH' && p.ngay_ket_thuc && p.ngay_ket_thuc < tu)) return;
      var c = course(p, data.fractions, env);
      Object.keys(c.absent).forEach(function (d) {
        if (!inR(d)) return;
        var why = c.absent[d] || '';
        o.vang.push({ bn_id: id, ngay: d, ly_do: why });
        var key = why ? why.split(':')[0] : 'Chưa rõ lý do';
        o.vang_ly_do[key] = (o.vang_ly_do[key] || 0) + 1;
        vbn[id] = 1;
        (o.ngay[d] = o.ngay[d] || { luot: 0, ky_thuat: {}, vang: 0 }).vang++;
      });
    });
    o.vang_luot = o.vang.length; o.vang_bn = Object.keys(vbn).length;
    o.vang.sort(function (a, b) { return a.ngay < b.ngay ? 1 : a.ngay > b.ngay ? -1 : 0; });
    return o;
  }
  /** BN trong phạm vi thống kê của người dùng */
  function scopePatients(data, u, sc) {
    var all = data.patients.filter(function (p) { return p.trang_thai !== 'HUY'; });
    if (sc.all) return all;
    if (sc.khoa) return all.filter(function (p) { return p.khoa === sc.khoa; });
    if (u.vai_tro === 'BS' || u.vai_tro === 'ADMIN') { var docs = myDoctors(u); return all.filter(function (p) { return docs.indexOf(p.bs_email) >= 0; }); }
    if (sc.byKtv || sc.byKs) return all;
    if (u.vai_tro === 'KTV') { var mine = {}; data.fractions.forEach(function (f) { if (f.ktv_email === u.email) mine[f.bn_id] = 1; }); return all.filter(function (p) { return mine[p.id]; }); }
    if (u.vai_tro === 'KS') {
      var pl = {}; (data.phases || []).forEach(function (g) { if (g.ks_email === u.email) pl[g.bn_id] = 1; });
      return all.filter(function (p) { return p.ks_email === u.email || pl[p.id]; });
    }
    return [];
  }
  /**
   * Tìm danh sách BN theo điều kiện. f = { tu, den, moc: xa|bat_dau|ket_thuc|nhap, icd: [..], vi_tri, ky_thuat, bs_email, khoa, muc_dich, trang_thai }
   */
  function findPatients(data, f, u) {
    var sc = statsScope(u, f.pv);
    if (!sc) fail('Tài khoản của bạn không có quyền xem thống kê.');
    // Bác sĩ tìm BN để nghiên cứu: trên toàn bộ BN hai khoa, lọc mọi tiêu chí trừ từng bác sĩ
    var research = u.vai_tro === 'BS' && !sc.byDoctor;
    if (research) sc = { all: true, khoa: '', label: 'Toàn bộ BN hai khoa (tìm để nghiên cứu)' };
    if (!sc.byDoctor) f.bs_email = '';
    if (!sc.all) f.khoa = '';
    var tu = f.tu, den = f.den;
    if (!isDate(tu) || !isDate(den) || tu > den) fail('Khoảng ngày không hợp lệ.');
    if (diffDays(tu, den) > 1500) fail('Khoảng thời gian quá dài (tối đa khoảng 4 năm).');
    var cnt = {};
    data.fractions.forEach(function (x) { if (x.da_huy !== 'Có' && x.ngay >= tu && x.ngay <= den && !isParFx(x)) cnt[x.bn_id] = (cnt[x.bn_id] || 0) + 1; });
    var inR = function (d) { return d && d >= tu && d <= den; };
    var moc = f.moc || 'xa';
    var icds = (f.icd || []).map(function (c) { return normIcd(c); }).filter(Boolean);
    var vt = fold(f.vi_tri || '').trim();
    var name = {}; data.users.forEach(function (x) { name[x.email] = x.ho_ten; });
    var rows = scopePatients(data, u, sc).filter(function (p) {
      if (moc === 'xa' ? !cnt[p.id] : moc === 'bat_dau' ? !inR(p.ngay_bat_dau) : moc === 'ket_thuc' ? !(p.trang_thai === 'HOAN_THANH' && inR(p.ngay_ket_thuc)) : !inR(p.ngay_tao)) return false;
      if (icds.length && !icds.some(function (c) { return icdsOf(p).some(function (k) { return k.indexOf(c) === 0; }); })) return false;
      if (vt && fold(p.vi_tri).indexOf(vt) < 0) return false;
      if (f.ky_thuat && p.ky_thuat !== f.ky_thuat) return false;
      if (f.bs_email && p.bs_email !== f.bs_email) return false;
      if (f.khoa && p.khoa !== f.khoa) return false;
      if (f.muc_dich && p.muc_dich !== f.muc_dich) return false;
      if (f.trang_thai && p.trang_thai !== f.trang_thai) return false;
      var mn = p.mat_na && p.mat_na !== 'Không' ? p.mat_na : '';
      if (f.mat_na === 'co' && !mn) return false;
      if (f.mat_na === 'khong' && mn) return false;
      if (f.mat_na && f.mat_na !== 'co' && f.mat_na !== 'khong' && mn !== f.mat_na) return false;
      if (f.tiem_thuoc && (p.tiem_thuoc || 'Không') !== f.tiem_thuoc) return false;
      if (f.dung_cu && !String(p.dung_cu || '').split(/,\s*/).some(function (x) { return f.dung_cu === 'Khác' ? /^Khác/.test(x) : x === f.dung_cu; })) return false;
      return true;
    }).map(function (p) {
      return { id: p.id, ma_his: p.ma_his, ho_ten: p.ho_ten, nam_sinh: p.nam_sinh, gioi: p.gioi, icd: p.icd, chan_doan: p.chan_doan, vi_tri: p.vi_tri,
        ky_thuat: p.ky_thuat, tong_lieu: p.tong_lieu, so_buoi: p.so_buoi, muc_dich: p.muc_dich, bs_email: p.bs_email, bs: name[p.bs_email] || p.bs_email, khoa: p.khoa, mat_na: p.mat_na || '', tiem_thuoc: p.tiem_thuoc || '', dung_cu: p.dung_cu || '',
        trang_thai: p.trang_thai, ngay_tao: p.ngay_tao, ngay_bat_dau: p.ngay_bat_dau, ngay_ket_thuc: p.ngay_ket_thuc, luot_trong_ky: cnt[p.id] || 0, luu_tru: p._luu ? 'Có' : '' };
    }).sort(function (a, b) { return (a.ngay_bat_dau || a.ngay_tao || '9') < (b.ngay_bat_dau || b.ngay_tao || '9') ? -1 : 1; });
    var luot = rows.reduce(function (s, r) { return s + r.luot_trong_ky; }, 0);
    return { tu: tu, den: den, pham_vi: sc.label, so_bn: rows.length, luot: luot, rows: rows.slice(0, 3000), cat_bot: rows.length > 3000 };
  }
  function report(data, tu, den, u, detail, pv) {
    var sc = statsScope(u, pv);
    if (!sc) fail('Tài khoản của bạn không có quyền xem thống kê.');
    if (!isDate(tu) || !isDate(den) || tu > den) fail('Khoảng ngày không hợp lệ.');
    if (diffDays(tu, den) > 400) fail('Chỉ thống kê tối đa 400 ngày một lần.');
    var defMay = (data.dm.MAY || [])[0] || '';
    var P = {}; data.patients.forEach(function (p) { if (p.trang_thai !== 'HUY') P[p.id] = p; });
    var G = {}; (data.phases || []).forEach(function (g) { if (g.trang_thai !== 'HUY') G[g.bn_id + '|' + g.stt] = g; });
    var inKhoa = function (p) { return sc.all || !sc.khoa || p.khoa === sc.khoa; };
    var fx = data.fractions.filter(function (f) { return f.da_huy !== 'Có' && f.ngay >= tu && f.ngay <= den && P[f.bn_id] && !isParFx(f); });
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
    var name0 = function (e) { return name[e] || e || ''; };
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
    var sm = summary({ patients: scopePatients(data, u, sc), phases: data.phases, fractions: data.fractions, exceptions: data.exceptions, holidays: data.holidays, dm: data.dm }, tu, den, data.today || den);
    var nm = {}; data.patients.forEach(function (p) { nm[p.id] = p; });
    ov.vang_luot = sm.vang_luot; ov.vang_bn = sm.vang_bn; ov.vang_ly_do = sm.vang_ly_do; ov.ghi_bu = sm.ghi_bu;
    out.vang = sm.vang.slice(0, 2000).map(function (v) { var p = nm[v.bn_id] || {}; return { bn_id: v.bn_id, ngay: v.ngay, ly_do: v.ly_do, ho_ten: p.ho_ten, ma_his: p.ma_his, bs: name0(p.bs_email), ky_thuat: p.ky_thuat }; });
    if (diffDays(tu, den) <= 62) out.theo_ngay = Object.keys(sm.ngay).sort().map(function (d) { var x = sm.ngay[d]; return { ngay: d, luot: x.luot, ky_thuat: x.ky_thuat, vang: x.vang }; });
    // Theo mã ICD (3 ký tự) và vị trí xạ, trong đúng phạm vi tổng quan
    var ovIds = {}; ovFx.forEach(function (f) { ovIds[f.bn_id] = (ovIds[f.bn_id] || 0) + 1; });
    var scopePts = ovPts.length ? ovPts : Object.keys(ovIds).map(function (k) { return P[k]; });
    var grp = function (keyOf) {
      var m = {};
      var add = function (p) { return [].concat(keyOf(p)).map(function (k) { return (m[k] = m[k] || { ma: k, bn_bat_dau: {}, bn_xa: {}, luot_xa: 0, dot: {} }); }); };
      scopePts.forEach(function (p) { if (inRange(p.ngay_bat_dau)) add(p).forEach(function (g) { g.bn_bat_dau[p.ma_his || p.id] = 1; g.dot[p.id] = 1; }); });
      Object.keys(ovIds).forEach(function (id) { var p = P[id]; add(p).forEach(function (g) { g.bn_xa[p.ma_his || p.id] = 1; g.luot_xa += ovIds[id]; g.dot[id] = 1; }); });
      return Object.keys(m).map(function (k) { var g = m[k]; return { ma: g.ma, bn_bat_dau: Object.keys(g.bn_bat_dau).length, bn_xa: Object.keys(g.bn_xa).length, luot_xa: g.luot_xa, so_dot: Object.keys(g.dot).length }; })
        .sort(function (a, b) { return b.bn_xa - a.bn_xa || b.bn_bat_dau - a.bn_bat_dau; });
    };
    var icd3 = function (p) { var c = icdsOf(p); return c.length ? c : '(chưa có ICD)'; };
    var cap = function (v) { return v.charAt(0).toUpperCase() + v.slice(1); };
    var vtKeys = function (p) { var l = viTris(p).map(fold); return l.length ? l : '~'; };
    out.theo_icd = grp(icd3);
    var vt = grp(vtKeys), label = { '~': '(chưa ghi vị trí)' };
    scopePts.concat(Object.keys(ovIds).map(function (k) { return P[k]; })).forEach(function (p) { viTris(p).forEach(function (v) { var k = fold(v); if (!label[k]) label[k] = cap(v); }); });
    vt.forEach(function (r) { r.ma = label[r.ma] || r.ma; });
    out.theo_vi_tri = vt;
    if (detail && detail.loai && detail.ma) {
      if (detail.loai === 'bs' && !sc.byDoctor && myDoctors(u).indexOf(detail.ma) < 0) fail('Bạn không có quyền xem danh sách BN của bác sĩ khác.');
      var match = detail.loai === 'bs' ? function (p) { return p.bs_email === detail.ma; } : detail.loai === 'icd' ? function (p) { return [].concat(icd3(p)).indexOf(detail.ma) >= 0; } : function (p) { var k = fold(detail.ma); return [].concat(vtKeys(p)).some(function (x) { return x === k || (x === '~' && k === fold('(chưa ghi vị trí)')); }); };
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
    if (sc.byDoctor || u.vai_tro === 'BS') {
      var okBs = sc.byDoctor ? function () { return true; } : function (k) { return myDoctors(u).indexOf(k) >= 0; };
      var bsRows = rows(function (f) { return P[f.bn_id].bs_email; }, function (f, k) { return inKhoa(P[f.bn_id]) && okBs(k); });
      var bsMap = {}; bsRows.forEach(function (x) { x.bn_bat_dau = 0; x.bn_ket_thuc = 0; x.vang_luot = 0; bsMap[x.email] = x; });
      var bsRow = function (k) { return bsMap[k] || (bsMap[k] = bsRows[bsRows.push({ email: k, ten: name0(k), luot_xa: 0, bn_xa: 0, bn_bat_dau: 0, bn_ket_thuc: 0, vang_luot: 0 }) - 1]); };
      ovPts.forEach(function (p) {
        if (!p.bs_email || !okBs(p.bs_email)) return;
        if (inRange(p.ngay_bat_dau)) bsRow(p.bs_email).bn_bat_dau++;
        if (p.trang_thai === 'HOAN_THANH' && inRange(p.ngay_ket_thuc)) bsRow(p.bs_email).bn_ket_thuc++;
      });
      sm.vang.forEach(function (v) { var p = P[v.bn_id]; if (p && p.bs_email && okBs(p.bs_email) && inKhoa(p)) bsRow(p.bs_email).vang_luot++; });
      out.theo_bac_si = bsRows.sort(function (a, b) { return b.luot_xa - a.luot_xa || b.bn_bat_dau - a.bn_bat_dau; });
    }
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
  // ---------- Nhập từ sổ chuyên khoa HIS (tệp Excel) ----------
  function dmyIso(s) {
    var m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s || ''));
    return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
  }
  /**
   * Đọc sổ Excel. aoa: mảng các dòng (mỗi dòng là mảng ô). Tìm dòng tiêu đề theo tên cột;
   * ngày lấy từ cột ngày (nếu có) hoặc từ dòng "Ngày dd/mm/yyyy" chia nhóm.
   */
  function parseHisSheet(aoa) {
    var f = function (v) { return fold(v); };
    var hi = -1, col = {};
    var want = {
      ma: /^ma (benh nhan|bn|y te|nguoi benh)|^ma bn$|^ma benh nhan$|^ma nguoi benh/, ten: /^ho (va )?ten/, ns: /^(nam sinh|ngay sinh|tuoi)$/,
      nam: /^nam$/, nu: /^nu$/, gioi: /^gioi( tinh)?$/, cd: /^chan doan/, noi: /^noi gui|^khoa chi dinh|^noi chi dinh/,
      bs: /^(bac si|bs) chi dinh|^nguoi chi dinh/, dv: /^ten dich vu|^dich vu/, ngay: /^ngay (thuc hien|chi dinh|y lenh|kham)|^ngay$/
    };
    for (var i = 0; i < Math.min((aoa || []).length, 30) && hi < 0; i++) {
      var r = (aoa[i] || []).map(f);
      if (r.some(function (c) { return want.ma.test(c); }) && r.some(function (c) { return want.ten.test(c); })) hi = i;
    }
    if (hi < 0) return [];
    var scan = function (row, base) {
      (row || []).forEach(function (c, j) {
        c = f(c);
        Object.keys(want).forEach(function (k) { if (col[k] === undefined && want[k].test(c)) col[k] = j; });
      });
    };
    scan(aoa[hi]);
    // Dòng tiêu đề phụ (Nam / Nữ dưới "Tuổi")
    var sub = (aoa[hi + 1] || []).map(f), start = hi + 1;
    if (sub.some(function (c) { return c === 'nam' || c === 'nu'; })) { scan(aoa[hi + 1]); start = hi + 2; }
    if (col.nam === undefined && col.ns !== undefined && col.gioi === undefined) col.nam = col.ns;
    var day = '', out = [];
    var cell = function (row, k) { return col[k] === undefined ? '' : String(row[col[k]] == null ? '' : row[col[k]]).replace(/\s+/g, ' ').trim(); };
    for (var n = start; n < aoa.length; n++) {
      var row = aoa[n] || [];
      var ma = cell(row, 'ma');
      if (!/^\d{4,12}$/.test(ma)) {
        var txt = row.map(function (c) { return String(c == null ? '' : c); }).join(' ');
        if (/Ngày\s+\d{1,2}\/\d{1,2}\/\d{4}/.test(txt)) day = dmyIso(txt);
        continue;
      }
      var nam = cell(row, 'nam'), nu = cell(row, 'nu'), ns = (nam || nu || cell(row, 'ns')).replace(/^.*(\d{4}).*$/, '$1');
      var g = cell(row, 'gioi');
      var nd = cell(row, 'ngay');
      out.push({ ngay: (nd && (dmyIso(nd) || (isDate(nd.slice(0, 10)) ? nd.slice(0, 10) : ''))) || day, ma_his: ma, ho_ten: cell(row, 'ten'), nam_sinh: ns,
        gioi: g ? (/^n(u|ữ)/i.test(fold(g)) ? 'Nữ' : 'Nam') : nam ? 'Nam' : nu ? 'Nữ' : '',
        chan_doan: cell(row, 'cd'), noi_gui: cell(row, 'noi'), bs: cell(row, 'bs'), dich_vu: cell(row, 'dv') });
    }
    return out;
  }
  // ---------- Phân công theo ca ----------
  function parseCa(s) {
    var m = /^(.+?)\s*:\s*(\d{1,2})[:h.](\d{2})\s*[-–]\s*(\d{1,2})[:h.](\d{2})\s*$/.exec(String(s || '').trim());
    if (!m) return null;
    var hh = function (h, mm) { return ('0' + (+h)).slice(-2) + ':' + mm; };
    return { ten: m[1].trim(), tu: hh(m[2], m[3]), den: hh(m[4], m[5]) };
  }
  /** Tên ca theo giờ "HH:MM" (danh mục GIO_CA); không có thì '' */
  function caOfTime(dm, hm) {
    hm = String(hm || '').slice(0, 5);
    if (!/^\d\d:\d\d$/.test(hm)) return '';
    var out = '';
    ((dm || {}).GIO_CA || []).forEach(function (s) { var c = parseCa(s); if (c && hm >= c.tu && hm < c.den && !out) out = c.ten; });
    return out;
  }
  /**
   * Các dòng phân công xạ của một ngày ứng với máy và giờ xạ.
   * Vị trí có tên máy ở đầu thì lọc theo máy; không thì lấy các vị trí "Ca ...". Bỏ vị trí mô phỏng.
   * Biết giờ và có GIO_CA thì lấy đúng ca; không thì lấy mọi ca của ngày.
   */
  function rosterFor(rows, may, hm, dm) {
    var fm = fold(may);
    var xa = (rows || []).filter(function (r) { return fold(r.vi_tri).indexOf('mo phong') < 0; });
    var onM = xa.filter(function (r) { return fm && fold(r.vi_tri).indexOf(fm) === 0; });
    xa = onM.length ? onM : xa.filter(function (r) { return /^ca\b/.test(fold(r.vi_tri)); });
    var ca = fold(caOfTime(dm, hm));
    if (ca) {
      var c = xa.filter(function (r) { var v = fold(r.vi_tri); return v === ca || v.slice(-ca.length - 1) === ' ' + ca; });
      if (c.length) return c;
    } else if (hm) {
      // kiểu cũ: "ca sáng" / "ca chiều"
      var s = +hm.slice(0, 2) < 12 ? 'sang' : 'chieu';
      var c2 = xa.filter(function (r) { return fold(r.vi_tri).indexOf(s) >= 0; });
      if (c2.length) return c2;
    }
    return xa;
  }
  /** Bỏ học hàm, học vị trước tên bác sĩ: "ThS.BSNT. Nguyễn Văn A" → "nguyen van a" */
  function bareName(s) { return fold(s).replace(/^((gs|pgs|ts|ths|bs|bsck|bscki|bsckii|bsck1|bsck2|bsnt|bscc|ck|cki|ckii|ks|ktv|dd|cn)\b\.?\s*)+/, '').replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function matchDoctor(users, name) {
    var t = bareName(name);
    if (!t) return null;
    var docs = (users || []).filter(function (u) { return u.kich_hoat !== 'Không' && (u.vai_tro === 'BS' || u.vai_tro === 'ADMIN'); });
    var eq = docs.filter(function (u) { return bareName(u.ho_ten) === t; });
    if (eq.length === 1) return eq[0];
    if (eq.length) return null;
    // Viết tắt tên đệm: "Nguyễn T. Ngọc Hà" = "Nguyễn Thị Ngọc Hà" (chữ cái đầu khớp, họ và tên phải đủ)
    var tw = t.split(' ');
    var abbr = function (b) {
      var bw = b.split(' ');
      if (bw.length !== tw.length || bw.length < 2) return false;
      return bw.every(function (w, i) {
        var x = tw[i];
        if (w === x) return true;
        if (i === 0 || i === bw.length - 1) return false;
        return (w.length === 1 && x.charAt(0) === w) || (x.length === 1 && w.charAt(0) === x);
      });
    };
    var ab = docs.filter(function (u) { return abbr(bareName(u.ho_ten)); });
    if (ab.length === 1) return ab[0];
    if (ab.length) return null;
    var tail = docs.filter(function (u) { var b = bareName(u.ho_ten); return b && b.split(' ').length >= 2 && (t.slice(-b.length - 1) === ' ' + b || b.slice(-t.length - 1) === ' ' + t); });
    return tail.length === 1 ? tail[0] : null;
  }
  function titleCase(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  /**
   * Từ các dòng sổ, lập danh sách BN có dịch vụ mô phỏng, đối chiếu với dữ liệu sẵn có.
   * d: { patients, users, dm, today }, his: { ma_his: [dòng chỉ mục] }.
   * trang: 'moi' (thêm được) · 'co' (đã có, bỏ qua) · 'xem' (cần người nhập xem lại).
   */
  function planImport(rows, d, his) {
    var by = {};
    (rows || []).forEach(function (r) {
      if (!/^\d{4,12}$/.test(r.ma_his) || fold(r.dich_vu).indexOf('mo phong') < 0) return;
      var o = by[r.ma_his];
      if (!o || (r.ngay || '') > (o.ngay || '')) by[r.ma_his] = r;
    });
    var khoas = (d.dm && d.dm.KHOA) || [];
    return Object.keys(by).map(function (ma) {
      var r = by[ma], seen = {}, courses = [];
      (d.patients || []).forEach(function (p) { if (p.ma_his === ma && p.trang_thai !== 'HUY') { seen[p.id] = 1; courses.push(p); } });
      ((his || {})[ma] || []).forEach(function (x) { if (!seen[x.id] && x.trang_thai !== 'HUY') courses.push(x); });
      var doc = matchDoctor(d.users, r.bs);
      var it = { ngay: r.ngay, ma_his: ma, ho_ten: titleCase(r.ho_ten), nam_sinh: r.nam_sinh, gioi: r.gioi, chan_doan: r.chan_doan,
        noi_gui: r.noi_gui, bs_his: r.bs, bs_email: doc ? doc.email : '', khoa: doc && khoas.indexOf(doc.khoa) >= 0 ? doc.khoa : (khoas[0] || ''),
        ngay_mo_phong: r.ngay, trang: 'moi', note: '', force_name: false };
      it.ghi_chu = 'Nhập từ sổ HIS: mô phỏng ' + (r.ngay ? r.ngay.split('-').reverse().join('/') : '?') + (r.bs ? ', BS chỉ định ' + r.bs : '') + (r.noi_gui ? ', nơi gửi ' + r.noi_gui : '');
      var active = courses.filter(function (x) { return ['HOAN_THANH', 'HUY'].indexOf(x.trang_thai) < 0 && x.luu_tru !== 'Có'; })[0];
      var recent = courses.filter(function (x) { return x.ngay_tao && r.ngay && x.ngay_tao >= addDays(r.ngay, -30); })[0];
      var other = courses.filter(function (x) { return fold(x.ho_ten) !== fold(it.ho_ten); })[0];
      if (active) { it.trang = 'co'; it.note = 'Đã có trong hệ thống (' + (STATUS[active.trang_thai] || active.trang_thai) + ')'; }
      else if (recent) { it.trang = 'co'; it.note = 'Đã nhập đợt xạ ngày ' + recent.ngay_tao.split('-').reverse().join('/'); }
      else if (other) { it.trang = 'xem'; it.note = 'Mã HIS đã dùng cho ' + other.ho_ten + ': kiểm tra lại'; it.force_name = true; }
      else if (!doc) { it.trang = 'xem'; it.note = 'Chưa khớp bác sĩ "' + (r.bs || '—') + '": chọn bác sĩ'; }
      else if (courses.length) it.note = 'Đợt xạ mới (đã xạ trước đây)';
      return it;
    }).sort(function (a, b) { return (b.ngay || '').localeCompare(a.ngay || '') || a.ho_ten.localeCompare(b.ho_ten); });
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
    VERSION: VERSION, CHUC_VU: CHUC_VU, isLead: isLead, statsScope: statsScope, nurseKhoa: nurseKhoa, canByDoctor: canByDoctor, doctorKhoa: doctorKhoa, report: report, staffKhoa: staffKhoa, myDoctors: myDoctors,
    IMPORT_COLS: IMPORT_COLS, FULL_COLS: FULL_COLS, isoDate: isoDate, guessOffDay: guessOffDay, khoaReport: khoaReport, khoaReportScope: khoaReportScope, initials: initials, quotas: quotas, parseQuota: parseQuota, occupancy: occupancy, quotaOver: quotaOver, isKtvLead: isKtvLead, pauseAsk: pauseAsk, isParFx: isParFx, normIcd: normIcd, isIcd: isIcd, icdsOf: icdsOf, icdName: icdName, summary: summary, findPatients: findPatients, scopePatients: scopePatients, fold: fold, indexRow: indexRow, STATUS: STATUS, STATUS_ORDER: STATUS_ORDER, PLAN_STATES: PLAN_STATES, ROLES: ROLES, PRIORITY_RANK: PRIORITY_RANK, planOrder: planOrder, submitTime: submitTime, DOW: DOW,
    parseHisSheet: parseHisSheet, planImport: planImport, matchDoctor: matchDoctor, rosterFor: rosterFor, caOfTime: caOfTime,
    COLS: COLS, DEFAULT_DM: DEFAULT_DM, DM_EDITABLE: DM_EDITABLE, can: can, handle: handle, view: view, localCtx: localCtx,
    makeEnv: makeEnv, course: course, segments: segments, totalFx: totalFx, planningQueue: planningQueue,
    isTreatDay: isTreatDay, baseDay: baseDay, patternDay: patternDay, isDown: isDown, exceptionOf: exceptionOf,
    scheduleLabel: scheduleLabel, isOpen: isOpen, lenientEdit: lenientEdit, FIELD_LABELS: FIELD_LABELS, missingRx: missingRx, needsOffDay: needsOffDay, offDay: offDay, viTris: viTris, canTreat: canTreat, canCancel: canCancel, prevSim: prevSim, dosePerFx: dosePerFx,
    addDays: addDays, diffDays: diffDays, dow: dow, monday: monday, isDate: isDate, num: num, splitList: splitList, fxOf: fxOf
  };
})();
if (typeof module !== 'undefined') module.exports = RT;
