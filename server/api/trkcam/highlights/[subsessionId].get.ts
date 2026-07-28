import { proxyTrkcamJson } from '../../../utils/trkcam-proxy';

export default defineEventHandler(async (event) => {
    const subsessionId = getRouterParam(event, 'subsessionId') || '';
    const category = getQuery(event).category;
    const qs = category
        ? `?category=${encodeURIComponent(String(category))}`
        : '';
    return await proxyTrkcamJson(
        event,
        `/trkcam/highlights/${encodeURIComponent(subsessionId)}${qs}`
    );
});
