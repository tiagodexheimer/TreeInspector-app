module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/contexts': './src/contexts',
          '@/hooks': './src/hooks',
          '@/navigation': './src/navigation',
          '@/screens': './src/screens',
          '@/services': './src/services',
          '@/types': './src/types',
          '@/utils': './src/utils',
          '@/config': './src/config',
          '@/database': './src/database',
          '@/assets': './src/assets',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};