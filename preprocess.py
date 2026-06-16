import json
import os
import re
from datetime import datetime, timezone

import numpy as np
import pandas as pd

REF_PATH = "data/reference/SGH_Reference_Pricelist.xlsx"
COMPANIES_DIR = "data/companies"
OUTPUT_PATH = "benchmark_data.json"

CPT_ALIASES = re.compile(
    r"^(cpt[\s_-]*code|service[\s_-]*code|code|cpt)$", re.IGNORECASE
)
DESC_ALIASES = re.compile(
    r"^(description|desc|service|service[\s_-]*name|procedure|"
    r"code[\s_-]*description|benefit[\s_-]*description|service[\s_-]*description)$",
    re.IGNORECASE,
)
PRICE_ALIASES = re.compile(
    r"^(net[\s_-]*price|price|rate|amount|fee|net)$", re.IGNORECASE
)
EXCLUDE_ALIASES = re.compile(
    r"^(year|date|seq|no|s\.?no|#|row|id|index)$", re.IGNORECASE
)


def find_col(columns, pattern):
    for col in columns:
        if pattern.match(str(col).strip()):
            return col
    return None


def detect_price_cols(df, cpt_col, desc_col):
    """Return list of price columns. Tries explicit names first, falls back to numeric columns."""
    explicit = find_col(df.columns, PRICE_ALIASES)
    if explicit:
        return [explicit]

    excluded = {cpt_col, desc_col}
    price_cols = []
    for col in df.columns:
        if col in excluded:
            continue
        if EXCLUDE_ALIASES.match(str(col).strip()):
            continue
        if CPT_ALIASES.match(str(col).strip()) or DESC_ALIASES.match(str(col).strip()):
            continue
        series = pd.to_numeric(df[col], errors="coerce")
        ratio = series.notna().sum() / max(len(series), 1)
        if ratio >= 0.3:
            price_cols.append(col)
    return price_cols


def load_sheet(df, sheet_name):
    """Returns list of (network_label, rates_dict) from one sheet."""
    cols = df.columns.tolist()
    cpt_col = find_col(cols, CPT_ALIASES)
    if cpt_col is None:
        return []

    desc_col = find_col(cols, DESC_ALIASES)
    price_cols = detect_price_cols(df, cpt_col, desc_col)
    if not price_cols:
        return []

    results = []
    for pc in price_cols:
        sub = df[[cpt_col] + ([desc_col] if desc_col else []) + [pc]].copy()
        rename = {cpt_col: "cpt", pc: "price"}
        if desc_col:
            rename[desc_col] = "description"
        sub.rename(columns=rename, inplace=True)
        sub["cpt"] = sub["cpt"].astype(str).str.strip()
        sub["price"] = pd.to_numeric(sub["price"], errors="coerce")
        sub = sub[sub["cpt"].notna() & (sub["cpt"] != "") & (sub["cpt"] != "nan")]
        sub = sub[sub["price"].notna() & (sub["price"] > 0)]
        if len(sub) == 0:
            continue
        rates = dict(zip(sub["cpt"], sub["price"].astype(float)))
        # If multiple price columns, append price-col name to network label
        label = sheet_name if len(price_cols) == 1 else f"{sheet_name} - {pc}"
        results.append((label, rates))
    return results


def load_reference(path):
    print(f"Loading reference: {path}")
    xl = pd.ExcelFile(path)
    sheet = xl.sheet_names[0]
    df = xl.parse(sheet)
    pairs = load_sheet(df, sheet)
    if not pairs:
        raise ValueError(
            f"Cannot detect columns in reference. Columns: {df.columns.tolist()}"
        )
    _, rates = pairs[0]
    # Build reference dict with descriptions
    cols = df.columns.tolist()
    cpt_col = find_col(cols, CPT_ALIASES)
    desc_col = find_col(cols, DESC_ALIASES)
    ref = {}
    for _, row in df.iterrows():
        cpt = str(row[cpt_col]).strip()
        price = pd.to_numeric(row[find_col(cols, PRICE_ALIASES) or cols[-1]], errors="coerce")
        if cpt in ("", "nan") or not price or price <= 0:
            continue
        desc = str(row[desc_col]).strip() if desc_col else ""
        ref[cpt] = {"description": desc, "price": float(price)}
    print(f"  OK Reference loaded: {len(ref):,} codes")
    return ref


def load_company(path):
    company_name = os.path.splitext(os.path.basename(path))[0]
    print(f"Processing: {company_name}.xlsx", end="")
    xl = pd.ExcelFile(path)
    networks = []
    for sheet in xl.sheet_names:
        try:
            df = xl.parse(sheet)
            pairs = load_sheet(df, sheet.strip())
            for label, rates in pairs:
                networks.append({"network": label, "rates": rates})
        except Exception as e:
            print(f"\n  Warning: Skipping sheet '{sheet}': {e}", end="")
    print(f" -> {len(networks)} networks")
    return company_name, networks


def compute_network_stats(rates, reference):
    aligned = above = below = 0
    variance_sum = 0.0
    count = 0
    for cpt, price in rates.items():
        if cpt not in reference:
            continue
        ref_price = reference[cpt]["price"]
        if ref_price == 0:
            continue
        var = ((price - ref_price) / ref_price) * 100
        variance_sum += var
        count += 1
        if abs(var) <= 5:
            aligned += 1
        elif var > 5:
            above += 1
        else:
            below += 1
    total = aligned + above + below
    align_pct = round((aligned / total * 100), 2) if total > 0 else 0.0
    avg_var = round(variance_sum / count, 2) if count > 0 else 0.0
    return {
        "total_codes": len(rates),
        "aligned": aligned,
        "above": above,
        "below": below,
        "align_pct": align_pct,
        "avg_variance_pct": avg_var,
    }


def compute_code_stats(companies_data, reference):
    all_prices = {}
    for _, networks in companies_data:
        for net in networks:
            for cpt, price in net["rates"].items():
                if cpt in reference:
                    all_prices.setdefault(cpt, []).append(price)

    code_stats = {}
    for cpt, prices in all_prices.items():
        arr = np.array(prices)
        q1 = float(np.percentile(arr, 25))
        q3 = float(np.percentile(arr, 75))
        median = float(np.median(arr))
        iqr_optimal = round((q1 + q3) / 2, 4)
        ref_price = reference[cpt]["price"]
        companies_above = companies_below = companies_aligned = 0
        for p in prices:
            if ref_price > 0:
                v = ((p - ref_price) / ref_price) * 100
                if abs(v) <= 5:
                    companies_aligned += 1
                elif v > 5:
                    companies_above += 1
                else:
                    companies_below += 1
        code_stats[cpt] = {
            "median": round(median, 4),
            "q1": round(q1, 4),
            "q3": round(q3, 4),
            "iqr_optimal": iqr_optimal,
            "companies_above": companies_above,
            "companies_below": companies_below,
            "companies_aligned": companies_aligned,
        }
    return code_stats


def main():
    reference = load_reference(REF_PATH)

    company_files = sorted(
        os.path.join(COMPANIES_DIR, f)
        for f in os.listdir(COMPANIES_DIR)
        if f.lower().endswith(".xlsx") and not f.startswith("~$")
    )

    companies_data = []
    for path in company_files:
        name, networks = load_company(path)
        if networks:
            companies_data.append((name, networks))

    print("\nComputing code statistics...")
    code_stats = compute_code_stats(companies_data, reference)

    companies_json = []
    total_pricelists = 0
    for company_name, networks in companies_data:
        nets_json = []
        for net in networks:
            stats = compute_network_stats(net["rates"], reference)
            nets_json.append({
                "network": net["network"],
                **stats,
                "rates": net["rates"],
            })
            total_pricelists += 1
        companies_json.append({"company": company_name, "networks": nets_json})

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "reference_count": len(reference),
        "company_count": len(companies_data),
        "pricelist_count": total_pricelists,
        "reference": reference,
        "companies": companies_json,
        "code_stats": code_stats,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    print(f"\nDONE: benchmark_data.json written")
    print(f"  Reference codes : {len(reference):,}")
    print(f"  Companies       : {len(companies_data)}")
    print(f"  Pricelists      : {total_pricelists}")
    print(f"  Code stats      : {len(code_stats):,} codes")
    size_mb = os.path.getsize(OUTPUT_PATH) / 1_048_576
    print(f"  File size       : {size_mb:.1f} MB")


if __name__ == "__main__":
    main()
