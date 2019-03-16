const path = require('path');

module.exports = {
    entry: {
        app: './src/main.js'
    },
    externals: {
        three: 'THREE',
        cannon: 'CANNON'
    },
    output: {
        filename: 'three.physics.min.js',
        path: path.resolve(__dirname, 'build'),
        library: 'PHYSICS',
        libraryTarget: 'umd'
    },
    module: {
        rules: [
        {
            test: /\.css$/,
            use: [
              'style-loader',
              'css-loader'
            ]
        },
        {
            test: /\.(fbx|png)$/,
            use: [
                {
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]',
                    outputPath: 'assets/',
                    publicPath: '/build/'
                }
                }
            ]
          }
      ]
    }
};
