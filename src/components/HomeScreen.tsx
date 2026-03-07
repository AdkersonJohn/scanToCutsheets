import { useState, useEffect } from 'react';
import { makeStyles, tokens, Button, Text, Spinner } from '@fluentui/react-components';
import { Camera24Regular, History24Regular, Person24Regular, SignOut24Regular } from '@fluentui/react-icons';
import { useScanStore } from '@/store/scanStore';
import { initializeAuth, login, logout, getCurrentUser, isAuthenticated } from '@/services/authService';

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
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalM,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorNeutralBackground3,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  userName: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground2,
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
  footer: {
    textAlign: 'center',
    paddingTop: tokens.spacingVerticalL,
  },
  footerText: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
  },
});

export function HomeScreen() {
  const styles = useStyles();
  const { startSession, session, setScreen } = useScanStore();

  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ id: string; displayName: string; email: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeAuth();
        const authenticated = await isAuthenticated();
        setIsLoggedIn(authenticated);
        if (authenticated) {
          const userInfo = await getCurrentUser();
          setUser(userInfo);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
      const userInfo = await getCurrentUser();
      setUser(userInfo);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleStartScanning = () => {
    if (user) {
      startSession(user.id, user.displayName);
    } else {
      startSession('anonymous', 'Anonymous User');
    }
  };

  const handleResumeSession = () => {
    if (session && session.records.length > 0) {
      setScreen('review');
    }
  };

  const hasExistingSession = session && session.records.length > 0;

  if (isInitializing) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.loadingContainer}>
            <Spinner size="large" />
            <Text>Initializing...</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with user info */}
      <div className={styles.header}>
        {isLoggedIn && user ? (
          <>
            <div className={styles.userInfo}>
              <Person24Regular />
              <Text className={styles.userName}>{user.displayName}</Text>
            </div>
            <Button
              appearance="subtle"
              icon={<SignOut24Regular />}
              onClick={handleLogout}
              title="Sign out"
            />
          </>
        ) : null}
      </div>

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
          {!isLoggedIn ? (
            <>
              <Button
                className={styles.primaryButton}
                appearance="primary"
                icon={<Person24Regular />}
                onClick={handleLogin}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? 'Signing in...' : 'Sign in with Microsoft'}
              </Button>

              {/* Demo mode for development/testing */}
              {import.meta.env.DEV && (
                <Button
                  className={styles.secondaryButton}
                  appearance="secondary"
                  icon={<Camera24Regular />}
                  onClick={handleStartScanning}
                >
                  Start Demo Mode
                </Button>
              )}
            </>
          ) : (
            <>
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
            </>
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
