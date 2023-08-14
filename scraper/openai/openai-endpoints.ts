import { Configuration, OpenAIApi } from 'openai';

const isLive = true;
export async function createCompletion(prompt: string): Promise<string> {
    console.log('\n\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    console.log(prompt);
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');

    let ret = '';

    if (isLive) {
        ret = await createCompletion_live(prompt);
    } else {
        ret = createCompletion_test(prompt);
    }

    console.log(ret);
    console.log('------------------------------------');

    return ret || 'error';
}

let completionCallCount = 0;
function createCompletion_test(prompt: string): string {
    ++completionCallCount;

    return `completion-token-${completionCallCount}:${
        prompt.split(' ').length
    }`;
}

async function createCompletion_live(prompt: string): Promise<string> {
    const configuration = new Configuration({
        apiKey: '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',
    });
    const openai = new OpenAIApi(configuration);

    try {
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: prompt,
            temperature: 0.9,
            max_tokens: 804,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0.6,
            stop: [' Human:', ' AI:'],
        });

        console.log(JSON.stringify(response.data, null, '    '));

        return <string>(<any>response.data.choices[0]).text;
    } catch (error) {
        console.log(JSON.stringify(error, null, '    '));
    }

    return 'error';
}
