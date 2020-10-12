import UserManager from "./UserManager";

// TODO: Change Channel to use owner (account object) instead of owner name (maybe?)

class Channel {
    id;
    name;
    owner;
    public_key;
    userManager;
    dbPool;
    client;


    constructor({id, name, owner, public_key}, userManager, dbPool, client) {
        this.userManager = userManager;
        this.id = id;
        this.name = name;
        this.owner = owner;
        this.public_key = public_key;
        this.dbPool = dbPool;
        this.client = client;
    }

    static async getChannel({id, name, owner, public_key}, dbPool, client) {
        let userManager = UserManager.getManager(dbPool, client);
        owner = await userManager.getUserByName(owner);
        return new Channel({id, name, owner, public_key}, userManager, dbPool, client);
    }
}

export default Channel;