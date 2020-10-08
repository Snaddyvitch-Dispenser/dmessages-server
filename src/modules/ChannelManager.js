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

    // used - auth tag, init vector, hash, creator
    async uploadInvite(private_key_encrypted, auth_tag, init_vector, channel_id, creator, expires, invite_link_hash) {
        creator = creator.toLowerCase();

        if (!auth_tag.match(/^[a-z0-9]{32}$/i)) {
            return [false, "@INVITE_UPLOAD_FIELD_WRONG_LENGTH"];
        }

        if (!init_vector.match(/^[a-z0-9]{32}$/i)) {
            return [false, "@INVITE_UPLOAD_FIELD_WRONG_LENGTH"];
        }

        if (!invite_link_hash.match(/^[a-z0-9]{128}$/i)) {
            return [false, "@INVITE_UPLOAD_HASH_WRONG"];
        }

        // Check owner exists
        try {
            // TODO: Surely there's a way to optimise this - say UserDoesExist(creator);
            let accountData = await this.client.database.getAccounts([creator]);
            if (accountData[0].name !== creator) {
                return [false, "@INVITE_UPLOAD_ERROR_FIND_CREATOR"];
            }
        } catch (e) {
            return [false, "@INVITE_UPLOAD_ERROR_FIND_CREATOR"];
        }

        try {
            parseInt(expires);
        } catch (e) {
            return [false, "@INVITE_UPLOAD_ERROR_EXPIRES"];
        }
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
        // TODO: Surely there's a way to optimise this - say Channels.getChannel(1).getOwner();
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