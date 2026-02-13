import type { ExtractedIssue } from "../utils/githubData.js";
import config from "../config/config.js";

const API_KEY = config.PIPEDRIVE_API_KEY;
const BASE_URL = "https://api.pipedrive.com/v1";

interface PipedriveDealResponse {
  success: boolean;
  data: {
    id: number;
    [key: string]: any;
  };
}

/**
 * Finds a custom field by name and ensures it is visible in the UI.
 */
async function getExistingFieldHash(fieldName: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/dealFields?api_token=${API_KEY}`);
    const json = (await res.json()) as any;
    const field = json.data?.find((f: any) => f.name === fieldName);

    if (field) {
      // Updates field to be "Important" and "Visible" in the detail view
      await fetch(`${BASE_URL}/dealFields/${field.id}?api_token=${API_KEY}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          important_flag: true,
          visible_in_detail_view: true,
        }),
      });
      return field.key;
    }
    return null;
  } catch (error) {
    console.error(`[PIPEDRIVE] Error finding field ${fieldName}:`, error);
    return null;
  }
}

/**
 * Finds or creates an organization based on the repository name.
 */
async function getOrganizationByRepo(repoName: string): Promise<{ id: number; name: string }> {
  const cleanName = repoName.split("/").pop() || repoName;
  const searchUrl = `${BASE_URL}/organizations/search?term=${encodeURIComponent(cleanName)}&fields=name&exact_match=true&api_token=${API_KEY}`;
  
  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as any;

  if (searchData.success && searchData.data?.items?.length > 0) {
    const org = searchData.data.items[0].item;
    return { id: org.id, name: org.name };
  }

  const createRes = await fetch(`${BASE_URL}/organizations?api_token=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: cleanName, visible_to: "3" }),
  });
  const newData = (await createRes.json()) as any;
  return { id: newData.data.id, name: newData.data.name };
}

export async function createPipedriveDeal(processedData: Partial<ExtractedIssue>): Promise<PipedriveDealResponse> {
  try {
    const customerEmail = config.CUSTOMER_EMAIL;

    // 1. Get Custom Field Hashes
    const detailsHash = await getExistingFieldHash("Details");
    const sourceHash = await getExistingFieldHash("Source channel ID");

    // 2. Get/Create Organization
    const organization = await getOrganizationByRepo(processedData.repo || "N/A");

    // 3. Get/Create Person
    const personSearchUrl = `${BASE_URL}/persons/search?term=${encodeURIComponent(customerEmail || "")}&fields=email&api_token=${API_KEY}`;
    const personSearchRes = await fetch(personSearchUrl);
    const personSearchData = (await personSearchRes.json()) as any;

    let personId = personSearchData.data?.items?.[0]?.item?.id;

    if (!personId) {
      const createPersonRes = await fetch(`${BASE_URL}/persons?api_token=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Vasian",
          email: [customerEmail],
          org_id: organization.id,
        }),
      });
      const newPersonData = (await createPersonRes.json()) as any;
      personId = newPersonData.data.id;
    }

    // 4. Construct Deal Payload
    const dealPayload: any = {
      title: `${processedData.title}`,
      person_id: personId,
      org_id: organization.id,
      visible_to: "3",
      status: "open",
    };

    // Mapping custom fields
    if (detailsHash) {
      dealPayload[detailsHash] = processedData.fullDescription || "No description provided.";
    }

    if (sourceHash) {
      // Since "Source channel ID" is a TEXT field, we send the string directly
      dealPayload[sourceHash] = "GitHub"; 
    }

    // 5. Create Deal
    const dealRes = await fetch(`${BASE_URL}/deals?api_token=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dealPayload),
    });

    const result = (await dealRes.json()) as PipedriveDealResponse;
    console.log(`[PIPEDRIVE] Deal created successfully with ID: ${result.data.id}`);

    return result;
  } catch (error) {
    console.error("[PIPEDRIVE ERROR]", error);
    throw error;
  }
}