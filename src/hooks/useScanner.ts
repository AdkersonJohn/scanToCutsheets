import { useRef, useCallback, useState, useEffect } from 'react';
import {
  getScannerType,
  scanWithTeamsNative,
  initializeQuaggaScanner,
  stopQuaggaScanner,
  type ScannerType,
} from '@/services/scannerService';

interface UseScannerOptions {
  onScan: (code: string) => void;
  onError?: (error: Error) => void;
}

interface UseScannerReturn {
  scannerType: ScannerType;
  isScanning: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  startScanning: () => void;
  stopScanning: () => void;
  triggerNativeScan: () => Promise<void>;
}

export function useScanner(options: UseScannerOptions): UseScannerReturn {
  const { onScan, onError } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scannerType] = useState<ScannerType>(() => getScannerType());
  const [isScanning, setIsScanning] = useState(false);

  const startScanning = useCallback(() => {
    if (scannerType === 'quagga' && containerRef.current) {
      initializeQuaggaScanner({
        targetElement: containerRef.current,
        onDetected: onScan,
        onError,
      });
      setIsScanning(true);
    }
  }, [scannerType, onScan, onError]);

  const stopScanning = useCallback(() => {
    if (scannerType === 'quagga') {
      stopQuaggaScanner();
    }
    setIsScanning(false);
  }, [scannerType]);

  const triggerNativeScan = useCallback(async () => {
    if (scannerType !== 'teams-native') {
      throw new Error('Native scanning not supported');
    }

    try {
      setIsScanning(true);
      const code = await scanWithTeamsNative();
      onScan(code);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Scan failed'));
    } finally {
      setIsScanning(false);
    }
  }, [scannerType, onScan, onError]);

  useEffect(() => {
    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [isScanning, stopScanning]);

  return {
    scannerType,
    isScanning,
    containerRef,
    startScanning,
    stopScanning,
    triggerNativeScan,
  };
}
