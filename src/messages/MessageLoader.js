import fs from 'fs';
import path from 'path';

class MessageLoader {
    messages;

    constructor(language = "en") {
        let messagesFile = fs.readFileSync(path.join(__dirname, language + '.json')); // Load this language.
        this.messages = JSON.parse(messagesFile); // Takes buffer and converts it to parsed JS object
    }

    getMessage(identifier) {
        if (this.messages.hasOwnProperty(identifier)){
            return this.messages[identifier];
        } else {
            console.error("This Message Identifier doesn't correspond to a message in the Language File.");
            return "Message Missing. Please Let us Know! Identifier: " + identifier.toString();
        }
    }
}

export default MessageLoader;