/*******************************************************************************
** @Author:					Thomas Bouder <Tbouder>
** @Email:					Tbouder@protonmail.com
** @Date:					Tuesday 07 January 2020 - 12:21:12
** @Filename:				next.config.js
**
** @Last modified by:		Tbouder
** @Last modified time:		Monday 10 February 2020 - 18:08:33
*******************************************************************************/

const withCSS = require('@zeit/next-css');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = withCSS({
	// test: /\.(eot|svg|ttf|woff|woff2|otf)$/,
	// loader: 'file-loader',
	enableSvg: true,
	target: 'serverless',
	optimization: {
		minimizer: [new UglifyJsPlugin()]
	},
	// optimizeImagesInDev: true,
	webpack(config, options) {
		// const webpack = require('webpack');
		// config.plugins = config.plugins || [];
		// config.plugins.push(new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /fr/));
		return config;
	}
});
