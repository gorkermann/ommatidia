import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';

export default {
  entry: {
    app: './build/Game.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve('.', 'dist/dev'),
  },
  cache: false,
  devtool: 'inline-source-map',
  externals: {
    'rpio': /^rpio$/,
    'rpi-ws281x-native': /^rpi-ws281x-native$/,
    'i2c-bus': /^i2c-bus$/,
    'fs': '/^fs$/',
    'child_process': /^child_process$/
  },
  optimization: {
    minimize: false,
  },

  //target: 'node',
};