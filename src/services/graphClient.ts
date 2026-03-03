import { Client } from '@microsoft/microsoft-graph-client';
import type { ScanRecord } from '@/types';

let graphClient: Client | null = null;

export function initializeGraphClient(accessToken: string): Client {
  graphClient = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
  return graphClient;
}

export function getGraphClient(): Client {
  if (!graphClient) {
    throw new Error('Graph client not initialized. Call initializeGraphClient first.');
  }
  return graphClient;
}

export interface CutSheetItem {
  fields: {
    Title: string;
    NewSystemAssetTag: string;
    Installer: string;
  };
}

export async function createCutSheetItem(
  siteId: string,
  listId: string,
  record: ScanRecord,
  installerName: string
): Promise<void> {
  const client = getGraphClient();

  const item: CutSheetItem = {
    fields: {
      Title: record.assetTag,
      NewSystemAssetTag: record.assetTag,
      Installer: installerName,
    },
  };

  await client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .post(item);
}

export async function batchCreateCutSheetItems(
  siteId: string,
  listId: string,
  records: ScanRecord[],
  installerName: string,
  onProgress: (completed: number, total: number, recordId: string, success: boolean, error?: string) => void
): Promise<void> {
  const total = records.length;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    try {
      await createCutSheetItem(siteId, listId, record, installerName);
      onProgress(i + 1, total, record.id, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress(i + 1, total, record.id, false, errorMessage);
    }
  }
}
