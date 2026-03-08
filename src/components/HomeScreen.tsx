import { useState, useEffect } from 'react';
import { makeStyles, Button, Text, Spinner } from '@fluentui/react-components';
import {
  Camera24Regular,
  Person24Regular,
  SignOut24Regular,
  DocumentAdd24Regular,
  Search24Regular,
  DocumentCheckmark24Regular,
  History24Regular,
} from '@fluentui/react-icons';
import { useScanStore } from '@/store/scanStore';
import { initializeAuth, login, logout, getCurrentUser, isAuthenticated } from '@/services/authService';
import { ModeCard } from '@/components/ModeCard';
import { encoreColors, encoreTypography, encoreBorderRadius, encoreShadows } from '@/theme';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#FAFAFA',
    fontFamily: encoreTypography.fontFamily.body,
  },
  header: {
    background: encoreColors.primaryGradient,
    padding: '16px 24px',
    paddingTop: 'max(env(safe-area-inset-top), 16px)',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(8px)',
    padding: '6px 14px',
    borderRadius: encoreBorderRadius.full,
    color: encoreColors.white,
  },
  userName: {
    fontSize: '13px',
    fontFamily: encoreTypography.fontFamily.body,
    fontWeight: encoreTypography.fontWeight.medium,
    color: encoreColors.white,
  },
  logoutButton: {
    color: encoreColors.white,
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '0 24px',
    paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
  },
  heroSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    paddingTop: '48px',
    paddingBottom: '32px',
  },
  iconContainer: {
    width: '88px',
    height: '88px',
    borderRadius: '50%',
    background: encoreColors.primaryGradient,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0, 137, 209, 0.25)',
  },
  icon: {
    fontSize: '44px',
    color: encoreColors.white,
  },
  title: {
    fontSize: '28px',
    fontWeight: encoreTypography.fontWeight.bold,
    fontFamily: encoreTypography.fontFamily.heading,
    color: encoreColors.charcoal,
    margin: 0,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '16px',
    fontFamily: encoreTypography.fontFamily.body,
    color: encoreColors.bodyGray,
    fontWeight: encoreTypography.fontWeight.regular,
  },
  modeSelection: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  loginSection: {
    width: '100%',
    maxWidth: '340px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    height: '56px',
    fontSize: '16px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.body,
    borderRadius: encoreBorderRadius.full,
    background: encoreColors.primaryGradient,
    border: 'none',
    boxShadow: '0 4px 14px rgba(0, 137, 209, 0.3)',
    transition: 'transform 200ms ease, box-shadow 200ms ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 6px 20px rgba(0, 137, 209, 0.4)',
    },
    ':active': {
      transform: 'translateY(0)',
    },
  },
  secondaryButton: {
    width: '100%',
    height: '52px',
    fontSize: '15px',
    fontWeight: encoreTypography.fontWeight.medium,
    fontFamily: encoreTypography.fontFamily.body,
    borderRadius: encoreBorderRadius.full,
    backgroundColor: encoreColors.white,
    border: `1px solid ${encoreColors.borderGray}`,
    color: encoreColors.charcoal,
    boxShadow: encoreShadows.sm,
    transition: 'all 200ms ease',
    ':hover': {
      border: `1px solid ${encoreColors.primaryBlue}`,
      color: encoreColors.primaryBlue,
      boxShadow: encoreShadows.md,
    },
  },
  resumeSection: {
    width: '100%',
    maxWidth: '400px',
    paddingTop: '24px',
    marginTop: '24px',
    borderTop: `1px solid ${encoreColors.borderGray}`,
  },
  footer: {
    textAlign: 'center',
    paddingTop: '32px',
    paddingBottom: '16px',
  },
  footerText: {
    fontSize: '13px',
    fontFamily: encoreTypography.fontFamily.body,
    color: encoreColors.bodyGray,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '16px',
  },
  loadingText: {
    fontFamily: encoreTypography.fontFamily.body,
    color: encoreColors.bodyGray,
  },
});

export function HomeScreen() {
  const styles = useStyles();
  const {
    startSession,
    session,
    setScreen,
    setMode,
    startFieldRefreshSession,
    fieldRefreshSession,
  } = useScanStore();

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

  const handleCreateCutSheets = () => {
    setMode('createCutSheets');
    if (user) {
      startSession(user.id, user.displayName);
    } else {
      startSession('anonymous', 'Anonymous User');
    }
  };

  const handleFieldRefreshCheck = () => {
    if (user) {
      startFieldRefreshSession(user.id, user.displayName);
    } else {
      startFieldRefreshSession('anonymous', 'Anonymous User');
    }
  };

  const handleFinishCutSheets = () => {
    // Coming soon - no action
  };

  const handleResumeSession = () => {
    if (session && session.records.length > 0) {
      setMode('createCutSheets');
      setScreen('review');
    }
  };

  const handleResumeFieldRefresh = () => {
    if (fieldRefreshSession && fieldRefreshSession.records.length > 0) {
      setScreen('fieldRefreshReview');
    }
  };

  const hasExistingSession = session && session.records.length > 0;
  const hasExistingFieldRefresh = fieldRefreshSession && fieldRefreshSession.records.length > 0;

  if (isInitializing) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <Text className={styles.loadingText}>Initializing...</Text>
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
              className={styles.logoutButton}
              appearance="subtle"
              icon={<SignOut24Regular />}
              onClick={handleLogout}
              title="Sign out"
            />
          </>
        ) : null}
      </div>

      <div className={styles.content}>
        {/* Hero section */}
        <div className={styles.heroSection}>
          <div className={styles.iconContainer}>
            <Camera24Regular className={styles.icon} />
          </div>
          <h1 className={styles.title}>Scan to Cut Sheets</h1>
          <Text className={styles.subtitle}>What would you like to do?</Text>
        </div>

        {!isLoggedIn ? (
          <div className={styles.loginSection}>
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
                onClick={handleCreateCutSheets}
              >
                Start Demo Mode
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mode selection cards */}
            <div className={styles.modeSelection}>
              <ModeCard
                title="Create Cut Sheets"
                description="Scan boxes to create new cut sheets"
                icon={<DocumentAdd24Regular />}
                onClick={handleCreateCutSheets}
              />

              <ModeCard
                title="Field Refresh Check"
                description="Find refresh candidates"
                icon={<Search24Regular />}
                onClick={handleFieldRefreshCheck}
              />

              <ModeCard
                title="Finish Cut Sheets"
                description="Complete existing partial cut sheets"
                icon={<DocumentCheckmark24Regular />}
                onClick={handleFinishCutSheets}
                comingSoon
              />
            </div>

            {/* Resume sessions */}
            {(hasExistingSession || hasExistingFieldRefresh) && (
              <div className={styles.resumeSection}>
                {hasExistingSession && (
                  <Button
                    className={styles.secondaryButton}
                    appearance="secondary"
                    icon={<History24Regular />}
                    onClick={handleResumeSession}
                  >
                    Resume Cut Sheets ({session.records.length} items)
                  </Button>
                )}
                {hasExistingFieldRefresh && (
                  <Button
                    className={styles.secondaryButton}
                    appearance="secondary"
                    icon={<History24Regular />}
                    onClick={handleResumeFieldRefresh}
                    style={{ marginTop: hasExistingSession ? '12px' : 0 }}
                  >
                    Resume Field Refresh ({fieldRefreshSession.records.length} items)
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.footer}>
        <Text className={styles.footerText}>
          Works best in Microsoft Teams mobile app
        </Text>
      </div>
    </div>
  );
}
