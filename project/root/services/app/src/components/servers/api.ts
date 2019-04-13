import * as express from "express";

import * as server from "../server";

export class Api extends server.Server {
    public constructor() {
        super();

        this.router.use(express.json());
    }
}
