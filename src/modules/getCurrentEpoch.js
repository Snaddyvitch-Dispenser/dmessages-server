function getCurrentEpoch() {
    let d = new Date();
    return Math.floor(d.getTime() / 1000);
}

export default getCurrentEpoch;