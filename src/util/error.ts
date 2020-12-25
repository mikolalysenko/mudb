export function makeError (path:string) {
    return function (errOrMsg:Error|string) {
        const msg = typeof errOrMsg === 'string' ? errOrMsg : errOrMsg.toString();
        return new Error(`${msg} [mudb/${path}]`);
    };
}
