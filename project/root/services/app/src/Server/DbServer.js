const proxy = require('express-http-proxy');

const BaseServer = require('./BaseServer');

module.exports = class extends BaseServer {
    constructor(config) {
        super();

        this._router.use(proxy(`${config.host}:${config.port}`));
    }
};
