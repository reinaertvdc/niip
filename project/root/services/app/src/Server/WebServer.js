const express = require('express');

const BaseServer = require('./BaseServer');

module.exports = class extends BaseServer {
    constructor() {
        super();

        this._router.use(express.static('/home/node/app/public'));
    }
};
