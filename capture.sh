#!/usr/bin/env bash
set -euo pipefail

# Capture DIDComm mediator traffic (TCP 3000) and Anvil Sepolia fork traffic (TCP 8545)
# Usage:
#   ./capture.sh [interface] [output_directory]
# Example:
#   ./capture.sh lo captures

if ! command -v tcpdump >/dev/null 2>&1; then
  echo "Errore: tcpdump non è installato o non è nel PATH." >&2
  exit 1
fi

IFACE="${1:-lo}"
OUTPUT_DIR="${2:-captures}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE_NAME="mediator_anvil_${TIMESTAMP}.pcap"

mkdir -p "${OUTPUT_DIR}"

CAPTURE_PATH="${OUTPUT_DIR}/${FILE_NAME}"
FILTER='tcp port 3000 or tcp port 8545'

CMD_PREFIX=()
if [[ "${EUID}" -ne 0 ]]; then
  CMD_PREFIX=(sudo)
fi

echo "Avvio cattura su interfaccia '${IFACE}' -> ${CAPTURE_PATH}"
echo "Filtri applicati: ${FILTER}"
echo "Premi Ctrl+C per terminare la cattura."

"${CMD_PREFIX[@]}" tcpdump -i "${IFACE}" -s 0 -nn -w "${CAPTURE_PATH}" ${FILTER}

echo "Cattura completata. Apri ${CAPTURE_PATH} con Wireshark o tshark per l'analisi."
