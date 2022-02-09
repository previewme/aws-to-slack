export interface CodedeployEvent {
    region: string;
    accountId: string;
    eventTriggerName: string;
    applicationName: string;
    deploymentId: string;
    deploymentGroupName: string;
    createTime: string;
    completeTime: string;
    status: string;
}