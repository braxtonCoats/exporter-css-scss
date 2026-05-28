# CSS + SCSS Exporter for Supernova

Export design tokens from [Supernova](https://supernova.io) into CSS custom properties and/or SCSS variables.

## Output formats

| Format | Example output |
|--------|---------------|
| **CSS** | `--color-primary: #0052cc;` inside a selector block |
| **SCSS** | `$color-primary: #0052cc !default;` at the top level |
| **Both** | Generates both `.css` and `.scss` files simultaneously |

The default is **Both**, configurable via the `outputFormat` setting in Supernova.

## How it works

Supernova runs this exporter against your design system. It fetches tokens via the SDK, converts them to variable declarations, and writes one file per token type (or a single combined file, depending on configuration).

- CSS files wrap variables in a selector block (`:root` by default)
- SCSS files emit bare `$variable: value !default;` declarations
- An optional index file is generated that imports all style files
- Themes can be exported as separate files, applied directly, or merged

## Setup

```bash
# 1. Build the shared utils package
cd utils && npm install && npm run build && cd ..

# 2. Install and build the exporter
npm install
npm run build
```

Or use the convenience script:

```bash
npm run setup && npm run build
```

The compiled bundle is written to `dist/build.js`, which is the file Supernova executes.

## Development

```bash
npm run dev   # watch mode
npm run build # production build
```

## Configuration options

All options are configurable through the Supernova UI when setting up a pipeline.

### Output format
- **outputFormat**: `both` (default) | `css` | `scss`

### Token names
- **tokenNameStyle**: `kebabCase` (default) | `camelCase` | `constantCase` | `flatCase` | `pascalCase` | `snakeCase` | `trainCase`
- **tokenNameStructure**: `pathAndName` (default) | `nameOnly` | `collectionPathAndName`
- **globalNamePrefix**: Prefix all variable names (e.g. `ds` → `--ds-color-primary`)
- **customizeTokenPrefixes** / **tokenPrefixes**: Per-type prefixes

### Token values
- **colorFormat**: `smartHashHex` (default) | `smartRgba` | `smartHsla` | `smartOklch` | hex/rgb/hsl/oklch variants
- **forceRemUnit**: Convert pixel values to rem (requires **remBase**, default `16`)
- **useReferences**: Emit `var(--token)` / `$token` references instead of resolved values
- **useFallbackValues**: Include raw fallback values in `var()` references
- **colorPrecision**: Decimal places for color values

### Themes
- **exportThemesAs**: `separateFiles` (default) | `applyDirectly` | `mergedTheme`
- **exportOnlyThemedTokens**: Only emit tokens that differ from the base in theme files
- **exportBaseValues**: Include base token files when exporting themes

### Files
- **fileStructure**: `separateByType` (default) | `singleFile`
- **generateEmptyFiles**: Emit empty files instead of omitting them
- **baseStyleFilePath**: Output directory for style files (default `./base`)
- **customizeStyleFileNames** / **styleFileNames**: Custom file names per token type
- **generateIndexFile**: Emit an index file that `@import`s all style files
- **indexFileName**: Name of the index file (default `index.css`)
- **baseIndexFilePath**: Output directory for the index file (default `./`)

### CSS selectors
- **cssSelector**: Selector for base variables (default `:root`)
- **themeSelector**: Selector for theme files, `{theme}` is replaced (default `.theme-{theme}`)

### Other
- **showDescriptions**: Emit token descriptions as code comments
- **showGeneratedFileDisclaimer** / **disclaimer**: Prepend an auto-generated file notice
- **indent**: Spaces per indent level in CSS files (default `2`)

### Write-back
- **writeNameToProperty**: Save generated variable names back to Supernova tokens
- **propertyToWriteNameTo**: Custom property name to write into (default `CSS`)
- **propertyToWriteNameToIncludesVar**: Wrap written value in `var()` syntax
