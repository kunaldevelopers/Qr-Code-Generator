/**
 * Routes for QR code generation and management
 */

const express = require("express");
const router = express.Router();
const QRCode = require("../models/QRCode");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const qrTypeFormatter = require("../utils/qrTypeFormatter");
const { createTrackingUrl } = require("../utils/analytics");

// Configure file upload for logos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/logos");
    fs.ensureDirSync(uploadDir); // Create directory if it doesn't exist
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "logo-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 2 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg/;
    const ext = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) {
      return cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and SVG files are allowed"));
    }
  },
});

// Get all QR codes for a user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const qrCodes = await QRCode.find({ userId }).sort({ createdAt: -1 });
    res.json(qrCodes);
  } catch (error) {
    console.error("Error getting QR codes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a specific QR code
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const qrCode = await QRCode.findOne({ _id: id, userId });

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    res.json(qrCode);
  } catch (error) {
    console.error("Error getting QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new QR code
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      text,
      qrImage,
      qrType = "url",
      customization = {},
      security = {},
      tags = [],
    } = req.body;

    // Create the QR code
    const qrCode = new QRCode({
      userId,
      text,
      qrImage,
      qrType,
      customization,
      security,
      tags,
    });

    await qrCode.save();
    res.status(201).json(qrCode);
  } catch (error) {
    console.error("Error creating QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upload logo for QR code
router.post(
  "/upload-logo",
  authMiddleware,
  upload.single("logo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No logo file uploaded" });
      }

      // Return the path to the uploaded logo
      const logoPath = `/uploads/logos/${req.file.filename}`;
      res.json({ logoPath });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Format content based on QR type
router.post("/format-content", authMiddleware, async (req, res) => {
  try {
    const { qrType, data } = req.body;

    let formattedContent = "";

    switch (qrType) {
      case "vcard":
        formattedContent = qrTypeFormatter.formatVCard(data);
        break;
      case "wifi":
        formattedContent = qrTypeFormatter.formatWifi(data);
        break;
      case "email":
        formattedContent = qrTypeFormatter.formatEmail(data);
        break;
      case "sms":
        formattedContent = qrTypeFormatter.formatSMS(data);
        break;
      case "geo":
        formattedContent = qrTypeFormatter.formatGeo(data);
        break;
      case "event":
        formattedContent = qrTypeFormatter.formatEvent(data);
        break;
      default:
        formattedContent = data.text || "";
    }

    res.json({ formattedContent });
  } catch (error) {
    console.error("Error formatting content:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a QR code
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updateData = req.body;

    // Prevent updating userId
    delete updateData.userId;

    const qrCode = await QRCode.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    res.json(qrCode);
  } catch (error) {
    console.error("Error updating QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a QR code
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const qrCode = await QRCode.findOneAndDelete({ _id: id, userId });

    if (!qrCode) {
      return res
        .status(404)
        .json({ error: "QR code not found or unauthorized" });
    }

    res.json({ message: "QR code deleted successfully" });
  } catch (error) {
    console.error("Error deleting QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Bulk operations - create multiple QR codes
router.post("/bulk", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { qrCodes } = req.body;

    if (!Array.isArray(qrCodes) || qrCodes.length === 0) {
      return res.status(400).json({ error: "No QR codes provided" });
    }

    // Add userId to each QR code
    const qrCodesWithUserId = qrCodes.map((qr) => ({
      ...qr,
      userId,
    }));

    // Create all QR codes
    const createdQrCodes = await QRCode.insertMany(qrCodesWithUserId);
    res.status(201).json(createdQrCodes);
  } catch (error) {
    console.error("Error creating bulk QR codes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Bulk operations - delete multiple QR codes
router.delete("/bulk", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No QR code IDs provided" });
    }

    const result = await QRCode.deleteMany({
      _id: { $in: ids },
      userId,
    });

    res.json({
      message: "QR codes deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting bulk QR codes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
