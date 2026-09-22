import type { SectionDefinition } from './types/index.js';

/**
 * Configure the pages and tabs to visit here. Selectors are intentional TODOs;
 * update them to match the target website after its HTML is available.
 */
export const sections: SectionDefinition[] = [
  {
    name: 'Overview',
    navigationSelector: '[data-testid="nav-overview"]', // TODO: replace
    readySelector: '[data-testid="overview-content"]', // TODO: replace
    tabs: [
      {
        name: 'Overview',
        selector: '[data-testid="tab-overview"]', // TODO: replace
        contentSelector: '[data-testid="overview-content"]', // TODO: replace
        screenshotFilename: '01-overview.jpg',
      },
    ],
  },
  {
    name: 'Personal Details',
    navigationSelector: '[data-testid="nav-personal-details"]', // TODO: replace
    readySelector: '[data-testid="personal-details-content"]', // TODO: replace
    tabs: [
      {
        name: 'Personal Details',
        selector: '[data-testid="tab-personal-details"]', // TODO: replace
        contentSelector: '[data-testid="personal-details-content"]', // TODO: replace
        screenshotFilename: '02-personal-details.jpg',
      },
    ],
  },
  {
    name: 'Application Details',
    navigationSelector: '[data-testid="nav-application-details"]', // TODO: replace
    readySelector: '[data-testid="application-details-content"]', // TODO: replace
    tabs: [
      {
        name: 'Application Details',
        selector: '[data-testid="tab-application-details"]', // TODO: replace
        contentSelector: '[data-testid="application-details-content"]', // TODO: replace
        screenshotFilename: '03-application-details.jpg',
      },
    ],
  },
  {
    name: 'History',
    navigationSelector: '[data-testid="nav-history"]', // TODO: replace
    readySelector: '[data-testid="history-content"]', // TODO: replace
    tabs: [
      {
        name: 'History',
        selector: '[data-testid="tab-history"]', // TODO: replace
        contentSelector: '[data-testid="history-content"]', // TODO: replace
        screenshotFilename: '04-history.jpg',
      },
      {
        name: 'Special Tab',
        selector: '[data-testid="tab-special"]', // TODO: replace
        contentSelector: '[data-testid="special-tab-content"]', // TODO: scope text to actual content
        screenshotFilename: 'special-tab.jpg',
      },
    ],
  },
];
