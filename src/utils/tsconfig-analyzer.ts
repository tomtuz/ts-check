import path from "node:path";
import { logger } from "./logger";
import { validateCompilerOptions, CompilerOptions } from "./compiler-options";
import {
  scanProjectStructure,
  analyzeProjectStructure,
  ProjectStructure,
} from "./project-structure";
import { findAndMergeConfigs, TSConfig } from "./config-finder";
import { promptUser } from "./user-interaction";
import {
  scanNodeModules,
  incorporateDependencyConfigs,
} from "./node-modules-resolver";
import { generateReport, logReport } from "./report-generator";
import { analyzeCommonIssues, applyFix } from "./common-issues";
import { ZodIssue } from "zod";
import { fileURLToPath } from "node:url";

interface AnalyzerOptions {
  ignoreErrors?: boolean;
  autoFix?: boolean;
}

export class TSConfigAnalyzer {
  private configPath: string;
  private config: TSConfig | null = null;
  private projectStructure: ProjectStructure | null = null;
  private dependencyConfigs: Map<string, TSConfig> | null = null;
  private options: AnalyzerOptions;

  constructor(configPath: string, options: AnalyzerOptions = {}) {
    this.configPath = configPath;
    this.options = options;
    logger.debug("TSConfigAnalyzer initialized", { configPath, options });
  }

  async readAndParseConfig(): Promise<void> {
    logger.info(`Reading and parsing configuration from ${this.configPath}`);
    try {
      const projectRoot = path.dirname(this.configPath);
      logger.debug("Project root directory", projectRoot);

      logger.verbose("Finding and merging configurations");
      this.config = await findAndMergeConfigs(projectRoot);
      logger.info("Successfully read and merged configurations");
      logger.debug("Merged configuration", this.config);

      logger.verbose("Scanning project structure");
      this.projectStructure = await scanProjectStructure(projectRoot);
      logger.debug("Project structure", this.projectStructure);

      logger.verbose("Scanning node_modules");
      this.dependencyConfigs = await scanNodeModules(projectRoot);
      logger.debug("Dependency configurations", this.dependencyConfigs);

      if (this.config && this.dependencyConfigs) {
        logger.verbose("Incorporating dependency configurations");
        this.config = incorporateDependencyConfigs(
          this.config,
          this.dependencyConfigs,
        );
        logger.debug(
          "Final configuration after incorporating dependencies",
          this.config,
        );
      }
    } catch (error) {
      logger.error("Error reading or parsing configurations:", error);
      if (!this.options.ignoreErrors) {
        throw error;
      }
    }
  }

  getConfig(): TSConfig | null {
    return this.config;
  }

  async validateCompilerOptions(): Promise<{
    valid: boolean;
    // errors: string[];
    errors: ZodIssue[];
  }> {
    logger.info("Validating compiler options");
    if (!this.config || !this.config.compilerOptions) {
      logger.warn(
        "No compiler options found in tsconfig.json or extended configs",
      );
      return {
        valid: false,
        errors: [
          {
            code: "custom",
            path: [],
            message:
              "No compiler options found in tsconfig.json or extended configs",
          },
        ],
      };
    }

    logger.debug("Compiler options to validate", this.config.compilerOptions);
    const { valid, errors } = validateCompilerOptions(
      this.config.compilerOptions,
    );

    if (!valid && !this.options.ignoreErrors) {
      logger.warn("Compiler options validation failed");
      const correctedErrors = await this.handleValidationErrors(errors);
      return {
        valid: correctedErrors.length === 0,
        // errors: correctedErrors,
        errors: [
          ...correctedErrors,
          // {
          //   code: "custom",
          //   path: [],
          //   message:
          //     "No compiler options found in tsconfig.json or extended configs",
          // }
        ],
      };
    }

    logger.info("Compiler options are valid");
    // return { valid, errors: errors as string[] };
    return { valid, errors: errors as ZodIssue[] };
  }

  private async handleValidationErrors(
    errors: ZodIssue[],
  ): Promise<ZodIssue[]> {
    logger.debug("Handling validation errors", errors);
    const correctedErrors: ZodIssue[] = [];

    for (const error of errors) {
      const errorPath = error.path.join(".");
      const errorMessage = `${errorPath}: ${error.message}`;
      logger.info("Validation error:", errorMessage);
      const shouldCorrect = await promptUser(
        `Do you want to correct the error: ${errorMessage}? (yes/no)`,
        `correct_error_${errorPath}`,
      );

      if (shouldCorrect.toLowerCase() === "yes") {
        const correction = await promptUser(
          `Enter the correct value for ${errorPath}:`,
          `correction_${errorPath}`,
        );
        logger.debug(`Applying correction for ${errorPath}`, correction);
        // Apply the correction to this.config
        let target: any = this.config?.compilerOptions;
        for (let i = 0; target && i < error.path.length - 1; i++) {
          target = target[error.path[i]];
        }
        if (target) {
          target[error.path[error.path.length - 1]] = correction;
        }
      } else {
        logger.debug(`Error not corrected: ${errorMessage}`);
        correctedErrors.push({
          code: "custom",
          path: [],
          message: errorMessage,
        });
      }
    }

    return correctedErrors;
  }

  async analyzeConfig(): Promise<{
    valid: boolean;
    messages: string[];
    report: string;
    suggestedFixes: { description: string; reason: string }[];
  }> {
    logger.info("Starting configuration analysis");
    const messages: string[] = [];
    let valid = true;
    const suggestedFixes: { description: string; reason: string }[] = [];

    if (!this.config) {
      logger.error("No configuration found");
      return {
        valid: false,
        messages: ["No configuration found"],
        report: "",
        suggestedFixes: [],
      };
    }

    // Validate compiler options
    logger.verbose("Validating compiler options");
    const { valid: compilerOptionsValid, errors: compilerOptionsErrors } =
      await this.validateCompilerOptions();
    if (!compilerOptionsValid) {
      valid = false;
      messages.push("Compiler options validation failed:");

      messages.push(...compilerOptionsErrors.map((error) => error.message));

      logger.warn("Compiler options validation failed", {
        errors: compilerOptionsErrors,
      });
    } else {
      messages.push("Compiler options are valid.");
      logger.info("Compiler options are valid");
    }

    // Analyze project structure
    if (this.projectStructure) {
      logger.verbose("Analyzing project structure");
      const structureAnalysis = analyzeProjectStructure(
        this.projectStructure,
        this.config,
      );
      messages.push("Project structure analysis:");
      messages.push(...structureAnalysis);
      logger.info("Project structure analysis completed");
      logger.debug("Project structure analysis results", structureAnalysis);
    } else {
      messages.push(
        "Warning: Project structure analysis skipped - no structure data available.",
      );
      logger.warn(
        "Project structure analysis skipped - no structure data available",
      );
    }

    // Analyze common issues and suggest fixes
    logger.verbose("Analyzing common issues");
    const commonIssues = analyzeCommonIssues(this.config);
    if (commonIssues.length > 0) {
      messages.push("Common issues detected:");
      for (const issue of commonIssues) {
        messages.push(`- ${issue.description}`);
        suggestedFixes.push({
          description: issue.description,
          reason: issue.reason,
        });
      }
      logger.info("Common issues detected", commonIssues);

      if (this.options.autoFix) {
        logger.info("Applying automatic fixes");
        for (let i = 0; i < commonIssues.length; i++) {
          this.config = applyFix(this.config, i);
        }
        messages.push("Automatic fixes applied.");
      }
    } else {
      messages.push("No common issues detected.");
      logger.info("No common issues detected");
    }

    // Generate the report
    logger.verbose("Generating analysis report");
    const report = generateReport([
      { configPath: "", config: this.config, valid, messages },
    ]);

    logger.debug("Generated report", report);

    logger.info("Configuration analysis completed");
    return {
      valid: valid || !!this.options.ignoreErrors,
      messages,
      report,
      suggestedFixes,
    };
  }
}

export async function analyzeTSConfig(
  configPath: string,
  options: AnalyzerOptions = {},
): Promise<{
  valid: boolean;
  messages: string[];
  report: string;
  suggestedFixes: { description: string; reason: string }[];
  config: TSConfig | null;
}> {
  logger.info(`Analyzing TSConfig: ${configPath}`);
  const analyzer = new TSConfigAnalyzer(configPath, options);
  await analyzer.readAndParseConfig();
  const result = await analyzer.analyzeConfig();
  return { ...result, config: analyzer.getConfig() };
}

// Example usage
async function main() {
  const configPath = path.join(process.cwd(), "tsconfig.json");
  try {
    logger.group("TSConfig Analysis");
    const { valid, messages, report, suggestedFixes } =
      await analyzeTSConfig(configPath);
    logger.info("TSConfig analysis result:");
    logger.info(`Valid: ${valid}`);
    for (const message of messages) {
      logger.info(message);
    }
    if (suggestedFixes.length > 0) {
      logger.info("Suggested fixes:");
      for (const fix of suggestedFixes) {
        logger.info(`- ${fix.description}`);
        logger.info(`  Reason: ${fix.reason}`);
      }
    }
    logReport(report);
    logger.groupEnd();
  } catch (error) {
    logger.error("Failed to analyze TSConfig:", error);
  }
}

const __filename = fileURLToPath(import.meta.url);
if (__filename === process.argv[1]) {
  main();
}
