"""
generate-standard-models.py

Reads Refresh Asset Data.xlsx (project root), counts (Make, Model) pairs across
all data rows, and writes pairs with count >= THRESHOLD to standard-models.csv.

Uses only stdlib — no pip packages required.
"""

import csv
import os
import sys
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict

# ── Configuration ──────────────────────────────────────────────────────────────
THRESHOLD = 50          # Minimum occurrences to be considered "standard"
XLSX_NAME = "Refresh Asset Data.xlsx"
OUTPUT_NAME = "standard-models.csv"

# Column indices (0-based) in the spreadsheet
COL_MAKE  = 6   # Column G
COL_MODEL = 7   # Column H

# XML namespace used throughout OOXML
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"

# ── Helpers ────────────────────────────────────────────────────────────────────

def col_letter_to_index(ref: str) -> int:
    """Convert a cell reference like 'G2' to a 0-based column index (6)."""
    col_str = ""
    for ch in ref:
        if ch.isalpha():
            col_str += ch
        else:
            break
    index = 0
    for ch in col_str.upper():
        index = index * 26 + (ord(ch) - ord("A") + 1)
    return index - 1


def load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    """Parse xl/sharedStrings.xml and return a list of string values."""
    with zf.open("xl/sharedStrings.xml") as f:
        tree = ET.parse(f)
    root = tree.getroot()
    strings: list[str] = []
    for si in root.findall(f"{{{NS}}}si"):
        # Concatenate all <t> text nodes (handles rich text / phonetic runs)
        text = "".join(
            (t.text or "") for t in si.iter(f"{{{NS}}}t")
        )
        strings.append(text)
    return strings


def count_make_model_pairs(
    zf: zipfile.ZipFile,
    shared_strings: list[str],
) -> dict[tuple[str, str], int]:
    """Stream sheet1.xml row by row and tally (Make, Model) pairs."""
    counts: dict[tuple[str, str], int] = defaultdict(int)

    with zf.open("xl/worksheets/sheet1.xml") as f:
        # Use iterparse for memory-efficient streaming of a large XML file
        row_num = 0
        make_val = None
        model_val = None

        for event, elem in ET.iterparse(f, events=("start", "end")):
            tag = elem.tag.replace(f"{{{NS}}}", "")

            if event == "start" and tag == "row":
                r_attr = elem.get("r", "0")
                row_num = int(r_attr)
                make_val = None
                model_val = None

            elif event == "end" and tag == "c":
                ref = elem.get("r", "")
                col_idx = col_letter_to_index(ref) if ref else -1
                cell_type = elem.get("t", "")

                if col_idx in (COL_MAKE, COL_MODEL) and cell_type == "s":
                    v_elem = elem.find(f"{{{NS}}}v")
                    if v_elem is not None and v_elem.text is not None:
                        str_idx = int(v_elem.text)
                        value = shared_strings[str_idx]
                        if col_idx == COL_MAKE:
                            make_val = value
                        else:
                            model_val = value

                # Free memory for processed cell elements
                elem.clear()

            elif event == "end" and tag == "row":
                # Skip header row (row 1)
                if row_num > 1 and make_val is not None and model_val is not None:
                    counts[(make_val, model_val)] += 1

                if row_num % 10_000 == 0:
                    print(f"  ... processed row {row_num:,}", file=sys.stderr)

    return counts


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))

    xlsx_path = os.path.join(project_root, XLSX_NAME)
    output_path = os.path.join(script_dir, OUTPUT_NAME)

    if not os.path.exists(xlsx_path):
        print(f"ERROR: Cannot find {xlsx_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Opening {xlsx_path} ...", file=sys.stderr)

    with zipfile.ZipFile(xlsx_path) as zf:
        print("Loading shared strings ...", file=sys.stderr)
        shared_strings = load_shared_strings(zf)
        print(f"  Loaded {len(shared_strings):,} shared strings.", file=sys.stderr)

        print("Counting (Make, Model) pairs across all data rows ...", file=sys.stderr)
        counts = count_make_model_pairs(zf, shared_strings)

    total_pairs = len(counts)
    print(f"  Found {total_pairs:,} distinct (Make, Model) pairs.", file=sys.stderr)

    # Filter and sort
    standard = [
        (make, model, count)
        for (make, model), count in counts.items()
        if count >= THRESHOLD
    ]
    standard.sort(key=lambda row: row[2], reverse=True)

    print(
        f"  {len(standard)} pairs meet the threshold (>= {THRESHOLD} occurrences).",
        file=sys.stderr,
    )

    # Write CSV
    with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Make", "Model", "DeviceCount"])
        writer.writerows(standard)

    print(f"Wrote {len(standard)} rows to {output_path}", file=sys.stderr)

    # Print a quick preview to stdout
    print(f"\n{'Make':<20} {'Model':<50} {'DeviceCount':>11}")
    print("-" * 84)
    for make, model, count in standard[:20]:
        print(f"{make:<20} {model:<50} {count:>11,}")
    if len(standard) > 20:
        print(f"  ... and {len(standard) - 20} more rows in the CSV.")


if __name__ == "__main__":
    main()
