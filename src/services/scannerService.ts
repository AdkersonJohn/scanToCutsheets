import * as microsoftTeams from '@microsoft/teams-js';
import Quagga from '@ericblade/quagga2';

export type ScannerType = 'teams-native' | 'quagga';

let currentScannerType: ScannerType | null = null;

export async function detectScannerType(): Promise<ScannerType> {
  if (currentScannerType) return currentScannerType;

  try {
    await microsoftTeams.app.initialize();
    if (microsoftTeams.barCode.isSupported()) {
      currentScannerType = 'teams-native';
      console.log('Using Teams native barcode scanner');
      return 'teams-native';
    }
  } catch (error) {
    console.log('Teams barCode API not available:', error);
  }

  currentScannerType = 'quagga';
  console.log('Using Quagga2 fallback scanner (browser mode)');
  return 'quagga';
}

export function getScannerType(): ScannerType {
  return currentScannerType ?? 'quagga';
}

export async function scanWithTeamsNative(): Promise<string> {
  const config: microsoftTeams.barCode.BarCodeConfig = {
    timeOutIntervalInSec: 60,
  };

  const result = await microsoftTeams.barCode.scanBarCode(config);

  triggerHapticFeedback();

  return result;
}

export function triggerHapticFeedback(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(100);
  }
}

export interface QuaggaScannerConfig {
  targetElement: HTMLElement;
  onDetected: (code: string) => void;
  onError?: (error: Error) => void;
}

export function initializeQuaggaScanner(config: QuaggaScannerConfig): void {
  Quagga.init(
    {
      inputStream: {
        type: 'LiveStream',
        target: config.targetElement,
        constraints: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16 / 9 },
        },
      },
      decoder: {
        readers: [
          'code_128_reader',
          'code_39_reader',
        ],
        multiple: false,
      },
      locate: true,
      frequency: 10,
      locator: {
        patchSize: 'medium',
        halfSample: true,
      },
    },
    (err) => {
      if (err) {
        config.onError?.(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      Quagga.start();
    }
  );

  let lastScannedCode = '';
  let lastScanTime = 0;
  const DEBOUNCE_MS = 1500;

  Quagga.onDetected((result) => {
    if (result.codeResult && result.codeResult.code) {
      const code = result.codeResult.code;
      const now = Date.now();

      if (code !== lastScannedCode || now - lastScanTime > DEBOUNCE_MS) {
        lastScannedCode = code;
        lastScanTime = now;
        triggerHapticFeedback();
        config.onDetected(code);
      }
    }
  });
}

export function stopQuaggaScanner(): void {
  try {
    Quagga.stop();
  } catch (error) {
    console.warn('Error stopping Quagga:', error);
  }
}
