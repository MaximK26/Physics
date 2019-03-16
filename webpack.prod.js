const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    plugins: [
        new webpack.BannerPlugin({
          banner: 'Test pack 0.1'
        }),
      ],
    mode: 'production'
});

