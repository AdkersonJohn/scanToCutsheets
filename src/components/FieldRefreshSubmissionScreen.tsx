import { useEffect, useState } from 'react';
import {
  makeStyles,
  Button,
  Text,
  ProgressBar,
  Badge,
  Spinner,
} from '@fluentui/react-components';
import {
  Checkmark24Regular,
  Dismiss24Regular,
  Home24Regular,
  CheckmarkCircle48Regular,
  ErrorCircle48Regular,
  WifiOff24Regular,
  ArrowClockwise24Regular,
} from '@fluentui/react-icons';
import { useScanStore } from '@/store/scanStore';
import { triggerHapticFeedback } from '@/services/scannerService';
import {
  submitFieldRefreshRecords,
  getConfiguredSiteId,
  getFieldRefreshTodoDriveId,
  getFieldRefreshTodoFileId,
  getFieldRefreshTodoTableName,
  isFieldRefreshTodoConfigured,
} from '@/services/sharePointService';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  encoreColors,
  encoreTypography,
  encoreBorderRadius,
  encoreShadows,
} from '@/theme';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#FAFAFA',
    fontFamily: encoreTypography.fontFamily.body,
  },
  header: {
    padding: '16px 20px',
    paddingTop: 'max(env(safe-area-inset-top), 16px)',
    background: encoreColors.primaryGradient,
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.heading,
    color: encoreColors.white,
  },
  progressSection: {
    padding: '32px 24px',
    backgroundColor: encoreColors.white,
    textAlign: 'center',
  },
  progressTitle: {
    fontSize: '18px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.heading,
    color: encoreColors.charcoal,
    marginBottom: '16px',
  },
  progressBarContainer: {
    maxWidth: '300px',
    margin: '0 auto',
    marginBottom: '16px',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    color: encoreColors.bodyGray,
  },
  completionCard: {
    margin: '16px',
    marginTop: '24px',
    padding: '32px',
    backgroundColor: encoreColors.white,
    borderRadius: encoreBorderRadius.xl,
    textAlign: 'center',
    boxShadow: encoreShadows.lg,
  },
  successIcon: {
    fontSize: '64px',
    color: encoreColors.success,
    marginBottom: '16px',
  },
  errorIcon: {
    fontSize: '64px',
    color: encoreColors.warning,
    marginBottom: '16px',
  },
  completionTitle: {
    fontSize: '24px',
    fontWeight: encoreTypography.fontWeight.bold,
    fontFamily: encoreTypography.fontFamily.heading,
    color: encoreColors.charcoal,
    marginBottom: '8px',
  },
  completionSubtitle: {
    fontSize: '15px',
    color: encoreColors.bodyGray,
    marginBottom: '24px',
    lineHeight: 1.5,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
  },
  successBadge: {
    backgroundColor: encoreColors.success,
    color: encoreColors.white,
    padding: '8px 16px',
    borderRadius: encoreBorderRadius.full,
    fontWeight: encoreTypography.fontWeight.medium,
    fontSize: '14px',
  },
  failedBadge: {
    backgroundColor: encoreColors.error,
    color: encoreColors.white,
    padding: '8px 16px',
    borderRadius: encoreBorderRadius.full,
    fontWeight: encoreTypography.fontWeight.medium,
    fontSize: '14px',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    paddingBottom: '100px',
  },
  listHeader: {
    fontSize: '13px',
    fontWeight: encoreTypography.fontWeight.semibold,
    color: encoreColors.bodyGray,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
    marginTop: '16px',
  },
  listContainer: {
    backgroundColor: encoreColors.white,
    borderRadius: encoreBorderRadius.lg,
    overflow: 'hidden',
    boxShadow: encoreShadows.card,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    minHeight: '56px',
    padding: '12px 16px',
    borderBottom: `1px solid ${encoreColors.borderGray}`,
    gap: '16px',
    ':last-child': {
      borderBottom: 'none',
    },
  },
  itemIcon: {
    flexShrink: 0,
  },
  itemIconSuccess: {
    color: encoreColors.success,
  },
  itemIconFailed: {
    color: encoreColors.error,
  },
  itemIconPending: {
    color: encoreColors.bodyGray,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemText: {
    fontSize: '15px',
    fontWeight: encoreTypography.fontWeight.medium,
    color: encoreColors.charcoal,
  },
  itemSubtext: {
    fontSize: '12px',
    color: encoreColors.bodyGray,
  },
  itemError: {
    fontSize: '13px',
    color: encoreColors.error,
    marginTop: '2px',
  },
  itemBadge: {
    flexShrink: 0,
  },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '16px',
    paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
    backgroundColor: encoreColors.white,
    borderTop: `1px solid ${encoreColors.borderGray}`,
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
  },
  homeButton: {
    width: '100%',
    height: '52px',
    fontSize: '16px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.body,
    borderRadius: encoreBorderRadius.full,
    background: encoreColors.primaryGradient,
    border: 'none',
    boxShadow: '0 4px 14px rgba(0, 137, 209, 0.3)',
  },
  homeButtonSecondary: {
    width: '100%',
    height: '52px',
    fontSize: '16px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.body,
    borderRadius: encoreBorderRadius.full,
    backgroundColor: encoreColors.white,
    border: `1px solid ${encoreColors.borderGray}`,
    color: encoreColors.charcoal,
  },
  offlineIcon: {
    fontSize: '64px',
    color: encoreColors.warning,
    marginBottom: '16px',
  },
  retryButton: {
    marginTop: '16px',
    borderRadius: encoreBorderRadius.full,
    fontWeight: encoreTypography.fontWeight.medium,
    background: encoreColors.primaryGradient,
    border: 'none',
  },
});

export function FieldRefreshSubmissionScreen() {
  const styles = useStyles();
  const {
    fieldRefreshSession,
    submissionProgress,
    setSubmitting,
    setSubmissionProgress,
    markFieldRefreshRecordSubmitted,
    markFieldRefreshRecordFailed,
    clearFieldRefreshSession,
    setScreen,
  } = useScanStore();

  const { isOnline } = useOnlineStatus();
  const [isComplete, setIsComplete] = useState(false);
  const [isOfflineBlocked, setIsOfflineBlocked] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const submitRecords = async () => {
      if (!fieldRefreshSession || isComplete) return;

      // Check if we're offline
      if (!navigator.onLine) {
        setIsOfflineBlocked(true);
        return;
      }

      setIsOfflineBlocked(false);
      setSubmitting(true);
      const records = fieldRefreshSession.records.filter((r) => r.status === 'pending');

      // Check if Field Refresh TODO list is configured
      const siteId = getConfiguredSiteId();
      const driveId = getFieldRefreshTodoDriveId();
      const fileId = getFieldRefreshTodoFileId();
      const tableName = getFieldRefreshTodoTableName();

      if (!isFieldRefreshTodoConfigured() || !siteId || !driveId || !fileId || !tableName) {
        // Demo mode: simulate submission when not configured
        console.warn('Field Refresh TODO list not configured. Running in demo mode.');

        for (let i = 0; i < records.length; i++) {
          const record = records[i];

          // Simulate API delay
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Demo mode: 100% success rate
          console.log(`[DEMO] Would add to Excel: ${record.assetTag} / ${record.serialNumber} / ${record.department}`);
          markFieldRefreshRecordSubmitted(record.id);
          setSubmissionProgress(((i + 1) / records.length) * 100);
        }
      } else {
        // Real Excel submission
        try {
          await submitFieldRefreshRecords(
            siteId,
            driveId,
            fileId,
            tableName,
            records,
            fieldRefreshSession.userName,
            (progress) => {
              if (progress.success) {
                markFieldRefreshRecordSubmitted(progress.recordId);
              } else {
                markFieldRefreshRecordFailed(progress.recordId, progress.error || 'Unknown error');
              }
              setSubmissionProgress((progress.completed / progress.total) * 100);
            }
          );
        } catch (error) {
          // Handle network errors
          if (!navigator.onLine) {
            setIsOfflineBlocked(true);
            setSubmitting(false);
            return;
          }
          // Mark remaining pending records as failed
          records.forEach((record) => {
            if (record.status === 'pending') {
              markFieldRefreshRecordFailed(record.id, error instanceof Error ? error.message : 'Network error');
            }
          });
        }
      }

      setSubmitting(false);
      setIsComplete(true);
      triggerHapticFeedback();
    };

    submitRecords();
  }, [
    fieldRefreshSession,
    isComplete,
    retryCount,
    setSubmitting,
    setSubmissionProgress,
    markFieldRefreshRecordSubmitted,
    markFieldRefreshRecordFailed,
  ]);

  const handleRetry = () => {
    if (navigator.onLine) {
      setIsOfflineBlocked(false);
      setRetryCount((c) => c + 1);
    }
  };

  const handleGoHome = () => {
    clearFieldRefreshSession();
    setScreen('home');
  };

  const records = fieldRefreshSession?.records ?? [];
  const successCount = records.filter((r) => r.status === 'submitted').length;
  const failedCount = records.filter((r) => r.status === 'failed').length;
  const allSuccess = failedCount === 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Text className={styles.headerTitle}>
          {isOfflineBlocked ? 'Offline' : isComplete ? 'Complete' : 'Submitting...'}
        </Text>
      </div>

      {/* Offline Blocked State */}
      {isOfflineBlocked && (
        <div className={styles.completionCard}>
          <WifiOff24Regular className={styles.offlineIcon} />
          <Text className={styles.completionTitle}>You're Offline</Text>
          <Text className={styles.completionSubtitle}>
            Your scanned items are saved locally. Connect to the internet to submit them to the TODO list.
          </Text>
          {isOnline && (
            <Button
              className={styles.retryButton}
              appearance="primary"
              icon={<ArrowClockwise24Regular />}
              onClick={handleRetry}
            >
              Retry Submission
            </Button>
          )}
        </div>
      )}

      {/* Progress Section (while submitting) */}
      {!isComplete && !isOfflineBlocked && (
        <div className={styles.progressSection}>
          <Text className={styles.progressTitle}>
            Adding to TODO list...
          </Text>
          <div className={styles.progressBarContainer}>
            <ProgressBar value={submissionProgress / 100} thickness="large" />
          </div>
          <div className={styles.progressInfo}>
            <Text>{Math.round(submissionProgress)}%</Text>
            <Text>{successCount + failedCount} of {records.length}</Text>
          </div>
        </div>
      )}

      {/* Completion Card */}
      {isComplete && !isOfflineBlocked && (
        <div className={styles.completionCard}>
          {allSuccess ? (
            <CheckmarkCircle48Regular className={styles.successIcon} />
          ) : (
            <ErrorCircle48Regular className={styles.errorIcon} />
          )}
          <Text className={styles.completionTitle}>
            {allSuccess ? 'All Done!' : 'Completed with Errors'}
          </Text>
          <Text className={styles.completionSubtitle}>
            {allSuccess
              ? `${successCount} machines added to TODO list`
              : `${successCount} succeeded, ${failedCount} failed`}
          </Text>
          <div className={styles.statsRow}>
            <span className={styles.successBadge}>
              {successCount} Added
            </span>
            {failedCount > 0 && (
              <span className={styles.failedBadge}>
                {failedCount} Failed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Items List */}
      <div className={styles.content}>
        <Text className={styles.listHeader}>Machines</Text>
        <div className={styles.listContainer}>
          {records.map((record) => (
            <div key={record.id} className={styles.listItem}>
              <div className={styles.itemIcon}>
                {record.status === 'submitted' && (
                  <Checkmark24Regular className={styles.itemIconSuccess} />
                )}
                {record.status === 'failed' && (
                  <Dismiss24Regular className={styles.itemIconFailed} />
                )}
                {record.status === 'pending' && (
                  <Spinner size="tiny" className={styles.itemIconPending} />
                )}
              </div>
              <div className={styles.itemContent}>
                <Text className={styles.itemText}>{record.assetTag}</Text>
                <Text className={styles.itemSubtext}>
                  {record.serialNumber} - {record.department}
                </Text>
                {record.errorMessage && (
                  <Text className={styles.itemError}>{record.errorMessage}</Text>
                )}
              </div>
              <Badge
                className={styles.itemBadge}
                appearance="outline"
                size="small"
                color={
                  record.status === 'submitted'
                    ? 'success'
                    : record.status === 'failed'
                    ? 'danger'
                    : 'informative'
                }
              >
                {record.status === 'submitted' ? 'done' : record.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      {isComplete && (
        <div className={styles.footer}>
          <Button
            className={styles.homeButton}
            appearance="primary"
            icon={<Home24Regular />}
            onClick={handleGoHome}
          >
            Done
          </Button>
        </div>
      )}

      {/* Footer when offline - allow going back to review */}
      {isOfflineBlocked && (
        <div className={styles.footer}>
          <Button
            className={styles.homeButtonSecondary}
            appearance="secondary"
            onClick={() => setScreen('fieldRefreshReview')}
          >
            Back to Review
          </Button>
        </div>
      )}
    </div>
  );
}
