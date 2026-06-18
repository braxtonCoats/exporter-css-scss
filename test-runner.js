/**
 * Local test runner — no Supernova account required.
 * Tokens sourced from Alloy Design System (Figma node 3230:45603).
 *
 * Usage:
 *   npm run build && node test-runner.js
 *   (rebuild only needed when src/ files change; skip for config/token edits)
 *
 * Edit `config` at the top to try different scenarios.
 */

const { TokenType, TextDecoration, TextCase, Unit } = require("@supernovaio/sdk-exporters")

// ─── Exporter config ──────────────────────────────────────────────────────────

const config = {
  showGeneratedFileDisclaimer: false,
  disclaimer: "",
  generateIndexFile: false,
  generateEmptyFiles: true,
  showDescriptions: false,
  useReferences: true,
  tokenNameStyle: "kebabCase",
  colorFormat: "smartHashHex",
  colorPrecision: 3,
  indent: 2,
  tokenPrefixes: {},
  styleFileNames: {},
  indexFileName: "_index",
  baseStyleFilePath: "./",
  baseIndexFilePath: "./",
  cssSelector: ":root",
  themeSelector: "[data-theme='{theme}']",
  exportThemesAs: "separateFiles",
  exportOnlyThemedTokens: false,
  exportBaseValues: true,
  // ↓ Comma-separated substrings to match against variable names for REM conversion
  remInclude: "font-size, line-height, gap, border-radius, border-width, padding, size",
  remBase: 16,
  customizeStyleFileNames: false,
  customizeTokenPrefixes: false,
  globalNamePrefix: "",
  fileStructure: "singleFile",
  tokenNameStructure: "pathAndName",
  writeNameToProperty: false,
  propertyToWriteNameTo: "",
  propertyToWriteNameToIncludesVar: false,
  useFallbackValues: false,
  outputFormat: "scss",          // "scss" | "css" | "both"
  themeOutputFormat: "css",
  cssExcludeTokenSets: "",
  scssExcludeTokenSets: "",
  splitTypographyTokens: true,   // toggle split vs shorthand
}

;(global).Pulsar = {
  exportConfig: () => config,
  export: (fn) => { exportHandler = fn },
}

let exportHandler = null
require("./dist/build.js")

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0
const id = (prefix) => `${prefix}-${++_id}`

function colorVal(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { referencedTokenId: null, color: { r, g, b }, opacity: { measure: 1 } }
}

function dimVal(measure, unit = Unit.pixels) {
  return { referencedTokenId: null, measure, unit }
}

function strVal(text) {
  return { referencedTokenId: null, text }
}

function typographyVal(family, weight, sizePx, lineHeightPx) {
  return {
    referencedTokenId: null,
    fontFamily:       { text: family,            referencedTokenId: null },
    fontWeight:       { text: String(weight),    referencedTokenId: null },
    fontSize:         dimVal(sizePx),
    lineHeight:       dimVal(lineHeightPx),
    textDecoration:   { value: TextDecoration.original, referencedTokenId: null },
    textCase:         { value: TextCase.original,       referencedTokenId: null },
    letterSpacing:    dimVal(0),
    paragraphSpacing: dimVal(0),
  }
}

function token(tokenType, groupId, name, value, desc = "") {
  return { id: id("tok"), tokenType, parentGroupId: groupId, name, description: desc, brandId: "brand-1", collectionId: null, properties: [], value }
}

// group(id, name, path, parentId)
// path = array of ancestor group names (not including this group's own name)
function group(gid, name, path, parentId = "grp-root") {
  return { id: gid, name, path, isRoot: !parentId, parentGroupId: parentId, tokenIds: [], subgroupIds: [] }
}

// ─── Groups ───────────────────────────────────────────────────────────────────

const groups = [
  group("grp-root",             "Root",           [],                          null),

  // Color
  group("grp-color",            "color",          [],                          "grp-root"),
  group("grp-color-graphic",    "graphic",        ["color"],                   "grp-color"),
  group("grp-color-text",       "text",           ["color"],                   "grp-color"),
  group("grp-color-bg",         "background",     ["color"],                   "grp-color"),
  group("grp-color-border",     "border",         ["color"],                   "grp-color"),

  // Typography composite (path: [] → "heading-h6", "utility-accordion")
  group("grp-typo-heading",     "heading",        [],                          "grp-root"),
  group("grp-typo-utility",     "utility",        [],                          "grp-root"),

  // font-size standalone
  group("grp-fs",               "font-size",      [],                          "grp-root"),
  group("grp-fs-heading",       "heading",        ["font-size"],               "grp-fs"),
  group("grp-fs-utility",       "utility",        ["font-size"],               "grp-fs"),

  // font-weight standalone
  group("grp-fw",               "font-weight",    [],                          "grp-root"),
  group("grp-fw-heading",       "heading",        ["font-weight"],             "grp-fw"),
  group("grp-fw-utility",       "utility",        ["font-weight"],             "grp-fw"),

  // font-family standalone
  group("grp-ff",               "font-family",    [],                          "grp-root"),

  // line-height standalone
  group("grp-lh",               "line-height",    [],                          "grp-root"),
  group("grp-lh-heading",       "heading",        ["line-height"],             "grp-lh"),
  group("grp-lh-utility",       "utility",        ["line-height"],             "grp-lh"),

  // letter-spacing standalone
  group("grp-ls",               "letter-spacing", [],                          "grp-root"),
  group("grp-ls-heading",       "heading",        ["letter-spacing"],          "grp-ls"),
  group("grp-ls-utility",       "utility",        ["letter-spacing"],          "grp-ls"),

  // Space / gap
  group("grp-gap",              "gap",            [],                          "grp-root"),

  // Border radius
  group("grp-br",               "border-radius",  [],                          "grp-root"),

  // Padding
  group("grp-padding",          "padding",        [],                          "grp-root"),
]

// ─── Alloy tokens ─────────────────────────────────────────────────────────────

const tokens = [

  // ── Colors ────────────────────────────────────────────────────────────────
  // → $color-graphic-default / $color-text-default / etc.
  token(TokenType.color, "grp-color-graphic", "default",              colorVal("#090306")),
  token(TokenType.color, "grp-color-text",    "default",              colorVal("#090306")),
  token(TokenType.color, "grp-color-bg",      "surface",              colorVal("#ffffff")),
  token(TokenType.color, "grp-color-bg",      "surface variant",      colorVal("#e5e5e5")),
  token(TokenType.color, "grp-color-text",    "placeholder",          colorVal("#5e5a5c")),
  token(TokenType.color, "grp-color-border",  "default",              colorVal("#cdcccd")),

  // ── Typography composite ──────────────────────────────────────────────────
  // splitTypographyTokens → $heading-h6-font-size, etc.
  token(TokenType.typography, "grp-typo-heading", "h6",
    typographyVal("DM Sans", 600, 14, 21)),

  token(TokenType.typography, "grp-typo-utility", "accordion",
    typographyVal("DM Sans", 700, 12, 12)),

  // ── Standalone font-size ──────────────────────────────────────────────────
  // remInclude "font-size" → these convert to REM
  token(TokenType.fontSize, "grp-fs-heading", "h6",        dimVal(14)),
  token(TokenType.fontSize, "grp-fs-utility", "accordion",  dimVal(12)),

  // ── Standalone font-weight ────────────────────────────────────────────────
  // Supernova stores these as dimension tokens (measure + px unit) in practice.
  // The exporter strips the px suffix since font-weight is always unitless.
  token(TokenType.dimension, "grp-fw-heading", "h6",        dimVal(600)),
  token(TokenType.dimension, "grp-fw-utility", "accordion",  dimVal(700)),

  // ── Standalone font-family ────────────────────────────────────────────────
  token(TokenType.fontFamily, "grp-ff", "default", strVal("DM Sans")),

  // ── Standalone line-height ────────────────────────────────────────────────
  // remInclude "line-height" → these convert to REM
  token(TokenType.lineHeight, "grp-lh-heading", "h6",        dimVal(21)),
  token(TokenType.lineHeight, "grp-lh-utility", "accordion",  dimVal(12)),

  // ── Standalone letter-spacing ─────────────────────────────────────────────
  token(TokenType.letterSpacing, "grp-ls-heading", "h6",        dimVal(0)),
  token(TokenType.letterSpacing, "grp-ls-utility", "accordion",  dimVal(0)),

  // ── Gap / spacing ─────────────────────────────────────────────────────────
  token(TokenType.space, "grp-gap",     "1",   dimVal(4)),
  token(TokenType.space, "grp-gap",     "2",   dimVal(8)),
  token(TokenType.space, "grp-gap",     "2.5", dimVal(12)),
  token(TokenType.space, "grp-gap",     "3",   dimVal(16)),
  token(TokenType.space, "grp-gap",     "4",   dimVal(24)),

  // ── Border radius ─────────────────────────────────────────────────────────
  token(TokenType.radius, "grp-br", "round",  dimVal(100)),
  token(TokenType.radius, "grp-br", "sharp",  dimVal(0)),

  // ── Padding ───────────────────────────────────────────────────────────────
  token(TokenType.space, "grp-padding", "sm", dimVal(24)),

  // ── String tokens ─────────────────────────────────────────────────────────
  // Should output without quotes (unlike fontFamily which needs them)
  token(TokenType.string, "grp-root", "help text", strVal("Enter a valid email address")),
]

// ─── Run ──────────────────────────────────────────────────────────────────────

if (!exportHandler) {
  console.error("Bundle did not register an export handler — rebuild with: npm run build")
  process.exit(1)
}

const mappedTokens = new Map(tokens.map((t) => [t.id, t]))

const mockSdk = {
  tokens: {
    getTokens:                      async () => tokens,
    getTokenGroups:                 async () => groups,
    getTokenCollections:            async () => [],
    getTokenThemes:                 async () => [],
    computeTokensByApplyingThemes:  (t) => t,
  },
  brands: { getBrands: async () => [] },
}

const mockContext = {
  dsId: "ds-1",
  versionId: "v-1",
  brandId: null,
  themeIds: [],
  isPreview: true,
}

;(async () => {
  const files = await exportHandler(mockSdk, mockContext)
  const flags = `splitTypography=${config.splitTypographyTokens} | remInclude="${config.remInclude}" | format=${config.outputFormat}`
  console.log(`\n=== Alloy tokens | ${flags} ===\n`)
  for (const file of files) {
    console.log(`── ${file.path}${file.name} ──`)
    console.log(file.content)
    console.log()
  }
})().catch((err) => {
  console.error("Export failed:", err)
  process.exit(1)
})
