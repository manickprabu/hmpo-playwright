import path from 'node:path';
import type { PassportResult } from '../types/index.js';
import { writeUtf8 } from '../utils/fileUtils.js';
import { maskPassport } from '../utils/logger.js';

type ActivityState = 'idle' | 'running' | 'completed' | 'failed';

export interface ActivityEvent {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'error';
}

export interface ActivityStatus {
  updatedAt: string;
  state: ActivityState;
  total: number;
  completed: number;
  successful: number;
  failed: number;
  currentPassport?: string;
  currentStep?: string;
  recordProgress?: { completed: number; total: number };
  events: ActivityEvent[];
  results: Array<
    Pick<PassportResult, 'success' | 'startedAt' | 'completedAt' | 'error'> & { passport: string }
  >;
}

export class ActivityTracker {
  private readonly filePath: string;
  private status: ActivityStatus = {
    updatedAt: new Date().toISOString(),
    state: 'idle',
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    events: [],
    results: [],
  };

  constructor(outputDirectory: string) {
    this.filePath = path.join(outputDirectory, 'run-status.json');
  }

  async start(total: number): Promise<void> {
    this.status = {
      ...this.status,
      state: 'running',
      total,
      completed: 0,
      successful: 0,
      failed: 0,
      results: [],
      events: [],
      recordProgress: undefined,
    };
    await this.event('Batch started.');
  }

  async step(passport: string, message: string): Promise<void> {
    this.status.currentPassport = maskPassport(passport);
    this.status.currentStep = message;
    if (this.status.recordProgress) {
      this.status.recordProgress.completed = Math.min(
        this.status.recordProgress.completed + 1,
        this.status.recordProgress.total,
      );
    }
    await this.event(message);
  }

  beginRecord(passport: string, totalSteps: number): void {
    this.status.currentPassport = maskPassport(passport);
    this.status.recordProgress = { completed: 0, total: totalSteps };
  }

  async record(result: PassportResult): Promise<void> {
    if (this.status.recordProgress) {
      this.status.recordProgress.completed = this.status.recordProgress.total;
    }
    this.status.completed += 1;
    this.status.successful += result.success ? 1 : 0;
    this.status.failed += result.success ? 0 : 1;
    this.status.results.unshift({
      passport: maskPassport(result.passportNumber),
      success: result.success,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      error: result.error,
    });
    await this.event(
      result.success
        ? `Completed ${maskPassport(result.passportNumber)}.`
        : `Failed ${maskPassport(result.passportNumber)}.`,
      result.success ? 'success' : 'error',
    );
  }

  async finish(): Promise<void> {
    this.status.state = 'completed';
    this.status.currentPassport = undefined;
    this.status.currentStep = 'Processing completed.';
    await this.event('Processing completed.', 'success');
  }

  async fail(message: string): Promise<void> {
    this.status.state = 'failed';
    this.status.currentStep = 'Setup failed.';
    await this.event(message, 'error');
  }

  private async event(message: string, level: ActivityEvent['level'] = 'info'): Promise<void> {
    this.status.updatedAt = new Date().toISOString();
    this.status.events.unshift({ timestamp: this.status.updatedAt, message, level });
    this.status.events = this.status.events.slice(0, 25);
    await writeUtf8(this.filePath, `${JSON.stringify(this.status, null, 2)}\n`);
  }
}
