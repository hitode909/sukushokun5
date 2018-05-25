class Target {
    constructor(folderId, uri) {
        this.folderId = folderId;
        this.uri = uri;
    }

    isValid() {
        return this.uri.match(/^http/);
    }
};

module.exports = Target;
