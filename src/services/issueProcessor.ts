import { parseCommentReferences } from "../utils/githubData.js";
import { generateClientDescription } from "./aiService.js";
import {
  generateEmailHtml,
  sendEmail,
  type EmailData,
} from "./emailService.js";

interface ProcessedIssue extends EmailData {
  comment?: string;
  clientDescription?: string;
  emailHtml?: string;
  skipped?: boolean;
}

export async function processIssue(
  issueData: ProcessedIssue,
): Promise<ProcessedIssue> {
  issueData.parsedEntries = issueData.parsedEntries || [];
  issueData.clientDescription = issueData.clientDescription || "";
  issueData.emailHtml = "";

  let shouldRewrite = false;
  const isComment = !!issueData.comment;

  if (isComment) {
    const parseResult = parseCommentReferences([
      { json: { body: issueData.comment! } },
    ]);

    if (parseResult.status) {
      shouldRewrite = true;
      issueData.parsedEntries = parseResult.foundEntries;
    } else {
      issueData.clientDescription =
        issueData.clientDescription || "No issue description was provided.";
      return { ...issueData, skipped: true };
    }
  } else {
    shouldRewrite = true;
  }

  if (shouldRewrite) {
    // AI Summarization
    const cleanText = await generateClientDescription(
      issueData.fullDescription,
    );
    issueData.clientDescription = cleanText;

    // Update fullDescription based on AI result
    issueData.fullDescription =
      cleanText === "No issue description was provided."
        ? "No description provided."
        : cleanText;

    if (
      issueData.fullDescription &&
      issueData.fullDescription !== "No description provided."
    ) {
      issueData.emailHtml = generateEmailHtml(issueData);

      await sendEmail(issueData.emailHtml, issueData.number, issueData.repo);
    }
  }

  return issueData;
}
