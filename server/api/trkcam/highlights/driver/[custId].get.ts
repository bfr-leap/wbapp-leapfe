import { proxyTrkcamJson } from '../../../../utils/trkcam-proxy';

export default defineEventHandler(async (event) => {
    const custId = getRouterParam(event, 'custId') || '';
    const category = getQuery(event).category;
    const qs = category
        ? `?category=${encodeURIComponent(String(category))}`
        : '';
    return await proxyTrkcamJson(
        event,
        `/trkcam/highlights/driver/${encodeURIComponent(custId)}${qs}`
    );
});
