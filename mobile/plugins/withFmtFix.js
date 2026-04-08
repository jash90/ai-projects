/**
 * Expo Config Plugin: withFmtFix
 *
 * Patches the iOS Podfile's post_install block to disable fmt's consteval,
 * fixing Xcode 26.x build failures with React Native's bundled fmt 11.x.
 *
 * Issue: https://github.com/facebook/react-native/issues/55601
 * Applied automatically on every `expo prebuild`.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FIX_SNIPPET = `
    # Fix for Xcode 26.x consteval + FMT_STRING incompatibility (react-native#55601)
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |config|
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_USE_CONSTEVAL=0'
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end`;

const withFmtFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // Skip if already patched
      if (contents.includes('FMT_USE_CONSTEVAL')) {
        return config;
      }

      // Case 1: Podfile has a post_install block — inject before the closing "end"
      if (contents.includes('post_install do |installer|')) {
        const lines = contents.split('\n');
        let postInstallStart = -1;
        let depth = 0;
        let insertIndex = -1;

        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i].trim();
          if (trimmed.match(/^post_install\s+do\s*\|/)) {
            postInstallStart = i;
            depth = 1;
            continue;
          }
          if (postInstallStart >= 0) {
            if (trimmed.match(/\bdo\b\s*\|/) || trimmed.match(/\bdo\s*$/)) {
              depth++;
            }
            if (trimmed === 'end' || trimmed.match(/^end\s*$/)) {
              depth--;
              if (depth === 0) {
                insertIndex = i;
                break;
              }
            }
          }
        }

        if (insertIndex >= 0) {
          lines.splice(insertIndex, 0, FIX_SNIPPET);
          contents = lines.join('\n');
          fs.writeFileSync(podfilePath, contents);
          console.log('✅ fmt FMT_USE_CONSTEVAL=0 fix injected into Podfile post_install');
        } else {
          console.warn('⚠️ Could not find post_install closing `end` in Podfile');
        }
      } else {
        // Case 2: No post_install block — append one before the final `end`
        const lines = contents.split('\n');
        const lastEndIdx = lines.findLastIndex((l) => l.trim() === 'end');

        const newBlock = `
  post_install do |installer|
${FIX_SNIPPET}
  end`;

        if (lastEndIdx >= 0) {
          lines.splice(lastEndIdx, 0, newBlock);
          contents = lines.join('\n');
          fs.writeFileSync(podfilePath, contents);
          console.log('✅ fmt fix: added post_install block to Podfile');
        } else {
          console.warn('⚠️ Could not find insertion point in Podfile');
        }
      }

      return config;
    },
  ]);
};

module.exports = withFmtFix;
