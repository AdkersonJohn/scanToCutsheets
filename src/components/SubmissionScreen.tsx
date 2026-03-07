import { useEffect, useState } from 'react';
import {
  makeStyles,
  tokens,
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
  submitCutSheets,
  getConfiguredSiteId,
  getConfiguredListId,
  isSharePointConfigured,
} from '@/services/sharePointService';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    padding: tokens.spacingHorizontalM,
    paddingTop: 'max(env(safe-area-inset-top), 16px)',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  progressSection: {
    padding: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalXL,
    backgroundColor: tokens.colorNeutralBackground1,
    textAlign: 'center',
  },
  progressTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    marginBottom: tokens.spacingVerticalM,
  },
  progressBarContainer: {
    maxWidth: '300px',
    margin: '0 auto',
    marginBottom: tokens.spacingVerticalM,
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground2,
  },
  completionCard: {
    margin: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalXL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    textAlign: 'center',
    boxShadow: tokens.shadow4,
  },
  successIcon: {
    fontSize: '64px',
    color: tokens.colorStatusSuccessForeground1,
    marginBottom: tokens.spacingVerticalM,
  },
  errorIcon: {
    fontSize: '64px',
    color: tokens.colorStatusWarningForeground1,
    marginBottom: tokens.spacingVerticalM,
  },
  completionTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    marginBottom: tokens.spacingVerticalS,
  },
  completionSubtitle: {
    fontSize: '15px',
    color: tokens.colorNeutralForeground2,
    marginBottom: tokens.spacingVerticalL,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalL,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: tokens.spacingHorizontalM,
    paddingBottom: '100px',
  },
  listHeader: {
    fontSize: '14px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
  },
  listContainer: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    overflow: 'hidden',
    boxShadow: tokens.shadow4,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    minHeight: '56px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    gap: tokens.spacingHorizontalM,
    ':last-child': {
      borderBottom: 'none',
    },
  },
  itemIcon: {
    flexShrink: 0,
  },
  itemIconSuccess: {
    color: tokens.colorStatusSuccessForeground1,
  },
  itemIconFailed: {
    color: tokens.colorStatusDangerForeground1,
  },
  itemIconPending: {
    color: tokens.colorNeutralForeground3,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemText: {
    fontSize: '15px',
    fontWeight: 500,
    color: tokens.colorNeutralForeground1,
  },
  itemError: {
    fontSize: '13px',
    color: tokens.colorStatusDangerForeground1,
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
    padding: tokens.spacingHorizontalM,
    paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  homeButton: {
    width: '100%',
    height: '52px',
    fontSize: '16px',
    fontWeight: 600,
  },
  spinnerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalL,
  },
  offlineIcon: {
    fontSize: '64px',
    color: tokens.colorStatusWarningForeground1,
    marginBottom: tokens.spacingVerticalM,
  },
  retryButton: {
    marginTop: tokens.spacingVerticalM,
  },
});

export function SubmissionScreen() {
  const styles = useStyles();
  const {
    session,
    submissionProgress,
    setSubmitting,
    setSubmissionProgress,
    markRecordSubmitted,
    markRecordFailed,
    clearSession,
    setScreen,
  } = useScanStore();

  const { isOnline } = useOnlineStatus();
  const [isComplete, setIsComplete] = useState(false);
  const [isOfflineBlocked, setIsOfflineBlocked] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const submitRecords = async () => {
      if (!session || isComplete) return;

      // Check if we're offline
      if (!navigator.onLine) {
        setIsOfflineBlocked(true);
        return;
      }

      setIsOfflineBlocked(false);
      setSubmitting(true);
      const records = session.records.filter((r) => r.status === 'pending');

      // Check if SharePoint is configured
      const siteId = getConfiguredSiteId();
      const listId = getConfiguredListId();

      if (!isSharePointConfigured() || !siteId || !listId) {
        // Demo mode: simulate submission when SharePoint is not configured
        console.warn('SharePoint not configured. Running in demo mode.');

        for (let i = 0; i < records.length; i++) {
          const record = records[i];

          // Simulate API delay
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Demo mode: 100% success rate
          console.log(`[DEMO] Would create cut sheet for: ${record.assetTag} / ${record.serialNumber}`);
          markRecordSubmitted(record.id);
          setSubmissionProgress(((i + 1) / records.length) * 100);
        }
      } else {
        // Real SharePoint submission
        try {
          await submitCutSheets(
            siteId,
            listId,
            records,
            session.userName,
            (progress) => {
              if (progress.success) {
                markRecordSubmitted(progress.recordId);
              } else {
                markRecordFailed(progress.recordId, progress.error || 'Unknown error');
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
              markRecordFailed(record.id, error instanceof Error ? error.message : 'Network error');
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
    session,
    isComplete,
    retryCount,
    setSubmitting,
    setSubmissionProgress,
    markRecordSubmitted,
    markRecordFailed,
  ]);

  const handleRetry = () => {
    if (navigator.onLine) {
      setIsOfflineBlocked(false);
      setRetryCount((c) => c + 1);
    }
  };

  const handleGoHome = () => {
    clearSession();
    setScreen('home');
  };

  const records = session?.records ?? [];
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
            Your scanned items are saved locally. Connect to the internet to submit them to SharePoint.
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
            Creating cut sheets...
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
              ? `${successCount} cut sheets created successfully`
              : `${successCount} succeeded, ${failedCount} failed`}
          </Text>
          <div className={styles.statsRow}>
            <Badge appearance="filled" color="success" size="large">
              {successCount} Created
            </Badge>
            {failedCount > 0 && (
              <Badge appearance="filled" color="danger" size="large">
                {failedCount} Failed
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Items List */}
      <div className={styles.content}>
        <Text className={styles.listHeader}>Items</Text>
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
            className={styles.homeButton}
            appearance="secondary"
            onClick={() => setScreen('review')}
          >
            Back to Review
          </Button>
        </div>
      )}
    </div>
  );
}
