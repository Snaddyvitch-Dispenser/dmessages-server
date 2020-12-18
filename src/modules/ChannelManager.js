import {PublicKey} from "@hiveio/dhive";
import getCurrentEpoch from "./getCurrentEpoch.js";
import crypto from 'crypto';
import Channel from './Channel.js';
import UserManager from "./UserManager.js";
import BaseManager from "./BaseManager.js";

class ChannelManager extends BaseManager {
    userManager;

    constructor(dbPool, client) {
        super(dbPool, client);
        this.userManager = UserManager.getManager(dbPool, client);
    }

    async getChannelById(channelId) {
        let [rows] = await this.dbPool.query("SELECT * FROM `channels` WHERE id=?", [BigInt(channelId)]);
        if (rows.length === 1) {
            return Channel.getChannel(rows[0], this.dbPool, this.client);
        } else {
            return false;
        }
    }

    // Safe new channel get random id - checks it doesn't already exist.
    async getRandomId() {
        let randomNumber = rawGetRandomId();

        let [rows] = await this.dbPool.query("SELECT * FROM `channels` WHERE id=?", [BigInt(randomNumber)]);
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
            if (await this.userManager.fromName(owner) === false) {
                return [false, "@CHANNEL_CREATE_OWNER_NOT_MATCH"];
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