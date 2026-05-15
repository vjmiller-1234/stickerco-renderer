const sharp = require("sharp");

// ============================================================
// CONFIG
// ============================================================
const CANVAS_SIZE    = 400;   // base canvas in pixels
const OUTLINE_WIDTH  = 3;     // black outline in pixels
const OFFSET_WIDTH   = 15;    // white bleed around sticker shape
const ALLOWED_ORIGIN = "*";   // restrict to your Roblox game domain in production

// ============================================================
// HELPERS
// ============================================================

// Convert rbxassetid://123 or plain number to Roblox CDN URL
function assetIdToUrl(assetId) {
  if (!assetId) return null;
  const id = String(assetId).replace("rbxassetid://", "").trim();
  if (!id || id === "0" || id === "") return null;
  // Use the v2 asset delivery endpoint which is more reliable
  return `https://assetdelivery.roblox.com/v2/asset/?id=${id}`;
}

// Fetch an image from a URL and return as a Buffer
async function fetchImage(url) {
  // Roblox asset delivery redirects to a CDN URL — we need to follow it
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; StickerCoRenderer/1.0)",
      "Accept": "image/png,image/jpeg,image/*,*/*",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url} — ${response.status}`);
  }

  // Verify we actually got an image back
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("image")) {
    throw new Error(`Expected image but got ${contentType} from ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length < 100) {
    throw new Error(`Image buffer too small (${buffer.length} bytes) — likely an error page`);
  }

  return buffer;
}

// Build a GameData element lookup from the elementId
// Maps short IDs like "pink-white-mushroom" to their Roblox asset IDs
// This must stay in sync with GameData.DesignElements in Roblox
const ELEMENT_IMAGE_MAP = {
  "yellow-spotted-mushroom":    "131682077817131",
  "pink-white-mushroom":        "76025735581020",
  "blue-mushroom":              "105871797208797",
  "tall-pine-tree":             "110090071326520",
  "sun":                        "125698818774994",
  "pot-of-flowers-transparent": "109399409794572",
};

function resolveAssetId(elem) {
  // Try elementId short name first
  if (elem.elementId && ELEMENT_IMAGE_MAP[elem.elementId]) {
    return ELEMENT_IMAGE_MAP[elem.elementId];
  }
  // Try elemId (alternate field name)
  if (elem.elemId && ELEMENT_IMAGE_MAP[elem.elemId]) {
    return ELEMENT_IMAGE_MAP[elem.elemId];
  }
  // Fall back to raw assetId if provided
  if (elem.assetId) {
    return String(elem.assetId).replace("rbxassetid://", "");
  }
  return null;
}

// ============================================================
// RENDER PIPELINE
// ============================================================
async function renderSticker(composition) {
  const canvasW = (composition.canvasSize && composition.canvasSize[0]) || CANVAS_SIZE;
  const canvasH = (composition.canvasSize && composition.canvasSize[1]) || CANVAS_SIZE;

  const elements = composition.elements || [];

  // Step 1 — Process each element into a positioned, transformed layer
  const layers = [];

  for (const elem of elements) {
    const assetId = resolveAssetId(elem);
    if (!assetId) continue;

    const url = assetIdToUrl(assetId);
    if (!url) continue;

    let imageBuffer;
    try {
      imageBuffer = await fetchImage(url);
    } catch (err) {
      console.error(`Skipping element ${assetId} (url: ${url}): ${err.message}`);
      continue;
    }

    // Determine display size in pixels
    // sizeScale is 0-1 fraction of canvas, default 0.25
    const sizeScale = elem.sizeScale || elem.scale || 0.25;
    const sizePx    = Math.round(sizeScale * canvasW);
    if (sizePx < 1) continue;

    // Position: posX/posY are 0-1 fractions, 0.5 = centre
    const posX = elem.posX || elem.x || 0.5;
    const posY = elem.posY || elem.y || 0.5;

    // Top-left corner of the element
    const topLeftX = Math.round(posX * canvasW - sizePx / 2);
    const topLeftY = Math.round(posY * canvasH - sizePx / 2);

    const rotation  = elem.rotation || 0;
    const flipH     = elem.flipH || elem.flipped || false;
    const flipV     = elem.flipV || false;

    try {
      // Resize the source image to the display size
      let img = sharp(imageBuffer)
        .resize(sizePx, sizePx, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        });

      // Apply flips before rotation
      if (flipH) img = img.flop();   // horizontal flip
      if (flipV) img = img.flip();   // vertical flip

      // Apply rotation (sharp rotates around centre, fills with transparent)
      if (rotation !== 0) {
        img = img.rotate(rotation, {
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        });
      }

      const processedBuffer = await img.png().toBuffer();

      // Get actual dimensions after rotation (rotation can change bounding box)
      const meta      = await sharp(processedBuffer).metadata();
      const actualW   = meta.width;
      const actualH   = meta.height;

      // Re-centre after rotation: the bounding box may have grown
      const adjustedX = Math.round(posX * canvasW - actualW / 2);
      const adjustedY = Math.round(posY * canvasH - actualH / 2);

      layers.push({
        input:  processedBuffer,
        left:   adjustedX,
        top:    adjustedY,
      });
    } catch (err) {
      console.warn(`Failed to process element ${assetId}:`, err.message);
      continue;
    }
  }

  if (layers.length === 0) {
    // Return a transparent 400x400 PNG if no elements rendered
    return await sharp({
      create: {
        width:      canvasW,
        height:     canvasH,
        channels:   4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).png().toBuffer();
  }

  // Step 2 — Composite all layers onto a transparent canvas
  const composited = await sharp({
    create: {
      width:      canvasW,
      height:     canvasH,
      channels:   4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
  .composite(layers)
  .png()
  .toBuffer();

  // Step 3 — Extract the alpha mask from the composited image
  // We use this to generate the white offset and black outline
  const { data: rawData, info } = await sharp(composited)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Step 4 — Build white offset mask by dilating the alpha channel
  // For each pixel, check if any pixel within OFFSET_WIDTH radius has alpha > 0
  const totalPixels  = width * height;
  const offsetMask   = new Uint8Array(totalPixels);
  const outlineMask  = new Uint8Array(totalPixels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx   = y * width + x;
      const alpha = rawData[idx * channels + 3];
      if (alpha > 10) {
        // Mark all pixels within OFFSET_WIDTH as part of the offset
        const r = OFFSET_WIDTH + OUTLINE_WIDTH;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            const nx   = x + dx;
            const ny   = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nIdx = ny * width + nx;
            if (dist <= r)             outlineMask[nIdx] = 255;
            if (dist <= OFFSET_WIDTH)  offsetMask[nIdx]  = 255;
          }
        }
      }
    }
  }

  // Step 5 — Build the final image:
  // Layer order (bottom to top):
  //   1. Black outline (outlineMask minus offsetMask)
  //   2. White offset (offsetMask)
  //   3. Original composited elements
  const finalData = Buffer.alloc(totalPixels * 4);

  for (let i = 0; i < totalPixels; i++) {
    const isOutline = outlineMask[i] > 0 && offsetMask[i] === 0;
    const isOffset  = offsetMask[i] > 0;

    const origAlpha = rawData[i * channels + 3];
    const hasOrig   = origAlpha > 10;

    if (hasOrig) {
      // Original pixel — use as-is
      finalData[i * 4]     = rawData[i * channels];
      finalData[i * 4 + 1] = rawData[i * channels + 1];
      finalData[i * 4 + 2] = rawData[i * channels + 2];
      finalData[i * 4 + 3] = origAlpha;
    } else if (isOffset) {
      // White bleed area
      finalData[i * 4]     = 255;
      finalData[i * 4 + 1] = 255;
      finalData[i * 4 + 2] = 255;
      finalData[i * 4 + 3] = 255;
    } else if (isOutline) {
      // Black outline
      finalData[i * 4]     = 0;
      finalData[i * 4 + 1] = 0;
      finalData[i * 4 + 2] = 0;
      finalData[i * 4 + 3] = 255;
    } else {
      // Transparent
      finalData[i * 4 + 3] = 0;
    }
  }

  // Convert back to PNG
  const finalPng = await sharp(finalData, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();

  return finalPng;
}

// ============================================================
// VERCEL HANDLER
// ============================================================
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin",  ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Basic auth check — add a secret key to prevent abuse
  const authHeader = req.headers["authorization"];
  const SECRET_KEY = process.env.RENDER_SECRET_KEY;
  if (SECRET_KEY && authHeader !== `Bearer ${SECRET_KEY}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const composition = body && body.composition;
  if (!composition) {
    return res.status(400).json({ error: "Missing composition in request body" });
  }

  try {
    console.log(`[render] Rendering sticker with ${
      (composition.elements || []).length} element(s)`);

    const pngBuffer = await renderSticker(composition);

    // Return as base64 so Roblox HttpService can handle it
    const base64 = pngBuffer.toString("base64");

    return res.status(200).json({
      success:   true,
      imageData: base64,
      format:    "png",
      size:      pngBuffer.length,
    });
  } catch (err) {
    console.error("[render] Error:", err);
    return res.status(500).json({
      error:   "Render failed",
      message: err.message,
    });
  }
}
