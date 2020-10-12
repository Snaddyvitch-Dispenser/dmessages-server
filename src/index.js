import uWebSockets from 'uWebSockets.js';
const webSocketsServerPort = 9980;
import ChannelManager from "./modules/ChannelManager";
import {Client} from "@hiveio/dhive";
import mysql from "mysql2";
import MessageLoader from "./messages/MessageLoader";
import UserManager from "./modules/UserManager";

// Connection to the hive network (for verifying signatures to keys)
const hiveClient = new Client(["https://api.deathwing.me", "https://api.hive.blog", "https://api.hivekings.com", "https://anyx.io", "https://api.openhive.network"]);

// database pool
const dbPoolSync = mysql.createPool({
    connectionLimit: 100,
    host: "localhost",
    user: "root",
    password: "",
    database: "dmessages",
    charset: "utf8mb4"
});

const dbPool = dbPoolSync.promise();

const channelManager = ChannelManager.getManager(dbPool, hiveClient);
const userManager = UserManager.getManager(dbPool, hiveClient);

//userManager.getUserByName("cadawg").then(r => console.log(r.getAuthorityKeys("active"), r.getAuthorityKeys("posting"), r.getAuthorityKeys("owner"), r.getAuthorityKeys("memo")));

//channelManager.getById(393536498156568576).then(r => console.log(r))

/*channelManager.create("CA's Kingdom", "cadawg", "STM5U4gP8VJuc42pXRSfESWtyKL8UbkatcE29HHdmDoMECzUUr2yE")
    .then(function (result) {
        console.log("they tryna be lamp", result);
    });*/

channelManager.getChannelById(393536498156568576).then(r => console.log("lol", r.owner.name, r.owner.id));


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