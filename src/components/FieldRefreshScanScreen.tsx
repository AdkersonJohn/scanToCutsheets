import { useRef, useEffect, useCallback, useState } from 'react';
import {
  makeStyles,
  Button,
  Text,
  Spinner,
} from '@fluentui/react-components';
import {
  Checkmark24Regular,
  Dismiss24Regular,
  Camera24Regular,
  Tag24Regular,
} from '@fluentui/react-icons';
import { useScanStore } from '@/store/scanStore';
import {
  detectScannerType,
  scanWithTeamsNative,
  initializeQuaggaScanner,
  stopQuaggaScanner,
  type ScannerType,
} from '@/services/scannerService';
import {
  checkExistingCutSheet,
  getConfiguredSiteId,
  getConfiguredListId,
} from '@/services/sharePointService';
import { validateAssetTag, formatAssetTag, isEligibleForRefresh } from '@/types';
import type { EligibilityStatus, FieldRefreshRecord } from '@/types';
import { EligibilityBadge } from '@/components/EligibilityBadge';
import { FieldRefreshFormDialog } from '@/components/FieldRefreshFormDialog';
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
    width: '100vw',
    backgroundColor: '#000',
    position: 'fixed',
    top: 0,
    left: 0,
    overflow: 'hidden',
    fontFamily: encoreTypography.fontFamily.body,
  },
  cameraArea: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraFeed: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    '& video': {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    '& canvas': {
      display: 'none',
    },
  },
  scanOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: '300px',
    aspectRatio: '3/1',
    border: `3px solid ${encoreColors.primaryBlue}`,
    borderRadius: encoreBorderRadius.md,
    boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px ${encoreColors.primaryBlue}`,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: '5%',
    right: '5%',
    height: '2px',
    backgroundColor: encoreColors.primaryBlue,
    boxShadow: `0 0 10px ${encoreColors.primaryBlue}`,
    animation: 'scanAnimation 2s ease-in-out infinite',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '20px 24px',
    paddingTop: 'max(env(safe-area-inset-top), 20px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: encoreColors.primaryGradient,
    zIndex: 10,
  },
  headerTitle: {
    color: encoreColors.white,
    fontSize: '18px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.heading,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: encoreColors.white,
    backdropFilter: 'blur(8px)',
    borderRadius: encoreBorderRadius.full,
    padding: '6px 14px',
    fontWeight: encoreTypography.fontWeight.medium,
    fontSize: '14px',
  },
  scanModeIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -150%)',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    color: encoreColors.white,
    padding: '20px 28px',
    borderRadius: encoreBorderRadius.xl,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    zIndex: 10,
    minWidth: '200px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  scanModeLabel: {
    fontSize: '14px',
    opacity: 0.7,
    fontFamily: encoreTypography.fontFamily.body,
  },
  scanModeValue: {
    fontSize: '20px',
    fontWeight: encoreTypography.fontWeight.bold,
    fontFamily: encoreTypography.fontFamily.heading,
  },
  eligibilityResult: {
    position: 'absolute',
    top: '55%',
    left: '50%',
    transform: 'translate(-50%, 0)',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    backdropFilter: 'blur(12px)',
    padding: '24px',
    borderRadius: encoreBorderRadius.xl,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    zIndex: 15,
    minWidth: '300px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: encoreShadows.xl,
  },
  eligibilityAssetTag: {
    color: encoreColors.white,
    fontSize: '22px',
    fontWeight: encoreTypography.fontWeight.bold,
    fontFamily: encoreTypography.fontFamily.heading,
  },
  eligibilityActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  actionButton: {
    borderRadius: encoreBorderRadius.full,
    fontWeight: encoreTypography.fontWeight.medium,
    fontFamily: encoreTypography.fontFamily.body,
  },
  primaryActionButton: {
    borderRadius: encoreBorderRadius.full,
    fontWeight: encoreTypography.fontWeight.medium,
    fontFamily: encoreTypography.fontFamily.body,
    background: encoreColors.primaryGradient,
    border: 'none',
  },
  bottomPanel: {
    backgroundColor: encoreColors.white,
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    padding: '24px',
    paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
    maxHeight: '40vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  panelTitle: {
    fontFamily: encoreTypography.fontFamily.heading,
    fontWeight: encoreTypography.fontWeight.semibold,
    color: encoreColors.charcoal,
  },
  panelCount: {
    fontSize: '13px',
    color: encoreColors.bodyGray,
  },
  scannedList: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '16px',
    maxHeight: '120px',
  },
  scannedItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: `1px solid ${encoreColors.borderGray}`,
  },
  scannedItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  scannedItemDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  scannedItemAsset: {
    fontWeight: encoreTypography.fontWeight.semibold,
    color: encoreColors.charcoal,
  },
  scannedItemSerial: {
    fontSize: '12px',
    color: encoreColors.bodyGray,
  },
  itemIcon: {
    color: encoreColors.success,
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px',
    color: encoreColors.bodyGray,
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
  },
  scanButton: {
    flex: 1,
    height: '56px',
    fontSize: '16px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.body,
    borderRadius: encoreBorderRadius.full,
    background: encoreColors.primaryGradient,
    border: 'none',
    boxShadow: '0 4px 14px rgba(0, 137, 209, 0.3)',
  },
  doneButton: {
    flex: 1,
    height: '56px',
    fontSize: '16px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.body,
    borderRadius: encoreBorderRadius.full,
    backgroundColor: encoreColors.white,
    border: `1px solid ${encoreColors.borderGray}`,
    color: encoreColors.charcoal,
  },
  doneButtonPrimary: {
    flex: 1,
    height: '56px',
    fontSize: '16px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.body,
    borderRadius: encoreBorderRadius.full,
    background: encoreColors.primaryGradient,
    border: 'none',
    boxShadow: '0 4px 14px rgba(0, 137, 209, 0.3)',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    zIndex: 20,
  },
  loadingText: {
    color: encoreColors.white,
    fontFamily: encoreTypography.fontFamily.body,
  },
  errorBanner: {
    position: 'absolute',
    bottom: '50%',
    left: '10%',
    right: '10%',
    backgroundColor: encoreColors.error,
    color: encoreColors.white,
    padding: '16px',
    borderRadius: encoreBorderRadius.lg,
    textAlign: 'center',
    zIndex: 10,
    boxShadow: encoreShadows.lg,
  },
});

const cssAnimation = `
@keyframes scanAnimation {
  0%, 100% { top: 10%; }
  50% { top: 90%; }
}
`;

interface ScannedAssetState {
  assetTag: string;
  eligibilityStatus: EligibilityStatus;
  eligibleAfterYear?: number;
  isChecking: boolean;
}

export function FieldRefreshScanScreen() {
  const styles = useStyles();
  const scannerRef = useRef<HTMLDivElement>(null);
  const {
    fieldRefreshSession,
    addFieldRefreshRecord,
    endFieldRefreshSession,
  } = useScanStore();

  const [scannerType, setScannerType] = useState<ScannerType | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scannedAsset, setScannedAsset] = useState<ScannedAssetState | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = cssAnimation;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      const type = await detectScannerType();
      setScannerType(type);
      setIsInitializing(false);
    };
    init();
  }, []);

  const checkEligibility = useCallback(
    async (assetTag: string) => {
      setScannedAsset({
        assetTag,
        eligibilityStatus: 'pending',
        isChecking: true,
      });

      // First check year eligibility
      const eligibility = isEligibleForRefresh(assetTag);

      if (!eligibility.eligible) {
        setScannedAsset({
          assetTag,
          eligibilityStatus: 'not_eligible',
          eligibleAfterYear: eligibility.eligibleAfterYear,
          isChecking: false,
        });
        return;
      }

      // If year is eligible, check SharePoint for existing cut sheet
      const siteId = getConfiguredSiteId();
      const listId = getConfiguredListId();

      if (siteId && listId) {
        try {
          const result = await checkExistingCutSheet(siteId, listId, assetTag);
          if (result.exists) {
            setScannedAsset({
              assetTag,
              eligibilityStatus: 'already_exists',
              isChecking: false,
            });
            return;
          }
        } catch (err) {
          console.error('Failed to check SharePoint:', err);
          // Continue anyway - better to add than to miss
        }
      }

      // Eligible and no existing cut sheet
      setScannedAsset({
        assetTag,
        eligibilityStatus: 'eligible',
        isChecking: false,
      });
    },
    []
  );

  const handleScanSuccess = useCallback(
    async (code: string) => {
      const formattedCode = formatAssetTag(code);

      if (!validateAssetTag(formattedCode)) {
        setError(`Invalid Asset Tag format: ${code}. Expected: EW##-#####`);
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Check if already scanned in this session
      const existingRecord = fieldRefreshSession?.records.find(
        (r) => r.assetTag === formattedCode
      );
      if (existingRecord) {
        setError(`Asset Tag "${formattedCode}" already scanned`);
        setTimeout(() => setError(null), 3000);
        return;
      }

      await checkEligibility(formattedCode);
    },
    [fieldRefreshSession, checkEligibility]
  );

  useEffect(() => {
    if (scannerType !== 'quagga' || !scannerRef.current || isInitializing || scannedAsset) return;

    initializeQuaggaScanner({
      targetElement: scannerRef.current,
      onDetected: handleScanSuccess,
      onError: (err) => {
        console.error('Quagga error:', err);
        setError('Camera access failed. Please allow camera permissions.');
      },
    });

    return () => {
      stopQuaggaScanner();
    };
  }, [scannerType, isInitializing, handleScanSuccess, scannedAsset]);

  const handleTeamsNativeScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setError(null);

    try {
      const code = await scanWithTeamsNative();
      if (code) {
        await handleScanSuccess(code);
      }
    } catch (err) {
      console.error('Teams scan error:', err);
      if (err instanceof Error && !err.message.includes('cancelled')) {
        setError('Scan failed. Please try again.');
        setTimeout(() => setError(null), 3000);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleContinueToForm = () => {
    if (scannedAsset?.eligibilityStatus === 'eligible') {
      setShowFormDialog(true);
    }
  };

  const handleDismissResult = () => {
    setScannedAsset(null);
  };

  const handleFormSubmit = (data: {
    serialNumber: string;
    department: string;
    locationNotes: string;
    machineType: 'desktop' | 'laptop' | 'other';
    monitorAssetTag?: string;
    monitorSerial?: string;
  }) => {
    if (!scannedAsset) return;

    const record: Omit<FieldRefreshRecord, 'id' | 'scannedAt'> = {
      assetTag: scannedAsset.assetTag,
      serialNumber: data.serialNumber,
      department: data.department,
      locationNotes: data.locationNotes,
      machineType: data.machineType,
      monitorAssetTag: data.monitorAssetTag,
      monitorSerial: data.monitorSerial,
      status: 'pending',
      eligibilityStatus: 'eligible',
    };

    addFieldRefreshRecord(record);
    setShowFormDialog(false);
    setScannedAsset(null);
  };

  const handleFormCancel = () => {
    setShowFormDialog(false);
    setScannedAsset(null);
  };

  const handleEndScanning = () => {
    if (scannerType === 'quagga') {
      stopQuaggaScanner();
    }
    endFieldRefreshSession();
  };

  const scannedCount = fieldRefreshSession?.records.length ?? 0;
  const recentScans = fieldRefreshSession?.records.slice(-5).reverse() ?? [];

  return (
    <div className={styles.container}>
      {/* Camera Area */}
      <div className={styles.cameraArea}>
        {scannerType === 'quagga' && !scannedAsset && (
          <>
            <div ref={scannerRef} className={styles.cameraFeed} />
            <div className={styles.scanOverlay}>
              <div className={styles.scanLine} />
            </div>
          </>
        )}

        {scannerType === 'teams-native' && !scannedAsset && (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <Camera24Regular style={{ fontSize: '64px', marginBottom: '16px' }} />
            <Text style={{ color: '#fff', display: 'block' }}>
              Tap "Scan Barcode" to open camera
            </Text>
          </div>
        )}

        {/* Scan Mode Indicator */}
        {!scannedAsset && (
          <div className={styles.scanModeIndicator}>
            <Tag24Regular style={{ fontSize: '32px' }} />
            <Text className={styles.scanModeLabel}>Scan</Text>
            <Text className={styles.scanModeValue}>Asset Tag</Text>
            <Text className={styles.scanModeLabel}>Format: EW##-#####</Text>
          </div>
        )}

        {/* Eligibility Result Panel */}
        {scannedAsset && (
          <div className={styles.eligibilityResult}>
            <Text className={styles.eligibilityAssetTag}>{scannedAsset.assetTag}</Text>
            {scannedAsset.isChecking ? (
              <>
                <Spinner size="small" />
                <Text style={{ color: '#fff' }}>Checking eligibility...</Text>
              </>
            ) : (
              <>
                <EligibilityBadge
                  status={scannedAsset.eligibilityStatus}
                  eligibleAfterYear={scannedAsset.eligibleAfterYear}
                />
                <div className={styles.eligibilityActions}>
                  <Button className={styles.actionButton} appearance="secondary" onClick={handleDismissResult}>
                    Cancel
                  </Button>
                  {scannedAsset.eligibilityStatus === 'eligible' && (
                    <Button className={styles.primaryActionButton} appearance="primary" onClick={handleContinueToForm}>
                      Add Details
                    </Button>
                  )}
                  {scannedAsset.eligibilityStatus !== 'eligible' && (
                    <Button className={styles.primaryActionButton} appearance="primary" onClick={handleDismissResult}>
                      Scan Another
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Header Overlay */}
        <div className={styles.header}>
          <Text className={styles.headerTitle}>Field Refresh Check</Text>
          <span className={styles.badge}>{scannedCount} scanned</span>
        </div>

        {/* Error Banner */}
        {error && (
          <div className={styles.errorBanner}>
            <Dismiss24Regular style={{ marginRight: '8px' }} />
            <Text>{error}</Text>
          </div>
        )}

        {/* Loading Overlay */}
        {isInitializing && (
          <div className={styles.loadingOverlay}>
            <Spinner size="large" />
            <Text className={styles.loadingText}>Initializing camera...</Text>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className={styles.bottomPanel}>
        <div className={styles.panelHeader}>
          <Text className={styles.panelTitle}>Eligible Machines</Text>
          <Text className={styles.panelCount}>{scannedCount} total</Text>
        </div>

        <div className={styles.scannedList}>
          {recentScans.length === 0 ? (
            <div className={styles.emptyState}>
              <Text>No machines scanned yet</Text>
            </div>
          ) : (
            recentScans.map((record) => (
              <div key={record.id} className={styles.scannedItem}>
                <div className={styles.scannedItemLeft}>
                  <Checkmark24Regular className={styles.itemIcon} />
                  <div className={styles.scannedItemDetails}>
                    <Text className={styles.scannedItemAsset}>{record.assetTag}</Text>
                    <Text className={styles.scannedItemSerial}>
                      {record.serialNumber} - {record.department}
                    </Text>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.buttonRow}>
          {scannerType === 'teams-native' && !scannedAsset && (
            <Button
              className={styles.scanButton}
              appearance="primary"
              icon={<Camera24Regular />}
              onClick={handleTeamsNativeScan}
              disabled={isScanning}
            >
              {isScanning ? 'Scanning...' : 'Scan Barcode'}
            </Button>
          )}
          <Button
            className={scannerType === 'teams-native' ? styles.doneButton : styles.doneButtonPrimary}
            appearance={scannerType === 'teams-native' ? 'secondary' : 'primary'}
            onClick={handleEndScanning}
          >
            Done ({scannedCount})
          </Button>
        </div>
      </div>

      {/* Form Dialog */}
      {scannedAsset && (
        <FieldRefreshFormDialog
          open={showFormDialog}
          assetTag={scannedAsset.assetTag}
          eligibilityStatus={scannedAsset.eligibilityStatus}
          eligibleAfterYear={scannedAsset.eligibleAfterYear}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
}
