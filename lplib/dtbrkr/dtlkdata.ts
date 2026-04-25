const BASE_URL =
    process.env.LEAP_DATA_BROKER_BASE_URL || 'http://98.116.118.25:3030/api';

const SCOPE_PARAMS = [
    'league',
    'season',
    'subsession',
    'simsession',
    'driver',
    'car',
    'track',
    'sessionType',
    'custId',
] as const;

export async function getDocument(query: {
    [name: string]: string | number;
}): Promise<any> {
    const namespace = encodeURIComponent(String(query.namespace ?? ''));
    const type = encodeURIComponent(String(query.type ?? ''));

    const params = new URLSearchParams();
    for (const key of SCOPE_PARAMS) {
        const v = query[key];
        if (v !== undefined && v !== null && v !== '') {
            params.append(key, String(v));
        }
    }

    const qs = params.toString();
    const url = `${BASE_URL}/datalake/${namespace}/${type}${
        qs ? `?${qs}` : ''
    }`;

    console.log(`:: fetch: ${url}`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            return null;
        }
        return await res.json();
    } catch (e) {
        return null;
    }
}
