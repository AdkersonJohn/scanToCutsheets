import { makeStyles, tokens, Text } from '@fluentui/react-components';
import { WifiOff24Regular } from '@fluentui/react-icons';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const useStyles = makeStyles({
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingVerticalS,
    backgroundColor: tokens.colorStatusWarningBackground1,
    color: tokens.colorStatusWarningForeground1,
    fontSize: '14px',
    fontWeight: 500,
  },
  hidden: {
    display: 'none',
  },
});

export function OfflineBanner() {
  const styles = useStyles();
  const { isOnline } = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className={styles.banner}>
      <WifiOff24Regular />
      <Text>You're offline. Scanned items are saved locally.</Text>
    </div>
  );
}
