import type { ReportedDiagnostic } from "./ReportedDiagnostic.js";
import type { IClaudeClient } from "../claude/IClaudeClient.js";
import { buildExplainUserPrompt } from "../prompts/buildExplainUserPrompt.js";

export class ExplainErrorService {
  constructor(
    private readonly claudeClient: IClaudeClient,
    private readonly systemPrompt: string,
  ) {}

  async explain(source: string, diagnostics: readonly ReportedDiagnostic[]): Promise<string> {
    const userPrompt = buildExplainUserPrompt(source, diagnostics);
    return this.claudeClient.complete(this.systemPrompt, userPrompt);
  }
}
