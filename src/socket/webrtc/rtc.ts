export interface MuRTCBinding {
    RTCPeerConnection:typeof RTCPeerConnection;
    RTCSessionDescription:typeof RTCSessionDescription;
    RTCIceCandidate:typeof RTCIceCandidate;
}

export function browserRTC () : MuRTCBinding|null {
    if (typeof window === 'undefined') {
        return null;
    }

    const rtc = {
        RTCPeerConnection: window['RTCPeerConnection'] || window['webkitRTCPeerConnection'] || window['mozRTCPeerConnection'],
        RTCSessionDescription: window['RTCSessionDescription'] || window['mozRTCSessionDescription'],
        RTCIceCandidate: window['RTCIceCandidate'] || window['mozRTCIceCandidate'],
    };
    if (rtc.RTCPeerConnection && rtc.RTCSessionDescription && rtc.RTCIceCandidate) {
        return rtc;
    }
    return null;
}

export interface MuRTCConfiguration extends RTCConfiguration {
    sdpSemantics?:string;
}

export interface MuRTCOfferAnswerOptions extends RTCOfferAnswerOptions {
    iceRestart?:boolean;
}
