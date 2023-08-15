/**
 *
 * This file defines a Node.js module that facilitates interactions with the iRacing API. It uses Axios
 * for making HTTP requests, manages cookies using the Tough Cookie library, and implements a custom HTTP
 * cookie agent for maintaining session state. The module supports authentication, GET requests with query
 * parameters, and handling of chunked data responses. It also includes functionality to hash passwords,
 * send authentication requests, and save cookies to a file.
 *
 */

import FileCookieStore from '@root/file-cookie-store';
import { CookieJar } from 'tough-cookie';
import axios from 'axios';
import { HttpCookieAgent, HttpsCookieAgent } from 'http-cookie-agent/http';
import Base64 from 'crypto-js/enc-base64.js';
import sha256 from 'crypto-js/sha256.js';

/**
 * Latest documentation can be found at:
 * https://members-ng.iracing.com/data/doc
 */

const store = new FileCookieStore('./cookie.txt', { auto_sync: false });
const jar = new CookieJar(store);

const BASE_URL = 'https://members-ng.iracing.com';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const client = axios.create({
    baseURL: BASE_URL,
    httpAgent: new HttpCookieAgent({ cookies: { jar } }),
    httpsAgent: new HttpsCookieAgent({ cookies: { jar } }),
});

export async function clientGet(
    url: string,
    queryParams: { [name: string]: any } = {}
): Promise<any> {
    // console.log('client request:: ', url, queryParams);

    await sleep(Math.random() * 1000);

    const params = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, value);
    });

    let response: any = {};

    if (params.toString().length > 0) {
        response = await client.get(`${url}?${params.toString()}`, {
            headers: {
                'Accept-Encoding': 'application/json',
            },
        });
    } else {
        response = await client.get(url, {
            headers: {
                'Accept-Encoding': 'application/json',
            },
        });
    }

    if (response.data && response.data.link !== undefined) {
        // lets go grab the cached result

        let sentinel = JSON.stringify(response.data.link, null, '    ');
        if ('undefined' !== sentinel && undefined !== sentinel) {
            // console.log(' lets go grab the cached result', sentinel);
            let ret = await clientGet(response.data.link);
            return ret;
        }
    } else if (response.data && response.data.chunk_info) {
        // the bulk of the data is chucked, lets go get it
        let ci = response.data.chunk_info;
        if (
            ci.base_download_url &&
            ci.chunk_file_names &&
            ci.chunk_file_names.length > 0
        ) {
            let newChunk: any[] = [];

            for (let chukName of response.data.chunk_info.chunk_file_names) {
                // console.log('the bulk of the data is chucked, lets go get it');
                let chunkFile = await clientGet(
                    response.data.chunk_info.base_download_url + chukName
                );
                newChunk = newChunk.concat(chunkFile);
            }

            response.data.chunk_info = newChunk;
        }
    }

    return response.data;
}

export async function auth(username: string, password: string) {
    const cookies = await jar.getCookies(BASE_URL);
    const authCookie = cookies.find(
        (cookie) => cookie.key === 'authtoken_members'
    );
    // if (authCookie && authCookie.TTL() > 0) {
    //     return;
    // }

    const hashPassword = Base64.stringify(
        sha256(password + username.toLowerCase())
    );
    await client.post('/auth', {
        email: username,
        password: hashPassword,
    });
    console.log('posted auth:');
    store.save();
}
