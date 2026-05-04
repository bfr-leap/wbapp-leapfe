/**
 * Admin CRUD service — placeholder client for the LEAP Data Broker's
 * global `/api/admin/crud/*` endpoints (gated server-side by feature flag).
 *
 * Each call returns a `CrudResult` envelope produced by the
 * `adminCrudHandler` server proxy: it exposes the proxied URL, HTTP
 * method, status, timing, and the broker's raw response so the
 * placeholder UI can show what actually happened on the wire.
 *
 * JSON request bodies are forwarded by URI-encoding the stringified
 * payload into a `_body` query parameter — Nitro's `getQuery` decodes
 * it once on the server, then `adminCrudHandler` JSON-parses it.
 */

import { fetchUncached } from '@@/src/utils/api-client';

const NAMESPACE = 'ldata-admcrud';

export interface CrudResult<T = unknown> {
    _ok?: boolean;
    _error?: boolean;
    _source: string;
    _method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    _url?: string;
    _status?: number;
    _durationMs?: number;
    _baseUrl?: string;
    _message?: string;
    _data?: T;
}

function encodeBody(body: unknown): string {
    if (body === undefined) return '';
    return encodeURIComponent(JSON.stringify(body));
}

export async function listCrudTables(): Promise<CrudResult> {
    return await fetchUncached<CrudResult>({
        namespace: NAMESPACE,
        type: 'crudTables',
    });
}

export async function getCrudSchema(table: string): Promise<CrudResult> {
    return await fetchUncached<CrudResult>({
        namespace: NAMESPACE,
        type: 'crudSchema',
        table,
    });
}

export async function listCrudRows(table: string): Promise<CrudResult> {
    return await fetchUncached<CrudResult>({
        namespace: NAMESPACE,
        type: 'crudList',
        table,
    });
}

export async function lookupCrudRow(
    table: string,
    body: unknown
): Promise<CrudResult> {
    return await fetchUncached<CrudResult>({
        namespace: NAMESPACE,
        type: 'crudGet',
        table,
        _body: encodeBody(body),
    });
}

export async function createCrudRow(
    table: string,
    body: unknown
): Promise<CrudResult> {
    return await fetchUncached<CrudResult>({
        namespace: NAMESPACE,
        type: 'crudCreate',
        table,
        _body: encodeBody(body),
    });
}

export async function updateCrudRow(
    table: string,
    body: unknown
): Promise<CrudResult> {
    return await fetchUncached<CrudResult>({
        namespace: NAMESPACE,
        type: 'crudUpdate',
        table,
        _body: encodeBody(body),
    });
}

export async function deleteCrudRow(
    table: string,
    body: unknown
): Promise<CrudResult> {
    return await fetchUncached<CrudResult>({
        namespace: NAMESPACE,
        type: 'crudDelete',
        table,
        _body: encodeBody(body),
    });
}
