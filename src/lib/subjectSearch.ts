import type { SubjectSearchSeed } from "../data/searchAliases.ts";

export interface SubjectSearchEntry {
  aliases: string[];
  code: string;
  compactFields: string[];
  prefix: string;
  searchPhrases: string[];
  searchTokens: string[];
}

export function normalizeSearchTerm(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function compactSearchTerm(value: string) {
  return normalizeSearchTerm(value).replace(/\s+/g, "");
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function buildAcronym(phrase: string) {
  const words = phrase.split(" ").filter(Boolean);
  if (words.length < 2) return "";
  return words.map((word) => word[0]).join("");
}

export function buildSubjectSearchIndex(subjects: SubjectSearchSeed[]): SubjectSearchEntry[] {
  return subjects.map(({ code, prefix, aliases }) => {
    const normalizedCode = compactSearchTerm(code).toUpperCase();
    const normalizedPrefix = compactSearchTerm(prefix).toUpperCase();
    const normalizedAliases = unique(aliases.map((alias) => normalizeSearchTerm(alias)).filter(Boolean));

    const searchPhrases = unique(
      [normalizedCode.toLowerCase(), normalizedPrefix.toLowerCase(), ...normalizedAliases].filter(Boolean),
    );
    const compactFields = unique(searchPhrases.map((phrase) => compactSearchTerm(phrase)).filter(Boolean));
    const searchTokens = unique(
      searchPhrases
        .flatMap((phrase) => {
          const tokens = phrase.split(" ").filter(Boolean);
          const acronym = buildAcronym(phrase);
          return acronym ? [...tokens, acronym] : tokens;
        })
        .filter(Boolean),
    );

    return {
      aliases,
      code: normalizedCode,
      compactFields,
      prefix: normalizedPrefix,
      searchPhrases,
      searchTokens,
    };
  });
}

export function scoreSubjectSearch(entry: SubjectSearchEntry, query: string) {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return 0;

  const compactQuery = compactSearchTerm(query);
  if (!compactQuery) return 0;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  let score = 0;
  let broadMatch = false;

  if (entry.code === compactQuery.toUpperCase()) {
    score += 1400;
    broadMatch = true;
  } else if (entry.code.startsWith(compactQuery.toUpperCase())) {
    score += 1080;
    broadMatch = true;
  } else if (entry.code.includes(compactQuery.toUpperCase())) {
    score += 760;
    broadMatch = true;
  }

  if (entry.prefix === compactQuery.toUpperCase()) {
    score += 900;
    broadMatch = true;
  } else if (entry.prefix.startsWith(compactQuery.toUpperCase())) {
    score += 700;
    broadMatch = true;
  } else if (entry.prefix.includes(compactQuery.toUpperCase())) {
    score += 460;
    broadMatch = true;
  }

  for (const phrase of entry.searchPhrases) {
    if (phrase === normalizedQuery) {
      score += 1040;
      broadMatch = true;
      continue;
    }
    if (phrase.startsWith(normalizedQuery)) {
      score += 760;
      broadMatch = true;
      continue;
    }
    if (phrase.includes(normalizedQuery)) {
      score += 540;
      broadMatch = true;
    }
  }

  for (const field of entry.compactFields) {
    if (field === compactQuery) {
      score += 520;
      broadMatch = true;
      continue;
    }
    if (field.startsWith(compactQuery)) {
      score += 340;
      broadMatch = true;
      continue;
    }
    if (compactQuery.length >= 3 && field.includes(compactQuery)) {
      score += 220;
      broadMatch = true;
    }
  }

  let tokenScore = 0;
  for (const token of queryTokens) {
    let bestTokenScore = 0;

    for (const searchToken of entry.searchTokens) {
      if (searchToken === token) {
        bestTokenScore = Math.max(bestTokenScore, 220);
        continue;
      }
      if (searchToken.startsWith(token)) {
        bestTokenScore = Math.max(bestTokenScore, token.length >= 3 ? 170 : 130);
        continue;
      }
      if (token.length >= 3 && searchToken.includes(token)) {
        bestTokenScore = Math.max(bestTokenScore, 110);
      }
    }

    if (bestTokenScore === 0) return -1;
    tokenScore += bestTokenScore;
  }

  score += tokenScore;
  return broadMatch || tokenScore > 0 ? score : -1;
}

export function searchSubjectEntries(subjects: SubjectSearchEntry[], query: string, limit = Infinity) {
  const normalizedQuery = normalizeSearchTerm(query);

  if (!normalizedQuery) {
    return subjects.slice(0, limit);
  }

  return subjects
    .map((entry) => ({
      entry,
      score: scoreSubjectSearch(entry, normalizedQuery),
    }))
    .filter((item) => item.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.entry.code.localeCompare(right.entry.code);
    })
    .slice(0, limit)
    .map((item) => item.entry);
}
