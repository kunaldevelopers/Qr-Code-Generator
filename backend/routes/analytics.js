/**
 * Routes for QR code analytics and tracking
 */

const express = require("express");
const router = express.Router();
const QRCode = require("../models/QRCode");
const authMiddleware = require("../middleware/auth");
const {
  recordScan,
  getAnalytics,
  isQrCodeExpired,
} = require("../utils/analytics");

// Track QR code scan (no auth required)
router.get("/track/:qrCodeId/:trackingId", async (req, res) => {
  try {
    const { qrCodeId, trackingId } = req.params;

    // First check if QR code exists
    const qrCode = await QRCode.findById(qrCodeId);

    if (!qrCode) {
      return res.status(404).json({ error: "QR code not found" });
    }

    // Check security before recording scan
    if (isQrCodeExpired(qrCode)) {
      return res.json({
        expired: true,
        message: "This QR code has expired",
      });
    }

    // Record scan with available data
    const scanData = {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      referer: req.headers.referer,
      country: "Unknown",
      city: "Unknown",
    };

    const updatedQrCode = await recordScan(qrCodeId, scanData);

    if (!updatedQrCode) {
      return res.json({
        expired: true,
        message: "This QR code has expired or reached maximum scans",
      });
    }

    if (updatedQrCode.security.isPasswordProtected) {
      return res.json({
        requiresPassword: true,
        qrCodeId,
        trackingId,
      });
    }

    res.json({
      success: true,
      qrCode: {
        text: updatedQrCode.text,
        type: updatedQrCode.qrType,
        analytics: {
          scanCount: updatedQrCode.analytics.scanCount,
          maxScans: updatedQrCode.security.maxScans || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error tracking scan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify password for password-protected QR code
router.post("/verify-password/:qrCodeId", async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    const { password } = req.body;

    const qrCode = await QRCode.findById(qrCodeId);

    if (!qrCode) {
      return res.status(404).json({ error: "QR code not found" });
    }

    // First check expiration
    if (isQrCodeExpired(qrCode)) {
      return res.json({
        expired: true,
        message: "This QR code has expired or reached maximum scans",
      });
    }

    // Handle password check
    if (qrCode.security.isPasswordProtected) {
      if (!password) {
        return res.status(401).json({ error: "Password is required" });
      }
      if (qrCode.security.password !== password) {
        return res.status(401).json({ error: "Invalid password" });
      }

      // Record scan after successful password verification
      await recordScan(qrCodeId, {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        referer: req.headers.referer,
      });
    }

    // Return success and the original destination URL
    res.json({
      success: true,
      redirectUrl: qrCode.text, // Return the original destination URL
      qrCode: {
        text: qrCode.text,
        type: qrCode.qrType,
        analytics: {
          scanCount: qrCode.analytics.scanCount,
          maxScans: qrCode.security.maxScans || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error verifying password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get analytics for all user's QR codes (requires auth)
router.get("/analytics", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const analytics = await getAnalytics(null, userId);

    if (!analytics) {
      return res.status(404).json({ error: "No analytics found" });
    }

    res.json(analytics);
  } catch (error) {
    console.error("Error getting analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get analytics for a specific QR code (requires auth)
router.get("/analytics/:qrCodeId", authMiddleware, async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    const userId = req.user.userId;

    // First check if QR code belongs to the user
    const qrCode = await QRCode.findOne({ _id: qrCodeId, userId });

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    const analytics = await getAnalytics(qrCodeId);

    if (!analytics) {
      return res
        .status(404)
        .json({ error: "No analytics found for this QR code" });
    }

    res.json(analytics);
  } catch (error) {
    console.error("Error getting QR code analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
