#!/usr/bin/env python3
"""
Analizza i file PCAP generati dallo script di cattura e calcola le latenze
per il traffico HTTP diretto al mediatore (porta 3000) e al fork Anvil (porta 8545).
Requisiti:
  - tshark installato e disponibile nel PATH
Utilizzo:
  python analyze_latency.py captures/mediator_anvil_<timestamp>.pcap [--details]
"""
import argparse
import shutil
import statistics
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional
@dataclass
class LatencyRecord:
    frame_number: str
    timestamp: float
    src_ip: str
    src_port: str
    dst_ip: str
    dst_port: str
    method: str
    host: str
    uri: str
    status: str
    latency: float
def check_tshark() -> None:
    if shutil.which("tshark") is None:
        raise RuntimeError(
            "tshark non è stato trovato nel PATH. Installalo (ad es. `sudo apt install tshark`)."
        )
def run_tshark_fields(pcap: Path, port: int) -> Iterable[LatencyRecord]:
    fields = [
        "frame.number",
        "frame.time_epoch",
        "ip.src",
        "tcp.srcport",
        "ip.dst",
        "tcp.dstport",
        "http.request.method",
        "http.host",
        "http.request.uri",
        "http.response.code",
        "http.time",
    ]
    cmd = [
        "tshark",
        "-r",
        str(pcap),
        "-Y",
        f"http.time && tcp.port == {port}",
        "-T",
        "fields",
        "-E",
        "separator=\t",
        "-E",
        "occurrence=f",
    ]
    for field in fields:
        cmd.extend(["-e", field])
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    for line in result.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) != len(fields):
            continue
        try:
            yield LatencyRecord(
                frame_number=parts[0],
                timestamp=float(parts[1]),
                src_ip=parts[2],
                src_port=parts[3],
                dst_ip=parts[4],
                dst_port=parts[5],
                method=parts[6],
                host=parts[7],
                uri=parts[8],
                status=parts[9],
                latency=float(parts[10]),
            )
        except ValueError:
            continue
def percentile(values: List[float], pct: float) -> Optional[float]:
    if not values:
        return None
    index = max(0, min(len(values) - 1, int(round((pct / 100) * (len(values) - 1)))))
    return sorted(values)[index]
def summarize(records: List[LatencyRecord]) -> None:
    if not records:
        print("  Nessun messaggio rilevato.")
        return
    latencies = [rec.latency for rec in records]
    latencies.sort()
    avg = statistics.mean(latencies)
    median = statistics.median(latencies)
    def fmt(value: Optional[float]) -> str:
        return f"{value*1000:.2f} ms" if value is not None else "-"
    print(f"  Conteggio : {len(latencies)}")
    print(f"  Min       : {fmt(latencies[0])}")
    print(f"  P50       : {fmt(median)}")
    print(f"  P90       : {fmt(percentile(latencies, 90))}")
    print(f"  P95       : {fmt(percentile(latencies, 95))}")
    print(f"  Max       : {fmt(latencies[-1])}")
    print(f"  Media     : {fmt(avg)}")
def print_details(records: List[LatencyRecord]) -> None:
    if not records:
        print("  Nessun dettaglio disponibile.")
        return
    header = (
        "Frame",
        "Timestamp",
        "Src",
        "Dst",
        "Metodo",
        "URI",
        "Status",
        "Latency (ms)",
    )
    print("\t".join(header))
    for rec in records:
        print(
            "\t".join(
                [
                    rec.frame_number,
                    f"{rec.timestamp:.6f}",
                    f"{rec.src_ip}:{rec.src_port}",
                    f"{rec.dst_ip}:{rec.dst_port}",
                    rec.method or "-",
                    rec.uri or "-",
                    rec.status or "-",
                    f"{rec.latency*1000:.2f}",
                ]
            )
        )
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Analizza le latenze HTTP di mediatore (porta 3000) e Anvil (porta 8545)."
    )
    parser.add_argument("pcap", type=Path, help="Percorso al file di cattura .pcap/.pcapng")
    parser.add_argument(
        "--details",
        action="store_true",
        help="Stampa tutte le richieste con la relativa latenza.",
    )
    args = parser.parse_args()
    if not args.pcap.exists():
        raise FileNotFoundError(f"File di cattura non trovato: {args.pcap}")
    check_tshark()
    targets = [
        ("Mediator (porta 3000)", 3000),
        ("Anvil (porta 8545)", 8545),
    ]
    for label, port in targets:
        print(f"\n=== {label} ===")
        records = list(run_tshark_fields(args.pcap, port))
        summarize(records)
        if args.details:
            print("\nDettaglio richieste:")
            print_details(records)
if __name__ == "__main__":
    main()
