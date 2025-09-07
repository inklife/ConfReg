
module.exports = {
  plugins: [
    require('autoprefixer')({
      overrideBrowserslist: [
        "Android 4.1",
        "iOS 7.1",
        "Chrome > 31",
        "ff > 31",
        "ie >= 8"
      ]
    })
    // 'postcss-pxtorem': {
    //   rootValue: 37.5,
    //   propList: ['*', '!max-width'], // 排除max-width属性
    // }
  ]
}