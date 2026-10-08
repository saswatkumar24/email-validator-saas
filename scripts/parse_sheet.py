#!/usr/bin/env python3
import sys
import os
import re
import json
import zipfile
import csv
import xml.etree.ElementTree as ET

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+")

def parse_xlsx(file_path):
    with zipfile.ZipFile(file_path, 'r') as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            try:
                tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
                for elem in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                    text = ''.join(elem.itertext())
                    shared_strings.append(text)
            except Exception:
                pass
        
        # Find sheet XMLs
        sheet_names = [n for n in z.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')]
        sheet_names.sort()
        rows = []
        if sheet_names:
            tree = ET.fromstring(z.read(sheet_names[0]))
            for row_elem in tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                row_vals = []
                for cell in row_elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    val = ''
                    cell_type = cell.get('t')
                    v_elem = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    if v_elem is not None and v_elem.text:
                        raw = v_elem.text
                        if cell_type == 's' and raw.isdigit():
                            idx = int(raw)
                            val = shared_strings[idx] if idx < len(shared_strings) else raw
                        else:
                            val = raw
                    elif cell_type == 'inlineStr':
                        t_elem = cell.find('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                        if t_elem is not None:
                            val = t_elem.text or ''
                    row_vals.append(val.strip())
                if any(row_vals):
                    rows.append(row_vals)
        return rows

def parse_csv_or_text(file_path):
    encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']
    content = None
    for enc in encodings:
        try:
            with open(file_path, 'r', encoding=enc) as f:
                content = f.read()
                break
        except Exception:
            continue
    if content is None:
        return []

    lines = [l.strip() for l in content.splitlines() if l.strip()]
    if not lines:
        return []

    # Detect delimiter
    sample = lines[0]
    delimiter = ','
    if '\t' in sample:
        delimiter = '\t'
    elif ';' in sample:
        delimiter = ';'
    elif ',' in sample:
        delimiter = ','

    reader = csv.reader(lines, delimiter=delimiter)
    rows = [r for r in reader if any(r)]
    return rows

def process_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    rows = []

    if ext in ['.xlsx', '.xlsm', '.xltx']:
        try:
            rows = parse_xlsx(file_path)
        except Exception as e:
            # Fallback to regex scan if corrupt zip
            pass
    
    if not rows:
        try:
            rows = parse_csv_or_text(file_path)
        except Exception:
            pass

    # If still no rows, scan raw text with regex
    if not rows:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                raw = f.read()
                matches = list(set(EMAIL_REGEX.findall(raw)))
                return {
                    "headers": ["Email"],
                    "detectedEmailColumn": "Email",
                    "emails": matches,
                    "previewRows": [{"Email": m} for m in matches[:5]],
                    "totalRows": len(matches)
                }
        except Exception:
            return {"headers": [], "detectedEmailColumn": "", "emails": [], "previewRows": [], "totalRows": 0}

    # Analyze rows to identify headers and email column
    if not rows:
        return {"headers": [], "detectedEmailColumn": "", "emails": [], "previewRows": [], "totalRows": 0}

    header_candidate = rows[0]
    # Check if first row is header or data
    has_header = False
    for col in header_candidate:
        if any(keyword in col.lower() for keyword in ['email', 'e-mail', 'mail', 'contact', 'address', 'name']):
            has_header = True
            break

    headers = [str(h).strip() for h in header_candidate] if has_header else [f"Column {i+1}" for i in range(len(rows[0]))]
    data_rows = rows[1:] if has_header else rows

    # Find the column index with the most emails
    email_counts_per_col = [0] * len(headers)
    for r in data_rows:
        for idx, cell in enumerate(r):
            if idx < len(email_counts_per_col):
                if EMAIL_REGEX.search(cell):
                    email_counts_per_col[idx] += 1

    best_col_idx = 0
    if max(email_counts_per_col) > 0:
        best_col_idx = email_counts_per_col.index(max(email_counts_per_col))
    else:
        # Check if header explicitly says "email"
        for idx, h in enumerate(headers):
            if 'email' in h.lower() or 'mail' in h.lower():
                best_col_idx = idx
                break

    # Extract all emails
    emails = []
    seen = set()
    for r in data_rows:
        if best_col_idx < len(r):
            cell = r[best_col_idx]
            match = EMAIL_REGEX.search(cell)
            if match:
                email = match.group(0).lower().strip()
                if email not in seen:
                    seen.add(email)
                    emails.append(email)
        else:
            # Fallback scan row
            for cell in r:
                match = EMAIL_REGEX.search(cell)
                if match:
                    email = match.group(0).lower().strip()
                    if email not in seen:
                        seen.add(email)
                        emails.append(email)

    # If still empty, scan whole file with regex
    if not emails:
        for r in rows:
            for cell in r:
                match = EMAIL_REGEX.search(cell)
                if match:
                    email = match.group(0).lower().strip()
                    if email not in seen:
                        seen.add(email)
                        emails.append(email)

    # Preview rows
    preview = []
    for r in data_rows[:5]:
        row_dict = {}
        for idx, h in enumerate(headers):
            row_dict[h] = r[idx] if idx < len(r) else ""
        preview.append(row_dict)

    return {
        "headers": headers,
        "detectedEmailColumn": headers[best_col_idx] if best_col_idx < len(headers) else (headers[0] if headers else "Email"),
        "emails": emails,
        "previewRows": preview,
        "totalRows": len(emails)
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    res = process_file(file_path)
    print(json.dumps(res))
