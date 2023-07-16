const pexels = require('pexels');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { parse: parseUrl } = require('url');
const client = pexels.createClient(
	'iGfjgrVall3zZdYAliIKAUAhVHNyNY1APK1fmF6cV1LvaFJ9gLsmlGdn',
);
getClips('b-roll.txt');

var downloaded = 1;

function getClips(filePath) {
	fs.readFile(filePath, 'utf8', async (error, data) => {
		for (const query of data.split('\r\n')) {
			await downloadClip(query);
		}
	});
}

async function downloadClip(query) {
	await client.videos
		.search({ query, orientation: 'landscape', per_page: 1, size: 'small' })
		.then(async (videos) => {
			var fileUrl = videos.videos[0].video_files[0].link;
			var filePath = `files/${query.replace(/\s/g, '_')}.mp4`;
			if (fileUrl && videos.videos[0].duration > 20) {
				await client.photos
					.search({
						query,
						orientation: 'landscape',
						per_page: 1,
						size: 'small',
					})
					.then(async (photos) => {
						fileUrl = photos.photos[0].src.original;
						filePath = `files/${query.replace(/\s/g, '_')}.jpeg`;
					});
			}

			await downloadFile(fileUrl, filePath)
				.then(() => {
					console.log('Downloaded successfully.', 'Downloaded: ', downloaded++);
				})
				.catch((err) => {
					console.error('Error downloading image:', err);
				});
		})
		.catch((err) => {
			console.error('Error downloading image:', err);
		});
}

function downloadFile(url, filePath) {
	const file = fs.createWriteStream(filePath);

	return new Promise((resolve, reject) => {
		const parsedUrl = parseUrl(url);
		const options = {
			hostname: parsedUrl.hostname,
			path: parsedUrl.path,
			followRedirects: true, // Enable automatic redirection
		};

		// Determine the appropriate module based on the URL protocol
		const client = parsedUrl.protocol === 'https:' ? https : http;

		client
			.get(options, (response) => {
				if (
					response.statusCode >= 300 &&
					response.statusCode < 400 &&
					response.headers.location
				) {
					// Handle redirection if a new location is provided
					const redirectedUrl = response.headers.location;
					downloadFile(redirectedUrl, filePath).then(resolve).catch(reject);
					return;
				}
				console.log(url);
				response.pipe(file);

				file.on('finish', () => {
					file.close(() => {
						resolve();
					});
				});
			})
			.on('error', (err) => {
				fs.unlink(filePath, () => {}); // Delete the file if there's an error
				reject(err);
			});
	});
}
