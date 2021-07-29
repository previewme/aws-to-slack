import { SNSEvent } from 'aws-lambda';
import { match, parse } from './parser/cloudwatch';
import { postMessage } from './slack';

export async function handler(event: SNSEvent): Promise<void> {
    const message = event.Records[0].Sns.Message;
    const subject = event.Records[0].Sns.Subject;
    try {
        const alarm = await match(message);
        await postMessage(await parse(alarm, subject));
    } catch (error) {
        console.info(`Could not process event ${error}`);
    }
}
