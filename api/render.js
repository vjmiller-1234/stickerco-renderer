const sharp = require("sharp");

// ============================================================
// CONFIG
// ============================================================
const CANVAS_SIZE    = 400;
const OUTLINE_WIDTH  = 3;
const OFFSET_WIDTH   = 15;
const ALLOWED_ORIGIN = "*";

const TRIM_PADDING_FRACTION = 0.08;
const MIN_CONTENT_SIZE = 200;

const ELEMENT_IMAGE_MAP = {
  "yellow-spotted-mushroom":    "yellow-spotted-mushroom.png",
  "pink-white-mushroom":        "pink-white-mushroom.png",
  "blue-mushroom":              "blue-mushroom.png",
  "tall-pine-tree":             "tall-pine-tree.png",
  "sun":                        "sun.png",
  "pot-of-flowers-transparent": "pot-of-flowers-transparent.png",
  "Mermaids-Coral":             "Mermaids-Coral.png",
  "Mermaids-BlueGirlMermaid":   "Mermaids-BlueGirlMermaid.png",
  "Mermaids-Bubbles":           "Mermaids-Bubbles.png",
  "Mermaids-Castle":            "Mermaids-Castle.png",
  "Mermaids-ColorfulFish":      "Mermaids-ColorfulFish.png",
  "Mermaids-Jellyfish":         "Mermaids-Jellyfish.png",
  "Mermaids-Seahorse":          "Mermaids-Seahorse.png",
  "Mermaids-Seashell":          "Mermaids-Seashell.png",
  "Mermaids-Seaweed":           "Mermaids-Seaweed.png",
  "Mermaids-Starfish":          "Mermaids-Starfish.png",
  "Mermaids-TreasureChest":     "Mermaids-TreasureChest.png",
  "Mermaids-Wave":              "Mermaids-Wave.png",
  "FairyGarden-Bird":           "FairyGarden-Bird.png",
  "FairyGarden-Butterfly":      "FairyGarden-Butterfly.png",
  "FairyGarden-Bunny":          "FairyGarden-Bunny.png",
  "FairyGarden-Fairy":          "FairyGarden-Fairy.png",
  "FairyGarden-FairyCastle":    "FairyGarden-FairyCastle.png",
  "FairyGarden-FrogPrince":     "FairyGarden-FrogPrince.png",
  "FairyGarden-Gnome":          "FairyGarden-Gnome.png",
  "FairyGarden-MushroomHouse":  "FairyGarden-MushroomHouse.png",
  "FairyGarden-PurpleFlower":   "FairyGarden-PurpleFlower.png",
  "FairyGarden-Snail":          "FairyGarden-Snail.png",
  "FairyGarden-Wand":           "FairyGarden-Wand.png",
  "FairyGarden-YellowFlower":   "FairyGarden-YellowFlower.png",
  "BasicBackgroundShapes-Explosion":      "BasicBackgroundShapes-Explosion.png",
  "BasicBackgroundShapes-FancyRectangle": "BasicBackgroundShapes-FancyRectangle.png",
  "BasicBackgroundShapes-FancySquare":    "BasicBackgroundShapes-FancySquare.png",
  "BasicBackgroundShapes-SpeechBubble":   "BasicBackgroundShapes-SpeechBubble.png",
  "BasicBackgroundShapes-Cloud":          "BasicBackgroundShapes-Cloud.png",
  "BasicBackgroundShapes-Star":           "BasicBackgroundShapes-Star.png",
  "BasicBackgroundShapes-Heart":          "BasicBackgroundShapes-Heart.png",
  "BasicBackgroundShapes-Oval":           "BasicBackgroundShapes-Oval.png",
  "BasicBackgroundShapes-Hexagon":        "BasicBackgroundShapes-Hexagon.png",
  "BasicBackgroundShapes-Rectangle":      "BasicBackgroundShapes-Rectangle.png",
  "BasicBackgroundShapes-Square":         "BasicBackgroundShapes-Square.png",
  "BasicBackgroundShapes-Circle":         "BasicBackgroundShapes-Circle.png",
  "KawaiiIceCream-BearCone":              "KawaiiIceCream-BearCone.png",
  "KawaiiIceCream-CatCone":               "KawaiiIceCream-CatCone.png",
  "KawaiiIceCream-IceCreamCone":          "KawaiiIceCream-IceCreamCone.png",
  "KawaiiIceCream-MacarronPopsicle":      "KawaiiIceCream-MacarronPopsicle.png",
  "KawaiiIceCream-MintPopsicle":          "KawaiiIceCream-MintPopsicle.png",
  "KawaiiIceCream-PandaPopsicle":         "KawaiiIceCream-PandaPopsicle.png",
  "KawaiiIceCream-RainbowCone":           "KawaiiIceCream-RainbowCone.png",
  "KawaiiIceCream-RainbowPopsicle":       "KawaiiIceCream-RainbowPopsicle.png",
  "KawaiiIceCream-StrawberryCone":        "KawaiiIceCream-StrawberryCone.png",
  "KawaiiIceCream-Sundae":                "KawaiiIceCream-Sundae.png",
  "KawaiiIceCream-WaffleBowl":            "KawaiiIceCream-WaffleBowl.png",
  "KawaiiIceCream-WatermelonPopsicle":    "KawaiiIceCream-WatermelonPopsicle.png",
  "Beach-BeachBall":                      "Beach-BeachBall.png",
  "Beach-Bucket":                         "Beach-Bucket.png",
  "Beach-Chair":                          "Beach-Chair.png",
  "Beach-Cloud":                          "Beach-Cloud.png",
  "Beach-PalmTree":                       "Beach-PalmTree.png",
  "Beach-Sand":                           "Beach-Sand.png",
  "Beach-SandCastle":                     "Beach-SandCastle.png",
  "Beach-Sun":                            "Beach-Sun.png",
  "Beach-Sunglasses":                     "Beach-Sunglasses.png",
  "Beach-Surfboard":                      "Beach-Surfboard.png",
  "Beach-Towel":                          "Beach-Towel.png",
  "Beach-Umbrella":                       "Beach-Umbrella.png",
};

const BASE_URL       = process.env.ASSET_BASE_URL || "http://localhost:3000";
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const CREATOR_ID     = process.env.ROBLOX_CREATOR_ID;

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
// COLOR TINTING
// ============================================================
async function applyColorTint(pngBuffer, hexColor) {
  const normalised = hexColor.replace("#", "").toUpperCase();
  const tr = parseInt(normalised.slice(0, 2), 16);
  const tg = parseInt(normalised.slice(2, 4), 16);
  const tb = parseInt(normalised.slice(4, 6), 16);

  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];

    if (a === 0) {
      out[i * 4]     = 0;
      out[i * 4 + 1] = 0;
      out[i * 4 + 2] = 0;
      out[i * 4 + 3] = 0;
    } else {
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      out[i * 4]     = Math.round(tr * lum);
      out[i * 4 + 1] = Math.round(tg * lum);
      out[i * 4 + 2] = Math.round(tb * lum);
      out[i * 4 + 3] = a;
    }
  }

  return await sharp(out, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

// ============================================================
// AUTOCROP + REPAD
// ============================================================
async function autocropAndRepad(pngBuffer, targetSize) {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  let minX = width,  maxX = 0;
  let minY = height, maxY = 0;
  let hasContent = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * channels + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasContent = true;
      }
    }
  }

  if (!hasContent) {
    console.log("[render] Autocrop: no content found — returning original");
    return pngBuffer;
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  console.log(`[render] Autocrop: content bounding box ${contentW}×${contentH} at (${minX},${minY})`);

  const contentSize = Math.max(contentW, contentH);
  const padding     = Math.round(contentSize * TRIM_PADDING_FRACTION);

  const cropped = await sharp(pngBuffer)
    .extract({
      left:   Math.max(0, minX),
      top:    Math.max(0, minY),
      width:  Math.min(contentW, width  - minX),
      height: Math.min(contentH, height - minY),
    })
    .extend({
      top:        padding,
      bottom:     padding,
      left:       padding,
      right:      padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const croppedMeta  = await sharp(cropped).metadata();
  const croppedSize  = Math.max(croppedMeta.width, croppedMeta.height);
  const finalSize    = croppedSize < MIN_CONTENT_SIZE
    ? Math.min(targetSize, MIN_CONTENT_SIZE + padding * 2)
    : targetSize;

  const repadded = await sharp(cropped)
    .resize(finalSize, finalSize, {
      fit:        "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  console.log(`[render] Autocrop: repadded to ${finalSize}×${finalSize}`);
  return repadded;
}

// ============================================================
// PAPER FINISH EFFECTS
// Applied after white offset pass on the completed sticker.
// The sticker image content is never modified — only the white
// offset border area and transparent areas are affected.
// ============================================================

// Glossy — boosts saturation and contrast, adds soft white
// highlight in top-left corner to simulate light reflection
async function applyGlossy(pngBuffer) {
  const enhanced = await sharp(pngBuffer)
    .modulate({ saturation: 1.3, brightness: 1.05 })
    .png()
    .toBuffer();

  const { width, height } = await sharp(enhanced).metadata();
  const { data, info } = await sharp(enhanced)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out      = Buffer.alloc(width * height * 4);
  const channels = info.channels;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const a = data[i * channels + 3];

      if (a > 10) {
        const dist      = Math.sqrt((x / width) ** 2 + (y / height) ** 2);
        const highlight = Math.max(0, 1 - dist * 2.2) * 0.25;
        out[i * 4]     = Math.min(255, data[i * channels]     + highlight * 255);
        out[i * 4 + 1] = Math.min(255, data[i * channels + 1] + highlight * 255);
        out[i * 4 + 2] = Math.min(255, data[i * channels + 2] + highlight * 255);
        out[i * 4 + 3] = a;
      } else {
        out[i * 4 + 3] = 0;
      }
    }
  }

  return await sharp(out, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

// Kraft — replaces the white offset border AND transparent areas
// with a soft parchment/kraft paper color.
// RGB(245, 235, 215) — warm cream, like natural parchment paper.
// The sticker image content passes through unchanged.
async function applyKraft(pngBuffer) {
  const { width, height } = await sharp(pngBuffer).metadata();
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const out      = Buffer.alloc(width * height * 4);

  // Soft parchment/kraft color — warm cream, not dark tan
  const kraftR = 245, kraftG = 235, kraftB = 215;

  for (let i = 0; i < width * height; i++) {
    const origA = data[i * channels + 3];
    const origR = data[i * channels];
    const origG = data[i * channels + 1];
    const origB = data[i * channels + 2];

    if (origA <= 10) {
      // Fully transparent — fill with kraft color
      out[i * 4]     = kraftR;
      out[i * 4 + 1] = kraftG;
      out[i * 4 + 2] = kraftB;
      out[i * 4 + 3] = 255;
    } else {
      // Detect white offset pixels — high RGB values, full alpha
      const isWhiteOffset = origR > 200 && origG > 200 && origB > 200 && origA > 200;

      if (isWhiteOffset) {
        // Replace white offset with soft kraft parchment color
        out[i * 4]     = kraftR;
        out[i * 4 + 1] = kraftG;
        out[i * 4 + 2] = kraftB;
        out[i * 4 + 3] = 255;
      } else {
        // Sticker content — keep as-is
        out[i * 4]     = origR;
        out[i * 4 + 1] = origG;
        out[i * 4 + 2] = origB;
        out[i * 4 + 3] = origA;
      }
    }
  }

  return await sharp(out, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

// Holographic — applies rainbow gradient over the white offset
// area only, leaving the sticker image content untouched.
async function applyHolographic(pngBuffer) {
  const { width, height } = await sharp(pngBuffer).metadata();
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const out      = Buffer.alloc(width * height * 4);

  function hueToRgb(h) {
    h = h % 360;
    const s = 0.9, l = 0.65;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if      (h < 60)  { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i     = y * width + x;
      const origA = data[i * channels + 3];
      const origR = data[i * channels];
      const origG = data[i * channels + 1];
      const origB = data[i * channels + 2];

      if (origA <= 10) {
        out[i * 4 + 3] = 0;
        continue;
      }

      const isWhiteArea = origR > 200 && origG > 200 && origB > 200 && origA > 200;

      if (isWhiteArea) {
        const hue          = (x / width) * 360 + (y / height) * 120;
        const [hr, hg, hb] = hueToRgb(hue);
        const blend        = 0.35;
        out[i * 4]     = Math.round(origR * (1 - blend) + hr * blend);
        out[i * 4 + 1] = Math.round(origG * (1 - blend) + hg * blend);
        out[i * 4 + 2] = Math.round(origB * (1 - blend) + hb * blend);
        out[i * 4 + 3] = origA;
      } else {
        out[i * 4]     = origR;
        out[i * 4 + 1] = origG;
        out[i * 4 + 2] = origB;
        out[i * 4 + 3] = origA;
      }
    }
  }

  return await sharp(out, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

// Foil — metallic diagonal sweep on the white offset area.
// Gold: warm yellow-orange metallic bands.
// Silver: cool grey-white metallic bands.
async function applyFoil(pngBuffer, variant) {
  const { width, height } = await sharp(pngBuffer).metadata();
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const out      = Buffer.alloc(width * height * 4);

  const isGold = variant === "foil_gold";
  const hiR    = isGold ? 255 : 240;
  const hiG    = isGold ? 220 : 240;
  const hiB    = isGold ? 100 : 250;
  const shR    = isGold ? 180 : 160;
  const shG    = isGold ? 130 : 160;
  const shB    = isGold ? 30  : 175;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i     = y * width + x;
      const origA = data[i * channels + 3];
      const origR = data[i * channels];
      const origG = data[i * channels + 1];
      const origB = data[i * channels + 2];

      if (origA <= 10) {
        out[i * 4 + 3] = 0;
        continue;
      }

      const isWhiteArea = origR > 200 && origG > 200 && origB > 200 && origA > 200;

      if (isWhiteArea) {
        const t     = (x + y) / (width + height);
        const wave  = Math.sin(t * Math.PI * 6) * 0.5 + 0.5;
        const blend = 0.55;
        out[i * 4]     = Math.round(origR * (1 - blend) + (shR + (hiR - shR) * wave) * blend);
        out[i * 4 + 1] = Math.round(origG * (1 - blend) + (shG + (hiG - shG) * wave) * blend);
        out[i * 4 + 2] = Math.round(origB * (1 - blend) + (shB + (hiB - shB) * wave) * blend);
        out[i * 4 + 3] = origA;
      } else {
        out[i * 4]     = origR;
        out[i * 4 + 1] = origG;
        out[i * 4 + 2] = origB;
        out[i * 4 + 3] = origA;
      }
    }
  }

  return await sharp(out, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

// ── Paper finish dispatcher ───────────────────────────────────
async function applyPaperFinish(pngBuffer, finish) {
  switch (finish) {
    case "glossy":      return await applyGlossy(pngBuffer);
    case "kraft":       return await applyKraft(pngBuffer);
    case "holographic": return await applyHolographic(pngBuffer);
    case "foil_gold":   return await applyFoil(pngBuffer, "foil_gold");
    case "foil_silver": return await applyFoil(pngBuffer, "foil_silver");
    default:            return pngBuffer;  // standard — no effect
  }
}

// ============================================================
// ROBLOX OPEN CLOUD UPLOAD
// ============================================================
async function uploadToRoblox(pngBuffer, displayName) {
  if (!ROBLOX_API_KEY || !CREATOR_ID) {
    throw new Error("ROBLOX_API_KEY or ROBLOX_CREATOR_ID not configured");
  }

  const metadata = JSON.stringify({
    assetType:   "Image",
    displayName: displayName || "StickerCo Sticker",
    description: "Generated by StickerCo",
    creationContext: {
      creator: {
        userId: CREATOR_ID,
      },
    },
  });

  const boundary = `boundary${Date.now()}`;
  const CRLF     = "\r\n";

  const metadataPart = Buffer.concat([
    Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="request"${CRLF}` +
      `Content-Type: application/json${CRLF}` +
      `${CRLF}` +
      `${metadata}${CRLF}`
    ),
  ]);

  const filePart = Buffer.concat([
    Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="fileContent"; filename="sticker.png"${CRLF}` +
      `Content-Type: image/png${CRLF}` +
      `${CRLF}`
    ),
    pngBuffer,
    Buffer.from(`${CRLF}`),
  ]);

  const closingPart = Buffer.from(`--${boundary}--${CRLF}`);
  const body        = Buffer.concat([metadataPart, filePart, closingPart]);

  console.log(`[render] Body size: ${body.length}, boundary: ${boundary}`);
  console.log(`[render] Metadata: ${metadata}`);

  const uploadResponse = await fetch("https://apis.roblox.com/assets/v1/assets", {
    method:  "POST",
    headers: {
      "x-api-key":      ROBLOX_API_KEY,
      "Content-Type":   `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body: body,
  });

  const responseText = await uploadResponse.text();
  console.log(`[render] Roblox response (${uploadResponse.status}): ${responseText}`);

  if (!uploadResponse.ok) {
    throw new Error(`Roblox upload failed (${uploadResponse.status}): ${responseText}`);
  }

  const uploadResult  = JSON.parse(responseText);
  const operationPath = uploadResult.path;
  if (!operationPath) {
    throw new Error(`No operation path: ${responseText}`);
  }

  for (let attempt = 1; attempt <= 10; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pollResponse = await fetch(
      `https://apis.roblox.com/assets/v1/${operationPath}`,
      { headers: { "x-api-key": ROBLOX_API_KEY } }
    );

    const pollText = await pollResponse.text();
    console.log(`[render] Poll ${attempt}: ${pollText}`);

    if (!pollResponse.ok) continue;

    const pollResult = JSON.parse(pollText);
    if (!pollResult.done) continue;

    if (pollResult.error) {
      throw new Error(`Processing failed: ${JSON.stringify(pollResult.error)}`);
    }

    const assetId = pollResult.response?.assetId
      || pollResult.response?.Id
      || pollResult.assetId;

    if (!assetId) {
      throw new Error(`No assetId: ${pollText}`);
    }

    console.log(`[render] Looking up legacy asset ID for ${assetId}`);

    const legacyResponse = await fetch(
      `https://apis.roblox.com/assets/v1/assets/${assetId}`,
      { headers: { "x-api-key": ROBLOX_API_KEY } }
    );

    const legacyText = await legacyResponse.text();
    console.log(`[render] Legacy lookup (${legacyResponse.status}): ${legacyText}`);

    if (legacyResponse.ok) {
      const legacyData = JSON.parse(legacyText);

      for (const [key, value] of Object.entries(legacyData)) {
        console.log(`[render] Field: ${key} = ${JSON.stringify(value)}`);
      }

      const contentId = legacyData.contentId
        || legacyData.ContentId
        || legacyData.id
        || legacyData.Id;

      if (contentId && String(contentId) !== String(assetId)) {
        console.log(`[render] Using content ID: ${contentId}`);
        return `rbxassetid://${contentId}`;
      }
    }

    console.log(`[render] Trying version endpoint...`);
    const altResponse = await fetch(
      `https://apis.roblox.com/assets/v1/assets/${assetId}/versions/1`,
      { headers: { "x-api-key": ROBLOX_API_KEY } }
    );
    const altText = await altResponse.text();
    console.log(`[render] Version endpoint (${altResponse.status}): ${altText}`);

    console.log(`[render] Falling back to operation assetId: ${assetId}`);
    return `rbxassetid://${assetId}`;
  }

  throw new Error("Upload timed out");
}

// ============================================================
// RENDER PIPELINE
// ============================================================
async function renderSticker(composition) {
  const canvasW     = (composition.canvasSize && composition.canvasSize[0]) || CANVAS_SIZE;
  const canvasH     = (composition.canvasSize && composition.canvasSize[1]) || CANVAS_SIZE;
  const elements    = composition.elements || [];
  const paperFinish = composition.paperFinish || composition.finish || "standard";
  const layers      = [];

  for (const elem of elements) {
    const url = resolveImageUrl(elem);
    console.log(`[render] Element: ${elem.elementId || elem.elemId}, URL: ${url}`);
    if (!url) {
      console.warn(`No image mapping found for element:`, elem.elementId || elem.elemId);
      continue;
    }

    let imageBuffer;
    try {
      imageBuffer = await fetchImage(url);
    } catch (err) {
      console.error(`Skipping element (url: ${url}): ${err.message}`);
      continue;
    }

    const sizeScale  = elem.sizeScale || elem.scale || 0.25;
    const sizePx     = Math.round(sizeScale * canvasW);
    if (sizePx < 1) continue;

    const posX      = elem.posX     || elem.x       || 0.5;
    const posY      = elem.posY     || elem.y       || 0.5;
    const rotation  = elem.rotation || 0;
    const flipH     = elem.flipH    || elem.flipped || false;
    const flipV     = elem.flipV    || false;
    const zIndex    = elem.zIndex   || 1;
    const elemColor = elem.color    || null;

    try {
      let workingBuffer = imageBuffer;

      if (elemColor) {
        const normalised = elemColor.replace("#", "").toUpperCase();
        const isWhite    = normalised === "F2F3F3" || normalised === "FFFFFF";
        if (!isWhite) {
          console.log(`[render] Tinting ${elem.elementId || elem.elemId} with #${normalised}`);
          workingBuffer = await applyColorTint(imageBuffer, normalised);
        }
      }

      let img = sharp(workingBuffer)
        .resize(sizePx, sizePx, {
          fit:        "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        });

      if (flipH) img = img.flop();
      if (flipV) img = img.flip();

      if (rotation !== 0) {
        img = img.rotate(rotation, {
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        });
      }

      const processedBuffer = await img.png().toBuffer();
      const meta            = await sharp(processedBuffer).metadata();
      const adjustedX       = Math.round(posX * canvasW - meta.width  / 2);
      const adjustedY       = Math.round(posY * canvasH - meta.height / 2);

      layers.push({
        input:  processedBuffer,
        left:   adjustedX,
        top:    adjustedY,
        zIndex: zIndex,
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

  layers.sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

  const sharpLayers = layers.map(({ input, left, top }) => ({ input, left, top }));

  const composited = await sharp({
    create: {
      width:      canvasW,
      height:     canvasH,
      channels:   4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
  .composite(sharpLayers)
  .png()
  .toBuffer();

  // ── AUTOCROP + REPAD ──────────────────────────────────────
  const cropped = await autocropAndRepad(composited, CANVAS_SIZE);
  // ── END AUTOCROP ──────────────────────────────────────────

  const { data: rawData, info } = await sharp(cropped)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
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

  const finalData = Buffer.alloc(totalPixels * 4);

  for (let i = 0; i < totalPixels; i++) {
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
    } //else if (isOutline) {
      //finalData[i * 4]     = 0;
      //finalData[i * 4 + 1] = 0;
      //finalData[i * 4 + 2] = 0;
      //finalData[i * 4 + 3] = 255;
    //}
    else {
      finalData[i * 4 + 3] = 0;
    }
  }

  // Build output buffer from final pixel data
  let outputBuffer = await sharp(finalData, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();

  // ── PAPER FINISH ─────────────────────────────────────────
  // Applied after white offset so the finish covers the full
  // sticker including the white border area.
  if (paperFinish && paperFinish !== "standard") {
    console.log(`[render] Applying paper finish: ${paperFinish}`);
    outputBuffer = await applyPaperFinish(outputBuffer, paperFinish);
  }
  // ── END PAPER FINISH ─────────────────────────────────────

  // Resize to exactly CANVAS_SIZE if autocrop produced a different size
  if (width !== CANVAS_SIZE || height !== CANVAS_SIZE) {
    return await sharp(outputBuffer)
      .resize(CANVAS_SIZE, CANVAS_SIZE, {
        fit:        "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  }

  return outputBuffer;
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

  const displayName = body.displayName || "StickerCo Sticker";

  try {
    console.log(`[render] Rendering sticker with ${
      (composition.elements || []).length} element(s), finish: ${
      composition.paperFinish || composition.finish || "standard"}`);

    const pngBuffer  = await renderSticker(composition);
    console.log(`[render] PNG rendered — ${pngBuffer.length} bytes — uploading to Roblox`);

    const rbxAssetId = await uploadToRoblox(pngBuffer, displayName);
    console.log(`[render] Complete — ${rbxAssetId}`);

    return res.status(200).json({
      success:    true,
      rbxAssetId: rbxAssetId,
      size:       pngBuffer.length,
    });

  } catch (err) {
    console.error("[render] Error:", err);
    return res.status(500).json({
      error:   "Render failed",
      message: err.message,
    });
  }
}
