import config from '../config/config.js';

async function getOrCreatePerson(apiToken: string, baseUrl: string): Promise<number> {
    const email = config.CUSTOMER_EMAIL;

   
    const searchResponse = await fetch(`${baseUrl}/persons/search?term=${encodeURIComponent(email)}&fields=email&api_token=${apiToken}`);
    const searchData = await searchResponse.json() as any;

    if (searchData.data && searchData.data.items && searchData.data.items.length > 0) {
        return searchData.data.items[0].item.id;
    }

    const createResponse = await fetch(`${baseUrl}/persons?api_token=${apiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: "Offer", 
            email: [email],
            visible_to: "3"
        })
    });

    if (!createResponse.ok) {
        const err = await createResponse.json();
        throw new Error(`Pipedrive Create Person Error: ${JSON.stringify(err)}`);
    }

    const newPerson = await createResponse.json() as any;
    return newPerson.data.id;
}

export async function createPipedriveDeal(processedData: any) {
    const apiToken = config.PIPEDRIVE_API_KEY;
    const baseUrl = 'https://api.pipedrive.com/v1';

    try {
    
        const personId = await getOrCreatePerson(apiToken, baseUrl);

        
        const dealResponse = await fetch(`${baseUrl}/deals?api_token=${apiToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: processedData.title || 'New GitHub Issue',
                person_id: personId,
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
            await fetch(`${baseUrl}/notes?api_token=${apiToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: processedData.fullDescription,
                    deal_id: dealId
                })
            });
        }

        return dealData;
    } catch (error) {
        console.error(`[PIPEDRIVE ERROR] ${error}`);
        throw error;
    }
}