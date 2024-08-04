import { middleware as authMiddleware } from './middleware/_auth-user';
import { getDocument } from '@@/lplib/dtbrkr/ftchdata';

export default defineEventHandler(async (event) => {
    const req: any = event.node.req;

    req.query = getQuery(event);

    const ret = await handler(req);
    return { doc: ret };
});

async function handler(req: any): Promise<any> {
    const namespace = req?.query?.namespace?.toLocaleString() || '';

    async function authMwAdapter(
        n_: string,
        q_: any,
        next: (n__: string, q__: any) => Promise<any>
    ): Promise<any> {
        let ret: any = null;

        await authMiddleware(req, async (rq) => {
            const q: { [name: string]: string | number } = {
                userID: req?.user?.id,
            };

            for (let key of Object.keys(req?.query || {})) {
                q[key] = req?.query?.[key] || '';
            }

            ret = await next(namespace, q);
        });

        return ret;
    }

    const doc = await getDocument(namespace, req?.query || {}, authMwAdapter);

    return doc;
}
