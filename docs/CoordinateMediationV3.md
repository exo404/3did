sequenceDiagram
  autonumber
  participant R as Recipient Agent
  participant T as DIDComm Transport
  participant M as Mediator Agent
  participant S as Mediator Store/Policy

  rect rgb(245,245,245)
    note over R,M: Thread: mediate-request (thid = msg_1)
    R->>T: DIDComm msg (type: mediate-request)<br/>headers: return_route=all<br/>from: DID_r, to: DID_m
    T->>M: Deliver mediate-request

    M->>S: Policy.shouldGrant(DID_r)?
    alt Grant
      S-->>M: true
      M->>S: Store.grantFor(DID_r)
      M->>S: Store.getRoutingDids() → [routing_did...]
      M-->>T: Reply (type: mediate-grant)<br/>thid: msg_1<br/>body: { routing_did: [...] }
      T-->>R: mediate-grant (sync via return_route)
    else Deny
      S-->>M: false
      M-->>T: Reply (type: mediate-deny)<br/>thid: msg_1
      T-->>R: mediate-deny (sync via return_route)
      note over R: Fine flusso se deny
    end
  end

  %% ----- Recipient Update -----
  rect rgb(245,245,245)
    note over R,M: Thread: recipient-update (thid = msg_2)
    R->>T: DIDComm msg (type: recipient-update)<br/>headers: return_route=all<br/>body: { updates:[{recipient_did, action}] }
    T->>M: Deliver recipient-update

    M->>S: Store.hasGrant(DID_r)?
    alt Grant attivo
      S-->>M: true
      loop per ciascun update
        alt action == "add"
          M->>S: Store.addRecipientDid(recipient_did)
          S-->>M: ok
        else action == "remove"
          M->>S: Store.removeRecipientDid(recipient_did)
          S-->>M: ok
        else invalido
          M-->>M: mark result = client_error
        end
      end
      M-->>T: Reply (type: recipient-update-response)<br/>thid: msg_2<br/>body: { updated:[{recipient_did, action, result}] }
      T-->>R: recipient-update-response (sync)
    else Nessun grant
      S-->>M: false
      M-->>T: Reply (type: recipient-update-response)<br/>thid: msg_2<br/>body: { updated: [] }
      T-->>R: recipient-update-response (sync)
    end
  end

  %% ----- Recipient Query -----
  rect rgb(245,245,245)
    note over R,M: Thread: recipient-query (thid = msg_3)
    R->>T: DIDComm msg (type: recipient-query)<br/>headers: return_route=all<br/>body: { paginate?: {limit, offset} }
    T->>M: Deliver recipient-query

    M->>S: Store.hasGrant(DID_r)?
    alt Grant attivo
      S-->>M: true
      M->>S: Store.listRecipientDids(limit, offset) → [did...]
      M-->>T: Reply (type: recipient)<br/>thid: msg_3<br/>body: { dids: [{ recipient_did }, ...] }
      T-->>R: recipient (sync)
    else Nessun grant
      S-->>M: false
      M-->>T: Reply (type: recipient)<br/>thid: msg_3<br/>body: { dids: [] }
      T-->>R: recipient (sync)
    end
  end

  %% Note finali
  note over R,M: Tutte le risposte avvengono sincrone tramite <br/>DIDComm return_route = "all" (come da spec v3)
