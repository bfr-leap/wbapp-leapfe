import type { HLBarChartDatum } from '@/models/hl-bar-chart-model';
import { getStartFinishChartData } from '@/utils/fetch-util';

export async function getStartFinishData(
    league: string,
    subsession: string,
    simsession: string
): Promise<HLBarChartDatum[]> {
    if (!simsession || !subsession || !league) {
        return [];
    }
    let x = await getStartFinishChartData(league, subsession, simsession);

    let ret = x.map((v) => {
        return {
            name: `${v['name']} P${v['finish']}`,
            hi: -1 * <number>v['finish'],
            lo:
                -1 *
                (<number>v['start'] === 0
                    ? <number>v['finish']
                    : <number>v['start']),
        };
    });

    return ret;
}
