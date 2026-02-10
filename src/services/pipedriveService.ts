import config from '../config/config.js';

export async function createPipedriveDeal(processedData: any) {
    const apiToken = config.PIPEDRIVE_API_KEY;
    const baseUrl = 'https://api.pipedrive.com/v1';


    const dealResponse = await fetch(`${baseUrl}/deals?api_token=${apiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: processedData.title || 'New GitHub Issue', 
            visible_to: "3" 
        })
    });

    if (!dealResponse.ok) {
        const err = await dealResponse.json();
        throw new Error(`Pipedrive Deal Error: ${JSON.stringify(err)}`);
    }

    const dealData = await dealResponse.json() as any;
    const dealId = dealData.data.id;

    if (processedData.fullDescription) {
        const noteResponse = await fetch(`${baseUrl}/notes?api_token=${apiToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: processedData.fullDescription,
                deal_id: dealId
            })
        });

        if (!noteResponse.ok) {
            console.warn(`⚠️ Error adding note to Pipedrive deal ${dealId}: ${noteResponse.statusText}`);
        } 
    }

    return dealData;
}