export interface MuSetTimeout {
    (handler:(...args:any[]) => void, ms:number) : number | NodeJS.Timer;
}

export interface MuClearTimeout {
    (handle:any) : void;
}

export interface MuScheduler {
    setTimeout:MuSetTimeout;
    clearTimeout:MuClearTimeout;
    setInterval:MuSetTimeout;
    clearInterval:MuClearTimeout;
}
