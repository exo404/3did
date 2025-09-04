import { DIDCommManager } from "../src/didcomm/DIDCommManager.js";
import { agent } from "../src/veramoAgent.js";
import { startMediator } from "../src/didcomm/didcommMediator.js";
import { startClient } from "../src/didcomm/didcommClient.js";
//import { createDID } from "../src/triangle/holderService.js";
import dotenv from "dotenv";
dotenv.config();

//Invio del messaggio tramite l'API del CLIENT_1
const client1DID = (await agent.didManagerFind({ alias: process.env.CLIENT_1_ALIAS }))[0].did
const client2DID = (await agent.didManagerFind({ alias: process.env.CLIENT_2_ALIAS }))[0].did
const mediatorDID = (await agent.didManagerFind({ alias: process.env.MEDIATOR_ALIAS }))[0].did
const client1Endpoint = `http://localhost:${process.env.CLIENT_1_PORT}/`
const client2Endpoint = `http://localhost:${process.env.CLIENT_2_PORT}/`
const mediatorEndpoint = `http://localhost:${process.env.MEDIATOR_PORT}/`

//await createDID(process.env.MEDIATOR_ALIAS)
//await createDID(process.env.CLIENT_1_ALIAS)
//await createDID(process.env.CLIENT_2_ALIAS)

const manager1 = new DIDCommManager()
const manager2 = new DIDCommManager()
await manager1.initialize(process.env.CLIENT_1_ALIAS, mediatorDID)
await manager2.initialize(process.env.CLIENT_2_ALIAS, mediatorDID)
await manager1.addAllowedSender(client2DID)
await manager2.addAllowedSender(client1DID)


async function testSendClient1to2 () {
    const payloadClient1 = {
        senderDID: client1DID,
        recipientDID: client2DID,
        body: {
            content: "Hello from Client 1"
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
        console.log(JSON.parse(text));
    } catch (err) {
        console.error("post error:", err);
        throw err;
    }
}

async function testReceiveClient2 () {
    const payloadClient2 = {did : client2DID} 
    try {
        const res = await fetch(`${client2Endpoint}messaging`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadClient2),
        });
        const text = await res.text();
        if (!res.ok) {
            throw new Error(`POST ${client2Endpoint}messaging failed (${res.status}): ${text}`);
        }
        console.log(JSON.parse(text));
    } catch (err) {
        console.error("post error:", err);
        throw err;
    }
}

testReceiveClient2();


