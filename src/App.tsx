import { useEffect, useState } from 'react';
import { makeStyles, tokens, Spinner, Text } from '@fluentui/react-components';
import * as microsoftTeams from '@microsoft/teams-js';
import { useScanStore } from '@/store/scanStore';
import { HomeScreen } from '@/components/HomeScreen';
import { ScanningScreen } from '@/components/ScanningScreen';
import { ReviewScreen } from '@/components/ReviewScreen';
import { SubmissionScreen } from '@/components/SubmissionScreen';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: tokens.spacingVerticalM,
  },
});

function App() {
  const styles = useStyles();
  const { currentScreen } = useScanStore();
  const [isTeamsInitialized, setIsTeamsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTeams = async () => {
      try {
        await microsoftTeams.app.initialize();
        await microsoftTeams.app.notifySuccess();
        setIsTeamsInitialized(true);
      } catch (error) {
        console.warn('Not running in Teams context, continuing standalone:', error);
        setIsTeamsInitialized(true);
      }
    };

    initializeTeams().catch((err) => {
      setInitError(err instanceof Error ? err.message : 'Failed to initialize');
    });
  }, []);

  if (initError) {
    return (
      <div className={styles.loading}>
        <Text size={500} weight="semibold">
          Initialization Error
        </Text>
        <Text>{initError}</Text>
      </div>
    );
  }

  if (!isTeamsInitialized) {
    return (
      <div className={styles.loading}>
        <Spinner size="large" />
        <Text>Initializing...</Text>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'scanning':
        return <ScanningScreen />;
      case 'review':
        return <ReviewScreen />;
      case 'submission':
        return <SubmissionScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return <div className={styles.container}>{renderScreen()}</div>;
}

export default App;
