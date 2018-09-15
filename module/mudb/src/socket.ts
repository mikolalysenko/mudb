export type MuSessionId = string;

export type MuData = Uint8Array | string;

export type MuReadyHandler = () => void;
export type MuMessageHandler = (data:MuData, unreliable:boolean) => void;
export type MuCloseHandler = (error?:any) => void;
export type MuConnectionHandler = (socket:MuSocket) => void;

export enum MuSocketState {
    INIT,
    OPEN,
    CLOSED,
}

export type MuSocketSpec = {
    ready:MuReadyHandler;
    message:MuMessageHandler;
    close:MuCloseHandler;
};

export interface MuSocket {
    sessionId:MuSessionId;
    state:MuSocketState;

    open(spec:MuSocketSpec);
    send(data:MuData, unreliable?:boolean);
    close();
}

export enum MuSocketServerState {
    INIT,
    RUNNING,
    SHUTDOWN,
}

export type MuSocketServerSpec = {
    ready:MuReadyHandler;
    connection:MuConnectionHandler;
    close:MuCloseHandler;
};

export interface MuSocketServer {
    clients:MuSocket[];
    state:MuSocketServerState;

    start(spec:MuSocketServerSpec);
    close();
}
