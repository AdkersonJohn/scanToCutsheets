import { makeStyles, tokens, Button, Text } from '@fluentui/react-components';
import { Camera24Regular, History24Regular } from '@fluentui/react-icons';
import { useScanStore } from '@/store/scanStore';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    paddingTop: 'max(env(safe-area-inset-top), 16px)',
    paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
    paddingLeft: 'max(env(safe-area-inset-left), 24px)',
    paddingRight: 'max(env(safe-area-inset-right), 24px)',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: tokens.spacingVerticalXL,
  },
  iconContainer: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacingVerticalM,
  },
  icon: {
    fontSize: '56px',
    color: tokens.colorBrandForeground1,
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: tokens.colorNeutralForeground1,
    margin: 0,
    lineHeight: 1.2,
  },
  description: {
    fontSize: '16px',
    color: tokens.colorNeutralForeground2,
    maxWidth: '300px',
    lineHeight: 1.5,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    marginTop: tokens.spacingVerticalXL,
  },
  primaryButton: {
    width: '100%',
    height: '56px',
    fontSize: '17px',
    fontWeight: 600,
    borderRadius: tokens.borderRadiusLarge,
  },
  secondaryButton: {
    width: '100%',
    height: '56px',
    fontSize: '16px',
    fontWeight: 500,
    borderRadius: tokens.borderRadiusLarge,
  },
  resumeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    backgroundColor: tokens.colorNeutralBackground3,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    marginTop: tokens.spacingVerticalS,
  },
  footer: {
    textAlign: 'center',
    paddingTop: tokens.spacingVerticalL,
  },
  footerText: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
  },
});

export function HomeScreen() {
  const styles = useStyles();
  const { startSession, session, setScreen } = useScanStore();

  const handleStartScanning = () => {
    startSession('temp-user-id', 'Current User');
  };

  const handleResumeSession = () => {
    if (session && session.records.length > 0) {
      setScreen('review');
    }
  };

  const hasExistingSession = session && session.records.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <Camera24Regular className={styles.icon} />
        </div>

        <div>
          <h1 className={styles.title}>Scan to Cut Sheets</h1>
        </div>

        <Text className={styles.description}>
          Scan asset tag barcodes from computer boxes to create cut sheet records in SharePoint.
        </Text>

        <div className={styles.buttonContainer}>
          <Button
            className={styles.primaryButton}
            appearance="primary"
            icon={<Camera24Regular />}
            onClick={handleStartScanning}
          >
            Start Scanning
          </Button>

          {hasExistingSession && (
            <Button
              className={styles.secondaryButton}
              appearance="secondary"
              icon={<History24Regular />}
              onClick={handleResumeSession}
            >
              Resume Session ({session.records.length} items)
            </Button>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <Text className={styles.footerText}>
          Works best in Microsoft Teams mobile app
        </Text>
      </div>
    </div>
  );
}
