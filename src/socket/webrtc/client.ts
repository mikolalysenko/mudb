import { MuScheduler } from '../../scheduler/scheduler';
import { MuSystemScheduler } from '../../scheduler/system';
import { MuLogger, MuDefaultLogger } from '../../logger';
import { MuSocket, MuSocketState, MuSocketSpec, MuSessionId, MuData } from '../socket';
import { MuRTCBinding, MuRTCConfiguration, browserRTC, MuRTCOfferAnswerOptions } from './rtc';
import { makeError } from '../../util/error';

const error = makeError('socket/webrtc/client');

const isBrowser = typeof self !== undefined && !!self && self['Object'] === Object;

function noop () { }

export class MuRTCSocket implements MuSocket {
    private _state = MuSocketState.INIT;
    public state () { return this._state; }
    public readonly sessionId:MuSessionId;

    public readonly wrtc:MuRTCBinding;
    private _pc:RTCPeerConnection;
    private _signal:(data:any) => void;
    private _reliableChannel:RTCDataChannel;
    private _unreliableChannel:RTCDataChannel;
    private _offerOpts:MuRTCOfferAnswerOptions;

    private _onClose = noop;

    private _scheduler:MuScheduler;
    private _logger:MuLogger;

    constructor (spec:{
        sessionId:MuSessionId,
        signal:(data:any) => void,
        wrtc?:MuRTCBinding,
        pcConfig?:MuRTCConfiguration,
        reliableConfig?:RTCDataChannelInit,
        unreliableConfig?:RTCDataChannelInit,
        offerOpts?:MuRTCOfferAnswerOptions,
        scheduler?:MuScheduler,
        logger:MuLogger,
    }) {
        if (isBrowser && !browserRTC()) {
            throw error(`browser doesn't support WebRTC`);
        }
        if (!isBrowser && !spec.wrtc) {
            throw error(`specify WebRTC binding via spec.wrtc`);
        }

        this.wrtc = browserRTC() || <MuRTCBinding>spec.wrtc;
        this.sessionId = spec.sessionId;
        this._signal = spec.signal;

        const pcConfig = spec.pcConfig || {
            iceServers: [
                { urls: 'stun:global.stun.twilio.com:3478' },
            ],
        };
        pcConfig.sdpSemantics = 'unified-plan';
        this._pc = new this.wrtc.RTCPeerConnection(pcConfig);

        // imitate TCP and UDP
        this._reliableChannel = this._pc.createDataChannel('mudb-reliable', spec.reliableConfig || { });
        this._unreliableChannel = this._pc.createDataChannel('mudb-unreliable', spec.unreliableConfig || {
            ordered: false,
            maxRetransmits: 0,
        });
        this._reliableChannel.binaryType = this._unreliableChannel.binaryType = 'arraybuffer';
        this._pc.onicecandidate = (ev) => {
            if (this._state !== MuSocketState.INIT) {
                return;
            }
            if (ev.candidate) {
                const candidate = ev.candidate.toJSON();
                candidate['sid'] = this.sessionId;
                this._signal(candidate);
            }
        };

        this._offerOpts = spec.offerOpts || { };
        this._scheduler = spec.scheduler || MuSystemScheduler;
        this._logger = spec.logger || MuDefaultLogger;
    }

    public open (spec:MuSocketSpec) {
        if (this._state !== MuSocketState.INIT) {
            throw error(`attempt to connect when connection is ${this._state === MuSocketState.OPEN ? 'open' : 'closed'}`);
        }

        if (isBrowser) {
            window.addEventListener('beforeunload', () => {
                this.close();
            });
        }

        const maybeReady = () => {
            if (this._state !== MuSocketState.INIT) {
                return;
            }
            if (this._reliableChannel.readyState === 'open' &&
                this._unreliableChannel.readyState === 'open'
            ) {
                this._state = MuSocketState.OPEN;
                spec.ready();
            }
        };
        this._reliableChannel.onopen = maybeReady;
        this._unreliableChannel.onopen = maybeReady;

        this._reliableChannel.onmessage = ({ data }) => {
            if (this._state !== MuSocketState.OPEN) {
                return;
            }
            if (typeof data !== 'string') {
                spec.message(new Uint8Array(data), false);
            } else {
                spec.message(data, false);
            }
        };
        this._unreliableChannel.onmessage = ({ data }) => {
            if (this._state !== MuSocketState.OPEN) {
                return;
            }
            if (typeof data !== 'string') {
                spec.message(new Uint8Array(data), true);
            } else {
                spec.message(data, true);
            }
        };

        const onChannelClose = (ev) => {
            if (this._state === MuSocketState.CLOSED) {
                return;
            }
            this._logger.error(`${ev.target.channel} channel closed unexpectedly`);
            this.close();
        };
        this._reliableChannel.onclose = onChannelClose;
        this._unreliableChannel.onclose = onChannelClose;
        this._reliableChannel.onerror = (e) => this.close(e);
        this._unreliableChannel.onerror = (e) => this.close(e);
        this._onClose = spec.close;

        this._scheduler.setTimeout(() => {
            this._pc.createOffer(this._offerOpts)
            .then((offer) => {
                if (this._state === MuSocketState.CLOSED) {
                    return;
                }
                this._pc.setLocalDescription(offer)
                .then(() => {
                    if (this._state === MuSocketState.CLOSED) {
                        return;
                    }
                    offer['sid'] = this.sessionId;
                    this._signal(offer);
                })
                .catch((e) => this.close(e));
            })
            .catch((e) => this.close(e));
        }, 0);
    }

    private _pendingCandidates:RTCIceCandidateInit[] = [];
    public handleSignal (data:RTCSessionDescriptionInit|RTCIceCandidateInit) {
        if (this._state !== MuSocketState.INIT) {
            return;
        }

        if (!('sdp' in data) && !('candidate' in data)) {
            this.close();
            throw error(`invalid signal: ${data}`);
        }

        const pc = this._pc;
        if ('sdp' in data) {
            pc.setRemoteDescription(data)
            .then(() => {
                if (this._state === MuSocketState.CLOSED) {
                    return;
                }
                for (let i = 0; i < this._pendingCandidates.length; ++i) {
                    pc.addIceCandidate(this._pendingCandidates[i]).catch((e) => this.close(e));
                }
                this._pendingCandidates.length = 0;
            }).catch((e) => {
                this.close(e);
            });
        } else if ('candidate' in data) {
            if (pc.remoteDescription && pc.remoteDescription.type) {
                pc.addIceCandidate(data).catch((e) => this.close(e));
            } else {
                this._pendingCandidates.push(data);
            }
        }
    }

    public send (data:MuData, unreliable?:boolean) {
        if (this._state !== MuSocketState.OPEN) {
            return;
        }
        if (unreliable) {
            this._unreliableChannel.send(<any>data);
        } else {
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
        this._reliableChannel.onopen = null;
        this._reliableChannel.onmessage = null;
        this._unreliableChannel.onopen = null;
        this._unreliableChannel.onmessage = null;
        this._pc.onicecandidate = null;
        this._reliableChannel = <any>null;
        this._unreliableChannel = <any>null;
        this._pc = <any>null;
        this._onClose();
    }

    public reliableBufferedAmount () {
        return 0;
    }

    public unreliableBufferedAmount () {
        return 0;
    }
}
