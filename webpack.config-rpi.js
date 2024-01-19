import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';

export default {
  entry: {
    app: './build/Game.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve('.', 'dist/rpi'),
  },
  cache: false,
  devtool: 'inline-source-map',
  optimization: {
    minimize: false,
  },

  target: 'node',
};