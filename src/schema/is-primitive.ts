const muPrimitiveTypes = [
    'void',
    'boolean',
    'ascii', 'fixed-ascii', 'utf8',
    'float32', 'float64', 'int8', 'int16', 'int32', 'uint8', 'uint16', 'uint32', 'varint', 'rvarint',
];

export function isMuPrimitiveType (muType:string) : boolean {
    return muPrimitiveTypes.indexOf(muType) > -1;
}
