// module.exports = {
//     entry: "./src/index.js",
//     module: {
//         rules: [{
//             test: /\.js$/,
//             exclude: /node_modules/,
//             use: {
//                 loader: "babel-loader"
//             }
//         }]
//     }
// };

module.exports = {

    entry: "./src/customscript.js",
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
                loader: "babel-loader"
            }
        }]
    }
};