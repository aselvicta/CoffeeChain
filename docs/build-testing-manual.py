#!/usr/bin/env python3
"""Build CoffeeChain Testing Manual HTML with exact logo (print-ready PDF source)."""
import base64
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
MD = ROOT / "TESTING_MANUAL.md"
OUT = ROOT / "TESTING_MANUAL.html"
LOGO = REPO / "frontend" / "src" / "assets" / "logo.png"

CSS = """
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.45;
  color: #111;
  max-width: 760px;
  margin: 0 auto;
  padding: 12px 24px 28px;
  background: #fff;
}
.cover { text-align: center; margin-bottom: 24px; page-break-after: avoid; }
.logo-wrap { text-align: center; margin-bottom: 12px; }
.logo-wrap img { height: 88px; width: auto; }
.cover-title {
  text-align: center;
  font-size: 22pt;
  font-weight: 700;
  color: #111;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}
.section-gap { height: 32px; }
h1 { font-size: 13pt; margin: 20px 0 8px; page-break-after: avoid; font-weight: 700; }
h2 { font-size: 12pt; margin: 18px 0 8px; page-break-after: avoid; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
h2.process-title { text-transform: none; letter-spacing: 0; font-size: 13pt; margin-top: 16px; }
h2.process-title-first { margin-top: 40px; }
h3 { font-size: 10.5pt; margin: 14px 0 4px; font-weight: 700; page-break-after: avoid; }
p { margin: 5px 0; }
ul, ol { margin: 5px 0 10px 16px; padding: 0; }
li { margin: 3px 0; }
table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 9.5pt; page-break-inside: avoid; }
th { background: #fff; text-align: left; padding: 5px 7px; border: 1px solid #111; font-weight: 600; }
td { padding: 4px 7px; border: 1px solid #111; vertical-align: top; background: #fff; }
strong { font-weight: 700; }
@media print {
  body { padding: 0; max-width: none; }
}
"""


def logo_img_tag() -> str:
    if LOGO.is_file():
        b64 = base64.b64encode(LOGO.read_bytes()).decode("ascii")
        return f'<img src="data:image/png;base64,{b64}" alt="CoffeeChain logo" />'
    return ""


def md_table(lines: list[str]) -> str:
    rows = []
    for line in lines:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        rows.append(cells)
    if len(rows) < 2:
        return ""
    sep_line = lines[1] if len(lines) > 1 else ""
    header, body = rows[0], rows[2:] if len(rows) > 2 and re.match(r"^[\s|:-]+$", sep_line) else rows[1:]
    out = ["<table>", "<thead><tr>"]
    for c in header:
        out.append(f"<th>{html.escape(c)}</th>")
    out.append("</tr></thead><tbody>")
    for row in body:
        if not any(cell.strip() for cell in row):
            continue
        out.append("<tr>")
        for c in row:
            cell = html.escape(c)
            cell = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", cell)
            out.append(f"<td>{cell}</td>")
        out.append("</tr>")
    out.append("</tbody></table>")
    return "\n".join(out)


def inline(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    return text


def convert_md(content: str) -> str:
    lines = content.splitlines()
    out: list[str] = []
    i = 0
    skip_title = True

    while i < len(lines):
        line = lines[i]

        if skip_title and line.startswith("# "):
            skip_title = False
            i += 1
            continue

        if line.startswith("|"):
            tbl = []
            while i < len(lines) and lines[i].startswith("|"):
                tbl.append(lines[i])
                i += 1
            out.append(md_table(tbl))
            continue

        if line.strip() == "<!-- process-gap -->":
            out.append('<div class="section-gap"></div>')
            i += 1
            continue

        if line.startswith("---"):
            i += 1
            continue

        if line.startswith("# "):
            out.append(f'<h1>{inline(line[2:])}</h1>')
        elif line.startswith("## "):
            title = line[3:]
            if title.startswith("Process "):
                extra = ' process-title-first' if title.startswith("Process 1:") else ""
                out.append(f'<h2 class="process-title{extra}">{inline(title)}</h2>')
            else:
                out.append(f'<h2>{inline(title)}</h2>')
        elif line.startswith("### "):
            out.append(f'<h3>{inline(line[4:])}</h3>')
        elif line.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{inline(lines[i][2:])}</li>")
                i += 1
            out.append("<ul>" + "".join(items) + "</ul>")
            continue
        elif re.match(r"^\d+\.\s", line):
            items = []
            while i < len(lines) and re.match(r"^\d+\.\s", lines[i]):
                items.append(f"<li>{inline(re.sub(r'^\d+\.\s', '', lines[i]))}</li>")
                i += 1
            out.append("<ol>" + "".join(items) + "</ol>")
            continue
        elif line.strip():
            out.append(f"<p>{inline(line)}</p>")
        i += 1

    return "\n".join(out)


def main():
    md = MD.read_text(encoding="utf-8")
    title_match = re.search(r"^# (.+)$", md, re.M)
    cover_title = title_match.group(1) if title_match else "CoffeeChain Testing Manual"
    body = convert_md(md)
    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CoffeeChain</title>
<style>{CSS}</style>
</head>
<body>
<div class="cover">
  <div class="logo-wrap">{logo_img_tag()}</div>
  <h1 class="cover-title">{html.escape(cover_title)}</h1>
</div>
{body}
</body>
</html>"""
    OUT.write_text(doc, encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
