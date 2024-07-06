import { middleware as authMiddleware } from './middleware/_auth-user';
import { getDocument } from '../lplib/dtbrkr/ftchdata';

export default async function handler(req: any, res: any) {
    const namespace = req?.query?.namespace?.toLocaleString() || '';

    async function authMwAdapter(n_: string, q_: any, next: (n__: string, q__: any) => Promise<any>): Promise<any> {
        let ret: any = null;

        await authMiddleware(req, res, async (rq, rs) => {

            const q: { [name: string]: string | number } = {
                userID: req?.user?.id,
            }

            for (let key of Object.keys(req?.query || {})) {
                q[key] = req?.query?.[key] || '';
            }

            ret = await next(namespace, q);
        });

        return ret;
    }

    const doc = await getDocument(namespace, req?.query || {}, authMwAdapter);

    res.status(200).json({ doc });
}