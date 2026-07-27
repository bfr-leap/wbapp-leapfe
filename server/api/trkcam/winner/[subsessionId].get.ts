import { proxyTrkcamImage } from '../../../utils/trkcam-proxy';

export default defineEventHandler(async (event) => {
    const subsessionId = getRouterParam(event, 'subsessionId') || '';
    return await proxyTrkcamImage(
        event,
        `/trkcam/winner/${encodeURIComponent(subsessionId)}`
    );
});
