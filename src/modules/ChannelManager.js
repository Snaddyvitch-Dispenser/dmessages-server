import {PublicKey} from "@hiveio/dhive";

class ChannelManager {
    dbPool;
    messageLoader;
    client;

    constructor(dbPool, client, messageLoader) {
        this.dbPool = dbPool;
        this.client = client;
        this.messageLoader = messageLoader;
    }

    async create(name, owner, decryptionKeyPublic) {
        try {
            PublicKey.fromString(decryptionKeyPublic);
        } catch (e) {
            return [false, this.messageLoader.getMessage("CHANNEL_PK_NOT_VALID")];
        }

        try {
            let accountData = await this.client.database.getAccounts([owner]);
            if (accountData[0].name !== owner.toLowerCase()) {
                return [false, this.messageLoader.getMessage("CHANNEL_OWNER_NOT_MATCH")]
            }
        } catch (e) {
            return [false, this.messageLoader.getMessage("CHANNEL_OWNER_ERROR_FIND")]
        }

        /*this.dbPool.query('INSERT INTO `messages` (`_from`, `_to`, `_content`, `_app`, `_extensions`, `_raw_data`, `_signature`, `_signed_data`, `_type`, `_format`, `_timestamp`) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [msg.from, msg.to, msg.content, msg.app, JSON.stringify(msg.extensions), JSON.stringify(JSON.parse(msg.raw_data)),msg.signature, msg.signed_data, msg.type, msg.format, msg.timestamp], function (error) {
            if (error) console.log((new Date()) + ": Error pushing message to database. Data: " + JSON.stringify(msg));
        });*/
    }
}

export default ChannelManager;