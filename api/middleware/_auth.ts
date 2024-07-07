export async function middleware(req: any, res: any, next: (req: any, res: any) => Promise<void>) {
    if (req.method === 'GET') {
        try {
            let authorizationHeader = req.headers.authorization;
            const token = authorizationHeader.replace('Bearer ', '');
            req.auth = token;

            try {
                await next(req, res);
            } catch (e) {
                console.log(e.toString());
                res.status(500).json({ error: 'Internal Server Error ' });
            }

        } catch (error) {
            res.status(401).json({ error: 'Unauthorized' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' })
    }
}