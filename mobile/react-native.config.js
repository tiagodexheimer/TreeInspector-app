module.exports = {
  dependencies: {
    // Desabilitar auto-linking para dependências problemáticas
    'react-native-sqlite-storage': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-sqlite-storage/platforms/android',
          packageImportPath: 'io.liteglue.SQLitePluginPackage',
        },
        ios: null, // disable iOS platform, other platforms will still autolink if provided
      },
    },
  },
  assets: ['./src/assets/fonts/'], // Pasta de assets se existir
};