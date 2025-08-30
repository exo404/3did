import { DIDCommManager } from "../src/didcommService.js";

const recipientDID = "did:ethr:sepolia:0x035f3fd0cbb46d747c8e810fa371b4dd1f5e68d7dd035cfc0bbde2ea9e63e939e6";
const messageType = "https://didcomm.org/basicmessage/2.0/message";
const body = { content: "Ciao da DIDComm!" };


const didcommManager = new DIDCommManager();
try {
   await didcommManager.initialize('test-sender9');
} catch (error) {
   console.error("Error initializing DIDCommManager:", error);  
}
try {
await didcommManager.sendMessage(recipientDID, messageType, body);
} catch (error) {
   console.error("Error sending DIDComm message:", error);
}

didcommManager.getStoredMessages().then(messages => {
   console.log("Stored messages:", messages);
}).catch(error => {
   console.error("Error retrieving stored messages:", error);
});
