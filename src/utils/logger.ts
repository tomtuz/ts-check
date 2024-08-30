import picocolors from 'picocolors';

export enum LogLevel {
  Silent = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
  Verbose = 5,
}

export type OutputLevel = {
  [key in keyof typeof LogLevel]?: boolean;
};

class Logger {
  private static instance: Logger;
  private level: OutputLevel = {
    Silent: false,
    Error: true,
    Warn: true,
    Info: true,
    Debug: false,
    Verbose: false,
  };

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevels(levelObj: OutputLevel): void {
    this.level = { ...this.level, ...levelObj };
    this.verbose('Log levels updated:', this.level);
  }

  getLevels(): OutputLevel {
    return { ...this.level };
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${formattedArgs}`.trim();
  }

  error(message: string, ...args: any[]): void {
    if (this.level.Error) {
      console.error(picocolors.red(this.formatMessage('ERROR', message, ...args)));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level.Warn) {
      console.warn(picocolors.yellow(this.formatMessage('WARN', message, ...args)));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level.Info) {
      console.log(picocolors.blue(this.formatMessage('INFO', message, ...args)));
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.level.Debug) {
      console.log(picocolors.magenta(this.formatMessage('DEBUG', message, ...args)));
    }
  }

  verbose(message: string, ...args: any[]): void {
    if (this.level.Verbose) {
      console.log(picocolors.gray(this.formatMessage('VERBOSE', message, ...args)));
    }
  }

  group(label: string): void {
    if (this.level.Info) {
      console.group(picocolors.cyan(label));
    }
  }

  groupEnd(): void {
    if (this.level.Info) {
      console.groupEnd();
    }
  }
}

export const logger = Logger.getInstance();
