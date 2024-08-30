import { TSConfig } from './config-finder';

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

function generateHTMLReport(results: AnalysisResult[]): string {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TypeScript Configuration Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #2c3e50; }
        .valid { color: #27ae60; }
        .invalid { color: #c0392b; }
        .suggestion { background-color: #f9f9f9; border-left: 5px solid #3498db; padding: 10px; margin-bottom: 10px; }
        .config-section { border-bottom: 1px solid #bdc3c7; margin-bottom: 20px; padding-bottom: 20px; }
    </style>
</head>
<body>
    <h1>TypeScript Configuration Analysis Report</h1>
    
    ${results.map(result => `
    <div class="config-section">
        <h2>Configuration: ${result.configPath}</h2>
        <h3>Overall Validity: <span class="${result.valid ? 'valid' : 'invalid'}">${result.valid ? 'Valid' : 'Invalid'}</span></h3>
        
        <h3>Analysis Messages:</h3>
        <ul>
            ${result.messages.map(message => `<li>${message}</li>`).join('')}
        </ul>
        
        <h3>Suggestions for Improvement:</h3>
        ${generateSuggestions(result.config).map(suggestion => `
            <div class="suggestion">
                <h4>${suggestion.setting}</h4>
                <p><strong>Current value:</strong> ${JSON.stringify(suggestion.currentValue)}</p>
                <p><strong>Suggested value:</strong> ${JSON.stringify(suggestion.suggestedValue)}</p>
                <p><strong>Reason:</strong> ${suggestion.reason}</p>
            </div>
        `).join('') || '<p>No suggestions for improvement.</p>'}
    </div>
    `).join('')}
</body>
</html>
  `;

  return html;
}

function generateMarkdownReport(results: AnalysisResult[]): string {
  const md = `
# TypeScript Configuration Analysis Report

${results.map(result => `
## Configuration: ${result.configPath}

### Overall Validity: ${result.valid ? 'Valid' : 'Invalid'}

### Analysis Messages:

${result.messages.map(message => `- ${message}`).join('\n')}

### Suggestions for Improvement:

${generateSuggestions(result.config).map(suggestion => `
#### ${suggestion.setting}

- **Current value:** ${JSON.stringify(suggestion.currentValue)}
- **Suggested value:** ${JSON.stringify(suggestion.suggestedValue)}
- **Reason:** ${suggestion.reason}
`).join('\n') || 'No suggestions for improvement.'}

---
`).join('\n')}
  `;

  return md.trim();
}

function generateSuggestions(config: TSConfig): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (config.compilerOptions) {
    const { compilerOptions } = config;

    // Suggest strict mode if not enabled
    if (compilerOptions.strict !== true) {
      suggestions.push({
        setting: 'compilerOptions.strict',
        currentValue: compilerOptions.strict,
        suggestedValue: true,
        reason: 'Enabling strict mode helps catch more errors and improves type safety.',
      });
    }

    // Suggest using a modern target if using an older one
    const modernTargets = ['es2018', 'es2019', 'es2020', 'es2021', 'es2022', 'esnext'];
    if (compilerOptions.target && !modernTargets.includes(compilerOptions.target.toLowerCase())) {
      suggestions.push({
        setting: 'compilerOptions.target',
        currentValue: compilerOptions.target,
        suggestedValue: 'es2022',
        reason: 'Using a more modern target allows for better optimizations and newer language features.',
      });
    }

    // Suggest enabling incremental compilation for larger projects
    if (compilerOptions.incremental !== true) {
      suggestions.push({
        setting: 'compilerOptions.incremental',
        currentValue: compilerOptions.incremental,
        suggestedValue: true,
        reason: 'Enabling incremental compilation can significantly speed up subsequent builds.',
      });
    }

    // Suggest using ESM module system if not already set
    if (compilerOptions.module && !['es2015', 'es2020', 'es2022', 'esnext'].includes(compilerOptions.module.toLowerCase())) {
      suggestions.push({
        setting: 'compilerOptions.module',
        currentValue: compilerOptions.module,
        suggestedValue: 'es2022',
        reason: 'Using the ECMAScript module system enables better tree-shaking and is more future-proof.',
      });
    }
  }

  return suggestions;
}

export function exportReport(format: 'html' | 'markdown', results: AnalysisResult[]): string {
  switch (format) {
    case 'html':
      return generateHTMLReport(results);
    case 'markdown':
      return generateMarkdownReport(results);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}