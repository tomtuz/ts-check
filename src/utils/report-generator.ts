import { TSConfig } from "./config-finder";
import { logger } from "./logger";
import { exportReport } from "./export-formats";
import { fileURLToPath } from "node:url";

interface AnalysisResult {
  configPath: string;
  valid: boolean;
  messages: string[];
  config: TSConfig;
}

interface Suggestion {
  setting: string;
  currentValue: any;
  suggestedValue: any;
  reason: string;
}

export function generateReport(
  results: AnalysisResult[],
  format: "text" | "json" | "html" | "markdown" = "text",
): string {
  switch (format) {
    case "text":
      return generateTextReport(results);
    case "json":
      return JSON.stringify(results, null, 2);
    case "html":
    case "markdown":
      return exportReport(format, results);
    default:
      throw new Error(`Unsupported report format: ${format}`);
  }
}

function generateTextReport(results: AnalysisResult[]): string {
  const report: string[] = [];

  report.push("TypeScript Configuration Analysis Report");
  report.push("==========================================");
  report.push("");

  for (const result of results) {
    report.push(`Configuration: ${result.configPath}`);
    report.push(`Overall Validity: ${result.valid ? "Valid" : "Invalid"}`);
    report.push("");

    report.push("Analysis Messages:");
    for (const message of result.messages) {
      report.push(`- ${message}`);
    }
    report.push("");

    const suggestions = generateSuggestions(result.config);
    if (suggestions.length > 0) {
      report.push("Suggestions for Improvement:");
      for (const suggestion of suggestions) {
        report.push(`- ${suggestion.setting}:`);
        report.push(
          `  Current value: ${JSON.stringify(suggestion.currentValue)}`,
        );
        report.push(
          `  Suggested value: ${JSON.stringify(suggestion.suggestedValue)}`,
        );
        report.push(`  Reason: ${suggestion.reason}`);
        report.push("");
      }
    } else {
      report.push("No suggestions for improvement.");
    }

    report.push("------------------------------------------");
    report.push("");
  }

  return report.join("\n");
}

function generateSuggestions(config: TSConfig): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (config.compilerOptions) {
    const { compilerOptions } = config;

    // Suggest strict mode if not enabled
    if (compilerOptions.strict !== true) {
      suggestions.push({
        setting: "compilerOptions.strict",
        currentValue: compilerOptions.strict,
        suggestedValue: true,
        reason:
          "Enabling strict mode helps catch more errors and improves type safety.",
      });
    }

    // Suggest using a modern target if using an older one
    const modernTargets = [
      "es2018",
      "es2019",
      "es2020",
      "es2021",
      "es2022",
      "esnext",
    ];
    if (
      compilerOptions.target &&
      !modernTargets.includes(compilerOptions.target.toLowerCase())
    ) {
      suggestions.push({
        setting: "compilerOptions.target",
        currentValue: compilerOptions.target,
        suggestedValue: "es2022",
        reason:
          "Using a more modern target allows for better optimizations and newer language features.",
      });
    }

    // Suggest enabling incremental compilation for larger projects
    if (compilerOptions.incremental !== true) {
      suggestions.push({
        setting: "compilerOptions.incremental",
        currentValue: compilerOptions.incremental,
        suggestedValue: true,
        reason:
          "Enabling incremental compilation can significantly speed up subsequent builds.",
      });
    }

    // Suggest using ESM module system if not already set
    if (
      compilerOptions.module &&
      !["es2015", "es2020", "es2022", "esnext"].includes(
        compilerOptions.module.toLowerCase(),
      )
    ) {
      suggestions.push({
        setting: "compilerOptions.module",
        currentValue: compilerOptions.module,
        suggestedValue: "es2022",
        reason:
          "Using the ECMAScript module system enables better tree-shaking and is more future-proof.",
      });
    }
  }

  return suggestions;
}

export function logReport(report: string): void {
  logger.info("TypeScript Configuration Analysis Report:");
  logger.info(report);
}

// Example usage
async function main() {
  const exampleResults: AnalysisResult[] = [
    {
      configPath: "tsconfig.json",
      valid: true,
      messages: [
        "Compiler options are valid.",
        "Project structure analysis completed successfully.",
      ],
      config: {
        compilerOptions: {
          target: "es5",
          module: "commonjs",
          strict: false,
        },
      },
    },
    {
      configPath: "src/tsconfig.app.json",
      valid: false,
      messages: [
        "Compiler options validation failed:",
        'Invalid "target" option. Expected one of: es3, es5, es6, es2015, es2016, es2017, es2018, es2019, es2020, es2021, es2022, esnext',
      ],
      config: {
        compilerOptions: {
          target: "invalid",
          module: "esnext",
          strict: true,
        },
      },
    },
  ];

  const textReport = generateReport(exampleResults, "text");
  logReport(textReport);

  const htmlReport = generateReport(exampleResults, "html");
  console.log("HTML Report:", htmlReport);

  const markdownReport = generateReport(exampleResults, "markdown");
  console.log("Markdown Report:", markdownReport);
}

const __filename = fileURLToPath(import.meta.url);
if (__filename === process.argv[1]) {
  main();
}
