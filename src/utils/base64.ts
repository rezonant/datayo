declare class Buffer {
    static from(str : String, encoding? : string) : Buffer;
    toString(encoding? : string): string;
}

export function encodeBase64(str : string) {
    if (typeof btoa !== 'undefined')
        return btoa(str);
    else if (typeof Buffer !== 'undefined')
        return Buffer.from(str).toString('base64');
}

export function decodeBase64(str : string) {
    if (typeof atob !== 'undefined')
        return atob(str);
    else if (typeof Buffer !== 'undefined')
        return Buffer.from(str, 'base64').toString();
}