import * as WebSocket from "ws";

export class Node {
    private isAuthenticated: boolean = false;
    private readonly ws: WebSocket;

    public constructor(ws: WebSocket, onClose: (node: Node) => void) {
        this.ws = ws;

        ws.on("message", this.handleMessage.bind(this));
        ws.on("close", () => { onClose(this); });
    }

    private handleMessage(message: string): void {
        try {
            const { type, data } = JSON.parse(message);

            if (!this.isAuthenticated) {
                if (type !== "authenticate") {
                    this.ws.close();
                } else {
                    const { key } = data;

                    if ([
                        "GyTTuT27ZTtKdQ85kGQ346jZyDe2WTqWTj4/AajYlmM=",
                        "er14+9mMA/UMUzQknOJzoX1DHw7syeLgLyeQPu48ppc=",
                        "uQHlM2UR3A5K4K3MRo80MABP8Ik5tOukevDRVbYwAWM=",
                        "7nFYvbLFKcqRGSp0B4qkrEzgW9+JN6qINDGcTEYmNQI=",
                    ].includes(key)) {
                        this.isAuthenticated = true;

                        this.ws.send(JSON.stringify({
                            data: {
                                interval: 1000,
                                sources: ["random-int-10-50"],
                            },
                            type: "request-data",
                        }));
                    } else {
                        this.ws.close();
                    }
                }
            } else if (type === "analytics") {
                // TODO store data
            }
        } catch (error) { this.ws.close(); }
    }
}
