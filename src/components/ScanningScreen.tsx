import { useRef, useEffect, useCallback, useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Badge,
  Spinner,
} from '@fluentui/react-components';
import {
  Checkmark24Regular,
  Dismiss24Regular,
  Camera24Regular,
  ArrowUndo24Regular,
  Tag24Regular,
  DocumentText24Regular,
} from '@fluentui/react-icons';
import { useScanStore } from '@/store/scanStore';
import {
  detectScannerType,
  scanWithTeamsNative,
  initializeQuaggaScanner,
  stopQuaggaScanner,
  type ScannerType,
} from '@/services/scannerService';

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
    border: `3px solid ${tokens.colorBrandForeground1}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px ${tokens.colorBrandForeground1}`,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: '5%',
    right: '5%',
    height: '2px',
    backgroundColor: tokens.colorBrandForeground1,
    boxShadow: `0 0 10px ${tokens.colorBrandForeground1}`,
    animation: 'scanAnimation 2s ease-in-out infinite',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: tokens.spacingVerticalL,
    paddingTop: 'max(env(safe-area-inset-top), 16px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
    zIndex: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 600,
  },
  lastScannedBanner: {
    position: 'absolute',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: tokens.colorStatusSuccessBackground1,
    color: tokens.colorStatusSuccessForeground1,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusLarge,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    zIndex: 10,
    boxShadow: tokens.shadow16,
    animation: 'fadeInOut 2s ease-in-out',
  },
  bottomPanel: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderTopLeftRadius: tokens.borderRadiusXLarge,
    borderTopRightRadius: tokens.borderRadiusXLarge,
    padding: tokens.spacingVerticalL,
    paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
    maxHeight: '40vh',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalM,
  },
  scannedList: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: tokens.spacingVerticalM,
    maxHeight: '120px',
  },
  scannedItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  scannedItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  itemIcon: {
    color: tokens.colorStatusSuccessForeground1,
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground3,
  },
  buttonRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
  },
  scanButton: {
    flex: 1,
    height: '56px',
    fontSize: '16px',
    fontWeight: 600,
  },
  doneButton: {
    flex: 1,
    height: '56px',
    fontSize: '16px',
    fontWeight: 600,
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
    gap: tokens.spacingVerticalM,
    zIndex: 20,
  },
  loadingText: {
    color: '#fff',
  },
  errorBanner: {
    position: 'absolute',
    bottom: '50%',
    left: '10%',
    right: '10%',
    backgroundColor: tokens.colorStatusDangerBackground1,
    color: tokens.colorStatusDangerForeground1,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    textAlign: 'center',
    zIndex: 10,
  },
  scanModeIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -150%)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusLarge,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalS,
    zIndex: 10,
    minWidth: '200px',
    textAlign: 'center',
  },
  scanModeLabel: {
    fontSize: '14px',
    opacity: 0.8,
  },
  scanModeValue: {
    fontSize: '18px',
    fontWeight: 600,
  },
  pendingAssetTagBanner: {
    position: 'absolute',
    top: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: tokens.colorStatusWarningBackground1,
    color: tokens.colorStatusWarningForeground1,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusLarge,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    zIndex: 10,
    boxShadow: tokens.shadow16,
  },
  cancelButton: {
    minWidth: 'auto',
    padding: tokens.spacingHorizontalXS,
  },
  scannedItemDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  scannedItemSerial: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
});

const cssAnimation = `
@keyframes scanAnimation {
  0%, 100% { top: 10%; }
  50% { top: 90%; }
}
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  15% { opacity: 1; transform: translateX(-50%) translateY(0); }
  85% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}
`;

export function ScanningScreen() {
  const styles = useStyles();
  const scannerRef = useRef<HTMLDivElement>(null);
  const { session, addScan, endSession, scanMode, pendingAssetTag, cancelPendingAssetTag } = useScanStore();

  const [scannerType, setScannerType] = useState<ScannerType | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleScanSuccess = useCallback(
    (code: string) => {
      const result = addScan(code);

      if (!result.success) {
        setError(result.error || 'Scan failed');
        setTimeout(() => setError(null), 3000);
        return;
      }

      setLastScanned(code);
      setTimeout(() => setLastScanned(null), 2000);
    },
    [addScan]
  );

  useEffect(() => {
    if (scannerType !== 'quagga' || !scannerRef.current || isInitializing) return;

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
  }, [scannerType, isInitializing, handleScanSuccess]);

  const handleTeamsNativeScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setError(null);

    try {
      const code = await scanWithTeamsNative();
      if (code) {
        handleScanSuccess(code);
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

  const handleEndScanning = () => {
    if (scannerType === 'quagga') {
      stopQuaggaScanner();
    }
    endSession();
  };

  const scannedCount = session?.records.length ?? 0;
  const recentScans = session?.records.slice(-5).reverse() ?? [];

  return (
    <div className={styles.container}>
      {/* Camera Area */}
      <div className={styles.cameraArea}>
        {scannerType === 'quagga' && (
          <>
            <div ref={scannerRef} className={styles.cameraFeed} />
            <div className={styles.scanOverlay}>
              <div className={styles.scanLine} />
            </div>
          </>
        )}

        {scannerType === 'teams-native' && (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <Camera24Regular style={{ fontSize: '64px', marginBottom: '16px' }} />
            <Text style={{ color: '#fff', display: 'block' }}>
              Tap "Scan Barcode" to open camera
            </Text>
          </div>
        )}

        {/* Scan Mode Indicator */}
        <div className={styles.scanModeIndicator}>
          {scanMode === 'assetTag' ? (
            <>
              <Tag24Regular style={{ fontSize: '32px' }} />
              <Text className={styles.scanModeLabel}>Scan</Text>
              <Text className={styles.scanModeValue}>Asset Tag</Text>
              <Text className={styles.scanModeLabel}>Format: EW##-#####</Text>
            </>
          ) : (
            <>
              <DocumentText24Regular style={{ fontSize: '32px' }} />
              <Text className={styles.scanModeLabel}>Scan</Text>
              <Text className={styles.scanModeValue}>Serial Number</Text>
              <Text className={styles.scanModeLabel}>7 characters</Text>
            </>
          )}
        </div>

        {/* Pending Asset Tag Banner */}
        {pendingAssetTag && (
          <div className={styles.pendingAssetTagBanner}>
            <Tag24Regular />
            <Text weight="semibold">{pendingAssetTag}</Text>
            <Button
              className={styles.cancelButton}
              appearance="subtle"
              icon={<ArrowUndo24Regular />}
              onClick={cancelPendingAssetTag}
              title="Cancel and re-scan Asset Tag"
            />
          </div>
        )}

        {/* Header Overlay */}
        <div className={styles.header}>
          <Text className={styles.headerTitle}>Scanning</Text>
          <Badge appearance="filled" color="brand" size="large">
            {scannedCount} scanned
          </Badge>
        </div>

        {/* Success Banner */}
        {lastScanned && (
          <div className={styles.lastScannedBanner}>
            <Checkmark24Regular />
            <Text weight="semibold">{lastScanned}</Text>
          </div>
        )}

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
          <Text weight="semibold">Scanned Items</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {scannedCount} total
          </Text>
        </div>

        <div className={styles.scannedList}>
          {recentScans.length === 0 ? (
            <div className={styles.emptyState}>
              <Text size={200}>No items scanned yet</Text>
            </div>
          ) : (
            recentScans.map((record) => (
              <div key={record.id} className={styles.scannedItem}>
                <div className={styles.scannedItemLeft}>
                  <Checkmark24Regular className={styles.itemIcon} />
                  <div className={styles.scannedItemDetails}>
                    <Text weight="semibold">{record.assetTag}</Text>
                    <Text className={styles.scannedItemSerial}>{record.serialNumber}</Text>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.buttonRow}>
          {scannerType === 'teams-native' && (
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
            className={styles.doneButton}
            appearance={scannerType === 'teams-native' ? 'secondary' : 'primary'}
            onClick={handleEndScanning}
          >
            Done ({scannedCount})
          </Button>
        </div>
      </div>
    </div>
  );
}
