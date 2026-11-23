import csv
import io
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from xml.sax.saxutils import escape

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.services.reports import Dataset
from app.utils.dates import today_local
from app.utils.money import fmt, q

_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def bdt_group(value: Decimal) -> str:
    """1234567.5 -> '12,34,567.50' (lakh/crore grouping)."""
    s = fmt(value)
    neg = s.startswith("-")
    s = s.lstrip("-")
    whole, frac = s.split(".")
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        whole = ",".join(parts + [tail])
    return ("-" if neg else "") + whole + "." + frac


def _text(v: object) -> str:
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return "" if v is None else str(v)


# ---------------------------------------------------------------- CSV


def to_csv(ds: Dataset) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([ds.title])
    w.writerow([ds.subtitle])
    w.writerow([])
    w.writerow(ds.columns)
    for row in ds.rows:
        out = []
        for v in row:
            if isinstance(v, Decimal):
                out.append(fmt(v))
            else:
                s = _text(v)
                # Neutralise spreadsheet formula injection in user-supplied text (names, descriptions).
                out.append("'" + s if s.startswith(_FORMULA_PREFIXES) else s)
        w.writerow(out)
    return ("﻿" + buf.getvalue()).encode("utf-8")  # BOM so Excel reads Bangla names correctly


# ---------------------------------------------------------------- XLSX


def to_xlsx(ds: Dataset) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = ds.title[:31]
    ws.append([ds.title])
    ws["A1"].font = Font(bold=True, size=14)
    ws.append([ds.subtitle])
    ws.append([])
    ws.append(ds.columns)
    header_row = 4
    for c in range(1, len(ds.columns) + 1):
        cell = ws.cell(row=header_row, column=c)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="1E293B")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for r_idx, row in enumerate(ds.rows, start=header_row + 1):
        for c_idx, v in enumerate(row, start=1):
            cell = ws.cell(row=r_idx, column=c_idx)
            if isinstance(v, Decimal):
                cell.value = q(v)
                cell.number_format = "#,##0.00"
            elif isinstance(v, date) and not isinstance(v, datetime):
                cell.value = v
                cell.number_format = "yyyy-mm-dd"
            elif isinstance(v, int):
                cell.value = v
            else:
                s = _text(v)
                cell.value = s
                cell.data_type = "s"  # force text: never evaluate user-supplied "=..." as a formula
        if row and str(row[0]) in ("Total",):
            for c_idx in range(1, len(row) + 1):
                ws.cell(row=r_idx, column=c_idx).font = Font(bold=True)

    for c_idx, col in enumerate(ds.columns, start=1):
        longest = max([len(col)] + [len(_text(r[c_idx - 1])) for r in ds.rows if c_idx - 1 < len(r)][:500])
        ws.column_dimensions[get_column_letter(c_idx)].width = min(max(12, longest + 2), 48)
    ws.freeze_panes = ws.cell(row=header_row + 1, column=1)

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


# ---------------------------------------------------------------- PDF

_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
]


def _pdf_font() -> str:
    for p in _FONT_CANDIDATES:
        if Path(p).exists():
            try:
                pdfmetrics.registerFont(TTFont("HowlatSans", p))
                return "HowlatSans"
            except Exception:
                break
    return "Helvetica"  # Latin-1 only: non-Latin names (e.g. Bangla) need a TTF font installed


def to_pdf(ds: Dataset, user_label: str) -> bytes:
    font = _pdf_font()
    styles = getSampleStyleSheet()
    title = ParagraphStyle("t", parent=styles["Title"], fontName=font, fontSize=16, alignment=0, textColor=colors.HexColor("#0F172A"))
    sub = ParagraphStyle("s", parent=styles["Normal"], fontName=font, fontSize=9, textColor=colors.HexColor("#64748B"))
    cell = ParagraphStyle("c", parent=styles["Normal"], fontName=font, fontSize=7.5, leading=9)
    cell_r = ParagraphStyle("cr", parent=cell, alignment=2)
    head = ParagraphStyle("h", parent=cell, textColor=colors.white, fontSize=7.5)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=12 * mm, rightMargin=12 * mm,
                            topMargin=12 * mm, bottomMargin=12 * mm, title=f"Howlat - {ds.title}")
    story = [
        Paragraph(escape(f"Howlat — {ds.title}"), title),
        Paragraph(escape(f"{ds.subtitle}   ·   Generated {today_local().isoformat()}   ·   {user_label}"), sub),
        Spacer(1, 6 * mm),
    ]
    data = [[Paragraph(escape(c), head) for c in ds.columns]]
    for row in ds.rows:
        line = []
        for i, v in enumerate(row):
            if isinstance(v, Decimal):
                line.append(Paragraph(bdt_group(v), cell_r))
            else:
                line.append(Paragraph(escape(_text(v)), cell_r if i in ds.numeric else cell))
        data.append(line)
    if not ds.rows:
        data.append([Paragraph("No data for this report.", cell)] + [""] * (len(ds.columns) - 1))

    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(table)
    doc.build(story)
    return buf.getvalue()
