import { CloudwatchAlarm } from './cloudwatch';
import { CodedeployEvent } from './codedeploy';

export async function match(message: string): Promise<CodedeployEvent | CloudwatchAlarm> {
    const messageJSON = JSON.parse(message);
    if (messageJSON.AlarmName && messageJSON.AlarmDescription) {
        return messageJSON as CloudwatchAlarm;
    }
    if (messageJSON.deploymentGroupName && messageJSON.deploymentId) {
        return messageJSON as CodedeployEvent;
    }
    throw new Error('Unable to process event as it is not recognised');
}
