import { App } from "./services/app";
import { config } from "./util/config";

const app: App = new App(config);

for (const interruptSignal of ["SIGINT", "SIGTERM"] as NodeJS.Signals[]) {
    process.on(interruptSignal, app.stop.bind(app));
}

app.start()
    // tslint:disable-next-line:no-console
    .then(() => { console.log("App started successfully."); })
    // tslint:disable-next-line
    .catch((reason) => { console.log(`App failed to start: ${reason}`); });
