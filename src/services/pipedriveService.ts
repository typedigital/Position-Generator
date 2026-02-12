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

async function getCustomerLabelId(): Promise<number | null> {
  try {
    const res = await fetch(`${BASE_URL}/personFields?api_token=${API_KEY}`);
    const json = (await res.json()) as any;
    if (!json.success) return null;

    const labelField = json.data.find((f: any) => f.key === "label");
    const customerOption = labelField?.options?.find(
      (opt: any) => opt.label === "Customer",
    );
    return customerOption ? Number(customerOption.id) : null;
  } catch {
    return null;
  }
}

function getCleanRepoName(repoPath: string | undefined): string {
  if (!repoPath || repoPath === "N/A") return "General-Issues";
  return repoPath.split("/").pop() || repoPath;
}

async function getOrganizationByRepo(
  repoName: string,
): Promise<{ id: number; name: string }> {
  const cleanName = getCleanRepoName(repoName);
  const searchUrl = `${BASE_URL}/organizations/search?term=${encodeURIComponent(cleanName)}&fields=name&exact_match=true&api_token=${API_KEY}`;

  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as any;

  if (searchData.success && searchData.data.items?.length > 0) {
    const org = searchData.data.items[0].item;
    return { id: org.id, name: org.name };
  }

  const createRes = await fetch(
    `${BASE_URL}/organizations?api_token=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanName, visible_to: "3" }),
    },
  );
  const newData = (await createRes.json()) as any;
  return { id: newData.data.id, name: newData.data.name };
}

export async function createPipedriveDeal(
  processedData: Partial<ExtractedIssue>,
): Promise<PipedriveDealResponse> {
  try {
    const customerEmail = config.CUSTOMER_EMAIL;
    if (!customerEmail) throw new Error("CUSTOMER_EMAIL missing in config");

    //  Get the Label ID for "Customer"
    const labelId = await getCustomerLabelId();

    const personSearchUrl = `${BASE_URL}/persons/search?term=${encodeURIComponent(customerEmail)}&fields=email&api_token=${API_KEY}`;
    const personSearchRes = await fetch(personSearchUrl);
    const personSearchData = (await personSearchRes.json()) as any;

    let personId: number | null = null;
    let organizationId: number | null = null;

    let resolvedPersonName: string = "Valued Customer";

    if (personSearchData.data?.items?.length > 0) {
      const personItem = personSearchData.data.items[0].item;
      personId = personItem.id;
      organizationId = personItem.organization?.id || null;
      resolvedPersonName = personItem.name || resolvedPersonName;
    }

    if (!organizationId) {
      const organization = await getOrganizationByRepo(
        processedData.repo || "N/A",
      );
      organizationId = organization.id;
    }

    // Create or Update Person (Adding the Label)
    const personPayload = {
      name: resolvedPersonName,
      email: [customerEmail],
      org_id: organizationId,
      label: labelId,
    };

    if (!personId) {
      const createPersonRes = await fetch(
        `${BASE_URL}/persons?api_token=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(personPayload),
        },
      );
      const newPersonData = (await createPersonRes.json()) as any;
      personId = newPersonData.data.id;
    } else {
      await fetch(`${BASE_URL}/persons/${personId}?api_token=${API_KEY}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: organizationId,
          label: labelId,
        }),
      });
    }

    // Create the Deal
    const dealRes = await fetch(`${BASE_URL}/deals?api_token=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${processedData.title}`,
        person_id: personId,
        org_id: organizationId,
        visible_to: "3",
      }),
    });

    const result = (await dealRes.json()) as PipedriveDealResponse;

    // Add Note
    if (
      result.success &&
      (processedData.fullDescription || processedData.comment)
    ) {
      await fetch(`${BASE_URL}/notes?api_token=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: processedData.fullDescription || processedData.comment,
          deal_id: result.data.id,
        }),
      });
    }

    console.log(`[PIPEDRIVE] Deal successfully created: ID ${result.data?.id}`);
    return result;
  } catch (error) {
    console.error("[PIPEDRIVE ERROR]", error);
    throw error;
  }
}
