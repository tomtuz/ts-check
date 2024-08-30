import { Command } from "commander";
import path from "node:path";
import fs from "node:fs/promises";
import { analyzeTSConfig } from "./utils/tsconfig-analyzer";
import { logger } from "./utils/logger";
import { generateReport } from "./utils/report-generator";
import { findTSConfigs } from "./utils/config-finder";

const program = new Command();

program
  .name("tsconfig-analyzer")
  .description("CLI to analyze TypeScript configurations")
  .version("1.0.0");

program
  .command("analyze")
  .description("Analyze TypeScript configurations in a repository")
  .option("-p, --path <path>", "Path to the repository", process.cwd())
  .option("-v, --verbose", "Enable verbose output")
  .option("-d, --debug", "Enable debug mode")
  .option(
    "-o, --output <format>",
    "Output format (text, json, html, markdown)",
    "text",
  )
  .option("-i, --ignore-errors", "Ignore errors and continue analysis")
  .option("-e, --export <file>", "Export the report to a file")
  .option("-a, --auto-fix", "Automatically apply suggested fixes")
  .action(async (options) => {
    const repoPath = path.resolve(options.path);
    try {
      if (options.verbose) {
        logger.setLevels({ Info: true, Debug: true, Verbose: true });
      } else if (options.debug) {
        logger.setLevels({ Info: true, Debug: true });
      }

      logger.info(`Analyzing TypeScript configurations in ${repoPath}`);
      const configFiles = await findTSConfigs(repoPath);
      logger.info(
        `Found ${configFiles.length} tsconfig files in the repository.`,
      );

      const results: Array<{
        configPath: string;
        valid: boolean;
        messages: string[];
        report: string;
        suggestedFixes: { description: string; reason: string }[];
        config: any;
      }> = [];

      for (const configPath of configFiles) {
        logger.group(`Analyzing ${configPath}`);
        const { valid, messages, report, suggestedFixes, config } =
          await analyzeTSConfig(configPath, {
            ignoreErrors: options.ignoreErrors,
            autoFix: options.autoFix,
          });
        results.push({
          configPath,
          valid,
          messages,
          report,
          suggestedFixes,
          config,
        });
        logger.groupEnd();
      }

      const report = generateReport(results, options.output);

      if (options.export) {
        await fs.writeFile(options.export, report);
        logger.info(`Report exported to ${options.export}`);
      } else {
        console.log(report);
      }

      // Display suggested fixes
      for (const result of results) {
        if (result.suggestedFixes.length > 0) {
          console.log(`\nSuggested fixes for ${result.configPath}:`);
          for (const fix of result.suggestedFixes) {
            console.log(`- ${fix.description}`);
            console.log(`  Reason: ${fix.reason}`);
          }
        }
      }

      logger.info("Analysis completed successfully.");
    } catch (error) {
      logger.error("Failed to analyze TSConfigs:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
