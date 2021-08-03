import { Trigger } from './cloudwatch';
import { CloudWatch, STS } from 'aws-sdk';
import { Datapoint, Datapoints, GetMetricStatisticsInput } from 'aws-sdk/clients/cloudwatch';
import { AssumeRoleResponse } from 'aws-sdk/clients/sts';

const timePeriod = 60; // Statistics for every 60 seconds
const timeOffset = 24 * 60 * 60; // Get statistics for the last 24 hours
const width = 500;
const height = 220;
const chartSamples = 144; // Data points (1 per 10 minutes)
const extendedMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.';
const extendedMapLength = extendedMap.length;

export interface timeSlot {
    text: string;
    from: number;
    to: number;
    value?: number;
}

async function getSecurityToken(region: string, awsAccountId: string, assumeRoleName: string): Promise<AssumeRoleResponse> {
    const client = new STS({ region: region });
    return await client
        .assumeRole({
            RoleArn: `arn:aws:iam::${awsAccountId}:role/${assumeRoleName}`,
            RoleSessionName: 'alert-lambda'
        })
        .promise();
}

async function getCloudwatchClient(region: string, awsAccountId: string) {
    const assumeRoleName = process.env.ASSUME_ROLE_NAME;
    if (assumeRoleName !== undefined) {
        const assumeRole = await getSecurityToken(region, awsAccountId, assumeRoleName);
        if (assumeRole.Credentials === undefined) {
            throw Error('Could not assume role');
        }
        return new CloudWatch({
            region: region,
            credentials: {
                accessKeyId: assumeRole.Credentials.AccessKeyId,
                secretAccessKey: assumeRole.Credentials.SecretAccessKey,
                sessionToken: assumeRole.Credentials.SessionToken
            }
        });
    }
    return new CloudWatch({ region: region });
}

export async function getStatistics(region: string, query: GetMetricStatisticsInput, awsAccountId: string): Promise<Datapoints> {
    const client = await getCloudwatchClient(region, awsAccountId);
    const statistics = await client.getMetricStatistics(query).promise();
    if (!statistics.Datapoints?.length) {
        throw Error('Cloudwatch did not return any data points');
    }
    return statistics.Datapoints;
}

export function getTimeSlots(startTime: Date, endTime: Date): timeSlot[] {
    const timeSlots: timeSlot[] = [];
    for (let i = startTime.getTime(); i <= endTime.getTime(); ) {
        const from = i;
        i += (endTime.getTime() - startTime.getTime()) / chartSamples;
        const date = new Date(i);
        if (date <= endTime) {
            timeSlots.push({
                text: ('0' + date.getUTCHours()).slice(-2) + ':' + ('0' + date.getUTCMinutes()).slice(-2),
                from: from,
                to: i
            });
        }
    }
    return timeSlots;
}

export function getLabels(timeSlots: timeSlot[]): string[] {
    const numberOfLabels = width / 50;
    const frequency = Math.floor(timeSlots.length / numberOfLabels);
    return timeSlots.filter((slot, i) => (timeSlots.length - 1 - i) % frequency === 0).map((slot) => slot.text);
}

export function getAggregateValue(statistic: string, points: number[]): number | undefined {
    switch (statistic) {
        case 'Average':
            return points.reduce((accumulator, current) => accumulator + current, 0) / (points.length || 1);
        case 'Maximum':
            return Math.max(...points);
        case 'Minimum':
            return Math.min(...points);
        case 'SampleCount':
        case 'Sum':
            return points.reduce((accumulator, current) => accumulator + current);
        default:
            return undefined;
    }
}

export function getAggregateValues(timeSlots: timeSlot[], statistics: Datapoint[], statisticName: string | undefined): timeSlot[] {
    timeSlots.forEach((slot) => {
        const datapoints = statistics.filter((datapoint) => {
            const date = datapoint.Timestamp?.getTime();
            if (date !== undefined) {
                return date > slot.from && date <= slot.to;
            }
        });

        const stat = statisticName as keyof Datapoint;
        const points = datapoints
            .map((datapoint) => {
                const value = datapoint[stat];
                if (typeof value === 'number') {
                    return value;
                }
            })
            .filter((value): value is number => !!value);
        slot.value = getAggregateValue(stat, points);
    });
    return timeSlots;
}

function extendedEncode(timeSlots: timeSlot[], maximum: number) {
    // See https://developers.google.com/chart/image/docs/data_formats#encoding_data
    let chartData = '';
    timeSlots.forEach((slot) => {
        if (slot.value !== undefined) {
            const scaledVal = Math.floor((extendedMapLength * extendedMapLength * slot.value) / maximum);
            if (scaledVal > extendedMapLength * extendedMapLength - 1) {
                chartData += '..';
            } else if (scaledVal < 0) {
                chartData += '__';
            } else {
                const quotient = Math.floor(scaledVal / extendedMapLength);
                const remainder = scaledVal - extendedMapLength * quotient;
                chartData += extendedMap.charAt(quotient) + extendedMap.charAt(remainder);
            }
        } else {
            chartData += '__';
        }
    });
    return chartData;
}

function getChartUrl(labels: string[], trigger: Trigger, aggregates: timeSlot[]) {
    const absMaxValue = Math.max(
        ...aggregates.map((agg) => {
            return agg.value === undefined ? 0 : agg.value;
        })
    );
    const topEdge = absMaxValue > trigger.Threshold ? absMaxValue * 1.05 : trigger.Threshold * 1.05;
    const threshold = Array<timeSlot>(aggregates.length).fill({
        from: 0,
        text: '',
        to: 0,
        value: trigger.Threshold
    });
    const params = [
        'cht=ls',
        'chma=20,15,5,5|0,20',
        'chxt=x,y',
        'chxl=0:|' + labels.join('|'),
        'chco=af9cf4,FF0000',
        'chls=2|.5,5,5',
        'chs=' + width + 'x' + height,
        'chxr=1,0,' + topEdge + ',' + Math.floor((topEdge / height) * 20),
        'chg=20,10,1,5',
        'chdl=' + encodeURIComponent(`${trigger.MetricName} (${trigger.Statistic}/${trigger.Period}s)`),
        'chdlp=b',
        'chd=e:' + extendedEncode(aggregates, topEdge) + ',' + extendedEncode(threshold, topEdge)
    ];
    return 'https://chart.googleapis.com/chart?' + params.join('&');
}

export async function getChart(trigger: Trigger, region: string, time: string, awsAccountId: string): Promise<string | undefined> {
    const query: GetMetricStatisticsInput = {
        Namespace: trigger.Namespace,
        MetricName: trigger.MetricName,
        Dimensions: trigger.Dimensions.map((dimension) => ({ Name: dimension.name, Value: dimension.value })),
        Statistics: [trigger.Statistic[0].toUpperCase() + trigger.Statistic.toLowerCase().slice(1)],
        Unit: trigger.Unit,
        StartTime: new Date(new Date(time).getTime() - timeOffset * 1000),
        EndTime: new Date(time),
        Period: timePeriod
    };

    const statistics = await getStatistics(region, query, awsAccountId);
    if (query.Statistics !== undefined && statistics !== undefined) {
        const timeSlots = getTimeSlots(query.StartTime, query.EndTime);
        const labels = getLabels(timeSlots);
        const aggregates = getAggregateValues(timeSlots, statistics, query.Statistics[0]);
        return getChartUrl(labels, trigger, aggregates);
    }
    throw Error('There are no datapoints to create the chart.');
}
