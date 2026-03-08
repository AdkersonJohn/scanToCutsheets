import { makeStyles, tokens, Text } from '@fluentui/react-components';
import {
  CheckmarkCircle24Filled,
  DismissCircle24Filled,
  Clock24Regular,
  Warning24Filled,
} from '@fluentui/react-icons';
import type { EligibilityStatus } from '@/types';

const useStyles = makeStyles({
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: '13px',
    fontWeight: 500,
  },
  eligible: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
    color: tokens.colorPaletteGreenForeground1,
  },
  notEligible: {
    backgroundColor: tokens.colorPaletteYellowBackground1,
    color: tokens.colorPaletteYellowForeground1,
  },
  alreadyExists: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    color: tokens.colorPaletteRedForeground1,
  },
  pending: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
  },
  icon: {
    fontSize: '18px',
  },
});

interface EligibilityBadgeProps {
  status: EligibilityStatus;
  eligibleAfterYear?: number;
}

export function EligibilityBadge({ status, eligibleAfterYear }: EligibilityBadgeProps) {
  const styles = useStyles();

  const getContent = () => {
    switch (status) {
      case 'eligible':
        return {
          icon: <CheckmarkCircle24Filled className={styles.icon} />,
          text: 'Eligible',
          className: styles.eligible,
        };
      case 'not_eligible':
        return {
          icon: <Warning24Filled className={styles.icon} />,
          text: eligibleAfterYear ? `Eligible in ${eligibleAfterYear}` : 'Not Eligible',
          className: styles.notEligible,
        };
      case 'already_exists':
        return {
          icon: <DismissCircle24Filled className={styles.icon} />,
          text: 'Cut sheet exists',
          className: styles.alreadyExists,
        };
      case 'pending':
      default:
        return {
          icon: <Clock24Regular className={styles.icon} />,
          text: 'Checking...',
          className: styles.pending,
        };
    }
  };

  const { icon, text, className } = getContent();

  return (
    <div className={`${styles.badge} ${className}`}>
      {icon}
      <Text>{text}</Text>
    </div>
  );
}
