import { useState } from 'react';
import {
  makeStyles,
  mergeClasses,
  Button,
  Text,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
} from '@fluentui/react-components';
import {
  Delete24Regular,
  ChevronLeft24Regular,
  Camera24Regular,
  Desktop24Regular,
  Laptop24Regular,
  Question24Regular,
} from '@fluentui/react-icons';
import { useScanStore } from '@/store/scanStore';
import { EligibilityBadge } from '@/components/EligibilityBadge';
import type { FieldRefreshRecord } from '@/types';
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    paddingTop: 'max(env(safe-area-inset-top), 16px)',
    background: encoreColors.primaryGradient,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backButton: {
    minWidth: '44px',
    height: '44px',
    padding: 0,
    color: encoreColors.white,
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.heading,
    color: encoreColors.white,
  },
  headerBadge: {
    marginLeft: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: encoreColors.white,
    padding: '4px 12px',
    borderRadius: encoreBorderRadius.full,
    fontSize: '14px',
    fontWeight: encoreTypography.fontWeight.medium,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    paddingBottom: '140px',
  },
  listContainer: {
    backgroundColor: encoreColors.white,
    borderRadius: encoreBorderRadius.lg,
    overflow: 'hidden',
    boxShadow: encoreShadows.card,
  },
  listItem: {
    display: 'flex',
    alignItems: 'flex-start',
    minHeight: '88px',
    padding: '16px',
    borderBottom: `1px solid ${encoreColors.borderGray}`,
    gap: '16px',
    ':last-child': {
      borderBottom: 'none',
    },
  },
  itemNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: encoreColors.primaryGradient,
    color: encoreColors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: encoreTypography.fontWeight.semibold,
    flexShrink: 0,
    marginTop: '4px',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  itemAssetTag: {
    fontSize: '16px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.body,
    color: encoreColors.charcoal,
  },
  itemDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  itemDetail: {
    fontSize: '13px',
    color: encoreColors.bodyGray,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  machineTypeIcon: {
    fontSize: '14px',
    color: encoreColors.primaryBlue,
  },
  itemActions: {
    display: 'flex',
    gap: '4px',
    flexShrink: 0,
    marginTop: '4px',
  },
  actionButton: {
    minWidth: '44px',
    height: '44px',
    padding: 0,
    borderRadius: encoreBorderRadius.md,
  },
  deleteButton: {
    color: encoreColors.error,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    textAlign: 'center',
    gap: '16px',
  },
  emptyIcon: {
    fontSize: '48px',
    color: encoreColors.bodyGray,
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.heading,
    color: encoreColors.charcoal,
  },
  emptyDescription: {
    fontSize: '14px',
    color: encoreColors.bodyGray,
    maxWidth: '260px',
    lineHeight: 1.5,
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
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
  },
  footerButtons: {
    display: 'flex',
    gap: '12px',
  },
  scanMoreButton: {
    flex: 1,
    height: '52px',
    fontSize: '15px',
    fontWeight: encoreTypography.fontWeight.medium,
    fontFamily: encoreTypography.fontFamily.body,
    borderRadius: encoreBorderRadius.full,
    backgroundColor: encoreColors.white,
    border: `1px solid ${encoreColors.borderGray}`,
    color: encoreColors.charcoal,
    ':hover': {
      border: `1px solid ${encoreColors.primaryBlue}`,
      color: encoreColors.primaryBlue,
    },
  },
  approveButton: {
    flex: 2,
    height: '52px',
    fontSize: '16px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.body,
    borderRadius: encoreBorderRadius.full,
    background: encoreColors.primaryGradient,
    border: 'none',
    boxShadow: '0 4px 14px rgba(0, 137, 209, 0.3)',
  },
  dialogActions: {
    paddingTop: '24px',
  },
  dialogButton: {
    minWidth: '100px',
    height: '44px',
    borderRadius: encoreBorderRadius.full,
    fontWeight: encoreTypography.fontWeight.medium,
  },
  dialogButtonPrimary: {
    minWidth: '100px',
    height: '44px',
    borderRadius: encoreBorderRadius.full,
    fontWeight: encoreTypography.fontWeight.medium,
    background: encoreColors.primaryGradient,
    border: 'none',
  },
});

const MachineTypeIcon = ({ type }: { type: FieldRefreshRecord['machineType'] }) => {
  const styles = useStyles();
  switch (type) {
    case 'desktop':
      return <Desktop24Regular className={styles.machineTypeIcon} />;
    case 'laptop':
      return <Laptop24Regular className={styles.machineTypeIcon} />;
    default:
      return <Question24Regular className={styles.machineTypeIcon} />;
  }
};

export function FieldRefreshReviewScreen() {
  const styles = useStyles();
  const {
    fieldRefreshSession,
    removeFieldRefreshRecord,
    setScreen,
  } = useScanStore();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleApprove = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false);
    setScreen('fieldRefreshSubmission');
  };

  const handleScanMore = () => {
    setScreen('fieldRefreshScan');
  };

  const handleBack = () => {
    setScreen('home');
  };

  const records = fieldRefreshSession?.records ?? [];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            className={styles.backButton}
            appearance="subtle"
            icon={<ChevronLeft24Regular />}
            onClick={handleBack}
          />
          <Text className={styles.headerTitle}>Review</Text>
          {records.length > 0 && (
            <span className={styles.headerBadge}>{records.length}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* List */}
        {records.length === 0 ? (
          <div className={styles.listContainer}>
            <div className={styles.emptyState}>
              <Camera24Regular className={styles.emptyIcon} />
              <Text className={styles.emptyTitle}>No machines scanned</Text>
              <Text className={styles.emptyDescription}>
                Tap "Scan More" to scan asset tags and add refresh candidates
              </Text>
            </div>
          </div>
        ) : (
          <div className={styles.listContainer}>
            {records.map((record, index) => (
              <div key={record.id} className={styles.listItem}>
                <div className={styles.itemNumber}>{index + 1}</div>

                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <Text className={styles.itemAssetTag}>{record.assetTag}</Text>
                    <EligibilityBadge status={record.eligibilityStatus} />
                  </div>
                  <div className={styles.itemDetails}>
                    <Text className={styles.itemDetail}>
                      S/N: {record.serialNumber}
                    </Text>
                    <Text className={styles.itemDetail}>
                      <MachineTypeIcon type={record.machineType} />
                      {record.machineType.charAt(0).toUpperCase() + record.machineType.slice(1)} - {record.department}
                    </Text>
                    <Text className={styles.itemDetail}>
                      {record.locationNotes}
                    </Text>
                    {(record.monitorAssetTag || record.monitorSerial) && (
                      <Text className={styles.itemDetail}>
                        Monitor: {record.monitorAssetTag || record.monitorSerial}
                      </Text>
                    )}
                  </div>
                </div>

                <div className={styles.itemActions}>
                  <Button
                    className={mergeClasses(styles.actionButton, styles.deleteButton)}
                    appearance="subtle"
                    icon={<Delete24Regular />}
                    onClick={() => removeFieldRefreshRecord(record.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerButtons}>
          <Button
            className={styles.scanMoreButton}
            appearance="secondary"
            icon={<Camera24Regular />}
            onClick={handleScanMore}
          >
            Scan More
          </Button>
          <Button
            className={styles.approveButton}
            appearance="primary"
            disabled={records.length === 0}
            onClick={handleApprove}
          >
            Submit ({records.length})
          </Button>
        </div>
      </div>

      {/* Confirm Submit Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={(_, data) => {
        if (!data.open) setShowConfirmDialog(false);
      }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogContent>
              <Text>
                You are about to add {records.length} machine{records.length !== 1 ? 's' : ''} to the Field Refresh TODO list in Excel.
                This action cannot be undone.
              </Text>
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button
                className={styles.dialogButton}
                appearance="secondary"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className={styles.dialogButtonPrimary}
                appearance="primary"
                onClick={handleConfirmSubmit}
              >
                Submit
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
