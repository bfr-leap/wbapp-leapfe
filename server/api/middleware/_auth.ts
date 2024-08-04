export async function middleware(req: any, next: (req: any) => Promise<void>) {
    try {
        let authorizationHeader = req.headers.authorization;
        const token = authorizationHeader.replace('Bearer ', '');
        req.auth = token;
        return await next(req);
    } catch (error) {
        // console.log(error);
    }

    return null;
}
