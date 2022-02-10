import { buildFieldSection, buildHeader, buildImageBlock, buildTextBlock, buildTextSection, COLOURS, SlackMessage } from '../slack';
import { getChart } from './chart';

export interface CloudwatchAlarm {
    AlarmName: string;
    AlarmDescription: string;
    AWSAccountId: string;
    NewStateValue: string;
    NewStateReason: string;
    StateChangeTime: string;
    Region: string;
    OldStateValue: string;
    Trigger: Trigger;
}

export interface Trigger {
    MetricName: string;
    Namespace: string;
    Statistic: string;
    Unit: string;
    Dimensions: Array<Dimension>;
    Period: number;
    EvaluationPeriods: number;
    ComparisonOperator: string;
    Threshold: number;
}

export interface Dimension {
    name: string;
    value: string;
}

export async function cloudwatchParse(alarm: CloudwatchAlarm, subject: string): Promise<SlackMessage> {
    const region = regionNameToId[alarm.Region] || alarm.Region;
    try {
        const chartUrl = await getChart(alarm.Trigger, region, alarm.StateChangeTime, alarm.AWSAccountId);
        return buildSlackMessage(subject, region, alarm, chartUrl);
    } catch (error) {
        console.info(`Could not build chart: ${error}`);
    }
    return buildSlackMessage(subject, region, alarm);
}

function buildSlackMessage(subject: string, region: string, alarm: CloudwatchAlarm, image_url?: string): SlackMessage {
    const message: SlackMessage = {
        text: `${subject}\n*Alarm Reason:* <!channel>\n${alarm.NewStateReason}\n*Alarm Link:*\nhttps://console.aws.amazon.com/cloudwatch/home?region=${region}#alarm:name=${alarm.AlarmName}`,
        blocks: [
            buildHeader(subject),
            buildTextSection('mrkdwn', `*Alarm Reason:* <!channel>\n ${alarm.NewStateReason}\n`),
            buildTextSection('mrkdwn', `*Alarm Link:*\nhttps://console.aws.amazon.com/cloudwatch/home?region=${region}#alarm:name=${alarm.AlarmName}`)
        ],
        attachments: [
            {
                color: getMessageColour(alarm.NewStateValue),
                blocks: [
                    buildFieldSection('mrkdwn', [`*State Change:*\n ${alarm.OldStateValue} -> ${alarm.NewStateValue}`, `*Region:*\n ${alarm.Region}`])
                ]
            }
        ]
    };

    if (message.attachments !== undefined) {
        if (image_url !== undefined) {
            message.attachments[0].blocks.push(buildImageBlock(image_url, 'CloudWatch metrics graph'));
        }
        message.attachments[0].blocks.push({
            type: 'context',
            elements: [
                buildTextBlock('plain_text', `Account ID: ${alarm.AWSAccountId}`),
                buildTextBlock('plain_text', `Date: ${new Date(alarm.StateChangeTime).toISOString()}`)
            ]
        });
    }
    return message;
}

function getMessageColour(alarmState: string): string {
    switch (alarmState) {
        case 'OK':
            return COLOURS.ok;
        case 'ALARM':
            return COLOURS.critical;
        case 'INSUFFICIENT_DATA':
            return COLOURS.warning;
        default:
            return COLOURS.neutral;
    }
}

const regionNameToId: { [key: string]: string } = {
    // Copied from https://docs.aws.amazon.com/general/latest/gr/rande.html
    'US East (Ohio)': 'us-east-2',
    'US East (N. Virginia)': 'us-east-1',
    'US West (N. California)': 'us-west-1',
    'US West (Oregon)': 'us-west-2',
    'Africa (Cape Town)': 'af-south-1',
    'Asia Pacific (Hong Kong)': 'ap-east-1',
    'Asia Pacific (Mumbai)': 'ap-south-1',
    'Asia Pacific (Osaka)': 'ap-northeast-3',
    'Asia Pacific (Seoul)': 'ap-northeast-2',
    'Asia Pacific (Singapore)': 'ap-southeast-1',
    'Asia Pacific (Sydney)': 'ap-southeast-2',
    'Asia Pacific (Tokyo)': 'ap-northeast-1',
    'Canada (Central)': 'ca-central-1',
    'China (Beijing)': 'cn-north-1',
    'China (Ningxia)': 'cn-northwest-1',
    'Europe (Frankfurt)': 'eu-central-1',
    'Europe (Ireland)': 'eu-west-1',
    'Europe (London)': 'eu-west-2',
    'Europe (Milan)': 'eu-south-1',
    'Europe (Paris)': 'eu-west-3',
    'Europe (Stockholm)': 'eu-north-1',
    'South America (Sao Paulo)': 'sa-east-1'
};
