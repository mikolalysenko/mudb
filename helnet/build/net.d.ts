export declare type HelSessionId = string;
export declare type HelSessionData = any;
export declare type HelData = Uint8Array;
export declare type HelReadyHandler = (error?: any) => void;
export declare type HelMessageHandler = (data: HelData) => void;
export declare type HelCloseHandler = (error?: any) => void;
export declare type HelConnectionHandler = (socket: HelSocket) => void;
export declare type HelSocketSpec = {
    onReady: HelReadyHandler;
    onMessage: HelMessageHandler;
    onUnreliableMessage: HelMessageHandler;
    onClose: HelCloseHandler;
};
export interface HelSocket {
    sessionId: HelSessionId;
    open: boolean;
    start(spec: HelSocketSpec): any;
    send(data: HelData): any;
    sendUnreliable(data: HelData): any;
    close(): any;
}
export declare type HelServerSpec = {
    onReady: HelReadyHandler;
    onConnection: HelConnectionHandler;
};
export interface HelServer {
    clients: HelSocket[];
    start(spec: HelServerSpec): any;
    close(): any;
}
