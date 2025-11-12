## Clean
sudo tc qdisc del dev lo root 2>/dev/null || true

## Root with priority classes
sudo tc qdisc add dev lo root handle 1: prio

## Band 1:1 for port 85454
sudo tc qdisc add dev lo parent 1:1 handle 20: netem delay 74ms 

## IPv4 TCP sport 8545 filter (Anvil output)
sudo tc filter add dev lo protocol ip parent 1: prio 1 u32 \
  match ip protocol 6 0xff match ip sport 8545 0xffff flowid 1:1

## Change the delay

### P50
sudo tc qdisc change dev lo parent 1:1 handle 20: netem delay 74ms 

### P95
sudo tc qdisc change dev lo parent 1:1 handle 20: netem delay 211ms 

### P99
sudo tc qdisc change dev lo parent 1:1 handle 20: netem delay 317ms 

## Verify the setup
tc -s qdisc show dev lo
tc -s filter show dev lo parent 1:

## Delete queues
sudo tc qdisc del dev lo root
