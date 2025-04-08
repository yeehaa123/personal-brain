/**
 * CLI Interface utility using Inquirer for prompts and Chalk for styling
 * 
 * TODO: This class will be updated as part of the CLI/logger separation initiative
 * See planning/cli-logger-separation.md for the detailed plan
 */
import { clearInterval, setInterval } from 'timers';

import chalk from 'chalk';
import inquirer from 'inquirer';

import logger from './logger';


export class CLIInterface {
  // Color styles
  static get styles() {
    return {
      // Basic styles
      title: chalk.cyan.bold,             // Cyan bold for main titles
      subtitle: chalk.magenta.bold,       // Magenta bold for subtitles - distinct color
      separator: chalk.cyan,              // Cyan for separators
      label: chalk.dim,                   // Dim for labels
      value: chalk.white,                 // White for values
      highlight: chalk.cyan,              // Cyan for highlighted text
      success: chalk.green,               // Green for success messages
      error: chalk.red,                   // Red for error messages
      warning: chalk.yellow,              // Yellow for warnings
      info: chalk.blue,                   // Blue for info messages
      dim: chalk.dim,                     // Dim for less important text

      // Specialized styles
      id: chalk.gray,                     // Gray for IDs
      tag: chalk.cyan,                    // Cyan for tags
      date: chalk.white,                  // White for dates
      number: chalk.cyan,                 // Cyan for numbers
      command: chalk.cyan,                // Cyan for commands
      example: chalk.italic,              // Italic for examples
      url: chalk.blue.underline,          // Blue underlined for URLs
      warn: chalk.yellow,                 // Yellow for warnings

      // Icon styles
      successIcon: chalk.green('✓'),      // Green checkmark for success
      errorIcon: chalk.red('✖'),          // Red X for errors
      warningIcon: chalk.yellow('⚠'),     // Yellow warning symbol
      infoIcon: chalk.blue('ℹ'),           // Blue info symbol
    };
  }

  /**
   * Display a styled title
   */
  static displayTitle(title: string): void {
    const separator = '='.repeat(title.length + 4);
    const formattedTitle = `\n${this.styles.separator(separator)}\n${this.styles.title(`  ${title}  `)}\n${this.styles.separator(separator)}\n`;

    // Output to console
    process.stdout.write(formattedTitle);

    // Log to file only, not to console
    logger.debug(`Displayed title: ${title}`);
  }

  /**
   * Display a styled subtitle
   */
  static displaySubtitle(subtitle: string): void {
    // Add a separator line before subtitle
    const line = '─'.repeat(subtitle.length + 4);

    // Format with separator line for clearer hierarchy
    const formattedSubtitle = `\n${this.styles.dim(line)}\n${this.styles.subtitle(subtitle)}\n`;

    // Output to console
    process.stdout.write(formattedSubtitle);

    // Log to file only, not to console
    logger.debug(`Displayed subtitle: ${subtitle}`);
  }

  /**
   * Display a success message
   */
  static success(message: string): void {
    const formatted = `${this.styles.successIcon} ${message}`;
    process.stdout.write(formatted + '\n');
    logger.info(`[SUCCESS] ${message}`);
  }

  /**
   * Display an error message
   */
  static error(message: string): void {
    const formatted = `${this.styles.errorIcon} ${message}`;
    process.stdout.write(formatted + '\n');
    logger.error(message);
  }

  /**
   * Display a warning message
   */
  static warn(message: string): void {
    const formatted = `${this.styles.warningIcon} ${message}`;
    process.stdout.write(formatted + '\n');
    logger.warn(message);
  }

  /**
   * Display an info message
   */
  static info(message: string): void {
    const formatted = `${this.styles.infoIcon} ${message}`;
    process.stdout.write(formatted + '\n');
    logger.info(message);
  }

  /**
   * Print text to console without logging
   */
  static print(message: string): void {
    process.stdout.write(message + '\n');
  }

  /**
   * Format and print a label-value pair
   */
  static printLabelValue(label: string, value: string | number | string[] | null, options?: {
    emptyText?: string,
    formatter?: (val: string) => string
  }): void {
    const emptyText = options?.emptyText || 'None';

    // Format the label
    const formattedLabel = `${this.styles.label(label + ':')}`;

    // Handle array values
    if (Array.isArray(value)) {
      if (value.length === 0) {
        process.stdout.write(`${formattedLabel} ${this.styles.dim(emptyText)}\n`);
      } else {
        const formatter = options?.formatter || (val => this.styles.tag(val));
        process.stdout.write(`${formattedLabel} ${value.map(formatter).join(' ')}\n`);
      }
    } else {
      // Handle empty values
      if (value === undefined || value === null || value === '') {
        process.stdout.write(`${formattedLabel} ${this.styles.dim(emptyText)}\n`);
      } else {
        const displayValue = options?.formatter
          ? options.formatter(value.toString())
          : value.toString();
        process.stdout.write(`${formattedLabel} ${displayValue}\n`);
      }
    }
  }

  /**
   * Display a formatted list of items
   */
  static displayList<T>(items: T[], formatter?: (item: T, index: number) => string): void {
    // Log the list operation
    logger.info(`Displaying list of ${items.length} items`);

    items.forEach((item, index) => {
      const display = formatter ? formatter(item, index) : String(item);
      process.stdout.write(`${this.styles.number(index + 1)}. ${display}\n`);
    });

    // Add a blank line after the list
    process.stdout.write('\n');
  }

  /**
   * Format a command for display
   */
  static formatCommand(command: string, description: string, examples?: string[]): string {
    const cmdText = `  ${this.styles.command(command.padEnd(20))} - ${description}`;

    if (!examples || examples.length === 0) {
      return cmdText;
    }

    return [
      cmdText,
      ...examples.map(ex => `    ${this.styles.dim('>')} ${this.styles.example(ex)}`),
    ].join('\n');
  }

  /**
   * Format an ID for display
   */
  static formatId(id: string): string {
    return this.styles.id(id);
  }

  /**
   * Format tags for display 
   */
  static formatTags(tags: string[] | null | undefined): string {
    if (!tags || tags.length === 0) {
      return this.styles.dim('No tags');
    }

    return tags.map(tag => this.styles.tag(`#${tag}`)).join(' ');
  }

  /**
   * Format a date for display
   */
  static formatDate(date: Date | string | number): string {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    return dateObj.toLocaleString();
  }

  /**
   * Prompt for a selection from a list of choices
   */
  static async select<T>(message: string, choices: Array<{ name: string, value: T }>): Promise<T> {
    const { selection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selection',
        message,
        choices,
      },
    ]);
    return selection;
  }

  /**
   * Prompt for a free text input
   */
  static async input(message: string, defaultValue?: string): Promise<string> {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message,
        default: defaultValue,
      },
    ]);
    return input;
  }

  /**
   * Prompt for a confirmation (yes/no)
   */
  static async confirm(message: string, defaultValue = false): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue,
      },
    ]);
    return confirmed;
  }

  /**
   * Display a spinner while an async operation is in progress
   * Note: This uses console for the spinner effect
   */
  static async withSpinner<T>(message: string, task: () => Promise<T>): Promise<T> {
    const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;

    // Start the spinner
    process.stdout.write(`${chalk.cyan(spinnerFrames[frameIndex])} ${message}`);

    const spinner = setInterval(() => {
      frameIndex = (frameIndex + 1) % spinnerFrames.length;
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`${chalk.cyan(spinnerFrames[frameIndex])} ${message}`);
    }, 80);

    try {
      const result = await task();
      // Stop the spinner and show success
      clearInterval(spinner);
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      this.success(message + ' Completed!');
      return result;
    } catch (error) {
      // Stop the spinner and show error
      clearInterval(spinner);
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      this.error(message + ' Failed! ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
}
