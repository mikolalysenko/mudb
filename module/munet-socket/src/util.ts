export function isJSON (buf:Buffer) {
    return buf[0] === 0x7b && buf[buf.length - 1] === 0x7d;
}
