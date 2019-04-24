export enum Status {
    Started = "started",
    Starting = "starting",
    Stopped = "stopped",
    Stopping = "stopping",
}

export abstract class Process {
    private status: Status = Status.Stopped;

    public getStatus(): Status { return this.status; }

    public async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }

    public async start(): Promise<void> {
        await this.transition(
            Status.Stopped, Status.Starting, Status.Started,
            this.onStart.bind(this),
        );
    }

    public async stop(): Promise<void> {
        await this.transition(
            Status.Started, Status.Stopping, Status.Stopped,
            this.onStop.bind(this),
        );
    }

    protected abstract async onStart(): Promise<void>;

    protected abstract async onStop(): Promise<void>;

    private async transition(
        before: Status, during: Status, after: Status,
        action: () => Promise<void>,
    ): Promise<void> {
        if (this.status !== before) {
            throw new Error(
                `Process must me ${before}, is ${this.status} instead.`,
            );
        }

        this.status = during;

        try {
            await action();
        } catch (error) {
            this.status = before;

            throw error;
        }

        this.status = after;
    }
}
