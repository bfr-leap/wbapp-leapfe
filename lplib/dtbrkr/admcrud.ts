/**
 * Admin CRUD passthrough — proxies the LEAP Data Broker's
 * global `/api/admin/crud/*` endpoints.
 *
 * Endpoints (Data Broker):
 *   GET    /api/admin/crud/tables                      crud:tables
 *   GET    /api/admin/crud/tables/:table/schema        crud:schema
 *   GET    /api/admin/crud/tables/:table               crud:list
 *   POST   /api/admin/crud/tables/:table/lookup        crud:get
 *   POST   /api/admin/crud/tables/:table               crud:create
 *   PATCH  /api/admin/crud/tables/:table               crud:update
 *   DELETE /api/admin/crud/tables/:table               crud:delete
 *
 * Each call returns a CrudHandlerResult envelope so the placeholder UI
 * can inspect status, timing, source URL, and raw response body.
 */

const BASE_URL =
    process.env.LEAP_DATA_BROKER_BASE_URL || 'http://98.116.118.25:3030/api';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface CrudHandlerResult {
    _ok?: boolean;
    _error?: boolean;
    _source: string;
    _method?: Method;
    _url?: string;
    _status?: number;
    _durationMs?: number;
    _baseUrl?: string;
    _message?: string;
    _requestBody?: unknown;
    _data?: unknown;
}

function summarizeShape(data: unknown): Record<string, unknown> {
    if (data === null || data === undefined) {
        return { kind: 'empty' };
    }
    if (Array.isArray(data)) {
        return {
            kind: 'array',
            length: data.length,
            firstKeys:
                data[0] && typeof data[0] === 'object'
                    ? Object.keys(data[0] as object).slice(0, 12)
                    : undefined,
        };
    }
    if (typeof data === 'object') {
        return {
            kind: 'object',
            keys: Object.keys(data as object).slice(0, 24),
        };
    }
    return { kind: typeof data };
}

async function callBroker(
    method: Method,
    path: string,
    body: unknown,
    authHeader: string,
    source: string
): Promise<CrudHandlerResult> {
    const url = `${BASE_URL}${path}`;
    const hasBody = body !== undefined && method !== 'GET';
    const bodyJson = hasBody ? JSON.stringify(body) : '';

    console.log(`[ADMCRUD] ${source} → ${method} ${url}`, {
        hasAuth: !!authHeader,
        hasBody,
        bodyPreview: bodyJson ? bodyJson.slice(0, 240) : null,
    });

    const headers: Record<string, string> = {};
    if (authHeader) headers['Authorization'] = authHeader;
    if (hasBody) headers['Content-Type'] = 'application/json';

    const t0 = Date.now();
    try {
        const res = await fetch(url, {
            method,
            headers,
            body: hasBody ? bodyJson : undefined,
        });
        const durationMs = Date.now() - t0;

        const text = await res.text();
        let data: unknown = null;
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        }

        if (!res.ok) {
            console.error(
                `[ADMCRUD] ${source} FAILED: ${res.status} ${durationMs}ms`,
                typeof data === 'string'
                    ? data.slice(0, 400)
                    : summarizeShape(data)
            );
            return {
                _error: true,
                _source: source,
                _method: method,
                _url: url,
                _status: res.status,
                _durationMs: durationMs,
                _message: `HTTP ${res.status}`,
                _requestBody: hasBody ? body : undefined,
                _data: data,
            };
        }

        console.log(
            `[ADMCRUD] ${source} OK: ${res.status} ${durationMs}ms`,
            summarizeShape(data)
        );
        return {
            _ok: true,
            _source: source,
            _method: method,
            _url: url,
            _status: res.status,
            _durationMs: durationMs,
            _requestBody: hasBody ? body : undefined,
            _data: data,
        };
    } catch (e) {
        const durationMs = Date.now() - t0;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(
            `[ADMCRUD] ${source} NETWORK ERROR (BASE_URL=${BASE_URL}):`,
            msg
        );
        return {
            _error: true,
            _source: source,
            _method: method,
            _url: url,
            _baseUrl: BASE_URL,
            _durationMs: durationMs,
            _message: `NETWORK ERROR: ${msg}`,
            _requestBody: hasBody ? body : undefined,
        };
    }
}

function decodeBody(raw: unknown): unknown {
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (typeof raw !== 'string') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.warn(
            '[ADMCRUD] failed to JSON.parse _body, forwarding raw string',
            e
        );
        return raw;
    }
}

function buildQueryString(params: unknown): string {
    if (!params || typeof params !== 'object') return '';
    const parts: string[] = [];
    for (const [key, value] of Object.entries(
        params as Record<string, unknown>
    )) {
        if (value === undefined || value === null || value === '') continue;
        if (
            typeof value === 'object' &&
            !Array.isArray(value) &&
            value !== null
        ) {
            for (const [k, v] of Object.entries(
                value as Record<string, unknown>
            )) {
                if (v === undefined || v === null || v === '') continue;
                parts.push(
                    `${encodeURIComponent(key)}[${encodeURIComponent(
                        k
                    )}]=${encodeURIComponent(String(v))}`
                );
            }
        } else {
            parts.push(
                `${encodeURIComponent(key)}=${encodeURIComponent(
                    String(value)
                )}`
            );
        }
    }
    return parts.length ? `?${parts.join('&')}` : '';
}

export async function adminCrudHandler(
    namespace: string,
    query: { [name: string]: string | number }
): Promise<CrudHandlerResult> {
    const type = String(query?.type || '');
    const table = String(query?.table || '');
    const authHeader = String(query?._authHeader || '');
    const body = decodeBody(query?._body);
    const brokerQuery = decodeBody(query?._query);
    const qs = buildQueryString(brokerQuery);

    console.log('[ADMCRUD] adminCrudHandler()', {
        namespace,
        type,
        table,
        BASE_URL,
        hasAuth: !!authHeader,
        hasBody: body !== undefined,
        hasQuery: !!qs,
    });

    const tablePath = encodeURIComponent(table);

    switch (type) {
        case 'crudTables':
            return callBroker(
                'GET',
                `/admin/crud/tables`,
                undefined,
                authHeader,
                'crudTables'
            );
        case 'crudSchema':
            return callBroker(
                'GET',
                `/admin/crud/tables/${tablePath}/schema`,
                undefined,
                authHeader,
                'crudSchema'
            );
        case 'crudList':
            return callBroker(
                'GET',
                `/admin/crud/tables/${tablePath}${qs}`,
                undefined,
                authHeader,
                'crudList'
            );
        case 'crudGet':
            return callBroker(
                'POST',
                `/admin/crud/tables/${tablePath}/lookup`,
                body,
                authHeader,
                'crudGet'
            );
        case 'crudCreate':
            return callBroker(
                'POST',
                `/admin/crud/tables/${tablePath}`,
                body,
                authHeader,
                'crudCreate'
            );
        case 'crudUpdate':
            return callBroker(
                'PATCH',
                `/admin/crud/tables/${tablePath}`,
                body,
                authHeader,
                'crudUpdate'
            );
        case 'crudDelete':
            return callBroker(
                'DELETE',
                `/admin/crud/tables/${tablePath}`,
                body,
                authHeader,
                'crudDelete'
            );
        default:
            console.warn('[ADMCRUD] unknown type', type);
            return {
                _error: true,
                _source: 'adminCrudHandler',
                _message: `Unknown type: ${type}`,
            };
    }
}
