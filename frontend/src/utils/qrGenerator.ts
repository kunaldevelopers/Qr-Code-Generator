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
  // First generate the QR code without a logo
  const qrCodeDataUrl = await QRCode.toDataURL(content, {
    margin: options.margin,
    width: 300,
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

  // Load the logo image
  const logoImage = new Image();
  await new Promise<void>((resolve, reject) => {
    logoImage.onload = () => resolve();
    logoImage.onerror = () => reject(new Error("Failed to load logo image"));
    logoImage.src = options.logo as string;
  });
  // Calculate logo size (20% of QR code to ensure better readability)
  const logoSize = qrImage.width * 0.2;
  const logoX = (qrImage.width - logoSize) / 2;
  const logoY = (qrImage.height - logoSize) / 2;

  // Create white background with rounded corners for the logo
  const padding = 8;
  ctx.fillStyle = "white";

  // Draw rounded rectangle
  const cornerRadius = 10;
  ctx.beginPath();
  ctx.moveTo(logoX - padding + cornerRadius, logoY - padding);
  ctx.lineTo(logoX + logoSize + padding - cornerRadius, logoY - padding);
  ctx.arcTo(
    logoX + logoSize + padding,
    logoY - padding,
    logoX + logoSize + padding,
    logoY - padding + cornerRadius,
    cornerRadius
  );
  ctx.lineTo(
    logoX + logoSize + padding,
    logoY + logoSize + padding - cornerRadius
  );
  ctx.arcTo(
    logoX + logoSize + padding,
    logoY + logoSize + padding,
    logoX + logoSize + padding - cornerRadius,
    logoY + logoSize + padding,
    cornerRadius
  );
  ctx.lineTo(logoX - padding + cornerRadius, logoY + logoSize + padding);
  ctx.arcTo(
    logoX - padding,
    logoY + logoSize + padding,
    logoX - padding,
    logoY + logoSize + padding - cornerRadius,
    cornerRadius
  );
  ctx.lineTo(logoX - padding, logoY - padding + cornerRadius);
  ctx.arcTo(
    logoX - padding,
    logoY - padding,
    logoX - padding + cornerRadius,
    logoY - padding,
    cornerRadius
  );
  ctx.closePath();
  ctx.fill();

  // Draw the logo with rounded corners if possible
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
