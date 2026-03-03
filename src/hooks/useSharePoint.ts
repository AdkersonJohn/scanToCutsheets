import { useState, useCallback } from 'react';
import { batchCreateCutSheetItems } from '@/services/graphClient';
import type { ScanRecord, SubmissionResult } from '@/types';

interface UseSharePointOptions {
  siteId: string;
  listId: string;
  installerName: string;
}

interface UseSharePointReturn {
  isSubmitting: boolean;
  progress: number;
  results: SubmissionResult[];
  submitRecords: (records: ScanRecord[]) => Promise<SubmissionResult[]>;
}

export function useSharePoint(options: UseSharePointOptions): UseSharePointReturn {
  const { siteId, listId, installerName } = options;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SubmissionResult[]>([]);

  const submitRecords = useCallback(
    async (records: ScanRecord[]): Promise<SubmissionResult[]> => {
      setIsSubmitting(true);
      setProgress(0);
      setResults([]);

      const submissionResults: SubmissionResult[] = [];

      await batchCreateCutSheetItems(
        siteId,
        listId,
        records,
        installerName,
        (completed, total, recordId, success, error) => {
          const result: SubmissionResult = {
            recordId,
            success,
            error,
          };
          submissionResults.push(result);
          setResults((prev) => [...prev, result]);
          setProgress((completed / total) * 100);
        }
      );

      setIsSubmitting(false);
      return submissionResults;
    },
    [siteId, listId, installerName]
  );

  return {
    isSubmitting,
    progress,
    results,
    submitRecords,
  };
}
