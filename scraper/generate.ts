import { Configuration, OpenAIApi } from 'openai';
import {
    getLeagueSeasons,
    getLeagueSeasonSessions,
    getLapChartData,
} from './iracing-scraped-data-loader.js';

async function chat(prompt: string) {
    const configuration = new Configuration({
        apiKey: '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',
    });
    const openai = new OpenAIApi(configuration);

    try {
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: prompt,
            temperature: 0,
            max_tokens: 100000,
            top_p: 1.0,
            frequency_penalty: 0.5,
            presence_penalty: 0.0,
            stop: ['You:'],
        });

        console.log(JSON.stringify(response.data, null, '    '));
    } catch (error) {
        console.log(JSON.stringify(error, null, '    '));
    }

    console.log('done');
}

function simsessionPrompt() {
    const fileContents = getLapChartData(50688662, 0);
    return (
        'The following is lap by lap raw data from a motor race:\n' +
        JSON.stringify(fileContents, null, '    ') +
        '\nThe follwing is a broadcast style summary of what happened during the race:\n'
    );
}

console.log(simsessionPrompt());

// chat(simsessionPrompt());

// chat(
//     'You: How do I combine arrays?\nJavaScript chatbot: You can use the concat() method.\nYou: How do you make an alert appear after 10 seconds?\nJavaScript chatbot'
// );
