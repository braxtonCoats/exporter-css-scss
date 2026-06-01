import { FileHelper, FileNameHelper, ThemeHelper } from "@supernovaio/export-utils"
import { OutputTextFile, Token, TokenTheme } from "@supernovaio/sdk-exporters"
import { exportConfiguration } from ".."
import { getStyleFileName } from "../utils/file-utils"
import { FileStructure, OutputFormat } from "../../config"

/**
 * Generates index file(s) that import all token style files and theme variations.
 *
 * Accepts separate format controls for base token imports and theme imports so that,
 * for example, an SCSS index can reference only SCSS base files while a CSS index
 * references only CSS theme files — matching the alloy-styles pattern where base
 * tokens ship as SCSS and themes ship as runtime-swappable CSS.
 *
 * When base and theme formats are the same, a single combined index is produced per
 * format (two files when format is "both"). When they differ, two separate index files
 * are produced: one for the base format (base imports only) and one for the theme
 * format (theme imports only).
 *
 * @param tokens - Array of design tokens to process
 * @param themes - Array of token themes or theme names to include
 * @param baseFormat - Format used for base token files (defaults to exportConfiguration.outputFormat)
 * @param themeFormat - Format used for theme files (defaults to baseFormat)
 * @returns Array of OutputTextFile objects
 */
export function indexOutputFiles(
  tokens: Array<Token>,
  themes: Array<TokenTheme | string> = [],
  baseFormat?: OutputFormat,
  themeFormat?: OutputFormat
): Array<OutputTextFile | null> {
  const resolvedBase = baseFormat ?? (exportConfiguration.outputFormat as OutputFormat)
  const resolvedTheme = themeFormat ?? resolvedBase

  // Determine which output formats actually need an index file, and what each one should contain.
  // We generate at most one CSS index and one SCSS index — no duplicates possible.
  const needsCssIndex =
    resolvedBase === OutputFormat.CSS || resolvedBase === OutputFormat.Both ||
    resolvedTheme === OutputFormat.CSS || resolvedTheme === OutputFormat.Both

  const needsScssIndex =
    resolvedBase === OutputFormat.SCSS || resolvedBase === OutputFormat.Both ||
    resolvedTheme === OutputFormat.SCSS || resolvedTheme === OutputFormat.Both

  const result: Array<OutputTextFile | null> = []

  if (needsCssIndex) {
    const includeBase = resolvedBase === OutputFormat.CSS || resolvedBase === OutputFormat.Both
    const includeThemes = resolvedTheme === OutputFormat.CSS || resolvedTheme === OutputFormat.Both
    result.push(indexOutputFile(tokens, themes, OutputFormat.CSS, includeBase, includeThemes))
  }

  if (needsScssIndex) {
    const includeBase = resolvedBase === OutputFormat.SCSS || resolvedBase === OutputFormat.Both
    const includeThemes = resolvedTheme === OutputFormat.SCSS || resolvedTheme === OutputFormat.Both
    result.push(indexOutputFile(tokens, themes, OutputFormat.SCSS, includeBase, includeThemes))
  }

  return result
}

/**
 * Generates a single index file for the specified format.
 *
 * @param tokens - Array of design tokens to process
 * @param themes - Array of token themes or theme names to include
 * @param format - Output format for this index file
 * @param includeBase - Whether to include @import lines for base token files
 * @param includeThemes - Whether to include @import lines for theme files
 * @returns OutputTextFile containing the index file, or null if generation is disabled
 */
export function indexOutputFile(
  tokens: Array<Token>,
  themes: Array<TokenTheme | string> = [],
  format: OutputFormat = OutputFormat.CSS,
  includeBase: boolean = true,
  includeThemes: boolean = true
): OutputTextFile | null {
  // Skip if index file generation is disabled in configuration
  if (!exportConfiguration.generateIndexFile) {
    return null
  }

  const isScss = format === OutputFormat.SCSS
  const extension = isScss ? '.scss' : '.css'

  // =========================================
  // Single File Mode
  // =========================================
  if (exportConfiguration.fileStructure === FileStructure.SingleFile) {
    const baseImport = includeBase && exportConfiguration.exportBaseValues
      ? `/* Base tokens */\n@import "./tokens${extension}";`
      : ''

    const themeImports = includeThemes
      ? themes.map((theme) => {
          const themePath = ThemeHelper.getThemeIdentifier(theme)
          const themeName = ThemeHelper.getThemeName(theme)
          return `/* Theme: ${themeName} */\n@import "./tokens.${themePath}${extension}";`
        }).join("\n\n")
      : ''

    const separator = baseImport && themeImports ? "\n\n" : ""
    const fileName = exportConfiguration.indexFileName.replace(/\.(css|scss)$/i, '') + extension

    return FileHelper.createTextFile({
      relativePath: exportConfiguration.baseIndexFilePath,
      fileName: fileName,
      content: baseImport + separator + themeImports,
    })
  }

  // =========================================
  // Separate by Type Mode
  // =========================================

  const types = [...new Set(tokens.map((token) => token.tokenType))]

  // Generate imports for base token files (./base/color.css, ./base/color.scss, …)
  const imports = includeBase && exportConfiguration.exportBaseValues
    ? `/* Base tokens */\n` + types
        .map((type) => `@import "${exportConfiguration.baseStyleFilePath}/${getStyleFileName(type, extension)}";`)
        .join("\n")
    : ''

  // Generate imports for themed token files
  const themeImports = includeThemes
    ? themes.map((theme) => {
        const themePath = ThemeHelper.getThemeIdentifier(theme)
        const themeName = ThemeHelper.getThemeName(theme)

        const themeTypes = exportConfiguration.exportOnlyThemedTokens && typeof theme !== 'string'
          ? types.filter(type => ThemeHelper.hasThemedTokens(tokens, type, theme))
          : types

        return themeTypes
          .map((type, index) => {
            const themeComment = index === 0 ? `/* Theme: ${themeName} */\n` : ''
            return `${themeComment}@import "./${themePath}/${getStyleFileName(type, extension)}";`
          })
          .join("\n")
      }).join("\n\n")
    : ''

  const separator = imports && themeImports ? "\n\n" : ""
  const fileName = FileNameHelper.ensureFileExtension(exportConfiguration.indexFileName, extension)

  return FileHelper.createTextFile({
    relativePath: exportConfiguration.baseIndexFilePath,
    fileName: fileName,
    content: imports + separator + themeImports,
  })
}
