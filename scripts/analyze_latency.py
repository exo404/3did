'''
python3 analyze_latency.py ../captures/setupMediator_<delay>.pcap --details 
python3 analyze_latency.py ../captures/setupClients_<delay>.pcap --details 
python3 analyze_latency.py ../captures/testSdr_<delay>.pcap --details 
'''
import argparse
import csv
import json
import re
import shutil
import statistics
import string
import subprocess
import sqlite3
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

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
    rpc_method: Optional[str] = None
    rpc_id: Optional[str] = None
    app_actor: Optional[str] = None
    related_payload_id: Optional[str] = None
    mediator_delta_ms: Optional[float] = None


@dataclass
class HttpRequestInfo:
    method: Optional[str]
    host: Optional[str]
    uri: Optional[str]
    rpc_method: Optional[str]
    rpc_id: Optional[str]
    src_ip: Optional[str]
    src_port: Optional[str]
    dst_ip: Optional[str]
    dst_port: Optional[str]


@dataclass
class MediatorMessage:
    id: str
    msg_type: Optional[str]
    timestamp: float
    from_did: Optional[str]
    to_did: Optional[str]
    matched: bool = False


RESPONSE_MESSAGE_TYPES = {
    "https://didcomm.org/routing/2.0/forward",
    "https://didcomm.org/messagepickup/3.0/messages-received",
}


def normalize_payload(payload: str) -> str:
    if not payload:
        return ""
    stripped = payload.strip()
    if not stripped:
        return ""
    candidate = (
        stripped.replace(":", "")
        .replace("\n", "")
        .replace("\r", "")
        .replace(" ", "")
    )
    if candidate and all(ch in string.hexdigits for ch in candidate):
        if len(candidate) % 2 == 0:
            try:
                text = bytes.fromhex(candidate).decode("utf-8", errors="ignore")
                if text.strip():
                    return text.strip()
            except ValueError:
                pass
    return stripped


def extract_rpc_info(payload: str) -> Tuple[Optional[str], Optional[str]]:
    if not payload:
        return None, None
    payload = normalize_payload(payload)
    if not payload:
        return None, None
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        method_match = re.search(r'"method"\s*:\s*"([^"]+)"', payload)
        id_match = re.search(r'"id"\s*:\s*("[^"]+"|\d+)', payload)
        method = method_match.group(1) if method_match else None
        raw_id = id_match.group(1) if id_match else None
        rpc_id = raw_id.strip('"') if raw_id and raw_id.startswith('"') else raw_id
        return method, rpc_id
    if isinstance(data, dict):
        method = data.get("method")
        rpc_id = data.get("id")
    elif isinstance(data, list) and data:
        first = data[0] if isinstance(data[0], dict) else {}
        method = first.get("method")
        rpc_id = first.get("id")
    else:
        method = None
        rpc_id = None
    if method is not None:
        method = str(method)
    if rpc_id is not None:
        rpc_id = str(rpc_id)
    return method, rpc_id
    
def check_tshark() -> None:
    if shutil.which("tshark") is None:
        raise RuntimeError(
            "tshark not found in PATH. Install it (e.g. `sudo apt install tshark`)."
        )


def collect_requests(pcap: Path, port: int) -> Dict[str, HttpRequestInfo]:
    fields = [
        "frame.number",
        "http.request.method",
        "http.host",
        "http.request.uri",
        "http.file_data",
        "ip.src",
        "tcp.srcport",
        "ip.dst",
        "tcp.dstport",
    ]
    cmd = [
        "tshark",
        "-r",
        str(pcap),
        "-Y",
        f"http.request && tcp.dstport == {port}",
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
    requests: Dict[str, HttpRequestInfo] = {}
    for line in result.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) != len(fields):
            continue
        payload = parts[4] if len(parts) > 4 else ""
        rpc_method, rpc_id = extract_rpc_info(payload)
        requests[parts[0]] = HttpRequestInfo(
            method=parts[1] or None,
            host=parts[2] or None,
            uri=parts[3] or None,
            rpc_method=rpc_method,
            rpc_id=rpc_id,
            src_ip=parts[5] or None,
            src_port=parts[6] or None,
            dst_ip=parts[7] or None,
            dst_port=parts[8] or None,
        )
    return requests


def parse_timestamp(value: Optional[str]) -> Optional[float]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


def load_mediator_messages(db_path: Path) -> Tuple[List[MediatorMessage], Optional[str]]:
    if not db_path.exists():
        return [], None
    connection = sqlite3.connect(str(db_path))
    connection.row_factory = sqlite3.Row
    try:
        cursor = connection.cursor()
        mediator_row = cursor.execute(
            "SELECT did FROM identifier WHERE alias='mediator' LIMIT 1"
        ).fetchone()
        mediator_did = mediator_row["did"] if mediator_row else None
        query = "SELECT id, type, saveDate, createdAt, fromDid, toDid FROM message"
        params: Tuple[object, ...] = ()
        if mediator_did:
            query += " WHERE toDid = ? ORDER BY saveDate"
            params = (mediator_did,)
        else:
            query += " ORDER BY saveDate"
        messages: List[MediatorMessage] = []
        for row in cursor.execute(query, params):
            timestamp = parse_timestamp(row["saveDate"]) or parse_timestamp(
                row["createdAt"]
            )
            if timestamp is None:
                continue
            messages.append(
                MediatorMessage(
                    id=row["id"],
                    msg_type=row["type"],
                    timestamp=timestamp,
                    from_did=row["fromDid"],
                    to_did=row["toDid"],
                )
            )
        return messages, mediator_did
    finally:
        connection.close()


def annotate_with_mediator(
    records: List[LatencyRecord],
    messages: List[MediatorMessage],
    mediator_did: Optional[str],
) -> None:
    if not messages:
        return
    messages_sorted = sorted(messages, key=lambda msg: msg.timestamp)
    tolerance = 5.0
    msg_index = 0
    for rec in sorted(records, key=lambda r: r.timestamp):
        request_time = rec.timestamp - rec.latency
        best_match: Optional[MediatorMessage] = None
        best_idx = msg_index
        best_diff = tolerance
        for idx in range(msg_index, len(messages_sorted)):
            msg = messages_sorted[idx]
            if msg.matched:
                continue
            diff = abs(msg.timestamp - request_time)
            if diff <= best_diff:
                best_match = msg
                best_diff = diff
                best_idx = idx
            if msg.timestamp > request_time + tolerance:
                break
        if best_match:
            best_match.matched = True
            msg_index = best_idx
            rec.rpc_method = best_match.msg_type or rec.rpc_method
            rec.rpc_id = best_match.id or rec.rpc_id
            rec.related_payload_id = rec.rpc_id
            rec.mediator_delta_ms = 0.0
            rec.app_actor = best_match.from_did or rec.app_actor
            swap_needed = False
            if mediator_did and best_match.from_did == mediator_did:
                swap_needed = True
            if best_match.msg_type in RESPONSE_MESSAGE_TYPES:
                swap_needed = True
            if swap_needed:
                rec.src_ip, rec.dst_ip = rec.dst_ip, rec.src_ip
                rec.src_port, rec.dst_port = rec.dst_port, rec.src_port


def link_rpc_to_mediator(
    anvil_records: List[LatencyRecord],
    mediator_records: List[LatencyRecord],
    tolerance: float = 5.0,
) -> None:
    if not anvil_records or not mediator_records:
        return
    mediator_sorted = sorted(mediator_records, key=lambda r: r.timestamp)
    mediator_times = [msg.timestamp for msg in mediator_sorted]
    import bisect
    for rec in sorted(anvil_records, key=lambda r: r.timestamp):
        pos = bisect.bisect_right(mediator_times, rec.timestamp) - 1
        best = None
        best_diff = float("inf")
        for offset in (0, 1):
            idx = pos + offset
            if 0 <= idx < len(mediator_sorted):
                cand = mediator_sorted[idx]
                diff = rec.timestamp - cand.timestamp
                if diff < 0:
                    continue
                if diff < best_diff:
                    best = cand
                    best_diff = diff
        if best and best_diff <= tolerance:
            rec.related_payload_id = best.rpc_id
            rec.mediator_delta_ms = best_diff * 1000.0


def run_tshark_fields(
    pcap: Path, port: int, requests: Dict[str, HttpRequestInfo]
) -> Iterable[LatencyRecord]:
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
        "http.request_in",
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
            request_frame = parts[11].strip() if len(parts) > 11 else ""
            if request_frame:
                request_frame = request_frame.split(",")[0]
            request_info = requests.get(request_frame)
            rpc_method = request_info.rpc_method if request_info else None
            rpc_id = request_info.rpc_id if request_info else None
            method = parts[6] or (request_info.method if request_info else "")
            host = parts[7] or (request_info.host if request_info else "")
            uri = parts[8] or (request_info.uri if request_info else "")
            src_ip = request_info.src_ip if request_info and request_info.src_ip else parts[2]
            src_port = request_info.src_port if request_info and request_info.src_port else parts[3]
            dst_ip = request_info.dst_ip if request_info and request_info.dst_ip else parts[4]
            dst_port = request_info.dst_port if request_info and request_info.dst_port else parts[5]
            yield LatencyRecord(
                frame_number=parts[0],
                timestamp=float(parts[1]),
                src_ip=src_ip,
                src_port=src_port,
                dst_ip=dst_ip,
                dst_port=dst_port,
                method=method,
                host=host,
                uri=uri,
                status=parts[9],
                latency=float(parts[10]),
                rpc_method=rpc_method,
                rpc_id=rpc_id,
            )
        except ValueError:
            continue

def percentile(values: List[float], pct: float) -> Optional[float]:
    if not values:
        return None
    index = max(0, min(len(values) - 1, int(round((pct / 100) * (len(values) - 1)))))
    return sorted(values)[index]

def compute_summary(records: List[LatencyRecord]) -> Dict[str, Any]:
    summary: Dict[str, Any] = {"count": len(records)}
    if not records:
        summary.update(
            {
                "min": None,
                "median": None,
                "p90": None,
                "p95": None,
                "max": None,
                "avg": None,
                "method_counts": [],
            }
        )
        return summary
    latencies = [rec.latency for rec in records]
    latencies.sort()
    avg = statistics.mean(latencies)
    median = statistics.median(latencies)
    method_counts = Counter(rec.rpc_method for rec in records if rec.rpc_method)
    summary.update(
        {
            "min": latencies[0],
            "median": median,
            "p90": percentile(latencies, 90),
            "p95": percentile(latencies, 95),
            "max": latencies[-1],
            "avg": avg,
            "method_counts": method_counts.most_common(),
        }
    )
    return summary




def save_summary_csv(summary: Dict[str, Any], pcap: Path, port: int) -> Path:
    csv_path = ''
    if port == 3000:
        csv_path = pcap.parent / f"{pcap.stem}_mediator_summary.csv"
    else:
        csv_path = pcap.parent / f"{pcap.stem}_anvil_summary.csv"
    rows = [
        ("Metric", "Value"),
        ("Conteggio", summary["count"]),
    ]
    if summary["count"]:
        def fmt(value: Optional[float]) -> str:
            return f"{value*1000:.2f}" if value is not None else "-"

        rows.extend(
            [
                ("Min (ms)", fmt(summary["min"])),
                ("P50 (ms)", fmt(summary["median"])),
                ("P90 (ms)", fmt(summary["p90"])),
                ("P95 (ms)", fmt(summary["p95"])),
                ("Max (ms)", fmt(summary["max"])),
                ("Media (ms)", fmt(summary["avg"])),
            ]
        )
        for method, count in summary["method_counts"]:
            rows.append((f"Operazione: {method}", str(count)))
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerows(rows)
    return csv_path


def prepare_table(records: List[LatencyRecord]) -> Tuple[Tuple[str, ...], List[List[str]]]:
    headers = (
        "Frame",
        "Timestamp",
        "Src",
        "Dst",
        "Metodo",
        "URI",
        "Status",
        "Operazione",
        "Payload ID",
        "Payload Mediator",
        "Δ Mediator (ms)",
        "Latency (ms)",
    )
    rows = [
        [
            rec.frame_number,
            f"{rec.timestamp:.6f}",
            f"{rec.src_ip}:{rec.src_port}",
            f"{rec.dst_ip}:{rec.dst_port}",
            rec.method or "-",
            rec.uri or "-",
            rec.status or "-",
            rec.rpc_method or "-",
            rec.rpc_id or "-",
            rec.related_payload_id or "-",
            f"{rec.mediator_delta_ms:.2f}" if rec.mediator_delta_ms is not None else "-",
            f"{rec.latency*1000:.2f}",
        ]
        for rec in records
    ]
    return headers, rows


def save_csv(records: List[LatencyRecord], pcap: Path, port: int) -> Optional[Path]:
    if not records:
        return None
    headers, rows = prepare_table(records)
    csv_path = ''
    if port == 3000:
        csv_path = pcap.parent / f"{pcap.stem}_mediator.csv"
    else:
        csv_path = pcap.parent / f"{pcap.stem}_anvil.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(headers)
        writer.writerows(rows)
    return csv_path

def main() -> None:
    parser = argparse.ArgumentParser(
        description="ANALYZE LATENCY FROM PCAP FILES",
    )
    parser.add_argument("pcap", type=Path, help="CAPTURES PATH .pcap/.pcapng")
    parser.add_argument(
        "--details",
        action="store_true",
        help="SAVE ALL THE REQUEST.",
    )
    parser.add_argument(
        "--mediator-db",
        type=Path,
        help="DATABASE PATH",
    )
    args = parser.parse_args()
    if not args.pcap.exists():
        raise FileNotFoundError(f"CAPTURES NOT FOUND: {args.pcap}")
    check_tshark()
    mediator_messages: List[MediatorMessage] = []
    mediator_did: Optional[str] = None
    mediator_db_path: Optional[Path] = args.mediator_db
    if mediator_db_path is None:
        default_db = Path("mediator.sqlite")
        if default_db.exists():
            mediator_db_path = default_db
    if mediator_db_path:
        if mediator_db_path.exists():
            mediator_messages, mediator_did = load_mediator_messages(mediator_db_path)
        elif args.mediator_db:
            print(f"[Avviso] DATABASE NOT FOUND: {mediator_db_path}")
    targets = [
        ("Mediator (port 3000)", 3000),
        ("Anvil (port 8545)", 8545),
    ]
    port_results: Dict[int, Tuple[str, List[LatencyRecord]]] = {}
    for label, port in targets:
        requests = collect_requests(args.pcap, port)
        records = list(run_tshark_fields(args.pcap, port, requests))
        if port == 3000 and mediator_messages:
            annotate_with_mediator(records, mediator_messages, mediator_did)
        port_results[port] = (label, records)
    if 3000 in port_results and 8545 in port_results:
        link_rpc_to_mediator(port_results[8545][1], port_results[3000][1])
    for label, port in targets:
        label_out, records = port_results.get(port, (label, []))
        summary = compute_summary(records)
        save_summary_csv(summary, args.pcap, port)
        if args.details:
            saved_csv = save_csv(records, args.pcap, port)
            if saved_csv:
                print(f"\n CSV SAVED: {saved_csv}")
if __name__ == "__main__":
    main()
