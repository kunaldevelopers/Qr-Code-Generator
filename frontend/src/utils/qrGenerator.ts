import QRCode from "qrcode";

interface CustomizationOptions {
  color: string;
  backgroundColor: string;
  margin: number;
  logo?: string | null;
}

/**
 * Generates a QR code with optional logo in the center
 *
 * @param content The content to encode in the QR code
 * @param options Customization options for the QR code
 * @returns Promise resolving to a data URL of the generated QR code
 */
export async function generateQRWithLogo(
  content: string,
  options: CustomizationOptions
): Promise<string> {
  // First generate a QR code with increased error correction level
  // This helps ensure the QR code remains scannable even with a logo
  const qrCodeDataUrl = await QRCode.toDataURL(content, {
    margin: options.margin,
    width: 300,
    errorCorrectionLevel: "H", // Highest error correction level (30%)
    color: {
      dark: options.color,
      light: options.backgroundColor,
    },
  });

  // If no logo is provided, return the regular QR code
  if (!options.logo) {
    return qrCodeDataUrl;
  }

  // Create a canvas to combine QR code and logo
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Return early if canvas context couldn't be created
  if (!ctx) {
    console.error("Could not get canvas context");
    return qrCodeDataUrl;
  }

  // Load the QR code image
  const qrImage = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImage.onload = () => resolve();
    qrImage.onerror = () => reject(new Error("Failed to load QR code image"));
    qrImage.src = qrCodeDataUrl;
  });

  // Set canvas size to QR code size
  canvas.width = qrImage.width;
  canvas.height = qrImage.height;

  // Draw the QR code on the canvas
  ctx.drawImage(qrImage, 0, 0);

  // Create an offscreen canvas to analyze QR code structure
  const analyzerCanvas = document.createElement("canvas");
  const analyzerCtx = analyzerCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  if (!analyzerCtx) {
    console.error("Could not create analyzer context");
    return qrCodeDataUrl;
  }

  analyzerCanvas.width = qrImage.width;
  analyzerCanvas.height = qrImage.height;
  analyzerCtx.drawImage(qrImage, 0, 0);

  // Calculate safe zone for logo placement
  // We need to avoid the three position detection patterns in the corners
  const moduleSize = qrImage.width / 33; // Approx size of one QR "module" (assuming v3 QR code)
  const positionPatternSize = moduleSize * 7; // Position patterns are 7x7 modules

  // Define safe zone (avoid position detection patterns)
  const safeZoneStart = positionPatternSize * 1.5;
  const safeZoneEnd = qrImage.width - positionPatternSize * 1.5;
  const safeZoneWidth = safeZoneEnd - safeZoneStart;

  // Load the logo image
  const logoImage = new Image();
  await new Promise<void>((resolve, reject) => {
    logoImage.onload = () => resolve();
    logoImage.onerror = () => reject(new Error("Failed to load logo image"));
    logoImage.src = options.logo as string;
  });

  // Calculate logo size to fit within safe zone
  // Make logo approximately 25% of the safe zone width
  const logoSize = Math.min(safeZoneWidth * 0.25, qrImage.width * 0.15);
  const logoX = (qrImage.width - logoSize) / 2;
  const logoY = (qrImage.height - logoSize) / 2;

  // Create white background with rounded corners for the logo
  const padding = moduleSize * 1.5;
  const bgSize = logoSize + padding * 2;
  const bgX = (qrImage.width - bgSize) / 2;
  const bgY = (qrImage.height - bgSize) / 2;

  ctx.fillStyle = options.backgroundColor || "#ffffff";

  // Draw rounded rectangle for logo background
  const cornerRadius = Math.min(8, logoSize * 0.15);
  ctx.beginPath();
  ctx.moveTo(bgX + cornerRadius, bgY);
  ctx.lineTo(bgX + bgSize - cornerRadius, bgY);
  ctx.arcTo(bgX + bgSize, bgY, bgX + bgSize, bgY + cornerRadius, cornerRadius);
  ctx.lineTo(bgX + bgSize, bgY + bgSize - cornerRadius);
  ctx.arcTo(
    bgX + bgSize,
    bgY + bgSize,
    bgX + bgSize - cornerRadius,
    bgY + bgSize,
    cornerRadius
  );
  ctx.lineTo(bgX + cornerRadius, bgY + bgSize);
  ctx.arcTo(bgX, bgY + bgSize, bgX, bgY + bgSize - cornerRadius, cornerRadius);
  ctx.lineTo(bgX, bgY + cornerRadius);
  ctx.arcTo(bgX, bgY, bgX + cornerRadius, bgY, cornerRadius);
  ctx.closePath();
  ctx.fill();

  // Draw the logo with rounded corners
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(logoX + cornerRadius, logoY);
  ctx.lineTo(logoX + logoSize - cornerRadius, logoY);
  ctx.arcTo(
    logoX + logoSize,
    logoY,
    logoX + logoSize,
    logoY + cornerRadius,
    cornerRadius
  );
  ctx.lineTo(logoX + logoSize, logoY + logoSize - cornerRadius);
  ctx.arcTo(
    logoX + logoSize,
    logoY + logoSize,
    logoX + logoSize - cornerRadius,
    logoY + logoSize,
    cornerRadius
  );
  ctx.lineTo(logoX + cornerRadius, logoY + logoSize);
  ctx.arcTo(
    logoX,
    logoY + logoSize,
    logoX,
    logoY + logoSize - cornerRadius,
    cornerRadius
  );
  ctx.lineTo(logoX, logoY + cornerRadius);
  ctx.arcTo(logoX, logoY, logoX + cornerRadius, logoY, cornerRadius);
  ctx.closePath();
  ctx.clip();

  // Draw the logo
  ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
  ctx.restore();

  // Return the complete QR code with logo
  return canvas.toDataURL("image/png");
}
