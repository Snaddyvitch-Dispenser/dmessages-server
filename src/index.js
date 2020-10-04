import uWebSockets from 'uWebSockets.js';
const webSocketsServerPort = 9980;
import ChannelManager from "./modules/ChannelManager";
import {Client} from "@hiveio/dhive";
import mysql from "mysql";
import MessageLoader from "./messages/MessageLoader";

// Connection to the hive network (for verifying signatures to keys)
const hiveClient = new Client(["https://api.deathwing.me", "https://api.hive.blog", "https://api.hivekings.com", "https://anyx.io", "https://api.openhive.network"]);

// database pool
const dbPool = mysql.createPool({
    connectionLimit: 100,
    host: "localhost",
    user: "root",
    password: "",
    database: "dmessages",
    charset: "utf8mb4"
});

const messageLoader = new MessageLoader("en");
const channelManager = new ChannelManager(dbPool, hiveClient, messageLoader);

channelManager.create("generally bad", "cadawg", "STM5nmQQwce8CYdutL1cWCBdvAU5YWDVt9aN2wdqwncEM1AB86Yi2");


// format:
// ws.subscribe (system) - system // messages (user:username) // channel(channel:xyz32w90urj)

/*
uWebSockets.App().ws('/*', {
    open: (ws) => {
        ws.subscribe("system");
    },

    // For brevity we skip the other events (upgrade, open, ping, pong, close)
    message: (ws, message, isBinary) => {
        let messageText = Buffer.from(message).toString();

        // Here we echo the message back, using compression if available
        let ok = ws.send(message, isBinary, true);
    }

}).listen(webSocketsServerPort, (listenSocket) => {
    if (listenSocket) {
        console.log('Listening to port ' + webSocketsServerPort);
    } else {
        console.error('Failed to start server!');
    }
});*/