export type MuTimer = NodeJS.Timer | number;

export interface MuScheduler {
    setTimeout:(callback:(...args:any[]) => void, ms:number, ...args:any[]) => MuTimer;
    clearTimeout:(handle:any) => void;
    setInterval:(callback:(...args:any[]) => void, ms:number, ...args:any[]) => MuTimer;
    clearInterval:(handle:any) => void;
    requestAnimationFrame:(callback:(time:number) => void) => number;
    cancelAnimationFrame:(handle:number) => void;
}
