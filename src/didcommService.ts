import { agent } from './veramoAgent.js' 
import { IDIDCommMessage, IPackedDIDCommMessage, DIDCommMessageMediaType} from '@veramo/did-comm'

export class DIDCommManager {
  private myDID: string = ''
  async initialize(alias: string = 'default'): Promise<void> {
    try {
      // Verifico se esiste già un DID con questo alias
      const identifiers = await agent.didManagerFind({ alias })
      
      if (identifiers.length > 0) {
        this.myDID = identifiers[0].did
        console.log(`DID esistente recuperato`)
      } 
      else{
        console.log(`DID non trovato}`)
      }
      
      // Aggiungo un service endpoint per DIDComm se non esiste
      await this.setupDIDCommService()
      
    } catch (error) {
      console.error('Errore durante l\'inizializzazione:', error)
      throw error
    }
  }

  //Configuro il service endpoint per DIDComm
  private async setupDIDCommService(): Promise<void> {
    try {
      // Aggiungo il service endpoint per ricevere messaggi DIDComm
      await agent.didManagerAddService({
        did: this.myDID,
        service: {
          id: `${this.myDID}#didcomm`,
          type: 'DIDCommMessaging',
          serviceEndpoint: 'http://localhost:3000/messaging', // endpoint configurato
          description: 'Handles DIDComm Messages'
        }
      })
      console.log('Service endpoint DIDComm configurato')
    } catch (error) {
      console.log('Service endpoint già esistente o errore:', error)
    }
  }

  //Crea e impacchetta un messaggio DIDComm
  async createMessage(
    recipientDID: string,
    messageType: string,
    body: any
  ): Promise<IPackedDIDCommMessage> {
    try {
      // Crea il messaggio DIDComm
      const message: IDIDCommMessage = {
        type: messageType,
        from: this.myDID,
        to: [...recipientDID],
        id: `${Date.now()}-${Math.random()}`,
        created_time: `${Math.floor(Date.now() / 1000)}`,
        body: body
      }

      // Impacchetta il messaggio (con crittografia)
      const packedMessage = await agent.packDIDCommMessage({
        packing: 'authcrypt', // o 'anoncrypt' per anonimato
        message: message
      })

      console.log(`Messaggio impacchettato per ${recipientDID}`)
      return packedMessage
      
    } catch (error) {
      console.error('Errore nella creazione del messaggio:', error)
      throw error
    }
  }

  //Invia un messaggio DIDComm a un altro agente
  async sendMessage(
    recipientDID: string,
    messageType: string,
    body: any
  ): Promise<any> {
    try {
      // Creo e impacchetto il messaggio
      const packedMessage = await this.createMessage(recipientDID, messageType, body)
      
      // Invio il messaggio usando il transport HTTP configurato
      const result = await agent.sendDIDCommMessage({
        packedMessage,
        recipientDidUrl: recipientDID,
        messageId: packedMessage.message,
        returnTransportId: 'http'
      })

      console.log(`Messaggio inviato a ${recipientDID}`)
      return result
      
    } catch (error) {
      console.error('Errore nell\'invio del messaggio:', error)
      throw error
    }
  }

  //Spacchetta e processa un messaggio DIDComm ricevuto
  async receiveMessage(packedMessage: IPackedDIDCommMessage): Promise<IDIDCommMessage> {
    try {
      // Spacchetto il messaggio
      const unpackedMessage = await agent.unpackDIDCommMessage({
        message: packedMessage.message
      })

      console.log(` Messaggio ricevuto da: ${unpackedMessage.message.from}`)
      console.log(`Tipo messaggio: ${unpackedMessage.message.type}`)
      console.log(`Contenuto:`, unpackedMessage.message.body)

      // Salvo il messaggio nel data store
      await agent.dataStoreSaveMessage({
        message: {
          ...unpackedMessage.message,
          to: Array.isArray(unpackedMessage.message.to) ? unpackedMessage.message.to[0] : unpackedMessage.message.to
        }
      })

      return unpackedMessage.message
      
    } catch (error) {
      console.error('Errore nella ricezione del messaggio:', error)
      throw error
    }
  }

  //Recupera tutti i messaggi salvati
  async getStoredMessages(): Promise<any[]> {
    const messages = await agent.dataStoreORMGetMessages({})
    return messages
  }

  //Getter DID corrente dell'agente
  getDID(): string {
    return this.myDID
  }
}