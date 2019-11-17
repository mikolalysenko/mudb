export interface MuLogger {
    log:(mesg:string) => void;
    error:(mesg:string) => void;
    exception:(e:Error) => void;
}

export const MuDefaultLogger = {
    log: () => {},
    error: (x:string) => console.log(`mudb error: ${x}`),
    exception: console.error,
};