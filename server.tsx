import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + '/.env' });

import {bundle} from '@remotion/bundler';
import {
	getCompositions,
	renderFrames,
	renderStill,
	stitchFramesToVideo,
} from '@remotion/renderer';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
const FormData = require('form-data');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 8000;
const compositionId = 'Scene';

const cache = new Map<string, string>();

app.get('/', async (req, res) => {
	try {
		const bundled = await bundle(path.join(__dirname, './src/index.tsx'));
		const comps = await getCompositions(bundled, {inputProps: req.query});
		const video = comps.find((c) => c.id === compositionId);

		let jsonResponse = {
			image: '',
			video: ''
		};

		if (!video) {
			throw new Error(`No video called ${compositionId}`);
		}

		const tmpDir = await fs.promises.mkdtemp(
			path.join(os.tmpdir(), 'remotion-')
		);
		const {assetsInfo} = await renderFrames({
			config: video,
			webpackBundle: bundled,
			onStart: () => console.log('Rendering frames...'),
			onFrameUpdate: (f) => {
				if (f % 10 === 0) {
					console.log(`Rendered frame ${f}`);
				}
			},
			parallelism: null,
			outputDir: tmpDir,
			inputProps: req.query,
			compositionId,
			imageFormat: 'jpeg',
		});

		const finalOutput = path.join(tmpDir, 'out.mp4');
		await stitchFramesToVideo({
			dir: tmpDir,
			force: true,
			fps: video.fps,
			height: video.height,
			width: video.width,
			outputLocation: finalOutput,
			imageFormat: 'jpeg',
			assetsInfo,
		});

		const stillOutput = path.join(tmpDir, 'out.png');
		console.log('rendering still');
		await renderStill({
				composition: video,
				webpackBundle: bundled,
				output: stillOutput,
				inputProps: req.query,
				imageFormat: 'png',
				onError: (err) => {
					//reject(err);
				},
			})

		// Upload to IPFS/Pinata


		const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
		const mediaUrl = 'https://gateway.pinata.cloud/ipfs/'
		let imageData = new FormData();
    imageData.append('file', fs.createReadStream(path.join(tmpDir, 'out.png')));

		await axios
			.post(url, imageData, {
					maxBodyLength: 'Infinity', //this is needed to prevent axios from erroring out with large files
					headers: {
							'Content-Type': `multipart/form-data; boundary=${imageData._boundary}`,
							pinata_api_key: process.env.PINATA_API_KEY,
							pinata_secret_api_key: process.env.PINATA_API_SECRET
					}
			})
			.then(async (response) => {
					jsonResponse.image = mediaUrl + response.data.IpfsHash;
			})
			.catch(function (error) {
					//handle error here
				console.log(error)
				res.json({error: error});
			});
		
		let videoData = new FormData();
    videoData.append('file', fs.createReadStream(path.join(tmpDir, 'out.mp4')));

		await axios
			.post(url, videoData, {
					maxBodyLength: 'Infinity', //this is needed to prevent axios from erroring out with large files
					headers: {
							'Content-Type': `multipart/form-data; boundary=${videoData._boundary}`,
							pinata_api_key: process.env.PINATA_API_KEY,
							pinata_secret_api_key: process.env.PINATA_API_SECRET
					}
			})
			.then(async (response) => {
					cache.set(JSON.stringify(req.query), finalOutput);
					console.log(response.data);
					jsonResponse.video = mediaUrl + response.data.IpfsHash;
					console.log('Video rendered and sent!');
			})
			.catch(function (error) {
					//handle error here
				console.log(error)
				res.json({error: error});
			});
		
			res.json(jsonResponse);
		} catch (err) {
			console.error(err);
			res.json({
				error: err,
			});
		}
});

app.listen(port);

console.log(
	[
		`The server has started on http://localhost:${port}!`,
		'',
	].join('\n')
);
