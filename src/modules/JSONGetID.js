function JSONGetID(text) {
    try {
        let json = JSON.parse(text);
        if (json.id !== null && json.id !== undefined) {
            return json.id;
        } else {
            return 0;
        }
    } catch (e) {
        return 0;
    }
}

export default JSONGetID;