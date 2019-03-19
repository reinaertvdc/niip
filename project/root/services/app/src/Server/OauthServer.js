const express = require('express');

const BaseServer = require('./BaseServer');

module.exports = class extends BaseServer {
    constructor(config) {
        super();

        this._router.use(express.json());
    }
};
