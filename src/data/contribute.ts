export const contributeHubPath = "/contribute/";
export const contributeFormUrl = "https://tally.so/r/QKByPk";
export const contributeEmailAddress = "sortpapers@gmail.com";
export const contributeRepoUrl = "https://github.com/papersorted/papersorted.github.io";

export const contributeIssueUrl =
  `${contributeRepoUrl}/issues/new`;

export interface ContributionChecklistItem {
  title: string;
  description: string;
}

export interface ContributionExample {
  label: string;
  value: string;
}

export const contributionChecklist: ContributionChecklistItem[] = [
  {
    title: "The file itself",
    description: "PDF, JPEG, PNG, or a clear multi-page scan. Semester and internal papers are both welcome.",
  },
  {
    title: "Subject code",
    description: "The exact course code, such as COMP231 or MATH104, so the paper lands in the right archive page.",
  },
  {
    title: "Exam round and date if known",
    description: "Month and year can be left blank if you do not know it yet. For internals, include the round and any date details you know.",
  },
  {
    title: "Teacher name for internals",
    description: "Include the teacher name when it is visible or already known. That helps students understand paper origin.",
  },
  {
    title: "Credit name if you want it",
    description: "A real name, alias, or nothing at all. Public credit is optional.",
  },
];

export const contributionExamples: ContributionExample[] = [
  {
    label: "Semester paper",
    value: "COMP116_Jan_2025.pdf",
  },
  {
    label: "Internal paper",
    value: "COMP231_First_Internal_Dec_2025.jpeg",
  },
  {
    label: "Multi-page internal set",
    value: "ENGG112_Third_Internal_Mar_2025_Page_1.jpeg",
  },
];

function cleanSubjectCode(subjectCode?: string | null) {
  if (typeof subjectCode !== "string") return undefined;
  const cleaned = subjectCode.trim().toUpperCase();
  if (!cleaned) return undefined;
  if (!/^[A-Z0-9]+$/.test(cleaned)) return undefined;
  return cleaned;
}

function buildContributionBodyLines(subjectCode?: string) {
  return subjectCode
    ? [
        `Subject code: ${subjectCode}`,
        "Exam type: ",
        "Month and year (optional): ",
        "Teacher name (if internal): ",
        "Credit name or alias (optional): ",
        "",
        "Attach the paper file and include any notes that help place it correctly.",
      ]
    : [
        "Subject code: ",
        "Exam type: ",
        "Month and year (optional): ",
        "Teacher name (if internal): ",
        "Credit name or alias (optional): ",
        "",
        "Attach the paper file and include any notes that help place it correctly.",
      ];
}

export function buildContributeFormUrl(subjectCode?: string | null) {
  const cleaned = cleanSubjectCode(subjectCode);
  const url = new URL(contributeFormUrl);
  if (cleaned) {
    url.searchParams.set("subject", cleaned);
  }
  return url.toString();
}

export function buildContributeHref(subjectCode?: string | null) {
  const cleaned = cleanSubjectCode(subjectCode);
  if (!cleaned) return contributeHubPath;
  return `${contributeHubPath}?subject=${encodeURIComponent(cleaned)}`;
}

export function buildContributeEmailUrl(subjectCode?: string | null) {
  const cleaned = cleanSubjectCode(subjectCode);
  const subject = cleaned
    ? `Paper submission: ${cleaned}`
    : "Paper submission";
  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", buildContributionBodyLines(cleaned).join("\n"));
  return `mailto:${contributeEmailAddress}?${params.toString()}`;
}

export function buildContributeIssueUrl(subjectCode?: string | null) {
  const cleaned = cleanSubjectCode(subjectCode);
  const title = cleaned ? `[New Paper] ${cleaned}` : "[New Paper]";
  return `${contributeIssueUrl}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(buildContributionBodyLines(cleaned).join("\n"))}`;
}
