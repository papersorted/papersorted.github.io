import { contributeIssueUrl } from "./contribute.ts";
import internalPapersRaw from "./internalPapers.json";

export interface ContributorRecord {
  id: string;
  name: string;
  note?: string;
  contributions: number;
  subjects?: string[];
}

interface RawInternalContributionRecord {
  subjectCode?: string | null;
  contributor?: string | null;
}

export const contributorCreditNote =
  "Use your name, an alias, or nothing at all.";

function cleanContributorName(value: string | null | undefined) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function createContributorId(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "contributor";
}

const internalContributionRecords = Array.isArray(internalPapersRaw)
  ? (internalPapersRaw as RawInternalContributionRecord[])
  : [];

const contributorRollup = new Map<
  string,
  {
    contributions: number;
    subjects: Set<string>;
  }
>();

for (const record of internalContributionRecords) {
  const contributor = cleanContributorName(record.contributor);
  if (!contributor) continue;

  const subjectCode =
    typeof record.subjectCode === "string" ? record.subjectCode.trim() : "";
  const aggregate = contributorRollup.get(contributor) || {
    contributions: 0,
    subjects: new Set<string>(),
  };

  aggregate.contributions += 1;
  if (subjectCode) aggregate.subjects.add(subjectCode);
  contributorRollup.set(contributor, aggregate);
}

export const contributors: ContributorRecord[] = Array.from(
  contributorRollup.entries(),
  ([name, aggregate]) => ({
    id: createContributorId(name),
    name,
    contributions: aggregate.contributions,
    subjects: Array.from(aggregate.subjects).sort(),
  })
);

export function sortContributors(list: ContributorRecord[] = contributors) {
  return [...list].sort(
    (a, b) => b.contributions - a.contributions || a.name.localeCompare(b.name)
  );
}

export function formatContributionCount(count: number) {
  return `${count} contribution${count === 1 ? "" : "s"}`;
}
