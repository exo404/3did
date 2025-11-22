set -euo pipefail

if ! command -v tcpdump >/dev/null 2>&1; then
  echo "Error: tcpdump is not installed or not in PATH." >&2
  exit 1
fi

IFACE="${1:-any}"
OUTPUT_DIR="${2:-captures/sepolia}"
TEST_NAME="${3:-default}"
DAY="${4:-$(date +%Y-%m-%d)}"
RUN_SLOT="${5:-1}"

mkdir -p "${OUTPUT_DIR}"

FILE_NAME="${TEST_NAME}_${DAY}_run${RUN_SLOT}.pcap"
CAPTURE_PATH="${OUTPUT_DIR}/${FILE_NAME}"
: "${CAPTURE_FILTER:=}"
if [[ -z "${CAPTURE_FILTER}" ]]; then
  CAPTURE_FILTER="tcp port 3000 or tcp port 8545 or tcp port 443"
fi
FILTER="${CAPTURE_FILTER}"

CMD_PREFIX=()
if [[ "${EUID}" -ne 0 ]]; then
  CMD_PREFIX=(sudo)
fi

echo "Starting capture on '${IFACE}' (day ${DAY}, run ${RUN_SLOT}) -> ${CAPTURE_PATH}"
echo "Applied filters: ${FILTER}"
echo "Press Ctrl+C to stop the capture."

"${CMD_PREFIX[@]}" tcpdump -i "${IFACE}" -s 0 -nn -w "${CAPTURE_PATH}" ${FILTER}

echo "Capture complete."
