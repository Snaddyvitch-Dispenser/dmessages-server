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

    async uploadInvite(private_key_encrypted, invite_link_hash) {

    }

    async create(name, owner, public_key) {
        owner = owner.toLowerCase();

        // Check PublicKey is Valid.
        try {
            PublicKey.fromString(public_key);
        } catch (e) {
            return [false, "@CHANNEL_CREATE_PK_NOT_VALID"];
        }

        // Check owner exists
        try {
            let accountData = await this.client.database.getAccounts([owner]);
            if (accountData[0].name !== owner) {
                return [false, "@CHANNEL_CREATE_OWNER_NOT_MATCH"]
            }
        } catch (e) {
            return [false, "@CHANNEL_CREATE_OWNER_ERROR_FIND"]
        }

        // Check name isn't empty or too big
        if (name.length === 0) return [false, "@CHANNEL_CREATE_EMPTY_NAME"]
        if (name.length > 50) return [false, "@CHANNEL_CREATE_LONG_NAME"]


        await this.dbPool.query('INSERT INTO `channels` (`name`, `owner`, `public_key`) VALUES (?, ?, ?)', [name, owner, public_key], function (err) {
            if (err) return [false, "@CHANNEL_CREATE_ERROR_SQL"];

            return [true, "@CHANNEL_CREATE_SUCCESS"];
        });
    }
}

export default ChannelManager;