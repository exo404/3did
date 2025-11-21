#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Iterable, List, Sequence

MPL_DIR = Path("/tmp/mplconfig")
MPL_DIR.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MPL_DIR))

import matplotlib
import pandas as pd

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402


DEFAULT_STYLE = "seaborn-v0_8-colorblind"
LOCAL_METRICS = ["Min", "P50", "Max", "Media"]
SEPOLIA_METRICS = ["Min", "P50", "Max", "Media"]


def clean_columns(columns: Iterable[str]) -> List[str]:
    cleaned: List[str] = []
    for col in columns:
        cleaned.append(col.replace("}", "").replace("{", "").strip())
    return cleaned


def load_table(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path)
    df.columns = clean_columns(df.columns)
    if "Data" in df.columns:
        df["Data"] = df["Data"].ffill()
    return df


def plot_local(df: pd.DataFrame, metrics: Sequence[str], output: Path, title: str, x_label: str) -> None:
    fig, ax = plt.subplots(figsize=(8, 5))
    x = df["Ritardo"]
    for metric in metrics:
        if metric not in df:
            continue
        ax.plot(x, df[metric], marker="o", linewidth=2, label=metric)
    ax.set_xlabel(x_label)
    ax.set_ylabel("Latenza (s)")
    ax.set_title(title)
    ax.grid(True, axis="y", linestyle="--", alpha=0.35)
    ax.legend(loc="upper left", bbox_to_anchor=(1.0, 1.0))
    fig.tight_layout()
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output, dpi=150)
    plt.close(fig)
    print(f"[ok] Grafico salvato in {output}")


def plot_sepolia(df: pd.DataFrame, metrics: Sequence[str], output: Path, title: str) -> None:
    fig, ax = plt.subplots(figsize=(12, 6))
    labels = [f"{row['Data']} {row['Ora']}" for _, row in df.iterrows()]
    x = list(range(len(labels)))
    for metric in metrics:
        if metric not in df:
            continue
        ax.plot(x, df[metric], marker="o", linewidth=2, label=metric)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_xlabel("Data / Ora")
    ax.set_ylabel("Latenza (s)")
    ax.set_title(title)
    ax.grid(True, axis="y", linestyle="--", alpha=0.35)
    ax.legend(loc="upper left", bbox_to_anchor=(1.0, 1.0))
    fig.tight_layout()
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output, dpi=150)
    plt.close(fig)
    print(f"[ok] Grafico salvato in {output}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Genera i grafici per i 4 file Excel risultati-*.xlsx."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("captures") / "excel_plots",
        help="Cartella di destinazione dei PNG (default: captures/excel_plots).",
    )
    parser.add_argument(
        "--style",
        default=DEFAULT_STYLE,
        help=f"Stile matplotlib da usare (default: {DEFAULT_STYLE}).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.style:
        try:
            plt.style.use(args.style)
        except OSError:
            print(f"[avviso] Stile '{args.style}' non disponibile, uso quello di default.")

    output_dir: Path = args.output_dir

    # Local tables
    local_mediator_df = load_table(Path("risultati-locale-mediator.xlsx"))
    plot_local(
        local_mediator_df,
        LOCAL_METRICS,
        output=output_dir / "local_mediator.png",
        title=" Test Locali - Mediatore",
        x_label="Ritardo (ms)",
    )

    local_rpc_df = load_table(Path("risultati-locale-rpc.xlsx"))
    plot_local(
        local_rpc_df,
        LOCAL_METRICS,
        output=output_dir / "local_rpc.png",
        title=" Test Locali - Chiamate RPC",
        x_label="Ritardo (ms)",
    )

    # Sepolia tables
    sepolia_mediator_df = load_table(Path("risultati-sepolia-mediator.xlsx"))
    plot_sepolia(
        sepolia_mediator_df,
        SEPOLIA_METRICS,
        output=output_dir / "sepolia_mediator.png",
        title="Test Sepolia - Mediatore",
    )

    sepolia_rpc_df = load_table(Path("risultati-sepolia-rpc.xlsx"))
    plot_sepolia(
        sepolia_rpc_df,
        SEPOLIA_METRICS,
        output=output_dir / "sepolia_rpc.png",
        title="Test Sepolia - Chiamate RPC",
    )


if __name__ == "__main__":
    main()
