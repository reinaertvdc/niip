import * as express from "express";

import * as app from "./app";

enum Code {
    _200 = 200,
    _400 = 400,
    _401 = 401,
    _415 = 415,
    _422 = 422,
    _500 = 500,
}

enum Type {
    Analytics,
    Test,
}

export class Api {
    private static assertContentTypeJson(
        req: express.Request, res: express.Response,
    ): void {
        const contentType: string | undefined = req.headers["content-type"];

        if (!contentType || contentType !== "application/json") {
            Api.send(res, Code._415, "Content-type must be application/json.");
        }
    }

    private static handleError(
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ): void {
        if (err instanceof SyntaxError) {
            Api.send(res, Code._400, "Request contains a syntax error.");
        } else {
            Api.send(res, Code._500, "Unknown error.");
        }
    }

    private static async handleTest(
        req: express.Request, res: express.Response,
    ): Promise<void> {
        Api.send(res);
    }

    private static send(
        res: express.Response,
        statusCode: Code = Code._200,
        message: string = "",
    ): void {
        res.status(statusCode);
        res.send(message);

        if (statusCode !== Code._200) {
            throw new Error(message);
        }
    }

    private readonly ctrl: app.ICtrl;
    private readonly router: express.Router;

    public constructor(router: express.Router, ctrl: app.ICtrl) {
        this.router = router;
        this.ctrl = ctrl;

        router.use(express.json());
        router.use(Api.handleError.bind(this));

        router.post("/", this.handleRequest.bind(this));
    }

    private async assertAuthenticated(
        req: express.Request, res: express.Response,
    ): Promise<void> {
        let id: number;
        let key: string;

        try {
            id = req.body.auth.id;
            key = req.body.auth.key;
        } catch (error) {
            Api.send(res, Code._422, "Missing authentication data.");

            throw new Error();
        }

        try {
            if (!await this.ctrl.node.verifyKey(id, key)) {
                throw new Error();
            }
        } catch (error) {
            Api.send(res, Code._401, "Invalid authentication data.");
        }
    }

    private getHandler(
        req: express.Request, res: express.Response,
    ): (req: express.Request, res: express.Response) => Promise<void> {
        const value: string = req.body.type;

        if (value === "analytics") { return this.handleAnalytics.bind(this); }
        if (value === "test") { return Api.handleTest.bind(Api); }

        Api.send(res, Code._422, "Missing request type.");

        throw new Error();
    }

    private async handleAnalytics(
        req: express.Request, res: express.Response,
    ): Promise<void> {
        const id: number = req.body.auth.id;
        // tslint:disable-next-line:no-any
        const data: any = req.body.data;

        const companyId: number = (await this.ctrl.node.getById(id)).companyId;

        try {
            // tslint:disable-next-line:no-any
            data.forEach((series: any) => {
                // tslint:disable-next-line:no-console
                console.log(companyId);
                // tslint:disable-next-line:no-console
                console.log(series);
            });
        } catch (error) {
            Api.send(res, Code._422, "Bad analytics data format.");
        }

        Api.send(res);
    }

    private async handleRequest(
        req: express.Request, res: express.Response,
    ): Promise<void> {
        Api.assertContentTypeJson(req, res);
        await this.assertAuthenticated(req, res);

        await this.getHandler(req, res)(req, res);
    }
}
