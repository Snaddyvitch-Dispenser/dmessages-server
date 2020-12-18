function wrappedError(error, transactionId) {
    return JSON.stringify({id: transactionId, data: {success: false, error: error}});
}

export default wrappedError;