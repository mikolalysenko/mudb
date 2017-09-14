import { HelSocket, HelSocketSpec, HelServer, HelServerSpec, HelData, HelSessionId } from '../net';
export declare class HelWebSocket implements HelSocket {
    sessionId: HelSessionId;
    private _started;
    private _closed;
    private _onMessage;
    private _onUnreliableMessage;
    private _onClose;
    private _reliableQueue;
    private _unreliableQueue;
    private _reliableSocket;
    private _unreliableSockets;
    private _unreliableCounter;
    private _server;
    open: boolean;
    constructor(sessionId: HelSessionId, reliableSocket: any, reliableMessages: HelData[], unreliableSockets: any, unreliableMessages: HelData[], server: HelWebSocketServer);
    start(spec: HelSocketSpec): void;
    send(message: HelData): void;
    sendUnreliable(message: HelData): void;
    close(): void;
}
export declare class HelWebSocketServer implements HelServer {
    private _started;
    private _onConnection;
    private _onClose;
    private _httpServer;
    private _wsServer;
    private _backlog;
    private _verifyClient;
    private _perMessageDeflate;
    private _path;
    private _maxUnreliableConnections;
    clients: HelWebSocket[];
    private _pendingConnections;
    constructor(httpServer: any);
    start(spec: HelServerSpec): void;
    close(): void;
}
export declare function createWebSocketServer(spec: {
    server: any;
    maxUnreliableSockets?: number;
}): HelWebSocketServer;
