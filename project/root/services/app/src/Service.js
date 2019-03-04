const STATUS = Object.freeze({
    STARTING: 'starting',
    STARTED: 'started',
    STOPPING: 'stopping',
    STOPPED: 'stopped'
});

module.exports = class {
    static get STATUS() { return STATUS; }

    constructor() { this._status = STATUS.STOPPED; }

    get status() { return this._status; }

    async start() {
        await this._transition(
            STATUS.STOPPED, STATUS.STARTING, STATUS.STARTED,
            async () => { await this._onStart(); }
        );
    }

    async stop() {
        await this._transition(
            STATUS.STARTED, STATUS.STOPPING, STATUS.STOPPED,
            async () => { await this._onStop(); }
        );
    }

    async restart() {
        await this.stop();
        await this.start();
    }

    async _transition(before, during, after, action) {
        if (this._status !== before) {
            throw new Error(
                `Service must me ${before}, is ${this._status} instead.`
            );
        }

        this._status = during;

        try {
            await action();
        } catch (error) {
            this._status = before;

            throw error;
        }

        this._status = after;
    }
};
