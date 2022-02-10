import { default as codedeployEvent } from '../resources/codedeploy-event.json';
import { default as codedeploySlack } from '../resources/codedeploy-slack.json';
import { match } from '../../src/parser/matcher';
import { parse } from '../../src/parser/codedeploy';

describe('Ensure Codedeploy events can be processed', () => {
    test('Codedeploy alarm message matches', async () => {
        const actual = await match(JSON.stringify(codedeployEvent));
        expect(actual).toEqual(codedeployEvent);
    });

    test('Not a Codedeploy event', async () => {
        await expect(match('{}')).rejects.toThrowError('Unable to process event as it is not recognised');
    });

    test('Parse event, should match codedeploySlack format', async () => {
        const actual = await parse(codedeployEvent, 'CREATED: AWS CodeDeploy d-CLYPG9180 in ap-south-1 to MyApp-sample-app');
        expect(actual).toEqual(codedeploySlack);
    });
});
