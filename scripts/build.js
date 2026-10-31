#!/usr/bin/env bun
/*
 * Builds the site into _site/: checks content/, fills index.html with it and
 * creates the published images. Run with --serve for local development.
 * A problem in the content stops the build, so the live site stays as it is.
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "_site");
const CACHE = path.join(ROOT, ".image-cache");
const at = (...p) => path.join(ROOT, ...p);

const GALLERIES = ["realism", "bw", "norse", "color", "small"];
// "All" takes one photo from each gallery in turn, in this order.
const ALL_ORDER = ["norse", "realism", "bw", "color", "small"];
const GALLERY_WIDTHS = [480, 960, 1600];
const PORTRAIT_WIDTH = 1200;
const SHARE_SIZE = [1200, 630];
// Change this to regenerate every cached image.
const IMAGE_VERSION = "1";
const COPY = [
	"CNAME",
	"favicon.ico",
	"robots.txt",
	"site.webmanifest",
	"sitemap.xml",
	"assets/icons",
	"assets/img",
	"assets/js",
];

const readJson = (file) => JSON.parse(fs.readFileSync(at(file), "utf8"));
const escapeHtml = (s) =>
	String(s)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
// Safe inside an inline <script>.
const inlineJson = (v) =>
	JSON.stringify(v)
		.replace(/</g, "\\u003c")
		.replace(/[\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16));
const filled = (v) => typeof v === "string" && v.trim() !== "";

function loadContent() {
	const problems = [];
	const texts = readJson("content/texts.json");
	const settings = readJson("content/settings.json");
	const rawGallery = readJson("content/gallery.json");

	// Flatten the {en, sv} pairs into one list per language.
	const text = { en: {}, sv: {} };
	const addPair = (key, pair, where) => {
		for (const lang of ["en", "sv"]) {
			if (!pair || !filled(pair[lang]))
				problems.push(`${where}: the ${lang} text is empty`);
			else text[lang][key] = pair[lang];
		}
	};
	for (const [section, fields] of Object.entries(texts)) {
		for (const [key, value] of Object.entries(fields)) {
			if (key !== "portrait") addPair(key, value, `Texts, ${section}, ${key}`);
		}
	}
	addPair("title", settings.search?.page_title, "Site settings, page title");
	addPair("desc", settings.search?.description, "Site settings, description");
	addPair("place", settings.footer?.place, "Site settings, footer place");

	const notice = settings.notice || {};
	if (notice.enabled) addPair("notice", notice.text, "Site settings, announcement");

	for (const [label, value] of [
		["sharing title", settings.sharing?.title],
		["sharing description", settings.sharing?.description],
		["sharing image description", settings.sharing?.image_alt],
		["copyright", settings.footer?.copyright],
	]) {
		if (!filled(value)) problems.push(`Site settings: the ${label} is empty`);
	}

	const handle = settings.instagram?.handle;
	if (!/^[A-Za-z0-9._]+$/.test(handle || ""))
		problems.push("Site settings: the Instagram name can only use letters, numbers, dots and underscores, with no @");

	const ads = settings.tracking?.ads_conversion || "";
	if (ads && !/^AW-\d+\/[\w-]+$/.test(ads))
		problems.push('Site settings: the Ads conversion label should look like "AW-123456789/AbC-dEfGh"');

	for (const [label, code] of [
		["head code", settings.tracking?.head_code],
		["body code", settings.tracking?.body_code],
	]) {
		const c = code || "";
		const count = (re) => (c.match(re) || []).length;
		if (count(/<script\b/gi) !== count(/<\/script\s*>/gi))
			problems.push(`Site settings: the ${label} has an unclosed script tag`);
		if (/<\/?(html|head|body)\b/i.test(c))
			problems.push(`Site settings: the ${label} cannot contain html, head or body tags`);
	}

	// Gallery: every photo must exist and be in one gallery only.
	const gallery = {};
	const seen = new Map();
	for (const key of Object.keys(rawGallery)) {
		if (!GALLERIES.includes(key)) problems.push(`Gallery: unknown gallery "${key}"`);
	}
	for (const key of GALLERIES) {
		gallery[key] = [];
		for (const image of rawGallery[key] || []) {
			const file = String(image).replace(/^\//, "");
			const id = path.parse(file).name;
			if (!file.startsWith("assets/gallery/") || !fs.existsSync(at(file))) {
				problems.push(`Gallery: photo not found: ${image}`);
				continue;
			}
			if (!/^[\w.-]+$/.test(id)) {
				problems.push(`Gallery: rename this photo so it has no spaces or special characters: ${image}`);
				continue;
			}
			if (seen.has(id)) {
				problems.push(`Gallery: "${id}" is in both ${seen.get(id)} and ${key}. A photo can only be in one gallery.`);
				continue;
			}
			seen.set(id, key);
			gallery[key].push({ id, file });
		}
	}

	const singleImage = (value, folder, label) => {
		const file = String(value || "").replace(/^\//, "");
		if (!file.startsWith(folder) || !fs.existsSync(at(file))) {
			problems.push(`${label}: photo not found: ${value || "none chosen"}`);
			return null;
		}
		return file;
	};
	const portrait = singleImage(texts.about?.portrait, "assets/portrait/", "Texts, portrait photo");
	const shareImage = singleImage(settings.sharing?.image, "assets/share/", "Site settings, sharing image");

	if (problems.length) {
		throw new Error(`The content has problems:\n- ${problems.join("\n- ")}`);
	}
	return { text, settings, gallery, portrait, shareImage, handle, ads };
}

// One photo from each gallery in turn, until every gallery is empty.
function mixGalleries(gallery) {
	const queues = ALL_ORDER.map((key) => gallery[key].map((p) => [p.id, [key]]));
	const mixed = [];
	while (queues.some((q) => q.length)) {
		for (const q of queues) if (q.length) mixed.push(q.shift());
	}
	return mixed;
}

/*
 * Creates one published image, reusing the cached result when the source and
 * the settings are unchanged. Metadata such as GPS location is removed.
 * A source that already fits is kept as it is, to avoid compressing it twice.
 */
async function makeImage(source, target, opts) {
	const input = fs.readFileSync(source);
	const hash = crypto
		.createHash("sha256")
		.update(input)
		.update(JSON.stringify({ opts, v: IMAGE_VERSION }))
		.digest("hex");
	const cached = path.join(CACHE, `${hash}.${opts.format}`);
	if (!fs.existsSync(cached)) {
		let meta;
		try {
			meta = await sharp(input).metadata();
		} catch (e) {
			throw new Error(`Could not read ${path.relative(ROOT, source)}: ${e.message}`);
		}
		const clean = !meta.exif && !meta.xmp && !meta.iptc;
		const fits = opts.cover
			? meta.width === opts.width && meta.height === opts.height
			: meta.width <= opts.width;
		if (clean && fits && meta.format === opts.format) {
			fs.writeFileSync(cached, input);
		} else {
			const image = sharp(input).rotate();
			if (opts.cover) image.resize(opts.width, opts.height, { fit: "cover" });
			else image.resize({ width: opts.width, withoutEnlargement: true });
			if (opts.format === "webp") image.webp({ quality: 80 });
			else image.jpeg({ quality: 85, mozjpeg: true });
			await image.toFile(cached);
		}
		makeImage.created += 1;
	}
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.copyFileSync(cached, target);
	return path.basename(cached);
}
makeImage.created = 0;

async function pool(jobs, size) {
	const results = [];
	let next = 0;
	await Promise.all(
		Array.from({ length: size }, async () => {
			while (next < jobs.length) {
				const i = next++;
				results[i] = await jobs[i]();
			}
		}),
	);
	return results;
}

async function buildImages(c) {
	const jobs = [];
	for (const piece of Object.values(c.gallery).flat()) {
		for (const width of GALLERY_WIDTHS) {
			jobs.push(() =>
				makeImage(at(piece.file), path.join(OUT, "assets/work", `${piece.id}-${width}.webp`), {
					width,
					format: "webp",
				}),
			);
		}
	}
	const portraitOut = path.join(OUT, "assets/img/portrait.jpg");
	jobs.push(() =>
		makeImage(at(c.portrait), portraitOut, { width: PORTRAIT_WIDTH, format: "jpeg" }),
	);
	jobs.push(() =>
		makeImage(at(c.shareImage), path.join(OUT, "assets/og-image.jpg"), {
			width: SHARE_SIZE[0],
			height: SHARE_SIZE[1],
			cover: true,
			format: "jpeg",
		}),
	);
	const used = new Set(await pool(jobs, 4));
	// Forget images nothing uses any more, so the cache does not grow forever.
	for (const name of fs.readdirSync(CACHE)) {
		if (!used.has(name)) fs.rmSync(path.join(CACHE, name));
	}
	return sharp(portraitOut).metadata();
}

function buildHtml(c, portraitMeta) {
	let html = fs.readFileSync(at("index.html"), "utf8");

	// Static text, so it is in the page before any JavaScript runs.
	for (const [key, value] of Object.entries(c.text.en)) {
		if (key === "title" || key === "desc" || key === "notice") continue;
		const re = new RegExp(`(<(\\w+)\\b[^>]*\\bdata-i18n="${key}"[^>]*>)(</\\2\\s*>)`);
		if (!re.test(html)) throw new Error(`index.html has no empty element for "${key}"`);
		html = html.replace(re, (_, open, _tag, close) => open + escapeHtml(value) + close);
	}

	const { settings: s } = c;
	const values = {
		head_code: s.tracking.head_code || "",
		body_code: s.tracking.body_code || "",
		title: escapeHtml(c.text.en.title),
		desc: escapeHtml(c.text.en.desc),
		share_title: escapeHtml(s.sharing.title),
		share_description: escapeHtml(s.sharing.description),
		share_image_alt: escapeHtml(s.sharing.image_alt),
		instagram_url: `https://www.instagram.com/${c.handle}/`,
		instagram_handle: c.handle,
		copyright: escapeHtml(s.footer.copyright),
		portrait_w: portraitMeta.width,
		portrait_h: portraitMeta.height,
		notice: c.text.en.notice
			? `<p class="notice" data-i18n="notice">${escapeHtml(c.text.en.notice)}</p>`
			: "",
		content: inlineJson({
			text: c.text,
			gallery: mixGalleries(c.gallery),
			adsConversion: c.ads,
		}),
	};
	return html.replace(/%%(\w+)%%/g, (match, name) => {
		if (!(name in values)) throw new Error(`index.html has an unknown placeholder: ${match}`);
		return values[name];
	});
}

async function build() {
	const started = Date.now();
	makeImage.created = 0;
	const content = loadContent();
	fs.rmSync(OUT, { recursive: true, force: true });
	fs.mkdirSync(OUT, { recursive: true });
	fs.mkdirSync(CACHE, { recursive: true });
	for (const item of COPY) {
		fs.cpSync(at(item), path.join(OUT, item), { recursive: true });
	}
	const portraitMeta = await buildImages(content);
	fs.writeFileSync(path.join(OUT, "index.html"), buildHtml(content, portraitMeta));
	const pieces = Object.values(content.gallery).flat().length;
	console.log(
		`Built ${pieces} gallery pieces, ${makeImage.created} new images, in ${((Date.now() - started) / 1000).toFixed(1)}s`,
	);
}

async function serve() {
	await build();
	let timer;
	const rebuild = () => {
		clearTimeout(timer);
		timer = setTimeout(() => build().catch((e) => console.error(e.message)), 200);
	};
	for (const item of ["index.html", "content", "assets", "scripts"]) {
		fs.watch(at(item), { recursive: true }, rebuild);
	}
	require("browser-sync").create().init({
		server: OUT,
		files: path.join(OUT, "**/*"),
		host: "0.0.0.0",
		port: 3000,
		open: false,
		notify: false,
	});
}

(process.argv.includes("--serve") ? serve() : build()).catch((e) => {
	console.error(e.message);
	process.exit(1);
});
