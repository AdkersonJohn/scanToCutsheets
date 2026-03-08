import { makeStyles, Text, Card, CardHeader } from '@fluentui/react-components';
import { ChevronRight24Regular } from '@fluentui/react-icons';
import {
  encoreColors,
  encoreTypography,
  encoreBorderRadius,
  encoreShadows,
  encoreTransitions,
} from '@/theme';

const useStyles = makeStyles({
  card: {
    width: '100%',
    cursor: 'pointer',
    padding: '16px',
    borderRadius: encoreBorderRadius.lg,
    backgroundColor: encoreColors.white,
    border: `1px solid ${encoreColors.borderGray}`,
    boxShadow: encoreShadows.card,
    transition: `all ${encoreTransitions.normal}`,
    ':hover': {
      border: `1px solid ${encoreColors.primaryBlue}`,
      boxShadow: encoreShadows.cardHover,
      transform: 'translateY(-2px)',
    },
    ':active': {
      transform: 'translateY(0)',
      boxShadow: encoreShadows.md,
    },
  },
  cardDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    ':hover': {
      border: `1px solid ${encoreColors.borderGray}`,
      boxShadow: encoreShadows.card,
      transform: 'none',
    },
  },
  cardContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
  },
  iconContainer: {
    width: '52px',
    height: '52px',
    borderRadius: encoreBorderRadius.md,
    background: encoreColors.primaryGradient,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0, 137, 209, 0.2)',
  },
  icon: {
    fontSize: '26px',
    color: encoreColors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  title: {
    fontSize: '17px',
    fontWeight: encoreTypography.fontWeight.semibold,
    fontFamily: encoreTypography.fontFamily.heading,
    color: encoreColors.charcoal,
  },
  description: {
    fontSize: '14px',
    fontFamily: encoreTypography.fontFamily.body,
    color: encoreColors.bodyGray,
    lineHeight: 1.4,
  },
  comingSoon: {
    fontSize: '12px',
    fontFamily: encoreTypography.fontFamily.body,
    color: encoreColors.bodyGray,
    fontStyle: 'italic',
    marginTop: '2px',
  },
  chevron: {
    color: encoreColors.primaryBlue,
    flexShrink: 0,
    opacity: 0.7,
    transition: `transform ${encoreTransitions.fast}, opacity ${encoreTransitions.fast}`,
  },
});

interface ModeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
}

export function ModeCard({ title, description, icon, onClick, disabled, comingSoon }: ModeCardProps) {
  const styles = useStyles();

  const handleClick = () => {
    if (!disabled && !comingSoon) {
      onClick();
    }
  };

  return (
    <Card
      className={`${styles.card} ${disabled || comingSoon ? styles.cardDisabled : ''}`}
      onClick={handleClick}
      role="button"
      aria-disabled={disabled || comingSoon}
    >
      <CardHeader
        header={
          <div className={styles.cardContent}>
            <div className={styles.iconContainer}>
              <span className={styles.icon}>{icon}</span>
            </div>
            <div className={styles.textContainer}>
              <Text className={styles.title}>{title}</Text>
              <Text className={styles.description}>{description}</Text>
              {comingSoon && <Text className={styles.comingSoon}>(Coming Soon)</Text>}
            </div>
            {!comingSoon && <ChevronRight24Regular className={styles.chevron} />}
          </div>
        }
      />
    </Card>
  );
}
