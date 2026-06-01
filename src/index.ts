import { Supernova, PulsarContext, RemoteVersionIdentifier, AnyOutputFile } from "@supernovaio/sdk-exporters"
import { ThemeHelper, WriteTokenPropStore } from "@supernovaio/export-utils"
import { ExporterConfiguration, OutputFormat, ThemeExportStyle } from "../config"
import { indexOutputFiles } from "./files/index-file"
import { generateStyleFiles } from "./files/style-file"
import { tokenVariableName } from "./content/token"

/** Exporter configuration from the resolved default configuration and user overrides */
export const exportConfiguration = Pulsar.exportConfig<ExporterConfiguration>()

/**
 * Filters out null values from an array of output files
 * @param files Array of output files that may contain null values
 * @returns Array of non-null output files
 */
function processOutputFiles(files: Array<AnyOutputFile | null>): Array<AnyOutputFile> {
  return files.filter((file): file is AnyOutputFile => file !== null)
}

/**
 * Main export function that generates CSS files from design tokens
 *
 * This function handles:
 * - Fetching tokens and token groups from the design system
 * - Filtering tokens by brand if specified
 * - Processing themes in different modes (direct, separate files, or combined)
 * - Generating style files for each token type
 * - Creating an optional index file that imports all style files
 *
 * @param sdk - Supernova SDK instance
 * @param context - Export context containing design system information
 * @returns Promise resolving to an array of output files
 */
Pulsar.export(async (sdk: Supernova, context: PulsarContext): Promise<Array<AnyOutputFile>> => {
  // Fetch data from design system that is currently being exported
  const remoteVersionIdentifier: RemoteVersionIdentifier = {
    designSystemId: context.dsId,
    versionId: context.versionId
  }

  // Fetch tokens and token groups
  let outputFiles: Array<AnyOutputFile> = []
  let tokens = await sdk.tokens.getTokens(remoteVersionIdentifier)
  let tokenGroups = await sdk.tokens.getTokenGroups(remoteVersionIdentifier)
  let tokenCollections = await sdk.tokens.getTokenCollections(remoteVersionIdentifier)

  // Filter by brand if specified
  if (context.brandId) {
    const brands = await sdk.brands.getBrands(remoteVersionIdentifier)
    const brand = brands.find((brand) => brand.id === context.brandId || brand.idInVersion === context.brandId)
    if (!brand) {
      throw new Error(`Unable to find brand ${context.brandId}.`)
    }

    tokens = tokens.filter((token) => token.brandId === brand.id)
    tokenGroups = tokenGroups.filter((tokenGroup) => tokenGroup.brandId === brand.id)
  }

  // Process themes if specified
  if (context.themeIds && context.themeIds.length > 0) {
    const themes = await sdk.tokens.getTokenThemes(remoteVersionIdentifier)

    // Find and validate requested themes
    const themesToApply = context.themeIds.map((themeId) => {
      const theme = themes.find((theme) => theme.id === themeId || theme.idInVersion === themeId)
      if (!theme) {
        throw new Error(`Unable to find theme ${themeId}.`)
      }
      return theme
    })

    // Resolve per-context formats once so every branch reads the same values
    const baseFormat = exportConfiguration.outputFormat as OutputFormat
    const themeFormat = exportConfiguration.themeOutputFormat as OutputFormat

    // Handle different theme export modes
    switch (exportConfiguration.exportThemesAs) {
      case ThemeExportStyle.ApplyDirectly:
        // Apply all themes directly to token values — no separate theme files, use base format
        tokens = sdk.tokens.computeTokensByApplyingThemes(tokens, tokens, themesToApply)
        const directFiles = [
          ...generateStyleFiles(tokens, tokenGroups, "", undefined, tokenCollections, baseFormat),
          ...indexOutputFiles(tokens, [], baseFormat, baseFormat)
        ]
        outputFiles = processOutputFiles(directFiles)
        break

      case ThemeExportStyle.SeparateFiles:
        // Generate separate files for each theme in themeFormat
        const themeFiles = themesToApply.flatMap((theme) => {
          const themedTokens = sdk.tokens.computeTokensByApplyingThemes(tokens, tokens, [theme])
          return generateStyleFiles(
            themedTokens,
            tokenGroups,
            ThemeHelper.getThemeIdentifier(theme),
            theme,
            tokenCollections,
            themeFormat
          )
        })

        // Generate base files in baseFormat only if exportBaseValues is true
        const baseFiles = exportConfiguration.exportBaseValues
          ? generateStyleFiles(tokens, tokenGroups, "", undefined, tokenCollections, baseFormat)
          : []

        const separateFiles = [...baseFiles, ...themeFiles, ...indexOutputFiles(tokens, themesToApply, baseFormat, themeFormat)]
        outputFiles = processOutputFiles(separateFiles)
        break

      case ThemeExportStyle.MergedTheme:
        // Generate base files in baseFormat only if exportBaseValues is true
        const baseTokenFiles = exportConfiguration.exportBaseValues
          ? generateStyleFiles(tokens, tokenGroups, "", undefined, tokenCollections, baseFormat)
          : []

        // Generate merged theme file in themeFormat
        const themedTokens = sdk.tokens.computeTokensByApplyingThemes(tokens, tokens, themesToApply)
        const mergedThemeFiles = generateStyleFiles(
          themedTokens,
          tokenGroups,
          "themed",
          themesToApply[0],
          tokenCollections,
          themeFormat
        )

        const mergedFiles = [...baseTokenFiles, ...mergedThemeFiles, ...indexOutputFiles(tokens, ["themed"], baseFormat, themeFormat)]
        outputFiles = processOutputFiles(mergedFiles)
        break
    }
  } else {
    // Default case: no themes — generate base files only
    const baseFormat = exportConfiguration.outputFormat as OutputFormat
    const defaultFiles = [
      ...(exportConfiguration.exportBaseValues
        ? generateStyleFiles(tokens, tokenGroups, "", undefined, tokenCollections, baseFormat)
        : []),
      ...indexOutputFiles(tokens, [], baseFormat, baseFormat)
    ]
    outputFiles = processOutputFiles(defaultFiles)
  }

  // Write property name of each token if the property to write to was provided in settings
  if (!context.isPreview && exportConfiguration.writeNameToProperty) {
    const writeStore = new WriteTokenPropStore(sdk, remoteVersionIdentifier)
    await writeStore.writeTokenProperties(exportConfiguration.propertyToWriteNameTo, tokens, (token) => {
      if (exportConfiguration.propertyToWriteNameToIncludesVar) {
        return `var(--${tokenVariableName(token, tokenGroups, tokenCollections)})`
      } else {
        return tokenVariableName(token, tokenGroups, tokenCollections)
      }
    })
  }

  // Finalize export by retrieving the files to write to destination
  return outputFiles
})
