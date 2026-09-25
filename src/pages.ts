import type { SectionDefinition } from './types/index.js';

/**
 * Configure the pages and tabs to visit here. Selectors are intentional TODOs;
 * update them to match the target website after its HTML is available.
 */
export const sections: SectionDefinition[] = [
  {
    name: 'Passport record',
    navigationSelector: '#passport-record',
    readySelector: '#passport-record-content',
    tabs: [
      {
        name: 'Passport details',
        selector: '#passport-details-tab',
        contentSelector: '#passport-record-content',
        screenshotFilename: 'passport-details.jpg',
        extractText: true,
      },
      {
        name: 'Observations',
        selector: '#observations-tab',
        contentSelector: '#passport-record-content',
        screenshotFilename: 'observations.jpg',
      },
      {
        name: 'Passport notes',
        selector: '#passport-notes-tab',
        contentSelector: '#passport-record-content',
        screenshotFilename: 'passport-notes.jpg',
       
      },
      {
        name: 'Child additions',
        selector: '#child-additions-tab',
        contentSelector: '#passport-record-content',
        screenshotFilename: 'child-additions.jpg',
      },
      {
        name: 'Passport status',
        selector: '#status-history-tab',
        contentSelector: '#passport-record-content',
        screenshotFilename: 'passport-status.jpg',
      },
    ],
  },
  {
    name: 'Application record',
    navigationSelector: '#application-record',
    readySelector: '#application-record-content',
    tabs: [
      {
        name: 'Application details',
        selector: '#application-details-tab',
        contentSelector: '#application-record-content',
        screenshotFilename: 'application-details.jpg',
      },
      {
        name: 'Addresses',
        selector: '#addresses-tab',
        contentSelector: '#application-record-content',
        screenshotFilename: 'addresses.jpg',
      },
      {
        name: 'Progress history',
        selector: '#progress-history-tab',
        contentSelector: '#application-record-content',
        screenshotFilename: 'progress-history.jpg',
      },
      {
        name: 'Case notes',
        selector: '#case-notes-tab',
        contentSelector: '#application-record-content',
        screenshotFilename: 'case-notes.jpg',
        ignoreScreenshot: true,
        extractText: true,
      },
      {
        name: 'Supporting documents',
        selector: '#supporting-documents-tab',
        contentSelector: '#application-record-content',
        screenshotFilename: 'supporting-documents.jpg',
      },
      {
        name: 'Interview (AbI)',
        selector: '#Abi-tab',
        contentSelector: '#application-record-content',
        screenshotFilename: 'interview-abi.jpg',
      },
      {
        name: 'Parents details',
        selector: '#parents-details-tab',
        contentSelector: '#application-record-content',
        screenshotFilename: 'parents-details.jpg',
      },
      {
        name: 'Grandparents details',
        selector: '#grandparents-details-tab',
        contentSelector: '#application-record-content',
        screenshotFilename: 'grandparents-details.jpg',
      },
      {
        name: 'Referee details',
        selector: '#referee-details-tab',
        contentSelector: '#application-record-content',
        screenshotFilename: 'referee-details.jpg',
      },
      {
        name: 'View images',
        selector: '#app-view-images-tab',
        contentSelector: '#application-record-content',
        screenshotFilename: 'view-images.jpg',
      },
    ],
  },
   
];
