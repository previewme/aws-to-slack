import { SNSEvent } from 'aws-lambda';
import { parse } from './parser/cloudwatch';
import { match } from './parser/matcher';
import { postMessage } from './slack';

export async function handler(event: SNSEvent): Promise<void> {
    const message = event.Records[0].Sns.Message;
    const subject = event.Records[0].Sns.Subject;
    try {
        const awsEvent = await match(message);
        if ('deploymentId' in awsEvent) {
            console.info(awsEvent);
        } else {
            await postMessage(await parse(awsEvent, subject));
        }
    } catch (error) {
        console.info(`Could not process event ${error}`);
    }
}
