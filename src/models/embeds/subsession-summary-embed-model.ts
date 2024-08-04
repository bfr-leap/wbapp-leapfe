import { getGeneratedSimsessionSummary } from '@@/src/utils/fetch-util';
import { is } from '@xata.io/client';

export interface SubsessionSummaryEmbedModel {
    summaryText: string[];
    isLight: boolean;
}

export function getDefaultSubsessionSummaryEmbedModel(): SubsessionSummaryEmbedModel {
    return {
        summaryText: [''],
        isLight: false,
    };
}

export async function getSubsessionSummaryEmbedModel(
    subsessionId: number,
    simsessionId: number,
    isLight: boolean
): Promise<SubsessionSummaryEmbedModel> {
    let ret = getDefaultSubsessionSummaryEmbedModel();

    let simsessionSummary = await getGeneratedSimsessionSummary(
        subsessionId,
        simsessionId
    );

    ret.summaryText = simsessionSummary?.text.split('\n') || [];
    ret.isLight = isLight;

    return ret;
}
