const App = require('./App');

function exit() {
    console.log('Attempting graceful shutdown...');

    app.stop().then(() => {
        console.log('Graceful shutdown successful.');

        process.exit(0);
    });
}

console.log('Attempting startup...');

const env = process.env;

const config = {
    server: {
        port: env.APP_PORT
    },
    db: {
        password: env.POSTGRES_PASSWORD
    }
};

const app = new App(config);

app.start().then(() => { console.log('Startup successful.'); });

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
