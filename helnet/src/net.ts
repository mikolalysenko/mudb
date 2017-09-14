export type HelSessionId = string;
export type HelSessionData = any;

export type HelData = Uint8Array | string;

export type HelReadyHandler = (error?:any) => void;
export type HelMessageHandler = (data:HelData) => void;
export type HelCloseHandler = (error?:any) => void;
export type HelConnectionHandler = (socket:HelSocket) => void;

export type HelSocketSpec = {
    onReady:HelReadyHandler;
    onMessage:HelMessageHandler;
    onUnreliableMessage:HelMessageHandler;
    onClose:HelCloseHandler;
};

export interface HelSocket {
    sessionId:HelSessionId;
    open:boolean;

    start(spec:HelSocketSpec);

    send(data:HelData);
    sendUnreliable(data:HelData);
    close();
}

export type HelServerSpec = {
    onReady:HelReadyHandler;
    onConnection:HelConnectionHandler;
};

export interface HelServer {
    clients:HelSocket[];
    open:boolean;

    start(spec:HelServerSpec);

    close();
}
