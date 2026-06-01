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

  // When both formats are the same, produce a unified index per format
  if (resolvedBase === resolvedTheme) {
    const format = resolvedBase
    if (format === OutputFormat.Both) {
      return [
        ...indexOutputFiles(tokens, themes, OutputFormat.CSS, OutputFormat.CSS),
        ...indexOutputFiles(tokens, themes, OutputFormat.SCSS, OutputFormat.SCSS),
      ]
    }
    return [indexOutputFile(tokens, themes, format, true, true)]
  }

  // Formats differ — produce a base-only index in baseFormat and a theme-only index in themeFormat
  const baseIndexFiles = resolvedBase === OutputFormat.Both
    ? [
        indexOutputFile(tokens, themes, OutputFormat.CSS, true, false),
        indexOutputFile(tokens, themes, OutputFormat.SCSS, true, false),
      ]
    : [indexOutputFile(tokens, themes, resolvedBase, true, false)]

  const themeIndexFiles = resolvedTheme === OutputFormat.Both
    ? [
        indexOutputFile(tokens, themes, OutputFormat.CSS, false, true),
        indexOutputFile(tokens, themes, OutputFormat.SCSS, false, true),
      ]
    : [indexOutputFile(tokens, themes, resolvedTheme, false, true)]

  return [...baseIndexFiles, ...themeIndexFiles]
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
    const fileName = FileNameHelper.ensureFileExtension(exportConfiguration.indexFileName, extension)

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
