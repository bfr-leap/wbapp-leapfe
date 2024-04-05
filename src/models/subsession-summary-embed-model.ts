import {
    getGeneratedSimsessionSummary,
} from '@/utils/fetch-util';

export interface SubsessionSummaryEmbedModel {
    summaryText: string[];
}

export function getDefaultSubsessionSummaryEmbedModel(): SubsessionSummaryEmbedModel {
    return {
        summaryText: ['']
    };

}

export async function getSubsessionSummaryEmbedModel(subsessionId: number, simsessionId: number): Promise<SubsessionSummaryEmbedModel> {

    let ret = getDefaultSubsessionSummaryEmbedModel();

    let simsessionSummary = await getGeneratedSimsessionSummary(
        subsessionId,
        simsessionId
    );

    ret.summaryText = simsessionSummary.text.split('\n');

    return ret;
}
