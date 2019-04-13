import * as app from "./components/services/app";

const s: NodeJS.ProcessEnv = process.env;

export const config: app.IConfig = {
    services: {
        db: {
            cn: {
                database: s.POSTGRES_DB as string,
                host: s.DB_HOST as string,
                password: s.POSTGRES_PASSWORD as string,
                port: parseInt(s.DB_PORT as string, 10),
                user: s.POSTGRES_USER as string,
            },
        },
        web: {
            port: parseInt(s.APP_PORT as string, 10),
            routes: {
                api: {
                    path: s.APP_API_PATH as string,
                },
                ui: {
                    path: s.APP_UI_PATH as string,
                },
            },
        },
    },
};
