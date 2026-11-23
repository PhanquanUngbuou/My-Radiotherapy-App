/* Giao diện Điều phối Xạ trị. Chạy được trong Google Apps Script (google.script.run) và ở chế độ demo (window.DEMO). */
(function () {
  'use strict';

  var S = { data: null, tab: null, scope: 'mine', q: '', fStatus: '', fBs: '', fKhoa: '', fMay: '', detail: null, cc: {}, busy: 0, error: null, log: null, lastLoad: 0 };
  var IS_GAS = !!(window.google && google.script && google.script.run);
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  // ---------- tiện ích ----------
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fd(s) { if (!s) return ''; var p = s.split('-'); return p[2] + '/' + p[1]; }
  function fdy(s) { if (!s) return ''; var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function wd(s) { return RT.DOW[RT.dow(s)]; }
  function fdw(s) { return s ? wd(s) + ' ' + fd(s) : ''; }
  function fold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function today() { return S.data.today; }
  function realMe() { return S.data.me; }
  /** Quản trị chọn "Xem như" một người: giao diện hiển thị đúng như người đó thấy (chỉ xem) */
  function me() {
    if (S.viewAs && S.data.me.vai_tro === 'ADMIN') { var u = S.data.users.filter(function (x) { return x.email === S.viewAs; })[0]; if (u) return u; }
    return S.data.me;
  }
  function role() { return me().vai_tro; }
  function asParam(o) { if (S.viewAs && realMe().vai_tro === 'ADMIN') o.as = S.viewAs; return o; }
  function can(a) { return RT.can(role(), a, me(), S.data.users); }
  function isLead() { return RT.isLead(me()); }
  function nameOf(email) { var u = S.data.users.filter(function (x) { return x.email === email; })[0]; return u ? u.ho_ten : (email || ''); }
  /** Bác sĩ: vai trò BS, hoặc Quản trị có tên bắt đầu bằng "BS" (bác sĩ kiêm quản trị) */
  function isDoctor(u) { return u && (u.vai_tro === 'BS' || (u.vai_tro === 'ADMIN' && /^\s*(BS|Bác sĩ|ThS|TS|PGS)/i.test(u.ho_ten || ''))); }
  function doctors() { return S.data.users.filter(function (u) { return u.kich_hoat !== 'Không' && isDoctor(u); }); }
  /** Danh sách chọn BS điều trị: bỏ BS trợ lý chưa được Quản trị cho phép */
  function treatDoctors() { return doctors().filter(function (u) { return RT.canTreat(u) || u.vai_tro === 'ADMIN'; }); }
  function activeUsers(role) { return S.data.users.filter(function (u) { return u.kich_hoat !== 'Không' && (!role || u.vai_tro === role); }); }
  function unitName() { return (S.data.dm.TEN_DON_VI || [])[0] || ''; }
  function env() { return S.env || (S.env = RT.makeEnv(today(), S.data.holidays, S.data.exceptions, S.data.phases, (S.data.dm.MAY || [])[0])); }
  function archEnv() { return S.archEnv || (S.archEnv = RT.makeEnv(today(), S.data.holidays, [], (S.arch && S.arch.phases) || [], (S.data.dm.MAY || [])[0])); }
  function course(p) {
    if (p._pid) p = byId(p._pid);
    if (p._idx) { if (!S.cc[p.id]) { S.cc[p.id] = RT.course(p, [], archEnv()); S.cc[p.id].done = RT.num(p.da_xa); } return S.cc[p.id]; }
    if (p._arch) return S.cc[p.id] || (S.cc[p.id] = RT.course(p, S.arch.fractions, archEnv()));
    return S.cc[p.id] || (S.cc[p.id] = RT.course(p, S.data.fractions, env()));
  }
  function setData(d) { S.data = d; S.cc = {}; S.env = null; S.itemsCache = null; S.lastLoad = Date.now(); absenceAlerts(); }
  /** BN của bác sĩ vắng từ 2 buổi liên tiếp: báo trên chuông (mỗi BN một lần mỗi ngày) */
  S.alerted = {};
  function absentLong() {
    var docs = RT.myDoctors(me());
    return pts().filter(function (p) { return docs.indexOf(p.bs_email) >= 0 && (p.trang_thai === 'DANG_XA' || p.trang_thai === 'TAM_NGUNG') && course(p).streak >= 2; });
  }
  function reviewList() {
    var docs = RT.myDoctors(me());
    return pts().filter(function (p) { if (docs.indexOf(p.bs_email) < 0 || (p.trang_thai !== 'DANG_XA' && p.trang_thai !== 'TAM_NGUNG')) return false; var c = course(p); return c.review && c.review - c.done <= 2; });
  }
  function absenceAlerts() {
    if (S.data) bellLoad();
    if (!S.data || !isDoctor(me()) || typeof pushNotes !== 'function') return;
    var list = absentLong().filter(function (p) { var k = p.id + '|' + today(); if (S.alerted[k]) return false; S.alerted[k] = 1; return true; });
    var ask = pauseAskList().filter(function (p) { var k = 'tn|' + p.id + '|' + today(); if (S.alerted[k]) return false; S.alerted[k] = 1; return true; });
    var rv = reviewList().filter(function (p) { var k = 'rv|' + p.id + '|' + course(p).done; if (S.alerted[k]) return false; S.alerted[k] = 1; return true; });
    var notes = rv.map(function (p) { var c = course(p); return { pid: p.id, text: p.ho_ten + ' (' + p.ma_his + '): ' + (c.reviewWait ? 'đã xạ hết ' + c.review + ' buổi được chuyển, cần BS đánh giá lại' : 'còn ' + (c.review - c.done) + ' buổi tới mốc đánh giá lại (buổi ' + c.review + ')'), time: '' }; }).concat(list.map(function (p) { var n = course(p).streak; return { pid: p.id, text: p.ho_ten + ' (' + p.ma_his + '): vắng ' + n + ' buổi liên tiếp' + (n >= 3 ? ', cân nhắc chuyển Tạm ngừng' : ''), time: '' }; })
      .concat(ask.map(function (p) { return { pid: p.id, text: p.ho_ten + ' (' + p.ma_his + '): tạm ngừng ' + daysSince(p.tam_ngung_tu) + ' ngày, BN còn xạ tiếp không?', time: '' }; })));
    if (notes.length) setTimeout(function () { pushNotes(notes); if (S.data) renderShell(); }, 0);
    else bellSave();
  }
  /** Các "việc lập kế hoạch": BN (GĐ1) và các boost đang ở bước mô phỏng → QA. Boost mượn thông tin hành chính của BN. */
  var PH_FIELDS = ['ky_thuat', 'tong_lieu', 'so_buoi', 'muc_lieu', 'uu_tien', 'ly_do_uu_tien', 'tg_nop_kh', 'trang_thai', 'ngay_tao', 'ngay_mo_phong', 'ngay_contour_xong', 'ks_email', 'ngay_nhan_kh', 'ngay_kh_xong', 'can_qa', 'qa_ket_qua', 'ngay_qa', 'ghi_chu'];
  /** Tên loại giai đoạn: boost nối tiếp / KH lại / KH đồng thời */
  function phKind(g) { return g.loai === 'KH_LAI' ? 'KH lại' : g.loai === 'SONG_SONG' ? 'KH đồng thời' : 'Boost'; }
  function phTag(g) { return ' <span class="tag boost">' + phKind(g) + (g.loai ? '' : ' GĐ' + esc(g.stt)) + '</span>'; }
  function phaseItem(g, p) {
    var it = {};
    Object.keys(p).forEach(function (k) { it[k] = p[k]; });
    PH_FIELDS.forEach(function (k) { it[k] = g[k]; });
    it.id = g.id; it._g = g; it._pid = p.id;
    return it;
  }
  function items() {
    if (S.itemsCache) return S.itemsCache;
    var list = pts().slice();
    (S.data.phases || []).forEach(function (g) {
      if (RT.PLAN_STATES.indexOf(g.trang_thai) < 0) return;
      var p = pts().filter(function (x) { return x.id === g.bn_id; })[0];
      if (p && p.trang_thai !== 'HOAN_THANH') list.push(phaseItem(g, p));
    });
    return (S.itemsCache = list);
  }
  /** Boost còn bao nhiêu buổi nữa là tới (để ưu tiên lập KH) */
  function boostLeft(it) {
    if (!it._g) return 99;
    var p = byId(it._pid);
    if (!p || ['DANG_XA', 'TAM_NGUNG'].indexOf(p.trang_thai) < 0) return 99;
    var c = course(p), seg = c.segs.filter(function (x) { return x.g && x.g.id === it.id; })[0];
    return seg ? Math.max(0, seg.from - c.done) : 99;
  }
  function boostFlag(it) {
    var n = boostLeft(it);
    if (n === 99) return '';
    return '<span class="flag' + (n <= 3 ? ' crit' : '') + '">' + (n === 0 ? 'BN đang chờ boost!' : 'GĐ trước còn ' + n + ' buổi') + '</span>';
  }
  function pts() {
    var nk = RT.nurseKhoa(me(), S.data.dm);
    if (!nk) return S.data.patients;
    if (S.ptsSrc !== S.data.patients || S.ptsKhoa !== nk) { S.ptsSrc = S.data.patients; S.ptsKhoa = nk; S.ptsNk = S.data.patients.filter(function (p) { return p.khoa === nk; }); }
    return S.ptsNk;
  }
  /** Ô chọn khoa: điều dưỡng chỉ có khoa mình nên không hiện */
  function khoaFilterOn() { return S.data.dm.KHOA.length > 1 && !RT.nurseKhoa(me(), S.data.dm); }
  function byDoctorOn() { return RT.canByDoctor(me()); }
  function byId(id) {
    var p = pts().filter(function (x) { return x.id === id; })[0];
    if (p) return p;
    var it = items().filter(function (x) { return x.id === id; })[0];
    if (it) return it;
    var g = (S.data.phases || []).filter(function (x) { return x.id === id; })[0];
    if (g) { var pp = pts().filter(function (x) { return x.id === g.bn_id; })[0]; if (pp) return phaseItem(g, pp); }
    return S.arch ? S.arch.patients.filter(function (x) { return x.id === id; })[0] : null;
  }
  function age(p) { var y = parseInt(p.nam_sinh, 10); return y > 1900 ? (parseInt(today().slice(0, 4), 10) - y) + 't' : ''; }
  function daysSince(s) { return s ? RT.diffDays(s, today()) : 0; }
  function prRank(p) { var r = RT.PRIORITY_RANK[p.uu_tien]; return r == null ? 2 : r; }
  function stPill(p) { return '<span class="pill st-' + p.trang_thai + '">' + esc(RT.STATUS[p.trang_thai] || p.trang_thai) + '</span>'; }
  function prPill(p) { return '<span class="pill pr-' + prRank(p) + '"' + (p.ly_do_uu_tien ? ' title="' + esc(p.ly_do_uu_tien) + '"' : '') + '>' + esc(p.uu_tien || 'Thường') + '</span>'; }
  function prCell(p) { return prPill(p) + (p.ly_do_uu_tien && p.uu_tien !== 'Thường' ? '<span class="sub pr-why">' + esc(p.ly_do_uu_tien) + '</span>' : ''); }
  /** Tô nền dòng BN đang trong quy trình chuẩn bị: cấp cứu đỏ, ưu tiên cam */
  var PR_ROW_ST = ['MO_PHONG', 'CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA', 'CHO_XA'];
  function prRowCls(p) { return p && PR_ROW_ST.indexOf(p.trang_thai) >= 0 ? (p.uu_tien === 'Cấp cứu' ? ' pr-row-0' : p._g ? ' pr-row-b' : p.uu_tien === 'Ưu tiên' ? ' pr-row-1' : '') : ''; }
  /** Xếp lịch xạ: nhóm Cấp cứu → Boost → Thường / Ưu tiên; trong nhóm, sẵn sàng trước đứng trước */
  function schedRank(p) { return p.uu_tien === 'Cấp cứu' ? 0 : p._g ? 1 : 2; }
  function readyTime(p) { return p.trang_thai === 'CHO_XA' ? (p.ngay_qa || p.ngay_kh_xong || '') : RT.submitTime(p); }
  function schedOrder(a, b) {
    var ra = schedRank(a), rb = schedRank(b);
    if (ra !== rb) return ra - rb;
    var ta = readyTime(a), tb = readyTime(b);
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  }
  var PR_LEGEND = '<div class="pr-legend"><span class="lg lg0">Cấp cứu</span><span class="lg lgb">Boost</span><span class="lg lg1">Ưu tiên</span><span class="lg lg2">Thường</span></div>';
  function prioReasonField(val) {
    return '<div class="field full" data-prio-why><label><span data-prio-lb>Lý do ưu tiên</span> <span class="req">*</span></label><input type="text" name="ly_do_uu_tien" maxlength="200" value="' + esc(val || '') + '"></div>';
  }
  function bindPrio(form) {
    var box = $('[data-prio-why]', form); if (!box) return;
    var upd = function () { var v = formValues(form).uu_tien || 'Thường'; box.hidden = v === 'Thường'; $('[data-prio-lb]', form).textContent = v === 'Cấp cứu' ? 'Lý do cấp cứu' : 'Lý do ưu tiên'; };
    $$('[name=uu_tien]', form).forEach(function (el) { el.addEventListener('change', upd); }); upd();
  }
  // ---------- Chỉ tiêu khoa, đề xuất lịch ----------
  function ktvLead() { return RT.isKtvLead(me(), S.data.users); }
  function proposal(p) { if (!p.de_xuat_lich) return null; try { return JSON.parse(p.de_xuat_lich); } catch (e) { return null; } }
  function pendingSched() { return pts().filter(function (p) { return proposal(p) && ['DANG_XA', 'TAM_NGUNG', 'HOAN_THANH'].indexOf(p.trang_thai) < 0; }).sort(function (a, b) { return a.de_xuat_luc < b.de_xuat_luc ? -1 : 1; }); }
  function workDays(n, from) { var out = [], d = from || today(); for (var i = 0; out.length < n && i < 60; i++, d = RT.addDays(d, 1)) if (RT.dow(d) !== 0 && S.data.holidays.indexOf(d) < 0) out.push(d); return out; }
  /** Số BN của khoa chiếm chỗ ngày d, không tính BN p */
  function khoaLoad(p, d) { var o = RT.occupancy(pts().filter(function (x) { return x.id !== p.id; }), S.data.fractions, env(), [d], today())[p.khoa]; return o ? o.ngay[d].n : 0; }
  function quotaBox() {
    var q = RT.quotas(S.data.dm), ks = S.data.dm.KHOA.filter(function (k) { return q[k] && (!RT.nurseKhoa(me(), S.data.dm) || k === RT.nurseKhoa(me(), S.data.dm)); });
    if (!ks.length) return '';
    var days = workDays(10), occ = RT.occupancy(pts(), S.data.fractions, env(), days, today());
    var tot = { min: 0, max: 0 };
    var rows = ks.map(function (k) {
      var o = occ[k] || { ngay: {}, dang_xa: 0, vang: 0, tam_ngung: 0, cho_lich: 0 }; tot.min += q[k].min; tot.max += q[k].max;
      return '<tr><td data-l="Khoa"><b>' + esc(k) + '</b><span class="sub">Chỉ tiêu ' + q[k].min + '–' + q[k].max + ' · đang xạ ' + o.dang_xa + (o.vang ? ' (đang vắng ' + o.vang + ')' : '') + ' · tạm ngừng ' + o.tam_ngung + (o.cho_lich ? ' · ' + o.cho_lich + ' chờ vào xạ chưa có lịch' : '') + '</span></td>' +
        days.map(function (d) { var x = o.ngay[d] || { n: 0, co_the: 0, ket_thuc: 0 }, con = q[k].max - x.n - x.co_the;
          return '<td data-l="' + fdw(d) + '" class="num nowrap"><b>' + x.n + '</b>/' + q[k].max + '<span class="sub">còn ' + Math.max(0, con) + (x.co_the ? ' (+' + x.co_the + ' có thể)' : '') + '</span>' + (x.ket_thuc ? '<span class="sub">' + x.ket_thuc + ' kết thúc</span>' : '') + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<section class="group"><div class="group-head"><h2>Chỗ theo chỉ tiêu khoa</h2><span class="hint">Tổng hai khoa ' + tot.min + '–' + tot.max + '. BN vắng, tạm ngừng vẫn giữ chỗ. “Có thể”: BN theo dự tính đã xong nhưng gần đây có vắng nên có thể còn xạ. Tính lại mỗi ngày.</span></div>' +
      '<div class="card"><div class="tbl-wrap"><table class="quota"><thead><tr><th>Khoa</th>' + days.map(function (d) { return '<th class="num nowrap">' + fdw(d) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div></div></section>';
  }
  function pauseAskList() { var docs = RT.myDoctors(me()); return pts().filter(function (p) { return docs.indexOf(p.bs_email) >= 0 && RT.pauseAsk(p, today()); }); }
  function prioError(v) { return v.uu_tien && v.uu_tien !== 'Thường' && !String(v.ly_do_uu_tien || '').trim() ? 'BN “' + v.uu_tien + '” cần ghi rõ lý do ' + (v.uu_tien === 'Cấp cứu' ? 'cấp cứu' : 'ưu tiên') + '.' : ''; }
  function rx(p) {
    if (!p._g && RT.missingRx(p).length) return '<span class="flag">Chưa đủ chỉ định</span>' + (p.ky_thuat ? ' ' + esc(p.ky_thuat) : '');
    var c = !p._g && course(p);
    if (c && c.par.length) return '<b>' + esc(mainName(p)) + '</b> ' + esc(p.ky_thuat) + ' · <span class="num">' + esc(p.tong_lieu) + ' Gy/' + esc(p.so_buoi) + '</span>' +
      c.par.map(function (q) { return '<span class="sub">+ <b>' + esc(parName(q)) + '</b> ' + esc(q.ky_thuat) + ' · <span class="num">' + esc(q.g.tong_lieu) + ' Gy/' + q.total + '</span></span>'; }).join('');
    return esc(p.ky_thuat) + ' · <span class="num">' + esc(p.tong_lieu) + ' Gy/' + esc(p.so_buoi) + '</span>';
  }
  /** Tên ngắn của KH chính / KH đồng thời (theo vị trí) */
  function mainName(p) { return p.vi_tri || 'KH chính'; }
  function parName(q) { return q.g.vi_tri || 'KH đồng thời'; }
  /** BN chuyển KH một phần: nhãn nhỏ khi gần / tới mốc đánh giá lại */
  function reviewTag(p) {
    if (p._g || ['CHO_XA', 'DANG_XA', 'TAM_NGUNG'].indexOf(p.trang_thai) < 0) return '';
    var c = course(p); if (!c.review) return '';
    if (c.reviewWait) return ' <span class="flag crit">Chờ BS đánh giá lại</span>';
    return c.review - c.done <= 3 ? ' <span class="flag">Đánh giá lại sau buổi ' + c.review + '</span>' : '';
  }
  function ptCell(p) {
    return '<div class="pt"><b>' + esc(p.ho_ten) + '</b>' + (p._g ? phTag(p._g) : '') + reviewTag(p) + '<span class="sub"><span class="mono">' + esc(p.ma_his) + '</span>' +
      (age(p) ? ' · ' + age(p) : '') + (p.gioi ? ' · ' + esc(p.gioi) : '') + '</span></div>';
  }
  function progCell(p) {
    var c = course(p), pct = c.open ? 0 : c.total ? Math.round(c.done / c.total * 100) : 0;
    if (c.open) return '<span class="num">Đã xạ ' + c.done + ' buổi</span><span class="flag crit">Chưa có tổng liều / số buổi</span>';
    return '<div class="prog"><span class="bar"><i style="width:' + pct + '%"></i></span><span class="num">' + c.done + '/' + c.total + '</span></div>' +
      (c.par.length ? '<span class="sub">' + esc(mainName(p)) + ' ' + c.mainDone + '/' + c.mainTotal + c.par.map(function (q) { return ' · ' + esc(parName(q)) + ' ' + q.done + '/' + q.total; }).join('') + '</span>' : '');
  }
  function igrtBadges(p) {
    var s = '';
    if (p.igrt && p.igrt !== 'Không') s += '<span class="tag" title="' + esc(p.igrt) + '">IGRT</span> ';
    if (p.sgrt === 'Có') s += '<span class="tag">SGRT</span>';
    return s || '<span class="muted">—</span>';
  }
  function plural(n, w) { return n + ' ' + w; }

  // ---------- gọi máy chủ ----------
  function call(action, payload) {
    return new Promise(function (resolve, reject) {
      var done = function (s) { var r; try { r = JSON.parse(s); } catch (e) { return reject({ error: 'Phản hồi không hợp lệ từ máy chủ.' }); } if (r.ok) resolve(r); else reject(r); };
      if (IS_GAS) {
        google.script.run.withSuccessHandler(done).withFailureHandler(function (e) { reject({ error: String(e && e.message || e) }); }).api(action, payload || null);
      } else if (window.DEMO) {
        setTimeout(function () { done(window.DEMO.api(action, payload || null)); }, 150);
      } else reject({ error: 'Không có kết nối tới máy chủ.' });
    });
  }
  function setBusy(d) { S.busy += d; $('#busy').hidden = S.busy <= 0; }
  function isNetErr(e) { return /NetworkError|network|HTTP 0|Failed to fetch|Connection|timed? ?out|Không có kết nối/i.test(String(e && e.error || e || '')); }
  /** Gửi lên máy chủ; lỗi mạng thì tự gửi lại 2 lần. Mỗi thao tác có mã riêng (_rid) để máy chủ không làm lại thao tác đã làm. */
  function callRetry(action, payload, tries) {
    if (payload && typeof payload === 'object' && !payload._rid) payload._rid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    tries = tries == null ? 2 : tries;
    return call(action, payload).catch(function (e) {
      if (tries > 0 && isNetErr(e)) return new Promise(function (ok) { setTimeout(ok, tries === 2 ? 1500 : 4000); }).then(function () { return callRetry(action, payload, tries - 1); });
      throw e;
    });
  }
  /** Lưu và chỉ hiện kết quả khi máy chủ đã lưu xong (dùng cho thêm BN) */
  function serverRun(action, payload) {
    setBusy(1);
    return callRetry(action, payload).then(function (r) {
      if (r.rev) S.rev = r.rev;
      setData(r.data); if (r.msg) toast(r.msg); render();
      return r;
    }).finally(function () { setBusy(-1); });
  }
  var LOCAL = { getLog: 0, searchArchive: 0, demoSwitch: 0, bootstrap: 0 };
  S.hisCache = {};
  function errText(e) {
    var m = String(e && e.error || e || '');
    if (m.indexOf('HIS_NAME:') === 0) return 'Mã HIS này đã dùng cho bệnh nhân khác: ' + m.slice(9) + '. Kiểm tra lại mã HIS.';
    if (m.indexOf('DUP_HIS:') === 0) return 'Mã HIS đang có đợt xạ hoạt động: ' + m.slice(8) + '. Không thêm BN trùng mã HIS: mở hồ sơ BN đó để thao tác.';
    if (m.indexOf('HAS_HIS:') === 0) return 'Mã HIS đã có trong ứng dụng: ' + m.slice(8) + '. Mở hồ sơ BN cũ và bấm “Thêm đợt xạ mới”.';
    if (m.indexOf('QUOTA:') === 0) return m.slice(6);
    if (isNetErr(m)) return 'Mất kết nối khi lưu (đã tự gửi lại 3 lần). Giữ màn hình mở, kiểm tra mạng rồi thử lại';
    return m;
  }
  var pending = [], chain = Promise.resolve();
  function nowStr() { var d = new Date(), p2 = function (n) { return (n < 10 ? '0' : '') + n; }; return today() + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); }
  function applyLocal(data, action, payload) {
    var ctx = RT.localCtx(data, nowStr());
    ctx.hisLookup = function (ma) { return S.hisCache[ma] || []; };
    var msg = RT.handle(ctx, action, JSON.parse(JSON.stringify(payload || {})));
    var v = RT.view(ctx);
    v.dm = ctx.dm; v.holidays = ctx.holidays;
    return { data: v, msg: msg };
  }
  /** Cập nhật màn hình ngay bằng lõi nghiệp vụ chạy trên trình duyệt, rồi lưu lên máy chủ phía sau. */
  function act(action, payload) {
    if (S.viewAs && !(action in LOCAL)) { toast('Đang xem như ' + me().ho_ten + ': chỉ để xem, không thao tác được. Bấm “Thoát xem như” để làm việc.', true); return Promise.resolve({ ok: false }); }
    if (action in LOCAL) {
      setBusy(1);
      return call(action, payload).then(function (r) {
        setData(r.data);
        if (r.rev) S.rev = r.rev;
        if (r.roster) S.rosterExtra = r.roster;
        if (r.log) S.log = r.log;
        if (r.msg) toast(r.msg);
        render();
        return r;
      }).finally(function () { setBusy(-1); });
    }
    var local;
    try { local = applyLocal(S.data, action, payload); }
    catch (e) { return Promise.reject({ error: String(e && e.message || e) }); }
    var op = { action: action, payload: payload };
    pending.push(op);
    setData(local.data);
    toast(local.msg);
    render();
    setBusy(1);
    chain = chain.then(function () {
      return callRetry(action, payload).then(function (r) {
        pending.shift();
        if (r.rev) S.rev = r.rev;
        var d = r.data;
        pending.forEach(function (o) { try { d = applyLocal(d, o.action, o.payload).data; } catch (e) { /* bỏ qua, máy chủ sẽ báo */ } });
        setData(d); render();
      }, function (e) {
        pending.shift();
        toast('Chưa lưu được: ' + (errText(e) || 'mất kết nối') + '. Đã tải lại dữ liệu.', true);
        return call('bootstrap').then(function (r) { setData(r.data); render(); }, function () {});
      });
    }).finally(function () { setBusy(-1); });
    return Promise.resolve({ ok: true, msg: local.msg });
  }
  function run(action, payload, onError) {
    return act(action, payload).catch(function (e) {
      if (onError && onError(e)) return;
      toast(errText(e) || 'Có lỗi xảy ra.', true);
    });
  }

  // ---------- thông báo ----------
  var toastTimer;
  function toast(msg, err) {
    var t = $('#toast');
    t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, err ? 6000 : 3200);
  }

  // ---------- modal ----------
  function modal(opts) {
    var wrap = $('#modal');
    wrap.innerHTML = '<div class="modal-wrap"><div class="modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="mdl-t">' +
      '<div class="modal-head"><h2 id="mdl-t">' + esc(opts.title) + '</h2><div class="mh-act">' + (opts.noCancel ? '' : '<button type="submit" form="mdl-form" class="btn primary sm mh-save">Lưu</button>') + '<button type="button" class="x" data-close aria-label="Đóng">×</button></div></div>' +
      '<form class="modal-body" id="mdl-form" novalidate>' + opts.body + '</form>' +
      '<div class="modal-foot">' + (opts.noCancel ? '' : '<button type="button" class="btn" data-close>Huỷ</button>') +
      '<button type="submit" form="mdl-form" class="btn ' + (opts.btnClass || 'primary') + '" id="mdl-ok">' + esc(opts.ok || 'Lưu') + '</button></div></div></div>';
    wrap.hidden = false;
    document.documentElement.classList.add('modal-open');
    var form = $('#mdl-form');
    $$('[data-close]', wrap).forEach(function (b) { b.onclick = closeModal; });
    $('.modal-wrap', wrap).addEventListener('mousedown', function (e) { if (e.target.classList.contains('modal-wrap')) closeModal(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = formValues(form);
      var err = opts.validate && opts.validate(v, form);
      if (err) { toast(err, true); return; }
      closeModal();
      opts.onOk(v);
    });
    addQuickPicks(form);
    bindViTri(form);
    if (opts.onMount) opts.onMount(form);
    var first = $('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea', form);
    if (first && !opts.noFocus) first.focus();
  }
  /** Nút chọn nhanh dưới ô tổng liều và số buổi; vẫn tự gõ số khác được */
  function addQuickPicks(form) {
    [['tong_lieu', 'LIEU_HAY_DUNG', ' Gy'], ['so_buoi', 'SO_BUOI_HAY_DUNG', '']].forEach(function (x) {
      var el = form.querySelector('input[name=' + x[0] + ']'); if (!el) return;
      var list = S.data.dm[x[1]] || RT.DEFAULT_DM[x[1]] || []; if (!list.length) return;
      var box = document.createElement('div'); box.className = 'qp';
      box.innerHTML = list.map(function (v) { return '<button type="button" data-qp="' + esc(v) + '">' + esc(String(v).replace('.', ',')) + x[2] + '</button>'; }).join('');
      el.parentNode.insertBefore(box, el.nextSibling);
      $$('[data-qp]', box).forEach(function (b) { b.onclick = function () { el.value = b.dataset.qp; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }; });
    });
  }
  function closeModal() { var w = $('#modal'); w.hidden = true; w.innerHTML = ''; document.documentElement.classList.remove('modal-open'); }
  function formValues(form) {
    var v = {};
    $$('input,select,textarea', form).forEach(function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') {
        if (el.dataset.multi) { v[el.name] = v[el.name] || []; if (el.checked) v[el.name].push(el.value); }
        else v[el.name] = el.checked;
      } else if (el.type === 'radio') { if (el.checked) v[el.name] = el.value; }
      else v[el.name] = el.value.trim();
    });
    return v;
  }
  function opts(list, sel, blankLabel) {
    var h = blankLabel != null ? '<option value="">' + esc(blankLabel) + '</option>' : '';
    return h + list.map(function (x) {
      var val = typeof x === 'object' ? x.v : x, lb = typeof x === 'object' ? x.l : x;
      return '<option value="' + esc(val) + '"' + (String(val) === String(sel) ? ' selected' : '') + '>' + esc(lb) + '</option>';
    }).join('');
  }
  function field(label, inner, cls, help) {
    return '<div class="field ' + (cls || '') + '"><label>' + label + '</label>' + inner + (help ? '<span class="help">' + help + '</span>' : '') + '</div>';
  }
  /** Ô vị trí xạ: một hoặc nhiều vị trí (nút "+ thêm vị trí"), lưu chung trong vi_tri, cách nhau dấu phẩy */
  function viTriRow(v, i, id) {
    return '<div class="vt-row"><input type="text" class="vt-in" list="' + id + '" autocomplete="off" value="' + esc(v) + '" aria-label="Vị trí xạ ' + (i + 1) + '"' + (i ? ' placeholder="Vị trí thứ ' + (i + 1) + '"' : ' placeholder="Chọn hoặc gõ, VD: Cột sống L2–L4"') + '>' +
      (i ? '<button type="button" class="lnk vt-del" aria-label="Bỏ vị trí này" title="Bỏ vị trí này">✕</button>' : '') + '</div>';
  }
  function viTriField(val, id) {
    var l = RT.viTris({ vi_tri: val }); if (!l.length) l = [''];
    var dl = '<datalist id="' + id + '">' + (S.data.dm.VI_TRI || RT.DEFAULT_DM.VI_TRI).map(function (x) { return '<option value="' + esc(x) + '"></option>'; }).join('') + '</datalist>';
    return field('Vị trí xạ', '<div class="vt-box" data-vitri="' + id + '"><input type="hidden" name="vi_tri" value="' + esc(l.filter(Boolean).join(', ')) + '">' +
      l.map(function (v, i) { return viTriRow(v, i, id); }).join('') + '<button type="button" class="lnk vt-add">+ thêm vị trí</button>' + dl + '</div>', '', 'Bấm vào ô để chọn hoặc gõ. BN xạ 2 vị trí: bấm “+ thêm vị trí”.');
  }
  function bindViTri(form) {
    $$('[data-vitri]', form).forEach(function (box) {
      var hid = $('input[name=vi_tri]', box), id = box.dataset.vitri;
      var sync = function () { hid.value = $$('.vt-in', box).map(function (e) { return e.value.trim(); }).filter(Boolean).join(', '); };
      box.addEventListener('input', sync); box.addEventListener('change', sync);
      box.addEventListener('click', function (e) {
        if (e.target.closest('.vt-add')) {
          var w = document.createElement('div'); w.innerHTML = viTriRow('', $$('.vt-in', box).length, id);
          var row = w.firstChild; box.insertBefore(row, $('.vt-add', box)); $('input', row).focus();
        }
        var del = e.target.closest('.vt-del'); if (del) { del.closest('.vt-row').remove(); sync(); }
      });
    });
  }
  /** Lịch trong tuần: '0' = T2–T6 (không xạ T7); 1–5 = T2–T7 nghỉ một ngày; '' = chưa chọn (3D: T2–T6; IMRT/VMAT: tạm xạ cả T7) */
  function weekOpts(cur) {
    return opts([{ v: '', l: 'Chưa chọn (3D: T2–T6; VMAT/IMRT: tạm xạ cả T7)' }, { v: '0', l: 'Thứ 2 → Thứ 6 (không xạ Thứ 7)' }].concat([1, 2, 3, 4, 5].map(function (i) { return { v: String(i), l: 'Thứ 2 → Thứ 7, nghỉ ' + RT.DOW[i] }; })), cur == null ? '' : String(cur));
  }
  function lsGet(k) { try { return window.localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

  // ---------- khung ----------
  var TABS = {
    home: { label: function () { return 'Bệnh nhân của tôi'; }, render: renderMine },
    sim: { label: function () { return stepLb(1, 'Mô phỏng', stepCount('sim')); }, render: renderSim },
    contour: { label: function () { return stepLb(2, 'Contour', stepCount('contour')); }, render: renderContourTab },
    plan: { label: function () { return stepLb(3, 'Lập kế hoạch', stepCount('plan')); }, render: renderPlanning },
    qa: { label: function () { return stepLb(4, 'QA', stepCount('qa')); }, render: renderQa },
    tx: { label: function () { return stepLb(5, 'Xạ trị', stepCount('tx')); }, render: renderTx },
    all: { label: function () { return stepLb(0, 'Tất cả BN', pts().filter(function (p) { return ['HOAN_THANH', 'KHONG_XA', 'HUY'].indexOf(p.trang_thai) < 0; }).length); }, render: renderAll },
    roster: { label: function () { return 'Phân công'; }, render: renderRoster },
    stats: { label: function () { return 'Thống kê'; }, render: renderStats },
    log: { label: function () { return 'Nhật ký'; }, render: function () { return '<div class="page-head"><div><h1>Nhật ký thao tác</h1><p>Ai làm gì, lúc nào. Chỉ trưởng khoa/phòng và quản trị xem được.</p></div></div>' + logSection(); } },
    admin: { label: function () { return 'Quản trị'; }, render: renderAdmin }
  };
  // Mọi vai trò dùng chung một menu theo đường đi của bệnh nhân; quyền thao tác vẫn theo vai trò
  var FLOW_TABS = ['home', 'sim', 'contour', 'plan', 'qa', 'tx', 'all', 'roster'];
  var ROLE_TABS = { BS: FLOW_TABS, KS: FLOW_TABS, KTV: FLOW_TABS.filter(function (t) { return t !== 'home'; }), DD: FLOW_TABS, ADMIN: FLOW_TABS.concat(['admin']) };
  function stepLb(n, text, c) { return esc(text) + (c ? '<span class="step-c">' + c + '</span>' : ''); }
  function byState(st) { return items().filter(function (p) { return st.indexOf(p.trang_thai) >= 0; }); }
  function stepCount(k) {
    if (k === 'sim') return byState(['MO_PHONG']).length;
    if (k === 'contour') return byState(['CONTOUR']).length;
    if (k === 'plan') return byState(['CHO_KH', 'DANG_KH']).length;
    if (k === 'qa') return byState(['CHO_QA']).length;
    if (k === 'tx') return todayDue().length + (ktvLead() && role() !== 'ADMIN' ? pendingSched().length : 0);
    return 0;
  }
  /** BN cần xạ hôm nay mà chưa xạ */
  /** Xếp BN theo ABC: họ → tên đệm → tên (so cả họ tên từ trái sang, không phân biệt hoa thường) */
  /** Tất cả BN: ABC họ → tên đệm → tên, trùng cả họ tên thì người nhiều tuổi trước */
  function byNameAge(a, b) {
    var x = String(a.ho_ten || ''), y = String(b.ho_ten || '');
    return x.localeCompare(y, 'vi', { sensitivity: 'base' }) || x.localeCompare(y, 'vi') || ((RT.num(a.nam_sinh) || 9999) - (RT.num(b.nam_sinh) || 9999)) || String(a.ma_his || '').localeCompare(String(b.ma_his || ''));
  }
  function byName(a, b) { return String(a.ho_ten || '').localeCompare(String(b.ho_ten || ''), 'vi', { sensitivity: 'base' }) || String(a.ho_ten || '').localeCompare(String(b.ho_ten || ''), 'vi') || String(a.ma_his || '').localeCompare(String(b.ma_his || '')); }
  function todayDue() {
    var t = today(), machines = S.data.dm.MAY || [];
    return pts().filter(function (p) {
      if (S.fMay && (p.may || machines[0]) !== S.fMay) return false;
      if (!(p.trang_thai === 'DANG_XA' || (p.trang_thai === 'CHO_XA' && p.ngay_du_kien && p.ngay_du_kien <= t))) return false;
      var c = course(p); return c.treatToday && !c.doneToday && c.absent[t] === undefined;
    });
  }

  function renderShell() {
    var d = S.data, tabs = (ROLE_TABS[role()] || ['all']).slice();
    if (RT.statsScope(me())) tabs.splice(tabs.indexOf('admin') >= 0 ? tabs.indexOf('admin') : tabs.length, 0, 'stats');
    if (isLead() && role() !== 'ADMIN') tabs.push('log');
    if (S.role !== me().email) { S.role = me().email; S.scope = isDoctor(me()) ? 'mine' : 'all'; S.stRes = null; S.found = null; S.log = null; S.fKhoa = null; S.fBs = ''; S.stPv = ''; S.itemsCache = null; }
    if (tabs.indexOf(S.tab) < 0) S.tab = role() === 'KTV' ? 'tx' : tabs[0];  // KTV gắn với máy và ca: mở thẳng Xạ hôm nay
    var who;
    if (window.DEMO) {
      who = '<label class="who"><span class="nm muted">Đăng nhập thử với:</span><select id="demo-user" aria-label="Chọn người dùng demo">' +
        opts(d.users.filter(function (u) { return u.kich_hoat !== 'Không'; }).map(function (u) { return { v: u.email, l: u.ho_ten + ' — ' + RT.ROLES[u.vai_tro] }; }), d.me.email) + '</select></label>';
    } else {
      who = '';
    }
    var t = today(), dowFull = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][RT.dow(t)];
    $('#top').innerHTML =
      '<div class="util"><div class="util-in"><span><b>' + esc(unitName()) + '</b></span><span>' + dowFull + ', ' + fdy(t) + ' · <span title="Phiên bản ứng dụng">v' + esc(RT.VERSION) + '</span></span></div></div>' +
      '<div class="me-bar"><div class="util-in"><span>Đang dùng tài khoản: <b>' + esc(d.me.ho_ten) + '</b> <span class="role role-' + d.me.vai_tro + '">' + esc(RT.ROLES[d.me.vai_tro]) + (d.me.chuc_vu ? ' · ' + esc(d.me.chuc_vu) : '') + '</span> <span class="me-mail">' + esc(d.me.email) + '</span></span>' +
      (window.DEMO ? '' : '<a class="me-switch" href="https://accounts.google.com/Logout" target="_blank" rel="noopener">Không phải bạn? Đăng xuất Google</a>') + '</div></div>' +
      (d.me.vai_tro === 'ADMIN' ? '<div class="viewas-bar' + (S.viewAs ? ' on' : '') + '"><div class="util-in"><label>Xem như: <select id="view-as" aria-label="Xem giao diện như người dùng khác">' +
        '<option value="">— Chính tôi (Quản trị) —</option>' + ['BS', 'KS', 'KTV', 'DD'].map(function (r0) {
          return '<optgroup label="' + esc(RT.ROLES[r0]) + '">' + d.users.filter(function (u) { return u.vai_tro === r0 && u.kich_hoat !== 'Không'; }).map(function (u) {
            return '<option value="' + esc(u.email) + '"' + (S.viewAs === u.email ? ' selected' : '') + '>' + esc(u.ho_ten) + (u.chuc_vu ? ' · ' + esc(u.chuc_vu) : '') + (u.khoa ? ' · ' + esc(u.khoa) : '') + '</option>';
          }).join('') + '</optgroup>';
        }).join('') + '</select></label>' +
        (S.viewAs ? '<span><b>Đang xem đúng màn hình của ' + esc(me().ho_ten) + '</b> (chỉ xem, không thao tác) <button class="btn sm" id="view-as-off">Thoát xem như</button></span>' : '<span class="muted">Chọn một người để xem màn hình của họ</span>') + '</div></div>' : '') +
      noticeBar() +
      '<div class="top-in"><div class="brand"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8"/></svg></span><span>Điều phối Xạ trị<small>Bác sĩ · Kỹ sư · KTV · Điều dưỡng</small></span></div>' +
      '<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input id="q" type="search" placeholder="Tìm theo mã HIS hoặc tên bệnh nhân" value="' + esc(S.q) + '" aria-label="Tìm bệnh nhân" autocomplete="off"></div>' + (can('createPatient') ? '<button class="btn primary" id="add-bn">+ Thêm bệnh nhân</button>' : '') + bell() + who + '</div>' +
      '<nav class="tabs"><div class="tabs-in" role="tablist">' + tabs.map(function (t) {
        return '<button class="tab' + (TABS[t].render === renderMine || FLOW_TABS.indexOf(t) < 0 || t === 'all' || t === 'roster' ? '' : ' step') + '" role="tab" data-tab="' + t + '" aria-selected="' + (S.tab === t) + '">' + TABS[t].label() + '</button>';
      }).join('') + '</div></nav>' +
      (can('createPatient') ? '<button class="fab" id="add-bn-fab" aria-label="Thêm bệnh nhân"><span aria-hidden="true">+</span> Thêm BN</button>' : '');
    $$('.tab').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; render(); window.scrollTo(0, 0); }; });
    var act = $('.tab[aria-selected=true]'); if (act && act.scrollIntoView) { var bar = act.parentNode; bar.scrollLeft = Math.max(0, act.offsetLeft - (bar.clientWidth - act.offsetWidth) / 2); }
    var q = $('#q');
    q.oninput = function () {
      S.q = q.value;
      if (FIND_TABS.indexOf(S.tab) >= 0) { renderMain(); return; }
      if (S.tab !== 'all') { S.tab = 'all'; render(); var q2 = $('#q'); q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); }
      else renderMain();
    };
    if ($('#add-bn')) $('#add-bn').onclick = function () { patientForm(null); };
    if ($('#add-bn-fab')) $('#add-bn-fab').onclick = function () { patientForm(null); };
    $$('[data-clearnotice]').forEach(function (b) { b.onclick = function () { run('clearNotice', { id: b.dataset.clearnotice }); }; });
    bindBell();
    if ($('#demo-user')) $('#demo-user').onchange = function (e) { S.tab = null; S.viewAs = ''; run('demoSwitch', { email: e.target.value }); };
    if ($('#view-as')) $('#view-as').onchange = function (e) { S.viewAs = e.target.value; S.tab = null; S.cc = {}; render(); window.scrollTo(0, 0); };
    if ($('#view-as-off')) $('#view-as-off').onclick = function () { S.viewAs = ''; S.tab = null; render(); };
  }

  function render() {
    if (!S.data) return;
    renderShell();
    renderMain();
    if (S.detail) renderDetail();
  }
  /** Tab có tìm kiếm tại chỗ (khung "Kết quả tìm" ở đầu tab); tab khác vẫn chuyển sang Tất cả BN */
  var FIND_TABS = ['home', 'sim', 'contour', 'plan', 'qa', 'tx'];
  function renderMain() { S.cc = S.cc || {}; $('#main').innerHTML = '<div class="main-in">' + (FIND_TABS.indexOf(S.tab) >= 0 ? findPanel(S.tab) : '') + TABS[S.tab].render() + '</div>'; bindMain(); }

  function bindMain() {
    $$('#main [data-open]').forEach(function (el) {
      el.onclick = function (e) { if (e.target.closest('button,a,select,input')) return; openDetail(el.dataset.open); };
      el.onkeydown = function (e) { if (e.key === 'Enter' && e.target === el) openDetail(el.dataset.open); };
    });
    $$('#main [data-do]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); doAction(b.dataset.do, b.dataset.id); }; });
    $$('#main [data-scroll]').forEach(function (b) { b.onclick = function () { var g = document.getElementById(b.dataset.scroll); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
    $$('#main [data-scope]').forEach(function (b) { b.onclick = function () { S.scope = b.dataset.scope; renderMain(); }; });
    $$('#main [data-clearq]').forEach(function (b) { b.onclick = function () { S.q = ''; var q = $('#q'); if (q) q.value = ''; renderMain(); }; });
    $$('#main [data-htab]').forEach(function (b) { b.onclick = function () { S.homeTab = b.dataset.htab; lsSet('rt.homeTab', S.homeTab); renderMain(); window.scrollTo(0, 0); }; });
    $$('#main [data-filter]').forEach(function (el) { el.onchange = function () { S[el.dataset.filter] = el.value; renderMain(); }; });
    if (S.tab === 'admin') bindAdmin();
    if (S.tab === 'tx' && S.txSub === 'week') bindWeek();
    $$('#main [data-txsub]').forEach(function (b) { b.onclick = function () { S.tab = 'tx'; S.txSub = b.dataset.txsub; render(); window.scrollTo(0, 0); }; });
    $$('#main [data-tdsub]').forEach(function (b) { b.onclick = function () { S.todaySub = b.dataset.tdsub; renderMain(); }; });
    $$('#main [data-plimport]').forEach(function (b) { b.onclick = importForm; });
    $$('#main [data-nlist]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); nurseList(b.dataset.nlist); }; });
    $$('#main [data-openp]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); openDetail(b.dataset.openp); }; });
    $$('#main [data-gotab]').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.gotab; render(); window.scrollTo(0, 0); }; });
    if (S.tab === 'all') bindAll();
    if (S.tab === 'roster') bindRoster();
    if (S.tab === 'stats') bindStats();
    $$('#main [data-admin=loadLog]').forEach(function (b) { if (S.tab !== 'admin') b.onclick = function () { run('getLog'); }; });
    $$('#main [data-notice]').forEach(function (b) { b.onclick = noticeForm; });
  }

  // ---------- bảng ----------
  function table(rows, cols, emptyText) {
    if (!rows.length) return '<div class="card"><div class="empty">' + esc(emptyText || 'Không có bệnh nhân.') + '</div></div>';
    var lb = cols.map(function (c) { return esc(String(c.h || '').replace(/<[^>]*>/g, '')); });
    return '<div class="card"><div class="tbl-wrap cards"><table><thead><tr>' + cols.map(function (c) { return '<th>' + c.h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (p, i) {
        return '<tr class="click' + prRowCls(p) + '" tabindex="0" data-open="' + esc(p._pid || p.id) + '">' + cols.map(function (c, k) {
          return '<td class="' + (c.cls || '') + '" data-l="' + lb[k] + '">' + c.v(p, i) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
  }
  function group(id, title, rows, cols, hint, emptyText) {
    return '<section class="group" id="g-' + id + '"><div class="group-head"><h2>' + esc(title) + '</h2><span class="count">' + rows.length + '</span>' +
      (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>' + table(rows, cols, emptyText) + '</section>';
  }
  function kpi(id, n, label, color, extra) {
    return '<button class="kpi' + (n ? '' : ' zero') + '" style="--k:' + color + '" data-scroll="g-' + id + '"><span class="n">' + n + '</span><span class="l">' + esc(label) + '</span>' + (extra || '') + '</button>';
  }
  function btn(action, id, label, cls) { return '<button class="btn ' + (cls || '') + '" data-do="' + action + '" data-id="' + esc(id) + '">' + label + '</button>'; }

  var C = {
    pt: { h: 'Bệnh nhân', v: ptCell },
    pt2: { h: 'Bệnh nhân', v: function (p) { return ptCell(p) + ph2Sub(p); } },
    dx: { h: 'Chẩn đoán', v: function (p) { return icdTags(p) + esc(p.chan_doan) + (p.vi_tri ? '<span class="sub">Vị trí: ' + esc(p.vi_tri) + '</span>' : ''); } },
    rx: { h: 'Kỹ thuật · liều', v: rx, cls: 'nowrap' },
    bs: { h: 'BS điều trị', v: function (p) { return esc(nameOf(p.bs_email)); }, cls: 'nowrap' },
    pr: { h: 'Ưu tiên', v: prCell },
    st: { h: 'Trạng thái', v: stPill },
    img: { h: 'IGRT / SGRT', v: igrtBadges, cls: 'nowrap' },
    prog: { h: 'Tiến độ', v: progCell },
    end: { h: 'Dự kiến kết thúc', v: function (p) { var c = course(p); return c.end ? '<span class="num">' + fdw(c.end) + '</span>' : '<span class="muted">—</span>'; }, cls: 'nowrap' },
    expected: {
      h: 'Ngày xạ dự kiến', cls: 'nowrap', v: function (p) {
        if (!p.ngay_du_kien) return '<span class="flag">Chưa xếp lịch</span>';
        var n = RT.diffDays(today(), p.ngay_du_kien);
        return '<span class="num">' + fdw(p.ngay_du_kien) + '</span><span class="sub">' + (n === 0 ? 'Hôm nay' : n > 0 ? 'còn ' + n + ' ngày' : 'quá ' + (-n) + ' ngày') + '</span>';
      }
    },
    week: { h: 'Lịch tuần', v: function (p) { return RT.needsOffDay(p) ? '<span class="flag">Chưa rõ ngày nghỉ (tạm xạ T7)</span>' : esc(RT.scheduleLabel(p)); }, cls: 'nowrap' },
    dose: { h: 'Liều đã nhận', v: function (p) { var c = course(p); return '<span class="num">' + c.doseDone + ' / ' + esc(p.tong_lieu) + ' Gy</span>'; }, cls: 'nowrap' },
    missed: { h: 'Vắng', v: function (p) { var n = course(p).missed.length; return n ? '<span class="flag crit">' + n + ' buổi</span>' : '<span class="muted">0</span>'; } }
  };

  // ---------- Trang chủ BS / ĐD ----------
  var HOME_GROUPS = [
    { id: 'sim', label: 'Chờ mô phỏng', st: ['MO_PHONG'], color: 'var(--warn)', items: true },
    { id: 'contour', label: 'Đang contour', st: ['CONTOUR'], color: 'var(--bs)', items: true },
    { id: 'ks', label: 'Kỹ sư đang lập KH', st: ['CHO_KH', 'DANG_KH'], color: 'var(--ks)', items: true },
    { id: 'qa', label: 'Chờ QA', st: ['CHO_QA'], color: 'var(--warn)', items: true },
    { id: 'wait', label: 'Chờ vào xạ', st: ['CHO_XA'], color: 'var(--accent)' },
    { id: 'tx', label: 'Đang xạ', st: ['DANG_XA'], color: 'var(--ktv)' },
    { id: 'pause', label: 'Tạm ngừng', st: ['TAM_NGUNG'], color: 'var(--crit)' }
  ];

  function renderHome(sub) {
    var isBs = role() === 'BS' || role() === 'ADMIN';
    var scope = isBs ? S.scope : 'all';
    var docs = RT.myDoctors(me());
    // Xem cả khoa: lọc theo khoa (mặc định khoa của người dùng, ĐD thường xem khoa mình)
    if (scope === 'all' && S.fKhoa == null) S.fKhoa = me().khoa && S.data.dm.KHOA.indexOf(me().khoa) >= 0 ? me().khoa : '';
    var inK = function (p) { return scope !== 'all' || !S.fKhoa || p.khoa === S.fKhoa; };
    var list = pts().filter(function (p) { return (scope === 'all' || docs.indexOf(p.bs_email) >= 0) && inK(p); });
    var ilist = items().filter(function (p) { return (scope === 'all' || docs.indexOf(p.bs_email) >= 0) && inK(p); });
    var by = function (st, useItems) { return (useItems ? ilist : list).filter(function (p) { return st.indexOf(p.trang_thai) >= 0; }); };
    var queue = RT.planningQueue(items(), boostLeft);
    var qpos = function (p) { for (var i = 0; i < queue.length; i++) if (queue[i].id === p.id) return i + 1; return 0; };
    var g = {}; HOME_GROUPS.forEach(function (x) { g[x.id] = by(x.st, x.items); });
    g.ks.sort(function (a, b) { return (a.trang_thai === 'DANG_KH' ? 1 : 0) - (b.trang_thai === 'DANG_KH' ? 1 : 0) || (a.trang_thai === 'DANG_KH' ? RT.planOrder(a, b) : qpos(a) - qpos(b)); });
    g.wait.sort(function (a, b) { return (a.ngay_du_kien || '9') < (b.ngay_du_kien || '9') ? -1 : 1; });
    g.tx.sort(function (a, b) { return (course(b).missed.length - course(a).missed.length) || (course(a).end < course(b).end ? -1 : 1); });
    var doneSoon = list.filter(function (p) { return p.trang_thai === 'DANG_XA' && course(p).end && RT.diffDays(today(), course(p).end) <= 6; }).length;

    var khoaSel = scope === 'all' && !sub && khoaFilterOn() ? '<select data-filter="fKhoa" aria-label="Lọc theo khoa">' + opts(S.data.dm.KHOA, S.fKhoa, 'Cả hai khoa') + '</select>' : '';
    var html = sub ? '<div class="page-head sub"><div><h2 class="h1-sub">Bệnh nhân theo từng bước</h2></div></div>' : '<div class="page-head"><div><h1>' + (scope === 'all' ? (role() === 'DD' ? 'Tổng quan ' + esc(S.fKhoa ? 'khoa ' + S.fKhoa : 'hai khoa') : 'Toàn bộ bệnh nhân' + (S.fKhoa ? ' · ' + esc(S.fKhoa) : '')) : 'Bệnh nhân của ' + esc(me().ho_ten) + (me().tro_ly_cho ? ' và ' + esc(nameOf(me().tro_ly_cho)) + ' <span class="tag">Trợ lý</span>' : '')) + '</h1>' +
      '<p>' + fdw(today()) + '/' + today().slice(0, 4) + ' · ' + list.filter(function (p) { return p.trang_thai !== 'HOAN_THANH'; }).length + ' bệnh nhân đang trong quy trình</p></div>' +
      '<div class="filters">' + khoaSel + (isBs ? '<div class="seg" role="group" aria-label="Phạm vi"><button data-scope="mine" aria-pressed="' + (scope === 'mine') + '">Của tôi</button><button data-scope="all" aria-pressed="' + (scope === 'all') + '">Cả khoa</button></div>' : '') + '</div></div>';
    var kx = function (id) {
      if (id === 'tx' && doneSoon) return '<span class="kx muted">' + doneSoon + ' kết thúc trong 7 ngày</span>';
      if (id === 'wait') { var nd = g.wait.filter(function (p) { return !p.ngay_du_kien; }).length; if (nd) return '<span class="kx" style="color:var(--warn)">' + nd + ' chưa xếp lịch</span>'; }
      if (id === 'ks') { var cc = g.ks.filter(function (p) { return p.uu_tien === 'Cấp cứu'; }).length; if (cc) return '<span class="kx" style="color:var(--crit)">' + cc + ' cấp cứu</span>'; }
      return '';
    };
    var tabsOn = !sub && isDoctor(me()) && scope === 'mine', sec = {};
    if (!tabsOn) html += '<div class="kpis">' + HOME_GROUPS.map(function (x) { return kpi(x.id, g[x.id].length, x.label, x.color, kx(x.id)); }).join('') + '</div>';

    if (scope === 'all') {
      var days = [], dd = today();
      for (var k = 0; days.length < 10 && k < 20; k++, dd = RT.addDays(dd, 1)) if (RT.dow(dd) !== 0) days.push(dd);
      var startOn = function (day) { return g.wait.filter(function (p) { return p.ngay_du_kien === day; }).length; };
      var endOn = function (day) { return g.tx.filter(function (p) { return course(p).end === day; }).length; };
      html += '<section class="group"><div class="group-head"><h2>Vào xạ và kết thúc xạ 10 ngày tới</h2><span class="hint">Số BN dự kiến bắt đầu (buổi đầu) và kết thúc xạ mỗi ngày' + (g.wait.filter(function (p) { return !p.ngay_du_kien; }).length ? '; ' + g.wait.filter(function (p) { return !p.ngay_du_kien; }).length + ' BN chờ vào xạ chưa xếp lịch' : '') + '</span></div>' +
        '<div class="load load10">' + days.map(function (day) { var a1 = startOn(day), a2 = endOn(day);
          return '<div class="' + (day === today() ? 'today' : '') + '"><span class="d">' + fdw(day) + '</span><span class="v" title="Bắt đầu xạ">▶ ' + a1 + '</span><span class="d" title="Kết thúc xạ">■ kết thúc ' + a2 + '</span></div>'; }).join('') + '</div></section>';
    }
    if (isDoctor(me()) && scope === 'mine') {
      var opn = list.filter(function (p) { return ['DANG_XA', 'TAM_NGUNG'].indexOf(p.trang_thai) >= 0 && course(p).open; }).sort(byName);
      if (opn.length) sec.open = group('open', 'BN đang xạ chưa có tổng liều / số buổi', opn, [C.pt, C.dx,
        { h: 'Đã xạ', cls: 'nowrap', v: function (p) { var c = course(p); return '<b class="num">' + c.done + ' buổi</b><span class="sub">từ ' + fd(c.start) + ' · ' + esc(c.cur.ky_thuat || p.ky_thuat || '') + '</span>'; } },
        { h: '', cls: 'act', v: function (p) { var c = course(p), g = c.cur && c.cur.g; return g ? btn('openP', p.id, 'Mở hồ sơ: bổ sung GĐ' + g.stt, 'primary') : (can('updatePatient') ? btn('edit', p.id, 'Bổ sung liều, số buổi', 'primary') : ''); } }],
        'BN nhập từ HIS: KTV vẫn ghi buổi xạ được. Bổ sung tổng liều, tổng số buổi (và ICD) để ứng dụng tính ngày kết thúc.', '');
      var plm = list.filter(function (p) { return p.trang_thai === 'CHO_PL'; }).sort(byName);
      if (plm.length) sec.plm = group('plm', 'BN cần phân loại về đúng giai đoạn', plm, [C.pt, C.dx,
        { h: 'Mô phỏng', cls: 'nowrap', v: function (p) { return p.ngay_mo_phong ? '<span class="num">' + fdy(p.ngay_mo_phong) + '</span>' : '<span class="muted">—</span>'; } },
        { h: '', cls: 'act', v: function (p) { return canClassify(p) ? btn('classify', p.id, 'Phân loại', 'primary') : ''; } }],
        'BN nhập từ sổ HIS / hồ sơ giấy. Bấm “Phân loại” để chuyển BN về đúng bước hiện tại.', '');
      var rvl = reviewList();
      if (rvl.length) sec.review = group('review', 'BN cần đánh giá lại kế hoạch', rvl, [C.pt, C.rx,
        { h: 'Tiến độ', cls: 'nowrap', v: function (p) { var c = course(p); return '<span class="num">Đã xạ ' + c.done + '</span><span class="sub">Chuyển tới buổi ' + c.review + ' / KH ' + c.total + '</span>'; } },
        { h: '', cls: 'act', v: function (p) { return (course(p).reviewWait ? '' : '<span class="muted">còn ' + (course(p).review - course(p).done) + ' buổi</span> ') + (can('setReview') ? btn('reviewGo', p.id, 'Xạ tiếp KH cũ', 'primary') : '') + (can('replan') ? btn('replan', p.id, 'Lập lại KH') : '') + (can('endEarly') ? btn('endEarly', p.id, 'Kết thúc', 'danger') : ''); } }],
        'KS chỉ chuyển một phần KH. Hết số buổi được chuyển, KTV chờ BS chọn: xạ tiếp KH cũ, lập lại KH (contour / mô phỏng lại) hoặc kết thúc.', '');
      var al = absentLong();
      if (al.length) sec.absent = group('absent', 'BN vắng từ 2 buổi liên tiếp', al, [C.pt, C.rx,
        { h: 'Vắng liên tiếp', cls: 'nowrap', v: function (p) { return '<b style="color:var(--crit)">' + course(p).streak + ' buổi</b>'; } },
        { h: 'Lý do gần nhất', v: function (p) { var ab = course(p).absent, ks = Object.keys(ab).sort(); var w = ks.length ? ab[ks[ks.length - 1]] : ''; return w ? esc(w) : '<span class="flag crit">Chưa rõ lý do</span>'; } },
        { h: '', cls: 'act', v: function (p) { return (course(p).streak >= 3 && p.trang_thai === 'DANG_XA' && can('pause') ? '<span class="flag crit">Từ 3 buổi: cân nhắc tạm ngừng</span>' + btn('pause', p.id, 'Chuyển tạm ngừng', 'danger') : '') + (can('markAbsent') ? btn('openP', p.id, 'Xem lịch, ghi lý do') : ''); } }],
        'Liên hệ BN / điều dưỡng để nắm lý do. Vắng từ 3 buổi liên tiếp: cân nhắc chuyển Tạm ngừng.', '');
      var ask = pauseAskList();
      if (ask.length) sec.pask = group('pask', 'BN tạm ngừng từ 7 ngày: còn xạ tiếp không?', ask, [C.pt, C.rx,
        { h: 'Tạm ngừng', cls: 'nowrap', v: function (p) { return '<span class="num">từ ' + fdw(p.tam_ngung_tu) + '</span><span class="sub" style="color:var(--crit)">' + daysSince(p.tam_ngung_tu) + ' ngày</span>'; } },
        { h: 'Lý do', v: function (p) { return esc(p.ly_do_tam_ngung || '') + (p.xn_tam_ngung ? '<span class="sub">Lần xác nhận trước: ' + fdw(p.xn_tam_ngung) + '</span>' : ''); } },
        { h: '', cls: 'act', v: function (p) { return (can('confirmPause') ? btn('confirmPause', p.id, 'Vẫn xạ tiếp', 'primary') : '') + (can('endEarly') ? btn('endEarly', p.id, 'Kết thúc đợt', 'danger') : ''); } }],
        'Ứng dụng hỏi lại mỗi 7 ngày nếu BN vẫn tạm ngừng. BN tạm ngừng vẫn giữ chỗ của khoa.', '');
    }
    var contourActs = { h: '', cls: 'act', v: function (p) {
      if (p.trang_thai === 'MO_PHONG') return (p.ngay_mo_phong ? '<span class="muted">hẹn ' + fdw(p.ngay_mo_phong) + '</span> ' : '<span class="pill st-MO_PHONG">' + (p._g ? 'Chờ mô phỏng lại' : 'Chờ mô phỏng') + '</span> ') +
        (can('simDone') ? btn('simDone', p.id, 'Đã mô phỏng xong') : '');
      return (boostFlag(p) ? boostFlag(p) + ' ' : '') + (can('contourDone') && (RT.myDoctors(me()).indexOf(p.bs_email) >= 0 || role() === 'ADMIN') ? btn('contourDone', p.id, 'Contour xong', 'primary') : '');
    } };
    sec.sim = group('sim', 'Chờ mô phỏng', g.sim, [C.pt, C.dx, C.rx, C.pr,
      { h: 'Nhập lúc', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_tao) + '</span><span class="sub">' + daysSince(p.ngay_tao) + ' ngày' + (p.nguoi_nhap && p.nguoi_nhap !== p.bs_email ? ' · ' + esc(nameOf(p.nguoi_nhap)) : '') + '</span>'; } },
      scope === 'all' ? C.bs : null, contourActs].filter(Boolean), null, 'Không có bệnh nhân chờ mô phỏng.');
    sec.contour = group('contour', 'Đang contour', g.contour, [C.pt, C.dx, C.rx, C.pr,
      { h: 'Từ ngày', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_tao) + '</span><span class="sub">' + daysSince(p.ngay_tao) + ' ngày</span>'; } },
      scope === 'all' ? C.bs : null, contourActs].filter(Boolean), null, 'Không có bệnh nhân đang chờ contour.');
    sec.ks = group('ks', 'Kỹ sư đang lập kế hoạch', g.ks, [C.pt, C.dx, C.rx, C.pr,
      { h: 'Tình trạng', v: function (p) { return p.trang_thai === 'DANG_KH' ? stPill(p) + '<span class="sub">' + esc(nameOf(p.ks_email)) + ' · từ ' + fd(p.ngay_nhan_kh) + '</span>' : stPill(p) + '<span class="sub">Thứ tự hàng đợi: #' + qpos(p) + '</span>'; } },
      { h: 'Contour xong', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_contour_xong) + '</span><span class="sub">' + daysSince(p.ngay_contour_xong) + ' ngày trước</span>'; } },
      scope === 'all' ? C.bs : null].filter(Boolean), null, 'Không có bệnh nhân ở bước lập kế hoạch.');
    sec.qa = group('qa', 'Chờ QA', g.qa, [C.pt, C.dx, C.rx,
      { h: 'Kế hoạch xong', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_kh_xong) + '</span><span class="sub">' + esc(nameOf(p.ks_email)) + '</span>'; } },
      scope === 'all' ? C.bs : null].filter(Boolean), null, 'Không có kế hoạch chờ QA.');
    sec.wait = group('wait', 'Chờ vào xạ', g.wait, [C.pt, C.dx, C.rx, C.expected, C.week,
      { h: 'QA', v: function (p) { return p.qa_ket_qua === 'Đạt' ? '<span class="flag ok">Đạt</span>' : '<span class="muted">' + esc(p.qa_ket_qua || '—') + '</span>'; } },
      C.end, scope === 'all' ? C.bs : null].filter(Boolean), null, 'Không có bệnh nhân chờ vào xạ.');
    sec.tx = group('tx', 'Đang xạ', g.tx, [C.pt2, C.rx, C.prog, C.dose, C.img, C.missed, C.end, scope === 'all' ? C.bs : null].filter(Boolean), null, 'Không có bệnh nhân đang xạ.');
    sec.pause = group('pause', 'Tạm ngừng xạ', g.pause, [C.pt2, C.rx, C.prog,
      { h: 'Tạm ngừng từ', cls: 'nowrap', v: function (p) { var n = daysSince(p.tam_ngung_tu); return '<span class="num">' + fdw(p.tam_ngung_tu) + '</span><span class="sub" style="color:var(--crit)">' + n + ' ngày</span>'; } },
      { h: 'Lý do', v: function (p) { return esc(p.ly_do_tam_ngung); } }, scope === 'all' ? C.bs : null].filter(Boolean), null, 'Không có bệnh nhân tạm ngừng xạ.');
    var ORDER = ['open', 'plm', 'review', 'absent', 'pask', 'sim', 'contour', 'ks', 'qa', 'wait', 'tx', 'pause'];
    if (!tabsOn) return html + ORDER.map(function (k) { return sec[k] || ''; }).join('');
    return html + homeTabs(list, g, sec, kx, { opn: opn, plm: plm, rvl: rvl, al: al, ask: ask });
  }
  /** BS: thanh chọn mục ở "Bệnh nhân của tôi", bấm ô nào chỉ hiện danh sách của ô đó */
  var HOME_STAGE = { CHO_PL: 0, MO_PHONG: 1, CONTOUR: 2, CHO_KH: 3, DANG_KH: 3, CHO_QA: 4, CHO_XA: 5, DANG_XA: 6, TAM_NGUNG: 7, HOAN_THANH: 8, KHONG_XA: 8 };
  function homeTabs(list, g, sec, kx, a) {
    var t = today();
    var done = list.filter(function (p) { return (p.trang_thai === 'HOAN_THANH' || p.trang_thai === 'KHONG_XA') && (!p.ngay_ket_thuc || RT.diffDays(p.ngay_ket_thuc, t) <= 60); })
      .sort(function (x, y) { return String(y.ngay_ket_thuc || '') < String(x.ngay_ket_thuc || '') ? -1 : String(y.ngay_ket_thuc || '') > String(x.ngay_ket_thuc || '') ? 1 : byNameAge(x, y); });
    var attn = {}; [a.opn, a.rvl, a.al, a.ask].forEach(function (l) { l.forEach(function (p) { attn[p.id] = 1; }); });
    var all = list.filter(function (p) { var k = HOME_STAGE[p.trang_thai]; return k != null && (k < 8 || done.indexOf(p) >= 0); })
      .sort(function (x, y) { return HOME_STAGE[x.trang_thai] - HOME_STAGE[y.trang_thai] || byNameAge(x, y); });
    var T = [['all', 'Tất cả BN', all.length, 'var(--accent)'], ['plm', 'Cần phân loại', a.plm.length, 'var(--warn)'], ['sim', 'Chờ mô phỏng', g.sim.length, 'var(--warn)'],
      ['contour', 'Đang contour', g.contour.length, 'var(--bs)'], ['ks', 'Lập KH', g.ks.length, 'var(--ks)'], ['qa', 'Chờ QA', g.qa.length, 'var(--warn)'],
      ['wait', 'Chờ vào xạ', g.wait.length, 'var(--accent)'], ['tx', 'Đang xạ', g.tx.length, 'var(--ktv)'], ['pause', 'Tạm ngừng', g.pause.length, 'var(--crit)'],
      ['done', 'Đã xạ xong', done.length, 'var(--muted)'], ['attn', 'Cần chú ý', Object.keys(attn).length, 'var(--crit)']];
    var cur = S.homeTab || lsGet('rt.homeTab') || 'all';
    if (!T.some(function (x) { return x[0] === cur; })) cur = 'all';
    S.homeTab = cur;
    var html = '<div class="kpis htabs" role="tablist" aria-label="Chọn nhóm bệnh nhân">' + T.map(function (x) {
      var on = x[0] === cur;
      var ex = kx(x[0]), exT = ex.replace(/<[^>]+>/g, '').trim(), exC = (ex.match(/color:([^;"]+)/) || [])[1] || 'var(--muted)';
      return '<button class="kpi htab' + (x[2] ? '' : ' zero') + (on ? ' on' : '') + '" role="tab" aria-selected="' + on + '" style="--k:' + x[3] + '" data-htab="' + x[0] + '"' + (exT ? ' title="' + esc(x[1] + ': ' + exT) + '"' : '') + '>' +
        '<span class="n">' + x[2] + (exT ? '<i class="kdot" style="--d:' + exC + '" aria-label="' + esc(exT) + '"></i>' : '') + '</span><span class="l">' + esc(x[1]) + '</span></button>';
    }).join('') + '</div>';
    var empty = function (id, title, txt) { return group(id, title, [], [C.pt], null, txt); };
    if (cur === 'all') return html + group('all', 'Tất cả BN của tôi', all, [C.pt2, C.dx, C.rx,
      { h: 'Giai đoạn', v: function (p) { return stPill(p) + (p.trang_thai === 'HOAN_THANH' || p.trang_thai === 'KHONG_XA' ? (p.ngay_ket_thuc ? '<span class="sub">' + fdy(p.ngay_ket_thuc) + '</span>' : '') : ''); } },
      { h: 'Tiến độ', v: function (p) { return ['DANG_XA', 'TAM_NGUNG'].indexOf(p.trang_thai) >= 0 ? progCell(p) : '<span class="muted">—</span>'; } }],
      'Theo giai đoạn (thứ tự các ô trên), cùng giai đoạn xếp ABC họ → tên đệm → tên. Đã xạ xong: 60 ngày gần nhất.', 'Chưa có bệnh nhân.');
    if (cur === 'plm') return html + (sec.plm || empty('plm', 'BN cần phân loại', 'Không có BN cần phân loại.'));
    if (cur === 'done') return html + group('done', 'Đã xạ xong (60 ngày gần nhất) và Không xạ', done, [C.pt, C.dx, C.rx,
      { h: 'Kết thúc', cls: 'nowrap', v: function (p) { return p.ngay_ket_thuc ? '<span class="num">' + fdy(p.ngay_ket_thuc) + '</span>' : '<span class="muted">—</span>'; } }, C.st], null, 'Không có BN xạ xong trong 60 ngày qua.');
    if (cur === 'attn') return html + ((sec.open || '') + (sec.review || '') + (sec.absent || '') + (sec.pask || '') || empty('attn', 'Cần chú ý', 'Không có BN cần chú ý: không ai vắng từ 2 buổi, thiếu tổng liều, chờ đánh giá lại KH hay tạm ngừng từ 7 ngày.'));
    return html + sec[cur];
  }
  /** Giai đoạn 2 (boost, KH lại, KH đồng thời) đang chuẩn bị trong khi BN vẫn xạ */
  function ph2Sub(p) {
    if (p._g) return '';
    return items().filter(function (it) { return it._g && it._pid === p.id; }).map(function (it) { return '<span class="sub">' + phTag(it._g) + ' ' + esc(RT.STATUS[it.trang_thai] || it.trang_thai) + '</span>'; }).join('');
  }

  // ---------- Bệnh nhân của tôi: nội dung theo vai trò ----------
  function renderMine() {
    if (role() === 'KS') return renderKsMine();
    if (role() === 'DD') return renderNurse();
    return renderHome();
  }
  // ---------- Điều dưỡng: số liệu hôm qua / hôm nay / tuần này ----------
  function nurseScope() {
    if (S.fKhoa == null) S.fKhoa = me().khoa && S.data.dm.KHOA.indexOf(me().khoa) >= 0 ? me().khoa : '';
    return pts().filter(function (p) { return !S.fKhoa || p.khoa === S.fKhoa; });
  }
  function sumOf(list, tu, den) {
    return RT.summary({ patients: list, phases: S.data.phases, fractions: S.data.fractions, exceptions: S.data.exceptions, holidays: S.data.holidays, dm: S.data.dm }, tu, den, today());
  }
  function renderNurse() {
    var t = today(), list = nurseScope();
    // Cột: từng ngày từ ngày làm việc trước tới hôm qua (sáng T2: T6, T7 xạ bù…), hôm nay, tuần này. Ngày nghỉ (CN, lễ) chỉ hiện khi có buổi xạ bù.
    var nr = RT.nurseRanges(t, S.data.holidays), from = nr.from, yd = nr.yd;
    // Tổng các khoa: ĐD nhận số tổng từ máy chủ (không có danh sách BN khoa khác); người xem lọc theo khoa thì tính tại chỗ
    var tot = function (a, b) { if (S.data.khoi) return S.data.khoi[a + '|' + b] || null; return S.fKhoa || RT.nurseKhoa(me(), S.data.dm) ? RT.slimSum(sumOf(S.data.patients.filter(function (p) { return p.trang_thai !== 'HUY'; }), a, b)) : null; };
    var cols = [], sums = [], tots = [];
    nr.ranges.forEach(function (r, i) {
      var s0 = sumOf(list, r[0], r[1]), t0 = tot(r[0], r[1]), last = nr.ranges.length;
      var isDay = i < last - 2, d0 = r[0];
      if (isDay && d0 !== from && !s0.luot && !(t0 && t0.luot)) return;
      var dn = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][RT.dow(d0)];
      cols.push([isDay ? (from === yd ? 'Hôm qua' : dn + (d0 !== from ? ' (xạ bù)' : '')) : i === last - 2 ? 'Hôm nay' : 'Tuần này', r[0], r[1]]); sums.push(s0); tots.push(t0);
    });
    S.nurseSums = sums;
    var showTot = tots.some(Boolean);
    var cnt = function (v) { return Array.isArray(v) ? v.length : (v || 0); };
    var techs = (S.data.dm.KY_THUAT || []).slice();
    sums.concat(tots.filter(Boolean)).forEach(function (x) { Object.keys(x.ky_thuat).forEach(function (k) { if (techs.indexOf(k) < 0) techs.push(k); }); });
    techs = techs.filter(function (k) { return sums.concat(tots.filter(Boolean)).some(function (x) { return x.ky_thuat[k]; }); });
    var cell = function (i, key, n, tn) { return '<td class="num">' + (n && key ? '<button class="lnk" data-nlist="' + i + '|' + key + '">' + n + '</button>' : (n || '<span class="muted">0</span>')) + (tn != null ? '<span class="tot"> / ' + tn + '</span>' : '') + '</td>'; };
    var row = function (label, f, key, cls) { return '<tr class="' + (cls || '') + '"><td>' + label + '</td>' + sums.map(function (x, i) { return cell(i, key, f(x), showTot && tots[i] ? f(tots[i]) : null); }).join('') + '</tr>'; };
    var khoaSel = khoaFilterOn() ? '<select data-filter="fKhoa" aria-label="Lọc theo khoa">' + opts(S.data.dm.KHOA, S.fKhoa, 'Cả hai khoa') + '</select>' : '';
    var html = '<div class="page-head"><div><h1>Tổng quan ' + esc(S.fKhoa ? 'khoa ' + S.fKhoa : 'hai khoa') + '</h1><p>' + fdw(t) + '/' + t.slice(0, 4) + ' · Bấm vào con số để xem danh sách bệnh nhân.</p></div><div class="filters">' + khoaSel + '</div></div>';
    var now = { tx: list.filter(function (p) { return p.trang_thai === 'DANG_XA'; }), pause: list.filter(function (p) { return p.trang_thai === 'TAM_NGUNG'; }), wait: list.filter(function (p) { return p.trang_thai === 'CHO_XA'; }) };
    S.nurseNow = now;
    html += '<div class="kpis">' + kpi('n-tx', now.tx.length, 'Đang xạ', 'var(--ktv)') + kpi('n-wait', now.wait.length, 'Chờ vào xạ', 'var(--warn)', now.wait.filter(function (p) { return !p.ngay_du_kien; }).length ? '<span class="kx" style="color:var(--warn)">' + now.wait.filter(function (p) { return !p.ngay_du_kien; }).length + ' chưa xếp lịch</span>' : '') +
      kpi('n-pause', now.pause.length, 'Tạm ngừng', 'var(--crit)') + kpi('n-abs', list.filter(function (p) { return course(p).streak > 0; }).length, 'BN đang vắng xạ', 'var(--crit)') + '</div>';
    html += '<section class="group"><div class="group-head"><h2>Số liệu xạ trị</h2><span class="hint">' + (showTot ? 'Mỗi ô: <b>số của khoa</b> / tổng các khoa. ' : '') + 'Tuần này tính từ Thứ Hai đến hôm nay</span></div><div class="card"><div class="tbl-wrap"><table class="nurse-tbl"><thead><tr><th></th>' +
      cols.map(function (c) { return '<th class="num">' + c[0] + '<span class="sub">' + (c[1] === c[2] ? fdw(c[1]) : fd(c[1]) + ' → ' + fd(c[2])) + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      row('<b>Tổng lượt xạ</b>', function (x) { return x.luot; }, '', 'strong') +
      techs.map(function (k) { return row('&nbsp;&nbsp;· ' + esc(k), function (x) { return x.ky_thuat[k] || 0; }, ''); }).join('') +
      row('BN được xạ', function (x) { return x.bn; }, '') +
      row('BN mới vào xạ (buổi đầu)', function (x) { return cnt(x.bat_dau); }, 'bat_dau') +
      row('BN kết thúc xạ', function (x) { return cnt(x.ket_thuc); }, 'ket_thuc') +
      row('<b style="color:var(--crit)">Lượt vắng</b>', function (x) { return x.vang_luot; }, 'vang', 'strong') +
      row('BN vắng', function (x) { return x.vang_bn; }, 'vang') +
      row('Buổi ghi bù (quên tích)', function (x) { return x.ghi_bu; }, '') +
      '</tbody></table></div></div></section>';
    // Sắp kết thúc xạ: từng ngày tới
    var days = [], dd = t;
    for (var k = 0; days.length < 6 && k < 10; k++, dd = RT.addDays(dd, 1)) if (RT.dow(dd) !== 0) days.push(dd);
    var endOn = {}; now.tx.forEach(function (p) { var e = course(p).end; if (days.indexOf(e) >= 0) (endOn[e] = endOn[e] || []).push(p); });
    html += '<section class="group"><div class="group-head"><h2>Sắp kết thúc xạ</h2><span class="hint">Theo ngày dự kiến buổi cuối</span></div><div class="load ends">' + days.map(function (d) {
      var l = endOn[d] || [];
      return '<div class="' + (d === t ? 'today' : '') + '"><span class="d">' + fdw(d) + '</span><span class="v">' + l.length + '</span>' +
        l.map(function (p) { return '<button class="lnk sm" data-openp="' + esc(p.id) + '">' + esc(p.ho_ten) + '</button>'; }).join('') + '</div>';
    }).join('') + '</div></section>';
    // BN đang vắng
    var abs = list.filter(function (p) { return course(p).streak > 0; }).sort(function (a, b) { return course(b).streak - course(a).streak; });
    html += group('n-abs', 'BN đang vắng xạ', abs, [C.pt, C.rx,
      { h: 'Vắng liên tiếp', cls: 'nowrap', v: function (p) { var n = course(p).streak; return '<b style="color:' + (n >= 2 ? 'var(--crit)' : 'var(--warn)') + '">' + n + ' buổi</b>'; } },
      { h: 'Tổng buổi vắng', cls: 'num', v: function (p) { return Object.keys(course(p).absent).length; } },
      { h: 'Lý do gần nhất', v: function (p) { var ab = course(p).absent, ks = Object.keys(ab).sort(); var w = ks.length ? ab[ks[ks.length - 1]] : ''; return w ? esc(w) : '<span class="flag crit">Chưa rõ lý do</span>'; } },
      C.bs, { h: '', cls: 'act', v: function (p) { return btn('openP', p.id, 'Xem lịch, ghi lý do'); } }],
      'Vắng từ 2 buổi liên tiếp sẽ báo bác sĩ điều trị.', 'Không có BN nào đang vắng xạ.');
    return html + renderHome(true);
  }
  function nurseList(spec) {
    var sp = spec.split('|'), x = S.nurseSums[+sp[0]], key = sp[1], ids, title;
    if (key === 'vang') {
      var rows = x.vang.map(function (v) { return { p: byId(v.bn_id), v: v }; }).filter(function (r) { return r.p; });
      return modal({ title: 'Vắng buổi xạ (' + rows.length + ' lượt)', ok: 'Đóng', noCancel: true, wide: true, noFocus: true,
        body: rows.length ? '<div class="tbl-wrap"><table><thead><tr><th>Bệnh nhân</th><th>Ngày</th><th>Lý do</th><th>BS</th></tr></thead><tbody>' + rows.map(function (r) {
          return '<tr class="click" data-openp="' + esc(r.p.id) + '"><td><b>' + esc(r.p.ho_ten) + '</b><span class="sub mono">' + esc(r.p.ma_his) + '</span></td><td class="nowrap">' + fdw(r.v.ngay) + '</td><td>' + (r.v.ly_do ? esc(r.v.ly_do) : '<span class="flag crit">Chưa rõ lý do</span>') + '</td><td>' + esc(nameOf(r.p.bs_email)) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty">Không có.</div>',
        onMount: function (f) { $$('[data-openp]', f).forEach(function (b) { b.onclick = function () { closeModal(); openDetail(b.dataset.openp); }; }); }, onOk: function () {} });
    }
    ids = x[key]; title = key === 'bat_dau' ? 'BN mới vào xạ' : 'BN kết thúc xạ';
    var ps = ids.map(byId).filter(Boolean);
    modal({ title: title + ' (' + ps.length + ')', ok: 'Đóng', noCancel: true, wide: true, noFocus: true,
      body: ps.length ? '<div class="tbl-wrap"><table><thead><tr><th>Bệnh nhân</th><th>Kỹ thuật · liều</th><th>BS</th><th>Bắt đầu → kết thúc</th></tr></thead><tbody>' + ps.map(function (p) {
        return '<tr class="click" data-openp="' + esc(p.id) + '"><td><b>' + esc(p.ho_ten) + '</b><span class="sub mono">' + esc(p.ma_his) + '</span></td><td>' + rx(p) + '</td><td>' + esc(nameOf(p.bs_email)) + '</td><td class="nowrap">' + fdy(p.ngay_bat_dau) + ' → ' + fdy(p.ngay_ket_thuc || course(p).end) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">Không có.</div>',
      onMount: function (f) { $$('[data-openp]', f).forEach(function (b) { b.onclick = function () { closeModal(); openDetail(b.dataset.openp); }; }); }, onOk: function () {} });
  }
  function bsFilter(list) {
    var on = byDoctorOn(), docs = on ? doctors() : [];
    var f = S.fBs === 'mine' && isDoctor(me()) ? RT.myDoctors(me()) : S.fBs && on ? [S.fBs] : null;
    var choices = (isDoctor(me()) ? [{ v: 'mine', l: 'BN của tôi' }] : []).concat(docs.map(function (u) { return { v: u.email, l: u.ho_ten }; }));
    return {
      list: f ? list.filter(function (p) { return f.indexOf(p.bs_email) >= 0; }) : list,
      ui: choices.length ? '<select data-filter="fBs" aria-label="Lọc theo bác sĩ">' + opts(choices, S.fBs, 'Tất cả bác sĩ') + '</select>' : ''
    };
  }
  function stepHead(title, desc, filterUi) {
    return '<div class="page-head"><div><h1>' + title + '</h1><p>' + desc + '</p></div>' + (filterUi ? '<div class="filters">' + filterUi + '</div>' : '') + '</div>';
  }
  function renderSim() {
    var t = today(), f = bsFilter(byState(['MO_PHONG']));
    var list = f.list.sort(function (a, b) { return (a.ngay_mo_phong || '9') < (b.ngay_mo_phong || '9') ? -1 : (a.ngay_mo_phong || '9') > (b.ngay_mo_phong || '9') ? 1 : byName(a, b); });
    var due = list.filter(function (p) { return p.ngay_mo_phong && p.ngay_mo_phong <= t; }), later = list.filter(function (p) { return p.ngay_mo_phong > t; }), none = list.filter(function (p) { return !p.ngay_mo_phong; });
    var cols = [C.pt, C.pr,
      { h: 'Hẹn mô phỏng', cls: 'nowrap', v: function (p) { return p.ngay_mo_phong ? '<span class="num">' + fdw(p.ngay_mo_phong) + '</span>' + (p.ngay_mo_phong < t ? '<span class="sub" style="color:var(--warn)">quá hẹn ' + RT.diffDays(p.ngay_mo_phong, t) + ' ngày</span>' : '') : '<span class="muted">Chưa hẹn</span>'; } },
      C.dx, C.bs, { h: 'Nhập ngày', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_tao) + '</span><span class="sub">' + daysSince(p.ngay_tao) + ' ngày</span>'; } },
      { h: '', cls: 'act', v: function (p) { return (p._g ? '<span class="tag boost">Mô phỏng lại (' + phKind(p._g) + ')</span> ' : '') + (can('simDone') ? btn('simDone', p.id, 'Đã mô phỏng xong', 'primary') : ''); } }];
    return stepHead('Mô phỏng', 'BN đã có chỉ định xạ, chờ chụp CT mô phỏng. Chụp xong bấm “Đã mô phỏng xong”, BN chuyển sang bước Contour.', f.ui) +
      '<div class="kpis">' + kpi('simd', due.length, 'Hẹn hôm nay / quá hẹn', 'var(--accent)') + kpi('siml', later.length, 'Hẹn các ngày tới', 'var(--line)') + kpi('simn', none.length, 'Chưa có ngày hẹn', 'var(--warn)') + '</div>' +
      group('simd', 'Hẹn hôm nay / quá hẹn', due, cols, null, 'Không có BN hẹn mô phỏng hôm nay.') +
      group('siml', 'Hẹn các ngày tới', later, cols, null, 'Không có.') +
      group('simn', 'Chưa có ngày hẹn', none, cols, null, 'Không có.');
  }
  function renderContourTab() {
    var f = bsFilter(byState(['CONTOUR']));
    var since = function (p) { return p.ngay_mo_phong && p.ngay_mo_phong <= today() ? p.ngay_mo_phong : p.ngay_tao; };
    var list = f.list.sort(byName);
    var own = function (p) { return RT.myDoctors(me()).indexOf(p.bs_email) >= 0 || role() === 'ADMIN'; };
    var late = list.filter(function (p) { return daysSince(since(p)) >= 5; }).length;
    return stepHead('Contour', 'BN đã mô phỏng, chờ bác sĩ contour. Contour xong bấm “Contour xong”, BN vào hàng đợi lập kế hoạch của kỹ sư.', f.ui) +
      '<div class="kpis">' + kpi('ct', list.length, 'Đang chờ contour', 'var(--bs, var(--accent))', late ? '<span class="kx" style="color:var(--warn)">' + late + ' ca chờ ≥ 5 ngày</span>' : '') + '</div>' +
      group('ct', 'Đang chờ contour', list, [C.pt, C.pr, C.bs,
        { h: 'Chờ từ', cls: 'nowrap', v: function (p) { var d0 = since(p), n = daysSince(d0); return '<span class="num">' + fd(d0) + '</span><span class="sub"' + (n >= 5 ? ' style="color:var(--warn)"' : '') + '>' + n + ' ngày</span>'; } },
        C.dx, C.rx, { h: 'Hạn', v: function (p) { return boostFlag(p) || '<span class="muted">—</span>'; } },
        { h: '', cls: 'act', v: function (p) { return can('contourDone') && own(p) ? btn('contourDone', p.id, 'Contour xong', 'primary') : ''; } }],
        'Xếp: Cấp cứu → Ưu tiên → chờ lâu trước.', 'Không có BN chờ contour.');
  }
  function renderQa() {
    var list = byState(['CHO_QA']).sort(RT.planOrder);
    return stepHead('QA', 'Kế hoạch đã lập xong, chờ đo kiểm tra (QA). QA đạt thì BN chuyển sang “Chờ vào xạ” để KTV xếp lịch.') +
      group('qa', 'Chờ QA', list, [C.pt, C.pr,
        { h: 'Kỹ sư · KH xong', cls: 'nowrap', v: function (p) { return esc(nameOf(p.ks_email)) + '<span class="sub">' + fd(p.ngay_kh_xong) + ' · ' + daysSince(p.ngay_kh_xong) + ' ngày</span>'; } },
        C.bs, C.rx,
        { h: 'Ngày xạ dự kiến', cls: 'nowrap', v: function (p) { return p._g ? (boostFlag(p) || '<span class="muted">—</span>') : p.ngay_du_kien ? '<span class="num">' + fdw(p.ngay_du_kien) + '</span>' : '<span class="muted">—</span>'; } },
        { h: '', cls: 'act', v: function (p) { return can('qaResult') ? btn('qaPass', p.id, 'QA đạt', 'ok') + btn('qaFail', p.id, 'Không đạt', 'danger') : ''; } }],
        null, 'Không có kế hoạch chờ QA.');
  }
  function renderTx() {
    var sub = S.txSub || 'today';
    var noDate = pts().filter(function (p) { return p.trang_thai === 'CHO_XA' && !p.ngay_du_kien; }).length;
    var pend = pendingSched().length;
    var segs = [['today', 'Hôm nay', todayDue().length], ['week', 'Lịch tuần', 0], ['sched', 'Chờ xếp lịch', noDate]];
    if (ktvLead() && pend) segs.push(['approve', 'Đề xuất cũ', pend]);
    var npl = pts().filter(function (p) { return p.trang_thai === 'CHO_PL'; }).length;
    if (npl || can('importPatients') || can('importHisBook')) segs.push(['pl', 'Chờ phân loại', npl]);
    var seg = '<div class="seg tx-seg" role="group" aria-label="Xạ trị">' + segs.map(function (x) {
      return '<button data-txsub="' + x[0] + '" aria-pressed="' + (sub === x[0]) + '">' + x[1] + (x[2] ? ' <span class="step-c">' + x[2] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
    return seg + (sub === 'week' ? renderWeek() : sub === 'sched' ? renderSchedule() : sub === 'approve' ? renderApprove() : sub === 'pl' ? renderPL() : renderToday(role() === 'KTV' || role() === 'ADMIN'));
  }
  /** Tình trạng BN khi KTV tìm trong tab Xạ trị: cảnh báo + có cho ghi buổi xạ không */
  function txState(p) {
    var st = p.trang_thai, t = today(), fl = [], can1 = false;
    var flag = function (txt, cls) { fl.push('<span class="flag' + (cls ? ' ' + cls : '') + '">' + txt + '</span>'); };
    var txable = ['CHO_XA', 'DANG_XA', 'TAM_NGUNG'].indexOf(st) >= 0 || (st === 'CHO_PL' && plFx(p).length && p.ky_thuat);
    if (!txable) {
      if (st === 'HOAN_THANH') flag('Đã xạ xong' + (p.ngay_ket_thuc ? ' ' + fdy(p.ngay_ket_thuc) : ''), 'ok');
      else if (st === 'CHO_PL') flag('Chờ phân loại: BS phân loại trước khi xạ');
      else flag('Đang ở bước: ' + esc(RT.STATUS[st] || st));
      return { ok: false, flags: fl };
    }
    var c = course(p);
    if (c.doneToday) {
      var f = c.fx.filter(function (x) { return x.ngay === t; })[0];
      flag('Đã xạ hôm nay' + (f && f.thoi_gian && f.thoi_gian.length > 15 && f.ghi_bu !== 'Có' ? ' lúc ' + f.thoi_gian.slice(11, 16) : ''), 'ok');
      return { ok: false, flags: fl };
    }
    if (c.reviewWait) { flag('Chờ BS đánh giá lại KH (đã xạ hết ' + c.review + ' buổi được chuyển)', 'crit'); return { ok: false, flags: fl }; }
    if (!c.open && c.done >= c.total) { flag('Đã xạ đủ ' + c.total + ' buổi', 'crit'); return { ok: false, flags: fl }; }
    if (c.blocked) { flag('KH tiếp theo chưa sẵn sàng: chưa xạ tiếp được', 'crit'); return { ok: false, flags: fl }; }
    if (st === 'TAM_NGUNG') flag('Tạm ngừng' + (p.tam_ngung_tu ? ' từ ' + fdw(p.tam_ngung_tu) : '') + (p.ly_do_tam_ngung ? ' · ' + esc(p.ly_do_tam_ngung) : ''), 'crit');
    if (st === 'CHO_XA' && !p.ngay_du_kien) flag('Chưa xếp lịch');
    else if (st === 'CHO_XA' && p.ngay_du_kien > t) flag('Lịch bắt đầu ' + fdw(p.ngay_du_kien));
    else if (st === 'CHO_XA') flag('Xạ buổi đầu');
    if (st === 'DANG_XA' && !c.treatToday) flag('Hôm nay không có lịch xạ');
    if (c.absent[t] !== undefined) flag('Đã ghi vắng hôm nay', 'crit');
    if (c.open || st === 'CHO_PL') flag('Chưa có tổng liều, số buổi');
    if (RT.needsOffDay(p)) fl.push(can('setOffDay') || can('schedule') ? '<button class="lnk sm" data-do="offDay" data-id="' + esc(p.id) + '" style="color:var(--warn)">Chưa rõ ngày nghỉ: chọn</button>' : '<span class="flag">Chưa rõ ngày nghỉ</span>');
    return { ok: true, flags: fl };
  }
  /** Nút thao tác đúng bước của BN (theo quyền người xem) trong khung kết quả tìm */
  function stepActions(p) {
    var st = p.trang_thai, o = '', mineBs = role() === 'ADMIN' || RT.myDoctors(me()).indexOf(p.bs_email) >= 0;
    if (st === 'MO_PHONG' && can('simDone')) o += btn('simDone', p.id, 'Đã mô phỏng xong', 'primary');
    if (st === 'CONTOUR' && can('contourDone') && mineBs) o += btn('contourDone', p.id, 'Contour xong', 'primary');
    if (st === 'CHO_KH' && can('claimPlan')) o += btn('claimPlan', p.id, 'Nhận ca', 'primary');
    if (st === 'DANG_KH' && can('planDone')) o += btn('planDone', p.id, 'Lập KH xong', 'primary');
    if ((st === 'DANG_KH' || st === 'CHO_QA') && can('changeTech')) o += btn('changeTech', p.id, 'Đổi kỹ thuật');
    if (st === 'CHO_QA' && can('qaResult')) o += btn('qaPass', p.id, 'QA đạt', 'ok') + btn('qaFail', p.id, 'Không đạt', 'danger');
    if (st === 'CHO_PL' && !p._g && canClassify(p)) o += btn('classify', p.id, 'Phân loại', 'primary');
    if (st === 'CHO_XA' && !p._g && can('schedule')) o += btn('schedule', p.id, 'Xếp lịch');
    if (!p._g) {
      var s1 = txState(p);
      if (s1.ok && can('logFraction')) o += btn('logFx', p.id, '✓ Xác nhận xạ', 'ok');
      if (s1.ok && can('markAbsent') && st !== 'TAM_NGUNG' && st !== 'CHO_PL' && course(p).absent[today()] === undefined) o += btn('absent', p.id, 'Vắng');
    }
    return o + btn('openP', p._pid || p.id, 'Mở hồ sơ');
  }
  /** Khung "Kết quả tìm" ở đầu tab đang đứng: tìm trên toàn bộ BN, BN thuộc bước của tab lên trước */
  var TAB_STATES = { sim: ['MO_PHONG'], contour: ['CONTOUR'], plan: ['CHO_KH', 'DANG_KH'], qa: ['CHO_QA'], tx: ['DANG_XA', 'CHO_XA', 'TAM_NGUNG', 'CHO_PL'] };
  function findPanel(tab) {
    var q = fold(S.q || '').trim();
    if (!q) return '';
    var mine = TAB_STATES[tab] || [];
    var list = items().filter(function (p) { return p.trang_thai !== 'HUY' && (fold(p.ho_ten).indexOf(q) >= 0 || fold(p.ma_his).indexOf(q) >= 0 || fold(p._pid || p.id).indexOf(q) >= 0); })
      .sort(function (a, b) { var ra = mine.indexOf(a.trang_thai), rb = mine.indexOf(b.trang_thai); ra = ra < 0 ? 9 : ra; rb = rb < 0 ? 9 : rb; return (ra - rb) || byName(a, b); }).slice(0, 20);
    return '<section class="group tx-find"><div class="group-head"><h2>Kết quả tìm “' + esc(S.q.trim()) + '”</h2><span class="count">' + list.length + '</span>' +
      '<span class="hint">Tìm trên toàn bộ BN. Kiểm tra đúng bệnh nhân rồi bấm nút thao tác.</span><button class="btn sm" data-clearq="1">Xoá tìm kiếm</button></div>' +
      table(list, [C.pt, C.rx,
        { h: 'Bước · lưu ý', v: function (p) { var f = p._g || ['CHO_XA', 'DANG_XA', 'TAM_NGUNG', 'CHO_PL'].indexOf(p.trang_thai) < 0 ? [] : txState(p).flags; return stPill(p) + (f.length ? '<div style="margin-top:4px">' + f.join(' ') + '</div>' : ''); } },
        { h: '', cls: 'act', v: stepActions }], 'Không tìm thấy bệnh nhân. Kiểm tra lại mã HIS hoặc họ tên.') + '</section>';
  }
  // ---------- Kỹ sư: việc của tôi ----------
  function renderKsMine() {
    var em = me().email;
    var queue = RT.planningQueue(items(), boostLeft);
    var doing = byState(['DANG_KH']).filter(function (p) { return p.ks_email === em; }).sort(RT.planOrder);
    var qa = byState(['CHO_QA']).filter(function (p) { return p.ks_email === em; }).sort(RT.planOrder);
    var recent = items().concat([]).filter(function (p) { return p.ks_email === em && p.ngay_kh_xong && daysSince(p.ngay_kh_xong) <= 7 && ['CHO_XA', 'DANG_XA', 'TAM_NGUNG', 'HOAN_THANH'].indexOf(p.trang_thai) >= 0; })
      .sort(function (a, b) { return a.ngay_kh_xong < b.ngay_kh_xong ? 1 : -1; });
    var urgent = queue.filter(function (p) { return p.uu_tien === 'Cấp cứu'; }).length;
    var deadline = function (p) {
      if (p._g) return boostFlag(p) || '<span class="muted">—</span>';
      return p.ngay_du_kien ? '<span class="num">Xạ ' + fdw(p.ngay_du_kien) + '</span>' : '<span class="muted">—</span>';
    };
    var html = '<div class="page-head"><div><h1>Việc của ' + esc(me().ho_ten) + '</h1><p>Ca chờ nhận và ca bạn đang lập kế hoạch. Toàn bộ ca của phòng xem ở tab “Lập kế hoạch”.</p></div></div>';
    html += '<div class="kpis">' +
      kpi('kq', queue.length, 'Contour xong, chờ nhận', 'var(--ks)', urgent ? '<span class="kx" style="color:var(--crit)">' + urgent + ' cấp cứu</span>' : '') +
      kpi('kd', doing.length, 'Tôi đang lập KH', 'var(--ks)') + kpi('kqa', qa.length, 'Ca của tôi chờ QA', 'var(--warn)') +
      kpi('kr', recent.length, 'Tôi đã chuyển xạ (7 ngày)', 'var(--ktv)') + '</div>';
    html += group('kq', 'Contour xong, chờ nhận lập kế hoạch', queue, [
      { h: '#', v: function (p, i) { return '<span class="num">' + (i + 1) + '</span>'; } }, C.pt, C.pr, C.bs,
      { h: 'Contour xong', cls: 'nowrap', v: function (p) { var n = daysSince(p.ngay_contour_xong); return '<span class="num">' + fdw(p.ngay_contour_xong) + '</span><span class="sub"' + (n >= 3 ? ' style="color:var(--warn)"' : '') + '>chờ ' + n + ' ngày</span>'; } },
      C.dx, C.rx, { h: 'Hạn', v: deadline },
      { h: '', cls: 'act', v: function (p) { return can('claimPlan') ? btn('claimPlan', p.id, 'Nhận ca', 'primary') : ''; } }
    ], 'Thứ tự: Cấp cứu → boost sắp tới lượt xạ → nộp trước làm trước. Nền đỏ: cấp cứu, tím: boost, cam: ưu tiên.', 'Không có ca nào chờ nhận.');
    html += group('kd', 'Ca tôi đang lập kế hoạch', doing, [C.pt, C.pr, C.bs,
      { h: 'Nhận ca', cls: 'nowrap', v: function (p) { var n = daysSince(p.ngay_nhan_kh); return '<span class="num">' + fdw(p.ngay_nhan_kh) + '</span><span class="sub"' + (n >= 3 ? ' style="color:var(--warn)"' : '') + '>' + n + ' ngày</span>'; } },
      C.dx, C.rx, { h: 'Hạn', v: deadline },
      { h: '', cls: 'act', v: function (p) { return (can('changeTech') ? btn('changeTech', p.id, 'Đổi kỹ thuật') : '') + (can('planDone') ? btn('planDone', p.id, 'Lập KH xong', 'primary') : ''); } }
    ], null, 'Bạn chưa nhận ca nào. Bấm “Nhận ca” ở danh sách trên.');
    html += group('kqa', 'Ca của tôi chờ QA', qa, [C.pt, C.pr, C.bs,
      { h: 'KH xong', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_kh_xong) + '</span><span class="sub">' + daysSince(p.ngay_kh_xong) + ' ngày</span>'; } },
      C.rx, { h: 'Hạn', v: deadline },
      { h: '', cls: 'act', v: function (p) { return (can('changeTech') ? btn('changeTech', p.id, 'Đổi kỹ thuật') : '') + (can('qaResult') ? btn('qaPass', p.id, 'QA đạt', 'ok') + btn('qaFail', p.id, 'Không đạt', 'danger') : ''); } }
    ], null, 'Không có ca chờ QA.');
    html += group('kr', 'Tôi đã chuyển xạ trong 7 ngày', recent, [C.pt, C.bs, C.rx,
      { h: 'KH xong', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_kh_xong) + '</span>'; } }, C.st], null, 'Chưa có.');
    return html;
  }

  // ---------- Kỹ sư ----------
  function renderPlanning() {
    var queue = RT.planningQueue(items(), boostLeft);
    var doing = items().filter(function (p) { return p.trang_thai === 'DANG_KH'; }).sort(RT.planOrder);
    var qa = items().filter(function (p) { return p.trang_thai === 'CHO_QA'; }).sort(RT.planOrder);
    var recent = pts().filter(function (p) { return p.ngay_kh_xong && daysSince(p.ngay_kh_xong) <= 7 && ['CHO_XA', 'DANG_XA', 'TAM_NGUNG', 'HOAN_THANH'].indexOf(p.trang_thai) >= 0; })
      .sort(function (a, b) { return a.ngay_kh_xong < b.ngay_kh_xong ? 1 : -1; });
    var mine = doing.filter(function (p) { return p.ks_email === me().email; }).length;
    var urgent = queue.filter(function (p) { return p.uu_tien === 'Cấp cứu'; }).length;

    var html = '<div class="page-head"><div><h1>Lập kế hoạch</h1><p>Toàn bộ ca chờ lập kế hoạch và đang lập của phòng. Việc của riêng bạn xem ở “Bệnh nhân của tôi”.</p></div></div>';
    html += '<div class="kpis">' +
      kpi('queue', queue.length, 'Contour xong, chờ lập KH', 'var(--ks)', urgent ? '<span class="kx" style="color:var(--crit)">' + urgent + ' cấp cứu</span>' : '') +
      kpi('doing', doing.length, 'Đang lập KH', 'var(--ks)', mine ? '<span class="kx muted">' + mine + ' của bạn</span>' : '') +
      kpi('recent', recent.length, 'Chuyển xạ trong 7 ngày', 'var(--ktv)') + '</div>';

    html += group('queue', 'Chờ lập kế hoạch', queue, [
      { h: '#', v: function (p, i) { return '<span class="num">' + (i + 1) + '</span>'; } },
      C.pt, C.pr,
      { h: 'Contour xong', cls: 'nowrap', v: function (p) { return '<span class="num">' + fdw(p.ngay_contour_xong) + '</span><span class="sub">chờ ' + daysSince(p.ngay_contour_xong) + ' ngày</span>'; } },
      C.dx, C.rx, { h: 'Hạn', v: function (p) { return boostFlag(p) || '<span class="muted">—</span>'; } }, C.bs,
      { h: '', cls: 'act', v: function (p) { return can('claimPlan') ? btn('claimPlan', p.id, 'Nhận ca') + btn('planDone', p.id, 'Lập KH xong', 'primary') : ''; } }
    ], 'Thứ tự: Cấp cứu → boost sắp tới lượt xạ → nộp trước làm trước. Nền đỏ: cấp cứu, tím: boost, cam: ưu tiên.', 'Không có ca nào chờ lập kế hoạch.');
    html += group('doing', 'Đang lập kế hoạch', doing, [C.pt, C.pr,
      { h: 'Kỹ sư', cls: 'nowrap', v: function (p) { return esc(nameOf(p.ks_email)) + '<span class="sub">nhận ' + fd(p.ngay_nhan_kh) + ' · ' + daysSince(p.ngay_nhan_kh) + ' ngày</span>'; } },
      C.dx, C.rx, { h: 'Hạn', v: function (p) { return boostFlag(p) || '<span class="muted">—</span>'; } },
      { h: '', cls: 'act', v: function (p) { return (can('changeTech') ? btn('changeTech', p.id, 'Đổi kỹ thuật') : '') + (can('planDone') ? btn('planDone', p.id, 'Lập KH xong', 'primary') : ''); } }
    ], null, 'Không có ca nào đang lập kế hoạch.');
    html += group('recent', 'Đã chuyển xạ trong 7 ngày qua', recent, [C.pt, C.rx,
      { h: 'KH xong', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_kh_xong) + '</span><span class="sub">' + esc(nameOf(p.ks_email)) + '</span>'; } },
      { h: 'QA', v: function (p) { return p.qa_ket_qua === 'Đạt' ? '<span class="flag ok">Đạt ' + fd(p.ngay_qa) + '</span>' : '<span class="muted">' + esc(p.qa_ket_qua) + '</span>'; } },
      C.st], null, 'Chưa có kế hoạch nào hoàn thành trong 7 ngày qua.');
    return html;
  }

  // ---------- KTV: xạ hôm nay ----------
  /** Buổi xạ thứ idx (0 = buổi 1) là buổi đầu của đợt hoặc của một giai đoạn boost: cần setup */
  function isSetupIdx(c, idx) { return idx === 0 || c.segs.some(function (s) { return s.from === idx && idx > 0; }); }
  function setupLabel(c, idx) { var sg = c.segs.filter(function (s) { return s.from === idx && idx > 0; })[0]; return sg ? '<span class="tag boost">Buổi đầu boost ' + esc(sg.label) + '</span>' : '<span class="tag first">Buổi 1</span>'; }
  function renderToday(mine) {
    var t = today();
    var machines = S.data.dm.MAY || [];
    var onM = function (p) { return !S.fMay || (p.may || machines[0]) === S.fMay; };
    var active = pts().filter(function (p) { return onM(p) && (p.trang_thai === 'DANG_XA' || (p.trang_thai === 'CHO_XA' && p.ngay_du_kien && p.ngay_du_kien <= t)); });
    var absT = active.filter(function (p) { var c = course(p); return !c.doneToday && c.absent[t] !== undefined; }).sort(byName);
    var dueAll = active.filter(function (p) { var c = course(p); return c.treatToday && !c.doneToday && c.absent[t] === undefined; })
      .sort(byName);
    var firstDue = dueAll.filter(function (p) { var c = course(p); return !c.blocked && isSetupIdx(c, c.done); });
    var due = dueAll.filter(function (p) { return firstDue.indexOf(p) < 0; });
    var done = pts().filter(function (p) { return onM(p) && course(p).doneToday; }).sort(byName);
    var todayIdx = function (p) { var c = course(p); for (var k = 0; k < c.fx.length; k++) if (c.fx[k].ngay === t) return k; return -1; };
    var firstDone = done.filter(function (p) { return isSetupIdx(course(p), todayIdx(p)); });
    var off = active.filter(function (p) { var c = course(p); return !c.treatToday && !c.doneToday; }).sort(byName);
    var paused = pts().filter(function (p) { return onM(p) && p.trang_thai === 'TAM_NGUNG'; }).sort(byName);
    var holiday = S.data.holidays.indexOf(t) >= 0;
    var nFirst = firstDue.length + firstDone.length;
    var sub = S.todaySub || (firstDue.length ? 'first' : 'due');
    var html = dutyBanner() + '<div class="page-head"><div><h1>' + 'Xạ hôm nay' + ' · ' + fdw(t) + '/' + t.slice(0, 4) + '</h1><p>' +
      (holiday ? 'Hôm nay là ngày nghỉ lễ trong danh mục.' : RT.dow(t) === 6 ? 'Thứ Bảy: xạ bù cho BN IMRT/VMAT có ngày nghỉ trong tuần.' : RT.dow(t) === 0 ? 'Chủ nhật: không có lịch xạ.' : 'Bấm “Xác nhận đã xạ” ngay sau khi BN xạ xong.') + '</p></div>' +
      '<div class="filters">' + noticeBtn() + (machines.length > 1 ? '<select data-filter="fMay" aria-label="Lọc theo máy">' + opts(machines, S.fMay, 'Tất cả máy') + '</select>' : '') + '</div></div>';
    var pend = ktvLead() ? pendingSched().length : 0;
    if (pend) html += '<div class="card pad approve-bar"><b>' + pend + ' đề xuất lịch xạ chờ bạn duyệt.</b> <button class="btn primary" data-txsub="approve">Xem và duyệt</button></div>';
    var SUBS = [['first', 'Xạ buổi đầu', nFirst ? firstDone.length + '/' + nFirst : '0'], ['due', 'Cần xạ hôm nay', due.length], ['done', 'Đã xạ', done.length],
      ['abs', 'Vắng hôm nay', absT.length], ['off', 'Nghỉ hôm nay', off.length], ['pause', 'Tạm ngừng', paused.length]];
    html += '<nav class="subnav" aria-label="Mục hôm nay">' + SUBS.map(function (x) { return '<button data-tdsub="' + x[0] + '" aria-pressed="' + (sub === x[0]) + '">' + x[1] + ' <span class="c">' + x[2] + '</span></button>'; }).join('') + '</nav>';
    var kt = { h: 'Kỹ thuật', cls: 'nowrap', v: function (p) { var c = course(p); return esc(c.cur.ky_thuat) + (c.multi ? ' <span class="tag boost">' + c.cur.label + '</span>' : '') + '<span class="sub">' + c.dosePerFx + ' Gy/buổi</span>'; } };
    var igrt = { h: 'IGRT / SGRT', v: function (p) { return (p.igrt && p.igrt !== 'Không' ? esc(p.igrt) : '<span class="muted">Không IGRT</span>') + (p.sgrt === 'Có' ? '<span class="sub">Có SGRT</span>' : ''); } };
    var act = { h: '', cls: 'act', v: function (p) { var c = course(p); if (c.reviewWait) return '<span class="flag crit">Đã xạ hết ' + c.review + ' buổi được chuyển · chờ BS đánh giá lại</span>'; if (c.blocked) return '<span class="flag crit">Chờ KH boost ' + esc(c.cur.label) + '</span>'; return (can('logFraction') ? btn('logFx', p.id, '✓ Xác nhận đã xạ', 'ok big') : '') + (can('markAbsent') ? btn('absent', p.id, 'Vắng') : ''); } };
    var noTreat = holiday || RT.dow(t) === 0;
    if (sub === 'first') {
      var list = firstDue.concat(firstDone);
      return html + '<p class="note">BN vào xạ buổi 1 hôm nay, kể cả buổi đầu giai đoạn boost: cần setup. Đã làm <b>' + firstDone.length + '/' + nFirst + '</b> ca.</p>' +
        group('first', 'Xạ buổi đầu', list, [
          { h: 'Bệnh nhân', v: function (p) { var c = course(p), dn = firstDone.indexOf(p) >= 0; return ptCell(p) + ' ' + setupLabel(c, dn ? todayIdx(p) : c.done); } },
          kt, igrt, C.week, C.bs,
          { h: '', cls: 'act', v: function (p) { if (firstDone.indexOf(p) >= 0) { var f = course(p).fx[todayIdx(p)]; return '<span class="flag ok">Đã xạ ' + String(f.thoi_gian).slice(11, 16) + '</span>'; } return act.v(p); } }
        ], null, noTreat ? 'Hôm nay không có lịch xạ.' : 'Hôm nay không có BN xạ buổi đầu.');
    }
    if (sub === 'due') return html + group('due', 'Cần xạ hôm nay', due, [C.pt, kt,
      { h: 'Buổi', cls: 'nowrap', v: function (p) { var c = course(p); return '<b class="num">' + (c.done + 1) + '/' + c.total + '</b>'; } }, igrt, C.week, act
    ], null, noTreat ? 'Hôm nay không có lịch xạ.' : 'Đã xạ xong tất cả bệnh nhân có lịch hôm nay.');
    if (sub === 'done') return html + group('done', 'Đã xạ hôm nay', done, [C.pt,
      { h: 'Buổi', cls: 'nowrap', v: function (p) { var c = course(p); return '<span class="num">' + c.done + '/' + c.total + '</span>'; } },
      { h: 'Hình ảnh / định vị', v: function (p) { var f = course(p).fx.filter(function (x) { return x.ngay === t; }); return f.map(function (x) { return esc(x.hinh_anh || '—'); }).join('<br>'); } },
      { h: 'KTV ghi', cls: 'nowrap', v: function (p) { var f = course(p).fx.filter(function (x) { return x.ngay === t; }); return f.map(function (x) { return esc(nameOf(x.ktv_email)) + ' <span class="muted mono">' + String(x.thoi_gian).slice(11, 16) + '</span>'; }).join('<br>'); } },
      C.st,
      { h: '', cls: 'act', v: function (p) { var f = course(p).fx.filter(function (x) { return x.ngay === t; }); return can('undoFraction') && f.length ? btn('undoFx', f[f.length - 1].id, 'Huỷ buổi này', 'danger') : ''; } }
    ], null, 'Chưa ghi buổi xạ nào hôm nay.');
    if (sub === 'abs') return html + group('abst', 'Vắng hôm nay', absT, [C.pt, C.rx,
      { h: 'Lý do', v: function (p) { return esc(course(p).absent[t]); } },
      { h: '', cls: 'act', v: function (p) { return (can('logFraction') ? btn('logFx', p.id, 'BN đến xạ muộn: ghi buổi xạ') : '') + (can('markAbsent') ? btn('absent', p.id, 'Sửa lý do') : ''); } }], null, 'Không có BN vắng hôm nay.');
    if (sub === 'off') return html + group('off', 'Nghỉ hôm nay (không có lịch)', off, [C.pt, C.rx, C.week, C.prog,
      { h: '', cls: 'act', v: function (p) { return can('logFraction') ? btn('logFx', p.id, 'Ghi buổi xạ bù') : ''; } }
    ], 'BN IMRT/VMAT vào ngày nghỉ trong tuần, hoặc BN có ngày bắt đầu sau hôm nay.', 'Không có.');
    return html + group('paused', 'Đang tạm ngừng', paused, [C.pt, C.prog,
      { h: 'Từ ngày', cls: 'nowrap', v: function (p) { return '<span class="num">' + fdw(p.tam_ngung_tu) + '</span><span class="sub">' + daysSince(p.tam_ngung_tu) + ' ngày</span>'; } },
      { h: 'Lý do', v: function (p) { return esc(p.ly_do_tam_ngung); } },
      { h: '', cls: 'act', v: function (p) { return (can('resume') ? btn('resume', p.id, 'Tiếp tục xạ') : '') + (can('logFraction') ? btn('logFx', p.id, 'Ghi buổi xạ', 'primary') : ''); } }
    ], null, 'Không có bệnh nhân tạm ngừng.');
  }

  // ---------- KTV: lịch tuần ----------
  function renderWeek() {
    var t = today();
    if (!S.week) S.week = RT.monday(t);
    var days = [0, 1, 2, 3, 4, 5].map(function (i) { return RT.addDays(S.week, i); });
    var machines = S.data.dm.MAY || [];
    var may = S.fMay || machines[0];
    var e = env();
    var list = pts().filter(function (p) {
      if ((p.may || machines[0]) !== may) return false;
      if (p.trang_thai === 'DANG_XA' || p.trang_thai === 'TAM_NGUNG') return true;
      return p.trang_thai === 'CHO_XA' && p.ngay_du_kien && p.ngay_du_kien <= days[5];
    }).sort(byName);
    var counts = days.map(function () { return 0; });
    var downs = (S.data.exceptions || []).filter(function (x) { return x.loai === 'MAY_NGHI' && x.may === may && x.ngay >= t; }).sort(function (a, b) { return a.ngay < b.ngay ? -1 : 1; });
    var rows = list.map(function (p) {
      var c = course(p);
      var cells = days.map(function (d, i) {
        var cls = 'wk', txt = '', title = fdw(d);
        var holiday = S.data.holidays.indexOf(d) >= 0, down = RT.isDown(p, d, e);
        var ex = RT.exceptionOf(p, d, e);
        var pi = c.projected.indexOf(d);
        var fxIdx = -1;
        c.fx.forEach(function (f, k) { if (f.ngay === d) fxIdx = k; });
        if (fxIdx >= 0) { cls += ' done'; txt = '✓ ' + (fxIdx + 1); counts[i]++; title += ': đã xạ buổi ' + (fxIdx + 1); }
        else if (holiday || down) { cls += ' closed'; txt = holiday ? 'Lễ' : 'Máy nghỉ'; }
        else if (pi >= 0) {
          var n = c.done + pi + 1;
          cls += pi >= c.tentativeFrom ? ' plan tent' : ' plan'; txt = String(n); counts[i]++;
          title += ': dự kiến buổi ' + n + (pi >= c.tentativeFrom ? ' (chờ KH boost)' : '');
        } else if (d < t && c.missed.indexOf(d) >= 0) { cls += ' miss'; txt = 'vắng'; }
        else if (RT.isTreatDay(p, d, e) && p.trang_thai === 'TAM_NGUNG') { cls += ' paused'; txt = 'ngừng'; }
        else { cls += ' off'; txt = '–'; }
        if (ex) { cls += ' ex'; title += ex === 'NGHI' ? ' · nghỉ riêng tuần này' : ' · xạ thêm riêng tuần này'; }
        var editable = can('setDay') && d >= t && fxIdx < 0 && !holiday && !down && p.trang_thai !== 'TAM_NGUNG' && (c.open || c.done < c.total);
        if (d === t) cls += ' today';
        return editable ? '<td><button class="' + cls + '" data-wk="' + esc(p.id) + '" data-d="' + d + '" title="' + esc(title + ' · bấm để đổi xạ/nghỉ') + '">' + txt + '</button></td>'
          : '<td><span class="' + cls + '" title="' + esc(title) + '">' + txt + '</span></td>';
      }).join('');
      return '<tr><td class="wk-pt" data-open="' + esc(p.id) + '">' + ptCell(p) + '</td><td class="nowrap">' + esc(c.cur.ky_thuat) + (c.multi ? ' <span class="tag boost">' + c.cur.label + '</span>' : '') +
        '<span class="sub">' + (RT.needsOffDay(p) ? (can('setOffDay') ? '<button class="lnk sm" data-do="offDay" data-id="' + esc(p.id) + '" style="color:var(--warn)">Chưa rõ ngày nghỉ: chọn</button>' : '<span style="color:var(--warn)">Chưa rõ ngày nghỉ (tạm xạ T7)</span>') : esc(RT.scheduleLabel(p))) + '</span></td>' +
        '<td class="nowrap num">' + c.done + '/' + c.total + '<span class="sub">KT ' + fd(c.end) + '</span></td>' + cells + '</tr>';
    }).join('');
    var head = days.map(function (d) { return '<th class="' + (d === t ? 'wk-today' : '') + '">' + fdw(d) + '</th>'; }).join('');
    var foot = counts.map(function (n, i) { return '<td class="wk-count' + (days[i] === t ? ' wk-today' : '') + '"><b>' + n + '</b> ca</td>'; }).join('');
    var html = '<div class="page-head"><div><h1>Lịch tuần</h1><p>Bấm vào một ô để đổi ngày xạ ↔ nghỉ cho riêng tuần đó. Ngày nghỉ cố định hằng tuần đổi ở nút “Xếp lịch”.</p></div>' +
      '<div class="filters">' + noticeBtn() + (machines.length > 1 ? '<select data-filter="fMay" aria-label="Chọn máy">' + opts(machines, may) + '</select>' : '') +
      '<div class="seg"><button data-wknav="-7" aria-label="Tuần trước">‹</button><button data-wknav="0">Tuần này</button><button data-wknav="7" aria-label="Tuần sau">›</button></div></div></div>';
    html += '<div class="card pad"><div class="group-head"><h3>' + esc(may) + ' · ngày máy nghỉ sắp tới</h3>' + (can('machineDown') ? '<button class="btn" data-mdown="1">+ Ghi ngày máy nghỉ</button>' : '') + '</div>' +
      (downs.length ? '<div class="chips">' + downs.map(function (x) { return '<span class="chip">' + fdw(x.ngay) + (x.ghi_chu ? ' · ' + esc(x.ghi_chu) : '') + (can('machineUp') ? '<button aria-label="Bỏ" data-mup="' + esc(x.id) + '">×</button>' : '') + '</span>'; }).join('') + '</div>'
        : '<span class="muted">Không có. Khi máy bảo trì hoặc hỏng, ghi vào đây để lịch của BN tự lùi.</span>') + '</div>';
    html += '<div class="legend"><span><i style="background:var(--ktv-soft)"></i>Đã xạ</span><span><i style="border:1px solid var(--accent-2);background:var(--accent-soft)"></i>Dự kiến xạ</span><span><i style="border:1px dashed var(--ks)"></i>Chờ KH boost</span><span><i style="background:var(--warn-soft);border:1px solid var(--warn)"></i>Ghi bù</span><span><i style="background:var(--crit-soft)"></i>Vắng (bấm để ghi lý do)</span><span><i style="box-shadow:inset 0 0 0 2px var(--warn)"></i>Đổi riêng tuần này</span></div>';
    html += list.length ? '<div class="card"><div class="tbl-wrap"><table class="wk-table"><thead><tr><th>Bệnh nhân</th><th>Kỹ thuật · lịch</th><th>Buổi</th>' + head + '</tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td colspan="3" class="wk-count">Tổng số ca</td>' + foot + '</tr></tfoot></table></div></div>'
      : '<div class="card"><div class="empty">Không có bệnh nhân xạ trên ' + esc(may) + ' trong tuần này.</div></div>';
    return html;
  }
  function bindWeek() {
    $$('#main [data-wknav]').forEach(function (b) { b.onclick = function () { var n = +b.dataset.wknav; S.week = n ? RT.addDays(S.week, n) : RT.monday(today()); renderMain(); }; });
    $$('#main [data-wk]').forEach(function (b) {
      b.onclick = function () {
        var p = byId(b.dataset.wk), d = b.dataset.d;
        run('setDay', { bn_id: p.id, ngay: d, xa: !RT.isTreatDay(p, d, env()) });
      };
    });
    $$('#main [data-mup]').forEach(function (b) { b.onclick = function () { run('machineUp', { id: b.dataset.mup }); }; });
    $$('#main [data-mdown]').forEach(function (b) {
      b.onclick = function () {
        var machines = S.data.dm.MAY || [];
        modal({ title: 'Ghi ngày máy nghỉ', ok: 'Ghi máy nghỉ', btnClass: 'danger',
          body: '<div class="form">' + field('Máy', '<select name="may">' + opts(machines, S.fMay || machines[0]) + '</select>') +
            field('Ngày', '<input type="date" name="ngay" min="' + today() + '" value="' + today() + '">') +
            field('Lý do', '<input type="text" name="ghi_chu" placeholder="VD: Bảo trì định kỳ, hỏng MLC">', 'full') + '</div>' +
            '<p class="muted">BN xạ trên máy này sẽ được lùi lịch thêm một buổi. KTV vẫn nên báo trước cho BN.</p>',
          validate: function (v) { return v.ngay ? '' : 'Chọn ngày.'; },
          onOk: function (v) { run('machineDown', v); } });
      };
    });
  }

  // ---------- KTV: xếp lịch ----------
  function renderSchedule() {
    var t = today();
    var noDate = pts().filter(function (p) { return p.trang_thai === 'CHO_XA' && !p.ngay_du_kien; }).sort(schedOrder);
    var dated = pts().filter(function (p) { return p.trang_thai === 'CHO_XA' && p.ngay_du_kien; }).sort(function (a, b) { return a.ngay_du_kien < b.ngay_du_kien ? -1 : 1; });
    var upcoming = items().filter(function (p) { return ['CHO_KH', 'DANG_KH', 'CHO_QA'].indexOf(p.trang_thai) >= 0; }).sort(schedOrder);
    var tx = pts().filter(function (p) { return p.trang_thai === 'DANG_XA'; }).sort(function (a, b) { return (RT.needsOffDay(b) ? 1 : 0) - (RT.needsOffDay(a) ? 1 : 0) || byName(a, b); });
    var schedAct = { h: '', cls: 'act', v: function (p) {
      if (p._g) return '';
      var started = ['DANG_XA', 'TAM_NGUNG'].indexOf(p.trang_thai) >= 0, dx = proposal(p);
      if (dx && !started && ktvLead()) return '<span class="flag">Đề xuất cũ: ' + fdw(dx.ngay_du_kien) + '</span>' + btn('approveSched', p.id, 'Xếp theo đề xuất', 'primary') + btn('schedule', p.id, 'Xếp lịch khác');
      if (!can('schedule')) return '';
      return btn('schedule', p.id, started ? 'Đổi lịch' : 'Xếp lịch', p.ngay_du_kien || started ? '' : 'primary');
    } };

    // tải máy 6 ngày làm việc tới
    var days = [], d = t;
    for (var i = 0; days.length < 6 && i < 14; i++, d = RT.addDays(d, 1)) if (RT.dow(d) !== 0) days.push(d);
    var loadPts = pts().filter(function (p) { return ['CHO_XA', 'DANG_XA'].indexOf(p.trang_thai) >= 0; });
    var load = days.map(function (day) {
      var n = 0;
      loadPts.forEach(function (p) { var c = course(p); if (c.projected.indexOf(day) >= 0 || (day === t && c.doneToday)) n++; });
      return '<div class="' + (day === t ? 'today' : '') + '"><span class="d">' + fdw(day) + '</span><span class="v">' + n + '</span></div>';
    }).join('');

    var html = '<div class="page-head"><div><h1>Xếp lịch xạ</h1><p>3D-CRT: xạ T2–T6. IMRT/VMAT: chọn một ngày nghỉ trong tuần, xạ bù Thứ Bảy.</p>' + PR_LEGEND + '</div></div>';
    html += quotaBox();
    var pend = pendingSched();
    if (pend.length) html += group('pend', ktvLead() ? 'Đề xuất lịch chờ bạn duyệt' : 'Đề xuất lịch chờ người xếp lịch duyệt', pend, approveCols(), null, '');
    html += '<section class="group"><div class="group-head"><h2>Số BN dự kiến xạ 6 ngày tới</h2><span class="hint">Dùng để cân đối ngày nghỉ của BN IMRT/VMAT</span></div><div class="load">' + load + '</div></section>';
    var sims = items().filter(function (x) { return x.trang_thai === 'MO_PHONG'; }).sort(function (a, b) { return (a.ngay_mo_phong || '9') < (b.ngay_mo_phong || '9') ? -1 : 1; });
    if (sims.length) html += group('sim', 'Chờ mô phỏng', sims, [C.pt, C.rx, { h: 'Loại', v: function (p) { return p._g ? '<span class="tag boost">Mô phỏng lại (' + phKind(p._g) + ')</span>' : 'Mô phỏng lần đầu'; } },
      { h: 'Hẹn mô phỏng', cls: 'nowrap', v: function (p) { return p.ngay_mo_phong ? '<span class="num">' + fdw(p.ngay_mo_phong) + '</span>' : '<span class="muted">Chưa hẹn</span>'; } },
      { h: 'Hạn', v: function (p) { return boostFlag(p) || '<span class="muted">—</span>'; } }, C.bs,
      { h: '', cls: 'act', v: function (p) { return can('simDone') ? btn('simDone', p.id, 'Đã mô phỏng xong', 'primary') : ''; } }], null, '');
    html += group('nodate', 'Chờ vào xạ, chưa có lịch', noDate, [C.pt, C.rx, C.week,
      { h: 'Sẵn sàng từ', cls: 'nowrap', v: function (p) { var s = p.ngay_qa || p.ngay_kh_xong; return '<span class="num">' + fd(s) + '</span><span class="sub">' + (p.qa_ket_qua === 'Đạt' ? 'QA đạt' : 'Không cần QA') + '</span>'; } },
      C.pr, C.bs, schedAct], 'Thứ tự: Cấp cứu → Boost → Thường / Ưu tiên; trong mỗi nhóm, sẵn sàng trước xếp trước.', 'Tất cả BN chờ vào xạ đã có lịch.');
    html += group('dated', 'Chờ vào xạ, đã có lịch', dated, [C.pt, C.rx, C.expected, C.week, C.end, schedAct], null, 'Không có.');
    html += group('tx', 'Đang xạ', tx, [C.pt, C.rx, C.week, C.prog, C.end, schedAct], null, 'Không có bệnh nhân đang xạ.');
    html += group('up', 'Sắp chuyển xạ', upcoming, [C.pt, C.rx, C.pr, C.st, { h: C.expected.h, cls: 'nowrap', v: function (p) { return p._g ? (boostFlag(p) || '<span class="muted">Boost nối tiếp GĐ trước</span>') : C.expected.v(p); } }, schedAct], 'BN đang lập KH hoặc chờ QA (kể cả KH boost). Xếp: Cấp cứu → Boost → nộp trước. Có thể xếp lịch trước ngày dự kiến.', 'Không có.');
    return html;
  }

  function approveCols() {
    return [C.pt, C.pr,
      { h: 'Đề xuất', cls: 'nowrap', v: function (p) { var d = proposal(p); return '<b class="num">Bắt đầu ' + fdw(d.ngay_du_kien) + '</b><span class="sub">' + (d.ngay_nghi_tuan ? 'T2–T7, nghỉ ' + RT.DOW[d.ngay_nghi_tuan] : 'T2–T6') + (d.may ? ' · ' + esc(d.may) : '') + (d.vuot ? ' · <b>người đề xuất đồng ý vượt chỉ tiêu</b>' : '') + '</span>'; } },
      { h: 'Chỗ của khoa ngày đó', cls: 'nowrap', v: function (p) { var d = proposal(p), q = RT.quotas(S.data.dm)[p.khoa]; if (!q) return esc(p.khoa || '—'); var n = khoaLoad(p, d.ngay_du_kien), ov = RT.quotaOver(pts(), S.data.fractions, env(), S.data.dm, p, d.ngay_du_kien, d.ngay_nghi_tuan, today());
        return esc(p.khoa) + ': <b class="num">' + (n + 1) + '/' + q.max + '</b><span class="sub">' + (n + 1 > q.max ? '<b>Vượt ' + (n + 1 - q.max) + '</b>' : 'Còn ' + (q.max - n - 1)) + ' sau khi thêm</span>' + (ov && !ov.dau ? '<span class="sub"><b>' + fdw(ov.ngay) + ': ' + ov.n + '/' + ov.max + '</b> (2 tuần đầu)</span>' : ''); } },
      { h: 'Người đề xuất', v: function (p) { var u = S.data.users.filter(function (x) { return x.email === p.de_xuat_boi; })[0]; return '<b>' + esc(u ? u.ho_ten : p.de_xuat_boi) + '</b><span class="sub">' + (u ? esc(RT.ROLES[u.vai_tro] || '') + (u.khoa ? ' · ' + esc(u.khoa) : '') + ' · ' : '') + esc(String(p.de_xuat_luc || '').replace('T', ' ').slice(5, 16)) + '</span>'; } },
      C.bs,
      { h: '', cls: 'act', v: function (p) { return ktvLead() ? btn('approveSched', p.id, 'Xem / sửa và duyệt', 'primary') + btn('rejectSched', p.id, 'Trả lại', 'danger') : ''; } }];
  }
  /** KTV trưởng: duyệt đề xuất lịch xạ của KTV, điều dưỡng */
  function renderApprove() {
    var list = pendingSched();
    return '<div class="page-head"><div><h1>' + (ktvLead() ? 'Duyệt lịch xạ' : 'Đề xuất lịch chờ duyệt') + '</h1><p>KTV đề xuất ngày vào xạ; người xếp lịch xem người đề xuất, chỗ của khoa, sửa nếu cần rồi duyệt. Duyệt xong BN vào hàng “Chờ vào xạ, đã có lịch”.</p></div></div>' +
      quotaBox() + group('pend', 'Chờ duyệt', list, approveCols(), 'Cũ nhất ở trên.', 'Không có đề xuất nào chờ duyệt.');
  }

  // ---------- Chờ phân loại: BN nhập từ hồ sơ giấy ----------
  var IMPORT_COLS = RT.IMPORT_COLS;
  function renderPL() {
    var list = pts().filter(function (p) { return p.trang_thai === 'CHO_PL'; }).sort(byName);
    return '<div class="page-head"><div><h1>Chờ phân loại</h1><p>BN nhập từ sổ HIS (mô phỏng từ trước) hoặc số hoá từ hồ sơ giấy. Bấm “Phân loại” để chuyển về đúng giai đoạn hiện tại (contour, lập KH, QA, chờ xạ, đang xạ, tạm ngừng, đã xạ xong, không xạ) và điền thông tin còn thiếu. BS, KTV, KS đều phân loại được.</p></div>' +
      (can('importPatients') ? '<div class="filters"><button class="btn primary" data-plimport="1">Nhập danh sách BN</button></div>' : '') + '</div>' +
      group('pl', 'Chờ phân loại', list, [C.pt, C.dx,
        { h: 'Kỹ thuật · liều', cls: 'nowrap', v: function (p) { return esc(p.ky_thuat || '—') + (p.tong_lieu ? '<span class="sub">' + esc(p.tong_lieu) + ' Gy / ' + esc(p.so_buoi) + ' buổi</span>' : ''); } },
        C.bs,
        { h: 'Mô phỏng', cls: 'nowrap', v: function (p) { return p.ngay_mo_phong ? '<span class="num">' + fdy(p.ngay_mo_phong) + '</span>' : '<span class="muted">—</span>'; } },
        { h: 'Đã xạ', cls: 'nowrap', v: function (p) { var f = plFx(p); return f.length ? '<b class="num">' + f.length + ' buổi</b><span class="sub">' + fd(f[0].ngay) + ' → ' + fd(f[f.length - 1].ngay) + (RT.diffDays(f[f.length - 1].ngay, today()) > 7 ? ' · <b style="color:var(--warn)">lâu chưa xạ: đã xong / tạm ngừng?</b>' : '') + '</span>' : '<span class="muted">—</span>'; } },
        { h: 'Ghi chú', v: function (p) { return '<span class="sub" style="white-space:pre-line">' + esc(p.ghi_chu || '') + '</span>'; } },
        { h: '', cls: 'act', v: function (p) { return (canClassify(p) ? btn('classify', p.id, 'Phân loại', 'primary') : '') + (can('logFraction') && plFx(p).length && p.ky_thuat ? btn('logFx', p.id, 'Quay lại xạ: ghi buổi', 'ok') : ''); } }],
        null, 'Không có BN chờ phân loại.');
  }
  function importForm() {
    modal({ title: 'Nhập danh sách BN từ hồ sơ giấy', ok: 'Nhập', wide: true,
      body: '<p>Copy các dòng từ Google Sheet / Excel rồi dán vào ô dưới (mỗi dòng một BN, có hoặc không có dòng tiêu đề). Thứ tự cột:</p>' +
        '<p class="mono" style="font-size:12.5px">' + IMPORT_COLS.map(function (c) { return esc(c[1]); }).join(' · ') + '</p>' +
        '<textarea name="bang" rows="10" style="width:100%;font-family:monospace;font-size:12.5px" placeholder="Dán bảng vào đây"></textarea><p class="muted" id="imp-n"></p>',
      onMount: function (form) { var ta = $('textarea', form), n = $('#imp-n', form); ta.addEventListener('input', function () { n.textContent = parseImport(ta.value).length + ' BN đọc được.'; }); },
      validate: function (v) { return parseImport(v.bang).length ? '' : 'Chưa đọc được dòng nào (cần ít nhất mã HIS và họ tên).'; },
      onOk: function (v) { toast('Đang lưu lên máy chủ…'); serverRun('importPatients', { rows: parseImport(v.bang) }).catch(function (e) { toast(errText(e) || 'Không nhập được.', true); }); } });
  }
  function parseImport(text) {
    return String(text || '').split(/\r?\n/).map(function (line) { return line.split(line.indexOf('\t') >= 0 ? '\t' : /;|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(function (x) { return x.trim().replace(/^"|"$/g, ''); }); })
      .filter(function (c) { return c.length >= 2 && c[0] && c[1] && !/^m[aã] his$/i.test(c[0]) && !/^stt$/i.test(c[0]); })
      .map(function (c) { var o = {}; IMPORT_COLS.forEach(function (k, i) { if (c[i]) o[k[0]] = c[i]; }); return o; });
  }
  function plFx(p) { return S.data.fractions.filter(function (f) { return f.bn_id === p.id && !RT.isParFx(f); }).sort(function (a, b) { return a.ngay < b.ngay ? -1 : 1; }); }
  /** Chuyển BS điều trị: BS đang điều trị, BS nhận, trưởng khoa, quản trị */
  function canTransfer(p) { return can('transferDoctor') && p.trang_thai !== 'HUY' && (role() === 'ADMIN' || me().chuc_vu === 'Trưởng khoa' || RT.myDoctors(me()).indexOf(p.bs_email) >= 0 || isDoctor(me())); }
  function transferForm(fromEmail, preIds) {
    var docs = treatDoctors().map(function (u) { return { v: u.email, l: u.ho_ten }; });
    var single = preIds && preIds.length === 1, me0 = me().email;
    var listOf = function (from) { return pts().filter(function (p) { return p.bs_email === from && ['HUY'].indexOf(p.trang_thai) < 0 && (p.trang_thai !== 'HOAN_THANH' || (preIds || []).indexOf(p.id) >= 0); }).sort(byName); };
    var rowsHtml = function (from, pre) {
      var l = listOf(from);
      return l.length ? l.map(function (p) { return '<label class="imp-row" style="cursor:pointer"><input type="checkbox" name="ids" data-multi="1" value="' + esc(p.id) + '"' + ((pre || []).indexOf(p.id) >= 0 ? ' checked' : '') + '><div class="imp-main"><b>' + esc(p.ho_ten) + '</b> <span class="sub-in mono">' + esc(p.ma_his) + '</span> ' + stPill(p) + '<div class="imp-dx">' + esc(p.chan_doan || '') + '</div></div></label>'; }).join('') : '<p class="muted">BS này không có BN nào.</p>';
    };
    var from0 = fromEmail || me0;
    modal({ title: 'Chuyển BS điều trị', ok: 'Chuyển BN', wide: !single, btnClass: 'danger',
      body: (single ? whoBox(byId(preIds[0])) : '') +
        '<div class="form">' + field('Từ BS', single ? '<input type="text" value="' + esc(nameOf(from0)) + '" readonly><input type="hidden" name="from" value="' + esc(from0) + '">' : '<select name="from" id="tr-from">' + opts(docs, from0) + '</select>') +
        field('Chuyển sang BS <span class="req">*</span>', '<select name="bs_email" id="tr-to">' + opts(docs.filter(function (x) { return x.v !== from0 || !single; }), from0 === me0 ? '' : me0, 'Chọn bác sĩ nhận') + '</select>') +
        field('Lý do', '<input type="text" name="ly_do" placeholder="VD: BS mới điều trị chính (trước dùng tài khoản HIS của BS khác)">', 'full') + '</div>' +
        (single ? '<input type="hidden" name="ids" data-multi="1" value="' + esc(preIds[0]) + '">' : '<div class="imp-list" id="tr-list">' + rowsHtml(from0, preIds) + '</div>') +
        '<div class="confirm" style="margin-top:12px;background:var(--crit-soft)"><span>⚠ BN sẽ <b>rời khỏi danh sách của BS cũ</b> và chuyển sang BS mới: từ nay BS mới nhận việc contour, đánh giá, thông báo vắng buổi; khoa của BN đổi theo khoa của BS mới. Thao tác được ghi vào nhật ký.</span></div>' +
        '<label class="confirm"><input type="checkbox" name="xac_nhan"><span>Tôi xác nhận chuyển BS điều trị cho các BN đã chọn.</span></label>',
      onMount: function (form) {
        var f = $('#tr-from', form);
        if (f) f.addEventListener('change', function () { $('#tr-list', form).innerHTML = rowsHtml(f.value, []); });
      },
      validate: function (v) {
        if (!v.bs_email) return 'Chọn bác sĩ nhận BN.';
        if (v.bs_email === v.from) return 'BS nhận phải khác BS hiện tại.';
        if (!(v.ids || []).length) return 'Chọn ít nhất một BN.';
        if (!v.xac_nhan) return 'Đánh dấu xác nhận trước khi chuyển.';
        var r0 = role() === 'ADMIN' || me().chuc_vu === 'Trưởng khoa', mine = RT.myDoctors(me());
        if (!r0 && mine.indexOf(v.from) < 0 && mine.indexOf(v.bs_email) < 0) return 'Chỉ BS đang điều trị, BS nhận, trưởng khoa hoặc quản trị được chuyển.';
        return '';
      },
      onOk: function (v) { run('transferDoctor', { ids: [].concat(v.ids || []), bs_email: v.bs_email, ly_do: v.ly_do }); } });
  }
  function canClassify(p) { return can('classifyPatient') && (role() !== 'BS' || !p.bs_email || RT.myDoctors(me()).indexOf(p.bs_email) >= 0); }
  function classifyForm(p) {
    var d = S.data.dm, t = today();
    var bsList = treatDoctors().map(function (u) { return { v: u.email, l: u.ho_ten }; });
    var inp = function (name, type, attrs) { return '<input type="' + (type || 'text') + '" name="' + name + '" value="' + esc(p[name] || '') + '" ' + (attrs || '') + '>'; };
    var STEPS_PL = [['CONTOUR', 'Đang contour', 'Đã mô phỏng, BS chưa contour xong'], ['CHO_KH', 'Chờ lập KH', 'Contour xong, chưa KS nào nhận'], ['DANG_KH', 'Đang lập KH', 'KS đang lập'],
      ['CHO_QA', 'Chờ QA', 'Lập KH xong, chờ QA'], ['CHO_XA', 'Chờ vào xạ', 'Chưa xạ buổi nào'], ['DANG_XA', 'Đang xạ', 'Đã xạ một số buổi'], ['TAM_NGUNG', 'Tạm ngừng', 'Đã xạ một số buổi, đang nghỉ'],
      ['HOAN_THANH', 'Đã xạ xong', 'Chi tiết không bắt buộc'], ['KHONG_XA', 'Không xạ', 'Đã mô phỏng, BN không xạ nữa (vẫn vào sổ mô phỏng)'], ['HUY', 'Huỷ hồ sơ', 'Nhập nhầm (không vào sổ mô phỏng)']];
    var ksList = activeUsers('KS').map(function (u) { return { v: u.email, l: u.ho_ten }; });
    var nf = function (h) { return h.replace('<div class="field ', '<div data-notfor="CONTOUR" class="field '); };
    var hadFx = plFx(p);
    var fullFx = function (v) { return hadFx.length && (v.buoc === 'DANG_XA' || v.buoc === 'TAM_NGUNG') && RT.num(v.so_buoi) === hadFx.length; };
    if (hadFx.length) STEPS_PL = STEPS_PL.filter(function (x) { return ['DANG_XA', 'TAM_NGUNG', 'HOAN_THANH', 'HUY'].indexOf(x[0]) >= 0; });
    if (!RT.canCancel(p, S.data.fractions)) STEPS_PL = STEPS_PL.filter(function (x) { return x[0] !== 'HUY'; });
    modal({ title: 'Phân loại BN', ok: 'Chuyển', wide: true,
      body: whoBox(p) + (p.ghi_chu ? '<p class="muted" style="white-space:pre-line">' + esc(p.ghi_chu) + '</p>' : '') +
        (hadFx.length ? '<div class="confirm" style="cursor:default;font-weight:500">Đã có <b>&nbsp;' + hadFx.length + ' buổi xạ&nbsp;</b> (' + fdy(hadFx[0].ngay) + ' → ' + fdy(hadFx[hadFx.length - 1].ngay) + ', nhập từ HIS). Chọn <b>&nbsp;Đang xạ&nbsp;</b> để KTV xạ tiếp (tổng liều, số buổi chưa biết thì để trống, BS bổ sung sau), hoặc Đã xạ xong.</div>' : '') +
        '<div class="field full"><span class="lb">Chuyển sang <span class="req">*</span></span><div class="radios">' + STEPS_PL.map(function (x) { return '<label><input type="radio" name="buoc" value="' + x[0] + '"><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span></label>'; }).join('') + '</div></div>' +
        '<div class="form" data-pl="info">' +
        field('Bác sĩ điều trị <span class="req">*</span>', '<select name="bs_email">' + bsOptions(bsList, p.bs_email) + '</select>') +
        field('Năm sinh <span class="req">*</span>', inp('nam_sinh', 'number', 'min="1900" max="2100"')) +
        icdField(p.icd, true, p.icd_phu) +
        field('Chẩn đoán <span class="req">*</span>', inp('chan_doan'), 'full') +
        viTriField(p.vi_tri, 'dl-vitri3') +
        nf(field('Mục đích', '<select name="muc_dich">' + opts(d.MUC_DICH || RT.DEFAULT_DM.MUC_DICH, p.muc_dich, '—') + '</select>')) +
        nf(field('Kỹ thuật <span class="req">*</span>', '<select name="ky_thuat">' + opts(d.KY_THUAT, p.ky_thuat, 'Chọn kỹ thuật') + '</select>')) +
        nf(field('Tổng liều (Gy) <span class="req">*</span>', inp('tong_lieu', 'number', 'step="0.01" min="0"'))) +
        nf(field('Số buổi <span class="req">*</span>', inp('so_buoi', 'number', 'step="1" min="1" max="60"'))) +
        field('Lịch trong tuần', '<select name="ngay_nghi_tuan">' + weekOpts(p.ngay_nghi_tuan) + '</select>').replace('<div class="field ', '<div data-for="CHO_XA DANG_XA TAM_NGUNG HOAN_THANH" class="field ') + '</div>' +
        (hadFx.length ? '<label class="confirm full" id="pl-done" hidden><input type="checkbox" name="xac_nhan_xong"><span>BN đã xạ đủ&nbsp;<b>' + hadFx.length + '/' + hadFx.length + ' buổi</b>&nbsp;bằng tổng số buổi vừa nhập: xác nhận chuyển sang “Đã xạ xong”</span></label>' : '') +
        '<div class="form">' +
        '<div class="field" data-for="' + (hadFx.length ? 'X' : 'DANG_XA TAM_NGUNG HOAN_THANH') + '"><label>Ngày bắt đầu xạ <span class="req" data-for="DANG_XA TAM_NGUNG">*</span></label><input type="date" name="ngay_bat_dau" max="' + t + '"></div>' +
        '<div class="field" data-for="' + (hadFx.length ? 'X' : 'DANG_XA TAM_NGUNG') + '"><label>Số buổi đã xạ <span class="req">*</span></label><input type="number" name="da_xa" min="0" step="1"></div>' +
        '<div class="field" data-for="CHO_XA"><label>Ngày xạ dự kiến</label><input type="date" name="ngay_du_kien"></div>' +
        '<div class="field" data-for="DANG_KH CHO_QA"><label>Kỹ sư phụ trách <span class="req" data-for="DANG_KH">*</span></label><select name="ks_email">' + opts(ksList, p.ks_email || '', 'Chọn kỹ sư') + '</select></div>' +
        '<div class="field" data-for="HOAN_THANH"><label>Ngày kết thúc xạ</label><input type="date" name="ngay_ket_thuc" max="' + t + '"></div>' +
        '<div class="field full" data-for="KHONG_XA"><label>Lý do không xạ <span class="req">*</span></label><input type="text" name="ly_do_kx"></div>' +
        '<div class="field" data-for="TAM_NGUNG"><label>Tạm ngừng từ</label><input type="date" name="tam_ngung_tu" max="' + t + '" value="' + t + '"></div>' +
        '<div class="field" data-for="TAM_NGUNG"><label>Lý do tạm ngừng <span class="req">*</span></label><select name="ly_do_tn">' + opts(d.LY_DO_TAM_NGUNG, '', 'Chọn lý do') + '</select></div>' +
        '<div class="field full" data-for="HUY"><label>Lý do huỷ <span class="req">*</span></label><input type="text" name="ly_do_huy"></div></div>',
      onMount: function (form) {
        bindIcd(form);
        var upd = function () {
          var b = formValues(form).buoc || '';
          $$('[data-for]', form).forEach(function (el) { el.hidden = el.dataset.for.split(' ').indexOf(b) < 0; });
          $$('[data-notfor]', form).forEach(function (el) { el.hidden = el.dataset.notfor.split(' ').indexOf(b) >= 0; });
          var pd = $('#pl-done', form); if (pd) pd.hidden = !fullFx(formValues(form));
          $('[data-pl=info]', form).hidden = b === 'HUY' || b === 'KHONG_XA';
          var opt = b === 'HOAN_THANH' || b === 'CONTOUR';
          $$('[data-pl=info] .req', form).forEach(function (el) { var f = el.closest('.field'), nm = f && $('[name]', f); el.hidden = opt && !(nm && nm.name === 'bs_email'); });
        };
        $$('input[name=buoc]', form).forEach(function (el) { el.addEventListener('change', upd); });
        var sb = $('input[name=so_buoi]', form); if (sb) sb.addEventListener('input', upd); upd();
      },
      validate: function (v) {
        if (!v.buoc) return 'Chọn mục cần chuyển tới.';
        if (v.buoc === 'HUY') return v.ly_do_huy ? '' : 'Cần ghi lý do huỷ.';
        if (v.buoc === 'KHONG_XA') return v.ly_do_kx ? '' : 'Cần ghi lý do không xạ.';
        if (!v.bs_email) return 'Chọn bác sĩ điều trị.';
        if (v.buoc === 'CONTOUR') return '';
        if (fullFx(v)) return !v.ky_thuat || !(RT.num(v.tong_lieu) > 0) ? 'Cần kỹ thuật và tổng liều.' : v.xac_nhan_xong ? '' : 'BN đã xạ đủ ' + hadFx.length + ' buổi: đánh dấu ô xác nhận để chuyển sang “Đã xạ xong”.';
        if (v.buoc === 'HOAN_THANH') return v.ngay_bat_dau && !(v.ky_thuat && RT.num(v.tong_lieu) > 0 && RT.num(v.so_buoi) >= 1) ? 'Có ngày bắt đầu thì cần đủ kỹ thuật, tổng liều, số buổi (hoặc để trống cả).' : '';
        if (hadFx.length && (v.buoc === 'DANG_XA' || v.buoc === 'TAM_NGUNG') && v.so_buoi === '') return v.ky_thuat ? (v.buoc === 'TAM_NGUNG' && !v.ly_do_tn ? 'Chọn lý do tạm ngừng.' : '') : 'Chọn kỹ thuật xạ.';
        if (!RT.isIcd(RT.normIcd(v.icd))) return 'Cần mã ICD-10 3 ký tự (VD: C50).';
        if (!v.chan_doan || !v.ky_thuat || !(RT.num(v.tong_lieu) > 0) || !(RT.num(v.so_buoi) >= 1)) return 'Cần đủ chẩn đoán, kỹ thuật, tổng liều, số buổi.';
        if (v.buoc === 'DANG_KH' && !v.ks_email) return 'Chọn kỹ sư phụ trách.';
        if (!hadFx.length && ['DANG_XA', 'TAM_NGUNG'].indexOf(v.buoc) >= 0 && !v.ngay_bat_dau) return 'Cần ngày bắt đầu xạ.';
        if (hadFx.length && v.buoc !== 'HOAN_THANH' && v.so_buoi !== '' && RT.num(v.so_buoi) <= hadFx.length) return 'BN đã xạ ' + hadFx.length + ' buổi: tổng số buổi phải lớn hơn, hoặc chọn "Đã xạ xong".';
        if (!hadFx.length && ((v.buoc === 'DANG_XA' && !(RT.num(v.da_xa) >= 1)) || (v.buoc === 'TAM_NGUNG' && v.da_xa === ''))) return 'Cần số buổi đã xạ.';
        if (v.buoc === 'TAM_NGUNG' && !v.ly_do_tn) return 'Chọn lý do tạm ngừng.';
        return '';
      },
      onOk: function (v) {
        var pl = { id: p.id, buoc: fullFx(v) ? 'HOAN_THANH' : v.buoc };
        if (v.buoc === 'HUY') pl.ly_do = v.ly_do_huy;
        else if (v.buoc === 'KHONG_XA') pl.ly_do = v.ly_do_kx;
        else {
          ['bs_email', 'nam_sinh', 'chan_doan', 'vi_tri', 'muc_dich', 'ky_thuat', 'tong_lieu', 'so_buoi', 'ngay_nghi_tuan', 'ngay_bat_dau', 'da_xa', 'ngay_du_kien', 'tam_ngung_tu', 'ks_email', 'ngay_ket_thuc'].forEach(function (k) { pl[k] = v[k]; });
          if (v.buoc === 'CONTOUR') ['muc_dich', 'ky_thuat', 'tong_lieu', 'so_buoi'].forEach(function (k) { delete pl[k]; });
          pl.icd = RT.normIcd(v.icd); pl.icd_phu = v.icd_phu; pl.ly_do = v.ly_do_tn;
        }
        run('classifyPatient', pl);
      } });
  }

  /** KS đổi kỹ thuật khi lập KH (chỉ kỹ thuật), có xác nhận Trước → Sau */
  function changeTechForm(p) {
    var others = (S.data.dm.KY_THUAT || []).filter(function (k) { return k !== p.ky_thuat; });
    modal({ title: 'Đổi kỹ thuật' + (p._g ? ' · ' + phKind(p._g) + (p._g.loai ? '' : ' GĐ' + p._g.stt) : ''), ok: 'Đổi kỹ thuật',
      body: whoBox(p) + '<p>BS chỉ định: <b>' + esc(p.ky_thuat || '—') + '</b>' + (p.tong_lieu ? ', ' + esc(p.tong_lieu) + ' Gy / ' + esc(p.so_buoi || '?') + ' buổi' : '') + '. Chỉ đổi kỹ thuật, giữ nguyên liều và số buổi.</p>' +
        '<div class="form">' + field('Kỹ thuật mới <span class="req">*</span>', '<select name="ky_thuat">' + opts(others, '', 'Chọn kỹ thuật') + '</select>') +
        field('Lý do', '<input type="text" name="ly_do" placeholder="VD: liều tim, phổi tốt hơn">') + '</div>' +
        '<div class="preview" id="ct-prev"></div>' +
        '<label class="confirm full"><input type="checkbox" name="xac_nhan"><span>Tôi xác nhận đổi kỹ thuật. Thay đổi được lưu vết và báo BS điều trị trên chuông.</span></label>',
      onMount: function (form) {
        var sel = $('select[name=ky_thuat]', form), pv = $('#ct-prev', form);
        var upd = function () { pv.innerHTML = sel.value ? 'Trước → Sau: <b>' + esc(p.ky_thuat || '—') + '</b> → <b>' + esc(sel.value) + '</b>' : 'Chọn kỹ thuật mới.'; };
        sel.addEventListener('change', upd); upd();
      },
      validate: function (v) { return !v.ky_thuat ? 'Chọn kỹ thuật mới.' : !v.xac_nhan ? 'Đánh dấu ô xác nhận trước khi đổi.' : ''; },
      onOk: function (v) { run('changeTech', { id: p.id, ky_thuat: v.ky_thuat, ly_do: v.ly_do }); } });
  }
  /** KTV sửa lịch trong tuần (VMAT chưa rõ ngày nghỉ, hoặc BN không xạ Thứ 7) */
  function offDayForm(p) {
    var cur = RT.needsOffDay(p) ? '' : String(RT.offDay(p) || '0');
    var ch = [['0', 'Thứ 2 → Thứ 6', 'Không xạ Thứ 7']].concat([1, 2, 3, 4, 5].map(function (i) { return [String(i), 'Thứ 2 → Thứ 7, nghỉ ' + RT.DOW[i], 'Nghỉ ' + RT.DOW[i] + ', xạ bù Thứ 7']; }));
    modal({ title: 'Lịch xạ trong tuần', ok: 'Lưu lịch tuần',
      body: whoBox(p) + (RT.needsOffDay(p) ? '<div class="confirm" style="cursor:default;font-weight:500">' + esc(p.ky_thuat) + ': chưa rõ BN nghỉ ngày nào trong tuần, ứng dụng đang tạm tính xạ cả Thứ 7.</div>' : '') +
        '<div class="field"><span class="lb">Lịch trong tuần</span><div class="radios">' + ch.map(function (x) {
          return '<label><input type="radio" name="nn" value="' + x[0] + '"' + (x[0] === cur ? ' checked' : '') + '><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span></label>';
        }).join('') + '</div></div>',
      validate: function (v) { return v.nn ? '' : 'Chọn lịch trong tuần.'; },
      onOk: function (v) { run('setOffDay', { id: p.id, ngay_nghi_tuan: v.nn }); } });
  }

  // ---------- Tất cả ----------
  function renderAll() {
    var q = fold(S.q), bsOn = byDoctorOn();
    var list = pts().filter(function (p) {
      if (q && fold(p.ho_ten).indexOf(q) < 0 && fold(p.ma_his).indexOf(q) < 0 && fold(p.id).indexOf(q) < 0) return false;
      if (S.fStatus && p.trang_thai !== S.fStatus) return false;
      if (bsOn && S.fBs && p.bs_email !== S.fBs) return false;
      if (S.fKhoa && p.khoa !== S.fKhoa) return false;
      return true;
    }).sort(byName);
    var bsList = doctors().map(function (u) { return { v: u.email, l: u.ho_ten }; });
    var stCount = {};
    pts().forEach(function (p) { if (S.fKhoa && p.khoa !== S.fKhoa) return; stCount[p.trang_thai] = (stCount[p.trang_thai] || 0) + 1; });
    var stChips = '<div class="chips st-chips">' + RT.STATUS_ORDER.filter(function (s) { return stCount[s]; }).map(function (s) {
      return '<button type="button" class="chip' + (S.fStatus === s ? ' on' : '') + '" data-stfilter="' + s + '" aria-pressed="' + (S.fStatus === s) + '">' + esc(RT.STATUS[s]) + ' <b class="num">' + stCount[s] + '</b></button>';
    }).join('') + '</div>';
    var html = '<div class="page-head"><div><h1>Tất cả bệnh nhân</h1><p>' + list.length + ' kết quả' + (S.q ? ' cho “' + esc(S.q) + '”' : '') + '. Gồm BN đang trong quy trình và BN kết thúc xạ trong 60 ngày qua.</p></div>' +
      '<div class="filters">' + (can('importHisBook') ? '<button class="btn" data-hisimport="1" title="Đọc sổ chuyên khoa xuất từ HIS (tệp Excel), thêm các BN có mô phỏng">Nhập từ sổ HIS</button>' : '') + '<select data-filter="fStatus" aria-label="Lọc trạng thái">' + opts(RT.STATUS_ORDER.map(function (s) { return { v: s, l: RT.STATUS[s] }; }), S.fStatus, 'Mọi trạng thái') + '</select>' +
      (bsOn ? '<select data-filter="fBs" aria-label="Lọc bác sĩ">' + opts(bsList, S.fBs, 'Mọi bác sĩ') + '</select>' : '') +
      (khoaFilterOn() ? '<select data-filter="fKhoa" aria-label="Lọc khoa">' + opts(S.data.dm.KHOA, S.fKhoa, 'Mọi khoa') + '</select>' : '') + '</div></div>';
    html += stChips;
    html += table(list, [C.pt, C.dx, C.rx, C.bs, C.st,
      { h: 'Tiến độ / ngày dự kiến', cls: 'nowrap', v: function (p) {
        if (['DANG_XA', 'TAM_NGUNG', 'HOAN_THANH'].indexOf(p.trang_thai) >= 0) return progCell(p) + (p.ly_do_ket_thuc ? '<span class="ended">Kết thúc sớm</span>' : '');
        return p.ngay_du_kien ? 'Dự kiến xạ <span class="num">' + fdw(p.ngay_du_kien) + '</span>' : '<span class="muted">—</span>';
      } }].concat(role() === 'KTV' ? [{ h: '', cls: 'act', v: function (p) { return txState(p).ok ? btn('logFx', p.id, '✓ Xác nhận xạ', 'ok') : ''; } }] : []), 'Không tìm thấy bệnh nhân phù hợp.');
    if (S.q && S.q.trim().length >= 2) {
      var key = S.q.trim();
      var res = S.archQ === key ? S.archRes : null;
      html += '<section class="group"><div class="group-head"><h2>Trong lưu trữ</h2><span class="hint">Đợt xạ đã kết thúc quá 60 ngày</span>' +
        (res ? '' : '<button class="btn" data-archsearch="1">Tìm “' + esc(key) + '” trong lưu trữ</button>') + '</div>' +
        (res ? table(res.map(function (id) { return S.arch.patients.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean), [C.pt, C.dx, C.rx, C.bs,
          { h: 'Thời gian', cls: 'nowrap', v: function (x) { return '<span class="num">' + fdy(x.ngay_bat_dau) + ' → ' + fdy(x.ngay_ket_thuc) + '</span>'; } }], 'Không có kết quả trong lưu trữ.') : '') + '</section>';
    }
    return html;
  }
  // ---------- Nhập BN từ sổ chuyên khoa HIS (tệp Excel) ----------
  var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  function loadScript(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = src; s.onload = ok;
      s.onerror = function () { no({ error: 'Không tải được thư viện đọc Excel. Kiểm tra kết nối mạng rồi thử lại.' }); };
      document.head.appendChild(s);
    });
  }
  function hisImportPick() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.xls,.xlsx'; inp.hidden = true;
    document.body.appendChild(inp);
    inp.onchange = function () { var f = inp.files && inp.files[0]; inp.remove(); if (f) hisImportRead(f); };
    inp.click();
  }
  function hisImportRead(file) {
    setBusy(1);
    var lib = window.XLSX ? Promise.resolve() : loadScript(XLSX_URL);
    lib.then(function () {
      return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = function () { no({ error: 'Không đọc được tệp.' }); }; r.readAsArrayBuffer(file); });
    }).then(function (buf) {
      var wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      var rows = [];
      wb.SheetNames.forEach(function (n) { rows = rows.concat(RT.parseHisSheet(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }))); });
      if (!rows.length) throw { error: 'Không tìm thấy bảng sổ chuyên khoa trong tệp (cần các cột "Mã bệnh nhân", "Họ và tên", "Tên dịch vụ").' };
      var mas = {};
      rows.forEach(function (r) { if (RT.fold(r.dich_vu).indexOf('mo phong') >= 0) mas[r.ma_his] = 1; });
      return call('lookupHisMany', { ma: Object.keys(mas) }).then(function (r) {
        Object.keys(r.his || {}).forEach(function (m) { S.hisCache[m] = r.his[m]; });
        return RT.planImport(rows, { patients: S.data.patients, users: S.data.users, dm: S.data.dm, today: today() }, r.his || {});
      });
    }).then(function (list) {
      if (!list.length) { toast('Trong sổ không có BN nào làm mô phỏng.', true); return; }
      hisImportModal(list);
    }).catch(function (e) { toast(errText(e) || String(e && e.message || e), true); })
      .finally(function () { setBusy(-1); });
  }
  function hisImportModal(list) {
    var days = list.map(function (x) { return x.ngay; }).filter(Boolean).sort();
    var lo = days[0] || today(), hi = days[days.length - 1] || today();
    var from = RT.addDays(today(), -7); if (from < lo) from = lo; if (from > hi) from = hi;
    var cnt = function (t) { return list.filter(function (x) { return x.trang === t; }).length; };
    var bsOpts = doctors().map(function (u) { return { v: u.email, l: u.ho_ten }; });
    var TAG = { moi: '<span class="tag imp-new">Mới</span>', co: '<span class="tag">Đã có</span>', xem: '<span class="tag imp-chk">Cần xem</span>' };
    var body = '<p class="imp-sum">Sổ từ <b>' + fdy(lo) + '</b> đến <b>' + fdy(hi) + '</b>: ' + list.length + ' BN có mô phỏng · <b>' + cnt('moi') + '</b> mới · ' + cnt('co') + ' đã có · ' + cnt('xem') + ' cần xem. ' +
      'BN được thêm vào bước <b>Mô phỏng</b>; bác sĩ điều trị bổ sung chuyên môn sau.</p>' +
      '<div class="form imp-filter">' + field('Từ ngày', '<input type="date" id="imp-from" value="' + esc(from) + '" min="' + esc(lo) + '" max="' + esc(hi) + '">') +
      field('Đến ngày', '<input type="date" id="imp-to" value="' + esc(hi) + '" min="' + esc(lo) + '" max="' + esc(hi) + '">') +
      '<label class="confirm imp-all"><input type="checkbox" id="imp-hide"' + ' checked><span>Ẩn BN đã có</span></label>' +
      field('BN mô phỏng trước ngày này vào <b>Chờ phân loại</b>', '<input type="date" id="imp-pl" value="' + esc(RT.addDays(today(), -1)) + '">', 'full', 'BN mô phỏng từ trước có thể đã lập KH, đang xạ hoặc đã xạ xong: vào Chờ phân loại để BS / KTV / KS chuyển về đúng giai đoạn. BN mô phỏng từ ngày này trở đi vào Chờ mô phỏng.') + '</div>' +
      '<div class="imp-list">' + list.map(function (x, i) {
        var bs = x.bs_email ? '<span>BS: ' + esc(nameOf(x.bs_email)) + '</span>' :
          '<select name="bs_' + i + '" aria-label="Chọn bác sĩ cho ' + esc(x.ho_ten) + '">' + opts(bsOpts, '', 'Chọn bác sĩ…') + '</select>';
        return '<div class="imp-row" data-i="' + i + '" data-ngay="' + esc(x.ngay) + '" data-trang="' + x.trang + '">' +
          '<input type="checkbox" name="pick" data-multi="1" value="' + i + '" aria-label="Chọn ' + esc(x.ho_ten) + '"' + (x.trang === 'moi' ? ' checked' : '') + (x.trang === 'co' ? ' disabled' : '') + '>' +
          '<div class="imp-main"><div><b>' + esc(x.ho_ten) + '</b> <span class="sub-in mono">' + esc(x.ma_his) + ' · ' + esc(x.nam_sinh) + ' · ' + esc(x.gioi) + '</span> ' + TAG[x.trang] + '</div>' +
          '<div class="imp-dx">' + esc(x.chan_doan) + '</div>' +
          '<div class="imp-meta"><span class="num">MP ' + fdy(x.ngay) + '</span><span class="imp-dich"></span>' + bs + (x.note ? '<span class="imp-note">' + esc(x.note) + '</span>' : '') + '</div></div></div>';
      }).join('') + '</div><p class="muted imp-none" hidden>Không có BN trong khoảng ngày này.</p>';
    modal({ title: 'Nhập bệnh nhân từ sổ HIS', wide: true, ok: 'Thêm BN đã chọn', body: body, noFocus: true,
      onMount: function (form) {
        var upd = function () {
          var a = $('#imp-from', form).value || lo, b = $('#imp-to', form).value || hi, hide = $('#imp-hide', form).checked, n = 0, sel = 0, mpl = $('#imp-pl', form).value;
          $$('.imp-row', form).forEach(function (r) {
            var pl = !!mpl && r.dataset.ngay < mpl;
            $('.imp-dich', r).innerHTML = r.dataset.trang === 'co' ? '' : pl ? '→ <b>Chờ phân loại</b>' : '→ Chờ mô phỏng';
            var show = r.dataset.ngay >= a && r.dataset.ngay <= b && !(hide && r.dataset.trang === 'co');
            r.hidden = !show; if (show) n++;
            if (show && $('input[name=pick]', r).checked) sel++;
          });
          $('.imp-none', form).hidden = n > 0;
          $('#mdl-ok').textContent = 'Thêm ' + sel + ' BN đã chọn';
        };
        $$('#imp-from,#imp-to,#imp-hide,#imp-pl,input[name=pick]', form).forEach(function (el) { el.addEventListener('change', upd); });
        $$('select[name^=bs_]', form).forEach(function (sl) {
          sl.addEventListener('change', function () { var c = $('input[name=pick]', sl.closest('.imp-row')); if (sl.value && !c.checked) { c.checked = true; upd(); } });
        });
        upd();
      },
      validate: function (v, form) {
        var rows = [], miss = [];
        $$('.imp-row', form).forEach(function (r) {
          if (r.hidden || !$('input[name=pick]', r).checked) return;
          var i = +r.dataset.i, x = list[i], o = {};
          ['ma_his', 'ho_ten', 'nam_sinh', 'gioi', 'chan_doan', 'khoa', 'bs_email', 'ngay_mo_phong', 'ghi_chu', 'force_name'].forEach(function (k) { o[k] = x[k]; });
          var mpl = $('#imp-pl', form).value;
          o.trang_thai = mpl && x.ngay < mpl ? 'CHO_PL' : 'MO_PHONG';
          if (!o.bs_email) {
            o.bs_email = v['bs_' + i] || '';
            var u = S.data.users.filter(function (z) { return z.email === o.bs_email; })[0];
            if (u && (S.data.dm.KHOA || []).indexOf(u.khoa) >= 0) o.khoa = u.khoa;
          }
          if (!o.bs_email) miss.push(x.ho_ten);
          rows.push(o);
        });
        if (!rows.length) return 'Chưa chọn bệnh nhân nào.';
        if (miss.length) return 'Cần chọn bác sĩ cho: ' + miss.slice(0, 3).join(', ') + (miss.length > 3 ? '…' : '') + '.';
        if (rows.length > 150) return 'Mỗi lần nhập tối đa 150 BN. Hãy thu hẹp khoảng ngày.';
        S.impRows = rows;
        return '';
      },
      onOk: function () { var rows = S.impRows; S.impRows = null; toast('Đang lưu lên máy chủ…'); serverRun('importHisBook', { rows: rows }).catch(function (e) { toast(errText(e) || 'Không nhập được.', true); }); } });
  }
  function bindAll() {
    $$('#main [data-hisimport]').forEach(function (b) { b.onclick = hisImportPick; });
    $$('#main [data-stfilter]').forEach(function (b) { b.onclick = function () { S.fStatus = S.fStatus === b.dataset.stfilter ? '' : b.dataset.stfilter; render(); }; });
    $$('#main [data-archsearch]').forEach(function (b) {
      b.onclick = function () {
        var key = S.q.trim();
        setBusy(1);
        call('searchArchive', { q: key }).then(function (r) {
          mergeArch(r.archive); S.archQ = key; S.archRes = r.archive.patients.map(function (x) { return x.id; }); renderMain();
        }, function (e) { toast(e.error || 'Không tìm được.', true); }).finally(function () { setBusy(-1); });
      };
    });
  }

  // ---------- Thông báo tình trạng máy (hiện cho mọi người, chỉ trong ngày) ----------
  function notices() { return (S.data.exceptions || []).filter(function (e) { return e.loai === 'THONG_BAO' && e.ngay === today(); }); }
  function noticeBar() {
    var list = notices();
    if (!list.length) return '';
    return '<div class="notice-bar" role="status"><div class="util-in">' + list.map(function (n) {
      return '<span class="nb-item"><b>' + esc(n.may || 'Thông báo') + ':</b> ' + esc(n.ghi_chu) +
        ' <span class="nb-meta">· ' + esc(nameOf(n.nguoi)) + ' ' + String(n.thoi_gian).slice(11, 16) + '</span>' +
        (can('clearNotice') ? ' <button class="nb-x" data-clearnotice="' + esc(n.id) + '" aria-label="Gỡ thông báo">Gỡ</button>' : '') + '</span>';
    }).join('') + '</div></div>';
  }
  function noticeBtn() { return can('setNotice') ? '<button class="btn" data-notice="1">Thông báo tình trạng máy</button>' : ''; }
  function noticeForm() {
    var machines = S.data.dm.MAY || [];
    modal({ title: 'Thông báo tình trạng máy', ok: 'Đăng thông báo',
      body: '<p class="muted">Thông báo hiện trên đầu ứng dụng của mọi người trong hôm nay. Đăng thông báo mới cho cùng máy sẽ thay thông báo cũ.</p><div class="form">' +
        field('Máy', '<select name="may">' + opts([{ v: '', l: 'Chung (không theo máy)' }].concat(machines.map(function (m) { return { v: m, l: m }; })), machines[0] || '') + '</select>', 'full') +
        field('Nội dung <span class="req">*</span>', '<input type="text" name="noi_dung" maxlength="200" placeholder="VD: Máy lỗi MLC, đang sửa, BN chờ khoảng 2 giờ">', 'full') + '</div>',
      validate: function (v) { return v.noi_dung ? '' : 'Nhập nội dung thông báo.'; },
      onOk: function (v) { run('setNotice', v); } });
  }

  // ---------- Chuông: việc mới liên quan đến tôi (khi ứng dụng đang mở) ----------
  S.notes = []; S.unread = 0;
  /** Nhớ thông báo đã báo / đã xem trong trình duyệt (theo từng tài khoản), tải lại trang không báo lại */
  function bellKey() { return 'rt.bell.' + ((me() && me().email) || ''); }
  function bellLoad() {
    if (!S.data || !me() || S.bellUser === me().email) return;
    S.bellUser = me().email;
    var o = {}; try { o = JSON.parse(lsGet(bellKey()) || '{}') || {}; } catch (e) { o = {}; }
    S.alerted = o.alerted || {}; S.notes = o.notes || []; S.unread = o.unread || 0;
  }
  function bellSave() {
    if (!S.bellUser) return;
    var ks = Object.keys(S.alerted || {}), t = today(), keep = {};
    // giữ khoá của hôm nay và khoá mốc đánh giá lại (không theo ngày), tối đa 600 khoá gần nhất
    ks.slice(-600).forEach(function (k) { if (k.indexOf('|20') < 0 || k.indexOf(t) >= 0 || /^rv\|/.test(k)) keep[k] = 1; });
    S.alerted = keep;
    lsSet('rt.bell.' + S.bellUser, JSON.stringify({ alerted: keep, notes: S.notes.slice(0, 50), unread: S.unread }));
  }
  function bell() {
    return '<div class="bell-wrap"><button class="bell" id="bell" aria-label="Việc mới" title="Việc mới">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>' +
      (S.unread ? '<span class="bell-n">' + S.unread + '</span>' : '') + '</button>' +
      '<div class="bell-panel" id="bell-panel" hidden><div class="bp-head"><b>Việc mới</b><span class="muted">khi ứng dụng đang mở</span></div>' +
      (S.notes.length ? S.notes.slice(0, 30).map(function (n) {
        return '<button class="bp-item" data-note="' + esc(n.pid || '') + '"><span>' + esc(n.text) + '</span><span class="muted">' + n.time + '</span></button>';
      }).join('') : '<div class="empty">Chưa có việc mới.</div>') + '</div></div>';
  }
  function bindBell() {
    var b = $('#bell'), p = $('#bell-panel');
    if (!b) return;
    b.onclick = function (e) { e.stopPropagation(); p.hidden = !p.hidden; if (!p.hidden && S.unread) { S.unread = 0; bellSave(); var n = $('.bell-n'); if (n) n.remove(); } };
    $$('[data-note]', p).forEach(function (x) { x.onclick = function () { p.hidden = true; if (x.dataset.note) openDetail(x.dataset.note); }; });
    document.addEventListener('click', function (e) { if (!p.hidden && !e.target.closest('.bell-wrap')) p.hidden = true; }, { once: true });
  }
  /** So sánh dữ liệu cũ và mới (do người khác cập nhật) để báo việc mới cho đúng người */
  function computeNotes(oldD, newD) {
    var meU = newD.me, mine = function (p) { return RT.myDoctors(meU).indexOf(p.bs_email) >= 0; };
    var r = meU.vai_tro, out = [];
    var st = {}, gst = {};
    oldD.patients.forEach(function (p) { st[p.id] = p.trang_thai; });
    (oldD.phases || []).forEach(function (g) { gst[g.id] = g.trang_thai; });
    var name = function (p) { return p.ho_ten + ' (' + p.ma_his + ')'; };
    var obs = {}; oldD.patients.forEach(function (p) { obs[p.id] = p.bs_email; });
    newD.patients.forEach(function (p) {
      if (obs[p.id] && obs[p.id] !== p.bs_email && mine(p) && p.cap_nhat_boi !== meU.email) {
        var ou = newD.users.filter(function (u) { return u.email === obs[p.id]; })[0];
        out.push({ pid: p.id, text: name(p) + ': được chuyển sang bạn điều trị' + (ou ? ' (từ ' + ou.ho_ten + ')' : '') });
      }
    });
    var isDocR = r === 'BS' || (r === 'ADMIN' && /^\s*(BS|ThS|TS|PGS)/i.test(meU.ho_ten || ''));
    var okt = {}, gkt = {}; oldD.patients.forEach(function (p) { okt[p.id] = p.ky_thuat; }); (oldD.phases || []).forEach(function (g) { gkt[g.id] = g.ky_thuat; });
    if (isDocR) {
      newD.patients.forEach(function (p) {
        if (okt[p.id] && okt[p.id] !== p.ky_thuat && mine(p) && p.cap_nhat_boi !== meU.email && ['CHO_KH', 'DANG_KH', 'CHO_QA', 'CHO_XA'].indexOf(p.trang_thai) >= 0)
          out.push({ pid: p.id, text: name(p) + ': kỹ sư đổi kỹ thuật ' + okt[p.id] + ' → ' + p.ky_thuat });
      });
      (newD.phases || []).forEach(function (g) {
        var p = newD.patients.filter(function (x) { return x.id === g.bn_id; })[0];
        if (p && gkt[g.id] && gkt[g.id] !== g.ky_thuat && mine(p) && g.cap_nhat_boi !== meU.email)
          out.push({ pid: p.id, text: name(p) + ': kỹ sư đổi kỹ thuật ' + (g.loai ? '' : 'boost GĐ' + g.stt + ' ') + gkt[g.id] + ' → ' + g.ky_thuat });
      });
    }
    newD.patients.forEach(function (p) {
      var o = st[p.id], n = p.trang_thai;
      if (o === n) return;
      var doc = (r === 'BS' || (r === 'ADMIN' && /^\s*(BS|ThS|TS|PGS)/i.test(meU.ho_ten || ''))) && mine(p);
      if (doc) {
        if (n === 'CHO_XA' && o) out.push({ pid: p.id, text: name(p) + ': kế hoạch xong, chờ vào xạ' });
        else if (n === 'DANG_KH' && o === 'CHO_QA') out.push({ pid: p.id, text: name(p) + ': QA không đạt, kỹ sư lập lại KH' });
        else if (n === 'CONTOUR' && (o === 'CHO_KH' || o === 'DANG_KH')) out.push({ pid: p.id, text: name(p) + ': kỹ sư trả lại contour' });
        else if (n === 'CONTOUR' && o === 'MO_PHONG') out.push({ pid: p.id, text: name(p) + ': đã mô phỏng, chờ bác sĩ contour' });
        else if (n === 'TAM_NGUNG') out.push({ pid: p.id, text: name(p) + ': tạm ngừng xạ' });
        else if (!o && n !== 'HOAN_THANH') out.push({ pid: p.id, text: 'BN mới của bạn: ' + name(p) });
      }
      if ((r === 'KS') && n === 'CHO_KH') out.push({ pid: p.id, text: (p.uu_tien === 'Cấp cứu' ? 'CẤP CỨU · ' : '') + name(p) + ': contour xong, chờ lập KH' });
      if (r === 'KTV' && n === 'CHO_XA') out.push({ pid: p.id, text: name(p) + ': chờ vào xạ, cần xếp lịch' });
      if (r === 'KTV' && n === 'MO_PHONG' && !o) out.push({ pid: p.id, text: name(p) + ': chờ mô phỏng' });
    });
    (newD.phases || []).forEach(function (g) {
      var o = gst[g.id], n = g.trang_thai;
      if (o === n) return;
      var p = newD.patients.filter(function (x) { return x.id === g.bn_id; })[0];
      if (!p) return;
      if (r === 'KS' && n === 'CHO_KH') out.push({ pid: p.id, text: name(p) + ': boost GĐ' + g.stt + ' chờ lập KH' });
      if ((r === 'BS' || r === 'ADMIN') && mine(p) && n === 'SAN_SANG') out.push({ pid: p.id, text: name(p) + ': KH boost GĐ' + g.stt + ' đã sẵn sàng' });
      if (r === 'KTV' && n === 'MO_PHONG') out.push({ pid: p.id, text: name(p) + ': boost cần mô phỏng lại' });
    });
    var oldP = {}; oldD.patients.forEach(function (p) { oldP[p.id] = p; });
    newD.patients.forEach(function (p) {
      var o = oldP[p.id]; if (!o) return;
      if (RT.isKtvLead(meU, newD.users) && meU.vai_tro !== 'ADMIN' && p.de_xuat_lich && p.de_xuat_luc !== o.de_xuat_luc && p.de_xuat_boi !== meU.email) {
        var dx = {}; try { dx = JSON.parse(p.de_xuat_lich); } catch (e) {}
        var un = newD.users.filter(function (u) { return u.email === p.de_xuat_boi; })[0];
        out.push({ pid: p.id, text: 'Chờ duyệt lịch: ' + name(p) + ' bắt đầu ' + (dx.ngay_du_kien ? fdw(dx.ngay_du_kien) : '') + ', đề xuất bởi ' + (un ? un.ho_ten : p.de_xuat_boi) });
      }
      if (o.de_xuat_lich && o.de_xuat_boi === meU.email && !p.de_xuat_lich) out.push({ pid: p.id, text: name(p) + (p.ngay_du_kien ? ': đã được duyệt lịch, bắt đầu ' + fdw(p.ngay_du_kien) : ': đề xuất lịch bị trả lại') });
    });
    var oldN = {};
    (oldD.exceptions || []).forEach(function (e) { if (e.loai === 'THONG_BAO') oldN[e.id] = 1; });
    (newD.exceptions || []).forEach(function (e) {
      if (e.loai === 'THONG_BAO' && !oldN[e.id] && e.nguoi !== meU.email) out.push({ pid: '', text: 'Thông báo' + (e.may ? ' ' + e.may : '') + ': ' + e.ghi_chu });
    });
    var tm = new Date(), hh = (tm.getHours() < 10 ? '0' : '') + tm.getHours() + ':' + (tm.getMinutes() < 10 ? '0' : '') + tm.getMinutes();
    out.forEach(function (x) { x.time = hh; });
    return out;
  }
  function pushNotes(list) {
    if (!list.length) return;
    bellLoad();
    S.notes = list.concat(S.notes).slice(0, 50);
    S.unread += list.length;
    bellSave();
    toast(list.length === 1 ? 'Việc mới: ' + list[0].text : list.length + ' việc mới. Bấm chuông để xem.');
  }

  // ---------- Thống kê ----------
  function statsRange(k) {
    var t = today(), y = +t.slice(0, 4), m = +t.slice(5, 7);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var last = function (yy, mm) { return new Date(Date.UTC(yy, mm, 0)).getUTCDate(); };
    if (k === 'today') return [t, t];
    if (k === 'week') return [RT.monday(t), t];
    if (k === 'month') return [y + '-' + pad(m) + '-01', t];
    if (k === 'prev') { var py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1; return [py + '-' + pad(pm) + '-01', py + '-' + pad(pm) + '-' + pad(last(py, pm))]; }
    return [S.stTu || RT.addDays(t, -30), S.stDen || t];
  }
  function renderStats() {
    var sc = RT.statsScope(me(), S.stPv);
    if (!S.stKey) S.stKey = 'month';
    var rg = statsRange(S.stKey);
    var r = S.stRes && S.stRes.tu === rg[0] && S.stRes.den === rg[1] ? S.stRes : null;
    var keys = [['today', 'Hôm nay'], ['week', 'Tuần này'], ['month', 'Tháng này'], ['prev', 'Tháng trước'], ['custom', 'Tuỳ chọn']];
    if (!S.stMode) S.stMode = 'luot';
    var MODES = [['luot', 'Lượt xạ trị', 'Tổng lượt, theo kỹ thuật, theo ngày, BN mới vào / kết thúc' + (sc.byDoctor ? ', theo từng bác sĩ' : '')], ['vang', 'Vắng buổi xạ', 'Số lượt, số BN vắng, theo lý do, danh sách'], ['tim', 'Tìm danh sách BN', 'Theo mặt bệnh (ICD), vị trí, kỹ thuật' + (sc.byDoctor ? ', BS' : '') + '… trong khoảng thời gian']];
    if (RT.khoaReportScope(me())) MODES = MODES.concat([['somp', 'Sổ mô phỏng CT', 'Tải Excel đúng mẫu sổ của khoa'], ['tt3d', 'Bảng thanh toán 3D', 'Tải Excel đúng mẫu (ký hiệu KTV, thành tiền)'], ['ttvmat', 'Bảng thanh toán VMAT', 'Tải Excel đúng mẫu (VM / IMRT)'],
      ['tongmp', 'Tổng hợp mô phỏng', 'Mặt nạ, tiêm thuốc, dụng cụ, kỹ thuật, mục đích, BS, KTV'], ['nguoi', 'Theo KTV / bác sĩ', 'Số buổi xạ của mỗi KTV, mỗi bác sĩ']]);
    else if (KMODES[S.stMode]) S.stMode = 'luot';
    var research = S.stMode === 'tim' && role() === 'BS' && !sc.byDoctor;
    if (research) sc = { label: 'Toàn bộ BN hai khoa (tìm để nghiên cứu, không lọc theo từng bác sĩ)' };
    var pvSeg = sc.khoaOpt ? '<div class="seg" role="group" aria-label="Phạm vi"><button data-stpv="" aria-pressed="' + (!S.stPv) + '">Của tôi</button><button data-stpv="khoa" aria-pressed="' + (S.stPv === 'khoa') + '">Cả khoa ' + esc(sc.khoaOpt) + '</button></div>' : '';
    var html = '<div class="page-head"><div><h1>Thống kê</h1><p>Phạm vi: <b>' + esc(sc.label) + '</b>. Chọn loại thống kê, khoảng thời gian, rồi bấm xem.</p></div>' + (pvSeg ? '<div class="filters">' + pvSeg + '</div>' : '') + '</div>' +
      '<div class="st-modes">' + MODES.map(function (m) { return '<button class="st-mode" data-stmode="' + m[0] + '" aria-pressed="' + (S.stMode === m[0]) + '"><b>' + m[1] + '</b><small>' + m[2] + '</small></button>'; }).join('') + '</div>';
    if (KMODES[S.stMode]) return html + renderKhoa();
    html += '<div class="card pad"><div class="filters"><div class="seg" role="group" aria-label="Khoảng thời gian">' +
      keys.map(function (k) { return '<button data-stkey="' + k[0] + '" aria-pressed="' + (S.stKey === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      (S.stKey === 'custom' ? '<label class="muted">Từ <input type="date" id="st-tu" value="' + rg[0] + '"></label><label class="muted">đến <input type="date" id="st-den" value="' + rg[1] + '" max="' + today() + '"></label>' : '') +
      '<button class="btn primary" data-stload="1">' + (S.stMode === 'tim' ? 'Tìm' : r ? 'Tính lại' : 'Xem thống kê') + '</button>' +
      ((S.stMode === 'tim' ? S.found : r) ? '<button class="btn" data-stexport="1">⬇ Tải Excel</button>' : '') + '</div>' +
      '<span class="muted">Từ ' + fdy(rg[0]) + ' đến ' + fdy(rg[1]) + '. Số liệu chỉ tính khi bấm, để ứng dụng luôn nhẹ.</span>' +
      '</div>';
    if (S.stMode === 'tim') return html + renderFind(rg);
    if (!r) return html + '<div class="card"><div class="empty">Chọn khoảng thời gian rồi bấm “Xem thống kê”.</div></div>';
    if (S.stMode === 'vang') return html + renderAbsStats(r);
    var o = r.tong_quan;
    var tile = function (n, l) { return '<div class="kpi" style="cursor:default"><span class="n">' + n + '</span><span class="l">' + l + '</span></div>'; };
    html += '<div class="kpis">' + tile(o.luot_xa, 'Lượt xạ') + tile(o.bn_xa, 'BN được xạ') + tile(o.bn_bat_dau, 'BN bắt đầu xạ') + tile(o.bn_ket_thuc, 'BN kết thúc xạ') +
      tile(o.bn_moi, 'BN mới nhập') + tile(o.vang_luot || 0, 'Lượt vắng') + tile(o.vang_bn || 0, 'BN vắng') + tile(o.cbct, 'Lần CBCT') + tile(o.sgrt, 'Lần SGRT') + '</div>';
    if (r.theo_ngay && r.theo_ngay.length) {
      var tks = []; r.theo_ngay.forEach(function (d) { Object.keys(d.ky_thuat).forEach(function (k) { if (tks.indexOf(k) < 0) tks.push(k); }); });
      html += '<section class="group"><div class="group-head"><h2>Theo từng ngày</h2><span class="count">' + r.theo_ngay.length + '</span></div><div class="card"><div class="tbl-wrap"><table><thead><tr><th>Ngày</th><th class="num">Lượt xạ</th>' +
        tks.map(function (k) { return '<th class="num">' + esc(k) + '</th>'; }).join('') + '<th class="num">Lượt vắng</th></tr></thead><tbody>' +
        r.theo_ngay.map(function (d) { return '<tr><td class="nowrap">' + fdw(d.ngay) + '</td><td class="num"><b>' + d.luot + '</b></td>' + tks.map(function (k) { return '<td class="num">' + (d.ky_thuat[k] || '') + '</td>'; }).join('') + '<td class="num">' + (d.vang || '') + '</td></tr>'; }).join('') +
        '</tbody></table></div></div></section>';
    }
    var mapTable = function (title, m) {
      if (!m || !Object.keys(m).length) return '';
      var ks = Object.keys(m).sort(function (a, b) { return m[b] - m[a]; });
      return '<section class="group"><div class="group-head"><h2>' + title + '</h2></div><div class="card"><div class="tbl-wrap"><table><thead><tr><th></th><th>Lượt xạ</th></tr></thead><tbody>' +
        ks.map(function (k) { return '<tr><td>' + esc(k) + '</td><td class="num">' + m[k] + '</td></tr>'; }).join('') + '</tbody></table></div></div></section>';
    };
    var listTable = function (title, list, cols) {
      if (!list) return '';
      return '<section class="group"><div class="group-head"><h2>' + title + '</h2><span class="count">' + list.length + '</span></div>' +
        (list.length ? '<div class="card"><div class="tbl-wrap"><table><thead><tr><th>Họ tên</th>' + cols.map(function (c) { return '<th>' + c[0] + '</th>'; }).join('') + '</tr></thead><tbody>' +
          list.map(function (x) { return '<tr><td>' + esc(x.ten) + '</td>' + cols.map(function (c) { return '<td class="num">' + x[c[1]] + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>'
          : '<div class="card"><div class="empty">Không có số liệu trong khoảng này.</div></div>') + '</section>';
    };
    html += '<div class="admin-grid">' + mapTable('Theo kỹ thuật', o.theo_ky_thuat) + mapTable('Theo máy', o.theo_may) + mapTable('Theo khoa', o.theo_khoa) + '</div>';
    html += doctorTable(sc, r.theo_bac_si);
    html += listTable(sc.byKtv ? 'Theo KTV' : 'Của tôi (KTV)', r.theo_ktv, [['Số BN', 'bn_xa'], ['Số buổi đã ghi', 'luot_xa']]);
    html += listTable(sc.byKs ? 'Theo kỹ sư' : 'Của tôi (kỹ sư)', r.theo_ky_su, [['Số kế hoạch', 'ke_hoach'], ['Có QA', 'co_qa']]);
    var grpTable = function (title, list, loai) {
      if (!list) return '';
      return '<section class="group"><div class="group-head"><h2>' + title + '</h2><span class="count">' + list.length + '</span><span class="muted">Bấm một dòng để xem danh sách bệnh nhân</span></div>' +
        (list.length ? '<div class="card"><div class="tbl-wrap"><table><thead><tr><th>' + (loai === 'icd' ? 'Mã ICD-10' : 'Vị trí xạ') + '</th><th>BN bắt đầu xạ</th><th>BN có xạ trong kỳ</th><th>Số lượt xạ</th></tr></thead><tbody>' +
          list.map(function (x) {
            var nm = loai === 'icd' ? RT.icdName(x.ma) : '';
            return '<tr class="click" data-stdet="' + loai + '" data-ma="' + esc(x.ma) + '"><td>' + (loai === 'icd' && nm ? '<b class="mono">' + esc(x.ma) + '</b> <span class="muted">' + esc(nm) + '</span>' : esc(x.ma)) + '</td>' +
              '<td class="num">' + x.bn_bat_dau + '</td><td class="num">' + x.bn_xa + '</td><td class="num">' + x.luot_xa + '</td></tr>';
          }).join('') + '</tbody></table></div></div>' : '<div class="card"><div class="empty">Không có số liệu trong khoảng này.</div></div>') + '</section>';
    };
    html += grpTable('Theo mã ICD-10 (3 ký tự)', r.theo_icd, 'icd');
    html += grpTable('Theo vị trí xạ', r.theo_vi_tri, 'vi_tri');
    return html;
  }
  /** Theo bác sĩ: lãnh đạo khoa thấy từng bác sĩ trong khoa, bác sĩ thấy dòng của mình. Bấm dòng để xem danh sách BN. */
  function doctorTable(sc, list) {
    if (!list) return '';
    var cols = [['BN được xạ', 'bn_xa'], ['Lượt xạ', 'luot_xa'], ['BN bắt đầu xạ', 'bn_bat_dau'], ['BN kết thúc xạ', 'bn_ket_thuc'], ['Lượt vắng', 'vang_luot']];
    var tot = {}; cols.forEach(function (c) { tot[c[1]] = list.reduce(function (s, x) { return s + (x[c[1]] || 0); }, 0); });
    return '<section class="group"><div class="group-head"><h2>' + (sc.byDoctor ? 'Theo bác sĩ' : 'Của tôi (bác sĩ)') + '</h2><span class="count">' + list.length + '</span><span class="hint">Bấm một dòng để xem danh sách bệnh nhân</span></div>' +
      (list.length ? '<div class="card"><div class="tbl-wrap cards"><table><thead><tr><th>Bác sĩ</th>' + cols.map(function (c) { return '<th class="num">' + c[0] + '</th>'; }).join('') + '</tr></thead><tbody>' +
        list.map(function (x) {
          return '<tr class="click" data-stdet="bs" data-ma="' + esc(x.email) + '"><td data-l="Bác sĩ"><b>' + esc(x.ten) + '</b></td>' + cols.map(function (c) { return '<td data-l="' + c[0] + '" class="num">' + (x[c[1]] || 0) + '</td>'; }).join('') + '</tr>';
        }).join('') +
        (list.length > 1 ? '<tr class="total"><td data-l="Bác sĩ"><b>Cộng</b></td>' + cols.map(function (c) { return '<td data-l="' + c[0] + '" class="num"><b>' + tot[c[1]] + '</b></td>'; }).join('') + '</tr>' : '') +
        '</tbody></table></div></div>' : '<div class="card"><div class="empty">Không có số liệu trong khoảng này.</div></div>') + '</section>';
  }
  // ---------- Báo cáo khoa ----------
  var KY = [['ngay', 'Ngày'], ['tuan', 'Tuần'], ['thang', 'Tháng'], ['quy', 'Quý'], ['nua', '6 tháng'], ['nam', 'Năm']];
  function kyRange(ky, d) {
    var y = d.slice(0, 4), m = +d.slice(5, 7), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var endOf = function (mm) { return RT.addDays((mm === 12 ? (+y + 1) + '-01' : y + '-' + pad(mm + 1)) + '-01', -1); };
    if (ky === 'ngay') return [d, d];
    if (ky === 'tuan') { var mo = RT.monday(d); return [mo, RT.addDays(mo, 6)]; }
    if (ky === 'thang') return [y + '-' + pad(m) + '-01', endOf(m)];
    if (ky === 'quy') { var q0 = Math.floor((m - 1) / 3) * 3 + 1; return [y + '-' + pad(q0) + '-01', endOf(q0 + 2)]; }
    if (ky === 'nua') return m <= 6 ? [y + '-01-01', y + '-06-30'] : [y + '-07-01', y + '-12-31'];
    return [y + '-01-01', y + '-12-31'];
  }
  function money(n) { return Number(n || 0).toLocaleString('vi-VN'); }
  var KMODES = { somp: 'tai', tt3d: 'tai', ttvmat: 'tai', tongmp: 'xem', nguoi: 'xem' };
  function khoaLabel(k) { return k === 'Xạ trị theo yêu cầu' ? 'Khoa Xạ trị TYC' : k ? 'Khoa ' + k : 'Khoa Xạ trị và Xạ trị TYC'; }
  function renderKhoa() {
    var K = S.kr = S.kr || { ky: 'thang', moc: today(), khoa: '' };
    var mode = S.stMode, tai = KMODES[mode] === 'tai';
    var sc = RT.khoaReportScope(me()), rg = kyRange(K.ky, K.moc), kh = sc.khoa || K.khoa;
    var r = S.krRes && S.krRes.tu === rg[0] && S.krRes.den === rg[1] && S.krRes.khoa === kh ? S.krRes : null;
    var html = '<div class="card pad"><div class="filters">' +
      '<div class="seg" role="group" aria-label="Kỳ">' + KY.map(function (k) { return '<button data-kky="' + k[0] + '" aria-pressed="' + (K.ky === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      '<label class="muted">Ngày trong kỳ <input type="date" id="k-moc" value="' + K.moc + '"></label>' +
      (sc.khoa ? '<span>' + esc(khoaLabel(sc.khoa)) + '</span>' : '<select id="k-khoa" aria-label="Khoa">' + opts(S.data.dm.KHOA, K.khoa, 'Cả hai khoa') + '</select>') +
      (tai ? '<button class="btn primary" data-kdl="1">⬇ Tải Excel</button>' : '<button class="btn primary" data-kload="1">Xem</button>' + (r ? '<button class="btn" data-kdl="1">⬇ Tải Excel</button>' : '')) + '</div>' +
      '<span class="muted">Kỳ: ' + fdy(rg[0]) + ' → ' + fdy(rg[1]) + '.' + (mode === 'tt3d' || mode === 'ttvmat' ? ' Mỗi tháng một trang, đúng mẫu bảng thanh toán của khoa.' : mode === 'somp' ? ' Mỗi tháng một trang, đúng mẫu sổ mô phỏng của khoa.' : '') + '</span>' +
      (S.krMsg ? '<span><b>' + esc(S.krMsg) + '</b></span>' : '') + '</div>';
    if (tai) return html;
    if (!r) return html + '<div class="card"><div class="empty">Chọn kỳ rồi bấm “Xem”.</div></div>';
    if (mode === 'nguoi') {
      var lt = function (title, list) { return '<section class="group"><div class="group-head"><h2>' + title + '</h2></div><div class="card"><div class="tbl-wrap"><table><thead><tr><th></th><th class="num">Số buổi</th></tr></thead><tbody>' + (list.length ? list.map(function (x) { return '<tr><td>' + esc(x[0]) + '</td><td class="num">' + x[1] + '</td></tr>'; }).join('') : '<tr><td class="muted" colspan="2">Không có.</td></tr>') + '</tbody></table></div></div></section>'; };
      return html + '<p class="muted">' + r.tong.bn_xa + ' BN được xạ · ' + r.tong.so_buoi + ' buổi · thành tiền ' + money(r.tong.thanh_tien) + ' đ</p><div class="admin-grid">' +
        lt('Theo KTV (số buổi tham gia xạ)', r.tong.theo_ktv.map(function (x) { return [x.ten + ' (' + x.ky_hieu + ')', x.so_buoi]; })) + lt('Theo bác sĩ (số buổi xạ)', r.tong.theo_bs.map(function (x) { return [x.ten, x.so_buoi]; })) + '</div>';
    }
    // Tổng hợp mô phỏng
    return html + '<h2 class="h1-sub" style="margin:8px 0">Mô phỏng: ' + r.mo_phong.length + ' BN <span class="muted" style="font-size:14px;font-weight:500">· bấm một dòng để xem danh sách</span></h2><div class="admin-grid">' +
      MPKEYS.map(function (k) {
        var o = mpGroup(r, k[1]), ks = Object.keys(o).sort(function (a, b) { return o[b].length - o[a].length; });
        return '<section class="group"><div class="group-head"><h2>' + k[0] + '</h2></div><div class="card"><div class="tbl-wrap"><table><thead><tr><th></th><th class="num">Số BN</th></tr></thead><tbody>' +
          (ks.length ? ks.map(function (x) { return '<tr class="click" data-mpl="' + esc(o[x].join(',')) + '" data-mpt="' + esc(k[0] + ': ' + x) + '"><td>' + esc(x) + '</td><td class="num">' + o[x].length + '</td></tr>'; }).join('') : '<tr><td class="muted" colspan="2">Không có.</td></tr>') + '</tbody></table></div></div></section>';
      }).join('') + '</div>';
  }
  var MPKEYS = [['Mặt nạ', function (x) { return x.mat_na_loai; }], ['Tiêm thuốc', function (x) { return x.tiem ? 'Có' : 'Không'; }],
    ['Dụng cụ khác', function (x) { return x.dung_cu.length ? x.dung_cu.map(function (d) { return /^Khác/.test(d) ? 'Khác' : d; }) : 'Không dùng'; }],
    ['Kỹ thuật', function (x) { return x.ky_thuat || '(chưa ghi)'; }], ['Mục đích', function (x) { return x.muc_dich || '(chưa ghi)'; }],
    ['Bác sĩ', function (x) { return x.bs; }], ['KTV mô phỏng', function (x) { return x.nguoi.split(/,\s*/); }]];
  function mpGroup(r, key) { var o = {}; r.mo_phong.forEach(function (x, i) { [].concat(key(x)).forEach(function (k) { if (k) (o[k] = o[k] || []).push(i); }); }); return o; }
  function byMonth(rows, key) { var o = {}; rows.forEach(function (x) { var m = String(x[key] || '').slice(0, 7); (o[m] = o[m] || []).push(x); }); return o; }
  /** Tạo file Excel cho một mục báo cáo khoa và tải về */
  function khoaDownload(mode, r) {
    var kl = khoaLabel(r.khoa), months = [], m0 = r.tu.slice(0, 7);
    for (var m = m0; m <= r.den.slice(0, 7); m = RT.addDays(m + '-28', 5).slice(0, 7)) months.push(m);
    var tag = months.length === 1 ? 'tháng ' + (+months[0].slice(5)) + '-' + months[0].slice(0, 4) : r.tu + ' đến ' + r.den;
    return XL.book().then(function (wb) {
      var name, info;
      if (mode === 'somp') {
        var bm = byMonth(r.mo_phong, 'ngay');
        months.forEach(function (m) { XL.soMoPhong(wb, 'tháng ' + (+m.slice(5)) + (months.length > 12 || m.slice(0, 4) !== months[0].slice(0, 4) ? '-' + m.slice(0, 4) : ''), bm[m] || []); });
        name = 'Sổ mô phỏng CT ' + tag + ' - ' + kl; info = r.mo_phong.length + ' BN mô phỏng';
      } else if (mode === 'tt3d' || mode === 'ttvmat') {
        var kind = mode === 'tt3d' ? '3D' : 'VMAT', bn = 0, buoi = 0;
        months.forEach(function (m) {
          var M = r.thang.filter(function (x) { return x.thang === m; })[0], g = M ? M.nhom.filter(function (x) { return x.ten === kind; })[0] : null;
          if (g) { bn += g.rows.length; buoi += g.so_buoi; }
          XL.thanhToan(wb, months.length === 1 ? kind : kind + ' T' + (+m.slice(5)) + (m.slice(0, 4) !== months[0].slice(0, 4) ? '-' + m.slice(0, 4) : ''), kind, m, g, { khoaLabel: kl, legend: r.chu_thich, kyTen: r.ky_ten, donGia: r.don_gia });
        });
        name = 'Bảng thanh toán ' + kind + ' ' + tag + ' - ' + kl;
        var b3 = r.tong.theo_nhom['3D'] || 0, bv = r.tong.theo_nhom.VMAT || 0;
        info = buoi + ' buổi · ' + money(buoi * r.don_gia) + ' đ. Đối chiếu: 3D ' + b3 + ' + VMAT ' + bv + ' = tổng ' + r.tong.so_buoi + ' buổi của khoa' +
          (r.thieu_phan_cong.length ? '. Có ' + r.thieu_phan_cong.length + ' ngày chưa có lịch phân công máy (tạm ghi người bấm xác nhận): ' + r.thieu_phan_cong.map(function (d) { return +d.slice(8) + '/' + (+d.slice(5, 7)); }).join(', ') : '');
      } else if (mode === 'tongmp') {
        XL.simple(wb, 'Tổng hợp mô phỏng', 'TỔNG HỢP MÔ PHỎNG · ' + kl, 'Từ ' + fdy(r.tu) + ' đến ' + fdy(r.den) + ' · ' + r.mo_phong.length + ' BN',
          MPKEYS.map(function (k) { var o = mpGroup(r, k[1]); return { title: k[0], head: [k[0], 'Số BN'], rows: Object.keys(o).sort(function (a, b) { return o[b].length - o[a].length; }).map(function (x) { return [x, o[x].length]; }) }; }));
        XL.simple(wb, 'Danh sách', 'DANH SÁCH BN MÔ PHỎNG', '', [{ head: ['Ngày', 'Họ tên', 'Số BA', 'Chẩn đoán', 'Bác sĩ', 'Mặt nạ', 'Tiêm thuốc', 'Dụng cụ', 'Kỹ thuật', 'Mục đích', 'KTV mô phỏng'],
          rows: r.mo_phong.map(function (x) { return [fdy(x.ngay), x.ho_ten, x.ma_his, x.chan_doan, x.bs, x.mat_na_loai, x.tiem ? 'Có' : 'Không', x.dung_cu.join(', '), x.ky_thuat, x.muc_dich, x.nguoi]; }) }]);
        name = 'Tổng hợp mô phỏng ' + tag + ' - ' + kl; info = r.mo_phong.length + ' BN mô phỏng';
      } else {
        XL.simple(wb, 'Theo KTV và bác sĩ', 'SỐ BUỔI XẠ THEO KTV VÀ BÁC SĨ · ' + kl, 'Từ ' + fdy(r.tu) + ' đến ' + fdy(r.den) + ' · ' + r.tong.bn_xa + ' BN · ' + r.tong.so_buoi + ' buổi', [
          { title: 'Theo KTV', head: ['KTV', 'Ký hiệu', 'Số buổi tham gia'], rows: r.tong.theo_ktv.map(function (x) { return [x.ten, x.ky_hieu, x.so_buoi]; }) },
          { title: 'Theo bác sĩ', head: ['Bác sĩ', 'Số buổi xạ'], rows: r.tong.theo_bs.map(function (x) { return [x.ten, x.so_buoi]; }) }]);
        name = 'Theo KTV và bác sĩ ' + tag + ' - ' + kl; info = r.tong.so_buoi + ' buổi';
      }
      return XL.save(wb, name).then(function () { return name + '.xlsx: ' + info; });
    });
  }
  function bindKhoa() {
    if (!KMODES[S.stMode]) return;
    var K = S.kr, sc = RT.khoaReportScope(me());
    $$('#main [data-kky]').forEach(function (b) { b.onclick = function () { K.ky = b.dataset.kky; S.krMsg = ''; renderMain(); }; });
    var moc = $('#k-moc'), kh = $('#k-khoa');
    if (moc) moc.onchange = function () { if (moc.value) { K.moc = moc.value; S.krMsg = ''; renderMain(); } };
    if (kh) kh.onchange = function () { K.khoa = kh.value; S.krMsg = ''; };
    var fetchR = function () {
      var rg = kyRange(K.ky, K.moc), khoa = sc.khoa || K.khoa;
      if (S.krRes && S.krRes.tu === rg[0] && S.krRes.den === rg[1] && S.krRes.khoa === khoa) return Promise.resolve(S.krRes);
      return call('khoaReport', asParam({ tu: rg[0], den: rg[1], khoa: khoa })).then(function (r) { S.krRes = r.kreport; return S.krRes; });
    };
    $$('#main [data-kload]').forEach(function (b) { b.onclick = function () { setBusy(1); fetchR().then(function () { renderMain(); }, function (e) { toast(errText(e) || 'Không lập được báo cáo.', true); }).finally(function () { setBusy(-1); }); }; });
    $$('#main [data-kdl]').forEach(function (b) {
      b.onclick = function () {
        setBusy(1); toast('Đang tạo file Excel…');
        fetchR().then(function (r) { return khoaDownload(S.stMode, r); }).then(function (msg) { S.krMsg = 'Đã tải ' + msg; toast('Đã tải file Excel về máy.'); renderMain(); },
          function (e) { toast(errText(e) || String(e && e.message || e) || 'Không tạo được file Excel.', true); }).finally(function () { setBusy(-1); });
      };
    });
    $$('#main [data-mpl]').forEach(function (tr) {
      tr.onclick = function () {
        var list = tr.dataset.mpl.split(',').map(function (i) { return S.krRes.mo_phong[+i]; });
        modal({ title: tr.dataset.mpt + ' (' + list.length + ' BN)', ok: 'Đóng', noCancel: true, wide: true, noFocus: true,
          body: '<div class="tbl-wrap"><table><thead><tr><th>Ngày MP</th><th>Bệnh nhân</th><th>Chẩn đoán</th><th>Mặt nạ</th><th>Tiêm</th><th>Dụng cụ</th><th>Kỹ thuật</th><th>BS</th></tr></thead><tbody>' +
            list.map(function (x) { return '<tr class="click" data-openp="' + esc(x.id) + '"><td class="nowrap">' + fd(x.ngay) + '</td><td><b>' + esc(x.ho_ten) + '</b><span class="sub mono">' + esc(x.ma_his) + '</span></td><td>' + esc(x.chan_doan) + '</td><td>' + esc(x.mat_na_loai) + '</td><td>' + (x.tiem ? 'Có' : 'Không') + '</td><td>' + esc(x.dung_cu.join(', ')) + '</td><td>' + esc(x.ky_thuat) + '</td><td class="nowrap">' + esc(x.bs) + '</td></tr>'; }).join('') + '</tbody></table></div>',
          onMount: function (f) { $$('[data-openp]', f).forEach(function (b) { b.onclick = function () { closeModal(); openDetail(b.dataset.openp); }; }); }, onOk: function () {} });
      };
    });
  }
  /** Tải Excel cho các mục Lượt xạ trị, Vắng buổi xạ, Tìm danh sách BN */
  function statsDownload() {
    var rg = statsRange(S.stKey), sub = 'Từ ' + fdy(rg[0]) + ' đến ' + fdy(rg[1]);
    return XL.book().then(function (wb) {
      var name;
      if (S.stMode === 'tim') {
        var f = S.found;
        XL.simple(wb, 'Danh sách BN', 'DANH SÁCH BỆNH NHÂN', sub + ' · ' + f.so_bn + ' đợt xạ · ' + f.luot + ' lượt', [{ head: ['Họ tên', 'Mã HIS', 'Năm sinh', 'Giới', 'ICD', 'Chẩn đoán', 'Vị trí', 'Kỹ thuật', 'Tổng liều', 'Số buổi', 'Mục đích', 'BS', 'Khoa', 'Bắt đầu', 'Kết thúc', 'Trạng thái', 'Lượt trong kỳ', 'Mặt nạ', 'Tiêm thuốc', 'Dụng cụ'],
          rows: f.rows.map(function (x) { return [x.ho_ten, x.ma_his, x.nam_sinh, x.gioi, x.icd, x.chan_doan, x.vi_tri, x.ky_thuat, x.tong_lieu, x.so_buoi, x.muc_dich, x.bs, x.khoa, fdy(x.ngay_bat_dau), fdy(x.ngay_ket_thuc), RT.STATUS[x.trang_thai] || '', x.luot_trong_ky, x.mat_na, x.tiem_thuoc, x.dung_cu]; }) }]);
        name = 'Danh sách BN ' + rg[0] + ' đến ' + rg[1];
      } else {
        var r = S.stRes, o = r.tong_quan, map = function (m) { return Object.keys(m || {}).map(function (k) { return [k, m[k]]; }); };
        if (S.stMode === 'vang') {
          XL.simple(wb, 'Vắng buổi xạ', 'VẮNG BUỔI XẠ', sub + ' · ' + (o.vang_luot || 0) + ' lượt · ' + (o.vang_bn || 0) + ' BN', [
            { title: 'Theo lý do', head: ['Lý do', 'Lượt vắng'], rows: map(o.vang_ly_do) },
            { title: 'Danh sách buổi vắng', head: ['Ngày', 'Họ tên', 'Mã HIS', 'Lý do', 'Kỹ thuật', 'BS'], rows: (r.vang || []).map(function (v) { return [fdy(v.ngay), v.ho_ten, v.ma_his, v.ly_do || 'Chưa rõ lý do', v.ky_thuat, v.bs]; }) }]);
          name = 'Vắng buổi xạ ' + rg[0] + ' đến ' + rg[1];
        } else {
          var sec = [{ title: 'Tổng quan', head: ['Chỉ số', 'Số'], rows: [['Lượt xạ', o.luot_xa], ['BN được xạ', o.bn_xa], ['BN bắt đầu xạ', o.bn_bat_dau], ['BN kết thúc xạ', o.bn_ket_thuc], ['BN mới nhập', o.bn_moi], ['Lượt vắng', o.vang_luot || 0], ['Lần CBCT', o.cbct], ['Lần SGRT', o.sgrt]] },
            { title: 'Theo kỹ thuật', head: ['Kỹ thuật', 'Lượt xạ'], rows: map(o.theo_ky_thuat) }];
          if (o.theo_khoa) sec.push({ title: 'Theo khoa', head: ['Khoa', 'Lượt xạ'], rows: map(o.theo_khoa) });
          if (r.theo_bac_si) sec.push({ title: 'Theo bác sĩ', head: ['Bác sĩ', 'BN được xạ', 'Lượt xạ', 'BN bắt đầu', 'BN kết thúc', 'Lượt vắng'], rows: r.theo_bac_si.map(function (x) { return [x.ten, x.bn_xa, x.luot_xa, x.bn_bat_dau || 0, x.bn_ket_thuc || 0, x.vang_luot || 0]; }) });
          if (r.theo_ktv) sec.push({ title: 'Theo KTV', head: ['KTV', 'Số BN', 'Số buổi đã ghi'], rows: r.theo_ktv.map(function (x) { return [x.ten, x.bn_xa, x.luot_xa]; }) });
          if (r.theo_ky_su) sec.push({ title: 'Theo kỹ sư', head: ['Kỹ sư', 'Số kế hoạch', 'Có QA'], rows: r.theo_ky_su.map(function (x) { return [x.ten, x.ke_hoach, x.co_qa]; }) });
          if (r.theo_ngay) sec.push({ title: 'Theo ngày', head: ['Ngày', 'Lượt xạ', 'Lượt vắng'], rows: r.theo_ngay.map(function (d) { return [fdy(d.ngay), d.luot, d.vang || 0]; }) });
          sec.push({ title: 'Theo mã ICD-10', head: ['Mã', 'BN bắt đầu', 'BN có xạ', 'Lượt xạ'], rows: (r.theo_icd || []).map(function (x) { return [x.ma + (RT.icdName(x.ma) ? ' · ' + RT.icdName(x.ma) : ''), x.bn_bat_dau, x.bn_xa, x.luot_xa]; }) });
          sec.push({ title: 'Theo vị trí xạ', head: ['Vị trí', 'BN bắt đầu', 'BN có xạ', 'Lượt xạ'], rows: (r.theo_vi_tri || []).map(function (x) { return [x.ma, x.bn_bat_dau, x.bn_xa, x.luot_xa]; }) });
          XL.simple(wb, 'Lượt xạ trị', 'THỐNG KÊ LƯỢT XẠ TRỊ · ' + (r.pham_vi || ''), sub, sec);
          name = 'Lượt xạ trị ' + rg[0] + ' đến ' + rg[1];
        }
      }
      return XL.save(wb, name);
    });
  }
  function renderAbsStats(r) {
    var o = r.tong_quan, lst = r.vang || [];
    var tile = function (n, l) { return '<div class="kpi" style="cursor:default"><span class="n">' + n + '</span><span class="l">' + l + '</span></div>'; };
    var nr = lst.filter(function (v) { return !v.ly_do; }).length;
    var html = '<div class="kpis">' + tile(o.vang_luot || 0, 'Lượt vắng') + tile(o.vang_bn || 0, 'BN vắng') + tile(nr, 'Chưa rõ lý do') + tile(o.ghi_bu || 0, 'Buổi ghi bù (quên tích)') + '</div>';
    var ld = o.vang_ly_do || {}, ks = Object.keys(ld).sort(function (a, b) { return ld[b] - ld[a]; });
    html += '<section class="group"><div class="group-head"><h2>Theo lý do</h2></div><div class="card"><div class="tbl-wrap"><table><thead><tr><th>Lý do</th><th class="num">Lượt vắng</th></tr></thead><tbody>' +
      (ks.length ? ks.map(function (k) { return '<tr><td>' + (k === 'Chưa rõ lý do' ? '<span class="flag crit">Chưa rõ lý do</span>' : esc(k)) + '</td><td class="num">' + ld[k] + '</td></tr>'; }).join('') : '<tr><td colspan="2" class="muted">Không có buổi vắng.</td></tr>') + '</tbody></table></div></div></section>';
    html += '<section class="group"><div class="group-head"><h2>Danh sách buổi vắng</h2><span class="count">' + lst.length + '</span><span class="hint">Bấm một dòng để mở BN, ghi lý do trên lịch xạ</span></div>' +
      (lst.length ? '<div class="card"><div class="tbl-wrap cards"><table><thead><tr><th>Bệnh nhân</th><th>Ngày vắng</th><th>Lý do</th><th>Kỹ thuật</th><th>BS</th></tr></thead><tbody>' + lst.map(function (v) {
        return '<tr class="click" data-openp="' + esc(v.bn_id) + '"><td data-l="Bệnh nhân"><b>' + esc(v.ho_ten) + '</b><span class="sub mono">' + esc(v.ma_his) + '</span></td><td data-l="Ngày vắng" class="nowrap">' + fdw(v.ngay) + '</td>' +
          '<td data-l="Lý do">' + (v.ly_do ? esc(v.ly_do) : '<span class="flag crit">Chưa rõ lý do</span>') + '</td><td data-l="Kỹ thuật">' + esc(v.ky_thuat || '') + '</td><td data-l="BS">' + esc(v.bs) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' : '<div class="card"><div class="empty">Không có buổi vắng trong khoảng này.</div></div>') + '</section>';
    return html;
  }
  // ---------- Tìm danh sách BN theo điều kiện ----------
  var MOC = [{ v: 'xa', l: 'Có buổi xạ trong khoảng' }, { v: 'bat_dau', l: 'Bắt đầu xạ trong khoảng' }, { v: 'ket_thuc', l: 'Kết thúc xạ trong khoảng' }, { v: 'nhap', l: 'Nhập vào ứng dụng trong khoảng' }];
  function renderFind(rg) {
    var f = S.ff = S.ff || { moc: 'bat_dau', icd: [] }, d = S.data.dm, sc = RT.statsScope(me(), S.stPv);
    if (role() === 'BS' && !sc.byDoctor) sc = { all: true };
    var st = Object.keys(RT.STATUS).filter(function (k) { return k !== 'HUY'; }).map(function (k) { return { v: k, l: RT.STATUS[k] }; });
    var html = '<div class="card pad"><div class="form ff">' +
      field('Tính theo', '<select id="ff-moc">' + opts(MOC, f.moc) + '</select>') +
      field('Mặt bệnh (mã ICD-10)', '<div class="chips">' + f.icd.map(function (c, i) { return '<span class="chip"><b class="mono">' + esc(c) + '</b> ' + esc(RT.icdName(c)) + ' <button type="button" data-rmicd="' + i + '" aria-label="Bỏ">×</button></span>'; }).join('') + '</div>' +
        '<div style="display:flex;gap:6px"><input type="text" id="ff-icd" list="dl-icd" autocomplete="off" placeholder="Mã 3 ký tự, VD: C50"><button type="button" class="btn" id="ff-add">Thêm</button></div>' + icdList(), 'full', 'Để trống = mọi mặt bệnh. Thêm được nhiều mã.') +
      field('Vị trí xạ (chứa chữ)', '<input type="text" id="ff-vt" value="' + esc(f.vi_tri || '') + '" placeholder="VD: vú, cột sống">') +
      field('Kỹ thuật', '<select id="ff-kt">' + opts(d.KY_THUAT, f.ky_thuat, 'Tất cả') + '</select>') +
      (sc.byDoctor ? field('Bác sĩ điều trị', '<select id="ff-bs">' + opts(doctors().filter(function (u) { return sc.all || u.khoa === sc.khoa; }).map(function (u) { return { v: u.email, l: u.ho_ten }; }), f.bs_email, 'Tất cả') + '</select>') : '') +
      (sc.all ? field('Khoa', '<select id="ff-khoa">' + opts(d.KHOA, f.khoa, 'Tất cả') + '</select>') : '') +
      field('Mục đích', '<select id="ff-md">' + opts(d.MUC_DICH || RT.DEFAULT_DM.MUC_DICH, f.muc_dich, 'Tất cả') + '</select>') +
      field('Trạng thái hiện tại', '<select id="ff-tt">' + opts(st, f.trang_thai, 'Tất cả') + '</select>') +
      field('Mặt nạ', '<select id="ff-mn">' + opts([{ v: 'co', l: 'Có làm mặt nạ' }, { v: 'khong', l: 'Không làm mặt nạ' }].concat((d.MAT_NA || RT.DEFAULT_DM.MAT_NA).map(function (x) { return { v: x, l: 'Mặt nạ ' + x }; })), f.mat_na, 'Tất cả') + '</select>') +
      field('Tiêm thuốc', '<select id="ff-tiem">' + opts(['Có', 'Không'], f.tiem_thuoc, 'Tất cả') + '</select>') +
      field('Dụng cụ khác', '<select id="ff-dc">' + opts((d.DUNG_CU || RT.DEFAULT_DM.DUNG_CU).concat(['Khác']), f.dung_cu, 'Tất cả') + '</select>') + '</div>' +
      '<div style="margin-top:12px"><button class="btn primary" data-stload="1">Tìm bệnh nhân</button></div></div>';
    var r = S.found;
    if (!r) return html + '<div class="card"><div class="empty">Chọn điều kiện rồi bấm “Tìm”.</div></div>';
    S.foundMap = {}; r.rows.forEach(function (x) { S.foundMap[x.id] = x; });
    html += '<div class="kpis">' + '<div class="kpi" style="cursor:default"><span class="n">' + r.so_bn + '</span><span class="l">Bệnh nhân (đợt xạ)</span></div>' +
      '<div class="kpi" style="cursor:default"><span class="n">' + r.luot + '</span><span class="l">Lượt xạ trong khoảng</span></div></div>';
    html += group('found', 'Kết quả · ' + fdy(r.tu) + ' → ' + fdy(r.den), r.rows, [
      { h: 'Bệnh nhân', v: function (x) { return '<b>' + esc(x.ho_ten) + '</b><span class="sub mono">' + esc(x.ma_his) + (x.nam_sinh ? ' · ' + esc(x.nam_sinh) : '') + (x.gioi ? ' · ' + esc(x.gioi) : '') + '</span>'; } },
      { h: 'Chẩn đoán', v: function (x) { return icdTags(x) + esc(x.chan_doan || '—') + (x.vi_tri ? '<span class="sub">' + esc(x.vi_tri) + '</span>' : ''); } },
      { h: 'Kỹ thuật · liều', cls: 'nowrap', v: function (x) { return esc(x.ky_thuat || '—') + (x.tong_lieu ? '<span class="sub">' + esc(x.tong_lieu) + ' Gy / ' + esc(x.so_buoi) + ' buổi</span>' : ''); } },
      { h: 'BS điều trị', v: function (x) { return esc(x.bs); } },
      { h: 'Thời gian xạ', cls: 'nowrap', v: function (x) { return '<span class="num">' + fdy(x.ngay_bat_dau) + ' → ' + fdy(x.ngay_ket_thuc) + '</span><span class="sub">' + esc(RT.STATUS[x.trang_thai] || '') + (x.luu_tru ? ' · lưu trữ' : '') + '</span>'; } },
      { h: 'Lượt trong kỳ', cls: 'num', v: function (x) { return x.luot_trong_ky; } }
    ], r.cat_bot ? 'Chỉ hiện 3000 dòng đầu; xuất Excel để có đủ.' : 'Bấm một BN để xem đầy đủ thông tin.', 'Không có BN thoả điều kiện.');
    return html;
  }
  function readFind() {
    var f = S.ff, g = function (id) { var el = $('#' + id); return el ? el.value.trim() : ''; };
    if (!$('#ff-moc')) return f;
    f.moc = g('ff-moc'); f.vi_tri = g('ff-vt'); f.ky_thuat = g('ff-kt'); f.bs_email = g('ff-bs'); f.khoa = g('ff-khoa'); f.muc_dich = g('ff-md'); f.trang_thai = g('ff-tt'); f.mat_na = g('ff-mn'); f.tiem_thuoc = g('ff-tiem'); f.dung_cu = g('ff-dc');
    var extra = RT.normIcd(g('ff-icd')); if (extra && f.icd.indexOf(extra) < 0) f.icd.push(extra);
    return f;
  }
  function bindFind() {
    if (S.stMode !== 'tim') return;
    var add = $('#ff-add');
    if (add) add.onclick = function () { readFind(); renderMain(); };
    $$('#main [data-rmicd]').forEach(function (b) { b.onclick = function () { readFind(); S.ff.icd.splice(+b.dataset.rmicd, 1); renderMain(); }; });
  }
  function findGo(action) {
    var f = readFind(), rg = statsRange(S.stKey);
    var payload = asParam({ tu: rg[0], den: rg[1], pv: S.stPv || '', moc: f.moc, icd: f.icd, vi_tri: f.vi_tri, ky_thuat: f.ky_thuat, bs_email: f.bs_email, khoa: f.khoa, muc_dich: f.muc_dich, trang_thai: f.trang_thai, mat_na: f.mat_na, tiem_thuoc: f.tiem_thuoc, dung_cu: f.dung_cu });
    setBusy(1);
    call(action, payload).then(function (r) {
      S.found = r.found;
      renderMain();
    }, function (e) { toast(e.error || 'Không tìm được.', true); }).finally(function () { setBusy(-1); });
  }
  function bindStats() {
    $$('#main [data-stkey]').forEach(function (b) { b.onclick = function () { S.stKey = b.dataset.stkey; S.stSheet = null; renderMain(); }; });
    $$('#main [data-stmode]').forEach(function (b) { b.onclick = function () { S.stMode = b.dataset.stmode; S.stSheet = null; renderMain(); }; });
    bindKhoa();
    $$('#main [data-stpv]').forEach(function (b) { b.onclick = function () { S.stPv = b.dataset.stpv; S.stRes = null; S.found = null; S.stSheet = null; renderMain(); }; });
    bindFind();
    var tu = $('#st-tu'), den = $('#st-den');
    if (tu) tu.onchange = function () { S.stTu = tu.value; };
    if (den) den.onchange = function () { S.stDen = den.value; };
    var go = function (action) {
      var rg = statsRange(S.stKey);
      setBusy(1);
      call(action, asParam({ tu: rg[0], den: rg[1], pv: S.stPv || '' })).then(function (r) {
        S.stRes = r.report;
        renderMain();
      }, function (e) { toast(e.error || 'Không tính được thống kê.', true); }).finally(function () { setBusy(-1); });
    };
    $$('#main [data-stload]').forEach(function (b) { b.onclick = function () { S.stSheet = null; if (S.stMode === 'tim') findGo('findPatients'); else go('report'); }; });
    $$('#main [data-stexport]').forEach(function (b) { b.onclick = function () { setBusy(1); toast('Đang tạo file Excel…'); statsDownload().then(function () { toast('Đã tải file Excel về máy.'); }, function (e) { toast(String(e && e.message || e) || 'Không tạo được file Excel.', true); }).finally(function () { setBusy(-1); }); }; });
    $$('#main [data-stdet]').forEach(function (tr) {
      tr.onclick = function () {
        var rg = statsRange(S.stKey), loai = tr.dataset.stdet, ma = tr.dataset.ma;
        setBusy(1);
        call('report', asParam({ tu: rg[0], den: rg[1], pv: S.stPv || '', chi_tiet: { loai: loai, ma: ma } })).then(function (r) {
          var list = r.report.chi_tiet || [], nm = loai === 'icd' ? RT.icdName(ma) : '';
          modal({ title: (loai === 'bs' ? 'BN của ' + nameOf(ma) : loai === 'icd' ? 'Mã ' + ma + (nm ? ' · ' + nm : '') : 'Vị trí xạ: ' + ma) + ' (' + list.length + ' đợt)', ok: 'Đóng', noFocus: true, wide: true, noCancel: true,
            body: '<p class="muted">Từ ' + fdy(rg[0]) + ' đến ' + fdy(rg[1]) + ': các đợt xạ bắt đầu trong kỳ hoặc có buổi xạ trong kỳ.</p>' +
              (list.length ? '<div class="tbl-wrap"><table><thead><tr><th>Bệnh nhân</th><th>Chẩn đoán</th><th>Kỹ thuật · liều</th><th>BS</th><th>Thời gian xạ</th><th>Lượt trong kỳ</th></tr></thead><tbody>' +
                list.map(function (x) {
                  return '<tr><td><b>' + esc(x.ho_ten) + '</b><span class="sub mono">' + esc(x.ma_his) + (x.nam_sinh ? ' · ' + esc(x.nam_sinh) : '') + '</span></td>' +
                    '<td>' + icdTags(x) + esc(x.chan_doan || '—') + (x.vi_tri ? '<span class="sub">' + esc(x.vi_tri) + '</span>' : '') + '</td>' +
                    '<td class="nowrap">' + esc(x.ky_thuat || '—') + (x.tong_lieu ? '<span class="sub">' + esc(x.tong_lieu) + ' Gy / ' + esc(x.so_buoi) + ' buổi</span>' : '') + '</td>' +
                    '<td class="nowrap">' + esc(x.bs) + '</td><td class="nowrap num">' + fdy(x.ngay_bat_dau) + ' → ' + fdy(x.ngay_ket_thuc) + '</td><td class="num">' + x.luot_trong_ky + '</td></tr>';
                }).join('') + '</tbody></table></div>' : '<div class="empty">Không có bệnh nhân.</div>'),
            onOk: function () {} });
        }, function (e) { toast(e.error || 'Không tải được danh sách.', true); }).finally(function () { setBusy(-1); });
      };
    });
  }

  // ---------- Bảng phân công ----------
  function rosterRows() { return S.rosterExtra ? S.data.roster.concat(S.rosterExtra) : S.data.roster; }
  function rosterCell(ngay, vt) { return rosterRows().filter(function (r) { return r.ngay === ngay && r.vi_tri === vt; })[0]; }
  function shortName(email) { var n = nameOf(email); return n.replace(/^(KTV|BS|KS|ĐD|ThS|TS)\.?\s*/i, ''); }
  function myDuty(day) {
    return rosterRows().filter(function (r) { return r.ngay === day && RT.splitList(r.nhan_vien).indexOf(me().email) >= 0; }).map(function (r) { return r.vi_tri; });
  }
  function dutyBanner() {
    var d = myDuty(today());
    return d.length ? '<div class="duty">Hôm nay bạn: <b>' + d.map(esc).join(' · ') + '</b></div>' : '';
  }
  function renderRoster() {
    var t = today();
    if (!S.rweek) S.rweek = RT.monday(t);
    var days = [0, 1, 2, 3, 4, 5].map(function (i) { return RT.addDays(S.rweek, i); });  // Thứ Hai → Thứ Bảy
    var pos = S.data.dm.VI_TRI_PC || [];
    var edit = can('setRoster');
    var winA = RT.addDays(RT.monday(t), -7), winB = RT.addDays(RT.monday(t), 34);
    var outside = days[0] < winA || days[5] > winB;
    if (outside && S.rosterWeekLoaded !== S.rweek) {
      S.rosterWeekLoaded = S.rweek;
      setBusy(1);
      call('getRoster', { tu: days[0], den: days[5] }).then(function (r) { S.rosterExtra = (S.rosterExtra || []).concat(r.roster || []); renderMain(); }, function () {}).finally(function () { setBusy(-1); });
    }
    var html = '<div class="page-head"><div><h1>Phân công</h1><p>Tuần ' + fd(days[0]) + ' – ' + fd(days[5]) + '/' + days[5].slice(0, 4) +
      (edit ? '. Bấm vào ô để chọn người.' : '. Chỉ KTV trưởng và quản trị sửa được.') + '</p></div>' +
      '<div class="filters">' + (edit ? '<button class="btn" data-rcopy="1">Sao chép từ tuần trước</button>' : '') +
      '<div class="seg"><button data-rnav="-7" aria-label="Tuần trước">‹</button><button data-rnav="0">Tuần này</button><button data-rnav="7" aria-label="Tuần sau">›</button></div></div></div>';
    html += dutyBanner();
    if (!pos.length) return html + '<div class="card"><div class="empty">Chưa có vị trí phân công. Quản trị thêm ở tab Quản trị → Vị trí phân công.</div></div>';
    html += '<div class="card"><div class="tbl-wrap"><table class="rs-table"><thead><tr><th>Vị trí</th>' + days.map(function (d) { return '<th class="' + (d === t ? 'wk-today' : '') + '">' + fdw(d) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      pos.map(function (vt) {
        return '<tr><th scope="row" class="rs-pos">' + esc(vt) + '</th>' + days.map(function (d) {
          var c = rosterCell(d, vt), em = c ? RT.splitList(c.nhan_vien) : [];
          var inner = em.map(function (x) { return '<span class="rs-name' + (x === me().email ? ' me' : '') + '">' + esc(shortName(x)) + '</span>'; }).join('') +
            (c && c.ghi_chu ? '<span class="rs-note">' + esc(c.ghi_chu) + '</span>' : '') || '<span class="muted">–</span>';
          return '<td class="' + (d === t ? 'rs-today' : '') + '">' + (edit ? '<button class="rs-cell" data-rcell="1" data-d="' + d + '" data-v="' + esc(vt) + '">' + inner + '</button>' : inner) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
    return html;
  }
  function bindRoster() {
    $$('#main [data-rnav]').forEach(function (b) { b.onclick = function () { var n = +b.dataset.rnav; S.rweek = n ? RT.addDays(S.rweek, n) : RT.monday(today()); renderMain(); }; });
    $$('#main [data-rcopy]').forEach(function (b) {
      b.onclick = function () {
        modal({ title: 'Sao chép phân công', ok: 'Sao chép', body: '<p>Sao chép toàn bộ phân công của tuần <b>' + fd(RT.addDays(S.rweek, -7)) + ' – ' + fd(RT.addDays(S.rweek, -1)) + '</b> sang tuần đang xem (<b>' + fd(S.rweek) + ' – ' + fd(RT.addDays(S.rweek, 6)) + '</b>). Các ô đã có ở tuần đang xem sẽ bị ghi đè.</p>',
          onOk: function () { run('copyRoster', { tu: RT.addDays(S.rweek, -7), den: S.rweek }); } });
      };
    });
    $$('#main [data-rcell]').forEach(function (b) {
      b.onclick = function () {
        var d = b.dataset.d, vt = b.dataset.v, c = rosterCell(d, vt), cur = c ? RT.splitList(c.nhan_vien) : [];
        var staff = activeUsers().filter(function (u) { return u.vai_tro === 'KTV'; });
        var others = activeUsers().filter(function (u) { return u.vai_tro !== 'KTV' && cur.indexOf(u.email) >= 0; });
        modal({ title: vt + ' · ' + fdw(d), ok: 'Lưu',
          body: '<div class="field"><span class="lb">Chọn người phụ trách</span><div class="checks">' +
            staff.concat(others).map(function (u) { return '<label><input type="checkbox" name="nv" data-multi="1" value="' + esc(u.email) + '"' + (cur.indexOf(u.email) >= 0 ? ' checked' : '') + '><span>' + esc(u.ho_ten) + '</span></label>'; }).join('') +
            '</div></div>' + field('Ghi chú', '<input type="text" name="ghi_chu" value="' + esc(c ? c.ghi_chu : '') + '" placeholder="VD: 7h–11h30">'),
          onOk: function (v) { run('setRoster', { ngay: d, vi_tri: vt, nhan_vien: v.nv || [], ghi_chu: v.ghi_chu }); } });
      };
    });
  }

  // ---------- Nhật ký (quản trị và các trưởng) ----------
  function logSection() {
    return '<section class="group"><div class="group-head"><h2>Nhật ký thao tác</h2><span class="hint">300 thao tác gần nhất</span><button class="btn" data-admin="loadLog">' + (S.log ? 'Tải lại' : 'Xem nhật ký') + '</button></div>' +
      (S.log ? (S.log.length ? '<div class="card"><div class="tbl-wrap"><table><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Thao tác</th><th>Bệnh nhân</th><th>Chi tiết</th></tr></thead><tbody>' +
        S.log.map(function (l) { var p = byId(l.bn_id); return '<tr><td class="num nowrap">' + esc(fdy(String(l.thoi_gian).slice(0, 10)) + ' ' + String(l.thoi_gian).slice(11, 16)) + '</td><td class="nowrap">' + esc(nameOf(l.email)) + '</td><td class="nowrap">' + esc(l.thao_tac) + '</td><td>' + (p ? esc(p.ho_ten) : esc(l.bn_id)) + '</td><td>' + esc(l.chi_tiet) + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>' : '<div class="card"><div class="empty">Chưa có thao tác nào.</div></div>') : '') + '</section>';
  }

  // ---------- Quản trị ----------
  function renderAdmin() {
    var d = S.data;
    var users = d.users.slice().sort(function (a, b) { return (a.kich_hoat === 'Không') - (b.kich_hoat === 'Không') || ['ADMIN', 'BS', 'KS', 'KTV', 'DD'].indexOf(a.vai_tro) - ['ADMIN', 'BS', 'KS', 'KTV', 'DD'].indexOf(b.vai_tro) || a.ho_ten.localeCompare(b.ho_ten, 'vi'); });
    var html = '<div class="page-head"><div><h1>Quản trị</h1><p>Người dùng, danh mục và nhật ký thao tác.</p></div><button class="btn primary" data-admin="addUser">+ Thêm người dùng</button></div>';
    html += '<section class="group"><div class="group-head"><h2>Người dùng</h2><span class="count">' + activeUsers().length + ' đang hoạt động</span>' +
      '<span class="hint">Người dùng cần có tài khoản Google. Với Gmail cá nhân, nhớ chia sẻ Google Sheet cho họ.</span></div><div class="card"><div class="tbl-wrap"><table><thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Chức vụ</th><th>Khoa</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
      users.map(function (u) {
        return '<tr class="' + (u.kich_hoat === 'Không' ? 'off-user' : '') + '"><td><b>' + esc(u.ho_ten) + '</b></td><td class="mono">' + esc(u.email) + '</td><td><span class="role role-' + esc(u.vai_tro) + '">' + esc(RT.ROLES[u.vai_tro] || u.vai_tro) + '</span></td>' +
          '<td>' + esc(u.chuc_vu || '') + (u.tro_ly_cho ? '<span class="sub">Trợ lý cho ' + esc(nameOf(u.tro_ly_cho)) + (u.nhan_bn === 'Có' ? ' · được làm BS điều trị' : ' · chưa nhận BN') + '</span>' : '') + '</td><td>' + esc(u.khoa || '') + (u.ky_hieu ? '<span class="sub">Ký hiệu: ' + esc(u.ky_hieu) + '</span>' : '') + '</td><td>' + (u.kich_hoat === 'Không' ? 'Đã khoá' : 'Hoạt động') + '</td><td class="act"><button class="btn" data-admin="editUser" data-email="' + esc(u.email) + '">Sửa</button></td></tr>';
      }).join('') + '</tbody></table></div></div></section>';
    var dmBox = function (loai, title, help, ph, type) {
      var list = d.dm[loai] || [];
      return '<div class="card pad"><h3>' + esc(title) + '</h3>' + (help ? '<span class="sub">' + help + '</span>' : '') +
        '<div class="chips">' + (list.length ? list.map(function (v) { return '<span class="chip">' + esc(loai === 'NGAY_LE' ? fdw(v) + '/' + v.slice(0, 4) : v) + (loai === 'TEN_DON_VI' ? '' : '<button aria-label="Xoá" data-dmdel="' + loai + '" data-v="' + esc(v) + '">×</button>') + '</span>'; }).join('') : '<span class="muted">Chưa có</span>') + '</div>' +
        '<form class="inline-add" data-dmadd="' + loai + '"><input type="' + (type || 'text') + '" name="v" placeholder="' + esc(ph) + '" aria-label="' + esc(title) + '"><button class="btn primary" type="submit">' + (loai === 'TEN_DON_VI' ? 'Đổi' : 'Thêm') + '</button></form></div>';
    };
    html += '<section class="group"><div class="group-head"><h2>Danh mục</h2></div><div class="admin-grid">' +
      dmBox('TEN_DON_VI', 'Tên đơn vị', 'Hiện ở thanh trên cùng.', 'VD: Khoa Xạ trị theo yêu cầu · BV Ung Bướu Hà Nội') +
      dmBox('MAY', 'Máy gia tốc', 'Khi có máy mới, thêm vào đây.', 'VD: Máy gia tốc 2') +
      dmBox('NGAY_LE', 'Ngày nghỉ lễ', 'Không tính vào lịch xạ.', '', 'date') +
      dmBox('KY_THUAT', 'Kỹ thuật xạ', '', 'VD: Brachytherapy') +
      dmBox('MUC_DICH', 'Mục đích xạ', '', 'VD: Dự phòng') +
      dmBox('VI_TRI_PC', 'Vị trí phân công KTV', 'Các dòng của bảng phân công (Thứ Hai – Thứ Bảy).', 'VD: Ca 5') +
      dmBox('GIO_CA', 'Giờ các ca xạ', 'Để biết KTV nào xạ buổi nào (bảng thanh toán, form ghi buổi xạ). Chưa ghi giờ thì lấy mọi ca trong ngày.', 'VD: Ca 1: 07:00-09:30') +
      dmBox('VI_TRI', 'Vị trí xạ (gợi ý khi nhập)', 'Bác sĩ vẫn gõ được vị trí khác.', 'VD: Hố yên') +
      dmBox('HINH_ANH', 'Hình ảnh / định vị mỗi buổi', 'KTV tích khi ghi buổi xạ.', 'VD: ExacTrac') +
      dmBox('IGRT', 'Phác đồ IGRT dự kiến', '', 'VD: CBCT 5 buổi đầu') +
      dmBox('LY_DO_TAM_NGUNG', 'Lý do tạm ngừng', '', 'VD: Hết thuốc hoá trị đồng thời') +
      dmBox('KHOA', 'Khoa', '', 'VD: Xạ trị') +
      dmBox('CHI_TIEU', 'Chỉ tiêu số BN đang xạ của khoa', 'Dạng “Tên khoa: tối thiểu-tối đa”. Thêm dòng mới cho một khoa sẽ thay dòng cũ của khoa đó. Khi khoa đủ mức tối đa, người xếp lịch được cảnh báo; đồng ý thì vẫn xếp. BN cấp cứu luôn được xếp.', 'VD: Xạ trị: 90-100') +
      dmBox('LIEU_HAY_DUNG', 'Tổng liều hay dùng (Gy)', 'Hiện thành nút chọn nhanh dưới ô Tổng liều. Số lẻ dùng dấu chấm.', 'VD: 45') +
      dmBox('SO_BUOI_HAY_DUNG', 'Số buổi hay dùng', 'Hiện thành nút chọn nhanh dưới ô Số buổi.', 'VD: 25') +
      dmBox('DON_GIA', 'Đơn giá cho báo cáo khoa', 'Dạng “Buổi xạ: 21000”. Thành tiền = số buổi × đơn giá. Thêm dòng mới sẽ thay dòng cũ.', 'VD: Buổi xạ: 21000') +
      dmBox('MAT_NA', 'Loại mặt nạ', 'Hiện trong form “Đã mô phỏng xong”.', 'VD: 5 điểm') +
      dmBox('DUNG_CU', 'Dụng cụ khác khi mô phỏng', 'VD: miếng bù da, nêm lưỡi. Người dùng vẫn tự ghi được loại khác.', 'VD: Nêm lưỡi') +
      dmBox('KY_TEN', 'Khung ký tên cuối báo cáo', 'Mỗi dòng một chức danh, có thể ghi kèm họ tên: “Trưởng khoa: Nguyễn Văn A”.', 'VD: Trưởng khoa: Nguyễn Văn A') + '</div></section>';
    html += logSection();
    return html;
  }
  function bindAdmin() {
    $$('#main [data-admin]').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.admin;
        if (k === 'addUser') userForm(null);
        if (k === 'editUser') userForm(S.data.users.filter(function (u) { return u.email === b.dataset.email; })[0]);
        if (k === 'loadLog') run('getLog');
      };
    });
    $$('#main [data-dmdel]').forEach(function (b) { b.onclick = function () { run('dmRemove', { loai: b.dataset.dmdel, gia_tri: b.dataset.v }); }; });
    $$('#main [data-dmadd]').forEach(function (f) {
      f.onsubmit = function (e) { e.preventDefault(); var v = f.v.value.trim(); if (!v) return; run('dmAdd', { loai: f.dataset.dmadd, gia_tri: v }); };
    });
  }
  function userForm(u) {
    var isNew = !u; u = u || { vai_tro: 'BS', kich_hoat: 'Có' };
    modal({ title: isNew ? 'Thêm người dùng' : 'Sửa người dùng', ok: isNew ? 'Thêm' : 'Lưu',
      body: '<div class="form">' + field('Họ và tên <span class="req">*</span>', '<input type="text" name="ho_ten" value="' + esc(u.ho_ten || '') + '" placeholder="VD: BS. Nguyễn Văn A">', 'full') +
        field('Email Google <span class="req">*</span>', '<input type="email" name="email" value="' + esc(u.email || '') + '"' + (isNew ? '' : ' readonly') + ' placeholder="ten@gmail.com">', 'full') +
        field('Vai trò', '<select name="vai_tro">' + opts(['BS', 'KS', 'KTV', 'DD', 'ADMIN'].map(function (r) { return { v: r, l: RT.ROLES[r] }; }), u.vai_tro) + '</select>') +
        field('Trạng thái', '<select name="kich_hoat">' + opts([{ v: 'Có', l: 'Hoạt động' }, { v: 'Không', l: 'Khoá tài khoản' }], u.kich_hoat) + '</select>') +
        field('Chức vụ', '<select name="chuc_vu">' + opts(RT.CHUC_VU, u.chuc_vu || '', 'Không') + '</select>', '', 'Trưởng khoa, ĐD trưởng: thống kê cả khoa theo từng bác sĩ. Tài khoản khoa: số tổng của khoa. KTV trưởng: phân công, huỷ buổi xạ ghi nhầm.') +
        field('Khoa', '<select name="khoa">' + opts(RT.staffKhoa(S.data.dm), u.khoa || '', '—') + '</select>', '', 'Bắt buộc với bác sĩ, điều dưỡng, trưởng khoa, tài khoản khoa. BN mới nhận khoa theo bác sĩ điều trị; điều dưỡng chỉ thấy BN khoa mình.') +
        field('Ký hiệu (in trên bảng xạ trị)', '<input type="text" name="ky_hieu" maxlength="4" value="' + esc(u.ky_hieu || '') + '" placeholder="VD: T, Đ, IT">', '', 'Dùng cho KTV. Để trống thì lấy chữ cái đầu của tên.') +
        '<label class="confirm full" id="nb-box"><input type="checkbox" name="nhan_bn"' + (u.nhan_bn === 'Có' ? ' checked' : '') + '><span><b>Được làm BS điều trị</b>&nbsp;(trợ lý đứng tên BN). Chưa tích: trợ lý không có trong danh sách chọn BS điều trị; BN cũ đang đứng tên trợ lý vẫn giữ nguyên.</span></label>' +
        field('Trợ lý cho bác sĩ', '<select name="tro_ly_cho" id="tl-sel">' + opts(S.data.users.filter(function (x) { return x.kich_hoat !== 'Không' && x.email !== u.email && !x.tro_ly_cho && (x.vai_tro === 'BS' || isDoctor(x)); }).map(function (x) { return { v: x.email, l: x.ho_ten }; }), u.tro_ly_cho || '', 'Không (bác sĩ bình thường)') + '</select>', 'full', 'Chỉ cho bác sĩ trợ lý: thấy và làm việc trên BN của bác sĩ chính, xem được thống kê của bác sĩ chính. BN vẫn đứng tên bác sĩ chính.') +
'</div>',
      onMount: function (form) {
        var vt = $('select[name=vai_tro]', form), tl = $('#tl-sel', form), box = tl && tl.closest('.field');
        var nb = $('#nb-box', form);
        var upd = function () { if (!box) return; box.hidden = vt.value !== 'BS'; if (vt.value !== 'BS') tl.value = ''; if (nb) nb.hidden = !tl.value; };
        vt.addEventListener('change', upd); if (tl) tl.addEventListener('change', upd); upd();
      },
      validate: function (v) { if (!v.ho_ten) return 'Cần nhập họ tên.'; if (v.tro_ly_cho && v.vai_tro !== 'BS') return 'Chỉ bác sĩ mới được gán làm trợ lý.'; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) return 'Email không hợp lệ.'; if (['Trưởng khoa', 'Điều dưỡng trưởng', 'Tài khoản khoa'].indexOf(v.chuc_vu) >= 0 && !v.khoa) return 'Chức vụ này cần chọn khoa.'; if ((v.vai_tro === 'BS' || v.vai_tro === 'DD') && v.kich_hoat !== 'Không' && S.data.dm.KHOA.indexOf(v.khoa) < 0) return (v.vai_tro === 'BS' ? 'Bác sĩ' : 'Điều dưỡng') + ' cần chọn khoa: ' + S.data.dm.KHOA.join(' hoặc ') + '.'; return ''; },
      onOk: function (v) { run('saveUser', v); } });
  }

  // ---------- Chi tiết ----------
  function openDetail(id) {
    var p = byId(id);
    if (!p && S.foundMap && S.foundMap[id]) { var fr = {}; Object.keys(S.foundMap[id]).forEach(function (k) { fr[k] = S.foundMap[id][k]; }); fr._idx = true; fr.da_xa = String(fr.luot_trong_ky || ''); mergeArch({ patients: [fr] }); p = byId(id); }
    if (p && p._idx) {
      setBusy(1);
      call('archiveCourse', { id: id }).then(function (r) {
        S.arch.patients = S.arch.patients.filter(function (x) { return x.id !== id; });
        mergeArch(r.course); S.cc = {};
        S.detail = id; renderDetail();
      }, function (e) { toast(e.error || 'Không mở được đợt xạ lưu trữ.', true); }).finally(function () { setBusy(-1); });
      return;
    }
    S.detail = id; renderDetail();
  }
  function closeDetail() { S.detail = null; $('#drawer').hidden = true; $('#drawer').innerHTML = ''; }

  function calendar(p, c) {
    var dates = c.fx.map(function (f) { return f.ngay; }).concat(c.projected, c.missed);
    if (!dates.length) return '<p class="muted">Chưa có lịch xạ. Kỹ thuật viên sẽ xếp ngày bắt đầu.</p>';
    dates.sort();
    var first = dates[0], last = dates[dates.length - 1];
    if (today() > last && p.trang_thai !== 'HOAN_THANH') last = today();
    var start = RT.addDays(first, -((RT.dow(first) + 6) % 7));
    var end = RT.addDays(last, (7 - RT.dow(last)) % 7);
    var fxByDay = {};
    c.fx.forEach(function (f, i) { (fxByDay[f.ngay] = fxByDay[f.ngay] || []).push({ n: i + 1, f: f }); });
    var abbr = function (s) {
      return RT.splitList(s).map(function (k) { return /CBCT/i.test(k) ? 'C' : /kV/i.test(k) ? 'K' : /MV/i.test(k) ? 'M' : /SGRT|C-RAD/i.test(k) ? 'S' : k.charAt(0); }).join('');
    };
    var h = '<div class="cal">' + ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(function (x) { return '<div class="h">' + x + '</div>'; }).join('');
    for (var d = start, i = 0; d <= end && i < 140; d = RT.addDays(d, 1), i++) {
      var cls = 'c', inner = '<span class="dd">' + fd(d) + '</span>', title = fdw(d), dataDay = '';
      if (fxByDay[d]) {
        cls += ' done' + (fxByDay[d].some(function (x) { return x.f.ghi_bu === 'Có'; }) ? ' late' : '');
        inner += '<span><span class="fx">#' + fxByDay[d].map(function (x) { return x.n; }).join(',') + '</span> <span class="ic">' + fxByDay[d].map(function (x) { return abbr(x.f.hinh_anh); }).join('') + '</span></span>';
        title += ': đã xạ ' + fxByDay[d].map(function (x) { return 'buổi ' + x.n + (x.f.hinh_anh ? ' (' + x.f.hinh_anh + ')' : '') + (x.f.ghi_bu === 'Có' ? ' · GHI BÙ: ' + x.f.ly_do_bu : ''); }).join(', ');
      } else if (c.absent[d] !== undefined) { cls += ' miss' + (c.absent[d] ? '' : ' nr'); inner += '<span>' + (c.absent[d] ? 'vắng' : 'vắng ?') + '</span>'; title += c.absent[d] ? ': vắng · ' + c.absent[d] : ': có lịch nhưng không xạ, chưa rõ lý do'; dataDay = d; }
      else if (c.projected.indexOf(d) >= 0) { cls += c.projected.indexOf(d) >= c.tentativeFrom ? ' plan tent' : ' plan'; inner += '<span>#' + (c.done + c.projected.indexOf(d) + 1) + '</span>'; title += ': dự kiến buổi ' + (c.done + c.projected.indexOf(d) + 1); }
      else if (d < first || d > last) cls += ' blank off';
      else { cls += ' off'; title += ': không có lịch'; }
      if (d === today()) cls += ' today';
      h += dataDay && !p._arch && (can('markAbsent') || can('logFraction')) ? '<button type="button" class="' + cls + '" data-missday="' + dataDay + '" title="' + esc(title + ' · bấm để ghi lý do / ghi bù') + '">' + inner + '</button>' : '<div class="' + cls + '" title="' + esc(title) + '">' + inner + '</div>';
    }
    h += '</div><div class="legend"><span><i style="background:var(--ktv-soft)"></i>Đã xạ</span><span><i style="border:1px dashed var(--accent)"></i>Dự kiến</span><span><i style="background:var(--warn-soft);border:1px solid var(--warn)"></i>Ghi bù</span><span><i style="background:var(--crit-soft)"></i>Vắng (bấm để ghi lý do)</span><span>C = CBCT · K = kV-kV · M = MV · S = SGRT</span></div>';
    return h;
  }

  /** Các đợt xạ khác cùng mã HIS (đang có + lưu trữ). null = đang tải từ lưu trữ. */
  S.hist = {};
  function histFor(p) {
    var key = p.ma_his;
    var live = pts().filter(function (x) { return x.ma_his === key && x.id !== p.id; });
    if (!(key in S.hist)) {
      S.hist[key] = null;
      lookupHis(key).then(function () {
        var rows = (S.hisCache[key] || []).filter(function (x) { return x.luu_tru === 'Có'; }).map(function (x) { var o = {}; Object.keys(x).forEach(function (k) { o[k] = x[k]; }); o._idx = true; return o; });
        mergeArch({ patients: rows });
        S.hist[key] = rows.map(function (x) { return x.id; });
        if (S.detail) renderDetail();
      });
    }
    if (S.hist[key] === null) return live.length ? live : null;
    var arch = (S.hist[key] || []).map(function (id) { return S.arch.patients.filter(function (x) { return x.id === id; })[0]; })
      .filter(function (x) { return x && x.id !== p.id; });
    return live.concat(arch).sort(function (a, b) { return (a.ngay_tao || '') < (b.ngay_tao || '') ? 1 : -1; });
  }
  function mergeArch(a) {
    S.arch = S.arch || { patients: [], phases: [], fractions: [] };
    ['patients', 'phases', 'fractions'].forEach(function (k) {
      (a[k] || []).forEach(function (x) {
        if (S.arch[k].some(function (y) { return y.id === x.id; })) return;
        if (k === 'patients') x._arch = true;
        S.arch[k].push(x);
      });
    });
    S.archEnv = null;
  }
  function renderDetail() {
    var p = byId(S.detail);
    if (!p) { closeDetail(); return; }
    var c = course(p), started = c.done > 0;
    var pct = c.open ? 0 : c.total ? Math.round(c.done / c.total * 100) : 0;
    var dr = $('#drawer');
    var acts = detailActions(p);
    var tl = [
      ['Thêm vào hệ thống', p.ngay_tao, p.nguoi_nhap && p.nguoi_nhap !== p.bs_email ? 'nhập bởi ' + nameOf(p.nguoi_nhap) + ' theo phiếu chỉ định' : ''],
      ['Mô phỏng', p.ngay_mo_phong && p.trang_thai !== 'MO_PHONG' ? p.ngay_mo_phong : '', p.trang_thai === 'MO_PHONG' && p.ngay_mo_phong ? 'Hẹn ' + fdw(p.ngay_mo_phong) : ''],
      ['Contour xong', p.ngay_contour_xong, nameOf(p.bs_email)],
      ['Kỹ sư nhận lập KH', p.ngay_nhan_kh, nameOf(p.ks_email)],
      ['Lập KH xong', p.ngay_kh_xong, p.can_qa === 'Có' ? 'Cần QA' : p.can_qa === 'Không' ? 'Không cần QA' : ''],
      p.can_qa === 'Có' ? ['QA ' + (p.qa_ket_qua === 'Chờ QA' ? '' : p.qa_ket_qua.toLowerCase()), p.ngay_qa, ''] : null,
      ['Bắt đầu xạ', c.fx[0] ? c.fx[0].ngay : '', !started && p.ngay_du_kien ? 'Dự kiến ' + fdw(p.ngay_du_kien) : ''],
      ['Kết thúc xạ', p.ngay_ket_thuc, !p.ngay_ket_thuc && c.end ? 'Dự kiến ' + fdw(c.end) : '']
    ].filter(Boolean);
    var imgKeys = Object.keys(c.imaging);
    var ro = !!p._arch;
    if (!ro && canTransfer(p)) acts = acts + btn('transfer', p.id, 'Chuyển BS điều trị');
    if (!ro) acts = acts + (can('createPatient') ? btn('newCourse', p.id, p.trang_thai === 'KHONG_XA' ? 'Mô phỏng lại (đợt mới)' : '+ Đợt xạ mới cho BN này', p.trang_thai === 'KHONG_XA' ? 'primary' : '') : '');
    var rowsSg = c.segs.filter(function (x) { return !x.tail; }), inSeg = rowsSg.map(function (x) { return x.g; });
    (S.data.phases || []).forEach(function (g) {
      if (g.bn_id !== p.id || g.trang_thai === 'HUY' || inSeg.indexOf(g) >= 0) return;
      var q = c.par.filter(function (x) { return x.g === g; })[0], d = RT.num(g.tong_lieu) / Math.max(1, RT.num(g.so_buoi));
      rowsSg.push({ label: g.loai === 'KH_LAI' ? 'KH lại (chờ)' : 'KH đồng thời', ky_thuat: g.ky_thuat, tong_lieu: RT.num(g.tong_lieu), so_buoi: RT.num(g.so_buoi), d: Math.round(d * 100) / 100, g: g, from: 1e9, dn: q ? q.done : 0 });
    });
    var boosts = rowsSg.filter(function (x) { return x.g; }), endSt = ['HOAN_THANH', 'KHONG_XA', 'HUY'].indexOf(p.trang_thai) >= 0;
    var phaseSec = '';
    if (boosts.length || (!ro && can('addPhase') && !endSt)) {
      phaseSec = '<div class="sec"><div class="group-head"><h3>Các giai đoạn xạ</h3>' + (!ro && can('addPhase') && !endSt ? '<button class="btn" data-do="addPhase" data-id="' + esc(p.id) + '">+ Thêm boost / KH đồng thời</button>' : '') + '</div>' +
        '<div class="tbl-wrap"><table><thead><tr><th>GĐ</th><th>Kỹ thuật · liều</th><th>Buổi</th><th>Kế hoạch</th><th></th></tr></thead><tbody>' +
        rowsSg.map(function (sg) {
          var dn = sg.dn != null ? sg.dn : Math.max(0, Math.min(c.done, sg.to) - sg.from);
          var g = sg.g, st = g ? g.trang_thai : '';
          var a = [];
          if (g && !ro) {
            var it = byId(g.id), B = function (k, l, cl) { a.push(btn(k, g.id, l, cl)); };
            if (st === 'MO_PHONG' && can('simDone')) B('simDone', 'Đã mô phỏng', 'primary');
            if (st === 'CONTOUR' && can('contourDone')) B('contourDone', 'Contour xong', 'primary');
            if (st === 'CHO_KH' && can('claimPlan')) B('claimPlan', 'Nhận ca');
            if (st === 'DANG_KH' && can('claimPlan')) B('claimPlan', 'Đổi kỹ sư');
            if ((st === 'CHO_KH' || st === 'DANG_KH') && can('planDone')) B('planDone', 'Lập KH xong', 'primary');
            if ((st === 'CHO_KH' || st === 'DANG_KH') && can('returnToDoctor')) B('returnToDoctor', 'Trả lại BS');
            if (st === 'CHO_QA' && can('qaResult')) { B('qaPass', 'QA đạt', 'ok'); B('qaFail', 'Không đạt', 'danger'); }
            if (can('updatePhase')) B('editPhase', 'Sửa');
            if (can('deletePhase') && c.done <= sg.from) B('deletePhase', 'Huỷ', 'danger');
          }
          var plan = g ? '<span class="pill st-' + st + '">' + esc(RT.STATUS[st]) + '</span>' + (g.ks_email ? '<span class="sub">' + esc(nameOf(g.ks_email)) + (g.qa_ket_qua ? ' · QA ' + esc(g.qa_ket_qua) : '') + '</span>' : '') +
            (g.di_cung === 'Có' ? '<span class="sub">Lập KH cùng GĐ1</span>' : '') +
            (g.loai === 'KH_LAI' ? '<span class="sub">' + (g.cat_tai ? 'Thay GĐ' + esc(g.thay_gd) + ' từ buổi ' + (RT.num(g.cat_tai) + 1) : 'Chờ xong KH; trong lúc chờ ' + (p.ly_do_tam_ngung === 'Chờ lập lại kế hoạch' ? 'BN tạm dừng xạ' : 'BN vẫn xạ KH cũ')) + '</span>' : '') +
            (g.loai === 'SONG_SONG' ? '<span class="sub">Xạ cùng ngày với KH chính' + (RT.num(g.bo_qua) ? ' · bù ' + RT.num(g.bo_qua) + ' buổi ở cuối' : '') + '</span>' : '')
            : '<span class="pill st-' + (p.trang_thai === 'HUY' ? 'HUY' : (RT.PLAN_STATES.indexOf(p.trang_thai) >= 0 ? p.trang_thai : 'SAN_SANG')) + '">' + esc(RT.PLAN_STATES.indexOf(p.trang_thai) >= 0 ? RT.STATUS[p.trang_thai] : RT.STATUS.SAN_SANG) + '</span>';
          return '<tr><td><b>' + sg.label + '</b></td><td class="nowrap">' + esc(sg.ky_thuat) + '<span class="sub">' + sg.tong_lieu + ' Gy · ' + sg.d + ' Gy/buổi</span>' + (g && g.muc_lieu ? '<span class="sub">' + esc(g.muc_lieu) + '</span>' : '') + '</td>' +
            '<td class="num nowrap">' + dn + '/' + sg.so_buoi + '</td><td>' + plan + '</td><td class="act">' + a.join(' ') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
    var hist = histFor(p);
    var histSec = '<div class="sec"><h3>Các đợt xạ của bệnh nhân này</h3>' + (hist === null ? '<p class="muted">Đang tìm các đợt xạ trước…</p>' :
      hist.length ? '<div class="tbl-wrap"><table><thead><tr><th>Đợt</th><th>Vị trí · chẩn đoán</th><th>Liều</th><th>Thời gian</th><th>Trạng thái</th></tr></thead><tbody>' +
        hist.map(function (h) {
          var hc = course(h);
          return '<tr class="click" data-hist="' + esc(h.id) + '"><td class="mono nowrap">' + esc(h.id) + (h._arch ? '<span class="sub">Lưu trữ</span>' : '') + '</td><td>' + esc(h.vi_tri || '—') + '<span class="sub">' + esc(h.chan_doan) + (h.muc_dich ? ' · ' + esc(h.muc_dich) : '') + '</span></td>' +
            '<td class="nowrap">' + hc.doseDone + '/' + hc.doseTotal + ' Gy<span class="sub">' + hc.done + '/' + hc.total + ' buổi · ' + esc(h.ky_thuat) + '</span></td>' +
            '<td class="num nowrap">' + (hc.start ? fd(hc.start) + '/' + hc.start.slice(2, 4) : '—') + (h.ngay_ket_thuc ? ' → ' + fd(h.ngay_ket_thuc) + '/' + h.ngay_ket_thuc.slice(2, 4) : '') + '</td><td>' + stPill(h) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="muted">Đây là đợt xạ đầu tiên của bệnh nhân trong hệ thống.</p>') + '</div>';

    dr.innerHTML = '<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-t">' +
      '<div class="drawer-head"><div class="row"><h2 id="dr-t">' + esc(p.ho_ten) + '</h2><button class="x" data-close aria-label="Đóng">×</button></div>' +
      '<div>' + stPill(p) + ' ' + prPill(p) + (p.ly_do_uu_tien && p.uu_tien !== 'Thường' ? ' <span class="muted">(' + esc(p.ly_do_uu_tien) + ')</span>' : '') + ' <span class="muted">· Mã HIS</span> <b class="mono">' + esc(p.ma_his) + '</b><button class="copy" id="copy-his">Sao chép</button>' +
      '<span class="muted"> · ' + [age(p), p.gioi, p.id].filter(Boolean).map(esc).join(' · ') + '</span></div></div>' +
      '<div class="drawer-body">' +
      (ro ? '<div class="sec" style="border-color:var(--blue)"><h3 style="color:var(--blue)">Hồ sơ lưu trữ</h3><p>Đợt xạ đã kết thúc và được chuyển sang lưu trữ. Chỉ xem, không sửa.</p></div>' : '') +
      (c.reviewWait && !ro ? '<div class="sec" style="border-color:var(--warn)"><h3>Chờ BS đánh giá lại</h3><p>KS chuyển ' + (c.review - c.reviewSeg.from) + '/' + c.reviewSeg.so_buoi + ' buổi ' + esc(c.reviewSeg.label) + ', BN đã xạ hết. KTV chưa ghi được buổi tiếp theo cho tới khi BS chọn:</p><div class="acts">' +
        (can('setReview') ? btn('reviewGo', p.id, 'Xạ tiếp KH cũ', 'primary') : '') + (can('replan') ? btn('replan', p.id, 'Lập lại KH (contour / mô phỏng lại)') : '') + (can('endEarly') ? btn('endEarly', p.id, 'Kết thúc đợt', 'danger') : '') + '</div></div>' :
       c.blocked && p.trang_thai !== 'HOAN_THANH' ? '<div class="sec" style="border-color:var(--crit)"><h3 style="color:var(--crit)">BN đang chờ kế hoạch boost</h3><p>Đã xạ xong các giai đoạn trước. Kế hoạch ' + esc(c.cur.label) + ' chưa sẵn sàng nên KTV chưa ghi được buổi xạ tiếp theo.</p></div>' :
        (!ro && c.leftBeforeBlock > 0 && c.leftBeforeBlock <= 5 && c.readyTo < c.total && ['DANG_XA', 'TAM_NGUNG'].indexOf(p.trang_thai) >= 0 ? '<div class="sec" style="border-color:var(--warn)"><h3 style="color:var(--warn)">Sắp tới boost</h3><p>Còn ' + c.leftBeforeBlock + ' buổi nữa là hết giai đoạn hiện tại, kế hoạch boost chưa sẵn sàng.</p></div>' : '')) +
      simSec(p) +
      '<div class="sec"><h3>Chỉ định' + (c.multi ? ' · GĐ1' : '') + '</h3><div class="kv">' +
      icdKv(p) + kvi('Chẩn đoán', p.chan_doan) + kvi('Vị trí xạ', p.vi_tri || '—') + kvi('Mục đích', p.muc_dich || '—') + kvi('Bác sĩ điều trị', nameOf(p.bs_email)) + kvi('Khoa', p.khoa) +
      kvi('Kỹ thuật', p.ky_thuat) + kvi('Tổng liều', p.tong_lieu + ' Gy / ' + p.so_buoi + ' buổi') + kvi('Liều mỗi buổi', RT.dosePerFx(p) + ' Gy') +
      (p.muc_lieu ? kvi('Các mức liều (SIB)', p.muc_lieu) : '') +
      kvi('IGRT', p.igrt || 'Không') + kvi('SGRT', p.sgrt || 'Không') + kvi('Lịch tuần', RT.needsOffDay(p) ? 'Chưa rõ ngày nghỉ (tạm xạ cả T7)' : RT.scheduleLabel(p)) +
      kvi('Máy', p.may || '—') + kvi('Kỹ sư lập KH', p.ks_email ? nameOf(p.ks_email) : '—') + kvi('QA', p.qa_ket_qua || '—') +
      (c.par.length ? '<div class="kv-full"><span>Hai kế hoạch xạ cùng ngày · tổng ' + c.total + ' ngày xạ</span><b>' + ['<div>' + esc(mainName(p)) + ': ' + esc(p.ky_thuat) + ' ' + c.doseTotal + ' Gy/' + c.mainTotal + ' buổi · đã xạ ' + c.mainDone + '/' + c.mainTotal + '</div>'].concat(c.par.map(function (q) { return '<div>' + esc(parName(q)) + ': ' + esc(q.ky_thuat) + ' ' + RT.num(q.g.tong_lieu) + ' Gy/' + q.total + ' buổi · đã xạ ' + q.done + '/' + q.total + '</div>'; })).join('') + '</b></div>'
        : c.multi ? kvi('Tổng cả đợt', c.doseTotal + ' Gy / ' + c.total + ' buổi') : '') +
      (c.review ? kvi('Chuyển KH một phần', 'Chuyển ' + (c.review - c.reviewSeg.from) + '/' + c.reviewSeg.so_buoi + ' buổi ' + esc(c.reviewSeg.label) + ' · đánh giá lại sau buổi ' + c.review) : '') +
      '</div></div>' + phaseSec +
      (p.ly_do_ket_thuc ? '<div class="sec" style="border-color:var(--warn)"><h3 style="color:var(--warn)">Kết thúc sớm</h3><p>' + esc(p.ly_do_ket_thuc) + '</p></div>' : '') +
      (p.trang_thai === 'TAM_NGUNG' ? '<div class="sec" style="border-color:var(--crit)"><h3 style="color:var(--crit)">Đang tạm ngừng xạ</h3><p>Từ <b>' + fdw(p.tam_ngung_tu) + '</b> (' + daysSince(p.tam_ngung_tu) + ' ngày). Lý do: ' + esc(p.ly_do_tam_ngung) + '</p></div>' : '') +
      '<div class="sec"><h3>Tiến độ xạ</h3><div class="big-prog">' +
      '<div><div class="n">' + c.done + '<small> / ' + c.total + ' buổi</small></div><div class="l">Đã xạ</div></div>' +
      '<div><div class="n">' + c.doseDone + '<small> / ' + c.doseTotal + ' Gy</small></div><div class="l">Liều đã nhận</div></div>' +
      '<div><div class="n" style="font-size:18px">' + (c.start ? fdw(c.start) : '—') + '</div><div class="l">' + (started ? 'Bắt đầu' : 'Dự kiến bắt đầu') + '</div></div>' +
      '<div><div class="n" style="font-size:18px">' + (c.end ? fdw(c.end) : '—') + '</div><div class="l">' + (p.trang_thai === 'HOAN_THANH' ? 'Kết thúc' : 'Dự kiến kết thúc') + '</div></div>' +
      (c.missed.length ? '<div><div class="n" style="font-size:18px;color:var(--crit)">' + c.missed.length + '</div><div class="l">Buổi vắng</div></div>' : '') +
      '</div><span class="bar wide"><i style="width:' + pct + '%"></i></span>' + calendar(p, c) + '</div>' +
      '<div class="sec"><h3>IGRT / SGRT đã thực hiện</h3>' + (imgKeys.length ? '<div class="img-sum">' + imgKeys.map(function (k) {
        return '<div><b>' + esc(k) + ' · ' + c.imaging[k].length + ' lần</b><span class="dates">' + c.imaging[k].map(fd).join(', ') + '</span></div>';
      }).join('') + '</div>' : '<p class="muted">Chưa có buổi nào ghi nhận IGRT hoặc SGRT.</p>') + '</div>' +
      (c.fx.length ? '<div class="sec"><h3>Các buổi đã xạ</h3><div class="tbl-wrap"><table><thead><tr><th>Buổi</th>' + (c.multi ? '<th>GĐ</th>' : '') + '<th>Ngày</th><th>Hình ảnh / định vị</th><th>KTV</th><th></th></tr></thead><tbody>' +
        c.fx.slice().reverse().map(function (f) {
          var i = c.fx.indexOf(f) + 1;
          var undo = !ro && can('undoFraction') && (role() === 'ADMIN' || RT.diffDays(f.ngay, today()) <= 2) ? '<button class="btn danger" data-undo="' + esc(f.id) + '">Huỷ</button>' : '';
          var sgl = c.multi ? '<td>' + c.segs.filter(function (x) { return i - 1 >= x.from && i - 1 < x.to; }).map(function (x) { return x.label; })[0] + '</td>' : '';
          return '<tr><td class="num">' + i + '</td>' + sgl + '<td class="num nowrap">' + fdw(f.ngay) + '</td><td>' + esc(f.hinh_anh || '—') + (f.ghi_chu ? '<span class="sub">' + esc(f.ghi_chu) + '</span>' : '') + '</td><td class="nowrap">' + esc(nameOf(f.ktv_email)) + '</td><td class="act">' + undo + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' : '') +
      '<div class="sec"><h3>Quá trình</h3><ul class="timeline">' + tl.map(function (x) {
        return '<li class="' + (x[1] ? '' : 'pending') + '"><span class="d">' + (x[1] ? fdy(x[1]) : '—') + '</span><span>' + esc(x[0]) + (x[2] ? ' <span class="muted">· ' + esc(x[2]) + '</span>' : '') + '</span></li>';
      }).join('') + '</ul></div>' +
      (p.ghi_chu ? '<div class="sec"><h3>Ghi chú</h3><div class="note-box">' + esc(p.ghi_chu) + '</div></div>' : '') +
      histSec +
      '</div>' + (ro ? '' : acts ? '<div class="drawer-foot">' + acts + '</div>' : '<div class="drawer-foot"><span class="muted">Chế độ xem. Tài khoản của bạn không cần cập nhật ở bước này.</span></div>') + '</aside>';
    dr.hidden = false;
    $$('[data-close]', dr).forEach(function (b) { b.onclick = closeDetail; });
    $$('[data-do]', dr).forEach(function (b) { b.onclick = function () { doAction(b.dataset.do, b.dataset.id); }; });
    $$('[data-undo]', dr).forEach(function (b) { b.onclick = function () { doAction('undoFx', b.dataset.undo); }; });
    $$('[data-hist]', dr).forEach(function (b) { b.onclick = function () { openDetail(b.dataset.hist); }; });
    $$('[data-missday]', dr).forEach(function (b) { b.onclick = function () { missedDayForm(p, b.dataset.missday); }; });
    var cp = $('#copy-his');
    cp.onclick = function () {
      var ok = function () { toast('Đã sao chép mã HIS ' + p.ma_his); };
      try { navigator.clipboard.writeText(p.ma_his).then(ok, function () { selectText(cp.previousElementSibling); }); } catch (e) { selectText(cp.previousElementSibling); }
    };
  }
  function selectText(el) { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); toast('Đã chọn mã HIS, bấm Ctrl+C để sao chép.'); }
  function kvi(k, v) { return '<div><span>' + esc(k) + '</span><b>' + esc(v || '—') + '</b></div>'; }
  /** Mã ICD dạng nhãn: mã chính đậm, mã thêm (BN có 2 ung thư) nhạt hơn, rê chuột xem tên bệnh */
  function icdTags(p) {
    if (!p.icd && !p.icd_phu) return '';
    return RT.icdsOf(p).map(function (c, i) { return '<span class="icd-tag' + (i ? ' sec' : '') + '" title="' + esc((i ? 'ICD thêm: ' : 'ICD chính: ') + c + (RT.icdName(c) ? ' · ' + RT.icdName(c) : '')) + '">' + esc(c) + '</span> '; }).join('');
  }
  /** Ô ICD trong hồ sơ: mỗi mã một dòng kèm tên bệnh, ghi rõ chính / thêm */
  function icdKv(p) {
    var l = RT.icdsOf(p);
    if (!l.length) return kvi('Mã ICD-10', '');
    return '<div class="kv-full"><span>Mã ICD-10' + (l.length > 1 ? ' (BN có ' + l.length + ' ung thư)' : '') + '</span><b>' + l.map(function (c, i) {
      return '<span class="icd-line"><span class="icd-tag' + (i ? ' sec' : '') + '">' + esc(c) + '</span> ' + esc(RT.icdName(c) || '') + (l.length > 1 ? ' <span class="tag">' + (i ? 'thêm' : 'chính') + '</span>' : '') + '</span>';
    }).join('') + '</b></div>';
  }

  /** Mục "Mô phỏng" trong hồ sơ: mọi vai trò đều xem được. Mỗi lần mô phỏng (đợt này, boost / KH lại) một khối. */
  function simSec(p) {
    var gs = ((p._arch && S.arch ? S.arch.phases : S.data.phases) || []).filter(function (g) {
      return g.bn_id === p.id && g.trang_thai !== 'HUY' && g.di_cung !== 'Có' && (g.trang_thai === 'MO_PHONG' || g.nguoi_mo_phong || g.mat_na || g.mp_his);
    }).sort(function (a, b) { return RT.num(a.stt) - RT.num(b.stt); });
    var who = function (x) {
      var l = RT.splitList(x.nguoi_mo_phong || '');
      if (!l.length && x.ngay_mo_phong) rosterRows().forEach(function (r) { if (r.ngay === x.ngay_mo_phong && /mô phỏng/i.test(r.vi_tri || '')) RT.splitList(r.nhan_vien).forEach(function (e) { if (l.indexOf(e) < 0) l.push(e); }); });
      return l.map(nameOf).join(', ');
    };
    var block = function (x, title) {
      var pre = x.trang_thai === 'MO_PHONG' || x.trang_thai === 'CHO_PL' && !x.ngay_mo_phong;
      var mn = !x.mat_na ? 'Chưa ghi' : x.mat_na === 'Không' ? 'Không làm mặt nạ' : x.mat_na + (x.mat_na_cu === 'Có' ? ' (dùng lại mặt nạ cũ)' : x.mat_na_cu === 'Không' ? ' (mặt nạ mới)' : '');
      return (title ? '<div class="kv-full"><span></span><b class="sim-t">' + title + '</b></div>' : '') +
        kvi('Ngày mô phỏng', pre ? 'Chưa mô phỏng' + (x.ngay_mo_phong ? ' · hẹn ' + fdw(x.ngay_mo_phong) : '') : x.ngay_mo_phong ? fdw(x.ngay_mo_phong) + '/' + x.ngay_mo_phong.slice(0, 4) : 'Chưa ghi') +
        (pre ? '' : kvi('KTV mô phỏng', who(x) || 'Chưa ghi') + kvi('Mặt nạ', mn) + kvi('Tiêm thuốc cản quang', x.tiem_thuoc || 'Chưa ghi') + kvi('Dụng cụ', x.dung_cu || 'Không')) +
        (x.mp_his ? kvi('Chỉ định mô phỏng lại trên HIS', x.mp_his === 'Có' ? 'Có · vào sổ mô phỏng' : 'Không · không vào sổ mô phỏng') : '');
    };
    var html = block(p, gs.length ? (p.mp_his ? 'Đợt này (mô phỏng lại)' : 'Lần đầu') : '');
    gs.forEach(function (g) { html += block(g, phKind(g) + (g.loai ? '' : ' GĐ' + esc(g.stt))); });
    return '<div class="sec"><h3>Mô phỏng</h3><div class="kv">' + html + '</div></div>';
  }
  function detailActions(p) {
    if (p._arch) return '';
    var a = [], st = p.trang_thai, b = function (act, label, cls) { a.push(btn(act, p.id, label, cls)); };
    if (can('logFraction') && ['CHO_XA', 'DANG_XA', 'TAM_NGUNG'].indexOf(st) >= 0) b('logFx', '✓ Ghi buổi xạ', 'ok');
    if (can('logFraction') && st === 'CHO_PL' && plFx(p).length && p.ky_thuat) b('logFx', '✓ BN quay lại xạ: ghi buổi xạ', 'ok');
    if (can('simDone') && st === 'MO_PHONG') b('simDone', 'Đã mô phỏng xong', 'primary');
    if (can('contourDone') && st === 'CONTOUR') b('contourDone', 'Contour xong', 'primary');
    if (can('claimPlan') && st === 'CHO_KH') b('claimPlan', 'Nhận ca');
    if (can('claimPlan') && st === 'DANG_KH') b('claimPlan', 'Đổi kỹ sư');
    if (can('markAbsent') && ['DANG_XA', 'CHO_XA'].indexOf(st) >= 0 && course(p).treatToday && !course(p).doneToday) b('absent', 'BN vắng hôm nay');
    if (can('planDone') && (st === 'CHO_KH' || st === 'DANG_KH')) b('planDone', 'Lập KH xong', 'primary');
    if (can('returnToDoctor') && (st === 'CHO_KH' || st === 'DANG_KH')) b('returnToDoctor', 'Trả lại BS');
    if (can('qaResult') && st === 'CHO_QA') { b('qaPass', 'QA đạt', 'ok'); b('qaFail', 'QA không đạt', 'danger'); }
    if (can('schedule') && st !== 'HOAN_THANH') b('schedule', 'Xếp lịch');
    if (can('setPriority') && ['CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA'].indexOf(st) >= 0) b('priority', 'Đổi ưu tiên');
    if (can('pause') && (st === 'CHO_XA' || st === 'DANG_XA')) b('pause', 'Tạm ngừng', 'danger');
    if (can('resume') && st === 'TAM_NGUNG') b('resume', 'Tiếp tục xạ');
    if (st === 'CHO_PL' && canClassify(p)) b('classify', 'Phân loại', 'primary');
    if (can('changeTech') && ['CHO_KH', 'DANG_KH', 'CHO_QA'].indexOf(st) >= 0) b('changeTech', 'Đổi kỹ thuật');
    if (can('setOffDay') && !can('schedule') && ['CHO_XA', 'DANG_XA', 'TAM_NGUNG'].indexOf(st) >= 0) b('offDay', 'Sửa lịch tuần');
    if (can('updatePatient')) b('edit', 'Sửa thông tin');
    if (can('setReview') && ['CHO_QA', 'CHO_XA', 'DANG_XA', 'TAM_NGUNG'].indexOf(st) >= 0 && !course(p).reviewWait && !course(p).cur.tail) b('reviewSet', course(p).review ? 'Sửa số buổi chuyển' : 'Chuyển KH một phần');
    if (can('replan') && (st === 'DANG_XA' || st === 'TAM_NGUNG') && !(S.data.phases || []).some(function (g) { return g.bn_id === p.id && g.loai === 'KH_LAI' && !g.cat_tai && g.trang_thai !== 'HUY'; })) b('replan', 'Lập lại KH');
    if (can('endEarly') && ['CHO_XA', 'DANG_XA', 'TAM_NGUNG'].indexOf(st) >= 0) b('endEarly', 'Kết thúc sớm', 'danger');
    if (can('noTreat') && ['CHO_PL', 'MO_PHONG', 'CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA', 'CHO_XA'].indexOf(st) >= 0 && !course(p).done) b('noTreat', 'Không xạ', 'danger');
    if (can('deletePatient') && RT.canCancel(p, S.data.fractions) && (role() === 'ADMIN' || RT.myDoctors(me()).indexOf(p.bs_email) >= 0)) b('deletePatient', 'Huỷ hồ sơ', 'danger');
    return a.join('');
  }

  // ---------- thao tác ----------
  function doAction(action, id) {
    var p = byId(id);
    switch (action) {
      case 'logFx': return fractionForm(p);
      case 'undoFx': return undoForm(id);
      case 'contourDone': return contourForm(p);
      case 'claimPlan': return claimForm(p);
      case 'absent': return absentForm(p, today());
      case 'openP': return openDetail(p.id);
      case 'planDone': return planDoneForm(p);
      case 'returnToDoctor': return reasonForm('Trả lại bác sĩ chỉnh contour', p, 'Lý do trả lại', 'Trả lại', function (v) { run('returnToDoctor', { id: id, ly_do: v.ly_do }); });
      case 'qaPass': return modal({ title: 'QA đạt', body: whoBox(p) + field('Ghi chú (không bắt buộc)', '<input type="text" name="ghi_chu" placeholder="VD: Gamma 3%/2mm: 98,6%">'), ok: 'Xác nhận QA đạt', btnClass: 'ok', onOk: function (v) { run('qaResult', { id: id, dat: true, ghi_chu: v.ghi_chu }); } });
      case 'qaFail': return reasonForm('QA không đạt', p, 'Kết quả / lý do', 'Ghi QA không đạt', function (v) { run('qaResult', { id: id, dat: false, ghi_chu: v.ly_do }); }, 'BN sẽ quay lại bước “Đang lập KH”.');
      case 'schedule': return scheduleForm(p);
      case 'priority': return priorityForm(p);
      case 'pause': return pauseForm(p);
      case 'confirmPause': return modal({ title: 'BN vẫn xạ tiếp', body: whoBox(p) + '<p>Tạm ngừng từ <b>' + fdw(p.tam_ngung_tu) + '</b> (' + daysSince(p.tam_ngung_tu) + ' ngày). Lý do: ' + esc(p.ly_do_tam_ngung || '') + '</p>' + field('Ghi chú', '<input type="text" name="ghi_chu" placeholder="VD: hẹn quay lại xạ thứ Hai">'), ok: 'Xác nhận vẫn xạ tiếp', onOk: function (v) { run('confirmPause', { id: id, ghi_chu: v.ghi_chu }); } });
      case 'approveSched': return scheduleForm(p, 'approve');
      case 'classify': return classifyForm(p);
      case 'changeTech': return changeTechForm(p);
      case 'offDay': return offDayForm(p);
      case 'transfer': return transferForm(p.bs_email, [p.id]);
      case 'rejectSched': return reasonForm('Trả lại đề xuất lịch', p, 'Lý do trả lại', 'Trả lại', function (v) { run('rejectSchedule', { id: id, ly_do: v.ly_do }); }, 'Người đề xuất sẽ nhận thông báo trên chuông.');
      case 'resume': return run('resume', { id: id });
      case 'edit': return patientForm(p);
      case 'newCourse': return patientForm(null, p.trang_thai === 'KHONG_XA'
        ? { ma_his: p.ma_his, ho_ten: p.ho_ten, nam_sinh: p.nam_sinh, gioi: p.gioi, khoa: p.khoa, bs_email: p.bs_email, chan_doan: p.chan_doan, icd: p.icd, icd_phu: p.icd_phu, vi_tri: p.vi_tri, muc_dich: p.muc_dich, ky_thuat: p.ky_thuat, tong_lieu: p.tong_lieu, so_buoi: p.so_buoi, muc_lieu: p.muc_lieu, uu_tien: 'Thường', igrt: p.igrt || 'Không', sgrt: p.sgrt || 'Không', _step: 'MO_PHONG', _force: true }
        : { ma_his: p.ma_his, ho_ten: p.ho_ten, nam_sinh: p.nam_sinh, gioi: p.gioi, khoa: p.khoa, bs_email: p.bs_email, chan_doan: p.chan_doan, icd: p.icd, icd_phu: p.icd_phu, uu_tien: 'Thường', igrt: 'Không', sgrt: 'Không', muc_dich: 'Giảm nhẹ / triệu chứng', _force: true });
      case 'addPhase': return phaseForm(p, null);
      case 'replan': return replanForm(p);
      case 'reviewSet': return reviewForm(p, false);
      case 'reviewGo': return reviewForm(p, true);
      case 'noTreat': return reasonForm('Không xạ', p, 'Lý do không xạ', 'Ghi không xạ', function (v) { run('noTreat', { id: id, ly_do: v.ly_do }); }, 'Đợt này đóng lại, không tính vào bảng xạ 3D / VMAT nhưng vẫn có trong sổ mô phỏng (nếu đã mô phỏng). Khi BN quay lại, mở hồ sơ và bấm “Mô phỏng lại (đợt mới)”.');
      case 'editPhase': return phaseForm(byId(p._pid), p._g);
      case 'deletePhase': return reasonForm('Huỷ giai đoạn boost', p, 'Lý do huỷ', 'Huỷ boost', function (v) { run('deletePhase', { id: id, ly_do: v.ly_do }); });
      case 'simDone': return simForm(p, id);
      case 'endEarly': return reasonForm('Kết thúc đợt xạ sớm', p, 'Lý do kết thúc sớm', 'Kết thúc đợt xạ', function (v) { run('endEarly', { id: id, ly_do: v.ly_do }); }, 'Đã xạ ' + course(p).done + '/' + p.so_buoi + ' buổi. BN sẽ chuyển sang “Hoàn thành”.');
      case 'deletePatient': return deleteForm(p);
    }
  }
  /** Chọn nhân viên dạng nút bấm (nhiều người) */
  function staffChips(name, list, sel) {
    return '<div class="checks staff">' + list.map(function (u) { return '<label><input type="checkbox" name="' + name + '" data-multi="1" value="' + esc(u.email) + '"' + (sel.indexOf(u.email) >= 0 ? ' checked' : '') + '><span>' + esc(u.ho_ten) + (u.ky_hieu ? ' <small class="muted">(' + esc(u.ky_hieu) + ')</small>' : '') + '</span></label>'; }).join('') + '</div>';
  }
  /** Người theo bảng phân công hôm nay ở vị trí có chứa chữ cho trước */
  function rosterToday(match) {
    var out = [];
    rosterRows().filter(function (r) { return r.ngay === today() && match(String(r.vi_tri || '')); }).forEach(function (r) { RT.splitList(r.nhan_vien).forEach(function (e) { if (out.indexOf(e) < 0) out.push(e); }); });
    return out;
  }
  function ktvList() { return activeUsers().filter(function (u) { return u.vai_tro === 'KTV'; }); }
  function simForm(p, id) {
    var list = ktvList();
    var sel = rosterToday(function (v) { return /mô phỏng/i.test(v); }).filter(function (e) { return list.some(function (u) { return u.email === e; }); });
    if (!sel.length) sel = S.lastSim || (role() === 'KTV' ? [me().email] : []);
    var g = p._g, mph = g ? g.mp_his : p.mp_his, resim = !!mph, pv = resim ? RT.prevSim(S.data, g ? g.bn_id : p.id, g ? g.id : '') : null;
    var resimBox = !resim ? '' : '<div class="confirm" style="cursor:default;font-weight:500;display:block">Mô phỏng lại. ' +
      (pv ? 'Lần mô phỏng trước (' + fdy(pv.ngay) + '): ' + (pv.mat_na ? 'BN <b>có dùng mặt nạ ' + esc(pv.mat_na) + '</b>.' : 'BN <b>không dùng mặt nạ</b>.') : 'Không thấy lần mô phỏng trước trong ứng dụng (đợt cũ đã lưu trữ).') +
      (mph === 'Không' ? '<br>BS ghi: <b>chưa tích chỉ định mô phỏng lại trên HIS</b>, lần mô phỏng này không vào sổ mô phỏng.' : '') + '</div>';
    var maskQ = !resim ? '' :
      '<div class="field full" id="mn-cu" hidden><span class="lb">Lần trước BN dùng mặt nạ ' + esc(pv ? pv.mat_na : '') + '. Lần này dùng mặt nạ cũ hay làm mặt nạ mới? <span class="req">*</span></span><div class="radios">' +
        '<label><input type="radio" name="mat_na_cu" value="Có"><span><b>Dùng lại mặt nạ cũ</b><small>Không có thủ thuật mặt nạ trên HIS, không ghi mặt nạ vào sổ</small></span></label>' +
        '<label><input type="radio" name="mat_na_cu" value="Không"><span><b>Làm mặt nạ mới</b><small>Phải có thủ thuật làm mặt nạ trên HIS</small></span></label></div></div>' +
      '<p class="muted full" id="mn-new" hidden>Khác loại với lần trước (hoặc lần trước không có mặt nạ): đây là <b>mặt nạ mới</b>.</p>' +
      '<label class="confirm full" id="mn-his" hidden><input type="checkbox" name="mat_na_his"><span>Đã có <b>thủ thuật làm mặt nạ trên HIS</b> (để vào sổ mô phỏng và thống kê mặt nạ)</span></label>';
    modal({ title: p._g ? 'Đã mô phỏng lại xong (' + phKind(p._g) + ')' : 'Đã mô phỏng xong', ok: 'Xác nhận',
      body: whoBox(p) + '<p class="muted">Ghi nhận BN đã chụp CT mô phỏng hôm nay. BN chuyển sang bước bác sĩ contour.</p>' + resimBox +

        '<div class="form">' + field('Mặt nạ <span class="req">*</span>', '<select name="mat_na">' + opts([{ v: 'Không', l: 'Không làm mặt nạ' }].concat((S.data.dm.MAT_NA || RT.DEFAULT_DM.MAT_NA).map(function (x) { return { v: x, l: 'Mặt nạ ' + x }; })), '', 'Chọn…') + '</select>') +
        maskQ + '<div class="field"><span class="lb">Tiêm thuốc cản quang <span class="req">*</span></span><div class="radios inline"><label><input type="radio" name="tiem_thuoc" value="Có"><span><b>Có</b></span></label><label><input type="radio" name="tiem_thuoc" value="Không"><span><b>Không</b></span></label></div></div></div>' +
        '<div class="field"><span class="lb">Dụng cụ khác (nếu có)</span><div class="checks">' + (S.data.dm.DUNG_CU || RT.DEFAULT_DM.DUNG_CU).map(function (x) { return '<label><input type="checkbox" name="dung_cu" data-multi="1" value="' + esc(x) + '"><span>' + esc(x) + '</span></label>'; }).join('') + '</div>' +
        '<input type="text" name="dung_cu_khac" placeholder="Khác, tự ghi" style="margin-top:6px"></div>',
      validate: function (v) {
        if (!v.mat_na) return 'Chọn có làm mặt nạ không.';
        if (resim && v.mat_na !== 'Không') {
          var same = pv && pv.mat_na === v.mat_na;
          if (same && !v.mat_na_cu) return 'Lần trước BN dùng mặt nạ ' + pv.mat_na + ': chọn dùng lại mặt nạ cũ hay làm mặt nạ mới.';
          if ((!same || v.mat_na_cu === 'Không') && !v.mat_na_his) return 'Mặt nạ mới: tích xác nhận đã có thủ thuật làm mặt nạ trên HIS.';
        }
        if (!v.tiem_thuoc) return 'Chọn có tiêm thuốc không.'; return '';
      },
      onMount: function (form) {
        var upd = function () {
          var v = formValues(form), on = resim && v.mat_na && v.mat_na !== 'Không', same = on && pv && pv.mat_na === v.mat_na;
          var cuBox = $('#mn-cu', form), hisBox = $('#mn-his', form), info = $('#mn-new', form);
          if (cuBox) cuBox.hidden = !same;
          if (info) { info.hidden = !(on && !same); }
          if (hisBox) hisBox.hidden = !(on && (!same || v.mat_na_cu === 'Không'));
        };
        $$('select,input', form).forEach(function (el) { el.addEventListener('change', upd); }); upd();
      },
      onOk: function (v) {
        var same = resim && pv && pv.mat_na === v.mat_na && v.mat_na !== 'Không';
        run('simDone', { id: id, mat_na: v.mat_na, mat_na_cu: same ? v.mat_na_cu : '', mat_na_his: !!v.mat_na_his, tiem_thuoc: v.tiem_thuoc, dung_cu: v.dung_cu || [], dung_cu_khac: v.dung_cu_khac });
      } });
  }
  /** KTV xạ ca này: theo bảng phân công máy của BN hôm nay (ca sáng / chiều), nếu không có thì lấy lần ghi trước */
  function defaultKtv(p) {
    var list = ktvList(), may = p.may || (S.data.dm.MAY || [])[0] || '', d = new Date(), hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var isK = function (e) { return list.some(function (u) { return u.email === e; }); };
    var sel = [];
    RT.rosterFor(rosterRows().filter(function (r) { return r.ngay === today(); }), may, hm, S.data.dm).forEach(function (r) { RT.splitList(r.nhan_vien).forEach(function (e) { if (sel.indexOf(e) < 0 && isK(e)) sel.push(e); }); });
    if (!sel.length) sel = (S.lastKtvXa || []).filter(isK);
    if (!sel.length && role() === 'KTV') sel = [me().email];
    return sel;
  }
  function whoBox(p, extra) {
    return '<div class="who-box"><span class="nm">' + esc(p.ho_ten) + (p._g ? phTag(p._g) : '') + '</span><span><span class="muted">Mã HIS</span> <span class="his">' + esc(p.ma_his) + '</span>' +
      (age(p) ? ' · ' + age(p) : '') + (p.gioi ? ' · ' + esc(p.gioi) : '') + '</span><span class="muted">' + esc(p.chan_doan) + ' · ' + rx(p) + '</span>' + (extra || '') + '</div>';
  }
  /** Huỷ hồ sơ = nhập nhầm, BN CHƯA mô phỏng (không vào sổ mô phỏng). Đã mô phỏng → chỉ Không xạ (vẫn vào sổ). */
  function deleteForm(p) {
    modal({ title: 'Huỷ hồ sơ bệnh nhân', ok: 'Huỷ hồ sơ', btnClass: 'danger',
      body: whoBox(p) + '<div class="confirm" style="cursor:default;font-weight:500;display:block">Chỉ huỷ khi <b>nhập nhầm</b> hoặc BN <b>chưa mô phỏng</b> mà không làm nữa.<br>Nếu BN <b>đã mô phỏng</b> thì <b>không được huỷ</b> vì sẽ làm sai lệch báo cáo mô phỏng: bấm “Đã mô phỏng xong” trước, rồi chọn <b>Không xạ</b>.</div>' +
        field('Lý do huỷ <span class="req">*</span>', '<textarea name="ly_do" required></textarea>', '', 'Hồ sơ bị ẩn khỏi ứng dụng, không vào sổ mô phỏng, nhưng vẫn lưu trong Google Sheet.') +
        '<label class="confirm full"><input type="checkbox" name="chua_mp"><span>Tôi xác nhận BN <b>chưa mô phỏng</b> (hoặc nhập nhầm)</span></label>',
      validate: function (v) { return !v.ly_do ? 'Cần ghi lý do huỷ.' : !v.chua_mp ? 'Đánh dấu ô xác nhận BN chưa mô phỏng.' : ''; },
      onOk: function (v) { closeDetail(); run('deletePatient', { id: p.id, ly_do: v.ly_do }); } });
  }
  function reasonForm(title, p, label, ok, onOk, help) {
    modal({ title: title, body: whoBox(p) + field(label + ' <span class="req">*</span>', '<textarea name="ly_do" required></textarea>', '', help), ok: ok,
      validate: function (v) { return v.ly_do ? '' : 'Cần ghi ' + label.toLowerCase() + '.'; }, onOk: onOk });
  }

  function absentForm(p, day) {
    var cur = course(p).absent[day];
    modal({ title: 'BN vắng buổi xạ', ok: 'Ghi vắng', btnClass: 'danger',
      body: whoBox(p) + '<p>Ngày <b>' + fdw(day) + '/' + day.slice(0, 4) + '</b>' + (cur ? ' · đang ghi: <b>' + esc(cur) + '</b>' : '') + '</p><div class="form">' +
        field('Lý do vắng <span class="req">*</span>', '<select name="ly_do">' + opts(S.data.dm.LY_DO_VANG || RT.DEFAULT_DM.LY_DO_VANG, cur ? cur.split(':')[0] : '', 'Chọn lý do') + '</select>') +
        field('Ghi chú', '<input type="text" name="ghi_chu" placeholder="VD: viêm niêm mạc, hẹn xạ lại thứ Năm">') + '</div>',
      validate: function (v) { return v.ly_do ? '' : 'Cần chọn lý do vắng.'; },
      onOk: function (v) { run('markAbsent', { bn_id: p.id, ngay: day, ly_do: v.ly_do, ghi_chu: v.ghi_chu }); } });
  }
  /** Bấm vào ngày vắng trên lịch: ghi lý do vắng, hoặc ghi bù nếu BN thực ra đã xạ */
  function missedDayForm(p, day) {
    var cur = course(p).absent[day];
    modal({ title: 'Ngày ' + fdw(day) + ': có lịch nhưng chưa ghi xạ', ok: 'Tiếp tục', noFocus: true,
      body: whoBox(p) + (cur ? '<p>Đang ghi vắng: <b>' + esc(cur) + '</b></p>' : '<p>Chưa có lý do vắng.</p>') + '<div class="radios">' +
        (can('logFraction') && RT.diffDays(day, today()) <= 7 ? '<label><input type="radio" name="k" value="fx"><span><b>BN có xạ, quên ghi</b><small>Ghi bù buổi xạ cho ngày này, bắt buộc ghi lý do. Buổi ghi bù hiện màu khác trên lịch.</small></span></label>' : '') +
        (can('markAbsent') ? '<label><input type="radio" name="k" value="vang" checked><span><b>BN vắng thật</b><small>Ghi hoặc sửa lý do vắng.</small></span></label>' : '') + '</div>',
      onOk: function (v) { if (v.k === 'fx') fractionForm(p, day); else if (v.k === 'vang') absentForm(p, day); } });
  }
  /** Thanh vàng cam đầu form ghi buổi xạ: họ tên, mã HIS chữ to để KTV nhìn lại đúng BN (không cần tích xác nhận) */
  function fxBanner(p, extra) {
    return '<div class="fx-who"><div class="fx-nm">' + esc(p.ho_ten) + (p._g ? phTag(p._g) : '') + '</div>' +
      '<div class="fx-his">Mã HIS <b class="mono">' + esc(p.ma_his) + '</b>' + (age(p) ? ' <span>· ' + age(p) + (p.gioi ? ' · ' + esc(p.gioi) : '') + '</span>' : '') + '</div>' +
      '<div class="fx-sub">' + esc(p.chan_doan || '') + '</div><div class="fx-sub">' + (extra || '') + '</div></div>';
  }
  function fractionForm(p, day0) {
    var c = course(p), t = today(), n = c.done + 1;
    var hasToday = c.doneToday, parOpen = c.cur.tail ? [] : c.par.filter(function (q) { return q.open; });
    var preset = function (k) { return (/SGRT|C-RAD/i.test(k) && p.sgrt === 'Có'); };
    var min = RT.addDays(t, -7);
    modal({
      title: 'Xác nhận buổi xạ', ok: 'Ghi buổi xạ', btnClass: 'ok', noFocus: true,
      body: fxBanner(p, '<span><b class="num" style="font-size:17px">Buổi ' + n + ' / ' + c.total + '</b> <span class="muted">· ' + c.dosePerFx + ' Gy' + (c.multi && !parOpen.length ? ' · ' + c.cur.label + ' ' + esc(c.cur.ky_thuat) : '') + (parOpen.length ? ' (' + esc(mainName(p)) + ') + ' + parOpen.map(function (q) { return Math.round(RT.num(q.g.tong_lieu) / Math.max(1, q.total) * 100) / 100 + ' Gy (' + esc(parName(q)) + ')'; }).join(' + ') : '') + ' · ' + (c.open ? 'chưa có tổng số buổi' : 'sau buổi này còn ' + (c.total - n) + ' buổi') + '</span></span>') +
        (hasToday ? '<div class="confirm" style="background:var(--crit-soft);cursor:default">BN này đã có buổi xạ ghi nhận hôm nay. Kiểm tra lại trước khi ghi thêm.</div>' : '') +
        (p.trang_thai === 'TAM_NGUNG' ? '<label class="confirm" style="background:var(--crit-soft)"><input type="checkbox" name="tiep_tuc"><span>BN đang <b>tạm ngừng</b>' + (p.tam_ngung_tu ? ' từ ' + fdw(p.tam_ngung_tu) : '') + (p.ly_do_tam_ngung ? ' (' + esc(p.ly_do_tam_ngung) + ')' : '') + '. Ghi buổi xạ sẽ <b>chuyển BN về Đang xạ</b>.</span></label>' : '') +
        field('Ngày xạ', '<input type="date" name="ngay" id="fx-day" value="' + (day0 || t) + '" min="' + min + '" max="' + t + '">', '', 'Mặc định hôm nay. Chỉ ghi bù trong vòng 7 ngày.') +
        '<div class="field" id="fx-late"><label>Lý do ghi bù cho ngày đã qua <span class="req">*</span></label><input type="text" name="ly_do_bu" placeholder="VD: BN có xạ nhưng quên tích xác nhận"><span class="help">Được lưu vết; ngày ghi bù hiện màu khác trên lịch.</span></div>' +
        '<div class="field"><span class="lb">IGRT / SGRT thực hiện trong buổi này' + (p.igrt && p.igrt !== 'Không' ? ' <span class="muted">(kế hoạch: ' + esc(p.igrt) + ')</span>' : '') + '</span><div class="checks">' +
        S.data.dm.HINH_ANH.map(function (k, i) { return '<label><input type="checkbox" name="hinh_anh" data-multi="1" value="' + esc(k) + '"' + (preset(k) ? ' checked' : '') + '><span>' + esc(k) + '</span></label>'; }).join('') + '</div></div>' +
        (parOpen.length ? '<div class="field"><span class="lb">Xạ cùng buổi KH đồng thời</span><div class="checks">' + parOpen.map(function (q) {
          return '<label><input type="checkbox" name="song_song" data-multi="1" value="' + q.stt + '" checked><span>' + esc(parName(q)) + ' ' + esc(q.ky_thuat) + ' · ' + Math.round(RT.num(q.g.tong_lieu) / Math.max(1, q.total) * 100) / 100 + ' Gy (buổi ' + (q.done + 1) + '/' + q.total + ')</span></label>';
        }).join('') + '</div><span class="help">Bỏ chọn nếu hôm nay BN chỉ xạ KH chính; buổi thiếu sẽ xạ bù ở cuối.</span></div>' : '') +
        field('Ghi chú (không bắt buộc)', '<input type="text" name="ghi_chu" placeholder="VD: chỉnh tư thế 3 mm theo CBCT">') ,
      onMount: function (form) {
        var dayEl = $('#fx-day', form), late = $('#fx-late', form);
        var upd = function () { late.hidden = !(dayEl.value && dayEl.value < t); }; dayEl.addEventListener('change', upd); dayEl.addEventListener('input', upd); upd();
      },
      validate: function (v) { if (v.ngay && v.ngay < t && !v.ly_do_bu) return 'Ghi bù cho ngày đã qua cần ghi lý do.'; if (p.trang_thai === 'TAM_NGUNG' && !v.tiep_tuc) return 'BN đang tạm ngừng: tích ô xác nhận chuyển BN về Đang xạ.'; return ''; },
      onOk: function (v) {
        var payload = { bn_id: p.id, ngay: v.ngay, hinh_anh: v.hinh_anh, ghi_chu: v.ghi_chu, ly_do_bu: v.ngay < t ? v.ly_do_bu : '' };
        if (parOpen.length) payload.song_song = v.song_song || [];
        run('logFraction', payload, function (e) {
          if (e.error === 'DUP_DAY') {
            modal({ title: 'BN đã có buổi xạ ngày này', body: whoBox(p) + '<p>Ngày ' + fdw(v.ngay) + ' đã có một buổi xạ được ghi. Chỉ ghi thêm nếu BN xạ 2 lần trong ngày.</p>',
              ok: 'Vẫn ghi thêm buổi', btnClass: 'danger', onOk: function () { payload.force = true; run('logFraction', payload); } });
            return true;
          }
        });
      }
    });
  }
  function undoForm(fid) {
    var f = S.data.fractions.filter(function (x) { return x.id === fid; })[0];
    if (!f) return;
    var p = byId(f.bn_id);
    modal({ title: 'Huỷ buổi xạ đã ghi', ok: 'Huỷ buổi xạ', btnClass: 'danger',
      body: whoBox(p) + '<p>Buổi xạ ngày <b>' + fdw(f.ngay) + '</b>' + (f.hinh_anh ? ' (' + esc(f.hinh_anh) + ')' : '') + ' sẽ bị huỷ. Thao tác được lưu vào nhật ký.</p>' +
        field('Lý do huỷ <span class="req">*</span>', '<input type="text" name="ly_do" placeholder="VD: bấm nhầm bệnh nhân">'),
      validate: function (v) { return v.ly_do ? '' : 'Cần ghi lý do huỷ.'; },
      onOk: function (v) { run('undoFraction', { id: fid, ly_do: v.ly_do }); } });
  }
  var icdDl = null;
  function icdList() {
    if (icdDl === null) icdDl = '<datalist id="dl-icd">' + (typeof ICD10 === 'undefined' ? [] : ICD10).map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + '</option>'; }).join('') + '</datalist>';
    return icdDl;
  }
  function icdField(val, req, phu) {
    var xs = String(phu || '').split(/,\s*/).filter(Boolean);
    return icdField0(val, req) + '<div class="field full icd-more"><input type="hidden" name="icd_phu" value="' + esc(xs.join(', ')) + '"><div class="icd-xs">' + xs.map(icdXRow).join('') + '</div>' +
      '<button type="button" class="linkbtn" data-icdadd>+ thêm mã ICD</button></div>';
  }
  function icdXRow(v) { return '<div class="icd-x-row"><input type="text" class="icd-x" value="' + esc(v || '') + '" list="dl-icd" autocomplete="off" autocapitalize="characters" placeholder="Mã thêm, VD: C13"><span class="muted icd-x-nm">' + esc(RT.icdName(RT.normIcd(v || '')) || '') + '</span></div>'; }
  function icdField0(val, req) {
    return field('Mã ICD-10' + (req ? ' <span class="req">*</span>' : ' <span class="req icd-req" hidden>*</span>'),
      '<input type="text" name="icd" value="' + esc(val || '') + '" list="dl-icd" autocomplete="off" autocapitalize="characters" placeholder="Mã 3 ký tự, VD: C50">' + icdList(),
      '', '<span id="icd-nm">Gõ mã để hiện tên bệnh</span>');
  }
  /** Gõ mã ICD: hiện tên bệnh; nếu ô chẩn đoán còn trống (hoặc do ứng dụng tự điền) thì điền tên bệnh vào */
  function bindIcd(form) {
    var el = $('input[name=icd]', form), nm = $('#icd-nm', form), dx = $('input[name=chan_doan]', form);
    if (!el) return;
    var hid = $('input[name=icd_phu]', form), box = $('.icd-xs', form), addB = $('[data-icdadd]', form);
    var sync = function () { hid.value = $$('.icd-x', form).map(function (x) { return RT.normIcd(x.value); }).filter(Boolean).join(', '); $$('.icd-x-row', form).forEach(function (r) { var c = RT.normIcd($('.icd-x', r).value); $('.icd-x-nm', r).textContent = c ? (RT.icdName(c) || (RT.isIcd(c) ? 'Mã không có trong danh mục' : 'Mã chưa đúng dạng')) : ''; }); };
    if (hid && box) {
      box.addEventListener('input', sync);
      addB.onclick = function () { box.insertAdjacentHTML('beforeend', icdXRow('')); var xs = $$('.icd-x', box); xs[xs.length - 1].focus(); };
    }
    var auto = '';
    var upd = function (fill) {
      var c = RT.normIcd(el.value), n = RT.icdName(c);
      if (!el.value) { nm.textContent = 'Gõ mã để hiện tên bệnh'; nm.className = ''; return; }
      if (n) { nm.textContent = c + ': ' + n; nm.className = 'icd-ok'; }
      else { nm.textContent = RT.isIcd(c) ? 'Mã ' + c + ' không có trong danh mục C, D của Bộ Y tế. Kiểm tra lại.' : 'Mã chưa đúng dạng (VD: C50).'; nm.className = 'icd-bad'; }
      if (fill && n && dx && (!dx.value || dx.value === auto)) { dx.value = n; auto = n; }
    };
    el.addEventListener('input', function () { upd(true); });
    el.addEventListener('change', function () { var c = RT.normIcd(el.value); if (RT.isIcd(c)) el.value = c; upd(true); });
    upd(false);
  }
  function contourForm(p) {
    var d = S.data.dm, miss = p._g ? [] : RT.missingRx(p, true);
    var inp = function (name, type, attrs) { return '<input type="' + (type || 'text') + '" name="' + name + '" value="' + esc(p[name] || '') + '" ' + (attrs || '') + '>'; };
    var fill = miss.length ? '<div class="confirm" style="cursor:default;font-weight:500">BN chưa đủ phần chuyên môn (thiếu: <b>&nbsp;' + esc(miss.join(', ')) + '</b>). Nhập đủ rồi mới chuyển kỹ sư được.</div>' +
      '<div class="form">' + icdField(p.icd, true, p.icd_phu) +
      field('Chẩn đoán <span class="req">*</span>', inp('chan_doan', 'text', 'placeholder="VD: K phổi di căn não"'), 'full') +
      viTriField(p.vi_tri, 'dl-vitri2') +
      field('Kỹ thuật <span class="req">*</span>', '<select name="ky_thuat">' + opts(d.KY_THUAT, p.ky_thuat, 'Chọn kỹ thuật') + '</select>') +
      field('Tổng liều (Gy) <span class="req">*</span>', inp('tong_lieu', 'number', 'step="0.01" min="0"')) +
      field('Số buổi <span class="req">*</span>', inp('so_buoi', 'number', 'step="1" min="1" max="60"')) +
      field('IGRT dự kiến', '<select name="igrt">' + opts(d.IGRT, p.igrt || 'Không') + '</select>') +
      field('SGRT', '<select name="sgrt">' + opts(['Không', 'Có'], p.sgrt || 'Không') + '</select>') + '</div>' : '';
    modal({ title: 'Contour xong, chuyển kỹ sư', ok: 'Chuyển kỹ sư', body: whoBox(p) + fill +
      '<div class="field"><span class="lb">Mức ưu tiên lập kế hoạch</span><div class="radios">' + [
        ['Cấp cứu', 'Lập kế hoạch ngay, tô nền đỏ. Cần ghi rõ lý do.'],
        ['Ưu tiên', 'Tô nền cam để kỹ sư chú ý. Cần ghi rõ lý do.'],
        ['Thường', 'Theo thứ tự contour xong trước làm trước.']
      ].map(function (x) { return '<label><input type="radio" name="uu_tien" value="' + x[0] + '"' + ((p.uu_tien || 'Thường') === x[0] ? ' checked' : '') + '><span><b>' + x[0] + '</b><small>' + x[1] + '</small></span></label>'; }).join('') + '</div></div>' + prioReasonField(p.ly_do_uu_tien),
      onMount: function (form) { bindIcd(form); bindPrio(form); },
      validate: function (v) { var pe = prioError(v); if (pe) return pe; if (!miss.length) return ''; var m = RT.missingRx(v, true); return m.length ? 'Cần nhập đủ: ' + m.join(', ') + '.' : ''; },
      onOk: function (v) { v.id = p.id; run('contourDone', v); } });
  }
  function priorityForm(p) {
    modal({ title: 'Đổi mức ưu tiên', ok: 'Lưu', body: whoBox(p) + '<div class="radios">' + ['Cấp cứu', 'Ưu tiên', 'Thường'].map(function (x) {
      return '<label><input type="radio" name="uu_tien" value="' + x + '"' + ((p.uu_tien || 'Thường') === x ? ' checked' : '') + '><span><b>' + x + '</b></span></label>'; }).join('') + '</div>' + prioReasonField(p.ly_do_uu_tien),
      onMount: bindPrio, validate: prioError,
      onOk: function (v) { run('setPriority', { id: p.id, uu_tien: v.uu_tien, ly_do_uu_tien: v.ly_do_uu_tien }); } });
  }
  function ksSelect(sel) {
    return field('Kỹ sư phụ trách <span class="req">*</span>', '<select name="ks_email">' + opts(activeUsers('KS').map(function (u) { return { v: u.email, l: u.ho_ten }; }), sel || '', 'Chọn kỹ sư') + '</select>', 'full');
  }
  function claimForm(p) {
    var re = p.trang_thai === 'DANG_KH';
    modal({ title: re ? 'Đổi kỹ sư phụ trách' : 'Nhận ca lập kế hoạch', ok: re ? 'Đổi kỹ sư' : 'Nhận ca',
      body: whoBox(p) + (re ? '<p>Đang do <b>' + esc(nameOf(p.ks_email)) + '</b> lập từ ' + fdw(p.ngay_nhan_kh) + '.</p>' : '') + ksSelect(''),
      validate: function (v) { return v.ks_email ? '' : 'Cần chọn kỹ sư phụ trách.'; },
      onOk: function (v) { run('claimPlan', { id: p.id, ks_email: v.ks_email }); } });
  }
  function planDoneForm(p) {
    modal({ title: 'Lập kế hoạch xong', ok: 'Lưu', body: whoBox(p) + (p.ks_email ? '' : ksSelect('')) + '<div class="field"><span class="lb">Bước tiếp theo</span><div class="radios">' +
      '<label><input type="radio" name="next" value="qa" checked><span><b>Cần QA trước khi xạ</b><small>BN chuyển sang “Chờ QA”. Ghi kết quả QA sau khi đo.</small></span></label>' +
      '<label><input type="radio" name="next" value="tx"><span><b>Không cần QA, chuyển xạ luôn</b><small>BN chuyển sang “Chờ vào xạ” để KTV xếp lịch.</small></span></label></div></div>' +
      '<details class="more"><summary>Chỉ chuyển một phần KH</summary>' + field('Số buổi chuyển trước', '<input type="number" name="chuyen_buoi" min="1" max="' + (RT.num(p.so_buoi) - 1) + '" step="1">', '', 'KH ' + esc(p.so_buoi) + ' buổi. Để trống nếu chuyển đủ. Hết số buổi này, KTV chờ BS đánh giá lại.') + '</details>',
      validate: function (v) { return p.ks_email || v.ks_email ? '' : 'Cần chọn kỹ sư phụ trách.'; },
      onOk: function (v) { run('planDone', { id: p.id, can_qa: v.next === 'qa', ks_email: v.ks_email, chuyen_buoi: v.chuyen_buoi || '' }); } });
  }
  function pauseForm(p) {
    modal({ title: 'Tạm ngừng xạ', ok: 'Ghi tạm ngừng', btnClass: 'danger', body: whoBox(p) +
      '<div class="form">' + field('Lý do <span class="req">*</span>', '<select name="ly_do">' + opts(S.data.dm.LY_DO_TAM_NGUNG, '', 'Chọn lý do') + '</select>') +
      field('Tạm ngừng từ ngày', '<input type="date" name="tu_ngay" value="' + today() + '">') +
      field('Ghi chú', '<input type="text" name="ghi_chu" placeholder="VD: viêm niêm mạc độ 3, hẹn khám lại T5">', 'full') + '</div>',
      validate: function (v) { return v.ly_do ? '' : 'Cần chọn lý do tạm ngừng.'; },
      onOk: function (v) { run('pause', { id: p.id, ly_do: v.ly_do, tu_ngay: v.tu_ngay, ghi_chu: v.ghi_chu }); } });
  }
  function scheduleForm(p, mode) {
    var started = course(p).done > 0, approve = mode === 'approve', dx = approve ? proposal(p) || {} : {};
    var p0 = p;
    if (approve) { p = {}; Object.keys(p0).forEach(function (k) { p[k] = p0[k]; }); p.ngay_du_kien = dx.ngay_du_kien || p.ngay_du_kien; p.ngay_nghi_tuan = dx.ngay_nghi_tuan || ''; if (dx.may) p.may = dx.may; }
    var off = RT.offDay(p);
    var imrt = /IMRT|VMAT/i.test(p.ky_thuat);
    var propose = false;
    var q = RT.quotas(S.data.dm)[p.khoa];
    var dxBy = approve ? S.data.users.filter(function (x) { return x.email === p0.de_xuat_boi; })[0] : null;
    modal({ title: approve ? 'Duyệt lịch xạ' : propose ? 'Đề xuất lịch xạ' : 'Xếp lịch xạ', ok: approve ? 'Duyệt lịch' : propose ? 'Gửi đề xuất' : 'Lưu lịch',
      body: whoBox(p) + (approve ? '<div class="confirm" style="cursor:default;font-weight:500">Đề xuất bởi&nbsp;<b>' + esc(dxBy ? dxBy.ho_ten : p0.de_xuat_boi) + '</b>&nbsp;(' + esc(dxBy ? (RT.ROLES[dxBy.vai_tro] || '') + (dxBy.khoa ? ', ' + dxBy.khoa : '') : '') + ') lúc ' + esc(String(p0.de_xuat_luc || '').replace('T', ' ').slice(0, 16)) + '. Sửa nếu cần rồi bấm “Duyệt lịch”.</div>' : '') +
        (propose ? '<div class="confirm" style="cursor:default;font-weight:500">Lịch sẽ được gửi người xếp lịch duyệt; duyệt xong BN mới vào hàng “đã có lịch”.</div>' : '') +
        '<div class="form">' +
        (started ? '<div class="field"><span class="lb">Bắt đầu xạ</span><b>' + fdw(course(p).start) + '</b></div>' :
          field('Ngày bắt đầu dự kiến', '<input type="date" name="ngay_du_kien" id="sd-start" value="' + esc(p.ngay_du_kien) + '" min="' + today() + '">', '', '<span id="sd-earliest"></span>')) +
        field('Máy', '<select name="may">' + opts(S.data.dm.MAY, p.may || S.data.dm.MAY[0]) + '</select>') + '</div>' +
        (!started && q ? '<div class="quota-info" id="sd-quota"></div><label class="confirm full" id="sd-over" hidden><input type="checkbox" name="vuot_chi_tieu"><span>Vẫn xếp, đồng ý vượt chỉ tiêu của khoa</span></label>' : '') +
        '<div class="field"><span class="lb">Lịch trong tuần</span><div class="radios">' +
        '<label><input type="radio" name="kieu" value="t26"' + (off ? '' : ' checked') + '><span><b>Thứ 2 → Thứ 6</b><small>Thường dùng cho 3D-CRT' + (imrt ? '' : ' (kỹ thuật của BN này)') + '</small></span></label>' +
        '<label><input type="radio" name="kieu" value="t27"' + (off ? ' checked' : '') + '><span><b>Thứ 2 → Thứ 7, nghỉ một ngày trong tuần</b><small>IMRT/VMAT: nghỉ một ngày, xạ bù Thứ Bảy</small></span></label></div></div>' +
        field('Ngày nghỉ trong tuần', '<select name="ngay_nghi_tuan" id="off-day">' + opts([1, 2, 3, 4, 5].map(function (i) { return { v: i, l: RT.DOW[i] }; }), off || '', 'Chọn ngày') + '</select>') +
        '<div class="preview" id="sched-prev"></div>',
      onMount: function (form) {
        var upd = function () {
          var v = formValues(form);
          $('#off-day', form).disabled = v.kieu !== 't27';
          var tmp = {}; Object.keys(p).forEach(function (k) { tmp[k] = p[k]; });
          tmp.ngay_nghi_tuan = v.kieu === 't27' ? v.ngay_nghi_tuan : (imrt ? '0' : '');
          if (!started) { tmp.ngay_du_kien = v.ngay_du_kien; tmp.ngay_bat_dau = ''; }
          var c = RT.course(tmp, S.data.fractions, env());
          var el = $('#sched-prev', form);
          if (v.kieu === 't27' && !v.ngay_nghi_tuan) el.innerHTML = 'Chọn ngày nghỉ trong tuần.';
          else if (!c.start) el.innerHTML = 'Chọn ngày bắt đầu để xem ngày kết thúc dự kiến.';
          else if (!RT.isTreatDay(tmp, c.start, env()) && !started) el.innerHTML = '<b style="color:var(--warn)">' + fdw(c.start) + ' không nằm trong lịch xạ đã chọn.</b> Buổi đầu sẽ là ' + fdw(c.projected[0]) + '.';
          else if (c.open) el.innerHTML = 'BN chưa có tổng số buổi: chưa tính được ngày kết thúc.';
          else el.innerHTML = (started ? 'Còn ' + c.projected.length + ' buổi. ' : 'Bắt đầu <b>' + fdw(c.start) + '</b>. ') + 'Dự kiến kết thúc <b>' + fdw(c.end) + '/' + String(c.end).slice(0, 4) + '</b> · ' + c.total + ' buổi.';
          var qi = $('#sd-quota', form);
          if (qi) {
            var over = false;
            if (v.ngay_du_kien) {
              var n = khoaLoad(p, v.ngay_du_kien);
              var ov = RT.quotaOver(pts(), S.data.fractions, env(), S.data.dm, p, v.ngay_du_kien, v.kieu === 't27' ? v.ngay_nghi_tuan : '', today());
              over = !!ov;
              qi.innerHTML = 'Khoa <b>' + esc(p.khoa) + '</b> ngày ' + fdw(v.ngay_du_kien) + ': <b>' + n + '/' + q.max + '</b> BN, ' + (n + 1 > q.max ? '<b>đã đủ chỉ tiêu</b>' : 'còn ' + (q.max - n) + ' chỗ') + ' (chỉ tiêu ' + q.min + '–' + q.max + ').' +
                (ov && !ov.dau ? '<br><b>Trong 2 tuần đầu của BN: ngày ' + fdw(ov.ngay) + ' khoa sẽ có ' + ov.n + '/' + ov.max + ' BN.</b>' : '') +
                (!ov ? ' 2 tuần đầu của BN không vượt chỉ tiêu.' : '') +
                (over && p.uu_tien === 'Cấp cứu' ? ' BN cấp cứu luôn được xếp.' : '');
            } else qi.innerHTML = '';
            $('#sd-over', form).hidden = !over || p.uu_tien === 'Cấp cứu';
            form.dataset.over = over && p.uu_tien !== 'Cấp cứu' ? '1' : '';
          }
        };
        var es = $('#sd-earliest', form);
        if (es && q) {
          var first = workDays(40).filter(function (d) { return !RT.quotaOver(pts(), S.data.fractions, env(), S.data.dm, p, d, p.ngay_nghi_tuan, today()); })[0];
          es.innerHTML = first ? 'Sớm nhất còn chỗ: <button type="button" class="lnk" id="sd-pick">' + fdw(first) + '</button>' : 'Khoa đã đủ chỉ tiêu trong 40 ngày tới';
          if (first) $('#sd-pick', form).onclick = function () { $('#sd-start', form).value = first; upd(); };
        }
        $$('input,select', form).forEach(function (el) { el.addEventListener('change', upd); el.addEventListener('input', upd); });
        upd();
      },
      validate: function (v) {
        if (!started && !v.ngay_du_kien) return 'Chọn ngày bắt đầu dự kiến.'; if (v.kieu === 't27' && !v.ngay_nghi_tuan) return 'Chọn ngày nghỉ trong tuần.';
        var f = $('#mdl-form');
        if (f && f.dataset.over && !v.vuot_chi_tieu) return 'Khoa đã đủ chỉ tiêu ngày này. Chọn ngày khác, hoặc đánh dấu “Vẫn xếp, đồng ý vượt chỉ tiêu”.';
        return '';
      },
      onOk: function (v) {
        var payload = { id: p.id, may: v.may, ngay_nghi_tuan: v.kieu === 't27' ? v.ngay_nghi_tuan : (imrt ? '0' : ''), vuot_chi_tieu: !!v.vuot_chi_tieu };
        if (!started) payload.ngay_du_kien = v.ngay_du_kien;
        run(approve ? 'approveSchedule' : 'schedule', payload);
      } });
  }
  var STEPS = [
    ['MO_PHONG', 'Chưa mô phỏng', 'Đã có chỉ định xạ, chưa chụp CT mô phỏng.'],
    ['CONTOUR', 'Đã mô phỏng, đang contour', 'Đã chụp CT mô phỏng, bác sĩ đang vẽ thể tích.'],
    ['CHO_KH', 'Đã contour xong, chờ lập kế hoạch', 'Vào ngay hàng đợi của kỹ sư. Cần đủ mã ICD-10, chẩn đoán, kỹ thuật, liều, số buổi.'],
    ['CHO_XA', 'Đã có kế hoạch, chờ vào xạ', 'Dùng khi bắt đầu dùng ứng dụng với BN đã lập KH xong.'],
    ['DANG_XA', 'Đang xạ dở', 'BN đã xạ một số buổi trước khi dùng ứng dụng.']
  ];
  /** Các đợt xạ khác cùng mã HIS: đang có trên trang chính + chỉ mục lưu trữ */
  /** Câu hỏi bắt buộc khi mô phỏng lại / đợt mới: BS đã tích chỉ định mô phỏng lại trên HIS chưa (Có → vào sổ mô phỏng) */
  function mpHisField(attr, cur) {
    return '<div class="field full"' + (attr || '') + '><span class="lb">Đã tích chỉ định mô phỏng lại trên HIS? <span class="req">*</span></span><div class="radios inline">' +
      '<label><input type="radio" name="mp_his" value="Có"' + (cur === 'Có' ? ' checked' : '') + '><span><b>Có</b><small>Lần mô phỏng này vào sổ mô phỏng</small></span></label>' +
      '<label><input type="radio" name="mp_his" value="Không"' + (cur === 'Không' ? ' checked' : '') + '><span><b>Không</b><small>Vẫn mô phỏng, nhưng không vào sổ mô phỏng</small></span></label></div></div>';
  }
  function hisMatches(ma, exceptId) {
    if (!ma) return [];
    var seen = {}, out = [];
    pts().forEach(function (x) { if (x.ma_his === ma && x.id !== exceptId && x.trang_thai !== 'HUY') { seen[x.id] = 1; out.push(x); } });
    (S.hisCache[ma] || []).forEach(function (x) { if (!seen[x.id] && x.id !== exceptId && x.trang_thai !== 'HUY') out.push(x); });
    return out;
  }
  function lookupHis(ma) {
    if (!ma || ma in S.hisCache) return Promise.resolve();
    return call('lookupHis', { ma_his: ma }).then(function (r) { S.hisCache[ma] = r.his || []; }, function () { S.hisCache[ma] = []; });
  }
  /** Danh sách bác sĩ chia nhóm theo khoa */
  function bsOptions(bsList, sel) {
    var d = S.data.dm, kOf = function (e) { return RT.doctorKhoa(S.data.users, d, e); };
    if (sel && !bsList.some(function (x) { return x.v === sel; })) bsList = bsList.concat([{ v: sel, l: nameOf(sel) }]);
    return '<option value="">Chọn bác sĩ</option>' + d.KHOA.concat(['']).map(function (k) {
      var ds = bsList.filter(function (x) { return kOf(x.v) === k; });
      return ds.length ? '<optgroup label="' + esc(k ? 'Khoa ' + k : 'Chưa ghi khoa') + '">' + opts(ds, sel) + '</optgroup>' : '';
    }).join('');
  }
  function patientForm(p, prefill) {
    var isNew = !p, d = S.data.dm, v0 = p || prefill || { bs_email: isDoctor(me()) ? (me().tro_ly_cho && !RT.canTreat(me()) ? me().tro_ly_cho : me().email) : '', khoa: '', uu_tien: 'Thường', igrt: 'Không', sgrt: 'Không' };
    var mucDich = d.MUC_DICH || RT.DEFAULT_DM.MUC_DICH;
    var bsList = treatDoctors().map(function (u) { return { v: u.email, l: u.ho_ten }; });
    var inp = function (name, type, attrs) { return '<input type="' + (type || 'text') + '" name="' + name + '" value="' + esc(v0[name] || '') + '" ' + (attrs || '') + '>'; };
    var exceptId = p ? p.id : '', dotMoi = !!(isNew && prefill && prefill._force);
    modal({
      title: prefill && prefill._retry ? 'Thêm bệnh nhân: chưa lưu được' : prefill ? 'Đợt xạ mới · ' + prefill.ho_ten : isNew ? 'Thêm bệnh nhân' : 'Sửa thông tin bệnh nhân',
      ok: prefill && prefill._retry ? 'Gửi lại' : prefill ? 'Tạo đợt xạ mới' : isNew ? 'Thêm bệnh nhân' : 'Lưu thay đổi',
      body: (prefill && prefill._retry ? '<div class="confirm" style="cursor:default;background:var(--crit-soft);font-weight:500">' + esc(prefill._retry) + '. Thông tin đã nhập vẫn giữ nguyên, bấm “Gửi lại”.</div>' : '') + (isNew && !isDoctor(me()) && !(prefill && prefill._retry) ? '<div class="confirm" style="cursor:default;font-weight:500">Nhập theo <b>&nbsp;phiếu chỉ định của bác sĩ</b>. Chọn đúng bác sĩ điều trị; bác sĩ sẽ thấy BN trong danh sách của mình và sửa được nếu cần.</div>' : '') +
        '<div class="form">' +
        field('Mã BN trên HIS <span class="req">*</span>', inp('ma_his', 'text', 'inputmode="numeric" autocomplete="off"'), '', 'Dùng để tra cứu, khớp với HIS') +
        field('Họ và tên <span class="req">*</span>', inp('ho_ten')) +
        '<div class="full his-note" id="his-note" hidden></div>' +
        (dotMoi ? mpHisField('', prefill.mp_his) : '') +
        (!isNew && p.mp_his ? field('Chỉ định mô phỏng lại trên HIS', '<select name="mp_his">' + opts([{ v: 'Có', l: 'Có (vào sổ mô phỏng)' }, { v: 'Không', l: 'Không (không vào sổ mô phỏng)' }], p.mp_his) + '</select>') : '') +
        field('Năm sinh hoặc tuổi <span class="req">*</span>', inp('nam_sinh', 'number', 'min="0" max="2100" placeholder="VD: 1965 hoặc 61"')) +
        field('Giới', '<select name="gioi">' + opts(['Nam', 'Nữ'], v0.gioi, '—') + '</select>') +
        (isNew ? field('Bước hiện tại của bệnh nhân <span class="req">*</span>', '<select name="trang_thai" id="step-sel">' + opts(STEPS.map(function (x) { return { v: x[0], l: x[1] }; }), (prefill && prefill._step) || '', 'Chọn bước…') + '</select>', 'full', '<span id="step-help">Bấm để chọn: chưa mô phỏng, đang contour, chờ lập KH…</span>') +
          '<div class="field" data-for="MO_PHONG"><label>Hẹn mô phỏng (nếu có)</label><input type="date" name="ngay_mo_phong"></div>' +
          '<div class="field" data-for="CHO_XA">' + '<label>Ngày xạ dự kiến</label><input type="date" name="ngay_du_kien"></div>' +
          '<div class="field" data-for="DANG_XA"><label>Ngày bắt đầu xạ <span class="req">*</span></label><input type="date" name="ngay_bat_dau" max="' + today() + '"></div>' +
          '<div class="field" data-for="DANG_XA"><label>Số buổi đã xạ <span class="req">*</span></label><input type="number" name="da_xa" min="1" step="1"><span class="help">Tính cả buổi hôm nay nếu đã xạ</span></div>' +
          '<div class="field" data-for="CHO_XA DANG_XA"><label>Lịch trong tuần</label><select name="ngay_nghi_tuan">' + weekOpts('') + '</select></div>' : '') +
        field('Bác sĩ điều trị <span class="req">*</span>', '<select name="bs_email" id="pf-bs">' + bsOptions(bsList, v0.bs_email) + '</select>') +
        field('Khoa <span class="req">*</span>', '<select name="khoa" id="pf-khoa">' + opts(d.KHOA, v0.khoa, 'Chọn khoa') + '</select>', '', '<span id="pf-khoa-h"></span>') +
        '<details class="full more"' + (isNew ? '' : ' open') + ' id="more"><summary>' + (isNew ? 'Thông tin thêm' : 'Thông tin chuyên môn') + ' <span class="muted" id="more-lb">' + (isNew ? '(không bắt buộc ở bước này)' : '') + '</span></summary><div class="form">' +
        icdField(v0.icd, false, v0.icd_phu) +
        field('Chẩn đoán <span class="req rx-req">*</span>', inp('chan_doan', 'text', 'placeholder="VD: K phổi di căn não, xương"'), 'full') +
        viTriField(v0.vi_tri, 'dl-vitri') +
        field('Mục đích', '<select name="muc_dich">' + opts(mucDich, v0.muc_dich, '—') + '</select>') +
        field('Kỹ thuật <span class="req rx-req">*</span>', '<select name="ky_thuat">' + opts(d.KY_THUAT, v0.ky_thuat, 'Chọn kỹ thuật') + '</select>') +
        field('Ưu tiên', '<select name="uu_tien">' + opts(d.UU_TIEN, v0.uu_tien) + '</select>') + prioReasonField(v0.ly_do_uu_tien) +
        field('Tổng liều (Gy) <span class="req rx-req">*</span>', inp('tong_lieu', 'number', 'step="0.01" min="0"')) +
        field('Số buổi <span class="req rx-req">*</span>', inp('so_buoi', 'number', 'step="1" min="1" max="60"'), '', '<span id="dpf"></span>') +
        field('IGRT dự kiến', '<select name="igrt">' + opts(d.IGRT, v0.igrt) + '</select>') +
        field('SGRT', '<select name="sgrt">' + opts(['Không', 'Có'], v0.sgrt) + '</select>') +
        field('Các mức liều (SIB, nếu có)', inp('muc_lieu', 'text', 'placeholder="VD: 70 / 60 / 54 Gy"'), 'full') +
        (!isNew ? field('Ngày mô phỏng', '<input type="date" name="ngay_mo_phong" value="' + esc(v0.ngay_mo_phong || '') + '" max="' + today() + '">') +
          field('Mặt nạ', '<select name="mat_na">' + opts([{ v: '', l: '—' }, { v: 'Không', l: 'Không làm mặt nạ' }].concat((d.MAT_NA || RT.DEFAULT_DM.MAT_NA).map(function (x) { return { v: x, l: x }; })), v0.mat_na || '') + '</select>') +
          field('Tiêm thuốc cản quang', '<select name="tiem_thuoc">' + opts([{ v: '', l: '—' }, { v: 'Có', l: 'Có' }, { v: 'Không', l: 'Không' }], v0.tiem_thuoc || '') + '</select>') : '') +
        field('Ghi chú', '<textarea name="ghi_chu">' + esc(v0.ghi_chu || '') + '</textarea>', 'full') +
        (isNew ? '<label class="confirm full" style="background:var(--ks-soft);font-weight:600"><input type="checkbox" name="co_boost" id="co-boost"><span>Có boost tuần tự (giai đoạn 2)</span></label>' +
          '<div class="field" data-boost><label>Kỹ thuật boost</label><select name="b_ky_thuat">' + opts(d.KY_THUAT, '', 'Chọn') + '</select></div>' +
          '<div class="field" data-boost><label>Liều boost (Gy) / số buổi</label><div style="display:flex;gap:6px"><input type="number" step="0.01" name="b_tong_lieu" placeholder="Gy" aria-label="Liều boost"><input type="number" step="1" name="b_so_buoi" placeholder="buổi" aria-label="Số buổi boost"></div></div>' +
          '<div class="field full" data-boost><span class="lb">Kế hoạch boost</span><div class="radios">' + BOOST_KINDS.map(function (k, i) { return '<label><input type="radio" name="b_buoc" value="' + k[0] + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + k[1] + '</b><small>' + k[2] + '</small></span></label>'; }).join('') + '</div></div>' : '') +
        '</div></details></div>',
      onMount: function (form) {
        if (prefill && prefill._retry) Object.keys(prefill).forEach(function (k) {
          var el = form.elements[k]; if (!el || k.charAt(0) === '_' || prefill[k] == null || typeof prefill[k] === 'object') return;
          if (el.type === 'checkbox') el.checked = !!prefill[k]; else el.value = prefill[k];
        });
        var upd = function () { var v = formValues(form), n = RT.num(v.so_buoi), t = RT.num(v.tong_lieu); $('#dpf', form).textContent = n && t ? '= ' + (Math.round(t / n * 100) / 100) + ' Gy/buổi' : ''; };
        $$('input', form).forEach(function (el) { el.addEventListener('input', upd); }); upd();
        bindIcd(form);
        var bsSel = $('#pf-bs', form), kSel = $('#pf-khoa', form), kHelp = $('#pf-khoa-h', form);
        var syncKhoa = function () {
          var k = RT.doctorKhoa(S.data.users, d, bsSel.value);
          if (k) kSel.value = k;
          kSel.disabled = !!k;
          kHelp.textContent = k ? 'Theo khoa của bác sĩ điều trị' : bsSel.value ? 'Bác sĩ này chưa ghi khoa trong Quản trị: chọn khoa' : 'Chọn bác sĩ, khoa tự điền theo bác sĩ';
        };
        bsSel.addEventListener('change', syncKhoa); syncKhoa();
        bindPrio(form);
        var cb = $('#co-boost', form), more = $('#more', form);
        var step = function () {
          var st = (formValues(form).trang_thai) || '';
          var early = isNew ? (st === 'MO_PHONG' || st === 'CONTOUR' || !st) && !(cb && cb.checked) : ['MO_PHONG', 'CONTOUR'].indexOf(p.trang_thai) >= 0 || RT.lenientEdit(p, formValues(form), env());
          $$('.rx-req', form).forEach(function (el) { el.hidden = early; });
          $$('.icd-req', form).forEach(function (el) { el.hidden = !(isNew && st === 'CHO_KH'); });
          $$('[data-for]', form).forEach(function (el) { el.hidden = !isNew || el.dataset.for.split(' ').indexOf(st) < 0; });
          var hs = STEPS.filter(function (x) { return x[0] === st; })[0];
          if ($('#step-help', form)) $('#step-help', form).textContent = hs ? hs[2] : 'Bấm để chọn: chưa mô phỏng, đang contour, chờ lập KH…';
          if (isNew) {
            $('#more-lb', form).textContent = early ? '(không bắt buộc ở bước này)' : '(bắt buộc ở bước này' + (st === 'CHO_KH' ? ': mã ICD-10, ' : ': ') + 'chẩn đoán, kỹ thuật, liều, số buổi)';
            if (!early) more.open = true;
          }
        };
        if ($('#step-sel', form)) $('#step-sel', form).addEventListener('change', step);
        var bt = function () { $$('[data-boost]', form).forEach(function (el) { el.hidden = !cb || !cb.checked; }); step(); };
        if (cb) cb.addEventListener('change', bt); bt();
        // Tra mã HIS: các đợt xạ trước (kể cả đã lưu trữ), cảnh báo khác tên
        var his = $('input[name=ma_his]', form), nameEl = $('input[name=ho_ten]', form), note = $('#his-note', form);
        var show = function () {
          var ma = his.value.trim();
          if (!ma || (!isNew && ma === p.ma_his && RT.fold(nameEl.value) === RT.fold(p.ho_ten))) { note.hidden = true; return; }
          var list = hisMatches(ma, exceptId);
          if (!list.length) { note.hidden = true; return; }
          if (isNew && !dotMoi) {
            // Không bao giờ thêm BN trùng mã HIS: mở hồ sơ cũ hoặc thêm đợt mới từ hồ sơ cũ
            var act = list.filter(function (x) { return ['HOAN_THANH', 'HUY', 'KHONG_XA'].indexOf(x.trang_thai) < 0 && x.luu_tru !== 'Có' && !x._arch; })[0];
            var last = list.slice().sort(function (a, b) { return String(b.ngay_tao || b.id) > String(a.ngay_tao || a.id) ? 1 : -1; })[0];
            note.className = 'full his-note bad';
            var nh = '<b>Mã HIS ' + esc(ma) + ' đã có trong ứng dụng.</b> Không thêm BN mới trùng mã HIS. ' + (act ? 'BN đang có đợt xạ ở bước <b>' + esc(RT.STATUS[act.trang_thai] || act.trang_thai) + '</b>: mở hồ sơ để thao tác.' : 'Các đợt xạ trước đã kết thúc: thêm đợt xạ mới từ hồ sơ cũ.') +
              '<ul>' + list.slice(0, 6).map(function (x) {
                return '<li><span class="mono">' + esc(x.id) + '</span> · ' + esc(x.ho_ten) + ' · ' + esc(x.vi_tri || x.chan_doan || '—') + ' · ' + esc(x.ky_thuat || '') + (x.tong_lieu ? ' ' + esc(x.tong_lieu) + ' Gy/' + esc(x.so_buoi || '?') : '') +
                  ' · <b>' + esc(RT.STATUS[x.trang_thai] || x.trang_thai) + '</b>' + (x.ngay_bat_dau ? ' · ' + fdy(x.ngay_bat_dau) + (x.ngay_ket_thuc ? ' → ' + fdy(x.ngay_ket_thuc) : '') : '') + (x.luu_tru === 'Có' || x._arch ? ' · <i>lưu trữ</i>' : '') + '</li>';
              }).join('') + '</ul>' +
              (act ? (byId(act.id) ? '<button type="button" class="btn primary sm" id="his-open">Mở hồ sơ BN</button>' : '') :
                '<button type="button" class="btn primary sm" id="his-new">Thêm đợt xạ mới</button>' + (byId(last.id) ? ' <button type="button" class="btn sm" id="his-open">Mở hồ sơ đợt gần nhất</button>' : ''));
            if (note.dataset.k === nh && !note.hidden) return;
            note.dataset.k = nh; note.innerHTML = nh;
            note.hidden = false;
            var ob = $('#his-open', note), nb = $('#his-new', note);
            if (ob) ob.onclick = function () { closeModal(); openDetail((act || last).id); };
            if (nb) nb.onclick = function () {
              closeModal();
              patientForm(null, { ma_his: last.ma_his, ho_ten: last.ho_ten, nam_sinh: last.nam_sinh, gioi: last.gioi, khoa: last.khoa, bs_email: last.bs_email, chan_doan: last.chan_doan, icd: last.icd, icd_phu: last.icd_phu,
                uu_tien: 'Thường', igrt: 'Không', sgrt: 'Không', muc_dich: 'Giảm nhẹ / triệu chứng', _force: true });
            };
            return;
          }
          var diff = nameEl.value.trim() && list.filter(function (x) { return RT.fold(x.ho_ten) !== RT.fold(nameEl.value); })[0];
          var cur = list[0];
          note.dataset.k = ''; note.className = 'full his-note' + (diff ? ' bad' : '');
          note.innerHTML = (diff ? '<b>Cảnh báo: mã HIS này đã dùng cho bệnh nhân tên “' + esc(diff.ho_ten) + '”</b>, khác tên đang nhập. Kiểm tra lại mã HIS trước khi lưu.<br>' : '') +
            'Mã HIS <b class="mono">' + esc(ma) + '</b> đã có ' + list.length + ' đợt xạ:<ul>' + list.slice(0, 6).map(function (x) {
              return '<li><span class="mono">' + esc(x.id) + '</span> · ' + esc(x.ho_ten) + (x.nam_sinh ? ' (' + esc(x.nam_sinh) + ')' : '') + ' · ' + esc(x.vi_tri || x.chan_doan || '—') +
                ' · <b>' + esc(RT.STATUS[x.trang_thai] || x.trang_thai) + '</b>' + (x.ngay_bat_dau ? ' · xạ từ ' + fdy(x.ngay_bat_dau) : '') + (x.luu_tru === 'Có' || x._arch ? ' · <i>lưu trữ</i>' : '') + '</li>';
            }).join('') + '</ul>' +
            (isNew && !nameEl.value.trim() ? '<button type="button" class="btn sm" id="his-fill">Điền họ tên, năm sinh, giới từ đợt trước</button>' : '');
          note.hidden = false;
          var fb = $('#his-fill', note);
          if (fb) fb.onclick = function () {
            nameEl.value = cur.ho_ten || ''; $('input[name=nam_sinh]', form).value = cur.nam_sinh || '';
            if (cur.gioi) $('select[name=gioi]', form).value = cur.gioi;
            show();
          };
        };
        var look = function () { var ma = his.value.trim(); lookupHis(ma).then(function () { if (his.value.trim() === ma) show(); }); show(); };
        his.addEventListener('change', look);
        nameEl.addEventListener('change', show);
        if (his.value) look();
      },
      validate: function (v) {
        if (!v.ma_his) return 'Cần nhập mã BN trên HIS.';
        if (isNew && !dotMoi && hisMatches(v.ma_his, exceptId).length) return 'Mã HIS này đã có trong ứng dụng: mở hồ sơ BN cũ (hoặc “Thêm đợt xạ mới”), không thêm BN trùng mã HIS.';
        if (dotMoi && !v.mp_his) return 'Trả lời: BS đã tích chỉ định mô phỏng lại trên HIS chưa?';
        if (!v.ho_ten) return 'Cần nhập họ tên.';
        if (!v.nam_sinh) return 'Cần nhập năm sinh hoặc tuổi.';
        if (isNew && !v.trang_thai) return 'Cần chọn bước hiện tại của bệnh nhân (chưa mô phỏng, đang contour…).';
        if (!v.bs_email) return 'Cần chọn bác sĩ điều trị.';
        if (!v.khoa) return 'Cần chọn khoa.';
        if (prioError(v)) return prioError(v);
        if (v.icd && !RT.isIcd(RT.normIcd(v.icd))) return 'Mã ICD-10 chưa đúng dạng (VD: C50).';
        var early = isNew ? (!v.trang_thai || v.trang_thai === 'MO_PHONG' || v.trang_thai === 'CONTOUR') && !v.co_boost : ['MO_PHONG', 'CONTOUR'].indexOf(p.trang_thai) >= 0 || RT.lenientEdit(p, v, env());
        if (!early) {
          var miss = RT.missingRx(v, isNew && v.trang_thai === 'CHO_KH');
          if (miss.length) return 'Ở bước này cần nhập đủ: ' + miss.join(', ') + '.';
        }
        if (v.co_boost) {
          if (!v.b_ky_thuat) return 'Chọn kỹ thuật boost.';
          if (!(RT.num(v.b_tong_lieu) > 0) || !(RT.num(v.b_so_buoi) >= 1)) return 'Nhập liều và số buổi boost.';
        }
        if (isNew && v.trang_thai === 'DANG_XA') {
          if (!v.ngay_bat_dau) return 'Cần nhập ngày bắt đầu xạ.';
          if (!(RT.num(v.da_xa) >= 1)) return 'Cần nhập số buổi đã xạ.';
          var lim = RT.num(v.so_buoi) + (v.co_boost && v.b_buoc === 'SAN_SANG' ? RT.num(v.b_so_buoi) : 0);
          if (RT.num(v.da_xa) >= lim) return 'Số buổi đã xạ phải nhỏ hơn tổng số buổi.';
        }
        return '';
      },
      onOk: function (v) {
        if (prefill && prefill._rid) v._rid = prefill._rid;
        var raw = JSON.parse(JSON.stringify(v));
        if (v.icd) v.icd = RT.normIcd(v.icd);
        if (isNew) {
          if (v.co_boost) v.boost = { ky_thuat: v.b_ky_thuat, tong_lieu: v.b_tong_lieu, so_buoi: v.b_so_buoi, buoc: v.b_buoc };
          ['co_boost', 'b_ky_thuat', 'b_tong_lieu', 'b_so_buoi', 'b_buoc'].forEach(function (k) { v[k] = undefined; });
          if (dotMoi) v.dot_moi = true;
        } else v.id = p.id;
        var action = isNew ? 'createPatient' : 'updatePatient';
        var send = function () {
          var onErr = function (e) {
            var m = String(e.error);
            if (m.indexOf('HAS_HIS:') === 0) {
              modal({ title: 'Mã HIS đã có trong ứng dụng', body: '<p>Mã HIS <b class="mono">' + esc(v.ma_his) + '</b> đã có: <b>' + esc(m.slice(8)) + '</b>.</p><p>Không thêm BN trùng mã HIS. Nếu BN quay lại xạ, tạo <b>đợt xạ mới</b> từ hồ sơ cũ.</p>',
                ok: 'Thêm đợt xạ mới', onOk: function () { var b2 = JSON.parse(JSON.stringify(raw)); b2._force = true; patientForm(null, b2); } });
              return true;
            }
            if (m.indexOf('DUP_HIS:') === 0) {
              return modal({ title: 'Mã HIS đang có đợt xạ hoạt động', body: '<p>Mã HIS <b class="mono">' + esc(v.ma_his) + '</b> đang có đợt xạ: <b>' + esc(m.slice(8)) + '</b>.</p><p>Không thêm BN trùng mã HIS. Mở hồ sơ BN đó để thao tác.</p>',
                ok: 'Tìm BN này', onOk: function () { S.q = v.ma_his; S.tab = 'all'; render(); } }) || true;
            }
            if (m.indexOf('HIS_NAME:') === 0) {
              modal({ title: 'Mã HIS đã dùng cho bệnh nhân khác tên', body: '<p>Mã HIS <b class="mono">' + esc(v.ma_his) + '</b> đã có trong hệ thống với tên <b>' + esc(m.slice(9)) + '</b>, khác tên đang nhập <b>' + esc(v.ho_ten) + '</b>.</p>' +
                '<p>Thường do gõ nhầm mã HIS. Bấm <b>Huỷ</b> để sửa lại. Chỉ lưu nếu chắc chắn đúng (VD: đã đổi tên, tên cũ nhập sai).</p>',
                ok: 'Vẫn lưu', btnClass: 'danger', onOk: function () { v.force_name = true; send(); } });
              return true;
            }
          };
          if (!isNew) {
            // Xác nhận trước khi lưu: liệt kê từng thay đổi cũ → mới
            var L = RT.FIELD_LABELS, diffs = [];
            var showV = function (k, x) { x = x == null ? '' : String(x); return k === 'bs_email' ? (x ? nameOf(x) : '—') : (x || '—'); };
            Object.keys(L).forEach(function (k) {
              if (v[k] === undefined || v[k] === null) return;
              var a0 = String(p[k] == null ? '' : p[k]).trim(), b0 = String(v[k]).trim();
              if (k === 'icd') { a0 = RT.normIcd(a0); b0 = RT.normIcd(b0); }
              if (a0 !== b0) diffs.push([L[k], showV(k, a0), showV(k, b0)]);
            });
            if (!diffs.length) { toast('Không có gì thay đổi.'); return; }
            return modal({ title: 'Xác nhận sửa thông tin', ok: 'Xác nhận lưu', btnClass: 'danger', noFocus: true,
              body: whoBox(p) + '<p>Kiểm tra lại các thay đổi trước khi lưu. Thay đổi được <b>lưu vết</b> (ai sửa, lúc nào, giá trị cũ → mới) trong nhật ký và ghi chú của BN.</p>' +
                '<div class="tbl-wrap"><table><thead><tr><th>Mục</th><th>Trước</th><th>Sau</th></tr></thead><tbody>' +
                diffs.map(function (d) { return '<tr><td><b>' + esc(d[0]) + '</b></td><td class="muted">' + esc(d[1]) + '</td><td><b>' + esc(d[2]) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' +
                '<label class="confirm" style="margin-top:12px"><input type="checkbox" name="xac_nhan"><span>Tôi đã kiểm tra, xác nhận sửa thông tin bệnh nhân.</span></label>',
              validate: function (cv) { return cv.xac_nhan ? '' : 'Đánh dấu xác nhận trước khi lưu.'; },
              onOk: function () { run(action, v, onErr); } });
          }
          toast('Đang lưu lên máy chủ…');
          serverRun(action, v).catch(function (e) {
            if (onErr(e)) return;
            var back = JSON.parse(JSON.stringify(raw));
            back._retry = errText(e) || 'Không lưu được'; back._rid = v._rid;
            if (prefill && prefill._force) back._force = true;
            patientForm(null, back);
          });
        };
        lookupHis(v.ma_his).then(send);
      }
    });
  }

  var BOOST_KINDS = [
    ['CUNG_LUC', 'Lập KH boost cùng lúc với GĐ1', 'Contour và lập kế hoạch cùng đợt với GĐ1'],
    ['CONTOUR', 'Contour boost trên CT cũ', 'Bác sĩ contour boost sau (thường khi gần hết GĐ1)'],
    ['MO_PHONG', 'Cần mô phỏng lại', 'Chụp CT mô phỏng lại, rồi contour và lập KH boost'],
    ['SAN_SANG', 'Đã có KH boost', 'Dùng khi nhập BN đã có sẵn kế hoạch boost']
  ];
  function phaseForm(p, g) {
    var isNew = !g, d = S.data.dm, v0 = g || { uu_tien: p.uu_tien || 'Thường', ly_do_uu_tien: p.ly_do_uu_tien || '' };
    var inp = function (name, type, attrs) { return '<input type="' + (type || 'text') + '" name="' + name + '" value="' + esc(v0[name] || '') + '" ' + (attrs || '') + '>'; };
    modal({ title: isNew ? 'Thêm boost / KH đồng thời' : 'Sửa ' + phKind(g) + (g.loai ? '' : ' GĐ' + g.stt), ok: isNew ? 'Thêm' : 'Lưu',
      body: whoBox(p) + '<div class="form">' +
        (isNew ? '<div class="field full"><span class="lb">Loại kế hoạch</span><div class="radios">' +
          '<label><input type="radio" name="loai" value="" checked><span><b>Boost (nối tiếp)</b><small>Xạ sau khi xong GĐ trước</small></span></label>' +
          '<label><input type="radio" name="loai" value="SONG_SONG"><span><b>KH đồng thời</b><small>Vị trí thứ hai xạ cùng ngày với KH chính (VD: thực quản + hạch cổ). Mỗi ngày vẫn tính 1 thủ thuật.</small></span></label></div></div>' : '') +
        field('Kỹ thuật <span class="req">*</span>', '<select name="ky_thuat">' + opts(d.KY_THUAT, v0.ky_thuat, 'Chọn') + '</select>') +
        field('Ưu tiên lập KH', '<select name="uu_tien">' + opts(d.UU_TIEN, v0.uu_tien) + '</select>') + prioReasonField(v0.ly_do_uu_tien) +
        field('Tổng liều (Gy) <span class="req">*</span>', inp('tong_lieu', 'number', 'step="0.01" min="0"')) +
        field('Số buổi <span class="req">*</span>', inp('so_buoi', 'number', 'step="1" min="1" max="60"')) +
        field('Các mức liều (nếu SIB)', inp('muc_lieu')) + field('Tên vị trí', inp('vi_tri', 'text', 'placeholder="VD: Đầu cổ"'), '', 'Để phân biệt khi có 2 KH cùng lúc.') +
        (isNew ? '<div class="field full"><span class="lb">Lập kế hoạch</span><div class="radios">' + BOOST_KINDS.map(function (k, i) {
          var dis = k[0] === 'CUNG_LUC' && ['CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA'].indexOf(p.trang_thai) < 0;
          return '<label' + (dis ? ' style="opacity:.5"' : '') + '><input type="radio" name="buoc" value="' + k[0] + '"' + ((dis ? i === 1 : i === 0) ? ' checked' : '') + (dis ? ' disabled' : '') + '><span><b>' + k[1] + '</b><small>' + k[2] + '</small></span></label>';
        }).join('') + '</div></div>' + '<div class="field" data-sim><label>Hẹn mô phỏng lại</label><input type="date" name="ngay_mo_phong" min="' + today() + '"></div>' + mpHisField(' data-sim') : '') +
        (!isNew && g.mp_his ? mpHisField('', g.mp_his) : '') +
        field('Ghi chú', '<textarea name="ghi_chu">' + esc(v0.ghi_chu || '') + '</textarea>', 'full') + '</div>',
      onMount: function (form) {
        var upd = function () { var v = formValues(form); $$('[data-sim]', form).forEach(function (el) { el.hidden = v.buoc !== 'MO_PHONG'; }); };
        $$('input[name=buoc]', form).forEach(function (el) { el.addEventListener('change', upd); }); upd();
        bindPrio(form);
      },
      validate: function (v) {
        if (!v.ky_thuat) return 'Chọn kỹ thuật.';
        if (isNew && v.buoc === 'MO_PHONG' && !v.mp_his) return 'Trả lời: BS đã tích chỉ định mô phỏng lại trên HIS chưa?';
        if (prioError(v)) return prioError(v);
        if (!(RT.num(v.tong_lieu) > 0) || !(RT.num(v.so_buoi) >= 1)) return 'Nhập liều và số buổi.';
        return '';
      },
      onOk: function (v) {
        if (isNew) { v.bn_id = p.id; run('addPhase', v); }
        else { v.id = g.id; v.buoc = undefined; run('updatePhase', v); }
      } });
  }

  /** Chuyển KH một phần (đặt số buổi được chuyển) hoặc BS cho xạ tiếp KH cũ sau khi đánh giá lại */
  function reviewForm(p, go) {
    var c = course(p), sg = c.reviewSeg || c.cur, dn = Math.max(0, c.done - sg.from);
    modal({ title: go ? 'Xạ tiếp KH cũ' : 'Chuyển KH một phần', ok: go ? 'Xạ tiếp' : 'Lưu',
      body: whoBox(p, '<span style="margin-top:6px">' + esc(sg.label) + ' ' + esc(sg.ky_thuat) + ': KH ' + sg.so_buoi + ' buổi, đã xạ ' + dn + '</span>') + '<div class="form">' +
        field(go ? 'Chuyển tiếp đến buổi' : 'Số buổi KS chuyển <span class="req">*</span>', '<input type="number" name="chuyen_buoi" min="' + (dn + 1) + '" max="' + sg.so_buoi + '" step="1">', '',
          go ? 'Để trống = xạ hết KH (' + sg.so_buoi + ' buổi). Nhập số nếu chỉ chuyển thêm một phần.' : 'Hết số buổi này, KTV phải chờ BS đánh giá lại mới ghi được buổi tiếp theo.') +
        field('Ghi chú', '<input type="text" name="ghi_chu">', 'full') + '</div>',
      validate: function (v) {
        if (!go && !v.chuyen_buoi) return 'Nhập số buổi được chuyển.';
        if (v.chuyen_buoi && !(RT.num(v.chuyen_buoi) > dn)) return 'Số buổi phải lớn hơn số buổi đã xạ (' + dn + ').';
        return '';
      },
      onOk: function (v) { run('setReview', { id: p.id, chuyen_buoi: v.chuyen_buoi || '', ghi_chu: v.ghi_chu }); } });
  }
  /** BS lập lại kế hoạch giữa đợt: mô phỏng lại hoặc contour trên CT cũ; trong lúc chờ vẫn xạ KH cũ hoặc tạm dừng */
  function replanForm(p) {
    var c = course(p), d = S.data.dm, cur = c.cur, done = Math.max(0, c.done - cur.from), left = Math.max(0, cur.so_buoi - done);
    var v0 = { ky_thuat: cur.ky_thuat, so_buoi: left || '', tong_lieu: left ? Math.round(left * cur.d * 100) / 100 : '' };
    var inp = function (name, type, attrs) { return '<input type="' + (type || 'text') + '" name="' + name + '" value="' + esc(v0[name] || '') + '" ' + (attrs || '') + '>'; };
    modal({ title: 'Lập lại kế hoạch', ok: 'Tạo KH lại',
      body: whoBox(p, '<span style="margin-top:6px">Đang xạ <b>' + esc(cur.label) + '</b> ' + esc(cur.ky_thuat) + ': đã xạ <b>' + done + '/' + cur.so_buoi + '</b> buổi</span>') + '<div class="form">' +
        '<div class="field full"><span class="lb">Làm lại từ</span><div class="radios">' +
          '<label><input type="radio" name="buoc" value="MO_PHONG" checked><span><b>Mô phỏng lại</b><small>Chụp CT mô phỏng lại, rồi contour và lập KH</small></span></label>' +
          '<label><input type="radio" name="buoc" value="CONTOUR"><span><b>Contour lại trên CT cũ</b><small>BS sửa contour, kỹ sư lập KH mới</small></span></label>' +
          '<label><input type="radio" name="buoc" value="CHO_KH"><span><b>Chỉ lập lại KH</b><small>Contour giữ nguyên, kỹ sư lập KH mới</small></span></label></div></div>' +
        '<div class="field" data-sim><label>Hẹn mô phỏng lại</label><input type="date" name="ngay_mo_phong" min="' + today() + '"></div>' + mpHisField(' data-sim') +
        '<div class="field full"><span class="lb">Trong lúc chờ KH mới</span><div class="radios">' +
          '<label><input type="radio" name="dung" value="" checked><span><b>Vẫn xạ KH cũ</b><small>Khi KH mới sẵn sàng, KH cũ dừng ở số buổi đã xạ, các buổi sau xạ KH mới</small></span></label>' +
          '<label><input type="radio" name="dung" value="1"><span><b>Tạm dừng xạ</b><small>BN chuyển sang Tạm ngừng, KH mới sẵn sàng thì tự xạ tiếp</small></span></label></div></div>' +
        field('Kỹ thuật KH mới <span class="req">*</span>', '<select name="ky_thuat">' + opts(d.KY_THUAT, v0.ky_thuat, 'Chọn') + '</select>') +
        field('Tổng liều KH mới (Gy) <span class="req">*</span>', inp('tong_lieu', 'number', 'step="0.01" min="0"')) +
        field('Số buổi KH mới <span class="req">*</span>', inp('so_buoi', 'number', 'step="1" min="1" max="60"'), '', 'Gợi ý: số buổi còn lại của KH cũ (' + left + ').') +
        field('Các mức liều (nếu SIB)', inp('muc_lieu'), 'full') +
        field('Lý do / ghi chú', '<textarea name="ghi_chu" placeholder=""></textarea>', 'full') + '</div>',
      onMount: function (form) {
        var upd = function () { var v = formValues(form); $$('[data-sim]', form).forEach(function (el) { el.hidden = v.buoc !== 'MO_PHONG'; }); };
        $$('input[name=buoc]', form).forEach(function (el) { el.addEventListener('change', upd); }); upd();
      },
      validate: function (v) {
        if (!v.ky_thuat) return 'Chọn kỹ thuật.';
        if (v.buoc === 'MO_PHONG' && !v.mp_his) return 'Trả lời: BS đã tích chỉ định mô phỏng lại trên HIS chưa?';
        if (!(RT.num(v.tong_lieu) > 0) || !(RT.num(v.so_buoi) >= 1)) return 'Nhập liều và số buổi của KH mới.';
        return '';
      },
      onOk: function (v) { run('replan', { id: p.id, buoc: v.buoc, ngay_mo_phong: v.buoc === 'MO_PHONG' ? v.ngay_mo_phong : '', mp_his: v.buoc === 'MO_PHONG' ? v.mp_his : '', dung_xa: !!v.dung, ky_thuat: v.ky_thuat, tong_lieu: v.tong_lieu, so_buoi: v.so_buoi, muc_lieu: v.muc_lieu, ghi_chu: v.ghi_chu }); } });
  }

  // ---------- khởi động ----------
  function boot() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('#modal').hidden) closeModal(); else if (S.detail) closeDetail();
    });
    // Tự tải lại dữ liệu mỗi 60 giây và khi quay lại tab, để thấy cập nhật của người khác
    // Mỗi 30 giây hỏi máy chủ "có ai vừa sửa gì không" (rất nhẹ); chỉ khi có thay đổi mới tải lại dữ liệu
    var fullReload = function () {
      var y = window.scrollY;
      call('bootstrap').then(function (r) {
        if (pending.length) return;
        var notes = S.data ? computeNotes(S.data, r.data) : [];
        setData(r.data); if (r.rev) S.rev = r.rev;
        pushNotes(notes);
        render(); window.scrollTo(0, y);
      }, function () {});
    };
    var refresh = function () {
      if (!S.data || S.busy > 0 || pending.length || document.hidden || !$('#modal').hidden) return;
      if (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      call('rev').then(function (r) {
        if (r.rev && r.rev === S.rev) return;
        fullReload();
      }, function () { if (Date.now() - S.lastLoad > 60000) fullReload(); });
    };
    setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
    setBusy(1);
    call('bootstrap').then(function (r) { setData(r.data); if (r.rev) S.rev = r.rev; render(); }, function (e) {
      var msg = String(e.error || '');
      var html;
      if (msg.indexOf('NO_ACCESS:') === 0) html = '<h1>Tài khoản chưa được cấp quyền</h1><p>Tài khoản <b class="mono">' + esc(msg.slice(10)) + '</b> chưa có trong danh sách người dùng.</p><p class="muted">Gửi địa chỉ email này cho quản trị để được thêm vào trang tính <b>NguoiDung</b>, rồi tải lại trang.</p>';
      else if (/googleapis\.com\/auth|thực hiện lệnh gọi|required permissions|not have permission to call/i.test(msg)) html =
        '<h1>Chưa cấp đủ quyền cho ứng dụng</h1><p>Lúc cấp quyền lần đầu, tài khoản của bạn chưa tích đủ các ô quyền. Làm 2 bước sau (khoảng 1 phút):</p>' +
        '<ol><li>Mở <b>myaccount.google.com/connections</b>, chọn ứng dụng <b>Điều phối Xạ trị</b> (hoặc "Dự án không có tiêu đề") → <b>Xoá mọi quyền truy cập</b>.</li>' +
        '<li>Mở lại link ứng dụng. Khi Google hỏi quyền: <b>Nâng cao → Đi tới… → tích “Chọn tất cả”</b> → <b>Tiếp tục</b>.</li></ol>' +
        '<p class="muted">Chi tiết lỗi: ' + esc(msg) + '</p>';
      else if (/access|quyền truy cập|not found|không tìm thấy/i.test(msg) && /openById|tài liệu|document|spreadsheet/i.test(msg)) html =
        '<h1>Chưa được chia sẻ dữ liệu</h1><p>Tài khoản của bạn chưa được chia sẻ Google Sheet dữ liệu của khoa. Nhờ quản trị chia sẻ (quyền Người chỉnh sửa) cho email của bạn, rồi tải lại trang.</p>' +
        '<p class="muted">Chi tiết lỗi: ' + esc(msg) + '</p>';
      else html = '<h1>Không tải được dữ liệu</h1><p>' + esc(msg) + '</p>';
      $('#main').innerHTML = '<div class="main-in"><div class="notice">' + html + '</div></div>';
    }).finally(function () { setBusy(-1); });
  }
  boot();
})();
