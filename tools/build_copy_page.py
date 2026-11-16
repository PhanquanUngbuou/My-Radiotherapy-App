#!/usr/bin/env python3
"""Tạo trang "Mã nguồn Apps Script" (copy-code/index.html): 3 khung chứa nội dung file kèm nút Sao chép."""
import html, pathlib, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = ROOT / 'apps-script'
rev = subprocess.run(['git', '-C', str(ROOT), 'log', '-1', '--format=%h · %cd', '--date=format:%d/%m/%Y %H:%M'],
                     capture_output=True, text=True).stdout.strip()
files = [
    ('Code', 'Code.gs', 'File có sẵn tên Code.gs: xoá hết nội dung cũ, dán vào.'),
    ('Core', 'Core.gs', 'Bấm + → Script (Tập lệnh), đặt tên Core.'),
    ('Index', 'Index.html', 'Bấm + → HTML, đặt tên Index (chữ I hoa).'),
]
cards = []
for i, (name, fn, hint) in enumerate(files):
    text = (src / fn).read_text(encoding='utf-8')
    kb = round(len(text.encode('utf-8')) / 1024)
    lines = text.count('\n') + 1
    cards.append(f'''
  <section class="card" aria-labelledby="h-{name}">
    <div class="head">
      <div class="meta">
        <h2 id="h-{name}">{fn}</h2>
        <p>{html.escape(hint)}</p>
        <span class="size">{lines:,} dòng · {kb} KB</span>
      </div>
      <button class="copy" type="button" data-target="t-{name}" id="b-{name}">Sao chép {fn}</button>
    </div>
    <textarea id="t-{name}" readonly spellcheck="false" aria-label="Nội dung {fn}">{html.escape(text)}</textarea>
  </section>''')

page = f'''<title>Mã nguồn Apps Script</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap">
<style>
/* Trang công cụ một cột: mỗi file một thẻ, nút sao chép lớn ở góc phải */
:root {{
  --bg:#f3f7fb; --surface:#ffffff; --ink:#2b3440; --muted:#6b7785; --line:#dfe6ed;
  --accent:#138a6c; --accent-ink:#ffffff; --accent-soft:#e3f4ee; --code-bg:#f7fafc;
  --f-ui:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --f-code:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg:#0f1820; --surface:#16222c; --ink:#e3ebf1; --muted:#97a6b3; --line:#2a3a47;
  --accent:#4fc3a1; --accent-ink:#06271f; --accent-soft:#16372e; --code-bg:#121c24; color-scheme:dark }} }}
:root[data-theme="dark"] {{
  --bg:#0f1820; --surface:#16222c; --ink:#e3ebf1; --muted:#97a6b3; --line:#2a3a47;
  --accent:#4fc3a1; --accent-ink:#06271f; --accent-soft:#16372e; --code-bg:#121c24; color-scheme:dark }}
* {{ box-sizing:border-box }}
body {{ background:var(--bg); color:var(--ink); font-family:var(--f-ui); font-size:15px; line-height:1.55;
  padding-left:max(16px,env(safe-area-inset-left,0px)); padding-right:max(16px,env(safe-area-inset-right,0px)); padding-block:24px 48px }}
.wrap {{ max-width:980px; margin:0 auto; display:grid; gap:16px }}
h1 {{ font-size:24px; margin:0; letter-spacing:-.015em; text-wrap:balance }}
.intro p {{ margin:4px 0 0; color:var(--muted); max-width:70ch }}
.rev {{ font-size:12.5px; color:var(--muted) }}
.card {{ background:var(--surface); border-radius:12px; box-shadow:0 0 10px rgba(16,40,60,.08); padding:16px; display:grid; gap:12px; min-width:0 }}
.head {{ display:flex; gap:12px; justify-content:space-between; align-items:flex-start; flex-wrap:wrap }}
.meta {{ min-width:0 }}
.meta h2 {{ margin:0; font-size:18px; font-family:var(--f-code); font-weight:400; color:var(--accent) }}
.meta p {{ margin:2px 0 0; color:var(--muted); font-size:14px }}
.size {{ font-size:12.5px; color:var(--muted); font-variant-numeric:tabular-nums }}
.copy {{ border:0; background:var(--accent); color:var(--accent-ink); font:inherit; font-weight:600; padding:10px 20px; border-radius:25px; cursor:pointer; white-space:nowrap }}
.copy:hover {{ filter:brightness(1.07) }}
.copy:focus-visible, textarea:focus-visible {{ outline:2px solid var(--accent); outline-offset:2px }}
.copy.done {{ background:var(--accent-soft); color:var(--accent) }}
textarea {{ width:100%; height:180px; resize:vertical; font-family:var(--f-code); font-size:12px; line-height:1.5; color:var(--ink);
  background:var(--code-bg); border:1px solid var(--line); border-radius:8px; padding:10px 12px; white-space:pre; overflow:auto }}
.tip {{ font-size:13.5px; color:var(--muted) }}
</style>
<div class="wrap">
  <div class="intro">
    <h1>Mã nguồn Apps Script · Điều phối Xạ trị</h1>
    <p>Bấm nút <b>Sao chép</b> của từng file, rồi dán (Ctrl+V) vào đúng file cùng tên trong Apps Script. Làm lần lượt cả 3 file, bấm Ctrl+S để lưu, chạy hàm setup, rồi triển khai phiên bản mới.</p>
    <span class="rev">Phiên bản: {html.escape(rev)}</span>
  </div>
  {''.join(cards)}
  <p class="tip">Nếu nút Sao chép không chạy: bấm vào khung chữ, nhấn Ctrl+A rồi Ctrl+C (trên Mac: Cmd+A, Cmd+C).</p>
</div>
<script>
document.querySelectorAll('.copy').forEach(function (b) {{
  var label = b.textContent;
  b.addEventListener('click', function () {{
    var t = document.getElementById(b.dataset.target);
    var done = function (msg) {{ b.textContent = msg; b.classList.add('done'); setTimeout(function () {{ b.textContent = label; b.classList.remove('done'); }}, 2500); }};
    var fallback = function () {{ t.focus(); t.select(); done('Đã chọn hết, nhấn Ctrl+C'); }};
    try {{ navigator.clipboard.writeText(t.value).then(function () {{ done('✓ Đã sao chép'); }}, fallback); }} catch (e) {{ fallback(); }}
  }});
}});
</script>
'''
out = ROOT / 'copy-code'
out.mkdir(exist_ok=True)
(out / 'index.html').write_text(page, encoding='utf-8')
print(out / 'index.html')
