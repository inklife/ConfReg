var HtmlWebpackPlugin = require('html-webpack-plugin');
var path = require('path');

module.exports = {
    mode: 'development',
    entry: ['core-js/stable', './src/index.js'],
    output: {
        publicPath: '/'
    },
    resolve: {
        extensions: ['.js', '.vue'],
        alias: {
            '@img': path.resolve(__dirname, 'src/assets/')
        }
    },
    module: {
        rules: [
            {
                test: /\.vue?$/,
                exclude: /(node_modules)/,
                use: 'vue-loader'
            },
            {
                test: /\.js?$/,
                exclude: /(node_modules)/,
                use: 'babel-loader'
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader', 'postcss-loader']
              },
              {
                test: /\.(png|jpg|jpeg|gif|eot|ttf|woff|woff2|svg|svgz)(\?.+)?$/,
                use: [{
                  loader: 'url-loader',
                  options: {
                    limit: 10000,
                    fallback: 'file-loader',
                    esModule: false, // 禁用ES模块

                  }
                }]
              }           
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({ 
            template: './src/index.html',
            inject: 'body',
            publicPath: '/'
        }),
    ],
    devServer: {
        host: '127.0.0.1', // 绑定到所有网络接口，允许 localhost 和 127.0.0.1 访问
        port: 8080, // 明确指定端口
        hot: true, // 启用 HMR
        open: true, // 自动打开浏览器
        overlay: true, // 显示编译错误
        historyApiFallback: {
            index: '/index.html',
            disableDotRule: true,
            rewrites: [
                { from: /^\/conference\/.*$/, to: '/index.html' },
                { from: /./, to: '/index.html' }
            ]
        },
        publicPath: '/',
        contentBase: false,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false
            },
            '/admin': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false
            },
            '/uploads': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false
            }
        }
    },
    externals: {
        // global app config object
        config: JSON.stringify({
            // 移除 apiUrl 配置，直接在请求中写完整路径
        })
    }
}