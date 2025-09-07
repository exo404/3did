import { agent } from "../src/veramoAgent.js";
import dotenv from "dotenv";
dotenv.config();

// Funzione di utilità per il delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//Invio del messaggio tramite l'API del CLIENT_1
const client1DID = (await agent.didManagerFind({ alias: process.env.CLIENT_1_ALIAS }))[0].did
const client2DID = (await agent.didManagerFind({ alias: process.env.CLIENT_2_ALIAS }))[0].did
const mediatorDID = (await agent.didManagerFind({ alias: process.env.MEDIATOR_ALIAS }))[0].did
const client1Endpoint = `http://localhost:${process.env.CLIENT_1_PORT}/`
const client2Endpoint = `http://localhost:${process.env.CLIENT_2_PORT}/`
const mediatorEndpoint = `http://localhost:${process.env.MEDIATOR_PORT}/`


async function testSendClient1to2() {
    console.log(' Invio messaggio da Client 1 a Client 2...')
    
    const payloadClient1 = {
        senderDID: client1DID,
        recipientDID: client2DID,
        body: {
            content: "Hello from Client 1",
            timestamp: new Date().toISOString()
        },
    }
    
    try {
        const res = await fetch(`${client1Endpoint}send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadClient1),
        });
        
        const text = await res.text();
        
        if (!res.ok) {
            throw new Error(`POST ${client1Endpoint}send-message failed (${res.status}): ${text}`);
        }
        
        const result = JSON.parse(text);
        console.log(' Messaggio inviato con successo:', result);
        return result;
        
    } catch (err) {
        console.error(" Errore nell'invio:", err);
        throw err;
    }
}

async function testReceiveClient2() {
    console.log(' Richiesta ricezione messaggi per Client 2...')
    
    const payloadClient2 = { did: client2DID }
    
    try {
        const res = await fetch(`${client2Endpoint}receive-messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadClient2),
        });
        
        const text = await res.text();
        
        if (!res.ok) {
            throw new Error(`POST ${client2Endpoint}receive-messages failed (${res.status}): ${text}`);
        }
        
        const result = JSON.parse(text);
        console.log(' Messaggi ricevuti:', result);
        
        if (result.messages && result.messages.length > 0) {
            console.log(' Dettagli messaggi ricevuti:');
            result.messages.forEach((msg, index) => {
                console.log(`  ${index + 1}. ID: ${msg.message_id || msg.id}`);
                console.log(`     Tipo: ${msg.type}`);
                console.log(`     Da: ${msg.from}`);
                console.log(`     Contenuto:`, msg.body || msg.data);
            });
            
            // Marca i messaggi come letti
            const messageIds = result.messages.map(msg => msg.message_id || msg.id).filter(Boolean);
            if (messageIds.length > 0) {
                await markMessagesAsRead(messageIds);
            }
        }
        
        return result;
        
    } catch (err) {
        console.error(" Errore nella ricezione:", err);
        throw err;
    }
}

async function markMessagesAsRead(messageIds: string[]) {
    console.log(' Marcatura messaggi come letti...')
    
    try {
        const res = await fetch(`${client2Endpoint}confirm-read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(messageIds),
        });
        
        const text = await res.text();
        
        if (!res.ok) {
            throw new Error(`POST ${client2Endpoint}confirm-read failed (${res.status}): ${text}`);
        }
        
        const result = JSON.parse(text);
        console.log(' Messaggi marcati come letti:', result);
        
    } catch (err) {
        console.error(" Errore nella conferma lettura:", err);
    }
}


async function runCompleteTest() {
    console.log(' === INIZIO TEST COMPLETO ===\n');
    
    try {
        await testSendClient1to2();
        console.log('');
        

        console.log(' Attendo 3 secondi per la propagazione del messaggio...');
        await delay(3000);
        console.log('');
        
        console.log(' Attendo altri 5 secondi e riprovo...');
        await delay(5000);
        await testReceiveClient2();
        console.log('');
        
        console.log(' === TEST COMPLETATO ===');
        
    } catch (error) {
        console.error(' Test fallito:', error);
    }
}

const args = process.argv.slice(2);

if (args.includes('--send-only')) {
    testSendClient1to2();
} else if (args.includes('--receive-only')) {
    testReceiveClient2();
} else {
    runCompleteTest();
}