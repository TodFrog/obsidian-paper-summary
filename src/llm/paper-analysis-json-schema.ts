import type OpenAI from "openai";

const stringField = {
  type: "string",
} as const;

const stringArrayField = {
  type: "array",
  items: {
    type: "string",
  },
} as const;

const REQUIRED_FIELDS = [
  "title",
  "authors",
  "year",
  "venue",
  "url",
  "code",
  "oneSentenceSummary",
  "keyContributions",
  "problemStatement",
  "proposedMethod",
  "proposedMethodDetails",
  "datasetEnvironment",
  "keyMetrics",
  "results",
  "limitations",
  "tags",
] as const;

export const paperAnalysisJsonSchema = {
  name: "paper_analysis",
  description: "Structured academic paper summary for note generation.",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: stringField,
      authors: stringArrayField,
      year: stringField,
      venue: stringField,
      url: stringField,
      code: stringField,
      oneSentenceSummary: stringField,
      keyContributions: stringArrayField,
      problemStatement: stringField,
      proposedMethod: stringField,
      proposedMethodDetails: stringArrayField,
      datasetEnvironment: stringField,
      keyMetrics: stringField,
      results: stringArrayField,
      limitations: stringArrayField,
      tags: stringArrayField,
    },
    required: [...REQUIRED_FIELDS],
  },
} satisfies NonNullable<OpenAI.ResponseFormatJSONSchema["json_schema"]>;
