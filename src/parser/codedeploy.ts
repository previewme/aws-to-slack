import { buildFieldSection, buildHeader, buildTextSection, COLOURS, SlackMessage } from '../slack';

export interface CodedeployEvent {
    region: string;
    accountId: string;
    eventTriggerName: string;
    applicationName: string;
    deploymentId: string;
    deploymentGroupName: string;
    createTime: string;
    completeTime: string;
    deploymentOverview: DeploymentOverview;
    status: string;
}

interface DeploymentOverview {
    Failed: string;
    InProgress: string;
    Pending: string;
    Skipped: string;
    Succeeded: string;
}

export async function codedeployParse(event: CodedeployEvent, subject: string): Promise<SlackMessage> {
    return buildSlackMessage(event, subject);
}

function buildSlackMessage(event: CodedeployEvent, subject: string): SlackMessage {
    const { Failed, InProgress, Pending, Skipped, Succeeded } = event.deploymentOverview;
    return {
        blocks: [buildHeader(subject), buildTextSection('mrkdwn', `<!channel>`)],
        attachments: [
            {
                color: getMessageColour(event.status),
                blocks: [
                    buildFieldSection('mrkdwn', [`*Region*\n${event.region}`, `*Account Id*\n${event.accountId}`]),
                    buildFieldSection('mrkdwn', [`*Event Trigger Name*\n${event.eventTriggerName}`, `*Application Name*\n${event.applicationName}`]),
                    buildFieldSection('mrkdwn', [`*Deployment Id*\n${event.deploymentId}`, `*Deployment Group Name*\n${event.deploymentGroupName}`]),
                    buildFieldSection('mrkdwn', [`*Create Time*\n${event.createTime}`, `*Complete Time*\n${event.completeTime}`]),
                    buildTextSection(
                        'mrkdwn',
                        `*Deployment Overview*\nFailed: ${Failed}, InProgress: ${InProgress}, Pending: ${Pending}, Skipped: ${Skipped}, Succeeded: ${Succeeded}`
                    ),
                    buildTextSection('mrkdwn', `*Status*\n${event.status}`)
                ]
            }
        ]
    };
}

function getMessageColour(status: string): string {
    if (status === 'Failed') {
        return COLOURS.critical;
    } else if (status === 'Succeeded') {
        return COLOURS.ok;
    } else {
        return COLOURS.neutral;
    }
}
