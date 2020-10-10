class Channel {
    id;
    name;
    owner;
    public_key;


    constructor({id, name, owner, public_key}) {
        this.id = id;
        this.name = name;
        this.owner = owner;
        this.public_key = public_key;
    }
}

export default Channel;