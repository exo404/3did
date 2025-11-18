from __future__ import annotations

import argparse
import csv
import math
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

DEFAULT_METRICS = [
    "Min (ms)",
    "P50 (ms)",
    "P90 (ms)",
    "P95 (ms)",
    "Max (ms)",
    "Media (ms)",
]

DEFAULT_LOCAL_ANVIL_EXCLUDE = ["setupMediator", "setupClients"]

SEPOLIA_FILE_PATTERN = re.compile(
    r"(?P<test>[\w-]+)_(?P<day>\d{4}-\d{2}-\d{2})_(?P<slot>run\d+)_"
    r"(?P<component>rpc|mediator)_summary_avg\.csv$"
)

LOCAL_FILE_PATTERN = re.compile(
    r"(?P<test>[\w-]+)_(?P<label>[\w-]+)_(?P<component>[\w-]+)_summary\.csv$"
)


@dataclass
class SummaryEntry:
    network: str
    component: str
    scenario: str
    test_name: str
    metrics: Dict[str, float]
    path: Path
    sort_key: Tuple


def parse_metric_list(value: str) -> List[str]:
    parts = [part.strip() for part in value.split(",")]
    metrics = [part for part in parts if part]
    if not metrics:
        raise argparse.ArgumentTypeError("Provide at least one metric name.")
    return metrics


def parse_name_list(value: str) -> List[str]:
    if value is None:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def import_matplotlib(show_plots: bool):
    try:
        import matplotlib
        if not show_plots:
            matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError as exc:  # pragma: no cover - dependency hint
        raise SystemExit(
            "matplotlib is required for plotting. Install it with `pip install matplotlib`."
        ) from exc
    return plt


def read_summary_metrics(path: Path) -> Dict[str, float]:
    metrics: Dict[str, float] = {}
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        for row in reader:
            if not row:
                continue
            name = row[0].strip()
            if name in {"Metric", ""} or name.startswith("Operazione:"):
                continue
            value_str = row[1].strip() if len(row) > 1 else ""
            if not value_str or value_str == "-":
                continue
            try:
                metrics[name] = float(value_str)
            except ValueError:
                continue
    return metrics


def collect_sepolia_entries(root: Path) -> List[SummaryEntry]:
    entries: List[SummaryEntry] = []
    if not root.exists():
        return entries
    for csv_path in sorted(root.rglob("*summary_avg.csv")):
        match = SEPOLIA_FILE_PATTERN.match(csv_path.name)
        if not match:
            continue
        metrics = read_summary_metrics(csv_path)
        if not metrics:
            continue
        day_text = match["day"]
        try:
            day_value = datetime.strptime(day_text, "%Y-%m-%d")
        except ValueError:
            day_value = datetime.fromordinal(1)
        scenario_label = f"{match['test']}\n{day_text}"
        entries.append(
            SummaryEntry(
                network="sepolia",
                component=match["component"],
                scenario=scenario_label,
                test_name=match["test"],
                metrics=metrics,
                path=csv_path,
                sort_key=(0, day_value, match["test"], csv_path.name),
            )
        )
    return entries


def extract_numeric_hint(label: str) -> float:
    match = re.search(r"(\d+(?:\.\d+)?)", label)
    if not match:
        return math.inf
    try:
        return float(match.group(1))
    except ValueError:
        return math.inf


def collect_local_entries(root: Path) -> List[SummaryEntry]:
    entries: List[SummaryEntry] = []
    if not root.exists():
        return entries
    for csv_path in sorted(root.rglob("*_summary.csv")):
        if csv_path.name.endswith("_summary_avg.csv"):
            continue
        match = LOCAL_FILE_PATTERN.match(csv_path.name)
        if not match:
            continue
        metrics = read_summary_metrics(csv_path)
        if not metrics:
            continue
        latency_hint = extract_numeric_hint(match["label"])
        scenario_label = f"{match['test']}\n{match['label']}"
        entries.append(
            SummaryEntry(
                network="local",
                component=match["component"],
                scenario=scenario_label,
                test_name=match["test"],
                metrics=metrics,
                path=csv_path,
                sort_key=(1, latency_hint, match["test"], csv_path.name),
            )
        )
    return entries


def group_entries(entries: Iterable[SummaryEntry]) -> Dict[Tuple[str, str], List[SummaryEntry]]:
    grouped: Dict[Tuple[str, str], List[SummaryEntry]] = {}
    for entry in entries:
        key = (entry.network, entry.component)
        grouped.setdefault(key, []).append(entry)
    return grouped


def filter_entries(
    entries: Iterable[SummaryEntry],
    local_anvil_exclusions: Sequence[str],
) -> List[SummaryEntry]:
    if not local_anvil_exclusions:
        return list(entries)
    excluded = {name.lower() for name in local_anvil_exclusions}
    filtered: List[SummaryEntry] = []
    for entry in entries:
        if entry.network == "local" and entry.component.lower() == "anvil":
            if entry.test_name.lower() in excluded:
                continue
        filtered.append(entry)
    return filtered


def plot_group(
    plt,
    entries: Sequence[SummaryEntry],
    metrics: Sequence[str],
    output_path: Path,
    title: str,
    dpi: int,
) -> bool:
    if not entries:
        return False
    sorted_entries = sorted(entries, key=lambda item: item.sort_key)
    x_positions = list(range(len(sorted_entries)))
    fig_width = max(8.0, len(sorted_entries) * 0.8)
    fig, ax = plt.subplots(figsize=(fig_width, 6))
    plotted = False
    for metric in metrics:
        values = [
            item.metrics.get(metric, math.nan)
            for item in sorted_entries
        ]
        if all(math.isnan(value) for value in values):
            continue
        ax.plot(
            x_positions,
            values,
            marker="o",
            linewidth=2,
            label=metric,
        )
        plotted = True
    if not plotted:
        plt.close(fig)
        return False
    ax.set_xticks(x_positions)
    ax.set_xticklabels(
        [item.scenario for item in sorted_entries],
        rotation=45,
        ha="right",
    )
    ax.set_ylabel("Milliseconds")
    ax.set_title(title)
    ax.grid(True, axis="y", linestyle="--", alpha=0.35)
    ax.legend(loc="upper left", bbox_to_anchor=(1.0, 1.0))
    fig.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=dpi)
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Plot summary avg metrics for Sepolia vs local runs."
    )
    parser.add_argument(
        "--captures-dir",
        type=Path,
        default=Path("captures"),
        help="Base directory containing the captures/ folders (default: ./captures).",
    )
    parser.add_argument(
        "--sepolia-subdir",
        default="sepolia",
        help="Subdirectory that stores Sepolia runs (default: sepolia).",
    )
    parser.add_argument(
        "--local-subdir",
        default="local",
        help="Subdirectory that stores local runs (default: local).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("captures") / "plots",
        help="Folder where the PNG charts will be saved (default: captures/plots).",
    )
    parser.add_argument(
        "--metrics",
        type=parse_metric_list,
        help="Comma separated list of metrics to plot "
        "(default: Min,P50,P90,P95,Max,Media).",
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=150,
        help="Resolution (dots per inch) for the exported charts (default: 150).",
    )
    parser.add_argument(
        "--style",
        default="seaborn-v0_8-colorblind",
        help="Matplotlib style to use (default: seaborn-v0_8-colorblind).",
    )
    parser.add_argument(
        "--show",
        action="store_true",
        help="Display the figures interactively after saving them.",
    )
    parser.add_argument(
        "--local-anvil-exclude-tests",
        type=parse_name_list,
        help="Comma separated test names to ignore in local/anvil charts "
        "(default: setupMediator,setupClients).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    plt = import_matplotlib(args.show)
    if args.style:
        try:
            plt.style.use(args.style)
        except OSError:
            print(f"[avviso] Stile matplotlib '{args.style}' non disponibile, uso quello di default.")
    metrics = args.metrics or DEFAULT_METRICS

    captures_dir = args.captures_dir
    sepolia_dir = captures_dir / args.sepolia_subdir
    local_dir = captures_dir / args.local_subdir

    sepolia_entries = collect_sepolia_entries(sepolia_dir)
    local_entries = collect_local_entries(local_dir)
    local_anvil_exclusions = (
        args.local_anvil_exclude_tests if args.local_anvil_exclude_tests is not None else DEFAULT_LOCAL_ANVIL_EXCLUDE
    )

    if not sepolia_entries and not local_entries:
        raise SystemExit(
            f"Nessun file summary trovato in {sepolia_dir} o {local_dir}."
        )

    combined_entries = filter_entries(sepolia_entries + local_entries, local_anvil_exclusions)
    groups = group_entries(combined_entries)
    saved_any = False
    for (network, component), entries in sorted(groups.items()):
        output_name = f"{network}_{component}_summary.png"
        output_path = args.output_dir / output_name
        title = f"{network.title()} - {component.title()} ({len(entries)} runs)"
        if plot_group(plt, entries, metrics, output_path, title, args.dpi):
            saved_any = True
            print(f"[ok] Grafico salvato in {output_path}")
        else:
            print(
                f"[skip] Nessuna metrica disponibile per {network}-{component}, salto il grafico."
            )

    if args.show and saved_any:
        plt.show()


if __name__ == "__main__":
    main()
