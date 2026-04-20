import { programs } from "./programs.ts";

export interface ProgramPaletteEntry {
  id: string;
  kind: "program" | "semester";
  title: string;
  subtitle: string;
  keywords: string;
  action: string;
}

const romanValueMap: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
};

const ordinalWordMap: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  6: "sixth",
  7: "seventh",
  8: "eighth",
};

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function romanToNumber(value: string) {
  return romanValueMap[value.trim().toUpperCase()] ?? undefined;
}

function buildProgramAcronym(value: string) {
  const words = value
    .replace(/&/g, " ")
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["and", "of"].includes(word.toLowerCase()));

  if (words.length < 2) return "";
  return words.map((word) => word[0]).join("").toUpperCase();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatProgramSemesterLabel(value: string) {
  const [year, semester] = value.split("/");
  if (!year || !semester) return `Semester ${value}`;
  return `Year ${year} · Semester ${semester}`;
}

function buildProgramKeywords(programName: string) {
  const strippedProgram = programName.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const parentheticalParts = Array.from(programName.matchAll(/\(([^)]*)\)/g)).map((match) => match[1].trim());
  const acronym = buildProgramAcronym(programName);
  const engineeringAlias = strippedProgram.includes("Engineering")
    ? strippedProgram.replace("Engineering", "Eng").trim()
    : "";

  return unique([
    programName,
    strippedProgram,
    engineeringAlias,
    acronym,
    ...parentheticalParts,
  ]).filter(Boolean);
}

function buildSemesterKeywords(semester: string) {
  const [yearRomanRaw, semRomanRaw] = semester.split("/");
  const yearRoman = yearRomanRaw?.trim().toUpperCase() || "";
  const semRoman = semRomanRaw?.trim().toUpperCase() || "";
  const yearNumber = romanToNumber(yearRoman);
  const semNumber = romanToNumber(semRoman);
  const yearWord = yearNumber ? ordinalWordMap[yearNumber] : "";
  const semWord = semNumber ? ordinalWordMap[semNumber] : "";

  return unique([
    semester,
    semester.replace("/", " "),
    yearNumber && semNumber ? `${yearNumber}/${semNumber}` : "",
    yearNumber ? `year ${yearNumber}` : "",
    semNumber ? `semester ${semNumber}` : "",
    yearNumber && semNumber ? `year ${yearNumber} semester ${semNumber}` : "",
    yearWord ? `${yearWord} year` : "",
    semWord ? `${semWord} semester` : "",
    yearWord && semWord ? `${yearWord} year ${semWord} semester` : "",
    yearNumber && semNumber ? `${yearNumber} year ${semNumber} semester` : "",
    yearRoman && semRoman ? `year ${yearRoman} semester ${semRoman}` : "",
    semNumber ? `sem ${semNumber}` : "",
  ]).filter(Boolean);
}

export function buildProgramPaletteEntries(availableSubjectCodes: string[] = []) {
  const availableSubjectSet = new Set(availableSubjectCodes);
  const entries: ProgramPaletteEntry[] = [];

  for (const [programName, semesters] of Object.entries(programs)) {
    const filteredSemesters = semesters.filter((semester) =>
      semester.subjects.some((subject) => availableSubjectSet.size === 0 || availableSubjectSet.has(subject)),
    );

    if (filteredSemesters.length === 0) continue;

    const programKeywords = buildProgramKeywords(programName);
    const programQuery = `/?program=${encodeURIComponent(programName)}`;
    const semesterCount = filteredSemesters.length;

    entries.push({
      id: `program-${slugify(programName)}`,
      kind: "program",
      title: programName,
      subtitle: semesterCount === 1 ? "1 semester available" : `${semesterCount} semesters available`,
      keywords: unique([
        ...programKeywords,
        "program",
        "all semesters",
        "browse program",
      ]).join(" "),
      action: programQuery,
    });

    filteredSemesters.forEach((semesterEntry) => {
      const semesterLabel = formatProgramSemesterLabel(semesterEntry.semester);
      const subjectCount = semesterEntry.subjects.filter(
        (subject) => availableSubjectSet.size === 0 || availableSubjectSet.has(subject),
      ).length;

      entries.push({
        id: `semester-${slugify(programName)}-${slugify(semesterEntry.semester)}`,
        kind: "semester",
        title: programName,
        subtitle: `${semesterLabel} · ${subjectCount} subject${subjectCount === 1 ? "" : "s"}`,
        keywords: unique([
          ...programKeywords,
          ...buildSemesterKeywords(semesterEntry.semester),
          semesterLabel,
          `${programName} ${semesterLabel}`,
          "semester",
          "year",
        ]).join(" "),
        action: `/?program=${encodeURIComponent(programName)}&semester=${encodeURIComponent(semesterEntry.semester)}`,
      });
    });
  }

  return entries;
}
