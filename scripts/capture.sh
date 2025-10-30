set -euo pipefail

if ! command -v tcpdump >/dev/null 2>&1; then
  echo "Error: tcpdump is not installed or not in PATH." >&2
  exit 1
fi

IFACE="${1:-lo}"
OUTPUT_DIR="${2:-captures}"
TEST_NAME="${3:-default}"
DELAY="${4:-0ms}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE_NAME="${TEST_NAME}_${DELAY}.pcap"

mkdir -p "${OUTPUT_DIR}"

CAPTURE_PATH="../${OUTPUT_DIR}/${FILE_NAME}"
FILTER='tcp port 3000 or tcp port 8545'

CMD_PREFIX=()
if [[ "${EUID}" -ne 0 ]]; then
  CMD_PREFIX=(sudo)
fi

echo "Starting capture on interface '${IFACE}' -> ${CAPTURE_PATH}"
echo "Applied filters: ${FILTER}"
echo "Press Ctrl+C to stop the capture."

"${CMD_PREFIX[@]}" tcpdump -i "${IFACE}" -s 0 -nn -w "${CAPTURE_PATH}" ${FILTER}

echo "Capture complete."
