import { TableClient, AzureSASCredential } from "https://cdn.jsdelivr.net/npm/@azure/data-tables@13.2.2/+esm";

const account = "boardflareaddins";
const sas = "sv=2019-02-02&si=Feedback-Write&sig=xm7SOJxiZBLTE%2FyosCoCOWjQQJEb%2FE67f5r3ICfMGRs%3D&tn=Feedback";
const tableName = "Feedback";

const feedbackTable = new TableClient(
    `https://${account}.table.core.windows.net/`,
    tableName,
    new AzureSASCredential(sas)
);

async function sendAdaptiveCard(appName, email, feedback) {
    const adapter = await navigator.gpu.requestAdapter();
    const supportsF16 = adapter?.features.has('shader-f16');
    const memory = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;
    const downlink = navigator.connection.downlink;

    const webhookUrl = "https://prod-00.canadacentral.logic.azure.com:443/workflows/31946a2362a34335a4d819fb4c56d813/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=39pgOmdRbYMHZ_n57Bl7DfCRm2UJ7GtVMe2f3ZPQA2Y";
    const webhookBody = {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                contentUrl: null,
                content: {
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    type: "AdaptiveCard",
                    version: "1.2",
                    body: [
                        {
                            type: "RichTextBlock",
                            inlines: [
                                {
                                    type: "TextRun",
                                    text: email,
                                    color: "accent",
                                    selectAction: {
                                        type: "Action.OpenUrl",
                                        url: `mailto:${email}`
                                    }
                                }
                            ]
                        },
                        {
                            type: "TextBlock",
                            text: `Feedback: ${feedback}`
                        },
                        {
                            type: "FactSet",
                            facts: [
                                {
                                    title: "Adapter",
                                    value: adapter ? adapter.name : "Not available"
                                },
                                {
                                    title: "Supports F16",
                                    value: supportsF16 ? "Yes" : "No"
                                },
                                {
                                    title: "Memory (GB)",
                                    value: memory ? memory.toString() : "Not available"
                                },
                                {
                                    title: "CPU Cores",
                                    value: cores ? cores.toString() : "Not available"
                                },
                                {
                                    title: "Downlink (Mbps)",
                                    value: downlink ? downlink.toString() : "Not available"
                                }
                            ]
                        }
                    ]
                }
            }
        ]
    };

    const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(webhookBody)
    });

    if (!response.ok) {
        throw new Error(`Failed to send adaptive card: ${response.statusText}`);
    }
}

export async function sendFeedback(appName, email, feedback) {
    const entity = {
        partitionKey: appName,
        rowKey: new Date().toISOString(),
        feedback,
        email
    };
    await feedbackTable.createEntity(entity);
    await sendAdaptiveCard(appName, email, feedback);
}