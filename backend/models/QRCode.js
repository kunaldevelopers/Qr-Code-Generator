const mongoose = require("mongoose");

const qrCodeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  qrImage: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // New fields for enhanced features
  qrType: {
    type: String,
    enum: [
      "url",
      "text",
      "vcard",
      "wifi",
      "email",
      "sms",
      "geo",
      "event",
      "phone",
    ],
    default: "url",
  },
  customization: {
    color: { type: String, default: "#000000" },
    backgroundColor: { type: String, default: "#ffffff" },
    logo: { type: String, default: null },
    margin: { type: Number, default: 4 },
  },
  analytics: {
    scanCount: { type: Number, default: 0 },
    lastScanned: { type: Date },
    scanLocations: [
      {
        country: String,
        city: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    devices: [
      {
        type: String,
        count: Number,
      },
    ],
  },
  security: {
    password: { type: String },
    isPasswordProtected: { type: Boolean, default: false },
    expiresAt: { type: Date },
    maxScans: { type: Number },
  },
  tags: [String],
  isExpired: { type: Boolean, default: false },
});

module.exports = mongoose.model("QRCode", qrCodeSchema);
