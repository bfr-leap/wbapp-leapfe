function createBuffer(val: string) {
    return new TextEncoder().encode(val);
}

/**
 * JS Implementation of MurmurHash2
 *
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 *
 * @param {Uint8Array | string} str ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */
export function MurmurHashV2(str: string, seed: number): string {
    let strBuf = createBuffer(str);
    let l = strBuf.length,
        h = seed ^ l,
        i = 0,
        k;

    while (l >= 4) {
        k =
            (strBuf[i] & 0xff) |
            ((strBuf[++i] & 0xff) << 8) |
            ((strBuf[++i] & 0xff) << 16) |
            ((strBuf[++i] & 0xff) << 24);

        k =
            (k & 0xffff) * 0x5bd1e995 +
            ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16);
        k ^= k >>> 24;
        k =
            (k & 0xffff) * 0x5bd1e995 +
            ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16);

        h =
            ((h & 0xffff) * 0x5bd1e995 +
                ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^
            k;

        l -= 4;
        ++i;
    }

    switch (l) {
        case 3:
            h ^= (strBuf[i + 2] & 0xff) << 16;
        case 2:
            h ^= (strBuf[i + 1] & 0xff) << 8;
        case 1:
            h ^= strBuf[i] & 0xff;
            h =
                (h & 0xffff) * 0x5bd1e995 +
                ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16);
    }

    h ^= h >>> 13;
    h =
        (h & 0xffff) * 0x5bd1e995 +
        ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16);
    h ^= h >>> 15;

    return 'H' + (h >>> 0);
}

/*
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 *
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 *
 * @param {Uint8Array | string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */
export function MurmurHashV3(key: string, seed: number): string {
    let keyBuf = createBuffer(key);

    let remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

    remainder = keyBuf.length & 3; // key.length % 4
    bytes = keyBuf.length - remainder;
    h1 = seed;
    c1 = 0xcc9e2d51;
    c2 = 0x1b873593;
    i = 0;

    while (i < bytes) {
        k1 =
            (keyBuf[i] & 0xff) |
            ((keyBuf[++i] & 0xff) << 8) |
            ((keyBuf[++i] & 0xff) << 16) |
            ((keyBuf[++i] & 0xff) << 24);
        ++i;

        k1 =
            ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) &
            0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 =
            ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) &
            0xffffffff;

        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1b =
            ((h1 & 0xffff) * 5 + ((((h1 >>> 16) * 5) & 0xffff) << 16)) &
            0xffffffff;
        h1 =
            (h1b & 0xffff) +
            0x6b64 +
            ((((h1b >>> 16) + 0xe654) & 0xffff) << 16);
    }

    k1 = 0;

    switch (remainder) {
        case 3:
            k1 ^= (keyBuf[i + 2] & 0xff) << 16;
        case 2:
            k1 ^= (keyBuf[i + 1] & 0xff) << 8;
        case 1:
            k1 ^= keyBuf[i] & 0xff;

            k1 =
                ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) &
                0xffffffff;
            k1 = (k1 << 15) | (k1 >>> 17);
            k1 =
                ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) &
                0xffffffff;
            h1 ^= k1;
    }

    h1 ^= keyBuf.length;

    h1 ^= h1 >>> 16;
    h1 =
        ((h1 & 0xffff) * 0x85ebca6b +
            ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) &
        0xffffffff;
    h1 ^= h1 >>> 13;
    h1 =
        ((h1 & 0xffff) * 0xc2b2ae35 +
            ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) &
        0xffffffff;
    h1 ^= h1 >>> 16;

    return 'H' + (h1 >>> 0);
}
