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
  function me() { return S.data.me; }
  function role() { return S.data.me.vai_tro; }
  function can(a) { return RT.can(role(), a, me()); }
  function isLead() { return RT.isLead(me()); }
  function nameOf(email) { var u = S.data.users.filter(function (x) { return x.email === email; })[0]; return u ? u.ho_ten : (email || ''); }
  /** Bác sĩ: vai trò BS, hoặc Quản trị có tên bắt đầu bằng "BS" (bác sĩ kiêm quản trị) */
  function isDoctor(u) { return u && (u.vai_tro === 'BS' || (u.vai_tro === 'ADMIN' && /^\s*(BS|Bác sĩ|ThS|TS|PGS)/i.test(u.ho_ten || ''))); }
  function doctors() { return S.data.users.filter(function (u) { return u.kich_hoat !== 'Không' && isDoctor(u); }); }
  function activeUsers(role) { return S.data.users.filter(function (u) { return u.kich_hoat !== 'Không' && (!role || u.vai_tro === role); }); }
  function unitName() { return (S.data.dm.TEN_DON_VI || [])[0] || ''; }
  function env() { return S.env || (S.env = RT.makeEnv(today(), S.data.holidays, S.data.exceptions, S.data.phases, (S.data.dm.MAY || [])[0])); }
  function archEnv() { return S.archEnv || (S.archEnv = RT.makeEnv(today(), S.data.holidays, [], (S.arch && S.arch.phases) || [], (S.data.dm.MAY || [])[0])); }
  function course(p) {
    if (p._pid) p = byId(p._pid);
    if (p._arch) return S.cc[p.id] || (S.cc[p.id] = RT.course(p, S.arch.fractions, archEnv()));
    return S.cc[p.id] || (S.cc[p.id] = RT.course(p, S.data.fractions, env()));
  }
  function setData(d) { S.data = d; S.cc = {}; S.env = null; S.itemsCache = null; S.lastLoad = Date.now(); }
  /** Các "việc lập kế hoạch": BN (GĐ1) và các boost đang ở bước mô phỏng → QA. Boost mượn thông tin hành chính của BN. */
  var PH_FIELDS = ['ky_thuat', 'tong_lieu', 'so_buoi', 'muc_lieu', 'uu_tien', 'trang_thai', 'ngay_tao', 'ngay_mo_phong', 'ngay_contour_xong', 'ks_email', 'ngay_nhan_kh', 'ngay_kh_xong', 'can_qa', 'qa_ket_qua', 'ngay_qa', 'ghi_chu'];
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
  function pts() { return S.data.patients; }
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
  function prPill(p) { return '<span class="pill pr-' + prRank(p) + '">' + esc(p.uu_tien || 'Thường') + '</span>'; }
  function rx(p) { if (!p._g && RT.missingRx(p).length) return '<span class="flag">Chưa đủ chỉ định</span>' + (p.ky_thuat ? ' ' + esc(p.ky_thuat) : ''); return esc(p.ky_thuat) + ' · <span class="num">' + esc(p.tong_lieu) + ' Gy/' + esc(p.so_buoi) + '</span>'; }
  function ptCell(p) {
    return '<div class="pt"><b>' + esc(p.ho_ten) + '</b>' + (p._g ? ' <span class="tag boost">Boost GĐ' + esc(p._g.stt) + '</span>' : '') + '<span class="sub"><span class="mono">' + esc(p.ma_his) + '</span>' +
      (age(p) ? ' · ' + age(p) : '') + (p.gioi ? ' · ' + esc(p.gioi) : '') + '</span></div>';
  }
  function progCell(p) {
    var c = course(p), pct = c.total ? Math.round(c.done / c.total * 100) : 0;
    return '<div class="prog"><span class="bar"><i style="width:' + pct + '%"></i></span><span class="num">' + c.done + '/' + c.total + '</span></div>';
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
  var LOCAL = { getLog: 0, searchArchive: 0, demoSwitch: 0, bootstrap: 0 };
  var pending = [], chain = Promise.resolve();
  function nowStr() { var d = new Date(), p2 = function (n) { return (n < 10 ? '0' : '') + n; }; return today() + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); }
  function applyLocal(data, action, payload) {
    var ctx = RT.localCtx(data, nowStr());
    var msg = RT.handle(ctx, action, JSON.parse(JSON.stringify(payload || {})));
    var v = RT.view(ctx);
    v.dm = ctx.dm; v.holidays = ctx.holidays;
    return { data: v, msg: msg };
  }
  /** Cập nhật màn hình ngay bằng lõi nghiệp vụ chạy trên trình duyệt, rồi lưu lên máy chủ phía sau. */
  function act(action, payload) {
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
      return call(action, payload).then(function (r) {
        pending.shift();
        if (r.rev) S.rev = r.rev;
        var d = r.data;
        pending.forEach(function (o) { try { d = applyLocal(d, o.action, o.payload).data; } catch (e) { /* bỏ qua, máy chủ sẽ báo */ } });
        setData(d); render();
      }, function (e) {
        pending.shift();
        toast('Chưa lưu được: ' + (e.error || 'mất kết nối') + '. Đã tải lại dữ liệu.', true);
        return call('bootstrap').then(function (r) { setData(r.data); render(); }, function () {});
      });
    }).finally(function () { setBusy(-1); });
    return Promise.resolve({ ok: true, msg: local.msg });
  }
  function run(action, payload, onError) {
    return act(action, payload).catch(function (e) {
      if (onError && onError(e)) return;
      toast(e.error || 'Có lỗi xảy ra.', true);
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
    wrap.innerHTML = '<div class="modal-wrap"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mdl-t">' +
      '<div class="modal-head"><h2 id="mdl-t">' + esc(opts.title) + '</h2><button class="x" data-close aria-label="Đóng">×</button></div>' +
      '<form class="modal-body" id="mdl-form" novalidate>' + opts.body + '</form>' +
      '<div class="modal-foot"><button type="button" class="btn" data-close>Huỷ</button>' +
      '<button type="submit" form="mdl-form" class="btn ' + (opts.btnClass || 'primary') + '" id="mdl-ok">' + esc(opts.ok || 'Lưu') + '</button></div></div></div>';
    wrap.hidden = false;
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
    if (opts.onMount) opts.onMount(form);
    var first = $('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea', form);
    if (first && !opts.noFocus) first.focus();
  }
  function closeModal() { var w = $('#modal'); w.hidden = true; w.innerHTML = ''; }
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

  // ---------- khung ----------
  var TABS = {
    home: { label: function () { return role() === 'DD' ? 'Tổng quan' : 'Bệnh nhân của tôi'; }, render: renderHome },
    plan: { label: function () { return 'Lập kế hoạch'; }, render: renderPlanning },
    today: { label: function () { return 'Xạ hôm nay'; }, render: renderToday },
    sched: { label: function () { return 'Xếp lịch'; }, render: renderSchedule },
    week: { label: function () { return 'Lịch tuần'; }, render: renderWeek },
    all: { label: function () { return 'Tất cả BN'; }, render: renderAll },
    roster: { label: function () { return 'Phân công'; }, render: renderRoster },
    stats: { label: function () { return 'Thống kê'; }, render: renderStats },
    log: { label: function () { return 'Nhật ký'; }, render: function () { return '<div class="page-head"><div><h1>Nhật ký thao tác</h1><p>Ai làm gì, lúc nào. Chỉ trưởng khoa/phòng và quản trị xem được.</p></div></div>' + logSection(); } },
    admin: { label: function () { return 'Quản trị'; }, render: renderAdmin }
  };
  var ROLE_TABS = { BS: ['home', 'all', 'roster'], KS: ['plan', 'all', 'roster'], KTV: ['today', 'week', 'roster', 'sched', 'all'], DD: ['home', 'all', 'roster'], ADMIN: ['home', 'plan', 'today', 'week', 'roster', 'sched', 'all', 'admin'] };

  function renderShell() {
    var d = S.data, tabs = (ROLE_TABS[role()] || ['all']).slice();
    if (RT.statsScope(me())) tabs.splice(tabs.indexOf('admin') >= 0 ? tabs.indexOf('admin') : tabs.length, 0, 'stats');
    if (isLead() && role() !== 'ADMIN') tabs.push('log');
    if (S.role !== d.me.email) { S.role = d.me.email; S.scope = isDoctor(d.me) ? 'mine' : 'all'; S.log = null; }
    if (tabs.indexOf(S.tab) < 0) S.tab = tabs[0];
    var who;
    if (window.DEMO) {
      who = '<label class="who"><span class="nm muted">Đăng nhập thử với:</span><select id="demo-user" aria-label="Chọn người dùng demo">' +
        opts(d.users.filter(function (u) { return u.kich_hoat !== 'Không'; }).map(function (u) { return { v: u.email, l: u.ho_ten + ' — ' + RT.ROLES[u.vai_tro] }; }), d.me.email) + '</select></label>';
    } else {
      who = '<div class="who"><span class="nm">' + esc(d.me.ho_ten) + '</span><span class="role role-' + d.me.vai_tro + '">' + esc(RT.ROLES[d.me.vai_tro]) + '</span></div>';
    }
    var t = today(), dowFull = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][RT.dow(t)];
    $('#top').innerHTML =
      '<div class="util"><div class="util-in"><span><b>' + esc(unitName()) + '</b></span><span>' + dowFull + ', ' + fdy(t) + ' · <span title="Phiên bản ứng dụng">v' + esc(RT.VERSION) + '</span></span></div></div>' +
      noticeBar() +
      '<div class="top-in"><div class="brand"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8"/></svg></span><span>Điều phối Xạ trị<small>Bác sĩ · Kỹ sư · KTV · Điều dưỡng</small></span></div>' +
      '<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input id="q" type="search" placeholder="Tìm theo mã HIS hoặc tên bệnh nhân" value="' + esc(S.q) + '" aria-label="Tìm bệnh nhân" autocomplete="off"></div>' + bell() + who + '</div>' +
      '<nav class="tabs"><div class="tabs-in" role="tablist">' + tabs.map(function (t) {
        return '<button class="tab" role="tab" data-tab="' + t + '" aria-selected="' + (S.tab === t) + '">' + esc(TABS[t].label()) + '</button>';
      }).join('') + '<span class="spacer"></span>' +
      (can('createPatient') ? '<button class="btn primary" id="add-bn">+ Thêm bệnh nhân</button>' : '') + '</div></nav>';
    $$('.tab').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; render(); window.scrollTo(0, 0); }; });
    var q = $('#q');
    q.oninput = function () {
      S.q = q.value;
      if (S.tab !== 'all') { S.tab = 'all'; render(); var q2 = $('#q'); q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); }
      else renderMain();
    };
    if ($('#add-bn')) $('#add-bn').onclick = function () { patientForm(null); };
    $$('[data-clearnotice]').forEach(function (b) { b.onclick = function () { run('clearNotice', { id: b.dataset.clearnotice }); }; });
    bindBell();
    if ($('#demo-user')) $('#demo-user').onchange = function (e) { S.tab = null; run('demoSwitch', { email: e.target.value }); };
  }

  function render() {
    if (!S.data) return;
    renderShell();
    renderMain();
    if (S.detail) renderDetail();
  }
  function renderMain() { S.cc = S.cc || {}; $('#main').innerHTML = '<div class="main-in">' + TABS[S.tab].render() + '</div>'; bindMain(); }

  function bindMain() {
    $$('#main [data-open]').forEach(function (el) {
      el.onclick = function (e) { if (e.target.closest('button,a,select,input')) return; openDetail(el.dataset.open); };
      el.onkeydown = function (e) { if (e.key === 'Enter' && e.target === el) openDetail(el.dataset.open); };
    });
    $$('#main [data-do]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); doAction(b.dataset.do, b.dataset.id); }; });
    $$('#main [data-scroll]').forEach(function (b) { b.onclick = function () { var g = document.getElementById(b.dataset.scroll); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
    $$('#main [data-scope]').forEach(function (b) { b.onclick = function () { S.scope = b.dataset.scope; renderMain(); }; });
    $$('#main [data-filter]').forEach(function (el) { el.onchange = function () { S[el.dataset.filter] = el.value; renderMain(); }; });
    if (S.tab === 'admin') bindAdmin();
    if (S.tab === 'week') bindWeek();
    if (S.tab === 'all') bindAll();
    if (S.tab === 'roster') bindRoster();
    if (S.tab === 'stats') bindStats();
    $$('#main [data-admin=loadLog]').forEach(function (b) { if (S.tab !== 'admin') b.onclick = function () { run('getLog'); }; });
    $$('#main [data-notice]').forEach(function (b) { b.onclick = noticeForm; });
  }

  // ---------- bảng ----------
  function table(rows, cols, emptyText) {
    if (!rows.length) return '<div class="card"><div class="empty">' + esc(emptyText || 'Không có bệnh nhân.') + '</div></div>';
    return '<div class="card"><div class="tbl-wrap"><table><thead><tr>' + cols.map(function (c) { return '<th>' + c.h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (p, i) {
        return '<tr class="click" tabindex="0" data-open="' + esc(p._pid || p.id) + '">' + cols.map(function (c) {
          return '<td class="' + (c.cls || '') + '">' + c.v(p, i) + '</td>';
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
    dx: { h: 'Chẩn đoán', v: function (p) { return esc(p.chan_doan) + (p.vi_tri ? '<span class="sub">Vị trí: ' + esc(p.vi_tri) + '</span>' : ''); } },
    rx: { h: 'Kỹ thuật · liều', v: rx, cls: 'nowrap' },
    bs: { h: 'BS điều trị', v: function (p) { return esc(nameOf(p.bs_email)); }, cls: 'nowrap' },
    pr: { h: 'Ưu tiên', v: prPill },
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
    week: { h: 'Lịch tuần', v: function (p) { return RT.needsOffDay(p) ? '<span class="flag">Chưa chọn ngày nghỉ</span>' : esc(RT.scheduleLabel(p)); }, cls: 'nowrap' },
    dose: { h: 'Liều đã nhận', v: function (p) { var c = course(p); return '<span class="num">' + c.doseDone + ' / ' + esc(p.tong_lieu) + ' Gy</span>'; }, cls: 'nowrap' },
    missed: { h: 'Vắng', v: function (p) { var n = course(p).missed.length; return n ? '<span class="flag crit">' + n + ' buổi</span>' : '<span class="muted">0</span>'; } }
  };

  // ---------- Trang chủ BS / ĐD ----------
  var HOME_GROUPS = [
    { id: 'contour', label: 'Đang contour', st: ['MO_PHONG', 'CONTOUR'], color: 'var(--bs)', items: true },
    { id: 'ks', label: 'Kỹ sư đang lập KH', st: ['CHO_KH', 'DANG_KH'], color: 'var(--ks)', items: true },
    { id: 'qa', label: 'Chờ QA', st: ['CHO_QA'], color: 'var(--warn)', items: true },
    { id: 'wait', label: 'Chờ vào xạ', st: ['CHO_XA'], color: 'var(--accent)' },
    { id: 'tx', label: 'Đang xạ', st: ['DANG_XA'], color: 'var(--ktv)' },
    { id: 'pause', label: 'Tạm ngừng', st: ['TAM_NGUNG'], color: 'var(--crit)' }
  ];

  function renderHome() {
    var isBs = role() === 'BS' || role() === 'ADMIN';
    var scope = isBs ? S.scope : 'all';
    var list = pts().filter(function (p) { return scope === 'all' || p.bs_email === me().email; });
    var ilist = items().filter(function (p) { return scope === 'all' || p.bs_email === me().email; });
    var by = function (st, useItems) { return (useItems ? ilist : list).filter(function (p) { return st.indexOf(p.trang_thai) >= 0; }); };
    var queue = RT.planningQueue(items(), boostLeft);
    var qpos = function (p) { for (var i = 0; i < queue.length; i++) if (queue[i].id === p.id) return i + 1; return 0; };
    var g = {}; HOME_GROUPS.forEach(function (x) { g[x.id] = by(x.st, x.items); });
    g.ks.sort(function (a, b) { return (a.trang_thai === 'DANG_KH' ? 0 : 1) - (b.trang_thai === 'DANG_KH' ? 0 : 1) || qpos(a) - qpos(b); });
    g.wait.sort(function (a, b) { return (a.ngay_du_kien || '9') < (b.ngay_du_kien || '9') ? -1 : 1; });
    g.tx.sort(function (a, b) { return (course(b).missed.length - course(a).missed.length) || (course(a).end < course(b).end ? -1 : 1); });
    var doneSoon = list.filter(function (p) { return p.trang_thai === 'DANG_XA' && course(p).end && RT.diffDays(today(), course(p).end) <= 6; }).length;

    var html = '<div class="page-head"><div><h1>' + (scope === 'all' ? 'Toàn bộ bệnh nhân' : 'Bệnh nhân của ' + esc(me().ho_ten)) + '</h1>' +
      '<p>' + fdw(today()) + '/' + today().slice(0, 4) + ' · ' + list.filter(function (p) { return p.trang_thai !== 'HOAN_THANH'; }).length + ' bệnh nhân đang trong quy trình</p></div>' +
      (isBs ? '<div class="seg" role="group" aria-label="Phạm vi"><button data-scope="mine" aria-pressed="' + (scope === 'mine') + '">Của tôi</button><button data-scope="all" aria-pressed="' + (scope === 'all') + '">Cả khoa</button></div>' : '') + '</div>';
    html += '<div class="kpis">' + HOME_GROUPS.map(function (x) {
      var extra = '';
      if (x.id === 'tx' && doneSoon) extra = '<span class="kx muted">' + doneSoon + ' kết thúc trong 7 ngày</span>';
      if (x.id === 'wait') { var nd = g.wait.filter(function (p) { return !p.ngay_du_kien; }).length; if (nd) extra = '<span class="kx" style="color:var(--warn)">' + nd + ' chưa xếp lịch</span>'; }
      if (x.id === 'ks') { var cc = g.ks.filter(function (p) { return p.uu_tien === 'Cấp cứu'; }).length; if (cc) extra = '<span class="kx" style="color:var(--crit)">' + cc + ' cấp cứu</span>'; }
      return kpi(x.id, g[x.id].length, x.label, x.color, extra);
    }).join('') + '</div>';

    var contourActs = { h: '', cls: 'act', v: function (p) {
      if (p.trang_thai === 'MO_PHONG') return (p.ngay_mo_phong ? '<span class="muted">hẹn ' + fdw(p.ngay_mo_phong) + '</span> ' : '<span class="pill st-MO_PHONG">' + (p._g ? 'Chờ mô phỏng lại' : 'Chờ mô phỏng') + '</span> ') +
        (can('simDone') ? btn('simDone', p.id, 'Đã mô phỏng xong') : '');
      return (boostFlag(p) ? boostFlag(p) + ' ' : '') + (can('contourDone') && (p.bs_email === me().email || role() === 'ADMIN') ? btn('contourDone', p.id, 'Contour xong', 'primary') : '');
    } };
    html += group('contour', 'Đang contour', g.contour, [C.pt, C.dx, C.rx, C.pr,
      { h: 'Từ ngày', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_tao) + '</span><span class="sub">' + daysSince(p.ngay_tao) + ' ngày</span>'; } },
      scope === 'all' ? C.bs : null, contourActs].filter(Boolean), null, 'Không có bệnh nhân đang chờ contour.');
    html += group('ks', 'Kỹ sư đang lập kế hoạch', g.ks, [C.pt, C.dx, C.rx, C.pr,
      { h: 'Tình trạng', v: function (p) { return p.trang_thai === 'DANG_KH' ? stPill(p) + '<span class="sub">' + esc(nameOf(p.ks_email)) + ' · từ ' + fd(p.ngay_nhan_kh) + '</span>' : stPill(p) + '<span class="sub">Thứ tự hàng đợi: #' + qpos(p) + '</span>'; } },
      { h: 'Contour xong', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_contour_xong) + '</span><span class="sub">' + daysSince(p.ngay_contour_xong) + ' ngày trước</span>'; } },
      scope === 'all' ? C.bs : null].filter(Boolean), null, 'Không có bệnh nhân ở bước lập kế hoạch.');
    html += group('qa', 'Chờ QA', g.qa, [C.pt, C.dx, C.rx,
      { h: 'Kế hoạch xong', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_kh_xong) + '</span><span class="sub">' + esc(nameOf(p.ks_email)) + '</span>'; } },
      scope === 'all' ? C.bs : null].filter(Boolean), null, 'Không có kế hoạch chờ QA.');
    html += group('wait', 'Chờ vào xạ', g.wait, [C.pt, C.dx, C.rx, C.expected, C.week,
      { h: 'QA', v: function (p) { return p.qa_ket_qua === 'Đạt' ? '<span class="flag ok">Đạt</span>' : '<span class="muted">' + esc(p.qa_ket_qua || '—') + '</span>'; } },
      C.end, scope === 'all' ? C.bs : null].filter(Boolean), null, 'Không có bệnh nhân chờ vào xạ.');
    html += group('tx', 'Đang xạ', g.tx, [C.pt, C.rx, C.prog, C.dose, C.img, C.missed, C.end, scope === 'all' ? C.bs : null].filter(Boolean), null, 'Không có bệnh nhân đang xạ.');
    html += group('pause', 'Tạm ngừng xạ', g.pause, [C.pt, C.rx, C.prog,
      { h: 'Tạm ngừng từ', cls: 'nowrap', v: function (p) { var n = daysSince(p.tam_ngung_tu); return '<span class="num">' + fdw(p.tam_ngung_tu) + '</span><span class="sub" style="color:var(--crit)">' + n + ' ngày</span>'; } },
      { h: 'Lý do', v: function (p) { return esc(p.ly_do_tam_ngung); } }, scope === 'all' ? C.bs : null].filter(Boolean), null, 'Không có bệnh nhân tạm ngừng xạ.');
    return html;
  }

  // ---------- Kỹ sư ----------
  function renderPlanning() {
    var queue = RT.planningQueue(items(), boostLeft);
    var doing = items().filter(function (p) { return p.trang_thai === 'DANG_KH'; }).sort(function (a, b) { return prRank(a) - prRank(b) || (a.ngay_nhan_kh < b.ngay_nhan_kh ? -1 : 1); });
    var qa = items().filter(function (p) { return p.trang_thai === 'CHO_QA'; }).sort(function (a, b) { return prRank(a) - prRank(b) || (a.ngay_kh_xong < b.ngay_kh_xong ? -1 : 1); });
    var recent = pts().filter(function (p) { return p.ngay_kh_xong && daysSince(p.ngay_kh_xong) <= 7 && ['CHO_XA', 'DANG_XA', 'TAM_NGUNG', 'HOAN_THANH'].indexOf(p.trang_thai) >= 0; })
      .sort(function (a, b) { return a.ngay_kh_xong < b.ngay_kh_xong ? 1 : -1; });
    var mine = doing.filter(function (p) { return p.ks_email === me().email; }).length;
    var urgent = queue.filter(function (p) { return p.uu_tien === 'Cấp cứu'; }).length;

    var html = '<div class="page-head"><div><h1>Lập kế hoạch</h1><p>' + fdw(today()) + '/' + today().slice(0, 4) + '</p></div></div>';
    html += '<div class="kpis">' +
      kpi('queue', queue.length, 'Contour xong, chờ lập KH', 'var(--ks)', urgent ? '<span class="kx" style="color:var(--crit)">' + urgent + ' cấp cứu</span>' : '') +
      kpi('doing', doing.length, 'Đang lập KH', 'var(--ks)', mine ? '<span class="kx muted">' + mine + ' của bạn</span>' : '') +
      kpi('qa', qa.length, 'Chờ QA', 'var(--warn)') +
      kpi('recent', recent.length, 'Chuyển xạ trong 7 ngày', 'var(--ktv)') + '</div>';

    html += group('queue', 'Chờ lập kế hoạch', queue, [
      { h: '#', v: function (p, i) { return '<span class="num">' + (i + 1) + '</span>'; } },
      C.pt, C.pr,
      { h: 'Contour xong', cls: 'nowrap', v: function (p) { return '<span class="num">' + fdw(p.ngay_contour_xong) + '</span><span class="sub">chờ ' + daysSince(p.ngay_contour_xong) + ' ngày</span>'; } },
      C.dx, C.rx, { h: 'Hạn', v: function (p) { return boostFlag(p) || '<span class="muted">—</span>'; } }, C.bs,
      { h: '', cls: 'act', v: function (p) { return can('claimPlan') ? btn('claimPlan', p.id, 'Nhận ca') + btn('planDone', p.id, 'Lập KH xong', 'primary') : ''; } }
    ], 'Thứ tự: Cấp cứu → Ưu tiên → boost sắp tới lượt xạ → ca contour xong trước làm trước.', 'Không có ca nào chờ lập kế hoạch.');
    html += group('doing', 'Đang lập kế hoạch', doing, [C.pt, C.pr,
      { h: 'Kỹ sư', cls: 'nowrap', v: function (p) { return esc(nameOf(p.ks_email)) + '<span class="sub">nhận ' + fd(p.ngay_nhan_kh) + ' · ' + daysSince(p.ngay_nhan_kh) + ' ngày</span>'; } },
      C.dx, C.rx, { h: 'Hạn', v: function (p) { return boostFlag(p) || '<span class="muted">—</span>'; } },
      { h: '', cls: 'act', v: function (p) { return can('planDone') ? btn('planDone', p.id, 'Lập KH xong', 'primary') : ''; } }
    ], null, 'Không có ca nào đang lập kế hoạch.');
    html += group('qa', 'Chờ QA', qa, [C.pt, C.pr,
      { h: 'KH xong', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_kh_xong) + '</span><span class="sub">' + esc(nameOf(p.ks_email)) + '</span>'; } },
      C.rx, { h: 'Ngày xạ dự kiến', cls: 'nowrap', v: function (p) { return p._g ? (boostFlag(p) || '<span class="muted">—</span>') : p.ngay_du_kien ? '<span class="num">' + fdw(p.ngay_du_kien) + '</span>' : '<span class="muted">—</span>'; } },
      { h: '', cls: 'act', v: function (p) { return can('qaResult') ? btn('qaPass', p.id, 'QA đạt', 'ok') + btn('qaFail', p.id, 'Không đạt', 'danger') : ''; } }
    ], null, 'Không có kế hoạch chờ QA.');
    var upcoming = items().filter(function (p) { return p.trang_thai === 'MO_PHONG' || p.trang_thai === 'CONTOUR'; })
      .sort(function (a, b) { return RT.STATUS_ORDER.indexOf(b.trang_thai) - RT.STATUS_ORDER.indexOf(a.trang_thai) || prRank(a) - prRank(b); });
    html += group('upcoming', 'Sắp tới: chờ mô phỏng / bác sĩ đang contour', upcoming, [C.pt, C.st, C.pr, C.dx, C.rx, C.bs,
      { h: '', cls: 'act', v: function (p) { return p.trang_thai === 'MO_PHONG' && can('simDone') ? btn('simDone', p.id, 'Đã mô phỏng xong') : ''; } }],
      'Để kỹ sư biết trước ca sắp tới. BN đã chụp CT mô phỏng mà chưa cập nhật thì bấm “Đã mô phỏng xong”.', 'Không có.');
    html += group('recent', 'Đã chuyển xạ trong 7 ngày qua', recent, [C.pt, C.rx,
      { h: 'KH xong', cls: 'nowrap', v: function (p) { return '<span class="num">' + fd(p.ngay_kh_xong) + '</span><span class="sub">' + esc(nameOf(p.ks_email)) + '</span>'; } },
      { h: 'QA', v: function (p) { return p.qa_ket_qua === 'Đạt' ? '<span class="flag ok">Đạt ' + fd(p.ngay_qa) + '</span>' : '<span class="muted">' + esc(p.qa_ket_qua) + '</span>'; } },
      C.st], null, 'Chưa có kế hoạch nào hoàn thành trong 7 ngày qua.');
    return html;
  }

  // ---------- KTV: xạ hôm nay ----------
  function renderToday() {
    var t = today();
    var machines = S.data.dm.MAY || [];
    var onM = function (p) { return !S.fMay || (p.may || machines[0]) === S.fMay; };
    var active = pts().filter(function (p) { return onM(p) && (p.trang_thai === 'DANG_XA' || (p.trang_thai === 'CHO_XA' && p.ngay_du_kien && p.ngay_du_kien <= t)); });
    var due = active.filter(function (p) { var c = course(p); return c.treatToday && !c.doneToday; })
      .sort(function (a, b) { return (a.trang_thai === 'CHO_XA' ? 0 : 1) - (b.trang_thai === 'CHO_XA' ? 0 : 1) || a.ho_ten.localeCompare(b.ho_ten, 'vi'); });
    var done = pts().filter(function (p) { return onM(p) && course(p).doneToday; });
    var off = active.filter(function (p) { var c = course(p); return !c.treatToday && !c.doneToday; });
    var paused = pts().filter(function (p) { return onM(p) && p.trang_thai === 'TAM_NGUNG'; });
    var noDate = pts().filter(function (p) { return p.trang_thai === 'CHO_XA' && !p.ngay_du_kien; }).length;
    var holiday = S.data.holidays.indexOf(t) >= 0;

    var html = dutyBanner() + '<div class="page-head"><div><h1>Xạ hôm nay · ' + fdw(t) + '/' + t.slice(0, 4) + '</h1><p>' +
      (holiday ? 'Hôm nay là ngày nghỉ lễ trong danh mục.' : RT.dow(t) === 6 ? 'Thứ Bảy: xạ bù cho BN IMRT/VMAT có ngày nghỉ trong tuần.' : RT.dow(t) === 0 ? 'Chủ nhật: không có lịch xạ.' : 'Bấm “Xác nhận đã xạ” ngay sau khi BN xạ xong.') + '</p></div>' +
      '<div class="filters">' + noticeBtn() + (machines.length > 1 ? '<select data-filter="fMay" aria-label="Lọc theo máy">' + opts(machines, S.fMay, 'Tất cả máy') + '</select>' : '') + '</div></div>';
    html += '<div class="kpis">' + kpi('due', due.length, 'Cần xạ hôm nay', 'var(--accent)') + kpi('done', done.length, 'Đã xạ hôm nay', 'var(--ktv)') +
      kpi('off', off.length, 'Không có lịch hôm nay', 'var(--line)') + kpi('paused', paused.length, 'Tạm ngừng', 'var(--crit)') + '</div>';
    if (noDate) html += '<div class="card"><div class="empty">Có <b>' + noDate + '</b> bệnh nhân chờ vào xạ chưa được xếp lịch. Vào tab <b>Xếp lịch</b> để chọn ngày bắt đầu.</div></div>';

    html += group('due', 'Cần xạ hôm nay', due, [C.pt,
      { h: 'Kỹ thuật', cls: 'nowrap', v: function (p) { var c = course(p); return esc(c.cur.ky_thuat) + (c.multi ? ' <span class="tag boost">' + c.cur.label + '</span>' : '') + '<span class="sub">' + c.dosePerFx + ' Gy/buổi</span>'; } },
      { h: 'Buổi', cls: 'nowrap', v: function (p) { var c = course(p); var first = c.done === 0 ? ' <span class="flag">Buổi đầu</span>' : (c.multi && c.done === c.cur.from ? ' <span class="flag">Buổi đầu ' + c.cur.label + '</span>' : ''); return '<b class="num">' + (c.done + 1) + '/' + c.total + '</b>' + first; } },
      { h: 'IGRT / SGRT', v: function (p) { return (p.igrt && p.igrt !== 'Không' ? esc(p.igrt) : '<span class="muted">Không IGRT</span>') + (p.sgrt === 'Có' ? '<span class="sub">Có SGRT</span>' : ''); } },
      C.week,
      { h: '', cls: 'act', v: function (p) { var c = course(p); if (c.blocked) return '<span class="flag crit">Chờ KH boost ' + esc(c.cur.label) + '</span>'; return can('logFraction') ? btn('logFx', p.id, '✓ Xác nhận đã xạ', 'ok big') : ''; } }
    ], null, holiday || RT.dow(t) === 0 ? 'Hôm nay không có lịch xạ.' : 'Đã xạ xong tất cả bệnh nhân có lịch hôm nay.');
    html += group('done', 'Đã xạ hôm nay', done, [C.pt,
      { h: 'Buổi', cls: 'nowrap', v: function (p) { var c = course(p); return '<span class="num">' + c.done + '/' + c.total + '</span>'; } },
      { h: 'Hình ảnh / định vị', v: function (p) { var f = course(p).fx.filter(function (x) { return x.ngay === t; }); return f.map(function (x) { return esc(x.hinh_anh || '—'); }).join('<br>'); } },
      { h: 'KTV ghi', cls: 'nowrap', v: function (p) { var f = course(p).fx.filter(function (x) { return x.ngay === t; }); return f.map(function (x) { return esc(nameOf(x.ktv_email)) + ' <span class="muted mono">' + String(x.thoi_gian).slice(11, 16) + '</span>'; }).join('<br>'); } },
      C.st,
      { h: '', cls: 'act', v: function (p) { var f = course(p).fx.filter(function (x) { return x.ngay === t; }); return can('undoFraction') && f.length ? btn('undoFx', f[f.length - 1].id, 'Huỷ buổi này', 'danger') : ''; } }
    ], null, 'Chưa ghi buổi xạ nào hôm nay.');
    html += group('off', 'Không có lịch hôm nay', off, [C.pt, C.rx, C.week, C.prog,
      { h: '', cls: 'act', v: function (p) { return can('logFraction') ? btn('logFx', p.id, 'Ghi buổi xạ bù') : ''; } }
    ], 'BN IMRT/VMAT vào ngày nghỉ trong tuần, hoặc BN có ngày bắt đầu sau hôm nay.', 'Không có.');
    html += group('paused', 'Đang tạm ngừng', paused, [C.pt, C.prog,
      { h: 'Từ ngày', cls: 'nowrap', v: function (p) { return '<span class="num">' + fdw(p.tam_ngung_tu) + '</span><span class="sub">' + daysSince(p.tam_ngung_tu) + ' ngày</span>'; } },
      { h: 'Lý do', v: function (p) { return esc(p.ly_do_tam_ngung); } },
      { h: '', cls: 'act', v: function (p) { return (can('resume') ? btn('resume', p.id, 'Tiếp tục xạ') : '') + (can('logFraction') ? btn('logFx', p.id, 'Ghi buổi xạ', 'primary') : ''); } }
    ], null, 'Không có bệnh nhân tạm ngừng.');
    return html;
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
    }).sort(function (a, b) { return a.ho_ten.localeCompare(b.ho_ten, 'vi'); });
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
        var editable = can('setDay') && d >= t && fxIdx < 0 && !holiday && !down && p.trang_thai !== 'TAM_NGUNG' && (c.done < c.total);
        if (d === t) cls += ' today';
        return editable ? '<td><button class="' + cls + '" data-wk="' + esc(p.id) + '" data-d="' + d + '" title="' + esc(title + ' · bấm để đổi xạ/nghỉ') + '">' + txt + '</button></td>'
          : '<td><span class="' + cls + '" title="' + esc(title) + '">' + txt + '</span></td>';
      }).join('');
      return '<tr><td class="wk-pt" data-open="' + esc(p.id) + '">' + ptCell(p) + '</td><td class="nowrap">' + esc(c.cur.ky_thuat) + (c.multi ? ' <span class="tag boost">' + c.cur.label + '</span>' : '') +
        '<span class="sub">' + (RT.needsOffDay(p) ? '<span style="color:var(--warn)">Chưa chọn ngày nghỉ</span>' : esc(RT.scheduleLabel(p))) + '</span></td>' +
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
    html += '<div class="legend"><span><i style="background:var(--ktv-soft)"></i>Đã xạ</span><span><i style="border:1px solid var(--accent-2);background:var(--accent-soft)"></i>Dự kiến xạ</span><span><i style="border:1px dashed var(--ks)"></i>Chờ KH boost</span><span><i style="background:var(--crit-soft)"></i>Vắng</span><span><i style="box-shadow:inset 0 0 0 2px var(--warn)"></i>Đổi riêng tuần này</span></div>';
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
    var noDate = pts().filter(function (p) { return p.trang_thai === 'CHO_XA' && !p.ngay_du_kien; });
    var dated = pts().filter(function (p) { return p.trang_thai === 'CHO_XA' && p.ngay_du_kien; }).sort(function (a, b) { return a.ngay_du_kien < b.ngay_du_kien ? -1 : 1; });
    var upcoming = pts().filter(function (p) { return ['CHO_KH', 'DANG_KH', 'CHO_QA'].indexOf(p.trang_thai) >= 0; }).sort(function (a, b) { return RT.STATUS_ORDER.indexOf(b.trang_thai) - RT.STATUS_ORDER.indexOf(a.trang_thai); });
    var tx = pts().filter(function (p) { return p.trang_thai === 'DANG_XA'; }).sort(function (a, b) { return (RT.needsOffDay(b) ? 1 : 0) - (RT.needsOffDay(a) ? 1 : 0) || a.ho_ten.localeCompare(b.ho_ten, 'vi'); });
    var schedAct = { h: '', cls: 'act', v: function (p) { return can('schedule') ? btn('schedule', p.id, p.trang_thai === 'DANG_XA' ? 'Đổi lịch' : 'Xếp lịch', p.ngay_du_kien || p.trang_thai === 'DANG_XA' ? '' : 'primary') : ''; } };

    // tải máy 6 ngày làm việc tới
    var days = [], d = t;
    for (var i = 0; days.length < 6 && i < 14; i++, d = RT.addDays(d, 1)) if (RT.dow(d) !== 0) days.push(d);
    var loadPts = pts().filter(function (p) { return ['CHO_XA', 'DANG_XA'].indexOf(p.trang_thai) >= 0; });
    var load = days.map(function (day) {
      var n = 0;
      loadPts.forEach(function (p) { var c = course(p); if (c.projected.indexOf(day) >= 0 || (day === t && c.doneToday)) n++; });
      return '<div class="' + (day === t ? 'today' : '') + '"><span class="d">' + fdw(day) + '</span><span class="v">' + n + '</span></div>';
    }).join('');

    var html = '<div class="page-head"><div><h1>Xếp lịch xạ</h1><p>3D-CRT: xạ T2–T6. IMRT/VMAT: chọn một ngày nghỉ trong tuần, xạ bù Thứ Bảy.</p></div></div>';
    html += '<section class="group"><div class="group-head"><h2>Số BN dự kiến xạ 6 ngày tới</h2><span class="hint">Dùng để cân đối ngày nghỉ của BN IMRT/VMAT</span></div><div class="load">' + load + '</div></section>';
    var sims = items().filter(function (x) { return x.trang_thai === 'MO_PHONG'; }).sort(function (a, b) { return (a.ngay_mo_phong || '9') < (b.ngay_mo_phong || '9') ? -1 : 1; });
    if (sims.length) html += group('sim', 'Chờ mô phỏng', sims, [C.pt, C.rx, { h: 'Loại', v: function (p) { return p._g ? '<span class="tag boost">Mô phỏng lại (boost)</span>' : 'Mô phỏng lần đầu'; } },
      { h: 'Hẹn mô phỏng', cls: 'nowrap', v: function (p) { return p.ngay_mo_phong ? '<span class="num">' + fdw(p.ngay_mo_phong) + '</span>' : '<span class="muted">Chưa hẹn</span>'; } },
      { h: 'Hạn', v: function (p) { return boostFlag(p) || '<span class="muted">—</span>'; } }, C.bs,
      { h: '', cls: 'act', v: function (p) { return can('simDone') ? btn('simDone', p.id, 'Đã mô phỏng xong', 'primary') : ''; } }], null, '');
    html += group('nodate', 'Chờ vào xạ, chưa có lịch', noDate, [C.pt, C.rx, C.week,
      { h: 'Sẵn sàng từ', cls: 'nowrap', v: function (p) { var s = p.ngay_qa || p.ngay_kh_xong; return '<span class="num">' + fd(s) + '</span><span class="sub">' + (p.qa_ket_qua === 'Đạt' ? 'QA đạt' : 'Không cần QA') + '</span>'; } },
      C.bs, schedAct], null, 'Tất cả BN chờ vào xạ đã có lịch.');
    html += group('dated', 'Chờ vào xạ, đã có lịch', dated, [C.pt, C.rx, C.expected, C.week, C.end, schedAct], null, 'Không có.');
    html += group('tx', 'Đang xạ', tx, [C.pt, C.rx, C.week, C.prog, C.end, schedAct], null, 'Không có bệnh nhân đang xạ.');
    html += group('up', 'Sắp chuyển xạ', upcoming, [C.pt, C.rx, C.st, C.expected, schedAct], 'BN đang lập KH hoặc chờ QA; có thể xếp trước ngày dự kiến.', 'Không có.');
    return html;
  }

  // ---------- Tất cả ----------
  function renderAll() {
    var q = fold(S.q);
    var list = pts().filter(function (p) {
      if (q && fold(p.ho_ten).indexOf(q) < 0 && fold(p.ma_his).indexOf(q) < 0 && fold(p.id).indexOf(q) < 0) return false;
      if (S.fStatus && p.trang_thai !== S.fStatus) return false;
      if (S.fBs && p.bs_email !== S.fBs) return false;
      if (S.fKhoa && p.khoa !== S.fKhoa) return false;
      return true;
    }).sort(function (a, b) { return RT.STATUS_ORDER.indexOf(a.trang_thai) - RT.STATUS_ORDER.indexOf(b.trang_thai) || a.ho_ten.localeCompare(b.ho_ten, 'vi'); });
    var bsList = doctors().map(function (u) { return { v: u.email, l: u.ho_ten }; });
    var html = '<div class="page-head"><div><h1>Tất cả bệnh nhân</h1><p>' + list.length + ' kết quả' + (S.q ? ' cho “' + esc(S.q) + '”' : '') + '. Gồm BN đang trong quy trình và BN kết thúc xạ trong 60 ngày qua.</p></div>' +
      '<div class="filters"><select data-filter="fStatus" aria-label="Lọc trạng thái">' + opts(RT.STATUS_ORDER.map(function (s) { return { v: s, l: RT.STATUS[s] }; }), S.fStatus, 'Mọi trạng thái') + '</select>' +
      '<select data-filter="fBs" aria-label="Lọc bác sĩ">' + opts(bsList, S.fBs, 'Mọi bác sĩ') + '</select>' +
      (S.data.dm.KHOA.length > 1 ? '<select data-filter="fKhoa" aria-label="Lọc khoa">' + opts(S.data.dm.KHOA, S.fKhoa, 'Mọi khoa') + '</select>' : '') + '</div></div>';
    html += table(list, [C.pt, C.dx, C.rx, C.bs, C.st,
      { h: 'Tiến độ / ngày dự kiến', cls: 'nowrap', v: function (p) {
        if (['DANG_XA', 'TAM_NGUNG', 'HOAN_THANH'].indexOf(p.trang_thai) >= 0) return progCell(p) + (p.ly_do_ket_thuc ? '<span class="ended">Kết thúc sớm</span>' : '');
        return p.ngay_du_kien ? 'Dự kiến xạ <span class="num">' + fdw(p.ngay_du_kien) + '</span>' : '<span class="muted">—</span>';
      } }], 'Không tìm thấy bệnh nhân phù hợp.');
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
  function bindAll() {
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
    b.onclick = function (e) { e.stopPropagation(); p.hidden = !p.hidden; if (!p.hidden && S.unread) { S.unread = 0; var n = $('.bell-n'); if (n) n.remove(); } };
    $$('[data-note]', p).forEach(function (x) { x.onclick = function () { p.hidden = true; if (x.dataset.note) openDetail(x.dataset.note); }; });
    document.addEventListener('click', function (e) { if (!p.hidden && !e.target.closest('.bell-wrap')) p.hidden = true; }, { once: true });
  }
  /** So sánh dữ liệu cũ và mới (do người khác cập nhật) để báo việc mới cho đúng người */
  function computeNotes(oldD, newD) {
    var meU = newD.me, mine = function (p) { return p.bs_email === meU.email; };
    var r = meU.vai_tro, out = [];
    var st = {}, gst = {};
    oldD.patients.forEach(function (p) { st[p.id] = p.trang_thai; });
    (oldD.phases || []).forEach(function (g) { gst[g.id] = g.trang_thai; });
    var name = function (p) { return p.ho_ten + ' (' + p.ma_his + ')'; };
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
    S.notes = list.concat(S.notes).slice(0, 50);
    S.unread += list.length;
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
    var sc = RT.statsScope(me());
    if (!S.stKey) S.stKey = 'month';
    var rg = statsRange(S.stKey);
    var r = S.stRes && S.stRes.tu === rg[0] && S.stRes.den === rg[1] ? S.stRes : null;
    var keys = [['today', 'Hôm nay'], ['week', 'Tuần này'], ['month', 'Tháng này'], ['prev', 'Tháng trước'], ['custom', 'Tuỳ chọn']];
    var html = '<div class="page-head"><div><h1>Thống kê</h1><p>Phạm vi: <b>' + esc(sc.label) + '</b>. ' +
      (sc.all ? 'Quản trị xem được số liệu gộp hai khoa.' : sc.khoa ? 'Số liệu theo người của cả khoa chỉ trưởng khoa, điều dưỡng trưởng và tài khoản khoa xem được.' : 'Bạn xem được số liệu của chính mình.') + '</p></div></div>';
    html += '<div class="card pad"><div class="filters"><div class="seg" role="group" aria-label="Khoảng thời gian">' +
      keys.map(function (k) { return '<button data-stkey="' + k[0] + '" aria-pressed="' + (S.stKey === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      (S.stKey === 'custom' ? '<label class="muted">Từ <input type="date" id="st-tu" value="' + rg[0] + '"></label><label class="muted">đến <input type="date" id="st-den" value="' + rg[1] + '" max="' + today() + '"></label>' : '') +
      '<button class="btn primary" data-stload="1">' + (r ? 'Tính lại' : 'Xem thống kê') + '</button>' +
      (r && !window.DEMO ? '<button class="btn" data-stexport="1">Tạo trang báo cáo (Excel)</button>' : '') + '</div>' +
      '<span class="muted">Từ ' + fdy(rg[0]) + ' đến ' + fdy(rg[1]) + '. Số liệu chỉ tính khi bấm, để ứng dụng luôn nhẹ.</span>' +
      (S.stSheet ? '<span>Đã tạo trang <b>' + esc(S.stSheet.name) + '</b> trong Google Sheet. Mở Sheet → trang đó → Tệp → Tải xuống → Microsoft Excel. <a href="' + esc(S.stSheet.url) + '" target="_blank" rel="noopener">Mở trang báo cáo</a></span>' : '') + '</div>';
    if (!r) return html + '<div class="card"><div class="empty">Chọn khoảng thời gian rồi bấm “Xem thống kê”.</div></div>';
    var o = r.tong_quan;
    var tile = function (n, l) { return '<div class="kpi" style="cursor:default"><span class="n">' + n + '</span><span class="l">' + l + '</span></div>'; };
    html += '<div class="kpis">' + tile(o.luot_xa, 'Lượt xạ') + tile(o.bn_xa, 'BN được xạ') + tile(o.bn_bat_dau, 'BN bắt đầu xạ') + tile(o.bn_ket_thuc, 'BN kết thúc xạ') +
      tile(o.bn_moi, 'BN mới nhập') + tile(o.cbct, 'Lần CBCT') + tile(o.sgrt, 'Lần SGRT') + '</div>';
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
    html += listTable(sc.byDoctor ? 'Theo bác sĩ' : 'Của tôi (bác sĩ)', r.theo_bac_si, [['Số BN xạ', 'bn_xa'], ['Số lượt xạ', 'luot_xa']]);
    html += listTable(sc.byKtv ? 'Theo KTV' : 'Của tôi (KTV)', r.theo_ktv, [['Số BN', 'bn_xa'], ['Số buổi đã ghi', 'luot_xa']]);
    html += listTable(sc.byKs ? 'Theo kỹ sư' : 'Của tôi (kỹ sư)', r.theo_ky_su, [['Số kế hoạch', 'ke_hoach'], ['Có QA', 'co_qa']]);
    return html;
  }
  function bindStats() {
    $$('#main [data-stkey]').forEach(function (b) { b.onclick = function () { S.stKey = b.dataset.stkey; S.stSheet = null; renderMain(); }; });
    var tu = $('#st-tu'), den = $('#st-den');
    if (tu) tu.onchange = function () { S.stTu = tu.value; };
    if (den) den.onchange = function () { S.stDen = den.value; };
    var go = function (action) {
      var rg = statsRange(S.stKey);
      setBusy(1);
      call(action, { tu: rg[0], den: rg[1] }).then(function (r) {
        S.stRes = r.report; if (r.sheet) { S.stSheet = r.sheet; toast('Đã tạo trang báo cáo trong Google Sheet.'); }
        renderMain();
      }, function (e) { toast(e.error || 'Không tính được thống kê.', true); }).finally(function () { setBusy(-1); });
    };
    $$('#main [data-stload]').forEach(function (b) { b.onclick = function () { S.stSheet = null; go('report'); }; });
    $$('#main [data-stexport]').forEach(function (b) { b.onclick = function () { go('exportReport'); }; });
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
    var days = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return RT.addDays(S.rweek, i); });
    var pos = S.data.dm.VI_TRI_PC || [];
    var edit = can('setRoster');
    var winA = RT.addDays(RT.monday(t), -7), winB = RT.addDays(RT.monday(t), 34);
    var outside = days[0] < winA || days[6] > winB;
    if (outside && S.rosterWeekLoaded !== S.rweek) {
      S.rosterWeekLoaded = S.rweek;
      setBusy(1);
      call('getRoster', { tu: days[0], den: days[6] }).then(function (r) { S.rosterExtra = (S.rosterExtra || []).concat(r.roster || []); renderMain(); }, function () {}).finally(function () { setBusy(-1); });
    }
    var html = '<div class="page-head"><div><h1>Phân công</h1><p>Tuần ' + fd(days[0]) + ' – ' + fd(days[6]) + '/' + days[6].slice(0, 4) +
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
          '<td>' + esc(u.chuc_vu || '') + '</td><td>' + esc(u.khoa || '') + '</td><td>' + (u.kich_hoat === 'Không' ? 'Đã khoá' : 'Hoạt động') + '</td><td class="act"><button class="btn" data-admin="editUser" data-email="' + esc(u.email) + '">Sửa</button></td></tr>';
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
      dmBox('VI_TRI_PC', 'Vị trí phân công KTV', 'Các dòng của bảng phân công.', 'VD: Máy gia tốc 2 – ca sáng') +
      dmBox('VI_TRI', 'Vị trí xạ (gợi ý khi nhập)', 'Bác sĩ vẫn gõ được vị trí khác.', 'VD: Hố yên') +
      dmBox('HINH_ANH', 'Hình ảnh / định vị mỗi buổi', 'KTV tích khi ghi buổi xạ.', 'VD: ExacTrac') +
      dmBox('IGRT', 'Phác đồ IGRT dự kiến', '', 'VD: CBCT 5 buổi đầu') +
      dmBox('LY_DO_TAM_NGUNG', 'Lý do tạm ngừng', '', 'VD: Hết thuốc hoá trị đồng thời') +
      dmBox('KHOA', 'Khoa', '', 'VD: Xạ trị') + '</div></section>';
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
        field('Chức vụ', '<select name="chuc_vu">' + opts(RT.CHUC_VU, u.chuc_vu || '', 'Không') + '</select>', '', 'Trưởng khoa, ĐD trưởng, tài khoản khoa: xem thống kê cả khoa. KTV trưởng: phân công, huỷ buổi xạ ghi nhầm.') +
        field('Khoa', '<select name="khoa">' + opts(S.data.dm.KHOA || [], u.khoa || '', '—') + '</select>', '', 'Bắt buộc với trưởng khoa, ĐD trưởng, tài khoản khoa') + '</div>',
      validate: function (v) { if (!v.ho_ten) return 'Cần nhập họ tên.'; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) return 'Email không hợp lệ.'; if (['Trưởng khoa', 'Điều dưỡng trưởng', 'Tài khoản khoa'].indexOf(v.chuc_vu) >= 0 && !v.khoa) return 'Chức vụ này cần chọn khoa.'; return ''; },
      onOk: function (v) { run('saveUser', v); } });
  }

  // ---------- Chi tiết ----------
  function openDetail(id) { S.detail = id; renderDetail(); }
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
      var cls = 'c', inner = '<span class="dd">' + fd(d) + '</span>', title = fdw(d);
      if (fxByDay[d]) {
        cls += ' done';
        inner += '<span><span class="fx">#' + fxByDay[d].map(function (x) { return x.n; }).join(',') + '</span> <span class="ic">' + fxByDay[d].map(function (x) { return abbr(x.f.hinh_anh); }).join('') + '</span></span>';
        title += ': đã xạ ' + fxByDay[d].map(function (x) { return 'buổi ' + x.n + (x.f.hinh_anh ? ' (' + x.f.hinh_anh + ')' : ''); }).join(', ');
      } else if (c.missed.indexOf(d) >= 0) { cls += ' miss'; inner += '<span>vắng</span>'; title += ': có lịch nhưng không xạ'; }
      else if (c.projected.indexOf(d) >= 0) { cls += c.projected.indexOf(d) >= c.tentativeFrom ? ' plan tent' : ' plan'; inner += '<span>#' + (c.done + c.projected.indexOf(d) + 1) + '</span>'; title += ': dự kiến buổi ' + (c.done + c.projected.indexOf(d) + 1); }
      else if (d < first || d > last) cls += ' blank off';
      else { cls += ' off'; title += ': không có lịch'; }
      if (d === today()) cls += ' today';
      h += '<div class="' + cls + '" title="' + esc(title) + '">' + inner + '</div>';
    }
    h += '</div><div class="legend"><span><i style="background:var(--ktv-soft)"></i>Đã xạ</span><span><i style="border:1px dashed var(--accent)"></i>Dự kiến</span><span><i style="background:var(--crit-soft)"></i>Vắng</span><span>C = CBCT · K = kV-kV · M = MV · S = SGRT</span></div>';
    return h;
  }

  /** Các đợt xạ khác cùng mã HIS (đang có + lưu trữ). null = đang tải từ lưu trữ. */
  S.hist = {};
  function histFor(p) {
    var key = p.ma_his;
    var live = pts().filter(function (x) { return x.ma_his === key && x.id !== p.id; });
    if (!(key in S.hist)) {
      S.hist[key] = null;
      call('searchArchive', { q: key }).then(function (r) {
        mergeArch(r.archive);
        S.hist[key] = r.archive.patients.filter(function (x) { return x.ma_his === key; }).map(function (x) { return x.id; });
        if (S.detail) renderDetail();
      }, function () { S.hist[key] = []; if (S.detail) renderDetail(); });
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
    var pct = c.total ? Math.round(c.done / c.total * 100) : 0;
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
    if (!ro) acts = acts + (can('createPatient') ? btn('newCourse', p.id, '+ Đợt xạ mới cho BN này') : '');
    var boosts = c.segs.filter(function (x) { return x.g; });
    var phaseSec = '';
    if (boosts.length || (!ro && can('addPhase') && p.trang_thai !== 'HOAN_THANH')) {
      phaseSec = '<div class="sec"><div class="group-head"><h3>Các giai đoạn xạ</h3>' + (!ro && can('addPhase') && p.trang_thai !== 'HOAN_THANH' ? '<button class="btn" data-do="addPhase" data-id="' + esc(p.id) + '">+ Thêm boost</button>' : '') + '</div>' +
        '<div class="tbl-wrap"><table><thead><tr><th>GĐ</th><th>Kỹ thuật · liều</th><th>Buổi</th><th>Kế hoạch</th><th></th></tr></thead><tbody>' +
        c.segs.map(function (sg) {
          var dn = Math.max(0, Math.min(c.done, sg.to) - sg.from);
          var g = sg.g, st = g ? g.trang_thai : '';
          var a = [];
          if (g && !ro) {
            var it = byId(g.id), B = function (k, l, cl) { a.push(btn(k, g.id, l, cl)); };
            if (st === 'MO_PHONG' && can('simDone')) B('simDone', 'Đã mô phỏng', 'primary');
            if (st === 'CONTOUR' && can('contourDone')) B('contourDone', 'Contour xong', 'primary');
            if (st === 'CHO_KH' && can('claimPlan')) B('claimPlan', 'Nhận ca');
            if ((st === 'CHO_KH' || st === 'DANG_KH') && can('planDone')) B('planDone', 'Lập KH xong', 'primary');
            if ((st === 'CHO_KH' || st === 'DANG_KH') && can('returnToDoctor')) B('returnToDoctor', 'Trả lại BS');
            if (st === 'CHO_QA' && can('qaResult')) { B('qaPass', 'QA đạt', 'ok'); B('qaFail', 'Không đạt', 'danger'); }
            if (can('updatePhase')) B('editPhase', 'Sửa');
            if (can('deletePhase') && c.done <= sg.from) B('deletePhase', 'Huỷ', 'danger');
          }
          var plan = g ? '<span class="pill st-' + st + '">' + esc(RT.STATUS[st]) + '</span>' + (g.ks_email ? '<span class="sub">' + esc(nameOf(g.ks_email)) + (g.qa_ket_qua ? ' · QA ' + esc(g.qa_ket_qua) : '') + '</span>' : '') +
            (g.di_cung === 'Có' ? '<span class="sub">Lập KH cùng GĐ1</span>' : '')
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
      '<div>' + stPill(p) + ' ' + prPill(p) + ' <span class="muted">· Mã HIS</span> <b class="mono">' + esc(p.ma_his) + '</b><button class="copy" id="copy-his">Sao chép</button>' +
      '<span class="muted"> · ' + [age(p), p.gioi, p.id].filter(Boolean).map(esc).join(' · ') + '</span></div></div>' +
      '<div class="drawer-body">' +
      (ro ? '<div class="sec" style="border-color:var(--blue)"><h3 style="color:var(--blue)">Hồ sơ lưu trữ</h3><p>Đợt xạ đã kết thúc và được chuyển sang lưu trữ. Chỉ xem, không sửa.</p></div>' : '') +
      (c.blocked && p.trang_thai !== 'HOAN_THANH' ? '<div class="sec" style="border-color:var(--crit)"><h3 style="color:var(--crit)">BN đang chờ kế hoạch boost</h3><p>Đã xạ xong các giai đoạn trước. Kế hoạch ' + esc(c.cur.label) + ' chưa sẵn sàng nên KTV chưa ghi được buổi xạ tiếp theo.</p></div>' :
        (!ro && c.leftBeforeBlock > 0 && c.leftBeforeBlock <= 5 && c.readyTo < c.total && ['DANG_XA', 'TAM_NGUNG'].indexOf(p.trang_thai) >= 0 ? '<div class="sec" style="border-color:var(--warn)"><h3 style="color:var(--warn)">Sắp tới boost</h3><p>Còn ' + c.leftBeforeBlock + ' buổi nữa là hết giai đoạn hiện tại, kế hoạch boost chưa sẵn sàng.</p></div>' : '')) +
      '<div class="sec"><h3>Chỉ định' + (c.multi ? ' · GĐ1' : '') + '</h3><div class="kv">' +
      kvi('Chẩn đoán', p.chan_doan) + kvi('Vị trí xạ', p.vi_tri || '—') + kvi('Mục đích', p.muc_dich || '—') + kvi('Bác sĩ điều trị', nameOf(p.bs_email)) + kvi('Khoa', p.khoa) +
      kvi('Kỹ thuật', p.ky_thuat) + kvi('Tổng liều', p.tong_lieu + ' Gy / ' + p.so_buoi + ' buổi') + kvi('Liều mỗi buổi', RT.dosePerFx(p) + ' Gy') +
      (p.muc_lieu ? kvi('Các mức liều (SIB)', p.muc_lieu) : '') +
      kvi('IGRT', p.igrt || 'Không') + kvi('SGRT', p.sgrt || 'Không') + kvi('Lịch tuần', RT.needsOffDay(p) ? 'Chưa chọn ngày nghỉ' : RT.scheduleLabel(p)) +
      kvi('Máy', p.may || '—') + kvi('Kỹ sư lập KH', p.ks_email ? nameOf(p.ks_email) : '—') + kvi('QA', p.qa_ket_qua || '—') +
      (c.multi ? kvi('Tổng cả đợt', c.doseTotal + ' Gy / ' + c.total + ' buổi') : '') +
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
    var cp = $('#copy-his');
    cp.onclick = function () {
      var ok = function () { toast('Đã sao chép mã HIS ' + p.ma_his); };
      try { navigator.clipboard.writeText(p.ma_his).then(ok, function () { selectText(cp.previousElementSibling); }); } catch (e) { selectText(cp.previousElementSibling); }
    };
  }
  function selectText(el) { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); toast('Đã chọn mã HIS, bấm Ctrl+C để sao chép.'); }
  function kvi(k, v) { return '<div><span>' + esc(k) + '</span><b>' + esc(v || '—') + '</b></div>'; }

  function detailActions(p) {
    if (p._arch) return '';
    var a = [], st = p.trang_thai, b = function (act, label, cls) { a.push(btn(act, p.id, label, cls)); };
    if (can('logFraction') && ['CHO_XA', 'DANG_XA', 'TAM_NGUNG'].indexOf(st) >= 0) b('logFx', '✓ Ghi buổi xạ', 'ok');
    if (can('simDone') && st === 'MO_PHONG') b('simDone', 'Đã mô phỏng xong', 'primary');
    if (can('contourDone') && st === 'CONTOUR') b('contourDone', 'Contour xong', 'primary');
    if (can('claimPlan') && st === 'CHO_KH') b('claimPlan', 'Nhận ca');
    if (can('planDone') && (st === 'CHO_KH' || st === 'DANG_KH')) b('planDone', 'Lập KH xong', 'primary');
    if (can('returnToDoctor') && (st === 'CHO_KH' || st === 'DANG_KH')) b('returnToDoctor', 'Trả lại BS');
    if (can('qaResult') && st === 'CHO_QA') { b('qaPass', 'QA đạt', 'ok'); b('qaFail', 'QA không đạt', 'danger'); }
    if (can('schedule') && st !== 'HOAN_THANH') b('schedule', 'Xếp lịch');
    if (can('setPriority') && ['CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA'].indexOf(st) >= 0) b('priority', 'Đổi ưu tiên');
    if (can('pause') && (st === 'CHO_XA' || st === 'DANG_XA')) b('pause', 'Tạm ngừng', 'danger');
    if (can('resume') && st === 'TAM_NGUNG') b('resume', 'Tiếp tục xạ');
    if (can('updatePatient')) b('edit', 'Sửa thông tin');
    if (can('endEarly') && ['CHO_XA', 'DANG_XA', 'TAM_NGUNG'].indexOf(st) >= 0) b('endEarly', 'Kết thúc sớm', 'danger');
    if (can('deletePatient') && (role() === 'ADMIN' || (p.bs_email === me().email && !course(p).done))) b('deletePatient', 'Huỷ hồ sơ', 'danger');
    return a.join('');
  }

  // ---------- thao tác ----------
  function doAction(action, id) {
    var p = byId(id);
    switch (action) {
      case 'logFx': return fractionForm(p);
      case 'undoFx': return undoForm(id);
      case 'contourDone': return contourForm(p);
      case 'claimPlan': return run('claimPlan', { id: id });
      case 'planDone': return planDoneForm(p);
      case 'returnToDoctor': return reasonForm('Trả lại bác sĩ chỉnh contour', p, 'Lý do trả lại', 'Trả lại', function (v) { run('returnToDoctor', { id: id, ly_do: v.ly_do }); });
      case 'qaPass': return modal({ title: 'QA đạt', body: whoBox(p) + field('Ghi chú (không bắt buộc)', '<input type="text" name="ghi_chu" placeholder="VD: Gamma 3%/2mm: 98,6%">'), ok: 'Xác nhận QA đạt', btnClass: 'ok', onOk: function (v) { run('qaResult', { id: id, dat: true, ghi_chu: v.ghi_chu }); } });
      case 'qaFail': return reasonForm('QA không đạt', p, 'Kết quả / lý do', 'Ghi QA không đạt', function (v) { run('qaResult', { id: id, dat: false, ghi_chu: v.ly_do }); }, 'BN sẽ quay lại bước “Đang lập KH”.');
      case 'schedule': return scheduleForm(p);
      case 'priority': return priorityForm(p);
      case 'pause': return pauseForm(p);
      case 'resume': return run('resume', { id: id });
      case 'edit': return patientForm(p);
      case 'newCourse': return patientForm(null, { ma_his: p.ma_his, ho_ten: p.ho_ten, nam_sinh: p.nam_sinh, gioi: p.gioi, khoa: p.khoa, bs_email: p.bs_email, uu_tien: 'Thường', igrt: 'Không', sgrt: 'Không', muc_dich: 'Giảm nhẹ / triệu chứng', _force: true });
      case 'addPhase': return phaseForm(p, null);
      case 'editPhase': return phaseForm(byId(p._pid), p._g);
      case 'deletePhase': return reasonForm('Huỷ giai đoạn boost', p, 'Lý do huỷ', 'Huỷ boost', function (v) { run('deletePhase', { id: id, ly_do: v.ly_do }); });
      case 'simDone': return modal({ title: 'Đã mô phỏng lại xong', body: whoBox(p) + '<p>Ghi nhận BN đã chụp CT mô phỏng lại hôm nay. Boost chuyển sang bước bác sĩ contour.</p>', ok: 'Xác nhận', onOk: function () { run('simDone', { id: id }); } });
      case 'endEarly': return reasonForm('Kết thúc đợt xạ sớm', p, 'Lý do kết thúc sớm', 'Kết thúc đợt xạ', function (v) { run('endEarly', { id: id, ly_do: v.ly_do }); }, 'Đã xạ ' + course(p).done + '/' + p.so_buoi + ' buổi. BN sẽ chuyển sang “Hoàn thành”.');
      case 'deletePatient': return reasonForm('Huỷ hồ sơ bệnh nhân', p, 'Lý do huỷ', 'Huỷ hồ sơ', function (v) { closeDetail(); run('deletePatient', { id: id, ly_do: v.ly_do }); }, 'Dùng khi nhập nhầm. Hồ sơ bị ẩn khỏi ứng dụng nhưng vẫn lưu trong Google Sheet.');
    }
  }
  function whoBox(p, extra) {
    return '<div class="who-box"><span class="nm">' + esc(p.ho_ten) + (p._g ? ' <span class="tag boost">Boost GĐ' + esc(p._g.stt) + '</span>' : '') + '</span><span><span class="muted">Mã HIS</span> <span class="his">' + esc(p.ma_his) + '</span>' +
      (age(p) ? ' · ' + age(p) : '') + (p.gioi ? ' · ' + esc(p.gioi) : '') + '</span><span class="muted">' + esc(p.chan_doan) + ' · ' + rx(p) + '</span>' + (extra || '') + '</div>';
  }
  function reasonForm(title, p, label, ok, onOk, help) {
    modal({ title: title, body: whoBox(p) + field(label + ' <span class="req">*</span>', '<textarea name="ly_do" required></textarea>', '', help), ok: ok,
      validate: function (v) { return v.ly_do ? '' : 'Cần ghi ' + label.toLowerCase() + '.'; }, onOk: onOk });
  }

  function fractionForm(p) {
    var c = course(p), t = today(), n = c.done + 1;
    var hasToday = c.doneToday;
    var preset = function (k) { return (/SGRT|C-RAD/i.test(k) && p.sgrt === 'Có'); };
    var min = RT.addDays(t, -7);
    modal({
      title: 'Xác nhận buổi xạ', ok: 'Ghi buổi xạ', btnClass: 'ok', noFocus: true,
      body: whoBox(p, '<span style="margin-top:6px"><b class="num" style="font-size:17px">Buổi ' + n + ' / ' + c.total + '</b> <span class="muted">· ' + c.dosePerFx + ' Gy' + (c.multi ? ' · ' + c.cur.label + ' ' + esc(c.cur.ky_thuat) : '') + ' · sau buổi này còn ' + (c.total - n) + ' buổi</span></span>') +
        (hasToday ? '<div class="confirm" style="background:var(--crit-soft);cursor:default">BN này đã có buổi xạ ghi nhận hôm nay. Kiểm tra lại trước khi ghi thêm.</div>' : '') +
        field('Ngày xạ', '<input type="date" name="ngay" value="' + t + '" min="' + min + '" max="' + t + '">', '', 'Mặc định hôm nay. Chỉ ghi bù trong vòng 7 ngày.') +
        '<div class="field"><span class="lb">IGRT / SGRT thực hiện trong buổi này' + (p.igrt && p.igrt !== 'Không' ? ' <span class="muted">(kế hoạch: ' + esc(p.igrt) + ')</span>' : '') + '</span><div class="checks">' +
        S.data.dm.HINH_ANH.map(function (k, i) { return '<label><input type="checkbox" name="hinh_anh" data-multi="1" value="' + esc(k) + '"' + (preset(k) ? ' checked' : '') + '><span>' + esc(k) + '</span></label>'; }).join('') + '</div></div>' +
        field('Ghi chú (không bắt buộc)', '<input type="text" name="ghi_chu" placeholder="VD: chỉnh tư thế 3 mm theo CBCT">') +
        '<label class="confirm"><input type="checkbox" name="xac_nhan" id="fx-confirm"><span>Tôi đã kiểm tra đúng bệnh nhân <span class="mono">' + esc(p.ma_his) + '</span> và xác nhận bệnh nhân đã được xạ xong buổi ' + n + '.</span></label>',
      onMount: function (form) {
        var ok = $('#mdl-ok'), cb = $('#fx-confirm', form);
        ok.disabled = true;
        cb.onchange = function () { ok.disabled = !cb.checked; };
      },
      validate: function (v) { return v.xac_nhan ? '' : 'Cần tích xác nhận đã xạ.'; },
      onOk: function (v) {
        var payload = { bn_id: p.id, ngay: v.ngay, hinh_anh: v.hinh_anh, ghi_chu: v.ghi_chu };
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
  function contourForm(p) {
    var d = S.data.dm, miss = p._g ? [] : RT.missingRx(p);
    var inp = function (name, type, attrs) { return '<input type="' + (type || 'text') + '" name="' + name + '" value="' + esc(p[name] || '') + '" ' + (attrs || '') + '>'; };
    var fill = miss.length ? '<div class="confirm" style="cursor:default;font-weight:500">BN chưa đủ phần chuyên môn (thiếu: <b>&nbsp;' + esc(miss.join(', ')) + '</b>). Nhập đủ rồi mới chuyển kỹ sư được.</div>' +
      '<div class="form">' +
      field('Chẩn đoán <span class="req">*</span>', inp('chan_doan', 'text', 'placeholder="VD: K phổi di căn não"'), 'full') +
      field('Vị trí xạ', inp('vi_tri', 'text', 'list="dl-vitri2" autocomplete="off"') + '<datalist id="dl-vitri2">' + (d.VI_TRI || RT.DEFAULT_DM.VI_TRI).map(function (x) { return '<option value="' + esc(x) + '"></option>'; }).join('') + '</datalist>') +
      field('Kỹ thuật <span class="req">*</span>', '<select name="ky_thuat">' + opts(d.KY_THUAT, p.ky_thuat, 'Chọn kỹ thuật') + '</select>') +
      field('Tổng liều (Gy) <span class="req">*</span>', inp('tong_lieu', 'number', 'step="0.01" min="0"')) +
      field('Số buổi <span class="req">*</span>', inp('so_buoi', 'number', 'step="1" min="1" max="60"')) +
      field('IGRT dự kiến', '<select name="igrt">' + opts(d.IGRT, p.igrt || 'Không') + '</select>') +
      field('SGRT', '<select name="sgrt">' + opts(['Không', 'Có'], p.sgrt || 'Không') + '</select>') + '</div>' : '';
    modal({ title: 'Contour xong, chuyển kỹ sư', ok: 'Chuyển kỹ sư', body: whoBox(p) + fill +
      '<div class="field"><span class="lb">Mức ưu tiên lập kế hoạch</span><div class="radios">' + [
        ['Cấp cứu', 'Chèn ép tủy, chảy máu, tắc nghẽn… Lập kế hoạch ngay.'],
        ['Ưu tiên', 'Cần sớm hơn thứ tự thông thường.'],
        ['Thường', 'Theo thứ tự contour xong trước làm trước.']
      ].map(function (x) { return '<label><input type="radio" name="uu_tien" value="' + x[0] + '"' + ((p.uu_tien || 'Thường') === x[0] ? ' checked' : '') + '><span><b>' + x[0] + '</b><small>' + x[1] + '</small></span></label>'; }).join('') + '</div></div>',
      validate: function (v) { if (!miss.length) return ''; var m = RT.missingRx(v); return m.length ? 'Cần nhập đủ: ' + m.join(', ') + '.' : ''; },
      onOk: function (v) { v.id = p.id; run('contourDone', v); } });
  }
  function priorityForm(p) {
    modal({ title: 'Đổi mức ưu tiên', ok: 'Lưu', body: whoBox(p) + '<div class="radios">' + ['Cấp cứu', 'Ưu tiên', 'Thường'].map(function (x) {
      return '<label><input type="radio" name="uu_tien" value="' + x + '"' + ((p.uu_tien || 'Thường') === x ? ' checked' : '') + '><span><b>' + x + '</b></span></label>'; }).join('') + '</div>',
      onOk: function (v) { run('setPriority', { id: p.id, uu_tien: v.uu_tien }); } });
  }
  function planDoneForm(p) {
    modal({ title: 'Lập kế hoạch xong', ok: 'Lưu', body: whoBox(p) + '<div class="field"><span class="lb">Bước tiếp theo</span><div class="radios">' +
      '<label><input type="radio" name="next" value="qa" checked><span><b>Cần QA trước khi xạ</b><small>BN chuyển sang “Chờ QA”. Ghi kết quả QA sau khi đo.</small></span></label>' +
      '<label><input type="radio" name="next" value="tx"><span><b>Không cần QA, chuyển xạ luôn</b><small>BN chuyển sang “Chờ vào xạ” để KTV xếp lịch.</small></span></label></div></div>',
      onOk: function (v) { run('planDone', { id: p.id, can_qa: v.next === 'qa' }); } });
  }
  function pauseForm(p) {
    modal({ title: 'Tạm ngừng xạ', ok: 'Ghi tạm ngừng', btnClass: 'danger', body: whoBox(p) +
      '<div class="form">' + field('Lý do <span class="req">*</span>', '<select name="ly_do">' + opts(S.data.dm.LY_DO_TAM_NGUNG, '', 'Chọn lý do') + '</select>') +
      field('Tạm ngừng từ ngày', '<input type="date" name="tu_ngay" value="' + today() + '">') +
      field('Ghi chú', '<input type="text" name="ghi_chu" placeholder="VD: viêm niêm mạc độ 3, hẹn khám lại T5">', 'full') + '</div>',
      validate: function (v) { return v.ly_do ? '' : 'Cần chọn lý do tạm ngừng.'; },
      onOk: function (v) { run('pause', { id: p.id, ly_do: v.ly_do, tu_ngay: v.tu_ngay, ghi_chu: v.ghi_chu }); } });
  }
  function scheduleForm(p) {
    var started = course(p).done > 0, off = RT.offDay(p);
    var imrt = /IMRT|VMAT/i.test(p.ky_thuat);
    modal({ title: 'Xếp lịch xạ', ok: 'Lưu lịch',
      body: whoBox(p) + '<div class="form">' +
        (started ? '<div class="field"><span class="lb">Bắt đầu xạ</span><b>' + fdw(course(p).start) + '</b></div>' :
          field('Ngày bắt đầu dự kiến', '<input type="date" name="ngay_du_kien" value="' + esc(p.ngay_du_kien) + '" min="' + today() + '">')) +
        field('Máy', '<select name="may">' + opts(S.data.dm.MAY, p.may || S.data.dm.MAY[0]) + '</select>') + '</div>' +
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
          tmp.ngay_nghi_tuan = v.kieu === 't27' ? v.ngay_nghi_tuan : '';
          if (!started) { tmp.ngay_du_kien = v.ngay_du_kien; tmp.ngay_bat_dau = ''; }
          var c = RT.course(tmp, S.data.fractions, env());
          var el = $('#sched-prev', form);
          if (v.kieu === 't27' && !v.ngay_nghi_tuan) el.innerHTML = 'Chọn ngày nghỉ trong tuần.';
          else if (!c.start) el.innerHTML = 'Chọn ngày bắt đầu để xem ngày kết thúc dự kiến.';
          else if (!RT.isTreatDay(tmp, c.start, env()) && !started) el.innerHTML = '<b style="color:var(--warn)">' + fdw(c.start) + ' không nằm trong lịch xạ đã chọn.</b> Buổi đầu sẽ là ' + fdw(c.projected[0]) + '.';
          else el.innerHTML = (started ? 'Còn ' + c.projected.length + ' buổi. ' : 'Bắt đầu <b>' + fdw(c.start) + '</b>. ') + 'Dự kiến kết thúc <b>' + fdw(c.end) + '/' + String(c.end).slice(0, 4) + '</b> · ' + c.total + ' buổi.';
        };
        $$('input,select', form).forEach(function (el) { el.addEventListener('change', upd); el.addEventListener('input', upd); });
        upd();
      },
      validate: function (v) { if (!started && !v.ngay_du_kien) return 'Chọn ngày bắt đầu dự kiến.'; if (v.kieu === 't27' && !v.ngay_nghi_tuan) return 'Chọn ngày nghỉ trong tuần.'; return ''; },
      onOk: function (v) {
        var payload = { id: p.id, may: v.may, ngay_nghi_tuan: v.kieu === 't27' ? v.ngay_nghi_tuan : '' };
        if (!started) payload.ngay_du_kien = v.ngay_du_kien;
        run('schedule', payload);
      } });
  }
  function patientForm(p, prefill) {
    var isNew = !p, d = S.data.dm, v0 = p || prefill || { bs_email: isDoctor(me()) ? me().email : '', khoa: d.KHOA[0], uu_tien: 'Thường', igrt: 'Không', sgrt: 'Không' };
    var mucDich = d.MUC_DICH || RT.DEFAULT_DM.MUC_DICH;
    var bsList = doctors().map(function (u) { return { v: u.email, l: u.ho_ten }; });
    var inp = function (name, type, attrs) { return '<input type="' + (type || 'text') + '" name="' + name + '" value="' + esc(v0[name] || '') + '" ' + (attrs || '') + '>'; };
    modal({
      title: prefill ? 'Đợt xạ mới · ' + prefill.ho_ten : isNew ? 'Thêm bệnh nhân' : 'Sửa thông tin bệnh nhân', ok: prefill ? 'Tạo đợt xạ mới' : isNew ? 'Thêm bệnh nhân' : 'Lưu thay đổi',
      body: (isNew && !isDoctor(me()) ? '<div class="confirm" style="cursor:default;font-weight:500">Nhập theo <b>&nbsp;phiếu chỉ định của bác sĩ</b>. Chọn đúng bác sĩ điều trị; bác sĩ sẽ thấy BN trong danh sách của mình và sửa được nếu cần.</div>' : '') +
        '<div class="form">' +
        field('Mã BN trên HIS <span class="req">*</span>', inp('ma_his', 'text', 'inputmode="numeric" autocomplete="off"'), '', 'Dùng để tra cứu, khớp với HIS') +
        field('Họ và tên <span class="req">*</span>', inp('ho_ten')) +
        field('Năm sinh hoặc tuổi <span class="req">*</span>', inp('nam_sinh', 'number', 'min="0" max="2100" placeholder="VD: 1965 hoặc 61"')) +
        field('Giới', '<select name="gioi">' + opts(['Nam', 'Nữ'], v0.gioi, '—') + '</select>') +
        '<div class="full sec-lb">Phần chuyên môn <span class="muted">· có thể để trống khi BN đang chờ mô phỏng / đang contour; bác sĩ bổ sung lúc contour xong</span></div>' +
        field('Chẩn đoán <span class="req rx-req">*</span>', inp('chan_doan', 'text', 'placeholder="VD: K phổi di căn não, xương"'), 'full') +
        field('Vị trí xạ', inp('vi_tri', 'text', 'list="dl-vitri" autocomplete="off" placeholder="Chọn hoặc gõ, VD: Cột sống L2–L4"') + '<datalist id="dl-vitri">' + (d.VI_TRI || RT.DEFAULT_DM.VI_TRI).map(function (x) { return '<option value="' + esc(x) + '"></option>'; }).join('') + '</datalist>', '', 'Bấm vào ô để chọn, hoặc gõ vị trí khác') +
        field('Mục đích', '<select name="muc_dich">' + opts(mucDich, v0.muc_dich, '—') + '</select>') +
        field('Khoa', '<select name="khoa">' + opts(d.KHOA, v0.khoa) + '</select>') +
        field('Bác sĩ điều trị <span class="req">*</span>', '<select name="bs_email">' + opts(bsList, v0.bs_email, 'Chọn bác sĩ') + '</select>') +
        field('Kỹ thuật <span class="req rx-req">*</span>', '<select name="ky_thuat">' + opts(d.KY_THUAT, v0.ky_thuat, 'Chọn kỹ thuật') + '</select>') +
        field('Ưu tiên', '<select name="uu_tien">' + opts(d.UU_TIEN, v0.uu_tien) + '</select>') +
        field('Tổng liều (Gy) <span class="req rx-req">*</span>', inp('tong_lieu', 'number', 'step="0.01" min="0"')) +
        field('Số buổi <span class="req rx-req">*</span>', inp('so_buoi', 'number', 'step="1" min="1" max="60"'), '', '<span id="dpf"></span>') +
        field('IGRT dự kiến', '<select name="igrt">' + opts(d.IGRT, v0.igrt) + '</select>') +
        field('SGRT', '<select name="sgrt">' + opts(['Không', 'Có'], v0.sgrt) + '</select>') +
        field('Các mức liều (SIB, nếu có)', inp('muc_lieu', 'text', 'placeholder="VD: 70 / 60 / 54 Gy"'), 'full') +
        field('Ghi chú', '<textarea name="ghi_chu">' + esc(v0.ghi_chu || '') + '</textarea>', 'full') +
        (isNew ? '<label class="confirm full" style="background:var(--ks-soft);font-weight:600"><input type="checkbox" name="co_boost" id="co-boost"><span>Có boost tuần tự (giai đoạn 2)</span></label>' +
          '<div class="field" data-boost><label>Kỹ thuật boost</label><select name="b_ky_thuat">' + opts(d.KY_THUAT, '', 'Chọn') + '</select></div>' +
          '<div class="field" data-boost><label>Liều boost (Gy) / số buổi</label><div style="display:flex;gap:6px"><input type="number" step="0.01" name="b_tong_lieu" placeholder="Gy" aria-label="Liều boost"><input type="number" step="1" name="b_so_buoi" placeholder="buổi" aria-label="Số buổi boost"></div></div>' +
          '<div class="field full" data-boost><span class="lb">Kế hoạch boost</span><div class="radios">' + BOOST_KINDS.map(function (k, i) { return '<label><input type="radio" name="b_buoc" value="' + k[0] + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + k[1] + '</b><small>' + k[2] + '</small></span></label>'; }).join('') + '</div></div>' : '') +
        (isNew ? '<div class="field full"><span class="lb">Bước hiện tại của bệnh nhân <span class="req">*</span></span><div class="radios">' +
          '<label><input type="radio" name="trang_thai" value="MO_PHONG"><span><b>Chưa mô phỏng</b><small>Đã có chỉ định xạ, chưa chụp CT mô phỏng</small></span></label>' +
          '<label><input type="radio" name="trang_thai" value="CONTOUR"><span><b>Đã mô phỏng, đang contour</b><small>Đã chụp CT mô phỏng, bác sĩ đang vẽ thể tích</small></span></label>' +
          '<label><input type="radio" name="trang_thai" value="CHO_KH"><span><b>Đã contour xong</b><small>Chuyển ngay vào hàng đợi lập kế hoạch của kỹ sư</small></span></label>' +
          '<label><input type="radio" name="trang_thai" value="CHO_XA"><span><b>Đã có kế hoạch, chờ vào xạ</b><small>Dùng khi bắt đầu dùng ứng dụng với BN đã lập KH xong</small></span></label>' +
          '<label><input type="radio" name="trang_thai" value="DANG_XA"><span><b>Đang xạ dở</b><small>BN đã xạ một số buổi trước khi dùng ứng dụng</small></span></label></div></div>' +
          '<div class="field" data-for="MO_PHONG"><label>Hẹn mô phỏng (nếu có)</label><input type="date" name="ngay_mo_phong"></div>' +
          '<div class="field" data-for="CHO_XA">' + '<label>Ngày xạ dự kiến</label><input type="date" name="ngay_du_kien"></div>' +
          '<div class="field" data-for="DANG_XA"><label>Ngày bắt đầu xạ <span class="req">*</span></label><input type="date" name="ngay_bat_dau" max="' + today() + '"></div>' +
          '<div class="field" data-for="DANG_XA"><label>Số buổi đã xạ <span class="req">*</span></label><input type="number" name="da_xa" min="1" step="1"><span class="help">Tính cả buổi hôm nay nếu đã xạ</span></div>' +
          '<div class="field" data-for="CHO_XA DANG_XA"><label>Lịch trong tuần</label><select name="ngay_nghi_tuan">' + opts([{ v: '', l: 'Thứ 2 → Thứ 6' }].concat([1, 2, 3, 4, 5].map(function (i) { return { v: i, l: 'Thứ 2 → Thứ 7, nghỉ ' + RT.DOW[i] }; })), '') + '</select></div>' : '') +
        '</div>',
      onMount: function (form) {
        var upd = function () { var v = formValues(form), n = RT.num(v.so_buoi), t = RT.num(v.tong_lieu); $('#dpf', form).textContent = n && t ? '= ' + (Math.round(t / n * 100) / 100) + ' Gy/buổi' : ''; };
        $$('input', form).forEach(function (el) { el.addEventListener('input', upd); }); upd();
        var step = function () {
          var st = (formValues(form).trang_thai) || '';
          var early = isNew ? (st === 'MO_PHONG' || st === 'CONTOUR') : ['MO_PHONG', 'CONTOUR'].indexOf(p.trang_thai) >= 0;
          $$('.rx-req', form).forEach(function (el) { el.hidden = early; });
          $$('[data-for]', form).forEach(function (el) { el.hidden = !isNew || el.dataset.for.split(' ').indexOf(st) < 0; });
        };
        $$('input[name=trang_thai]', form).forEach(function (el) { el.addEventListener('change', step); }); step();
        var cb = $('#co-boost', form);
        var bt = function () { $$('[data-boost]', form).forEach(function (el) { el.hidden = !cb || !cb.checked; }); };
        if (cb) cb.addEventListener('change', bt); bt();
      },
      validate: function (v) {
        if (!v.ma_his) return 'Cần nhập mã BN trên HIS.';
        if (!v.ho_ten) return 'Cần nhập họ tên.';
        if (!v.nam_sinh) return 'Cần nhập năm sinh hoặc tuổi.';
        if (!v.bs_email) return 'Cần chọn bác sĩ điều trị.';
        if (isNew && !v.trang_thai) return 'Cần chọn bước hiện tại của bệnh nhân (chưa mô phỏng, đang contour…).';
        var early = isNew ? (!v.trang_thai || v.trang_thai === 'MO_PHONG' || v.trang_thai === 'CONTOUR') && !v.co_boost : ['MO_PHONG', 'CONTOUR'].indexOf(p.trang_thai) >= 0;
        if (!early) {
          var miss = RT.missingRx(v);
          if (miss.length) return 'Ở bước này cần nhập đủ phần chuyên môn: ' + miss.join(', ') + '.';
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
        if (!isNew) { v.id = p.id; return run('updatePatient', v); }
        if (v.co_boost) v.boost = { ky_thuat: v.b_ky_thuat, tong_lieu: v.b_tong_lieu, so_buoi: v.b_so_buoi, buoc: v.b_buoc };
        ['co_boost', 'b_ky_thuat', 'b_tong_lieu', 'b_so_buoi', 'b_buoc'].forEach(function (k) { v[k] = undefined; });
        if (prefill && prefill._force) v.force = true;
        run('createPatient', v, function (e) {
          if (String(e.error).indexOf('DUP_HIS:') === 0) {
            modal({ title: 'Mã HIS đã có đợt xạ đang hoạt động', body: '<p>Mã HIS <b class="mono">' + esc(v.ma_his) + '</b> đang có đợt xạ: <b>' + esc(e.error.slice(8)) + '</b>.</p><p>Chỉ tạo thêm nếu đây là một đợt xạ mới của cùng bệnh nhân (VD: xạ vị trí khác).</p>',
              ok: 'Vẫn tạo đợt mới', btnClass: 'danger', onOk: function () { v.force = true; run('createPatient', v); } });
            return true;
          }
        });
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
    var isNew = !g, d = S.data.dm, v0 = g || { uu_tien: p.uu_tien || 'Thường' };
    var inp = function (name, type, attrs) { return '<input type="' + (type || 'text') + '" name="' + name + '" value="' + esc(v0[name] || '') + '" ' + (attrs || '') + '>'; };
    modal({ title: isNew ? 'Thêm boost (GĐ' + (course(p).segs.length + 1) + ')' : 'Sửa boost GĐ' + g.stt, ok: isNew ? 'Thêm boost' : 'Lưu',
      body: whoBox(p) + '<div class="form">' +
        field('Kỹ thuật <span class="req">*</span>', '<select name="ky_thuat">' + opts(d.KY_THUAT, v0.ky_thuat, 'Chọn') + '</select>') +
        field('Ưu tiên lập KH', '<select name="uu_tien">' + opts(d.UU_TIEN, v0.uu_tien) + '</select>') +
        field('Tổng liều boost (Gy) <span class="req">*</span>', inp('tong_lieu', 'number', 'step="0.01" min="0"')) +
        field('Số buổi <span class="req">*</span>', inp('so_buoi', 'number', 'step="1" min="1" max="60"')) +
        field('Các mức liều (nếu SIB)', inp('muc_lieu'), 'full') +
        (isNew ? '<div class="field full"><span class="lb">Kế hoạch boost</span><div class="radios">' + BOOST_KINDS.map(function (k, i) {
          var dis = k[0] === 'CUNG_LUC' && ['CONTOUR', 'CHO_KH', 'DANG_KH', 'CHO_QA'].indexOf(p.trang_thai) < 0;
          return '<label' + (dis ? ' style="opacity:.5"' : '') + '><input type="radio" name="buoc" value="' + k[0] + '"' + ((dis ? i === 1 : i === 0) ? ' checked' : '') + (dis ? ' disabled' : '') + '><span><b>' + k[1] + '</b><small>' + k[2] + '</small></span></label>';
        }).join('') + '</div></div>' + '<div class="field" data-sim><label>Hẹn mô phỏng lại</label><input type="date" name="ngay_mo_phong" min="' + today() + '"></div>' : '') +
        field('Ghi chú', '<textarea name="ghi_chu">' + esc(v0.ghi_chu || '') + '</textarea>', 'full') + '</div>',
      onMount: function (form) {
        var upd = function () { var v = formValues(form); $$('[data-sim]', form).forEach(function (el) { el.hidden = v.buoc !== 'MO_PHONG'; }); };
        $$('input[name=buoc]', form).forEach(function (el) { el.addEventListener('change', upd); }); upd();
      },
      validate: function (v) {
        if (!v.ky_thuat) return 'Chọn kỹ thuật.';
        if (!(RT.num(v.tong_lieu) > 0) || !(RT.num(v.so_buoi) >= 1)) return 'Nhập liều và số buổi boost.';
        return '';
      },
      onOk: function (v) {
        if (isNew) { v.bn_id = p.id; run('addPhase', v); }
        else { v.id = g.id; v.buoc = undefined; run('updatePhase', v); }
      } });
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
