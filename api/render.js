const sharp = require("sharp");

// ============================================================
// CONFIG
// ============================================================
const CANVAS_SIZE    = 400;
const OUTLINE_WIDTH  = 3;
const OFFSET_WIDTH   = 15;
const ALLOWED_ORIGIN = "*";

// ============================================================
// ELEMENT IMAGE MAP
// Maps element IDs to filenames in /public/elements/
// Must stay in sync with GameData.DesignElements in Roblox
// ============================================================
const ELEMENT_IMAGE_MAP = {
  "yellow-spotted-mushroom":    "yellow-spotted-mushroom.png",
  "pink-white-mushroom":        "pink-white-mushroom.png",
  "blue-mushroom":              "blue-mushroom.png",
  "tall-pine-tree":             "tall-pine-tree.png",
  "sun":                        "sun.png",
  "pot-of-flowers-transparent": "pot-of-flowers-transparent.png",
};

// Base URL for static assets — set from environment variable
// VERCEL_URL is automatically set by Vercel on deployment
const BASE_URL = process.env.ASSET_BASE_URL || "http://localhost:3000";

// ============================================================
// HELPERS
// ============================================================

function resolveImageUrl(elem) {
  const key = elem.elementId || elem.elemId;
  if (key && ELEMENT_IMAGE_MAP[key]) {
    return `${BASE_URL}/elements/${ELEMENT_IMAGE_MAP[key]}`;
  }
  return null;
}

async function fetchImage(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "StickerCoRenderer/1.0",
      "Accept":     "image/png,image/jpeg,image/*,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url} — ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("image")) {
    throw new Error(`Expected image but got ${contentType} from ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);

  if (buffer.length < 100) {
    throw new Error(`Image buffer too small (${buffer.length} bytes)`);
  }

  return buffer;
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
    const url = resolveImageUrl(elem);
    console.log(`[render] Element: ${elem.elementId || elem.elemId}, URL: ${url}, BASE_URL: ${BASE_URL}`);
    if (!url) {
      console.warn(`No image mapping found for element:`,
        elem.elementId || elem.elemId || "unknown");
      continue;
    }

    let imageBuffer;
    try {
      imageBuffer = await fetchImage(url);
    } catch (err) {
      console.error(`Skipping element (url: ${url}): ${err.message}`);
      continue;
    }

    // sizeScale is 0-1 fraction of canvas, default 0.25
    const sizeScale = elem.sizeScale || elem.scale || 0.25;
    const sizePx    = Math.round(sizeScale * canvasW);
    if (sizePx < 1) continue;

    // posX/posY are 0-1 fractions, 0.5 = centre
    const posX = elem.posX || elem.x || 0.5;
    const posY = elem.posY || elem.y || 0.5;

    const rotation = elem.rotation || 0;
    const flipH    = elem.flipH || elem.flipped || false;
    const flipV    = elem.flipV || false;

    try {
      // Resize the source image to the display size
      let img = sharp(imageBuffer)
        .resize(sizePx, sizePx, {
          fit:        "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        });

      // Apply flips before rotation
      if (flipH) img = img.flop();
      if (flipV) img = img.flip();

      // Apply rotation
      if (rotation !== 0) {
        img = img.rotate(rotation, {
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        });
      }

      const processedBuffer = await img.png().toBuffer();

      // Get actual dimensions after rotation (bounding box may have grown)
      const meta   = await sharp(processedBuffer).metadata();
      const actualW = meta.width;
      const actualH = meta.height;

      // Re-centre after rotation
      const adjustedX = Math.round(posX * canvasW - actualW / 2);
      const adjustedY = Math.round(posY * canvasH - actualH / 2);

      layers.push({
        input: processedBuffer,
        left:  adjustedX,
        top:   adjustedY,
      });
    } catch (err) {
      console.warn(`Failed to process element (url: ${url}):`, err.message);
      continue;
    }
  }

  if (layers.length === 0) {
    console.warn("[render] No layers rendered — returning transparent canvas");
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

  // Step 3 — Extract raw pixel data for mask generation
  const { data: rawData, info } = await sharp(composited)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Step 4 — Build white offset and black outline masks
  // by dilating the alpha channel outward
  const totalPixels = width * height;
  const offsetMask  = new Uint8Array(totalPixels);
  const outlineMask = new Uint8Array(totalPixels);
  const r           = OFFSET_WIDTH + OUTLINE_WIDTH;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = rawData[(y * width + x) * channels + 3];
      if (alpha <= 10) continue;

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          const nx   = x + dx;
          const ny   = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (dist <= r)            outlineMask[nIdx] = 255;
          if (dist <= OFFSET_WIDTH) offsetMask[nIdx]  = 255;
        }
      }
    }
  }

  // Step 5 — Compose final image
  // Layer order bottom to top:
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
      finalData[i * 4]     = rawData[i * channels];
      finalData[i * 4 + 1] = rawData[i * channels + 1];
      finalData[i * 4 + 2] = rawData[i * channels + 2];
      finalData[i * 4 + 3] = origAlpha;
    } else if (isOffset) {
      finalData[i * 4]     = 255;
      finalData[i * 4 + 1] = 255;
      finalData[i * 4 + 2] = 255;
      finalData[i * 4 + 3] = 255;
    } else if (isOutline) {
      finalData[i * 4]     = 0;
      finalData[i * 4 + 1] = 0;
      finalData[i * 4 + 2] = 0;
      finalData[i * 4 + 3] = 255;
    } else {
      finalData[i * 4 + 3] = 0;
    }
  }

  return await sharp(finalData, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

// ============================================================
// VERCEL HANDLER
// ============================================================
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
      (composition.elements || []).length} element(s) — BASE_URL: ${BASE_URL}`);

    const pngBuffer = await renderSticker(composition);

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
