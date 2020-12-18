import ChannelManager from "./ChannelManager.js";
import UserManager from "./UserManager.js";

class Invite {
    dbPool; client;
    link_hash; encrypted_key; extra_bytes; auth_tag; init_vector; channel; creator; expires;

    constructor(info, dbPool, client) {
        this.link_hash = info.link_hash;
        this.encrypted_key = info.encrypted_key;
        this.extra_bytes = info.extra_bytes;
        this.auth_tag = info.auth_tag;
        this.init_vector = info.init_vector;
        this.channel = info.channel;
        this.creator = info.creator;
        this.expires = info.expires;
        this.dbPool = dbPool;
        this.client = client;
    }


    static async getInvite(databaseInfo, dbPool, client) {
        let creator = await UserManager.getManager(dbPool, client).getUserByName(databaseInfo.creator);
        if (creator === false) {
            return false;
        }
        databaseInfo.creator = creator;

        let channel = await ChannelManager.getManager(dbPool, client).getChannelById(BigInt(databaseInfo.channel_id));
        if (channel === false) {
            return false;
        }
        databaseInfo.channel = channel;

        return new Invite(databaseInfo, dbPool, client);
    }
}

export default Invite;