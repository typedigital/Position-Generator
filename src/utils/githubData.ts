
interface GitHubPayload {
  issue?: {
    title: string;
    number: number;
    body: string;
    state: string;
    user: { login: string };
    html_url: string;
    created_at: string;
    labels?: Array<{ name: string }>;
    assignees?: Array<{ login: string }>;
  };
  repository?: {
    full_name: string;
  };
  comment?: {
    body: string;
  };
}

export interface ExtractedIssue {
  title: string;
  number: number | string;
  fullDescription: string;
  status: string;
  author: string;
  repo: string;
  url: string;
  created: string;
  labels: string;
  assignees: string;
  comment: string;
  parsedEntries?: Array<{ dept: string | null; num: string; comment: string }>;
}


export function extractIssueData(rawData: any): ExtractedIssue {
  // GitHub payloads can sometimes arrive as an array in certain event types
  const data: GitHubPayload = Array.isArray(rawData) && rawData[0]?.body 
    ? rawData[0].body 
    : rawData;

  const issue = data.issue || ({} as any);

  return {
    title: issue.title,
    number: issue.number,
    fullDescription: issue.body || "",
    status: issue.state,
    author: issue.user?.login,
    repo: data.repository?.full_name || "N/A",
    url: issue.html_url,
    created: issue.created_at,
    labels: issue.labels?.map((l: any) => l.name).join(", ") || "none",
    assignees: issue.assignees?.map((a: any) => a.login).join(", ") || "none",
    comment: data.comment?.body || "",
  };
}


interface ParseResult {
  foundEntries: Array<{ dept: string | null; num: string; comment: string }>;
  message: string;
  status: boolean;
}


export function parseCommentReferences(items: any[]): ParseResult {
  for (const item of items) {
    const commentBody: string = 
      item.json?.body?.comment?.body || 
      item.json?.body || 
      "";

    if (!commentBody || !commentBody.toLowerCase().includes("pt")) {
      continue; // Move to next item instead of early return if multiple items exist
    }

    const foundEntries: Array<{ dept: string | null; num: string; comment: string }> = [];
    const regex = /(?:([A-Za-z0-9&\s]+?)?\s*)?(?:pt[:\-]?\s*(\d+)|(\d+)\s*pt)(?!\w)/gi;

    let m: RegExpExecArray | null;
    while ((m = regex.exec(commentBody)) !== null) {
      const rawDept = m[1] ? m[1].trim() : null;
      const num = m[2] || m[3];
      const noise = ["and", "for", "also"];
      const dept = rawDept && !noise.includes(rawDept.toLowerCase()) ? rawDept : null;
      
      if (num) {
        foundEntries.push({ dept, num, comment: commentBody });
      }
    }

    if (foundEntries.length > 0) {
      return { foundEntries, message: "Entries successfully parsed", status: true };
    }
  }

  return { foundEntries: [], message: "No valid entries found", status: false };
}