import { useState } from 'react';
import {
  makeStyles,
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
    minHeight: '64px',
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
  },
  itemText: {
    fontSize: '16px',
    fontWeight: 500,
    color: tokens.colorNeutralForeground1,
    wordBreak: 'break-all',
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
  editingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flex: 1,
  },
  editInput: {
    flex: 1,
    fontSize: '16px',
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
  dialogInput: {
    width: '100%',
    marginTop: tokens.spacingVerticalM,
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newEntryValue, setNewEntryValue] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleStartEdit = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
  };

  const handleSaveEdit = () => {
    if (editingId && editValue.trim()) {
      updateScan(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAddEntry = () => {
    if (newEntryValue.trim()) {
      addManualEntry(newEntryValue.trim());
      setNewEntryValue('');
      setShowAddDialog(false);
    }
  };

  const handleApprove = () => {
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
                  <div className={styles.editingContainer}>
                    <Input
                      className={styles.editInput}
                      value={editValue}
                      onChange={(_, data) => setEditValue(data.value)}
                      autoFocus
                    />
                    <Button
                      className={styles.actionButton}
                      appearance="subtle"
                      icon={<Checkmark24Regular />}
                      onClick={handleSaveEdit}
                    />
                    <Button
                      className={styles.actionButton}
                      appearance="subtle"
                      icon={<Dismiss24Regular />}
                      onClick={handleCancelEdit}
                    />
                  </div>
                ) : (
                  <>
                    <div className={styles.itemContent}>
                      <Text className={styles.itemText}>{record.assetTag}</Text>
                    </div>
                    <div className={styles.itemActions}>
                      <Button
                        className={`${styles.actionButton} ${styles.editButton}`}
                        appearance="subtle"
                        icon={<Edit24Regular />}
                        onClick={() => handleStartEdit(record.id, record.assetTag)}
                      />
                      <Button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
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
      <Dialog open={showAddDialog} onOpenChange={(_, data) => setShowAddDialog(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Add Manual Entry</DialogTitle>
            <DialogContent>
              <Text>Enter the asset tag number manually:</Text>
              <Input
                className={styles.dialogInput}
                value={newEntryValue}
                onChange={(_, data) => setNewEntryValue(data.value)}
                placeholder="e.g., EW26-03975"
                autoFocus
              />
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button
                className={styles.dialogButton}
                appearance="secondary"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className={styles.dialogButton}
                appearance="primary"
                onClick={handleAddEntry}
                disabled={!newEntryValue.trim()}
              >
                Add
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
