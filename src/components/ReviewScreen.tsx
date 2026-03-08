import { useState } from 'react';
import {
  makeStyles,
  mergeClasses,
  Button,
  Text,
  Input,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Label,
} from '@fluentui/react-components';
import {
  Delete24Regular,
  Edit24Regular,
  Add24Regular,
  Checkmark24Regular,
  Dismiss24Regular,
  ChevronLeft24Regular,
  Camera24Regular,
} from '@fluentui/react-icons';
import { useScanStore } from '@/store/scanStore';
import { validateAssetTag, validateSerialNumber, formatAssetTag } from '@/types';
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
  addButton: {
    width: '100%',
    height: '52px',
    marginBottom: '16px',
    fontSize: '15px',
    fontWeight: encoreTypography.fontWeight.medium,
    fontFamily: encoreTypography.fontFamily.body,
    backgroundColor: encoreColors.white,
    border: `2px dashed ${encoreColors.borderGray}`,
    borderRadius: encoreBorderRadius.lg,
    justifyContent: 'center',
    color: encoreColors.bodyGray,
    transition: 'all 200ms ease',
    ':hover': {
      border: `2px dashed ${encoreColors.primaryBlue}`,
      color: encoreColors.primaryBlue,
    },
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
    minHeight: '72px',
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
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  itemAssetTag: {
    fontSize: '16px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.body,
    color: encoreColors.charcoal,
  },
  itemSerialNumber: {
    fontSize: '14px',
    color: encoreColors.bodyGray,
  },
  itemActions: {
    display: 'flex',
    gap: '4px',
    flexShrink: 0,
  },
  actionButton: {
    minWidth: '44px',
    height: '44px',
    padding: 0,
    borderRadius: encoreBorderRadius.md,
  },
  editButton: {
    color: encoreColors.primaryBlue,
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
  dialogInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '16px',
  },
  dialogLabel: {
    fontWeight: encoreTypography.fontWeight.medium,
    fontFamily: encoreTypography.fontFamily.body,
    color: encoreColors.charcoal,
  },
  dialogInput: {
    width: '100%',
    borderRadius: encoreBorderRadius.md,
  },
  dialogError: {
    color: encoreColors.error,
    fontSize: '12px',
    marginTop: '4px',
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

export function ReviewScreen() {
  const styles = useStyles();
  const { session, updateScan, removeScan, addManualEntry, setScreen, setIsScanning } = useScanStore();

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAssetTag, setEditAssetTag] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAssetTag, setNewAssetTag] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const handleStartEdit = (id: string, assetTag: string, serialNumber: string) => {
    setEditingId(id);
    setEditAssetTag(assetTag);
    setEditSerialNumber(serialNumber);
    setEditError(null);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setEditError(null);

    const formattedAssetTag = formatAssetTag(editAssetTag);
    const formattedSerialNumber = editSerialNumber.toUpperCase();

    if (!validateAssetTag(formattedAssetTag)) {
      setEditError('Invalid Asset Tag format. Expected: EW##-#####');
      return;
    }
    if (!validateSerialNumber(formattedSerialNumber)) {
      setEditError('Invalid Serial Number format. Expected: 7 alphanumeric characters');
      return;
    }

    // Check for duplicates (excluding current record)
    const isDuplicateAssetTag = session?.records.some(
      (r) => r.id !== editingId && r.assetTag === formattedAssetTag
    );
    const isDuplicateSerial = session?.records.some(
      (r) => r.id !== editingId && r.serialNumber === formattedSerialNumber
    );

    if (isDuplicateAssetTag) {
      setEditError(`Asset Tag "${formattedAssetTag}" already exists`);
      return;
    }
    if (isDuplicateSerial) {
      setEditError(`Serial Number "${formattedSerialNumber}" already exists`);
      return;
    }

    updateScan(editingId, 'assetTag', formattedAssetTag);
    updateScan(editingId, 'serialNumber', formattedSerialNumber);

    setEditingId(null);
    setEditAssetTag('');
    setEditSerialNumber('');
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAssetTag('');
    setEditSerialNumber('');
    setEditError(null);
  };

  const handleAddEntry = () => {
    setAddError(null);

    const formattedAssetTag = formatAssetTag(newAssetTag);
    const formattedSerialNumber = newSerialNumber.toUpperCase();

    if (!validateAssetTag(formattedAssetTag)) {
      setAddError('Invalid Asset Tag format. Expected: EW##-#####');
      return;
    }
    if (!validateSerialNumber(formattedSerialNumber)) {
      setAddError('Invalid Serial Number format. Expected: 7 alphanumeric characters');
      return;
    }

    // Check for duplicates
    const isDuplicateAssetTag = session?.records.some(r => r.assetTag === formattedAssetTag);
    const isDuplicateSerial = session?.records.some(r => r.serialNumber === formattedSerialNumber);

    if (isDuplicateAssetTag) {
      setAddError(`Asset Tag "${formattedAssetTag}" already exists`);
      return;
    }
    if (isDuplicateSerial) {
      setAddError(`Serial Number "${formattedSerialNumber}" already exists`);
      return;
    }

    addManualEntry(formattedAssetTag, formattedSerialNumber);
    setNewAssetTag('');
    setNewSerialNumber('');
    setShowAddDialog(false);
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setNewAssetTag('');
    setNewSerialNumber('');
    setAddError(null);
  };

  const handleApprove = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false);
    setScreen('submission');
  };

  const handleScanMore = () => {
    setIsScanning(true);
    setScreen('scanning');
  };

  const handleBack = () => {
    setScreen('home');
  };

  const records = session?.records ?? [];

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
        {/* Add Manual Entry Button */}
        <Button
          className={styles.addButton}
          appearance="subtle"
          icon={<Add24Regular />}
          onClick={() => setShowAddDialog(true)}
        >
          Add Manual Entry
        </Button>

        {/* List */}
        {records.length === 0 ? (
          <div className={styles.listContainer}>
            <div className={styles.emptyState}>
              <Camera24Regular className={styles.emptyIcon} />
              <Text className={styles.emptyTitle}>No items scanned</Text>
              <Text className={styles.emptyDescription}>
                Tap "Scan More" to scan barcodes or add entries manually above
              </Text>
            </div>
          </div>
        ) : (
          <div className={styles.listContainer}>
            {records.map((record, index) => (
              <div key={record.id} className={styles.listItem}>
                <div className={styles.itemNumber}>{index + 1}</div>

                {editingId === record.id ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Input
                      value={editAssetTag}
                      onChange={(_, data) => {
                        setEditAssetTag(data.value);
                        setEditError(null);
                      }}
                      placeholder="Asset Tag (EW##-#####)"
                      autoFocus
                    />
                    <Input
                      value={editSerialNumber}
                      onChange={(_, data) => {
                        setEditSerialNumber(data.value);
                        setEditError(null);
                      }}
                      placeholder="Serial Number"
                    />
                    {editError && (
                      <Text className={styles.dialogError}>{editError}</Text>
                    )}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Button
                        appearance="subtle"
                        icon={<Checkmark24Regular />}
                        onClick={handleSaveEdit}
                      />
                      <Button
                        appearance="subtle"
                        icon={<Dismiss24Regular />}
                        onClick={handleCancelEdit}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.itemContent}>
                      <Text className={styles.itemAssetTag}>{record.assetTag}</Text>
                      <Text className={styles.itemSerialNumber}>{record.serialNumber}</Text>
                    </div>
                    <div className={styles.itemActions}>
                      <Button
                        className={mergeClasses(styles.actionButton, styles.editButton)}
                        appearance="subtle"
                        icon={<Edit24Regular />}
                        onClick={() => handleStartEdit(record.id, record.assetTag, record.serialNumber)}
                      />
                      <Button
                        className={mergeClasses(styles.actionButton, styles.deleteButton)}
                        appearance="subtle"
                        icon={<Delete24Regular />}
                        onClick={() => removeScan(record.id)}
                      />
                    </div>
                  </>
                )}
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

      {/* Add Manual Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(_, data) => {
        if (!data.open) handleCloseAddDialog();
      }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Add Manual Entry</DialogTitle>
            <DialogContent>
              <div className={styles.dialogInputGroup}>
                <Label className={styles.dialogLabel} htmlFor="assetTag">Asset Tag</Label>
                <Input
                  id="assetTag"
                  className={styles.dialogInput}
                  value={newAssetTag}
                  onChange={(_, data) => setNewAssetTag(data.value)}
                  placeholder="EW##-#####"
                  autoFocus
                />
              </div>
              <div className={styles.dialogInputGroup}>
                <Label className={styles.dialogLabel} htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  className={styles.dialogInput}
                  value={newSerialNumber}
                  onChange={(_, data) => setNewSerialNumber(data.value)}
                  placeholder="7 characters"
                />
              </div>
              {addError && (
                <Text className={styles.dialogError}>{addError}</Text>
              )}
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button
                className={styles.dialogButton}
                appearance="secondary"
                onClick={handleCloseAddDialog}
              >
                Cancel
              </Button>
              <Button
                className={styles.dialogButtonPrimary}
                appearance="primary"
                onClick={handleAddEntry}
                disabled={!newAssetTag.trim() || !newSerialNumber.trim()}
              >
                Add
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Confirm Submit Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={(_, data) => {
        if (!data.open) setShowConfirmDialog(false);
      }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogContent>
              <Text>
                You are about to create {records.length} cut sheet{records.length !== 1 ? 's' : ''} in SharePoint.
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
