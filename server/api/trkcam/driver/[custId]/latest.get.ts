import { proxyTrkcamImage } from '../../../../utils/trkcam-proxy';

export default defineEventHandler(async (event) => {
    const custId = getRouterParam(event, 'custId') || '';
    return await proxyTrkcamImage(
        event,
        `/trkcam/driver/${encodeURIComponent(custId)}/latest`
    );
});
