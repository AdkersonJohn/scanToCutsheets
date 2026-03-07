import { useState } from 'react';
import {
  makeStyles,
  mergeClasses,
  tokens,
  Button,
  Text,
  Input,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Badge,
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

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingHorizontalM,
    paddingTop: 'max(env(safe-area-inset-top), 12px)',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  backButton: {
    minWidth: '44px',
    height: '44px',
    padding: 0,
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  headerBadge: {
    marginLeft: tokens.spacingHorizontalS,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: tokens.spacingHorizontalM,
    paddingBottom: '140px',
  },
  addButton: {
    width: '100%',
    height: '52px',
    marginBottom: tokens.spacingVerticalM,
    fontSize: '15px',
    fontWeight: 500,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `2px dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    justifyContent: 'center',
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
    minHeight: '72px',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    gap: tokens.spacingHorizontalM,
    ':last-child': {
      borderBottom: 'none',
    },
  },
  itemNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  itemAssetTag: {
    fontSize: '16px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  itemSerialNumber: {
    fontSize: '14px',
    color: tokens.colorNeutralForeground3,
  },
  itemActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0,
  },
  actionButton: {
    minWidth: '44px',
    height: '44px',
    padding: 0,
  },
  editButton: {
    color: tokens.colorBrandForeground1,
  },
  deleteButton: {
    color: tokens.colorStatusDangerForeground1,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
    gap: tokens.spacingVerticalM,
  },
  emptyIcon: {
    fontSize: '48px',
    color: tokens.colorNeutralForeground3,
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
  },
  emptyDescription: {
    fontSize: '14px',
    color: tokens.colorNeutralForeground3,
    maxWidth: '260px',
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
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  footerButtons: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
  },
  scanMoreButton: {
    flex: 1,
    height: '52px',
    fontSize: '15px',
    fontWeight: 500,
  },
  approveButton: {
    flex: 2,
    height: '52px',
    fontSize: '16px',
    fontWeight: 600,
  },
  dialogInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
  },
  dialogLabel: {
    fontWeight: 500,
  },
  dialogInput: {
    width: '100%',
  },
  dialogError: {
    color: tokens.colorStatusDangerForeground1,
    fontSize: '12px',
    marginTop: tokens.spacingVerticalXS,
  },
  dialogActions: {
    paddingTop: tokens.spacingVerticalL,
  },
  dialogButton: {
    minWidth: '100px',
    height: '44px',
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
            <Badge appearance="filled" color="brand" className={styles.headerBadge}>
              {records.length}
            </Badge>
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
                className={styles.dialogButton}
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
                className={styles.dialogButton}
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
