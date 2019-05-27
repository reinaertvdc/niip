import * as express from "express";
import * as bearerToken from "express-bearer-token";
import * as admin from "firebase-admin";

import * as app from "./app";
import { resolve } from "path";

const serviceAccount = {
    authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
    authUri: "https://accounts.google.com/o/oauth2/auth",
    clientEmail: "firebase-adminsdk-nh6q6@logitrack-cc85c.iam.gserviceaccount.com",
    clientId: "102666049654514063613",
    // tslint:disable-next-line:max-line-length
    clientX509CertUrl: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-nh6q6%40logitrack-cc85c.iam.gserviceaccount.com",
    // tslint:disable-next-line:max-line-length
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3pSU+woAQlYlg\n3h2qVixFlkiCGv10sEoi2DaKm+TlB2YtNvIABcMiYSq92jcrkF1u0OYaPFEx8tBE\n0OvYFlM5q3diTQ+CA9jYMhstb2DeAWkrhBlc8+vvHpOlFtv5y/Nda6ygGAjcSHW6\ntEpy0CR5CSxzx7BjknJRCHAxxuEI24ir/nMq3nmesXdoCoXU3lY7GPyKN/3abhcJ\nKDq3HRrWldChagsf/lzifpWAvt3rIjOvYOrrVfcoH8EFKb0iBKfojvg8WzvSUIa2\nkH8xCu8DOsRtwyuavOKNaXPvRbPctPFUl66bOMEAmYs8Yd8ZZjTrJcdW2os2F7ji\nGLFpErNpAgMBAAECggEACdR5LebTXA/lDp5VEC0UqZTlxLEVKA3Xqg3QvZKiqe+/\ndGQgiAfG7iwtUYRAt8A+gBQGfRkFb5sDsutL9IEda1TWSxi838S88rWb5s6zbK6+\npmmnweX8lwwX8xpKJBDasgF1eAxRTRlD0/6ajZK+oQvwqTHjKzFHlTbSapeuq/6d\nAYMDbG+7I6GHSQ0KzYenRy2g0nG6Jzrf8HsVVLUkWcI7w4AMLnUS5dAENCBSDiYu\nO34AAdQ7oirBrano3G0PJC0yQT5M2qewYi5q2fRNRUcKlceHWnp92lbAKKmW/3G8\nwXVbKjdYNuH24l9mOqpjAh0hcPPCFknSvDafYJJg0QKBgQDsdc4hwtz7RLEwHD+C\nK3LbVODbL0XG8REXU8zzS5f5g/3iRNDKe3ttKbdh3dQr37gJBz3k6aL1jlbAhvMe\nF/dRq0sk6lyiOxxGX+WceMU9FcXX3as9LfrBD2qL037eOT6gcNL+2I7UPaXGgVCz\nHtQF5gsp7MR7m7bRD5q82pQxCwKBgQDG0hBuowg9AvcEQwMSEb4HrrD6htZwo4Xt\nEtZUkimv2iPvHGS7pLY2caH7lJNBxeyetmxT9SE9RBUzQPGML9wJYNpFRtyWBKDo\n7DXBtR+DG44JsYIaEGHHO7B+e2THjTlLHD5deYEsO+74FM6S3suREC+qGy88HXM4\nh/UVBEud2wKBgQCSLCz1/+DdT1R9WikETdmdrnWl6S4oUiNvmTUr/UIAU9DhTAsJ\n8JWXIN+lFx0u1giNRDXFyYwcYhZMw9+MbeJMUSiNtHb5LrNG6ccmGB5NqaT40aYm\nlsLZD6+cqmxV8Ws+gSBdu/9nQoi1EoGRiPAmiVPDYgMAKn0z9YKBVlmfiwKBgQCF\n1Ex/THp1JxPC6KCefxbc8PfsCus5crjpda6TyrcIyds6TnB35k1IpICWadIdie7W\nfpC4it5O8Q8cKvDsniKMpYcG7sX4rTDq2GTu+M43YErht3yNss0+YK1S1hhmQmd4\naZCJNwp+DfGzR74tGo8IHE8ZP6cx3dj7CnksJnIH1QKBgD4GbgKKwgoZescQS6uA\nsE6s6lWKL2IObd9Yo05GXPRqvTOMjVbOfs1ifrOhZQPZz3xjN8q5UKQptavGLPYN\nHEYLkHGmtuK+tdWd+4UKFxUtOm8cgkHD3Ek+frQUBPpfJ8YBdzEo5vB22xBcw8MG\n1lp4QSWb9LM0nns4P9lTII7B\n-----END PRIVATE KEY-----\n",
    privateKeyId: "df105f34b4d36d41b401e80ff91d4630a1742005",
    projectId: "logitrack-cc85c",
    tokenUri: "https://oauth2.googleapis.com/token",
    type: "service_account",
};

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
        router.use(bearerToken());
        router.use(Api.handleError.bind(this));

        router.post("/", this.handleRequest.bind(this));
        router.get("/nodes", this.sendNodes.bind(this));
        router.get("/users", this.sendUsers.bind(this));
        router.get("/users/:auth", this.sendUser.bind(this));
        router.get("/nodes/:nodeId", this.sendNode.bind(this));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://logitrack-cc85c.firebaseio.com",
        });
    }

    private async getUser(auth): Promise<any> {
        const user = await this.ctrl.user.getByAuth(auth);

        let userType = "driver";

        if (user.company === "0" || user.company === 0) {
            userType = "admin";
        } else if (user.node === "0" || user.node === 0) {
            userType = "analyst";
        }

        return {
            company: user.company_id,
            email: user.email,
            firstName: user.first_name,
            id: user.id,
            lastName: user.last_name,
            node: user.node_id,
            picture: user.picture,
            type: userType,
            username: user.username,
        };
    }

    private async sendUser(
        req: express.Request, res: express.Response,
    ): Promise<void> {
        try {
            admin.auth().verifyIdToken(req.token).then(async (decodedToken) => {
                try {
                    const uid = decodedToken.uid;

                    const requester = await this.getUser(uid);
                    const user = await this.getUser(req.params.auth);

                    if (requester.type === "admin" ||
                        (requester.type === "analyst" && requester.company === user.company) ||
                        requester.id === user.id) {
                        res.json(user);
                    } else {
                        res.json({ error: "not authorized" });
                    }
                } catch (error) {
                    res.json({ error });
                }
            }).catch((error) => {
                res.json({ error });
            });
        } catch (error) {
            res.json({ error });
        }
    }

    private async sendUsers(
        req: express.Request, res: express.Response,
    ): Promise<void> {
        try {
            admin.auth().verifyIdToken(req.token).then(async (decodedToken) => {
                try {
                    const uid = decodedToken.uid;

                    const requester = await this.getUser(uid);
                    const user = await this.getUser(req.params.auth);

                    if (requester.type === "admin" ||
                        (requester.type === "analyst" && requester.company === user.company) ||
                        requester.id === user.id) {
                        res.json(user);
                    } else {
                        res.json({ error: "not authorized" });
                    }
                } catch (error) {
                    res.json({ error });
                }
            }).catch((error) => {
                res.json({ error });
            });
        } catch (error) {
            res.json({ error });
        }
    }

    private async sendNode(
        req: express.Request, res: express.Response,
    ): Promise<void> {
        try {
            admin.auth().verifyIdToken(req.token).then(async (decodedToken) => {
                try {
                    const uid = decodedToken.uid;

                    const requester = await this.getUser(uid);
                    const node = await this.ctrl.node.getById(req.params.nodeId);

                    if (requester.type === "admin" ||
                        (requester.type === "analyst" && requester.company === node.companyId) ||
                        requester.node === node.id) {
                        res.json(node);
                    } else {
                        res.json({ error: "not authorized" });
                    }
                } catch (error) {
                    res.json({ error });
                }
            }).catch((error) => {
                res.json({ error });
            });
        } catch (error) {
            res.json({ error });
        }
    }

    private async sendNodes(
        req: express.Request, res: express.Response,
    ): Promise<void> {
        try {
            admin.auth().verifyIdToken(req.token).then(async (decodedToken) => {
                try {
                    const uid = decodedToken.uid;

                    const requester = await this.getUser(uid);
                    const company = requester.company;

                    if (requester.type === "driver") {
                        res.json([await this.ctrl.node.getById(requester.node)]);
                    } else if (requester.type === "analyst") {
                        res.json(await this.ctrl.node.getByCompany(company));
                    } else if (requester.type === "admin") {
                        res.json(await this.ctrl.node.getAll());
                    }
                } catch (error) {
                    res.json({ error });
                }
            }).catch((error) => {
                res.json({ error });
            });
        } catch (error) {
            res.json({ error });
        }
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

        const companyId: number = (await this.ctrl.node.getById(this.encodeId(id))).companyId;

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

    private encodeId(plain: number) {
        const buffer = Buffer.allocUnsafe(6);

        buffer.writeIntBE(plain, 0, 6);

        const base64 = buffer.toString("base64");
        const encoded = base64.replace(/\+/g, "-").replace(/\//g, "_");

        return encoded;
    }

    private decodeId(encoded: string) {
        const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
        const buffer = Buffer.from(base64, "base64");
        const id = buffer.readIntBE(0, 6);

        return id;
    }
}
