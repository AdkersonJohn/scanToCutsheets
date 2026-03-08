import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Dropdown,
  Option,
  Text,
  Field,
} from '@fluentui/react-components';
import { EligibilityBadge } from '@/components/EligibilityBadge';
import type { EligibilityStatus } from '@/types';
import { validateSerialNumber } from '@/types';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
  },
  assetTag: {
    fontSize: '18px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  optionalSection: {
    paddingTop: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    marginTop: tokens.spacingVerticalS,
  },
  sectionLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
    marginBottom: tokens.spacingVerticalS,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: '12px',
  },
});

interface FieldRefreshFormDialogProps {
  open: boolean;
  assetTag: string;
  eligibilityStatus: EligibilityStatus;
  eligibleAfterYear?: number;
  onSubmit: (data: {
    serialNumber: string;
    department: string;
    locationNotes: string;
    machineType: 'desktop' | 'laptop' | 'other';
    monitorAssetTag?: string;
    monitorSerial?: string;
  }) => void;
  onCancel: () => void;
}

const DEPARTMENTS = [
  'Accounting',
  'Engineering',
  'Executive',
  'Finance',
  'HR',
  'IT',
  'Legal',
  'Marketing',
  'Operations',
  'Sales',
  'Other',
];

const MACHINE_TYPES: { value: 'desktop' | 'laptop' | 'other'; label: string }[] = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'other', label: 'Other' },
];

export function FieldRefreshFormDialog({
  open,
  assetTag,
  eligibilityStatus,
  eligibleAfterYear,
  onSubmit,
  onCancel,
}: FieldRefreshFormDialogProps) {
  const styles = useStyles();

  const [serialNumber, setSerialNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [machineType, setMachineType] = useState<'desktop' | 'laptop' | 'other'>('desktop');
  const [monitorAssetTag, setMonitorAssetTag] = useState('');
  const [monitorSerial, setMonitorSerial] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!serialNumber.trim()) {
      newErrors.serialNumber = 'Serial number is required';
    } else if (!validateSerialNumber(serialNumber.toUpperCase())) {
      newErrors.serialNumber = 'Must be 7 alphanumeric characters';
    }

    if (!department) {
      newErrors.department = 'Department is required';
    }

    if (!locationNotes.trim()) {
      newErrors.locationNotes = 'Location notes are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      serialNumber: serialNumber.toUpperCase(),
      department,
      locationNotes,
      machineType,
      monitorAssetTag: monitorAssetTag.trim() || undefined,
      monitorSerial: monitorSerial.trim() || undefined,
    });

    // Reset form
    setSerialNumber('');
    setDepartment('');
    setLocationNotes('');
    setMachineType('desktop');
    setMonitorAssetTag('');
    setMonitorSerial('');
    setErrors({});
  };

  const handleCancel = () => {
    setSerialNumber('');
    setDepartment('');
    setLocationNotes('');
    setMachineType('desktop');
    setMonitorAssetTag('');
    setMonitorSerial('');
    setErrors({});
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && handleCancel()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Add Refresh Candidate</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <div className={styles.header}>
                <Text className={styles.assetTag}>{assetTag}</Text>
                <EligibilityBadge
                  status={eligibilityStatus}
                  eligibleAfterYear={eligibleAfterYear}
                />
              </div>

              <Field
                label="Serial Number"
                required
                validationMessage={errors.serialNumber}
                validationState={errors.serialNumber ? 'error' : undefined}
              >
                <Input
                  value={serialNumber}
                  onChange={(_, data) => setSerialNumber(data.value)}
                  placeholder="ABC1234"
                  maxLength={7}
                />
              </Field>

              <Field
                label="Department"
                required
                validationMessage={errors.department}
                validationState={errors.department ? 'error' : undefined}
              >
                <Dropdown
                  placeholder="Select department"
                  value={department}
                  onOptionSelect={(_, data) => setDepartment(data.optionValue || '')}
                >
                  {DEPARTMENTS.map((dept) => (
                    <Option key={dept} value={dept}>
                      {dept}
                    </Option>
                  ))}
                </Dropdown>
              </Field>

              <Field
                label="Location Notes"
                required
                validationMessage={errors.locationNotes}
                validationState={errors.locationNotes ? 'error' : undefined}
              >
                <Input
                  value={locationNotes}
                  onChange={(_, data) => setLocationNotes(data.value)}
                  placeholder="Building, floor, desk number, etc."
                />
              </Field>

              <Field label="Machine Type" required>
                <Dropdown
                  value={machineType}
                  onOptionSelect={(_, data) =>
                    setMachineType((data.optionValue as 'desktop' | 'laptop' | 'other') || 'desktop')
                  }
                >
                  {MACHINE_TYPES.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Dropdown>
              </Field>

              <div className={styles.optionalSection}>
                <Text className={styles.sectionLabel}>Monitor (Optional)</Text>

                <Field label="Monitor Asset Tag">
                  <Input
                    value={monitorAssetTag}
                    onChange={(_, data) => setMonitorAssetTag(data.value)}
                    placeholder="Monitor asset tag (if applicable)"
                  />
                </Field>

                <Field label="Monitor Serial" style={{ marginTop: tokens.spacingVerticalS }}>
                  <Input
                    value={monitorSerial}
                    onChange={(_, data) => setMonitorSerial(data.value)}
                    placeholder="Monitor serial number"
                  />
                </Field>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleSubmit}>
              Add to List
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
