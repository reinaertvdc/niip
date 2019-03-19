const App = require('./App');

const s = process.env;

const config = Object.freeze({
    db: {
        cn: {
            host: s.DB_HOST,
            port: s.DB_PORT,
            database: s.POSTGRES_DB,
            user: s.POSTGRES_USER,
            password: s.POSTGRES_PASSWORD
        }
    },
    server: {
        port: s.APP_PORT,
        api: {},
        db: {
            host: s.DBMGR_HOST,
            port: s.DBMGR_PORT
        },
        oauth: {},
        web: {}
    }
});

const app = new App(config);

app.start();

for (const interruptSignal of ['SIGINT', 'SIGTERM']) {
    process.on(interruptSignal, () => { app.stop(); });
}
