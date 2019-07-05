export type MuTimer = NodeJS.Timer | number;

export type MuRequestAnimationFrame = (callback:(time:number) => void) => number;

export type MuCancelAnimationFrame = (handle:number) => void;

export interface MuIdleDeadline {
    readonly didTimeout:boolean;
    timeRemaining:() => number;
}

export type MuRequestIdleCallback = (
    callback:(deadline:MuIdleDeadline) => void,
    options?:{ timeout:number },
) => MuTimer;

export type MuCancelIdleCallback = (handle:any) => void;

export type MuProcessNextTick = (callback:(...args:any[]) => void) => void;

export interface MuScheduler {
    now:() => number;
    setTimeout:(callback:(...args:any[]) => void, ms:number, ...args:any[]) => MuTimer;
    clearTimeout:(handle:any) => void;
    setInterval:(callback:(...args:any[]) => void, ms:number, ...args:any[]) => MuTimer;
    clearInterval:(handle:any) => void;
    requestAnimationFrame:MuRequestAnimationFrame;
    cancelAnimationFrame:MuCancelAnimationFrame;
    requestIdleCallback:MuRequestIdleCallback;
    cancelIdleCallback:MuCancelIdleCallback;
    nextTick:MuProcessNextTick;
}
