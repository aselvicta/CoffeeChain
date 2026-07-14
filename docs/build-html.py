#!/usr/bin/env python3
"""Build print-ready HTML from SYSTEM_ARCHITECTURE.md"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MD = ROOT / "SYSTEM_ARCHITECTURE.md"
OUT = ROOT / "SYSTEM_ARCHITECTURE.html"

CSS = """
@page { size: A4; margin: 18mm 15mm; }
* { box-sizing: border-box; }
body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 11pt;
  line-height: 1.55;
  color: #1a1a1a;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 32px 48px;
}
h1 { font-size: 26pt; color: #166534; border-bottom: 3px solid #16a34a; padding-bottom: 8px; margin-top: 0; }
h2 { font-size: 16pt; color: #15803d; margin-top: 28px; page-break-after: avoid; border-bottom: 1px solid #bbf7d0; padding-bottom: 4px; }
h3 { font-size: 12pt; color: #166534; margin-top: 18px; page-break-after: avoid; }
p { margin: 8px 0; }
ul, ol { margin: 8px 0 12px 20px; }
li { margin: 4px 0; }
table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; font-size: 10pt; page-break-inside: avoid; }
th { background: #dcfce7; color: #14532d; text-align: left; padding: 8px 10px; border: 1px solid #86efac; }
td { padding: 7px 10px; border: 1px solid #d1d5db; vertical-align: top; }
tr:nth-child(even) td { background: #f9fafb; }
pre, code { font-family: 'Consolas', 'Monaco', monospace; font-size: 9pt; }
pre {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-left: 4px solid #16a34a;
  padding: 12px 14px;
  overflow-x: auto;
  white-space: pre-wrap;
  page-break-inside: avoid;
}
code { background: #f3f4f6; padding: 1px 5px; border-radius: 3px; }
.meta { color: #4b5563; font-size: 10pt; margin-bottom: 24px; }
.toc { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px 20px; border-radius: 8px; margin: 20px 0 32px; }
.toc ol { margin: 0; }
.toc a { color: #15803d; text-decoration: none; }
.toc a:hover { text-decoration: underline; }
.cover-note { font-style: italic; color: #6b7280; margin-top: 40px; font-size: 10pt; }
@media print {
  body { padding: 0; max-width: none; }
  h2 { page-break-before: auto; }
  a { color: inherit; text-decoration: none; }
}
"""

def slug(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_]+", "-", text)


def md_table(lines: list[str]) -> str:
    rows = []
    for line in lines:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        rows.append(cells)
    if len(rows) < 2:
        return ""
    sep_line = lines[1] if len(lines) > 1 else ""
    header, body = rows[0], rows[2:] if len(rows) > 2 and re.match(r"^[\s|:-]+$", sep_line) else rows[1:]
    html_rows = ["<table>", "<thead><tr>"]
    for c in header:
        html_rows.append(f"<th>{html.escape(c)}</th>")
    html_rows.append("</tr></thead><tbody>")
    for row in body:
        if not any(cell.strip() for cell in row):
            continue
        html_rows.append("<tr>")
        for c in row:
            html_rows.append(f"<td>{html.escape(c)}</td>")
        html_rows.append("</tr>")
    html_rows.append("</tbody></table>")
    return "".join(html_rows)


def convert(md: str) -> str:
    lines = md.splitlines()
    out: list[str] = []
    i = 0
    in_code = False
    code_buf: list[str] = []
    table_buf: list[str] = []
    in_table = False

    def flush_table():
        nonlocal in_table, table_buf
        if table_buf:
            out.append(md_table(table_buf))
            table_buf = []
        in_table = False

    while i < len(lines):
        line = lines[i]

        if line.strip().startswith("```"):
            if in_code:
                out.append("<pre><code>" + html.escape("\n".join(code_buf)) + "</code></pre>")
                code_buf = []
                in_code = False
            else:
                flush_table()
                in_code = True
            i += 1
            continue

        if in_code:
            code_buf.append(line)
            i += 1
            continue

        if "|" in line and line.strip().startswith("|"):
            in_table = True
            table_buf.append(line)
            i += 1
            continue
        elif in_table:
            flush_table()

        if line.startswith("# "):
            out.append(f'<h1 id="{slug(line[2:])}">{html.escape(line[2:].strip())}</h1>')
        elif line.startswith("## "):
            out.append(f'<h2 id="{slug(line[3:])}">{html.escape(line[3:].strip())}</h2>')
        elif line.startswith("### "):
            out.append(f'<h3 id="{slug(line[4:])}">{html.escape(line[4:].strip())}</h3>')
        elif line.strip() == "---":
            out.append("<hr>")
        elif re.match(r"^[-*] ", line):
            items = []
            while i < len(lines) and re.match(r"^[-*] ", lines[i]):
                items.append(html.escape(re.sub(r"^[-*] ", "", lines[i]).strip()))
                i += 1
            out.append("<ul>" + "".join(f"<li>{x}</li>" for x in items) + "</ul>")
            continue
        elif re.match(r"^\d+\. ", line):
            items = []
            while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
                items.append(html.escape(re.sub(r"^\d+\. ", "", lines[i]).strip()))
                i += 1
            out.append("<ol>" + "".join(f"<li>{x}</li>" for x in items) + "</ol>")
            continue
        elif line.strip().startswith("**") and line.strip().endswith("**"):
            out.append(f"<p><strong>{html.escape(line.strip()[2:-2])}</strong></p>")
        elif line.strip():
            text = html.escape(line.strip())
            text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
            text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
            out.append(f"<p>{text}</p>")
        i += 1

    if in_table:
        flush_table()
    if in_code and code_buf:
        out.append("<pre><code>" + html.escape("\n".join(code_buf)) + "</code></pre>")

    return "\n".join(out)


def main():
    md = MD.read_text(encoding="utf-8")
    body = convert(md)
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CoffeeChain System Architecture</title>
<style>{CSS}</style>
</head>
<body>
{body}
<p class="cover-note">CoffeeChain — Tanzania Coffee Board · System Architecture · July 2026</p>
</body>
</html>"""
    OUT.write_text(page, encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
