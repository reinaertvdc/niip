const pgp = require('pg-promise')();

const Service = require('./Service');

module.exports = class extends Service {
    constructor(config) {
        super();

        this._db = pgp(config.cn);
    }

    async _onStart() { }

    async _onStop() { }
};
