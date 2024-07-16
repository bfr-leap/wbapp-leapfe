import { middleware as authMW } from './_auth';
import { clerkClient, User } from '@clerk/clerk-sdk-node';

async function handler(
    req: any,
    res: any,
    next: (req: any, res: any) => Promise<void>
) {
    try {
        const token = req.auth;
        let clerk = clerkClient;
        const vtoken = await clerk.verifyToken(token);
        const user = await clerk.users.getUser(vtoken.sub);
        req.user = user;

        try {
            await next(req, res);
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

export async function middleware(
    req: any,
    res: any,
    next: (req: any, res: any) => Promise<void>
) {
    await authMW(req, res, async (rq, rs) => {
        await handler(rq, rs, next);
    });
}
