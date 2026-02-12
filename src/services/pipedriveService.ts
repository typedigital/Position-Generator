import type { ExtractedIssue } from "../utils/githubData.js";
import config from "../config/config.js";

const API_KEY = config.PIPEDRIVE_API_KEY;
const BASE_URL = "https://api.pipedrive.com/v1";

function getCleanRepoName(repoPath: string | undefined): string {
  if (!repoPath || repoPath === "N/A") return "General-Issues";
  return repoPath.split('/').pop() || repoPath;
}

async function getOrganizationByRepo(repoName: string): Promise<{ id: number; name: string }> {
  const cleanName = getCleanRepoName(repoName);
  const searchUrl = `${BASE_URL}/organizations/search?term=${encodeURIComponent(cleanName)}&fields=name&api_token=${API_KEY}`;
  
  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as any;

  if (searchData.success && searchData.data.items?.length > 0) {
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

export async function createPipedriveDeal(processedData: Partial<ExtractedIssue>) {
  try {
    const customerEmail = config.CUSTOMER_EMAIL;
    if (!customerEmail) throw new Error("CUSTOMER_EMAIL missing");

    const organization = await getOrganizationByRepo(processedData.repo || "N/A");

    const personSearch = await fetch(`${BASE_URL}/persons/search?term=${encodeURIComponent(customerEmail)}&fields=email&api_token=${API_KEY}`);
    const personData = (await personSearch.json()) as any;

    let personId: number;
    if (personData.data?.items?.length > 0) {
      personId = personData.data.items[0].item.id;
      await fetch(`${BASE_URL}/persons/${personId}?api_token=${API_KEY}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: organization.id }),
      });
    } else {
      const createPerson = await fetch(`${BASE_URL}/persons?api_token=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: processedData.author || "GitHub Reporter", 
          email: [customerEmail], 
          org_id: organization.id 
        }),
      });
      personId = ((await createPerson.json()) as any).data.id;
    }

    const managerRes = await fetch(`${BASE_URL}/users/find?term=${encodeURIComponent(config.EMAIL_USER || "")}&api_token=${API_KEY}`);
    const managerData = (await managerRes.json()) as any;
    const managerId = managerData.data?.[0]?.id || null;

    const dealTitle = `${processedData.title} | ${organization.name}`;
    const dealRes = await fetch(`${BASE_URL}/deals?api_token=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: dealTitle,
        person_id: personId,
        org_id: organization.id,
        user_id: managerId,
        visible_to: "3"
      }),
    });

    const result = (await dealRes.json()) as any;

    if (result.success && (processedData.fullDescription || processedData.comment)) {
      await fetch(`${BASE_URL}/notes?api_token=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: processedData.fullDescription || processedData.comment,
          deal_id: result.data.id
        }),
      });
    }

    console.log(`[PIPEDRIVE] Success: Deal created for ${organization.name}`);
    return result;
  } catch (error) {
    console.error("[PIPEDRIVE ERROR]", error);
    throw error;
  }
}