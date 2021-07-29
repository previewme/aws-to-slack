import { getAggregateValue, getAggregateValues, getChart, getLabels, getStatistics, getTimeSlots } from '../../src/parser/chart';
import { Datapoint, GetMetricStatisticsInput } from 'aws-sdk/clients/cloudwatch';
import { default as alarm } from '../resources/cloudwatch-alarm-event.json';

let mockGetMetricStatistics = jest.fn();

jest.mock('aws-sdk', () => {
    return {
        CloudWatch: jest.fn(() => {
            return { getMetricStatistics: mockGetMetricStatistics };
        })
    };
});

describe('Ensure charts are correctly generated', () => {
    const startTime = new Date(1627431913789);
    const endTime = new Date(1627440553789);
    const testSlots = getTimeSlots(startTime, endTime);

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        mockGetMetricStatistics = jest.fn(() => {
            return {
                promise: jest.fn(() =>
                    Promise.resolve({
                        Datapoints: [
                            {
                                Timestamp: new Date(Date.now()),
                                Average: 5,
                                Unit: 'Seconds'
                            },
                            {
                                Timestamp: new Date(Date.now()),
                                Average: 13,
                                Unit: 'Seconds'
                            }
                        ]
                    })
                )
            };
        });
    });

    test('Retrieves Cloudwatch metrics', async () => {
        const query: GetMetricStatisticsInput = {
            Namespace: 'Namespace',
            MetricName: 'MetricName',
            Dimensions: [{ Name: 'DimensionName', Value: 'DimensionValue' }],
            Statistics: ['Average'],
            Unit: 'Seconds',
            StartTime: new Date(),
            EndTime: new Date(),
            Period: 300
        };

        const statistics = await getStatistics('us-east-1', query);
        expect(statistics.length).toEqual(2);
        expect(mockGetMetricStatistics).toHaveBeenCalledTimes(1);
        expect(mockGetMetricStatistics).toHaveBeenCalledWith(query);
    });

    test('No datapoints returned by Cloudwatch metrics', async () => {
        const query: GetMetricStatisticsInput = {
            Namespace: 'Empty',
            MetricName: 'MetricName',
            Dimensions: [{ Name: 'DimensionName', Value: 'DimensionValue' }],
            Statistics: ['Average'],
            Unit: 'Seconds',
            StartTime: new Date(),
            EndTime: new Date(),
            Period: 300
        };

        mockGetMetricStatistics = jest.fn(() => {
            return {
                promise: jest.fn(() => Promise.resolve({ Datapoints: [] }))
            };
        });
        await expect(getStatistics('us-east-1', query)).rejects.toThrowError('Cloudwatch did not return any data points');
    });

    test('Ensure there are 144 time slots', async () => {
        const slots = getTimeSlots(startTime, endTime);
        expect(slots).toHaveLength(144);
        expect(slots[0].value).toEqual(undefined);
        expect(slots[0].from).toEqual(1627431913789);
        expect(slots[0].to).toEqual(1627431973789);
        expect(slots[0].text).toEqual('00:26');

        expect(slots[1].value).toEqual(undefined);
        expect(slots[1].from).toEqual(1627431973789);
        expect(slots[1].to).toEqual(1627432033789);
        expect(slots[1].text).toEqual('00:27');

        const last = slots.length - 1;
        expect(slots[last].value).toEqual(undefined);
        expect(slots[last].from).toEqual(1627440493789);
        expect(slots[last].to).toEqual(1627440553789);
        expect(slots[last].text).toEqual('02:49');
    });

    test('Ensure chart labels are generated', async () => {
        const labels = getLabels(testSlots);
        expect(labels).toHaveLength(11);
        expect(labels[0]).toEqual('00:29');
        expect(labels[1]).toEqual('00:43');
        expect(labels[labels.length - 1]).toEqual('02:49');
    });

    test('Ensure known statistics are aggregated correctly', async () => {
        const points = [5, 2, 4, 7];
        expect(getAggregateValue('Average', points)).toEqual(4.5);
        expect(getAggregateValue('Maximum', points)).toEqual(7);
        expect(getAggregateValue('Minimum', points)).toEqual(2);
        expect(getAggregateValue('SampleCount', points)).toEqual(18);
        expect(getAggregateValue('Sum', points)).toEqual(18);
    });

    test('Unknown statistics return undefined value', async () => {
        const points = [5, 2, 4, 7];
        expect(getAggregateValue('NewStatistic', points)).toBeUndefined();
    });

    test('Ensure aggregates for timeslots and datapoints are correct', async () => {
        const datapoints: Datapoint[] = [
            {
                Timestamp: new Date(1627431973789),
                Average: 5,
                Unit: 'Seconds'
            },
            {
                Timestamp: new Date(1627431973789),
                Average: 12,
                Unit: 'Seconds'
            },
            {
                Timestamp: new Date(1627440553789),
                Average: 13,
                Unit: 'Seconds'
            },
            {
                Timestamp: new Date(1627440553789),
                Average: 13,
                Unit: 'Seconds'
            }
        ];
        const actual = await getAggregateValues(testSlots, datapoints, 'Average');
        expect(actual).toHaveLength(testSlots.length);
        expect(actual[0].value).toEqual(8.5);
        expect(actual[actual.length - 1].value).toEqual(13);
        actual.slice(1, -1).forEach((slot) => expect(slot.value).toEqual(0));
    });

    test('Ensure chart URL is correct', async () => {
        const chartUrl = await getChart(alarm.Trigger, 'us-east-1', alarm.StateChangeTime);
        expect(chartUrl).toEqual(
            'https://chart.googleapis.com/chart?cht=ls&chma=20,15,5,5|0,20&chxt=x,y&chxl=0:|05:52|08:12|10:32|12:52|15:12|17:32|19:52|22:12|00:32|02:52|05:12&chco=af9cf4,FF0000&chls=2|.5,5,5&chs=500x220&chxr=1,0,105,9&chg=20,10,1,5&chdl=HTTPCode_Target_2XX_Count%20(AVERAGE%2F300s)&chdlp=b&chd=e:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA,888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888'
        );
    });

    test('Ensure chart URL is undefined if there are no metrics', async () => {
        mockGetMetricStatistics = jest.fn(() => {
            return {
                promise: jest.fn(() => Promise.resolve({ Datapoints: [] }))
            };
        });
        await expect(getChart(alarm.Trigger, 'us-east-1', alarm.StateChangeTime)).rejects.toThrowError('Cloudwatch did not return any data points');
    });
});
