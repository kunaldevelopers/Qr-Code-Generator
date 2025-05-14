import { useState } from "react";
import styles from "./QRSecurityOptions.module.css";

interface QRSecurityOptionsProps {
  security: {
    password: string;
    isPasswordProtected: boolean;
    expiresAt: string;
    maxScans: number;
  };
  onSecurityChange: (security: any) => void;
}

export function QRSecurityOptions({
  security,
  onSecurityChange,
}: QRSecurityOptionsProps) {
  const [hasExpiry, setHasExpiry] = useState(!!security.expiresAt);
  const [hasMaxScans, setHasMaxScans] = useState(!!security.maxScans);

  const handlePasswordProtectionChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = e.target.checked;
    onSecurityChange({
      ...security,
      isPasswordProtected: isChecked,
      password: isChecked ? security.password : "",
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSecurityChange({ ...security, password: e.target.value });
  };

  const handleExpiryToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setHasExpiry(isChecked);
    onSecurityChange({
      ...security,
      expiresAt: isChecked ? security.expiresAt || getDefaultExpiryDate() : "",
    });
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSecurityChange({ ...security, expiresAt: e.target.value });
  };

  const handleMaxScansToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setHasMaxScans(isChecked);
    onSecurityChange({
      ...security,
      maxScans: isChecked ? security.maxScans || 10 : 0,
    });
  };

  const handleMaxScansChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSecurityChange({ ...security, maxScans: parseInt(e.target.value, 10) });
  };

  // Helper to get a default expiry date (7 days from now)
  const getDefaultExpiryDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

  return (
    <div className={styles.securityContainer}>
      <h3 className={styles.sectionTitle}>Security Options</h3>

      <div className={styles.securityOptions}>
        {/* Password Protection */}
        <div className={styles.securityOption}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={security.isPasswordProtected}
              onChange={handlePasswordProtectionChange}
            />
            Password Protect QR Code
          </label>

          {security.isPasswordProtected && (
            <div className={styles.passwordInput}>
              <input
                type="password"
                placeholder="Enter password"
                value={security.password}
                onChange={handlePasswordChange}
                className={styles.formControl}
              />
              <p className={styles.securityNote}>
                Users will need to enter this password before accessing the
                content
              </p>
            </div>
          )}
        </div>

        {/* Expiry Date */}
        <div className={styles.securityOption}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={hasExpiry}
              onChange={handleExpiryToggle}
            />
            Set Expiration Date
          </label>

          {hasExpiry && (
            <div className={styles.expiryInput}>
              <input
                type="datetime-local"
                value={security.expiresAt}
                onChange={handleExpiryDateChange}
                className={styles.formControl}
              />
              <p className={styles.securityNote}>
                QR code will stop working after this date and time
              </p>
            </div>
          )}
        </div>

        {/* Max Scans */}
        <div className={styles.securityOption}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={hasMaxScans}
              onChange={handleMaxScansToggle}
            />
            Limit Number of Scans
          </label>

          {hasMaxScans && (
            <div className={styles.maxScansInput}>
              <input
                type="number"
                min="1"
                max="1000"
                value={security.maxScans}
                onChange={handleMaxScansChange}
                className={styles.formControl}
              />
              <p className={styles.securityNote}>
                QR code will stop working after it has been scanned this many
                times
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
