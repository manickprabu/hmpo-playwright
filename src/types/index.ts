export interface AppConfig {
  targetUrl: string;
  headless: boolean;
  slowMo: number;
  navigationTimeout: number;
  screenshotQuality: number;
  outputDir: string;
  inputFile: string;
}

export interface TabDefinition {
  name: string;
  selector: string;
  screenshotFilename?: string;
  ignoreScreenshot?: boolean;
  contentSelector?: string;
  textFilename?: string;
  extractText?: boolean;
}

export interface SectionDefinition {
  name: string;
  navigationSelector: string;
  readySelector?: string;
  tabs: TabDefinition[];
}

export interface PassportResult {
  passportNumber: string;
  success: boolean;
  startedAt: string;
  completedAt: string;
  error?: string;
}
