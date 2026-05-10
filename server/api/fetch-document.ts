import { middleware as authMiddleware } from './middleware/_auth-user';
import { getDocument } from '@@/lplib/dtbrkr/ftchdata';

/**
 * `LEAP_BROKER_DISABLED=1` short-circuits every broker fetch to
 * `{ doc: null }` instantly — used by the SSR smoke tests
 * (`npm run test:smoke`) so they exercise the "broker returned
 * nothing" code path without hanging on multi-second connection
 * timeouts to a real broker. Production never sets this; if anything
 * else does, it's a bug.
 */
const BROKER_DISABLED = process.env.LEAP_BROKER_DISABLED === '1';

export default defineEventHandler(async (event) => {
    if (BROKER_DISABLED) return { doc: null };

    const req: any = event.node.req;

    req.query = getQuery(event);

    const ret = await handler(req);
    return { doc: ret };
});

async function handler(req: any): Promise<any> {
    const namespace = req?.query?.namespace?.toLocaleString() || '';
    const type = req?.query?.type?.toLocaleString() || '';

    const authorizationHeader: string = req?.headers?.authorization || '';
    const rawToken = authorizationHeader.replace(/^Bearer\s+/, '');
    const hasToken = !!rawToken && rawToken !== 'null';

    function buildHandlerQuery(): { [name: string]: string | number } {
        const q: { [name: string]: string | number } = {
            userID: req?.user?.id || '',
            _authHeader: req?.headers?.authorization || '',
        };
        for (let key of Object.keys(req?.query || {})) {
            q[key] = req?.query?.[key] || '';
        }
        return q;
    }

    async function authMwAdapter(
        n_: string,
        q_: any,
        next: (n__: string, q__: any) => Promise<any>
    ): Promise<any> {
        // Anonymous request — bypass Clerk verification so public
        // namespaces (rulings, results, etc.) still load for logged-out
        // viewers. Handlers see an empty userID and can decide whether
        // to serve or reject the request.
        if (!hasToken) {
            return await next(namespace, buildHandlerQuery());
        }

        let ret: any = null;
        let callbackReached = false;

        await authMiddleware(req, async (rq) => {
            callbackReached = true;
            ret = await next(namespace, buildHandlerQuery());
        });

        if (!callbackReached) {
            // A token was provided but failed to verify. Fall through to
            // the anonymous path so stale or invalid tokens don't break
            // access to public data.
            console.warn(
                `[FETCH-DOC] auth middleware did not complete; falling through anonymously: namespace=${namespace} type=${type}`
            );
            return await next(namespace, buildHandlerQuery());
        }

        return ret;
    }

    const doc = await getDocument(namespace, req?.query || {}, authMwAdapter);

    return doc;
}
