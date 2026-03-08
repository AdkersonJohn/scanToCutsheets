import { Client } from '@microsoft/microsoft-graph-client';
import { getAccessToken } from './authService';
import type { ScanRecord, FieldRefreshRecord } from '@/types';

let graphClient: Client | null = null;

export interface SharePointSite {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

export interface SharePointList {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

export interface CutSheetFields {
  Title: string;
  NewSystemAssetTag: string;
  SerialNumber: string;
  Installer: string;
}

export interface SubmissionProgress {
  completed: number;
  total: number;
  recordId: string;
  success: boolean;
  error?: string;
}

async function getClient(): Promise<Client> {
  if (graphClient) {
    return graphClient;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Failed to get access token. Please sign in again.');
  }

  graphClient = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });

  return graphClient;
}

export function resetClient(): void {
  graphClient = null;
}

export async function searchSharePointSites(query?: string): Promise<SharePointSite[]> {
  const client = await getClient();

  try {
    const searchQuery = query ? `?search=${encodeURIComponent(query)}` : '';
    const response = await client.api(`/sites${searchQuery}`).get();

    return (response.value || []).map((site: { id: string; name: string; displayName: string; webUrl: string }) => ({
      id: site.id,
      name: site.name,
      displayName: site.displayName,
      webUrl: site.webUrl,
    }));
  } catch (error) {
    console.error('Failed to search SharePoint sites:', error);
    throw new Error('Failed to search SharePoint sites. Check your permissions.');
  }
}

export async function getSiteByUrl(siteUrl: string): Promise<SharePointSite | null> {
  const client = await getClient();

  try {
    // Extract hostname and path from URL
    const url = new URL(siteUrl);
    const hostname = url.hostname;
    const sitePath = url.pathname;

    const response = await client.api(`/sites/${hostname}:${sitePath}`).get();

    return {
      id: response.id,
      name: response.name,
      displayName: response.displayName,
      webUrl: response.webUrl,
    };
  } catch (error) {
    console.error('Failed to get site by URL:', error);
    return null;
  }
}

export async function getListsInSite(siteId: string): Promise<SharePointList[]> {
  const client = await getClient();

  try {
    const response = await client.api(`/sites/${siteId}/lists`).get();

    return (response.value || [])
      .filter((list: { list?: { template: string } }) => list.list?.template === 'genericList')
      .map((list: { id: string; name: string; displayName: string; webUrl: string }) => ({
        id: list.id,
        name: list.name,
        displayName: list.displayName,
        webUrl: list.webUrl,
      }));
  } catch (error) {
    console.error('Failed to get lists in site:', error);
    throw new Error('Failed to get SharePoint lists. Check your permissions.');
  }
}

export async function getListByName(siteId: string, listName: string): Promise<SharePointList | null> {
  const client = await getClient();

  try {
    const response = await client.api(`/sites/${siteId}/lists/${encodeURIComponent(listName)}`).get();

    return {
      id: response.id,
      name: response.name,
      displayName: response.displayName,
      webUrl: response.webUrl,
    };
  } catch (error) {
    console.error(`Failed to get list "${listName}":`, error);
    return null;
  }
}

export async function createCutSheetItem(
  siteId: string,
  listId: string,
  record: ScanRecord,
  installerName: string
): Promise<void> {
  const client = await getClient();

  const fields: CutSheetFields = {
    Title: record.assetTag,
    NewSystemAssetTag: record.assetTag,
    SerialNumber: record.serialNumber,
    Installer: installerName,
  };

  await client.api(`/sites/${siteId}/lists/${listId}/items`).post({ fields });
}

export async function submitCutSheets(
  siteId: string,
  listId: string,
  records: ScanRecord[],
  installerName: string,
  onProgress: (progress: SubmissionProgress) => void
): Promise<{ successCount: number; failedCount: number }> {
  const total = records.length;
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    try {
      await createCutSheetItem(siteId, listId, record, installerName);
      successCount++;
      onProgress({
        completed: i + 1,
        total,
        recordId: record.id,
        success: true,
      });
    } catch (error) {
      failedCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress({
        completed: i + 1,
        total,
        recordId: record.id,
        success: false,
        error: errorMessage,
      });
    }
  }

  return { successCount, failedCount };
}

export function getConfiguredSiteId(): string | null {
  const siteId = import.meta.env.VITE_SHAREPOINT_SITE_ID;
  return siteId && siteId.trim() !== '' ? siteId : null;
}

export function getConfiguredListId(): string | null {
  const listId = import.meta.env.VITE_SHAREPOINT_LIST_ID;
  return listId && listId.trim() !== '' ? listId : null;
}

export function isSharePointConfigured(): boolean {
  return getConfiguredSiteId() !== null && getConfiguredListId() !== null;
}

// Field Refresh Check functions

export interface ExistingCutSheetResult {
  exists: boolean;
  cutSheetId?: string;
}

export async function checkExistingCutSheet(
  siteId: string,
  listId: string,
  assetTag: string
): Promise<ExistingCutSheetResult> {
  const client = await getClient();

  try {
    const response = await client
      .api(`/sites/${siteId}/lists/${listId}/items`)
      .filter(`fields/NewSystemAssetTag eq '${assetTag}'`)
      .top(1)
      .select('id')
      .get();

    const items = response.value || [];
    if (items.length > 0) {
      return { exists: true, cutSheetId: items[0].id };
    }
    return { exists: false };
  } catch (error) {
    console.error('Failed to check existing cut sheet:', error);
    throw new Error('Failed to check for existing cut sheet. Check your permissions.');
  }
}

export interface FieldRefreshSubmissionProgress {
  completed: number;
  total: number;
  recordId: string;
  success: boolean;
  error?: string;
}

export async function addToFieldRefreshTodoList(
  siteId: string,
  driveId: string,
  fileId: string,
  tableName: string,
  record: FieldRefreshRecord,
  userName: string
): Promise<void> {
  const client = await getClient();

  try {
    await client
      .api(`/sites/${siteId}/drives/${driveId}/items/${fileId}/workbook/tables/${tableName}/rows`)
      .post({
        values: [[
          record.assetTag,
          record.serialNumber,
          record.department,
          record.locationNotes,
          record.machineType,
          record.monitorAssetTag || '',
          record.monitorSerial || '',
          userName,
          new Date().toISOString(),
        ]],
      });
  } catch (error) {
    console.error('Failed to add to Field Refresh TODO list:', error);
    throw new Error('Failed to add record to Excel. Check your permissions.');
  }
}

export async function submitFieldRefreshRecords(
  siteId: string,
  driveId: string,
  fileId: string,
  tableName: string,
  records: FieldRefreshRecord[],
  userName: string,
  onProgress: (progress: FieldRefreshSubmissionProgress) => void
): Promise<{ successCount: number; failedCount: number }> {
  const total = records.length;
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    try {
      await addToFieldRefreshTodoList(siteId, driveId, fileId, tableName, record, userName);
      successCount++;
      onProgress({
        completed: i + 1,
        total,
        recordId: record.id,
        success: true,
      });
    } catch (error) {
      failedCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress({
        completed: i + 1,
        total,
        recordId: record.id,
        success: false,
        error: errorMessage,
      });
    }
  }

  return { successCount, failedCount };
}

// Field Refresh TODO list configuration
export function getFieldRefreshTodoDriveId(): string | null {
  const driveId = import.meta.env.VITE_SHAREPOINT_TODO_DRIVE_ID;
  return driveId && driveId.trim() !== '' ? driveId : null;
}

export function getFieldRefreshTodoFileId(): string | null {
  const fileId = import.meta.env.VITE_SHAREPOINT_TODO_FILE_ID;
  return fileId && fileId.trim() !== '' ? fileId : null;
}

export function getFieldRefreshTodoTableName(): string | null {
  const tableName = import.meta.env.VITE_SHAREPOINT_TODO_TABLE_NAME;
  return tableName && tableName.trim() !== '' ? tableName : null;
}

export function isFieldRefreshTodoConfigured(): boolean {
  return (
    getConfiguredSiteId() !== null &&
    getFieldRefreshTodoDriveId() !== null &&
    getFieldRefreshTodoFileId() !== null &&
    getFieldRefreshTodoTableName() !== null
  );
}
