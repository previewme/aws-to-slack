import { SNSEvent } from 'aws-lambda';
import { cloudwatchParse } from './parser/cloudwatch';
import { codedeployParse } from './parser/codedeploy';
import { match } from './parser/matcher';
import { postMessage } from './slack';

export async function handler(event: SNSEvent): Promise<void> {
    const message = event.Records[0].Sns.Message;
    const subject = event.Records[0].Sns.Subject;
    try {
        const awsEvent = await match(message);
        if ('deploymentId' in awsEvent) {
            await postMessage(await codedeployParse(awsEvent, subject));
        } else {
            await postMessage(await cloudwatchParse(awsEvent, subject));
        }
    } catch (error) {
        console.info(`Could not process event ${error}`);
    }
}
