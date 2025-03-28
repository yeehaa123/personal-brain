/**
 * CLI Interface utility using Inquirer for prompts and Chalk for styling
 */
import inquirer from 'inquirer';
import chalk from 'chalk';
import logger from './logger';

export class CLIInterface {
  /**
   * Display a styled title
   */
  static displayTitle(title: string): void {
    const separator = '='.repeat(title.length + 4);
    const formattedTitle = `\n${chalk.cyan(separator)}\n${chalk.cyan.bold(`  ${title}  `)}\n${chalk.cyan(separator)}\n`;
    
    // Log to both console and logger
    process.stdout.write(formattedTitle);
    logger.info(`[TITLE] ${title}`);
  }

  /**
   * Display a success message
   */
  static success(message: string): void {
    const formatted = chalk.green(`✓ ${message}`);
    process.stdout.write(formatted + '\n');
    logger.info(`[SUCCESS] ${message}`);
  }

  /**
   * Display an error message
   */
  static error(message: string): void {
    const formatted = chalk.red(`✖ ${message}`);
    process.stdout.write(formatted + '\n');
    logger.error(message);
  }

  /**
   * Display a warning message
   */
  static warn(message: string): void {
    const formatted = chalk.yellow(`⚠ ${message}`);
    process.stdout.write(formatted + '\n');
    logger.warn(message);
  }

  /**
   * Display an info message
   */
  static info(message: string): void {
    const formatted = chalk.blue(`ℹ ${message}`);
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
   * Display a formatted list of items
   */
  static displayList(items: any[], formatter?: (item: any, index: number) => string): void {
    // Log the list operation
    logger.info(`Displaying list of ${items.length} items`);
    
    items.forEach((item, index) => {
      const display = formatter ? formatter(item, index) : item.toString();
      process.stdout.write(`${chalk.cyan(index + 1)}. ${display}\n`);
    });
    
    // Add a blank line after the list
    process.stdout.write('\n');
  }

  /**
   * Prompt for a selection from a list of choices
   */
  static async select<T>(message: string, choices: Array<{name: string, value: T}>): Promise<T> {
    const { selection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selection',
        message,
        choices
      }
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
        default: defaultValue
      }
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
        default: defaultValue
      }
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
    let spinner: NodeJS.Timeout;
    
    // Start the spinner
    process.stdout.write(`${chalk.cyan(spinnerFrames[frameIndex])} ${message}`);
    
    spinner = setInterval(() => {
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
      this.success(message + " Completed!");
      return result;
    } catch (error) {
      // Stop the spinner and show error
      clearInterval(spinner);
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      this.error(message + " Failed! " + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
}