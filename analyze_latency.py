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
import json
import math
import re
import shutil
import statistics
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional


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
    operation: str


def check_tshark() -> None:
    if shutil.which("tshark") is None:
        raise RuntimeError(
            "tshark non è stato trovato nel PATH. Installalo (ad es. `sudo apt install tshark`)."
        )


def _get_first(layer: Dict[str, List[str]], key: str) -> Optional[str]:
    value = layer.get(key)
    if isinstance(value, list) and value:
        return value[0]
    if isinstance(value, str):
        return value
    return None


def _get_concat(layer: Dict[str, List[str]], key: str) -> str:
    value = layer.get(key, [])
    if isinstance(value, list):
        return "".join(value)
    if isinstance(value, str):
        return value
    return ""


def _load_http_packets(pcap: Path, port: int) -> List[dict]:
    cmd = [
        "tshark",
        "-r",
        str(pcap),
        "-Y",
        f"http && tcp.port == {port}",
        "-T",
        "json",
    ]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    data = result.stdout.strip()
    if not data:
        return []
    try:
        return json.loads(data)
    except json.JSONDecodeError:
        raise RuntimeError(
            "Impossibile analizzare l'output di tshark. Verifica che il file PCAP sia valido."
        )


def _extract_json(body: str) -> Optional[dict]:
    body = body.strip()
    if not body:
        return None
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return None


def _extract_mediator_operation(body: str) -> str:
    data = _extract_json(body)
    if isinstance(data, dict):
        if "id" in data and isinstance(data["id"], str):
            return data["id"]
        # Some responses may embed the DIDComm message under message/content keys
        for candidate in ("message", "payload"):
            nested = data.get(candidate)
            if isinstance(nested, dict) and isinstance(nested.get("id"), str):
                return nested["id"]
        # Check attachments -> data -> json -> id (ReturnRoute responses etc.)
        attachments = data.get("attachments")
        if isinstance(attachments, list):
            for attachment in attachments:
                if not isinstance(attachment, dict):
                    continue
                att_json = (
                    attachment.get("data", {})
                    if isinstance(attachment.get("data"), dict)
                    else {}
                )
                json_payload = att_json.get("json")
                if isinstance(json_payload, dict) and isinstance(json_payload.get("id"), str):
                    return json_payload["id"]
    # Fallback: look for plain-text DIDComm id pattern
    match = re.search(r'"id"\s*:\s*"([^"]+)"', body)
    if match:
        return match.group(1)
    return "unknown"


def _extract_anvil_operation(body: str) -> str:
    data = _extract_json(body)
    if isinstance(data, dict):
        method = data.get("method")
        if isinstance(method, str):
            return method
    return "unknown"


def _gather_latency_records(pcap: Path, port: int) -> List[LatencyRecord]:
    packets = _load_http_packets(pcap, port)
    requests: Dict[str, dict] = {}
    records: List[LatencyRecord] = []

    for packet in packets:
        layers = packet.get("_source", {}).get("layers", {})
        frame_layer = layers.get("frame", {})
        http_layer = layers.get("http", {})
        ip_layer = layers.get("ip", {})
        tcp_layer = layers.get("tcp", {})

        frame_number = _get_first(frame_layer, "frame.number")
        timestamp_raw = _get_first(frame_layer, "frame.time_epoch")
        timestamp = timestamp_raw if timestamp_raw else ''
        src_ip = _get_first(ip_layer, "ip.src") or ""
        dst_ip = _get_first(ip_layer, "ip.dst") or ""
        src_port = _get_first(tcp_layer, "tcp.srcport") or ""
        dst_port = _get_first(tcp_layer, "tcp.dstport") or ""

        if "http.request.method" in http_layer:
            method = _get_first(http_layer, "http.request.method") or "-"
            host = _get_first(http_layer, "http.host") or "-"
            uri = (
                _get_first(http_layer, "http.request.uri")
                or _get_first(http_layer, "http.request.full_uri")
                or "-"
            )
            body = (
                _get_concat(http_layer, "http.file_data")
                or _get_concat(layers.get("json", {}), "json.value")
                or _get_concat(layers.get("media", {}), "media.text")
                or _get_concat(layers.get("data-text-lines", {}), "data-text-lines.text")
            )

            if port == 3000:
                operation = _extract_mediator_operation(body)
            else:
                operation = _extract_anvil_operation(body)

            requests[frame_number] = {
                "timestamp": timestamp,
                "src_ip": src_ip,
                "src_port": src_port,
                "dst_ip": dst_ip,
                "dst_port": dst_port,
                "method": method,
                "host": host,
                "uri": uri,
                "operation": operation,
            }
        elif "http.response.code" in http_layer:
            status = _get_first(http_layer, "http.response.code") or "-"
            latency_raw = _get_first(http_layer, "http.time")
            try:
                latency = float(latency_raw) if latency_raw is not None else float("nan")
            except ValueError:
                latency = float("nan")
            req_frame = _get_first(http_layer, "http.request_in")
            req_info = requests.get(req_frame or "")
            if not req_info:
                continue
            records.append(
                LatencyRecord(
                    frame_number=frame_number or "-",
                    timestamp=req_info["timestamp"],
                    src_ip=req_info["src_ip"],
                    src_port=req_info["src_port"],
                    dst_ip=req_info["dst_ip"],
                    dst_port=req_info["dst_port"],
                    method=req_info["method"],
                    host=req_info["host"],
                    uri=req_info["uri"],
                    status=status,
                    latency=latency,
                    operation=req_info["operation"],
                )
            )

    return records


def percentile(values: List[float], pct: float) -> Optional[float]:
    if not values:
        return None
    index = max(0, min(len(values) - 1, int(round((pct / 100) * (len(values) - 1)))))
    return sorted(values)[index]


def summarize(records: List[LatencyRecord]) -> None:
    latencies = [rec.latency for rec in records if not math.isnan(rec.latency)]
    if not latencies:
        print("  Nessun messaggio rilevato.")
        return

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
        "Operazione",
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
                    rec.operation or "-",
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
        records = _gather_latency_records(args.pcap, port)
        summarize(records)
        if args.details:
            print("\nDettaglio richieste:")
            print_details(records)


if __name__ == "__main__":
    main()
