// Use strict javascript for security reasons
"use strict";

// Run the web socket on port 443, so if you're on a restricted network, it just looks like a normal website over TLS.
var webSocketsServerPort = 443;

// Import required webservers
var webSocketServer = require('websocket').server;
var https = require('https');
var mysql = require('mysql');
var fs = require('fs');
const { Client, Signature, cryptoUtils } = require('dsteem');

const hiveClient = new Client('https://anyx.io');

var dbPool = mysql.createPool({
    connectionLimit: 100,
    host: "localhost",
    user: "root",
    password: "",
    database: "dmessages",
    charset: "utf8mb4"
});

// Test database is up
dbPool.getConnection(function(err, dbConnection) {
    if (err) throw err; // Throw the error as the database is probably turned off
    console.log((new Date()) + ": Database Pool Connected");
    dbConnection.release();
});

// All messages (as server is shared), allows for reduced querying (only one select at the program startup, making it more efficient)
var history = [ ];
// list of currently connected users
var clients = [ ];
dbPool.getConnection(function(err, dbConnection){
    if (err) throw err; // Throw it here because this is startup so the user will be monitoring to see that everything has connected
    dbConnection.query("SELECT * FROM `messages`", function(err, result, fields) {
        if (err) throw err; // If an error happens here, crash the app because it means the table has not been created
        for (var i=0; i < result.length; i++) { 
            var db_msg = {
                from: result[i]._from,
                to: result[i]._to,
                content: result[i]._content,
                app: result[i]._app,
                extensions: result[i]._extensions,
                raw_data: result[i]._raw_data,
                signature: result[i]._signature,
                signed_data: result[i]._signed_data,
                type: result[i]._type,
                format: result[i]._format,
                timestamp: result[i]._timestamp
            };
            history.push(db_msg);
        }
    });
    dbConnection.release();
});

function stripWhitespace(str) {
    return String(str).replace(/(^\s+|\s+$)/g, "");
}

const options = {
    key: fs.readFileSync('./private.key'),
    cert: fs.readFileSync('./certificate.cer')
}

// Start with normal server
var server = https.createServer(options, function(request, response) {});

// Make Server Listen
server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + ": Server is listening on port " + webSocketsServerPort);
});

// Convert server into a websocket server, which is just an enhanced webserver
var wsServer = new webSocketServer({
    httpServer: server
});

// New Websocket Connection
wsServer.on('request', (request) => {
    // Log connection
    console.log((new Date()) + ': Connection from origin ' + request.origin + '.');

    // accept connection if it's a known origin
    if (["api.dmessages.app","dmessages.app","demo1.dmessages.app","www.dmessages.app","postwoman.io","localhost:3000"].indexOf(request.origin.replace(/^https?:\/\//, "")) > -1) {
        var connection = request.accept(null, request.origin);
        console.log((new Date()) + ": Connection from origin " + request.origin + " was accepted.");
    } else {
        // Reject connection
        console.log((new Date()) + ": Connection from origin " + request.origin + " was declined.");
        request.reject(403,"You must request this API from an allowed origin.");
        return;
    }

    // Set Client Information
    var userName = false;
    var index = clients.push([connection,userName]) - 1;

    // user sent some message
    connection.on('message', async function(message) {
        var timestamp_recieved = Math.floor((new Date()).getTime()/1000); // Get current epoch time

        if (message.type === 'utf8') {
            var parsed_message = false;
            try {
                parsed_message = JSON.parse(message.utf8Data);
            } catch {
                // Catch exceptions
                console.log((new Date()) + ": Error Parsing Message From Client");
            }

            if (parsed_message != false) {
                if ('name' in parsed_message, 'signature' in parsed_message, 'type' in parsed_message, 'data' in parsed_message) {
                    
                    // Set default values that are not the same so that if it fails, they won't be equal
                    var pubPostingKey = "Posting Key";
                    var recoveredPubKey = "Recovered Public Key";
                    try {
                        const [account] = await hiveClient.database.getAccounts([parsed_message.name]);

                        pubPostingKey = account.posting.key_auths[0][0];

                        recoveredPubKey = Signature.fromString(parsed_message.signature).recover(cryptoUtils.sha256(parsed_message.data));
                    } catch {
                        console.log((new Date()) + ": User specified invalid signature")
                    }

                    // If user has proven themselves to be the sender
                    if (pubPostingKey === recoveredPubKey.toString()) {
                        var parsed_data = false;
                        try {
                            // If you're reading this, you might be wondering "why isn't data a JSON object"
                            // The reason is that if I stringify data to test the signature, I might stringify it differently than the client did
                            // This would make the signature invalid, so that's why it's a string.
                            parsed_data = JSON.parse(parsed_message.data);
                        } catch {
                            console.log((new Date()) + ": Error Parsing Data From Client")
                        }
                        if (parsed_data !== false) {

                            // Check if it's being replayed from an older message - if so, decline to execute it.
                            if ('expires' in parsed_data) {
                                if (parsed_data.expires < timestamp_recieved) {
                                    console.log((new Date()) + ": This message has already expired");
                                    connection.sendUTF(JSON.stringify({"success": false, "error": "Message expired, you probably took too long to approve this message in Keychain! Please try again."}));
                                    return; // Stop execution of code
                                }
                            } else {
                                // Prevent replay attacks
                                console.log((new Date()) + ": This action didn't have expiry set, so we didn't execute it.")
                                connection.sendUTF(JSON.stringify({"success": false, "error": "There is no expiry on this message. Unfortunately, we require expiries to be specified, to protect you!"}));
                                return;
                            }

                            if (parsed_message.type === 'send_private_message') {
                                if ('format' in parsed_data && 'extensions' in parsed_data && 'app' in parsed_data && 'to' in parsed_data && 'content' in parsed_data) {
                                    // Update username
                                    userName = parsed_message.name;

                                    // Organise data
                                    var msg = {
                                        from: parsed_message.name,
                                        to: parsed_data.to,
                                        content: parsed_data.content,
                                        app: parsed_data.app,
                                        extensions: parsed_data.extensions,
                                        raw_data: stripWhitespace(message.utf8Data),
                                        signature: parsed_message.signature,
                                        signed_data: parsed_message.data,
                                        type: "private",
                                        format: parsed_data.format,
                                        timestamp: timestamp_recieved
                                    };
                                    dbPool.getConnection(function(err, dbConnection) {
                                        if (err) console.log((new Date()) + ": Failed to get connection to insert message. Data: " + JSON.stringify(msg));
                                        dbConnection.query('INSERT INTO `messages` (`_from`, `_to`, `_content`, `_app`, `_extensions`, `_raw_data`, `_signature`, `_signed_data`, `_type`, `_format`, `_timestamp`) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [msg.from, msg.to, msg.content, msg.app, JSON.stringify(msg.extensions), JSON.stringify(JSON.parse(msg.raw_data)),msg.signature, msg.signed_data, msg.type, msg.format, msg.timestamp], function (error, results, fields) {
                                            if (error) console.log((new Date()) + ": Error pushing message to database. Data: " + JSON.stringify(msg));
                                        });
                                        dbConnection.release();
                                    });

                                    console.log((new Date()) + ": [@" + msg.from + " -> @" + msg.to + "] " + parsed_data.content);

                                    // Add to history
                                    history.push(msg);
                                    
                                    // Send message to involved parties only
                                    var json = JSON.stringify({ command: 'message', data: msg });
                                    for (var i=0; i < clients.length; i++) {
                                        if (clients[i][1] !== false && (clients[i][1] === msg.to || clients[i][1] == msg.from)) {
                                            clients[i][0].sendUTF(json);
                                        }
                                    }
                                } else {
                                    connection.sendUTF(JSON.stringify({'success': false, 'error': 'Invalid message!'}));
                                }
                            } else if (parsed_message.type === 'send_channel_message') {
                                if ('format' in parsed_data && 'extensions' in parsed_data && 'app' in parsed_data && 'to' in parsed_data && 'content' in parsed_data) {
                                    
                                    // Update username
                                    userName = parsed_message.name;
                                    
                                    // Organise data
                                    var msg = {
                                        from: parsed_message.name,
                                        to: parsed_data.to,
                                        content: parsed_data.content,
                                        app: parsed_data.app,
                                        extensions: parsed_data.extensions,
                                        raw_data: stripWhitespace(message.utf8Data),
                                        signature: parsed_message.signature,
                                        signed_data: parsed_message.data,
                                        type: "channel",
                                        format: parsed_data.format,
                                        timestamp: timestamp_recieved
                                    };

                                    dbPool.getConnection(function(err, dbConnection) {
                                        if (err) console.log((new Date()) + ": Failed to get connection to insert message. Data: " + JSON.stringify(msg));
                                        dbConnection.query('INSERT INTO `messages` (`_from`, `_to`, `_content`, `_app`, `_extensions`, `_raw_data`, `_signature`, `_signed_data`, `_type`, `_format`, `_timestamp`) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [msg.from, msg.to, msg.content, msg.app, JSON.stringify(msg.extensions), JSON.stringify(JSON.parse(msg.raw_data)),msg.signature, msg.signed_data, msg.type, msg.format, msg.timestamp], function (error, results, fields) {
                                            if (error) console.log((new Date()) + ": Error pushing message to database. Data: " + JSON.stringify(msg));
                                        });
                                        dbConnection.release();
                                    });

                                    console.log((new Date()) + ": [@" + msg.from + " -> #" + msg.to + "] " + parsed_data.content);

                                    // Add to history
                                    history.push(msg);
                                    
                                    // Send message to everyone
                                    var json = JSON.stringify({ command: 'message', data: msg });
                                    for (var i=0; i < clients.length; i++) {
                                        clients[i][0].sendUTF(json);
                                    }
                                } else {
                                    connection.sendUTF(JSON.stringify({'success': false, 'error': 'Invalid message!'}));
                                }
                            } else if (parsed_message.type === 'login') {
                                // login {"name": "cadawg", "signature":"signature","type":"login","data":{"message": "Please sign me into dMessages"}}
                                if (parsed_data.message === "Please sign me into dMessages") {
                                    // Update users' username in all instances
                                    userName = parsed_message.name;
                                    clients[index][1] = parsed_message.name;
                                    console.log((new Date()) + ": User " + parsed_message.name + " logged in!");
                                    
                                    // Clean out history of private messages not aimed at the user
                                    var tmp_history = [];

                                    for (var i=0; i < history.length; i++) {
                                        if (history[i].type == "channel") {
                                            tmp_history.push(history[i]);
                                        } else if (history[i].type === "private" && (history[i].to === parsed_message.name || history[i].from === parsed_message.name)) {
                                            tmp_history.push(history[i])
                                        }
                                    }

                                    connection.sendUTF(JSON.stringify({ command: 'history', data: tmp_history}))
                                } else {
                                    connection.sendUTF(JSON.stringify({'success': false, 'error': 'Invalid Login Request!'}));
                                }
                            } else {
                                connection.sendUTF(JSON.stringify({'success': false, 'error': 'Invalid Type Sent!'}));
                            }
                        } else {
                            connection.sendUTF(JSON.stringify({'success': false, 'error': 'Invalid JSON'}));
                        }
                    } else {
                        connection.sendUTF(JSON.stringify({'success': false, 'error': 'Bad signature.'}));
                    }
                } else {
                    connection.sendUTF(JSON.stringify({'success': false, 'error': 'Your request is missing some fields.'}));
                }
            } else {
                connection.sendUTF(JSON.stringify({'success': false, 'error': 'Invalid JSON'}));
            }
        } else {
            connection.sendUTF(JSON.stringify({'success': false, 'error': 'Your request should be text only.'}));
        }
    });

    // user disconnected
    connection.on('close', function(connection) {
        if (userName !== false) {
            // Only alert us if a named user disconnects.
            console.log((new Date()) + ": Peer "
                + connection.remoteAddress + "/" + userName + " disconnected.");
        }
        // remove user from the list of connected clients so that we don't send them any messages
        clients.splice(index, 1);
    });

});
