import config from '../config/config.js';

async function getUserIdByEmail(apiToken: string, baseUrl: string): Promise<{ id: number; name: string } | null> {
    const email = config.EMAIL_USER;
    if (!email) return null;

    const response = await fetch(`${baseUrl}/users/find?term=${encodeURIComponent(email)}&api_token=${apiToken}`);
    const data = await response.json() as any;

    if (data.success && data.data && data.data.length > 0) {
        return {
            id: data.data[0].id,
            name: data.data[0].name 
        };
    }
    return null;
}


async function getOrCreatePerson(apiToken: string, baseUrl: string, managerName: string): Promise<number> {
    const email = config.CUSTOMER_EMAIL;
    if (!email) throw new Error("CUSTOMER_EMAIL is missing in config");

    const searchRes = await fetch(`${baseUrl}/persons/search?term=${encodeURIComponent(email)}&fields=email&api_token=${apiToken}`);
    const searchData = await searchRes.json() as any;

 
    if (searchData.data?.items?.length > 0) {
        return searchData.data.items[0].item.id;
    }

    
    const createRes = await fetch(`${baseUrl}/persons?api_token=${apiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name: managerName,
            email: [email], 
            visible_to: "3" 
        })
    });

    const newPerson = await createRes.json() as any;
    return newPerson.data.id;
}


export async function createPipedriveDeal(processedData: any) {
    const apiToken = config.PIPEDRIVE_API_KEY;
    const baseUrl = 'https://api.pipedrive.com/v1';

    try {
        
        const manager = await getUserIdByEmail(apiToken, baseUrl);
        const managerName = manager?.name || "GitHub Reporter";

       
        const personId = await getOrCreatePerson(apiToken, baseUrl, managerName);

     
        const dealResponse = await fetch(`${baseUrl}/deals?api_token=${apiToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: processedData.title || 'New GitHub Issue',
                person_id: personId, 
                user_id: manager?.id || null, 
                visible_to: "3" 
            })
        });

        const dealData = await dealResponse.json() as any;
        const dealId = dealData.data?.id;
        
        
        if (processedData.fullDescription && dealId) {
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