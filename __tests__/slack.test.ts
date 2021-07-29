import axios from 'axios';
import { buildFieldSection, buildHeader, buildImageBlock, buildTextBlock, buildTextSection, postMessage } from '../src/slack';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Ensure calls to slack are handled correctly', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        process.env = { ...OLD_ENV };
        process.env.SLACK_WEBHOOK = 'https://hooks.slack.com/services/testwebhook';
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    test('No slack webhook setup', async () => {
        delete process.env.SLACK_WEBHOOK;
        await expect(postMessage({ text: 'Hello world' })).rejects.toThrowError('Slack webhook endpoint not defined');
        expect(mockedAxios.post).not.toBeCalled();
    });

    test('Calls slack successfully', async () => {
        const response = { status: 200 };
        mockedAxios.post.mockResolvedValue(response);

        const message = { text: 'Hello world' };
        const actual = await postMessage(message);

        expect(actual).toEqual(response.status);
        expect(mockedAxios.post).toHaveBeenCalledWith(process.env.SLACK_WEBHOOK, JSON.stringify(message), expect.any(Object));
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    test('Slack API error', async () => {
        const response = { status: 500, data: 'Internal Server Error' };
        mockedAxios.post.mockResolvedValue(response);
        await expect(
            postMessage({
                text: 'Hello world',
                blocks: []
            })
        ).rejects.toThrowError('Slack API error [HTTP:500]: Internal Server Error');
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    test('Client side error from Slack API', async () => {
        const response = { status: 400, statusText: 'Bad Request', data: 'Field not allowed' };
        mockedAxios.post.mockResolvedValue(response);
        await expect(postMessage({ text: 'Hello world' })).rejects.toThrowError(
            'Slack API reports bad request [HTTP:400] Bad Request: Field not allowed'
        );
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    test('Can build text block in markdown', () => {
        const actual = buildTextBlock('mrkdwn', '#Title some text', true);
        expect(actual).toEqual({
            type: 'mrkdwn',
            text: '#Title some text'
        });
    });

    test('Can build text block in plain text without emojis', () => {
        const actual = buildTextBlock('plain_text', 'Title some text :thumbsup:', false);
        expect(actual).toEqual({
            type: 'plain_text',
            text: 'Title some text :thumbsup:',
            emoji: false
        });
    });

    test('Can build text block in plain text with emojis', () => {
        const actual = buildTextBlock('plain_text', 'Title some text :thumbsup:');
        expect(actual).toEqual({
            type: 'plain_text',
            text: 'Title some text :thumbsup:',
            emoji: true
        });
    });

    test('Build text block throws error when incorrect type provided', () => {
        expect(() => buildTextBlock('random_type', 'Title some text :thumbsup:', false)).toThrowError('Unknown text type');
    });

    test('Can build image block', () => {
        const actual = buildImageBlock('https://test.com/chart', 'some alt text');
        expect(actual).toEqual({
            type: 'image',
            image_url: 'https://test.com/chart',
            alt_text: 'some alt text'
        });
    });

    test('Can build fields block', () => {
        const oneField = ['1'];
        const tenFields = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        const actualOneField = buildFieldSection('plain_text', oneField);
        const actualTenFields = buildFieldSection('plain_text', tenFields);

        expect(actualOneField.type).toEqual('section');
        expect(actualOneField.fields).toHaveLength(1);
        expect(actualTenFields.type).toEqual('section');
        expect(actualTenFields.fields).toHaveLength(10);
    });

    test('Field blocks are limited to 10 fields', () => {
        const fields = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
        expect(() => buildFieldSection('plain_text', fields)).toThrowError('Maximum number of fields is 10');
    });

    test('Can build text section', () => {
        const actual = buildTextSection('mrkdwn', '#Jest testing text');
        expect(actual).toEqual({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '#Jest testing text'
            }
        });
    });

    test('Can build header section', () => {
        const actual = buildHeader('#This is a header');
        expect(actual).toEqual({
            type: 'header',
            text: {
                type: 'plain_text',
                text: '#This is a header',
                emoji: true
            }
        });
    });
});
