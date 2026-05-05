/**
 * Admin CRUD service — typed client for the LEAP Data Broker's
 * global `/api/admin/crud/*` endpoints (gated server-side by the
 * `global_admin` feature flag, enforced inside `dispatchCrud`).
 *
 * Body shapes match the broker's Hono handlers in
 * `src/routes/dtbrkr-write.ts`:
 *
 *   POST   /tables/:table/lookup  → { key:    { <pk>: ... } }       → row | null
 *   POST   /tables/:table         → { values: { <col>: ... } }      → inserted row
 *   PATCH  /tables/:table         → { key, values }                  → post-update row | null
 *   DELETE /tables/:table         → { key }                          → { deleted: boolean }
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
    _requestBody?: unknown;
    _data?: T;
}

export type CrudKey = Record<string, string | number>;
export type CrudValues = Record<string, string | number | boolean | null>;

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
    key: CrudKey
): Promise<CrudResult> {
    return await fetchUncached<CrudResult>({
        namespace: NAMESPACE,
        type: 'crudGet',
        table,
        _body: encodeBody({ key }),
    });
}

export async function createCrudRow(
    table: string,
    values: CrudValues
): Promise<CrudResult> {
    return await fetchUncached<CrudResult>({
        namespace: NAMESPACE,
        type: 'crudCreate',
        table,
        _body: encodeBody({ values }),
    });
}

export async function updateCrudRow(
    table: string,
    key: CrudKey,
    values: CrudValues
): Promise<CrudResult> {
    return await fetchUncached<CrudResult>({
        namespace: NAMESPACE,
        type: 'crudUpdate',
        table,
        _body: encodeBody({ key, values }),
    });
}

export async function deleteCrudRow(
    table: string,
    key: CrudKey
): Promise<CrudResult> {
    return await fetchUncached<CrudResult>({
        namespace: NAMESPACE,
        type: 'crudDelete',
        table,
        _body: encodeBody({ key }),
    });
}
