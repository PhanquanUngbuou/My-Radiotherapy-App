#!/usr/bin/env python3
"""Ghép mã nguồn trong src/ thành:
  apps-script/Core.gs, Code.gs, Index.html  -> dán vào Google Apps Script
  demo/index.html                           -> bản demo dữ liệu giả
"""
import pathlib, shutil

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
read = lambda n: (SRC / n).read_text(encoding="utf-8").replace("__VERSION__", VERSION)
STAMP = "// Điều phối Xạ trị · phiên bản v" + VERSION + "\n"

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">')
SHELL = ('<div id="busy" class="busy" hidden></div>\n{demo}<header class="top" id="top"></header>\n'
         '<main id="main"><div class="loading">Đang tải dữ liệu…</div></main>\n'
         '<div id="drawer" hidden></div>\n<div id="modal" hidden></div>\n<div id="toast" class="toast" hidden role="status" aria-live="polite"></div>')
DEMO_BAR = ('<div class="demo-bar"><div class="demo-in"><b>BẢN DEMO</b><span>Dữ liệu giả, chỉ lưu tạm trong trình duyệt và mất khi tải lại trang. '
            'Đổi người dùng ở góc phải để xem giao diện của từng vai trò.</span><span id="demo-date"></span></div></div>\n')

def gas():
    out = ROOT / "apps-script"
    out.mkdir(exist_ok=True)
    (out / "Core.gs").write_text(STAMP + read("core.js") + "\n" + read("icd10.js"), encoding="utf-8")
    (out / "Code.gs").write_text(STAMP + read("Code.gs"), encoding="utf-8")
    shutil.copy(SRC / "appsscript.json", out / "appsscript.json")
    html = ('<!DOCTYPE html>\n<!-- Điều phối Xạ trị · phiên bản v' + VERSION + ' -->\n<html lang="vi">\n<head>\n<base target="_top">\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Điều phối Xạ trị</title>\n'
            + FONTS + '\n<style>\n' + read("styles.css") + '\n</style>\n</head>\n<body>\n' + SHELL.format(demo="") +
            '\n<script>\n' + read("icd10.js") + '\n</script>\n<script>\n' + read("core.js") + '\n</script>\n<script>\n' + read("xlsx.js") + '\n</script>\n<script>\n' + read("app.js") + '\n</script>\n</body>\n</html>\n')
    (out / "Index.html").write_text(html, encoding="utf-8")

def demo():
    out = ROOT / "demo"
    out.mkdir(exist_ok=True)
    date_js = ("<script>(function(){var el=document.getElementById('demo-date');if(window.DEMO&&DEMO.shifted&&el)"
               "el.textContent='Hôm nay là Chủ nhật nên bản demo giả lập ngày Thứ Hai '+DEMO.today.split('-').reverse().join('/')+'.';})();</script>")
    html = ('<title>Điều phối Xạ trị</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + FONTS +
            '\n<style>\n' + read("styles.css") + '\n</style>\n' + SHELL.format(demo=DEMO_BAR) +
            '\n<script>\n' + read("icd10.js") + '\n</script>\n<script>\n' + read("core.js") + '\n</script>\n<script>\n' + read("demo.js") + '\n</script>\n' + date_js +
            '\n<script>\n' + read("xlsx.js") + '\n</script>\n<script>\n' + read("app.js") + '\n</script>\n')
    (out / "index.html").write_text(html, encoding="utf-8")

if __name__ == "__main__":
    gas(); demo(); print("OK")
