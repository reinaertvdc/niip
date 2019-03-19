const express = require('express');

const Service = require('./Service');

const ApiServer = require('./Server/ApiServer');
const DbServer = require('./Server/DbServer');
const OauthServer = require('./Server/OauthServer');
const WebServer = require('./Server/WebServer');

module.exports = class extends Service {
    constructor(config) {
        super();

        this._port = config.port;
        this._app = express();
        this._server = null;

        const servers = {
            '/': new WebServer(config.web),
            '/api': new ApiServer(config.api),
            '/db': new DbServer(config.db),
            '/oauth': new OauthServer(config.oauth)
        };

        for (const path in servers) {
            this._app.use(path, servers[path].router);
        }
    }

    async _onStart() {
        return await new Promise((resolve, reject) => {
            try {
                this._server = this._app.listen(this._port, () => {
                    resolve();
                });
            } catch (error) { reject(error); }
        });
    }

    async _onStop() {
        return await new Promise((resolve, reject) => {
            try {
                this._server.close(() => {
                    this._server = null;

                    resolve();
                });
            } catch (error) { reject(error); }
        });
    }
};
