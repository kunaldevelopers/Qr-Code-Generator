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

    // Record scan with available data
    const scanData = {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      referer: req.headers.referer,
      // In a real implementation, you would use a geolocation service
      // to determine country and city from the IP address
      country: "Unknown",
      city: "Unknown",
    };

    const qrCode = await recordScan(qrCodeId, scanData);

    if (!qrCode) {
      return res.status(404).json({ error: "QR code not found" });
    }

    // Check if QR code is password protected
    if (qrCode.security.isPasswordProtected) {
      return res.json({
        requiresPassword: true,
        qrCodeId,
        trackingId,
      });
    }

    // Check if QR code is expired
    if (isQrCodeExpired(qrCode)) {
      return res.json({
        expired: true,
        message: "This QR code has expired",
      });
    }

    // Redirect to the QR code's destination
    // In a real implementation, you would redirect to the original URL
    // For now, just return the data
    res.json({
      success: true,
      qrCode: {
        text: qrCode.text,
        type: qrCode.qrType,
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

    // Check if QR code is password protected
    if (!qrCode.security.isPasswordProtected) {
      return res.json({ success: true, qrCode: { text: qrCode.text } });
    }

    // Check password
    if (qrCode.security.password !== password) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Check if QR code is expired
    if (isQrCodeExpired(qrCode)) {
      return res.json({
        expired: true,
        message: "This QR code has expired",
      });
    }

    // Return QR code data
    res.json({
      success: true,
      qrCode: {
        text: qrCode.text,
        type: qrCode.qrType,
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
