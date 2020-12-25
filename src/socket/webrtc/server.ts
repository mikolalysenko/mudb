import { MuScheduler } from '../../scheduler/scheduler';
import { MuSystemScheduler } from '../../scheduler/system';
import { MuLogger, MuDefaultLogger } from '../../logger';
import { MuSocketServer, MuSocketServerState, MuSocketServerSpec, MuSocket, MuSocketState, MuSocketSpec, MuConnectionHandler, MuCloseHandler, MuSessionId, MuData } from '../socket';
import { MuRTCBinding, MuRTCConfiguration, browserRTC, MuRTCOfferAnswerOptions } from './rtc';
import { makeError } from '../../util/error';

const error = makeError('socket/webrtc/server');

const isBrowser = typeof self !== undefined && !!self && self['Object'] === Object;

function noop () { }

export class MuRTCSocketClient implements MuSocket {
    public readonly sessionId:MuSessionId;

    private _state = MuSocketState.INIT;
    public state () { return this._state; }

    private _pc:RTCPeerConnection;
    private _answerOpts:RTCOfferAnswerOptions;

    private _signal:(data:object) => void = noop;
    private _onMessage:(data:MuData, unreliable:boolean) => void = noop;
    private _onClose:() => void = noop;
    private _serverClose:() => void = noop;

    private _reliableChannel:RTCDataChannel|null = null;
    private _unreliableChannel:RTCDataChannel|null = null;

    private _logger:MuLogger;

    constructor (
        sessionId:MuSessionId,
        pc:RTCPeerConnection,
        answerOpts:RTCOfferAnswerOptions,
        signal:(data:object, session:MuSessionId) => void,
        connection:(conn:MuRTCSocketClient) => void,
        serverClose:() => void,
        logger:MuLogger,
    ) {
        this.sessionId = sessionId;
        this._pc = pc;
        this._answerOpts = answerOpts;
        this._signal = (data) => {
            signal(data, sessionId);
        };
        this._serverClose = serverClose;
        this._logger = logger;

        pc.onicecandidate = ({ candidate }) => {
            if (this._state === MuSocketState.INIT) {
                if (candidate) {
                    this._signal(candidate.toJSON());
                }
            }
        };
        pc.oniceconnectionstatechange = () => {
            if (this._state === MuSocketState.INIT) {
                if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                    logger.error(`ICE connection ${pc.iceConnectionState}`);
                    this.close();
                } else {
                    logger.log(`${sessionId} ICE connection state: ${pc.iceConnectionState}`);
                }
            }
        };
        pc.onconnectionstatechange = () => {
            if (this._state !== MuSocketState.CLOSED) {
                if (pc.connectionState === 'failed') {
                    logger.error(`connection failed`);
                    this.close();
                }
            }
        };
        pc.ondatachannel = ({ channel }) => {
            if (this._state !== MuSocketState.INIT) {
                return;
            }
            if (!channel) {
                this._logger.error('`channel` property is missing`');
                this.close();
                return;
            }

            channel.onopen = () => {
                if (this._state === MuSocketState.CLOSED) {
                    return;
                }
                this._logger.log(`${channel.label} channel is open`);
                if (this._reliableChannel && this._unreliableChannel &&
                    this._reliableChannel.readyState === 'open' &&
                    this._unreliableChannel.readyState === 'open'
                ) {
                    connection(this);
                }
            };
            channel.onerror = (e) => {
                if (this._state !== MuSocketState.CLOSED) {
                    this.close(e);
                }
            };
            channel.onclose = () => {
                if (this._state !== MuSocketState.CLOSED) {
                    this.close(`${channel.label} channel closed unexpectedly`);
                }
            };
            if (/unreliable/.test(channel.label)) {
                this._unreliableChannel = channel;
                this._unreliableChannel.binaryType = 'arraybuffer';
                this._unreliableChannel.onmessage = ({ data }) => {
                    if (typeof data !== 'string') {
                        this._onMessage(new Uint8Array(data).subarray(0), true);
                    } else {
                        this._onMessage(data, true);
                    }
                };
            } else if (/reliable/.test(channel.label)) {
                this._reliableChannel = channel;
                this._reliableChannel.binaryType = 'arraybuffer';
                this._reliableChannel.onmessage = ({ data }) => {
                    if (typeof data !== 'string') {
                        this._onMessage(new Uint8Array(data).subarray(0), false);
                    } else {
                        this._onMessage(data, false);
                    }
                };
            }
        };
    }

    public handleSignal (data:RTCIceCandidateInit|RTCSessionDescriptionInit) {
        if (this._state !== MuSocketState.INIT) {
            return;
        }
        if ('sdp' in data) {
            this._pc.setRemoteDescription(data)
            .then(() => {
                this._pc.createAnswer(this._answerOpts)
                .then((answer) => {
                    this._pc.setLocalDescription(answer)
                    .then(() => {
                        this._signal(answer);
                    }).catch((e) => this.close(e));
                }).catch((e) => this.close(e));
            }).catch((e) => this.close(e));
        } else if ('candidate' in data) {
            this._pc.addIceCandidate(data).catch((e) => this.close(e));
        } else {
            this._logger.error(`invalid negotiation message: ${data}`);
        }
    }

    public open (spec:MuSocketSpec) {
        if (this._state !== MuSocketState.INIT) {
            throw error(`socket had been opened`);
        }

        this._state = MuSocketState.OPEN;
        this._onMessage = spec.message;
        this._onClose = spec.close;
        spec.ready();
    }

    public send (data:MuData, unreliable?:boolean) {
        if (this._state !== MuSocketState.OPEN) {
            return;
        }
        if (unreliable && this._unreliableChannel) {
            this._unreliableChannel.send(<any>data);
        } else if (this._reliableChannel) {
            this._reliableChannel.send(<any>data);
        }
    }

    public close (e?:any) {
        if (this._state === MuSocketState.CLOSED) {
            return;
        }
        if (e) {
            this._logger.exception(e);
        }
        this._state = MuSocketState.CLOSED;
        this._pc.close();
        this._pc.onicecandidate = null;
        this._pc.oniceconnectionstatechange = null;
        this._pc.onconnectionstatechange = null;
        this._pc.ondatachannel = null;
        if (this._reliableChannel) {
            this._reliableChannel.onopen = null;
            this._reliableChannel.onmessage = null;
            this._reliableChannel.onerror = null;
            this._reliableChannel.onclose = null;
            this._reliableChannel = null;
        }
        if (this._unreliableChannel) {
            this._unreliableChannel.onopen = null;
            this._unreliableChannel.onmessage = null;
            this._unreliableChannel.onerror = null;
            this._unreliableChannel.onclose = null;
            this._unreliableChannel = null;
        }
        this._pc = <any>null;
        this._onClose();
        this._serverClose();
    }

    public reliableBufferedAmount () {
        return 0;
    }

    public unreliableBufferedAmount () {
        return 0;
    }
}

export class MuRTCSocketServer implements MuSocketServer {
    private _state = MuSocketServerState.INIT;
    public state () { return this._state; }

    public clients:MuRTCSocketClient[] = [];

    public readonly wrtc:MuRTCBinding;
    private _pcConfig:MuRTCConfiguration;
    private _answerOpts:MuRTCOfferAnswerOptions;
    private _signal:(data:object, sessionId:MuSessionId) => void;
    private _scheduler:MuScheduler;
    private _logger:MuLogger;

    private _onConnection:MuConnectionHandler = noop;
    private _onClose:MuCloseHandler = noop;

    constructor (spec:{
        signal:(data:object, sessionId:MuSessionId) => void,
        wrtc?:MuRTCBinding,
        pcConfig?:MuRTCConfiguration,
        answerOpts?:RTCOfferAnswerOptions,
        scheduler?:MuScheduler,
        logger?:MuLogger,
    }) {
        if (isBrowser && !browserRTC()) {
            throw error(`browser doesn't support WebRTC`);
        }
        if (!isBrowser && !spec.wrtc) {
            throw error(`specify WebRTC binding via spec.wrtc`);
        }

        this.wrtc = browserRTC() || <MuRTCBinding>spec.wrtc;
        this._signal = spec.signal;
        this._pcConfig = spec.pcConfig || {
            iceServers: [
                { urls: 'stun:global.stun.twilio.com:3478' },
            ],
        };
        this._pcConfig.sdpSemantics = 'unified-plan';
        this._answerOpts = spec.answerOpts || {};
        this._scheduler = spec.scheduler || MuSystemScheduler;
        this._logger = spec.logger || MuDefaultLogger;
    }

    public start (spec:MuSocketServerSpec) {
        if (this._state !== MuSocketServerState.INIT) {
            throw error(`attempt to start when server is ${this._state === MuSocketServerState.RUNNING ? 'running' : 'shut down'}`);
        }

        this._scheduler.setTimeout(() => {
            if (this._state !== MuSocketServerState.INIT) {
                return;
            }
            this._state = MuSocketServerState.RUNNING;
            this._onConnection = spec.connection;
            this._onClose = spec.close;
            spec.ready();
        }, 0);
    }

    private _pendingClients:MuRTCSocketClient[] = [];
    public handleSignal (packet:string) {
        if (this._state !== MuSocketServerState.RUNNING) {
            return;
        }

        function findClient (sessionId:MuSessionId, clients:MuRTCSocketClient[]) : MuRTCSocketClient|null {
            for (let i = clients.length - 1; i >= 0; --i) {
                if (clients[i].sessionId === sessionId) {
                    return clients[i];
                }
            }
            return null;
        }

        try {
            const data = JSON.parse(packet);
            if (!data.sid) {
                this._logger.error(`no session id in negotiation message`);
                return;
            }

            const sessionId:MuSessionId = data.sid;
            delete data.sid;

            let client = findClient(sessionId, this._pendingClients);
            if (!client) {
                client = new MuRTCSocketClient(
                    sessionId,
                    new this.wrtc.RTCPeerConnection(this._pcConfig),
                    this._answerOpts,
                    this._signal,
                    () => {
                        if (client) {
                            this._onConnection(client);
                            this.clients.push(client);
                            this._pendingClients.splice(this._pendingClients.indexOf(client), 1);
                        }
                    },
                    () => {
                        if (client) {
                            this.clients.splice(this.clients.indexOf(client), 1);
                        }
                    },
                    this._logger,
                );
                this._pendingClients.push(client);
            }
            client.handleSignal(data);
        } catch (e) {
            this._logger.exception(e);
        }
    }

    public close () {
        if (this._state === MuSocketServerState.SHUTDOWN) {
            return;
        }
        this._state = MuSocketServerState.SHUTDOWN;
        for (let i = 0; i < this.clients.length; ++i) {
            this.clients[i].close();
        }
        this.clients.length = 0;
        this._onClose();
    }
}
