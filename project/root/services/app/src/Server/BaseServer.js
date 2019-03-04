const express = require('express');

const Service = require('../Service');

module.exports = class {
    constructor() { this._router = express.Router(); }

    get router() { return this._router; }
};
