import { startClient } from "../src/didcomm/didcommClient.js";

startClient(process.env.CLIENT_2_ALIAS, Number(process.env.CLIENT_2_PORT));