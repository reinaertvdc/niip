import * as express from "express";
import * as path from "path";

import * as server from "../server";

export class Ui extends server.Server {
    public constructor() {
        super();

        this.router.use(express.static(path.join(process.cwd(), "public")));
    }
}
