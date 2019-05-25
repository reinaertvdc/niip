import * as app from "../services/app";

const s: NodeJS.ProcessEnv = process.env;

export const config: app.IConfig = Object.freeze({
    controllers: {
        node: {
            key: {
                numBytes: parseInt(s.APP_NODE_KEY_NUM_BYTES as string, 10),
                saltRounds: parseInt(s.APP_NODE_KEY_SALT_ROUNDS as string, 10),
            },
        },
    },
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
        mqtt: {
            clientId: s.MQTT_CLIENT_ID as string,
            host: s.MQTT_HOST as string,
            password: s.MQTT_PASSWORD as string,
            port: parseInt(s.MQTT_PORT as string, 10),
            protocol: s.MQTT_PROTOCOL as string,
            username: s.MQTT_USERNAME as string,
        },
        web: {
            port: parseInt(s.APP_PORT as string, 10),
        },
    },
    util: {
        dummy: {
            mqtt: {
                root: {
                    clientId: s.MQTT_CLIENT_ID as string,
                    password: s.MQTT_PASSWORD as string,
                    username: s.MQTT_USERNAME as string,
                },
            },
        },
    },
});
