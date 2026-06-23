import { InputType } from "@prisma/client"

export interface ExtractorResult {
  rawText: string;
  sourceType: InputType;
  sourceUrl: string | null;
}

export interface Extractor {
  canHandle(input: string): boolean;
  extract(input: string): Promise<ExtractorResult>;
}
