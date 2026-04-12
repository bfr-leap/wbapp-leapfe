import { getDocument as getDataLakeDocument } from './dtlkdata';
import { userDataHandler } from './usrdata';
import { userConfigHandler } from './usrcfg';
import { adminConfigHandler } from './admcfg';
import { stewardConfigHandler } from './stwdcfg';

type Query = { [name: string]: number | string };
type Middleware = (
    namespace: string,
    query: Query,
    next: (namespace: string, query: Query) => Promise<any>
) => Promise<any>;

async function passthroughMiddleware(
    namespace: string,
    query: Query,
    next: (namespace: string, query: Query) => Promise<any>
): Promise<any> {
    return await next(namespace, query);
}

export async function getDocument(
    namespace: string,
    query: Query,
    authMiddleware: Middleware = passthroughMiddleware
): Promise<any> {
    console.log(': getDocument');

    if ('ldata-usrdata' === namespace) {
        return await authMiddleware(namespace, query, userDataHandler);
    }

    if ('ldata-admcfg' === namespace) {
        return await authMiddleware(namespace, query, adminConfigHandler);
    }

    if ('ldata-stwdcfg' === namespace) {
        return await authMiddleware(namespace, query, stewardConfigHandler);
    }

    if ('ldata-usrcfg' === namespace) {
        return await userConfigHandler(namespace, query);
    }

    let ret = await getDataLakeDocument(query);
    return ret;
}
