// TODO: Move To Frontend - it'll be easier to localise on the frontend.
import fs from 'fs';
import path from 'path';

class MessageLoader {
    messages;

    constructor(language = "en") {
        let messagesFile = fs.readFileSync(path.join(__dirname, language + '.json')); // Load this language.
        this.messages = JSON.parse(messagesFile); // Takes buffer and converts it to parsed JS object
    }

    getMessage(identifier) {
        return this.messages[identifier] || "Message Missing. Please Let us Know! Identifier: " + identifier.toString();
    }
}

export default MessageLoader;