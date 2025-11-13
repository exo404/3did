#!/usr/bin/env python3
import argparse
import csv
from pathlib import Path
from typing import Dict, List, Optional, Tuple

SUMMARY_ORDER = [
    "Conteggio",
    "Min (ms)",
    "P50 (ms)",
    "P90 (ms)",
    "P95 (ms)",
    "Max (ms)",
    "Media (ms)",
]

SUFFIX_LABELS = {
    "mediator": "Mediator",
    "rpc": "RPC",
}


def parse_slots(value: str) -> List[str]:
    raw = [part.strip() for part in value.split(",") if part.strip()]
    slots = raw or ["1", "2", "3"]
    for slot in slots:
        if slot not in {"1", "2", "3"}:
            raise argparse.ArgumentTypeError(
                f"Invalid slot '{slot}'. Use digits 1,2,3 separated by commas."
            )
    return slots

def find_summary_file(day_dir: Path, filename: str) -> Optional[Path]:
    matches = sorted(day_dir.rglob(filename))
    if not matches:
        return None
    return matches[0]


def load_summary(path: Path) -> Tuple[Dict[str, float], Dict[str, float]]:
    metrics: Dict[str, float] = {}
    method_counts: Dict[str, float] = {}
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        for row in reader:
            if not row:
                continue
            metric = row[0].strip()
            if metric == "Metric":
                continue
            value_raw = row[1].strip() if len(row) > 1 else ""
            if metric.startswith("Operazione:"):
                method = metric.split(":", 1)[1].strip()
                if not method or not value_raw or value_raw == "-":
                    continue
                try:
                    method_counts[method] = float(value_raw)
                except ValueError:
                    continue
                continue
            if not value_raw or value_raw == "-":
                continue
            try:
                metrics[metric] = float(value_raw)
            except ValueError:
                continue
    return metrics, method_counts


def average_dict(dicts: List[Dict[str, float]]) -> Dict[str, float]:
    totals: Dict[str, float] = {}
    counts: Dict[str, int] = {}
    for entry in dicts:
        for key, value in entry.items():
            totals[key] = totals.get(key, 0.0) + value
            counts[key] = counts.get(key, 0) + 1
    return {key: totals[key] / counts[key] for key in totals}


def format_metric(name: str, value: float) -> str:
    if name == "Conteggio":
        return f"{value:.2f}"
    if "(ms)" in name:
        return f"{value:.2f}"
    return f"{value:.2f}"


def print_summary(
    label: str,
    slot_count: int,
    metrics: Dict[str, float],
    methods: Dict[str, float],
    missing: List[str],
    output_path: Optional[Path],
) -> None:
    print(f"\n=== {label} ===")
    print(f"Runs considered: {slot_count} (missing: {', '.join(missing) if missing else 'none'})")
    if slot_count == 0:
        print("  No summary files found.")
        return
    for metric_name in SUMMARY_ORDER:
        if metric_name in metrics:
            print(f"  {metric_name}: {format_metric(metric_name, metrics[metric_name])}")
    extra_metrics = sorted(
        (name, value) for name, value in metrics.items() if name not in SUMMARY_ORDER
    )
    for metric_name, value in extra_metrics:
        print(f"  {metric_name}: {format_metric(metric_name, value)}")
    if methods:
        print("  Method counts (avg):")
        for method, value in sorted(methods.items(), key=lambda item: item[1], reverse=True):
            print(f"    {method}: {value:.2f}")
    if output_path:
        print(f"  Saved CSV -> {output_path}")


def write_summary_csv(
    output_dir: Path,
    filename: str,
    metrics: Dict[str, float],
    methods: Dict[str, float],
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / filename
    rows = [("Metric", "Value")]
    for metric_name in SUMMARY_ORDER:
        if metric_name in metrics:
            rows.append((metric_name, format_metric(metric_name, metrics[metric_name])))
    extra_metrics = sorted(
        (name, value) for name, value in metrics.items() if name not in SUMMARY_ORDER
    )
    for metric_name, value in extra_metrics:
        rows.append((metric_name, format_metric(metric_name, value)))
    for method, value in sorted(methods.items(), key=lambda item: item[1], reverse=True):
        rows.append((f"Operazione: {method}", f"{value:.2f}"))
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerows(rows)
    return csv_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Aggregate mediator/RPC summaries across multiple runs.",
    )
    parser.add_argument("--day", required=True, help="Target day folder (YYYY-MM-DD).")
    parser.add_argument("--test-name", required=True, help="Test/scenario prefix.")
    parser.add_argument(
        "--slots",
        default="1,2,3",
        help="Comma-separated run slots to include (default: 1,2,3).",
    )
    parser.add_argument(
        "--base-dir",
        type=Path,
        default=Path("captures"),
        help="Base captures directory (default: ./captures).",
    )
    parser.add_argument(
        "--network",
        default="sepolia",
        help="Network subfolder under --base-dir (default: sepolia).",
    )
    args = parser.parse_args()
    slots = parse_slots(args.slots)
    day_dir = args.base_dir / args.network / args.day
    if not day_dir.exists():
        raise FileNotFoundError(f"Day folder not found: {day_dir}")

    for suffix in ("mediator", "rpc"):
        per_run_metrics: List[Dict[str, float]] = []
        per_run_methods: List[Dict[str, float]] = []
        found_slots: List[str] = []
        missing_slots: List[str] = []
        output_dir: Optional[Path] = None
        for slot in slots:
            filename = f"{args.test_name}_{args.day}_run{slot}_{suffix}_summary.csv"
            summary_path = find_summary_file(day_dir, filename)
            if not summary_path:
                missing_slots.append(slot)
                continue
            if output_dir is None:
                output_dir = summary_path.parent
            found_slots.append(slot)
            metrics, methods = load_summary(summary_path)
            per_run_metrics.append(metrics)
            per_run_methods.append(methods)
        averaged_metrics = average_dict(per_run_metrics) if per_run_metrics else {}
        averaged_methods = average_dict(per_run_methods) if per_run_methods else {}
        output_path = None
        if found_slots and (averaged_metrics or averaged_methods):
            target_dir = output_dir or day_dir
            slots_tag = "".join(found_slots)
            filename = f"{args.test_name}_{args.day}_run{slots_tag}_{suffix}_summary_avg.csv"
            output_path = write_summary_csv(target_dir, filename, averaged_metrics, averaged_methods)
        print_summary(
            SUFFIX_LABELS.get(suffix, suffix),
            len(found_slots),
            averaged_metrics,
            averaged_methods,
            missing_slots,
            output_path,
        )


if __name__ == "__main__":
    main()
