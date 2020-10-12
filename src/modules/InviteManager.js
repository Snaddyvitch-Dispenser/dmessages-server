import getCurrentEpoch from "./getCurrentEpoch";
import ChannelManager from "./ChannelManager";
import Invite from "./Invite";
import BaseManager from "./BaseManager";

class InviteManager extends BaseManager {
    channelManager;

    constructor(dbPool, client) {
        super(dbPool, client);
        this.channelManager = ChannelManager.getManager(dbPool, client);
    }

    async getInvite(invite_link_hash) {
        let [rows] = await this.dbPool.query("SELECT * FROM `invites` WHERE link_hash=?", [invite_link_hash]);
        if (rows.length === 1) {
            return Invite.getInvite(rows[0], this.dbPool, this.client);
        } else {
            return false;
        }
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
            if (await this.userManager.fromName(creator) === false) {
                return [false, "@INVITE_UPLOAD_ERROR_FIND_CREATOR"];
            }
        } catch (e) {
            return [false, "@INVITE_UPLOAD_ERROR_FIND_CREATOR"];
        }

        // Expires is in the future or null
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

        // Check the channel does exist
        if (await this.channelManager.getChannelById(channel_id) === false) {
            return [false, "@INVITE_UPLOAD_CHANNEL_NOT_EXIST"];
        }

        // Check an invite with the same link doesn't exist
        if (await this.getInvite(link_hash) !== false) {
            return [false, "@INVITE_SQL_FAIL"];
        }

        try {
            // Promise Queries - They Throw Errors Instead When Error and Return Data On Success
            let result = await this.dbPool.query('INSERT INTO `invites` SET ?', {link_hash, encrypted_key, extra_bytes, auth_tag, init_vector, channel_id, creator, expires});
            if (result[0].affectedRows === 1) {
                return [true, "@INVITE_UPLOAD_SUCCESS"];
            } else {
                return [false, "@INVITE_SQL_FAIL"];
            }
        } catch (e) {
            return [false, "@INVITE_SQL_FAIL"];
        }
    }
}