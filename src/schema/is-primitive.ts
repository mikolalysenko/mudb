const muPrimitiveTypes = [
    'ascii',
    'boolean',
    'fixed-ascii',
    'float32',
    'float64',
    'int8',
    'int16',
    'int32',
    'uint8',
    'uint16',
    'uint32',
    'utf8',
    'void',
];

export function isMuPrimitiveType (muType:string) : boolean {
    return muPrimitiveTypes.indexOf(muType) > -1;
}
