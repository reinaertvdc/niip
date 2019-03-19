const Db = require('./Db');
const Server = require('./Server');
const Service = require('./Service');

module.exports = class extends Service {
    constructor(config) {
        super();

        this._db = new Db(config.db);
        this._server = new Server(config.server);
    }

    async _onStart() {
        await this._db.start();
        await this._server.start();
    }

    async _onStop() {
        await this._db.stop();
        await this._server.stop();
    }
};
