import { default as codedeployEvent } from '../resources/codedeploy-event.json';
import { match } from '../../src/parser/matcher';

describe('Ensure Codedeploy events can be processed', () => {
    test('Codedeploy alarm message matches', async () => {
        const actual = await match(JSON.stringify(codedeployEvent));
        expect(actual).toEqual(codedeployEvent);
    });

    test('Not a Codedeploy event', async () => {
        await expect(match('{}')).rejects.toThrowError('Not a codedeploy event');
    });
});
