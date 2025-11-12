set -euo pipefail

if ! command -v tcpdump >/dev/null 2>&1; then
  echo "Error: tcpdump is not installed or not in PATH." >&2
  exit 1
fi

IFACE="${1:-any}"
BASE_OUTPUT_DIR="${2:-captures/sepolia}"
TEST_NAME="${3:-default}"
DAY="${4:-$(date +%Y-%m-%d)}"
RUN_SLOT="${5:-1}"

if [[ ! "${DAY}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Error: DAY must be in YYYY-MM-DD format (received '${DAY}')." >&2
  exit 1
fi

if [[ ! "${RUN_SLOT}" =~ ^[123]$ ]]; then
  echo "Error: RUN_SLOT must be 1, 2 or 3 to schedule the three daily tests (received '${RUN_SLOT}')." >&2
  exit 1
fi

OUTPUT_DIR="${BASE_OUTPUT_DIR}/${DAY}"
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
