import {PublicKey} from "@hiveio/dhive";
import getCurrentEpoch from "./getCurrentEpoch";
import crypto from 'crypto';
import Channel from './Channel';

class ChannelManager {
    dbPool;
    messageLoader;
    client;

    constructor(dbPool, client, messageLoader) {
        this.dbPool = dbPool;
        this.client = client;
        this.messageLoader = messageLoader;
    }

    async uploadInvite(encrypted_key, extra_bytes, auth_tag, init_vector, channel_id, creator, expires, link_hash) {
        creator = creator.toLowerCase();

        if (!auth_tag.match(/^[a-z0-9]{32}$/i)) {
            return [false, "@INVITE_UPLOAD_FIELD_WRONG_LENGTH"];
        }

        if (!extra_bytes.match(/^[a-z0-9]{64}$/i)) {
            return [false, "@INVITE_UPLOAD_EXTRA_BYTES_MISSING"];
        }

        if (!init_vector.match(/^[a-z0-9]{32}$/i)) {
            return [false, "@INVITE_UPLOAD_FIELD_WRONG_LENGTH"];
        }

        if (!link_hash.match(/^[a-z0-9]{128}$/i)) {
            return [false, "@INVITE_UPLOAD_HASH_WRONG"];
        }

        if (!encrypted_key.match(/^[a-z0-9]+$/i)) {
            return [false, "@INVITE_UPLOAD_ENCRYPTED_WRONG"];
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
            expires = parseInt(expires);

            if (expires === -1) {
                expires = null;
            }

            if (expires > getCurrentEpoch() && expires !== null) {
                return [false, "@INVITE_UPLOAD_EXPIRED"];
            }
        } catch (e) {
            return [false, "@INVITE_UPLOAD_ERROR_EXPIRES"];
        }

        // check channel id

        // TODO: check invite not exists already.

        try {
            // Promise Queries - They Throw Errors Instead When Error and Return Data On Success
            let result = await this.dbPool.query('INSERT INTO `invites` SET ?', {link_hash, encrypted_key, extra_bytes, auth_tag, init_vector, channel_id, creator, expires});
            if (result[0].affectedRows === 1) {
                return [true, "@CHANNEL_CREATE_SUCCESS"];
            } else {
                return [false, "@CHANNEL_CREATE_ERROR_SQL"];
            }
        } catch (e) {
            return [false, "@CHANNEL_CREATE_ERROR_SQL"];
        }
    }

    static getManager(dbPool, client, messageLoader) {
        return new ChannelManager(dbPool, client, messageLoader);
    }

    async getById(channelId) {
        let [rows] = await this.dbPool.query("SELECT * FROM `channels` WHERE id=?", [BigInt(channelId)]);
        if (rows.length === 1) {
            return new Channel(rows[0]);
        } else {
            return false;
        }
    }

    // Safe new channel get random id - checks it doesn't already exist.
    async getRandomId() {
        let randomNumber = rawGetRandomId();

        let [rows] = await this.dbPool.query("SELECT * FROM `channels` WHERE id=?", [BigInt(randomNumber)]);
        console.log(rows);
        while (rows.length > 0) {
            randomNumber = rawGetRandomId();

            [rows] = await this.dbPool.query("SELECT * FROM `channels` WHERE id=?", [BigInt(randomNumber)]);
        }

        return randomNumber;
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

        try {
            // Promise Queries - They Throw Errors Instead When Error and Return Data On Success
            let result = await this.dbPool.query('INSERT INTO `channels` SET ?', {name, owner, public_key});
            if (result[0].affectedRows === 1) {
                return [true, "@CHANNEL_CREATE_SUCCESS"];
            } else {
                return [false, "@CHANNEL_CREATE_ERROR_SQL"];
            }
        } catch (e) {
            return [false, "@CHANNEL_CREATE_ERROR_SQL"];
        }
    }
}

// DOESN'T CHECK IF ID EXISTS - DO NOT EXPORT.
function rawGetRandomId() {
    let randomNumberSource = BigInt(parseInt(crypto.randomBytes(16).toString("hex"),16)).toString();
    return randomNumberSource.slice(0,1) + randomNumberSource.slice(-17);
}

export default ChannelManager;