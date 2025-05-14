/**
 * Utility functions for tracking QR code scans and analytics
 */

const QRCode = require("../models/QRCode");
const shortid = require("shortid");

// Create a tracking URL for a QR code
const createTrackingUrl = (baseUrl, qrCodeId) => {
  const trackingId = shortid.generate();
  return `${baseUrl}/track/${qrCodeId}/${trackingId}`;
};

// Record a scan of a QR code
const recordScan = async (qrCodeId, scanData = {}) => {
  try {
    const {
      userAgent = "",
      ip = "",
      referer = "",
      country = "",
      city = "",
    } = scanData;

    // Detect device type from user agent
    let deviceType = "unknown";
    if (
      userAgent.includes("Mobile") ||
      userAgent.includes("Android") ||
      userAgent.includes("iPhone")
    ) {
      deviceType = "mobile";
    } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
      deviceType = "tablet";
    } else if (
      userAgent.includes("Windows") ||
      userAgent.includes("Macintosh") ||
      userAgent.includes("Linux")
    ) {
      deviceType = "desktop";
    }

    // Update QR code analytics
    const qrCode = await QRCode.findById(qrCodeId);
    if (!qrCode) return null;

    // Increment scan count
    qrCode.analytics.scanCount += 1;
    qrCode.analytics.lastScanned = new Date();

    // Add scan location
    if (country || city) {
      qrCode.analytics.scanLocations.push({
        country,
        city,
        timestamp: new Date(),
      });
    }

    // Update device type counts
    const deviceIndex = qrCode.analytics.devices.findIndex(
      (d) => d.type === deviceType
    );
    if (deviceIndex >= 0) {
      qrCode.analytics.devices[deviceIndex].count += 1;
    } else {
      qrCode.analytics.devices.push({
        type: deviceType,
        count: 1,
      });
    }

    // Check if QR code has reached max scans
    if (
      qrCode.security.maxScans &&
      qrCode.analytics.scanCount >= qrCode.security.maxScans
    ) {
      qrCode.isExpired = true;
    }

    await qrCode.save();
    return qrCode;
  } catch (error) {
    console.error("Error recording scan:", error);
    return null;
  }
};

// Check if a QR code has expired
const isQrCodeExpired = (qrCode) => {
  if (!qrCode) return true;

  // Check if explicitly marked as expired
  if (qrCode.isExpired) return true;

  // Check expiration date
  if (
    qrCode.security.expiresAt &&
    new Date() > new Date(qrCode.security.expiresAt)
  ) {
    return true;
  }

  // Check max scans
  if (
    qrCode.security.maxScans &&
    qrCode.analytics.scanCount >= qrCode.security.maxScans
  ) {
    return true;
  }

  return false;
};

// Get analytics for a QR code or user
const getAnalytics = async (qrCodeId = null, userId = null) => {
  try {
    let query = {};

    if (qrCodeId) {
      query = { _id: qrCodeId };
    } else if (userId) {
      query = { userId };
    } else {
      return null;
    }

    const qrCodes = await QRCode.find(query);

    // For a single QR code
    if (qrCodeId) {
      return qrCodes[0]?.analytics || null;
    }

    // For all user's QR codes
    const analytics = {
      totalQrCodes: qrCodes.length,
      totalScans: 0,
      scansByDate: {},
      scansByDevice: {},
      scansByLocation: {},
      mostScanned: null,
    };

    let maxScans = 0;

    qrCodes.forEach((qr) => {
      // Count total scans
      analytics.totalScans += qr.analytics.scanCount || 0;

      // Find most scanned QR code
      if ((qr.analytics.scanCount || 0) > maxScans) {
        maxScans = qr.analytics.scanCount;
        analytics.mostScanned = {
          id: qr._id,
          text: qr.text,
          scanCount: qr.analytics.scanCount,
        };
      }

      // Count scans by device
      (qr.analytics.devices || []).forEach((device) => {
        if (!analytics.scansByDevice[device.type]) {
          analytics.scansByDevice[device.type] = 0;
        }
        analytics.scansByDevice[device.type] += device.count;
      });

      // Count scans by location
      (qr.analytics.scanLocations || []).forEach((location) => {
        const key = location.country || "Unknown";
        if (!analytics.scansByLocation[key]) {
          analytics.scansByLocation[key] = 0;
        }
        analytics.scansByLocation[key] += 1;
      });
    });

    return analytics;
  } catch (error) {
    console.error("Error getting analytics:", error);
    return null;
  }
};

module.exports = {
  createTrackingUrl,
  recordScan,
  isQrCodeExpired,
  getAnalytics,
};
