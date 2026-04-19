import manifest from "./manifest.json";
import internalPapersRaw from "./internalPapers.json";

export const INTERNAL_EXAM_LABELS = {
  "first-internal": "First Internal",
  "second-internal": "Second Internal",
  "third-internal": "Third Internal",
} as const;

export type InternalExamKind = keyof typeof INTERNAL_EXAM_LABELS;
export type AssetType = "pdf" | "image";

interface ManifestPaperRecord {
  date: string;
  file: string;
}

interface RawInternalPaperRecord {
  subjectCode: string;
  exam: InternalExamKind;
  year: number;
  file: string;
  teacher?: string | null;
  label?: string | null;
}

export interface SemesterContentEntry {
  kind: "semester";
  code: string;
  file: string;
  title: string;
  dateLabel: string;
  year: number;
  assetType: "pdf";
  storageDir: "papers";
}

export interface InternalContentEntry {
  kind: "internal";
  code: string;
  file: string;
  title: string;
  dateLabel: string;
  year: number;
  exam: InternalExamKind;
  teacher?: string;
  assetType: AssetType;
  storageDir: "internal-papers";
}

export type ContentEntry = SemesterContentEntry | InternalContentEntry;

const manifestRecords = manifest as Record<string, ManifestPaperRecord[]>;
const internalRecords = Array.isArray(internalPapersRaw)
  ? (internalPapersRaw as RawInternalPaperRecord[])
  : [];

const monthOrder: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
  March: 3,
};

function parseYear(value: string) {
  const match = value.match(/(\d{4})/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function parseMonthIndex(value: string) {
  const match = value.match(/([A-Za-z]+)/);
  if (!match) return 0;
  return monthOrder[match[1]] || 0;
}

function cleanTeacherName(value: string | null | undefined) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function getFileExtension(value: string) {
  const match = value.toLowerCase().match(/\.[^.]+$/);
  return match ? match[0] : "";
}

function getInternalAssetType(file: string): AssetType {
  return getFileExtension(file) === ".pdf" ? "pdf" : "image";
}

function getInternalLabel(record: RawInternalPaperRecord) {
  const explicitLabel = typeof record.label === "string" ? record.label.trim() : "";
  if (explicitLabel) return explicitLabel;
  const baseLabel = INTERNAL_EXAM_LABELS[record.exam] || "Internal";
  return record.year ? `${baseLabel} ${record.year}` : baseLabel;
}

function sortSemesterEntries(entries: SemesterContentEntry[]) {
  return [...entries].sort((a, b) => {
    const yearDelta = b.year - a.year;
    if (yearDelta !== 0) return yearDelta;
    return parseMonthIndex(a.dateLabel) - parseMonthIndex(b.dateLabel);
  });
}

function getInternalSortRank(exam: InternalExamKind) {
  if (exam === "first-internal") return 1;
  if (exam === "second-internal") return 2;
  return 3;
}

function sortInternalEntries(entries: InternalContentEntry[]) {
  return [...entries].sort((a, b) => {
    const yearDelta = b.year - a.year;
    if (yearDelta !== 0) return yearDelta;
    return getInternalSortRank(a.exam) - getInternalSortRank(b.exam);
  });
}

const semesterEntriesBySubject = new Map<string, SemesterContentEntry[]>();
for (const [code, papers] of Object.entries(manifestRecords)) {
  const entries = papers.map((paper) => ({
    kind: "semester" as const,
    code,
    file: paper.file,
    title: paper.date,
    dateLabel: paper.date,
    year: parseYear(paper.date),
    assetType: "pdf" as const,
    storageDir: "papers" as const,
  }));
  semesterEntriesBySubject.set(code, sortSemesterEntries(entries));
}

const internalEntriesBySubject = new Map<string, InternalContentEntry[]>();
for (const record of internalRecords) {
  const code = typeof record.subjectCode === "string" ? record.subjectCode.trim() : "";
  if (!code) continue;

  const exam = record.exam;
  if (!(exam in INTERNAL_EXAM_LABELS)) continue;

  const entry: InternalContentEntry = {
    kind: "internal",
    code,
    file: record.file,
    title: getInternalLabel(record),
    dateLabel: getInternalLabel(record),
    year: Number.isInteger(record.year) ? record.year : 0,
    exam,
    teacher: cleanTeacherName(record.teacher),
    assetType: getInternalAssetType(record.file),
    storageDir: "internal-papers",
  };

  const existing = internalEntriesBySubject.get(code) || [];
  existing.push(entry);
  internalEntriesBySubject.set(code, existing);
}

for (const [code, entries] of internalEntriesBySubject.entries()) {
  internalEntriesBySubject.set(code, sortInternalEntries(entries));
}

export const allSubjectCodes = Array.from(
  new Set([...semesterEntriesBySubject.keys(), ...internalEntriesBySubject.keys()])
).sort();

export const totalDocumentCount = allSubjectCodes.reduce(
  (sum, code) => sum + getSubjectDocumentCount(code),
  0
);

export function getSubjectSemesterEntries(code: string) {
  return semesterEntriesBySubject.get(code) || [];
}

export function getSubjectInternalEntries(code: string) {
  return internalEntriesBySubject.get(code) || [];
}

export function getSubjectDocumentCount(code: string) {
  return getSubjectSemesterEntries(code).length + getSubjectInternalEntries(code).length;
}

export function getSubjectContent(code: string) {
  const semesterPapers = getSubjectSemesterEntries(code);
  const internalPapers = getSubjectInternalEntries(code);
  return {
    semesterPapers,
    internalPapers,
    totalCount: semesterPapers.length + internalPapers.length,
  };
}

export const allContentEntries = allSubjectCodes.flatMap((code) => [
  ...getSubjectSemesterEntries(code),
  ...getSubjectInternalEntries(code),
]);

export function findContentEntry(code: string, file: string) {
  return allContentEntries.find((entry) => entry.code === code && entry.file === file);
}
