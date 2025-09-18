```mermaid
%%{init: {"theme":"base", "themeVariables": {
  "background":"#000000",
  "primaryColor":"#000000",
  "primaryTextColor":"#ffffff",
  "primaryBorderColor":"#ffffff",
  "lineColor":"#ffffff",
  "secondaryColor":"#000000",
  "tertiaryColor":"#000000"
}}}%%

sequenceDiagram
  autonumber
  participant S as Sender
  participant T as DIDComm Transport
  participant M as Mediator
  participant Q as Queue/Store
  participant R as Recipient

  rect rgb(30,30,30)
    note over S,M: Routing 2.0 (forward)
    S->>T: DIDComm msg (type: routing/2.0/forward)<br/>body: { next: DID_r, forwarded_msg }
    T->>M: Deliver forward
    M->>Q: getLiveDelivery(DID_r)?
    alt Live delivery attivo
      Q-->>M: true
      M-->>T: Reply (type: messagepickup/3.0/message-delivery)<br/>body: { messages:[{ id, message: forwarded_msg }] }
      T-->>S: message-delivery (sync via return_route)
    else Non attivo (accoda)
      Q-->>M: false
      M->>Q: enqueue(DID_r, forwarded_msg)
      Q-->>M: { id }
      M-->>T: (nessuna reply oltre a 202 trasporto)
      T-->>S: ACK trasporto (es. HTTP 202)
    end
  end
  ```
