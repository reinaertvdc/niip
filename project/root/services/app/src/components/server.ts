import * as express from "express";

export class Server {
    protected readonly router: express.Router = express.Router();

    public getRouter(): express.Router { return this.router; }
}
