import { proxyTrkcamImage } from '../../../../utils/trkcam-proxy';

export default defineEventHandler(async (event) => {
    const category = getRouterParam(event, 'category') || '';
    const file = getRouterParam(event, 'file') || '';
    return await proxyTrkcamImage(
        event,
        `/trkcam/highlight/${encodeURIComponent(category)}/${encodeURIComponent(
            file
        )}`
    );
});
