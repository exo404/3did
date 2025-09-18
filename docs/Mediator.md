# Mediator

## Cosa sono? 
Nel contesto di DIDComm, i mediatori sono nodi di rete che consentono la consegna affidabile dei messaggi tra entità che non possono mantenere 
una connessione diretta o sempre attiva; il protocollo `CoordinateMediationV3` gestisce la negoziazione e l’assegnazione di un mediatore a un agente, 
`MessagePickupV3` regola il recupero dei messaggi memorizzati presso il mediatore permettendo comunicazioni asincrone, mentre `Routing 2.0` definisce le 
regole di instradamento e inoltro dei messaggi attraverso uno o più mediatori, garantendo così interoperabilità, resilienza e persistenza nella 
comunicazione sicura basata su DID. Quando si utilizza il protocollo DIDComm, il mittente viene chiamato *sender* e il destinataeio *recipient*.

## [Sequence Diagram Coordinate Mediation V3](CoordinatemediationV3.md)
## [Sequence Diagram Message Pickup V3](MessagePickupV3.md)
## [Sequence Diagram Routing 2.0](Routing2.md)
## [Esempio di comunicazione fra due client con mediator](ClientComm.md)

## Mediator in Veramo

### Cosa implementa:
1. Coordinate Mediation V3 
   - Handler per il ruolo *mediator* e *recipient*.  
   - Enumerazioni dei tipi di messaggi (`mediate-request`, `mediate-grant`, `mediate-deny`, `recipient-query`, `recipient-update`).  
   - Funzioni per la creazione dei messaggi (`createV3MediateGrant`, `createV3MediateRequest`, `createV3RecipientQuery`).

2. MessagePickup V3
   - Enumerazioni per i tipi di messaggi (`delivery-request`, `status-request`).  
   - Handler plugin per *mediator* e *recipient*.

3. Routing 2.0  
   - Metodo `RoutingMessageHandler.handle()` per i messaggi di tipo `forward`.  
   - Plugin `RoutingMessageHandler` incluso nel pacchetto `did-comm`.
   - 
### Problemi:
- Tutti i componenti sono in beta quindi non ancora garantiti per l’uso in produzione.  
- Funzionalità di pickup asincrono non complete. In pratica l'unico protocollo pienamente implementato è il `CoordinateMediationV3`.

## Risorse utili 
[Veramo](https://github.com/decentralized-identity/veramo) </br>
[CoordinateMediationV3](https://didcomm.org/coordinate-mediation/3.0/) </br>
[MessagePickupV3](https://didcomm.org/messagepickup/3.0/) </br>
[Routing 2.0](https://didcomm.org/routing/2.0/) </br>
[DIDComm in Veramo](https://github.com/decentralized-identity/veramo/tree/next/packages/did-comm) </br>
[Mediation Manager in Veramo](https://github.com/decentralized-identity/veramo/tree/next/packages/mediation-manager) </br>

