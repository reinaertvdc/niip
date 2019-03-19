const express = require('express');

module.exports = class {
    constructor(config) { this._router = express.Router(); }

    get router() { return this._router; }
};
