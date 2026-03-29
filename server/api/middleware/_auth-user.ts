import { middleware as authMW } from './_auth';
import { clerkClient, User } from '@clerk/clerk-sdk-node';

async function handler(req: any, next: (req: any) => Promise<void>) {
    try {
        const token = req.auth;
        let clerk = clerkClient;
        const vtoken = await clerk.verifyToken(token);
        const user = await clerk.users.getUser(vtoken.sub);
        req.user = user;

        try {
            return await next(req);
        } catch (e) {
            console.error(
                '[AUTH-USER] handler callback failed:',
                e instanceof Error ? e.message : e
            );
        }
    } catch (error) {
        console.error(
            '[AUTH-USER] token verification failed:',
            error instanceof Error ? error.message : error
        );
    }
}

export async function middleware(req: any, next: (req: any) => Promise<void>) {
    return await authMW(req, async (rq) => {
        return await handler(rq, next);
    });
}
