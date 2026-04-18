export interface SubjectSearchSeed {
  code: string;
  prefix: string;
  aliases: string[];
}

const prefixSearchAliases: Record<string, string[]> = {
  AICC: ["artificial intelligence", "intelligent systems", "cognitive science", "machine learning"],
  AICL: ["artificial intelligence elective", "ai elective"],
  AICS: ["algorithms", "software engineering", "computer networks", "cybersecurity", "core computing"],
  AIMA: ["artificial intelligence mathematics", "mathematics", "calculus", "probability", "optimization"],
  AIMC: ["communication", "communication skills"],
  AIME: ["ethics", "professional conduct"],
  AIPC: ["programming", "object oriented programming", "programming paradigms"],
  ARCH: ["architecture", "architectural"],
  BINF: ["bioinformatics"],
  BIOL: ["biology"],
  BIOT: ["biotechnology"],
  CHEG: ["chemical engineering", "chemical process"],
  CHEM: ["chemistry", "chemical science"],
  CIEG: ["civil engineering", "civil"],
  COEG: ["control engineering", "control", "instrumentation"],
  COMP: ["computer", "computing", "computer science", "computer engineering", "docse"],
  DSMA: ["data science", "mathematics", "analytics", "statistical modeling"],
  EEEG: ["electrical engineering", "electrical", "electronics", "electrical and electronics"],
  ESEE: ["environmental science and engineering", "environmental studies"],
  ENGG: ["engineering", "elements of engineering", "engineering project"],
  ENGT: ["communication", "technical communication", "communication skills"],
  ENVE: ["environmental engineering", "environmental"],
  ENVS: ["environmental science", "environmental"],
  EPEG: ["power engineering", "electrical power", "power"],
  ETEG: ["communication engineering", "communication"],
  GEOM: ["geomatics", "geomatics engineering", "geospatial", "geoinformatics", "surveying"],
  HBIO: ["human biology"],
  HIMS: ["health informatics", "digital health", "health information systems", "health data"],
  INAN: ["instrumental analysis"],
  MATH: ["mathematics", "math"],
  MCSC: ["computational mathematics", "mathematical sciences", "discrete mathematics", "numerical methods"],
  MEEG: ["mechanical engineering", "mechanical"],
  MEPP: ["mechanical engineering", "mechanical"],
  MGTS: ["management", "economics", "entrepreneurship", "engineering management"],
  MNEG: ["mining engineering", "mining"],
  PHAR: ["pharmacy", "pharmaceutical", "pharmaceutics"],
  PHYS: ["physics", "applied physics"],
  STAT: ["statistics", "probability"],
};

export function getCodePrefix(code: string) {
  return code.match(/^[A-Z]+/)?.[0] || code;
}

export function getSearchAliasesForCode(code: string) {
  const prefix = getCodePrefix(code);
  return prefixSearchAliases[prefix] || [];
}

export function buildSubjectSearchSeeds(subjectCodes: string[]): SubjectSearchSeed[] {
  return subjectCodes.map((code) => ({
    code,
    prefix: getCodePrefix(code),
    aliases: getSearchAliasesForCode(code),
  }));
}
