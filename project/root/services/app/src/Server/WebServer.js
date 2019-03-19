const path = require('path');

const express = require('express');

const BaseServer = require('./BaseServer');

module.exports = class extends BaseServer {
    constructor(config) {
        super();

        this._router.use(express.static(path.join(process.cwd(), 'public')));
    }
};
