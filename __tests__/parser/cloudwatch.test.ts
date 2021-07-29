import { match, parse } from '../../src/parser/cloudwatch';
import { default as cloudwatchAlarmEvent } from '../resources/cloudwatch-alarm-event.json';
import { default as slackMessageWithoutChart } from '../resources/cloudwatch-slack-without-chart.json';
import { default as slackMessageWithChart } from '../resources/cloudwatch-slack-with-chart.json';
import { getChart } from '../../src/parser/chart';

jest.mock('../../src/parser/chart');

describe('Ensure cloudwatch alarm events can be processed', () => {
    beforeEach(() => {
        cloudwatchAlarmEvent.NewStateValue = 'ALARM';
    });

    test('Cloudwatch alarm message matches', async () => {
        const actual = await match(JSON.stringify(cloudwatchAlarmEvent));
        expect(actual).toEqual(cloudwatchAlarmEvent);
    });

    test('Not a cloudwatch alarm', async () => {
        await expect(match('{}')).rejects.toThrowError('Not a cloudwatch alarm');
    });

    test('Parse alarm without chart', async () => {
        const mockGetChart = getChart as jest.MockedFunction<typeof getChart>;
        mockGetChart.mockRejectedValue(new Error('Could not get metrics'));
        cloudwatchAlarmEvent.NewStateValue = 'OK';
        const actual = await parse(cloudwatchAlarmEvent, 'Jest Test');
        expect(actual).toEqual(slackMessageWithoutChart);
    });

    test('Parse alarm with chart', async () => {
        const mockGetChart = getChart as jest.MockedFunction<typeof getChart>;
        mockGetChart.mockReturnValue(Promise.resolve('https://test.com/chart'));
        const actual = await parse(cloudwatchAlarmEvent, 'Jest Test');
        expect(actual).toEqual(slackMessageWithChart);
    });
});
