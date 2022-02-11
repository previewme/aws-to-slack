import axios from 'axios';

export interface SlackMessage {
    text?: string;
    blocks?: Array<Block>;
    attachments?: [
        {
            color: string;
            blocks: Array<Block>;
        }
    ];
}

interface Block {
    type: string;
    text?: TextBlock;
    elements?: Array<TextBlock | ImageBlock>;
    fields?: Array<TextBlock>;
}

interface TextBlock {
    type: string;
    text: string;
    emoji?: boolean;
}

interface ImageBlock {
    type: string;
    image_url: string;
    alt_text: string;
}

export const COLOURS = {
    critical: '#FF324D',
    warning: '#FFD602',
    ok: '#8CC800',
    neutral: '#A8A8A8'
};

export async function postMessage(message: SlackMessage, alternativeSlackWebhookUrl?: string): Promise<number> {
    const slackWebhookUrl = alternativeSlackWebhookUrl || process.env.SLACK_WEBHOOK_INCIDENTS;
    if (slackWebhookUrl === undefined) {
        throw new Error('Slack webhook endpoint not defined');
    }
    const response = await axios.post(slackWebhookUrl, JSON.stringify(message), { headers: { 'Content-Type': 'application/json' } });
    const status = response.status;
    if (200 <= status && status < 300) {
        console.info('Message posted successfully.');
        return response.status;
    }
    if (400 <= status && status < 500) {
        throw new Error(`Slack API reports bad request [HTTP:${response.status}] ${response.statusText}: ${response.data}`);
    }
    throw new Error(`Slack API error [HTTP:${response.status}]: ${response.data}`);
}

export function buildHeader(text: string, emoji = true): Block {
    return {
        type: 'header',
        text: buildTextBlock('plain_text', text, emoji)
    };
}

export function buildTextSection(type: string, text: string, emoji = true): Block {
    return {
        type: 'section',
        text: buildTextBlock(type, text, emoji)
    };
}

export function buildFieldSection(type: string, text: string[], emoji = true): Block {
    if (text.length > 10) {
        throw new Error('Maximum number of fields is 10');
    }

    const section: Block = {
        type: 'section',
        fields: []
    };
    text.forEach((text) => {
        section.fields?.push(buildTextBlock(type, text, emoji));
    });
    return section;
}

export function buildImageBlock(imageUrl: string, altText: string): ImageBlock {
    return {
        type: 'image',
        image_url: imageUrl,
        alt_text: altText
    };
}

export function buildTextBlock(type: string, text: string, emoji = true): TextBlock {
    if (type !== 'plain_text' && type !== 'mrkdwn') {
        throw new Error('Unknown text type');
    }

    const block: TextBlock = {
        type: type,
        text: text
    };
    if (type === 'plain_text') {
        block.emoji = emoji;
    }
    return block;
}
