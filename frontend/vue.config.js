
const path = require('path');

module.exports = {
    devServer: {
        host: '127.0.0.1',
        port: 8080,
    },
    configureWebpack: {
        resolve: {
          alias: {
            '@img': path.resolve(__dirname, 'src/assets/'),
          }
        }
      }    

}
