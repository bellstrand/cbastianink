/*!
 * CBPlacements: tattoo placement diagrams for cbastianink.
 * Classic script (no modules, no deps). Works from file://.
 *
 *   CBPlacements.list               -> array of placement records
 *   CBPlacements.get(id)            -> one record
 *   CBPlacements.svg(id, opts?)     -> inline SVG string
 *   CBPlacements.render(el, id, opts?)
 *   CBPlacements.sessionsText(id, lang) -> "7–8 sittningar"
 *
 * opts: { lang: 'en'|'sv' (aria-label), view: override base silhouette }
 *
 * Colours: outline uses currentColor; the highlighted area uses
 * var(--accent, #c21a1a) through a style attribute, so switching --accent
 * on <html> recolours every diagram live, with no re-render.
 *
 * Arms: inner placements use the "arm" view (palm facing the viewer), outer
 * placements use "arm-back" (back of the hand), like the source pictures.
 */
((global) => {
	var W = 200,
		H = 300;

	/* ---------- helpers ---------- */

	// Mirror every "x,y" pair of an absolute-coordinate path around x = 100.
	function mirror(d) {
		return d.replace(
			/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
			(_, x, y) => +(W - parseFloat(x)).toFixed(2) + "," + y,
		);
	}
	// Move every "x,y" pair of an absolute-coordinate path sideways by dx.
	function shift(d, dx) {
		return d.replace(
			/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
			(_, x, y) => +(parseFloat(x) + dx).toFixed(2) + "," + y,
		);
	}
	function both(list) {
		var out = [];
		for (var i = 0; i < list.length; i++) {
			out.push(list[i], mirror(list[i]));
		}
		return out;
	}
	// Rectangle as a path.
	function rect(x1, y1, x2, y2) {
		return (
			"M" +
			x1 +
			"," +
			y1 +
			" L" +
			x2 +
			"," +
			y1 +
			" L" +
			x2 +
			"," +
			y2 +
			" L" +
			x1 +
			"," +
			y2 +
			" Z"
		);
	}

	/* ---------- base silhouettes (viewBox 0 0 200 300) ----------
	 * clip:    closed shapes (union) used as clipPath + faint body fill
	 * lines:   main outline strokes (may be open)
	 * details: secondary anatomy strokes (lower opacity)
	 * fadeFrom: y where outlines start fading out (cropped bodies)
	 */

	// Single arm hanging from the shoulder, with an open hand, palm facing the
	// viewer: body on the right, thumb out to the left. One closed outline:
	// up the inner arm, over the shoulder, down the outer arm, round the hand.
	var ARM_D =
		"M113,212 C115,196 118,176 119,158 C120,148 118,140 117,134 " +
		"C119,116 121,96 121,74 C121,60 120,48 118,40 " +
		"C120,28 112,18 100,16 C86,16 78,26 77,40 " +
		"C76,54 78,70 79,86 C80,104 81,120 83,132 " +
		"C82,142 81,150 81,160 C81,178 84,196 87,212 " +
		// thumb
		"C86,220 83,226 79,232 C75,238 71,246 70,253 " +
		"C69,259 74,261 76,257 C78,252 81,247 84,245 " +
		// index, middle, ring, little finger
		"C84,262 84,274 85,282 C86,287 91,287 91,282 C91,274 92,264 93,256 " +
		"C93,268 93,280 94,287 C95,292 100,292 100,287 C101,280 101,268 102,256 " +
		"C102,268 103,278 103,283 C104,288 109,288 109,283 C109,276 110,266 111,256 " +
		"C111,264 111,270 112,274 C113,279 117,278 117,273 " +
		// outer palm edge back up to the wrist
		"C117,262 117,252 116,244 C115,232 114,222 113,212 Z";
	// Same arm seen from the back: thumb on the right, body on the left.
	var ARM_BACK_D = mirror(ARM_D);

	// Pair of legs from the waist, front view (left half, mirrored).
	var LEGS_HALF =
		"M100,14 L62,14 C54,26 48,40 48,58 C47,86 50,118 56,146 " +
		"C58,156 57,166 57,176 C56,196 60,226 66,256 " +
		"C67,266 64,274 62,280 C61,286 66,290 74,290 C80,290 84,288 84,282 " +
		"C83,274 80,266 80,258 C82,236 86,206 86,184 " +
		"C86,172 87,162 90,154 C96,130 98,104 98,84 C98,80 99,78 100,78 Z";
	var LEGS_LINE =
		"M62,14 C54,26 48,40 48,58 C47,86 50,118 56,146 " +
		"C58,156 57,166 57,176 C56,196 60,226 66,256 " +
		"C67,266 64,274 62,280 C61,286 66,290 74,290 C80,290 84,288 84,282 " +
		"C83,274 80,266 80,258 C82,236 86,206 86,184 " +
		"C86,172 87,162 90,154 C96,130 98,104 98,84 C98,80 99,78 100,78";

	// One leg from the hip, side view, toes pointing left, buttock right.
	var LEG_SIDE_D =
		"M84,16 C76,40 74,70 78,100 C80,120 82,136 84,150 " +
		"C86,158 88,164 87,172 C86,200 90,230 92,256 " +
		"C88,264 76,272 62,280 C54,284 52,290 58,292 L108,292 " +
		"C116,292 118,284 116,276 C112,268 110,262 110,254 " +
		"C112,232 126,214 128,196 C129,180 123,168 118,160 " +
		"C118,140 120,112 122,96 C132,86 136,66 132,46 " +
		"C130,30 124,20 116,16 C104,12 92,12 84,16 Z";

	// Upper-body halves (left half; mirrored). A = outer contour (arm up to
	// neck), B = inner arm + torso side. CLIP = closed half-shape.
	function torso(p) {
		var A =
			"M" +
			p.ao +
			",290 C" +
			(p.ao - 1) +
			",215 " +
			(p.ao - 2) +
			",165 " +
			p.ao +
			",128 " +
			"C" +
			(p.ao + 1) +
			",104 " +
			(p.sh - 12) +
			",90 " +
			p.sh +
			",82 " +
			"C" +
			(p.sh + 12) +
			",76 78,71 88,65 C90,59 90,53 90,46";
		var B =
			"M" +
			p.ai +
			",290 C" +
			(p.ai - 1) +
			",215 " +
			(p.ai - 1) +
			",165 " +
			(p.ai + 2) +
			"," +
			p.pit +
			" " +
			"C" +
			(p.ai + 6) +
			",150 " +
			p.wa +
			",180 " +
			p.wa +
			",208 " +
			"C" +
			p.wa +
			",230 " +
			p.hip +
			",248 " +
			p.hip +
			",290";
		var CLIP =
			"M100,46 L90,46 C90,53 90,59 88,65 C78,71 " +
			(p.sh + 12) +
			",76 " +
			p.sh +
			",82 " +
			"C" +
			(p.sh - 12) +
			",90 " +
			(p.ao + 1) +
			",104 " +
			p.ao +
			",128 " +
			"C" +
			(p.ao - 2) +
			",165 " +
			(p.ao - 1) +
			",215 " +
			p.ao +
			",290 L" +
			p.ai +
			",290 " +
			"C" +
			(p.ai - 1) +
			",215 " +
			(p.ai - 1) +
			",165 " +
			(p.ai + 2) +
			"," +
			p.pit +
			" " +
			"C" +
			(p.ai + 6) +
			",150 " +
			p.wa +
			",180 " +
			p.wa +
			",208 " +
			"C" +
			p.wa +
			",230 " +
			p.hip +
			",248 " +
			p.hip +
			",290 L100,290 Z";
		return { A: A, B: B, CLIP: CLIP };
	}
	var TF = torso({ ao: 36, ai: 54, sh: 50, pit: 124, wa: 66, hip: 58 }); // female
	var TM = torso({ ao: 30, ai: 51, sh: 46, pit: 122, wa: 68, hip: 66 }); // male / back
	var HEAD =
		"M100,8 C110,8 116,17 116,27 C116,38 109,46 100,46 C91,46 84,38 84,27 C84,17 90,8 100,8 Z";

	var COLLAR = "M116,21 C130,16 144,16 156,20"; // collarbone hint: body side
	// Inner side of the arm: palm, palm creases, elbow crease.
	var ARM_DETAILS = [
		"M103,136 C107,138 111,138 115,136", // elbow crease
		"M89,215 C96,217 104,217 111,215", // wrist crease
		"M88,221 C93,230 94,240 90,248", // thumb pad
		"M92,238 C100,236 108,238 115,242", // palm crease
		"M93,246 C100,244 107,246 112,249", // palm crease
	];
	// Outer side of the arm: back of the hand, knuckles, nails, elbow point.
	var ARM_BACK_DETAILS = [
		"M95,130 C98,134 102,134 105,130", // elbow point
		"M90,214 C88,216 87,218 88,221", // wrist bone (little-finger side)
		"M110,251 C111,253 113,253 114,251", // knuckles
		"M101,253 C102,255 104,255 105,253",
		"M92,253 C93,255 95,255 96,253",
		"M85,249 C86,251 88,251 89,249",
		"M110,280 C111,284 114,284 115,280", // nails
		"M101,284 C102,288 105,288 106,284",
		"M92,281 C93,285 96,285 97,281",
		"M84,271 C85,274 87,274 88,271",
	];
	var PAIR_DX = 36; // half the distance between the two arms in "arm-pair"

	var VIEWS = {
		arm: {
			clip: [ARM_D],
			lines: [ARM_D],
			details: [COLLAR].concat(ARM_DETAILS),
		},
		"arm-back": {
			clip: [ARM_BACK_D],
			lines: [ARM_BACK_D],
			details: [mirror(COLLAR)].concat(ARM_BACK_DETAILS),
		},
		// Both sides at once, for placements that cover the whole arm:
		// palm side on the left, back side on the right.
		"arm-pair": {
			clip: [shift(ARM_D, -PAIR_DX), shift(ARM_BACK_D, PAIR_DX)],
			lines: [shift(ARM_D, -PAIR_DX), shift(ARM_BACK_D, PAIR_DX)],
			details: ARM_DETAILS.map((d) => shift(d, -PAIR_DX)).concat(
				ARM_BACK_DETAILS.map((d) => shift(d, PAIR_DX)),
			),
		},
		"leg-front": {
			clip: both([LEGS_HALF]),
			lines: both([LEGS_LINE]),
			details: [
				"M62,14 C80,18 120,18 138,14", // waistline
				"M64,160 C68,166 76,168 82,164",
				mirror("M64,160 C68,166 76,168 82,164"), // knees
				"M100,34 C99,40 99,44 100,46", // navel hint
			],
		},
		"leg-side": {
			clip: [LEG_SIDE_D],
			lines: [LEG_SIDE_D],
			details: [
				"M122,96 C116,99 110,99 104,96", // gluteal fold
				"M84,154 C88,158 89,166 87,172", // kneecap
				"M100,262 C102,264 104,264 106,262", // ankle bone
			],
		},
		"torso-f": {
			clip: both([TF.CLIP]),
			lines: [HEAD].concat(both([TF.A, TF.B])),
			details: both([
				"M70,84 C80,85 90,87 97,90", // collarbone
				"M64,136 C62,162 78,178 93,170 C97,166 98,160 98,152", // bust
			]).concat(["M100,196 C99,199 99,201 100,203"]),
			fadeFrom: 238,
		},
		"torso-m": {
			clip: both([TM.CLIP]),
			lines: [HEAD].concat(both([TM.A, TM.B])),
			details: both([
				"M66,82 C78,83 90,86 97,89", // collarbone
				"M58,122 C62,144 76,158 99,152", // pec
				"M76.6,141 C76.6,139.2 79.4,139.2 79.4,141 C79.4,142.8 76.6,142.8 76.6,141", // nipple
			]).concat(["M100,96 L100,150", "M100,214 C99,217 99,219 100,221"]),
			fadeFrom: 238,
		},
		"torso-back": {
			clip: both([TM.CLIP]),
			lines: [HEAD].concat(both([TM.A, TM.B])),
			details: both([
				"M70,104 C78,100 88,102 90,112 C91,128 86,146 78,156", // shoulder blade
				"M86,40 C90,44 94,46 100,46", // nape
			]).concat(["M100,62 L100,240", "M64,244 C80,249 120,249 136,244"]),
			fadeFrom: 258,
		},
	};

	/* ---------- placements ---------- */

	function P(id, group, view, min, max, en, sv, noteEn, noteSv, area) {
		return {
			id: id,
			group: group,
			view: view,
			min: min,
			max: max,
			sessions: min === max ? String(min) : min + "–" + max,
			label: { en: en, sv: sv },
			note: { en: noteEn, sv: noteSv },
			area: area,
		};
	}

	var CHEST_F_HALF =
		"M101,62 L86,62 C70,70 48,72 32,84 L26,134 L62,136 C76,138 90,146 101,162 Z";
	var CHEST_M_HALF =
		"M101,58 L86,58 C70,66 48,68 30,78 L22,146 L58,152 C72,160 88,160 101,154 Z";
	var BACK_HALF =
		"M101,54 L88,54 C72,66 52,70 40,78 C30,88 34,106 48,120 L56,126 L60,150 L64,248 L101,248 Z";

	var list = [
		P(
			"chest-side",
			"torso",
			"torso-f",
			1,
			2,
			"Chest & shoulder, one side",
			"Bröst & axel, ena sidan",
			"One side of the chest incl. shoulder",
			"Ena bröstsidan inkl. axeln",
			[CHEST_F_HALF],
		),
		P(
			"chest-full-f",
			"torso",
			"torso-f",
			3,
			4,
			"Full chest (female)",
			"Hela bröstet (kvinna)",
			"Chest and both shoulders",
			"Bröst och båda axlarna",
			both([CHEST_F_HALF]),
		),
		P(
			"chest-full-m",
			"torso",
			"torso-m",
			3,
			5,
			"Full chest (male)",
			"Hela bröstet (man)",
			"Chest and both shoulders",
			"Bröst och båda axlarna",
			both([CHEST_M_HALF]),
		),
		P(
			"back-full",
			"torso",
			"torso-back",
			8,
			10,
			"Full back",
			"Hela ryggen",
			"Neck to waist, shoulders included",
			"Nacke till midja, skuldror ingår",
			both([BACK_HALF]),
		),
		P(
			"thigh-front",
			"leg",
			"leg-front",
			2,
			2,
			"Front thigh",
			"Framsida lår",
			"Front of the thigh, above the knee",
			"Lårets framsida, ovanför knät",
			[rect(100, 84, 160, 146)],
		),
		P(
			"leg-upper",
			"leg",
			"leg-side",
			3,
			4,
			"Upper leg, full wrap",
			"Hela låret, runt om",
			"Hip to knee",
			"Höft till knä",
			[rect(40, 0, 160, 152)],
		),
		P(
			"leg-sleeve",
			"leg",
			"leg-front",
			9,
			10,
			"Full leg sleeve",
			"Helben",
			"Hip to ankle",
			"Höft till fotled",
			[rect(101, 0, 180, 256)],
		),
		P(
			"leg-lower",
			"leg",
			"leg-side",
			2,
			2,
			"Lower leg / calf",
			"Underben / vad",
			"Inner lower leg not included",
			"Insida underben ingår ej",
			[rect(40, 178, 160, 256)],
		),
		P(
			"arm-sleeve",
			"arm",
			"arm-pair",
			7,
			8,
			"Full sleeve",
			"Helärm",
			"Shoulder to wrist",
			"Axel till handled",
			[rect(0, 0, 200, 214)],
		),
		P(
			"arm-outer-sleeve",
			"arm",
			"arm-back",
			4,
			6,
			"Outer sleeve",
			"Helärm, utsida",
			"Inner sleeve not included",
			"Insida ärm ingår ej",
			[rect(40, 0, 160, 214)],
		),
		P(
			"arm-upper-half",
			"arm",
			"arm-back",
			2,
			3,
			"Half sleeve, upper arm",
			"Halvärm, överarm",
			"Inner biceps not included",
			"Insida biceps ingår ej",
			[rect(40, 0, 160, 132)],
		),
		P(
			"arm-upper-inner",
			"arm",
			"arm",
			1,
			2,
			"Inner upper arm",
			"Överarm, insida",
			"Outer arm not included",
			"Utsida arm ingår ej",
			[rect(40, 62, 160, 128)],
		),
		P(
			"forearm-inner",
			"arm",
			"arm",
			1,
			2,
			"Inner forearm",
			"Underarm, insida",
			"Outer forearm not included",
			"Utsida underarm ingår ej",
			[rect(40, 144, 160, 212)],
		),
		P(
			"forearm-outer",
			"arm",
			"arm-back",
			1,
			2,
			"Outer forearm",
			"Underarm, utsida",
			"Inner forearm not included",
			"Insida underarm ingår ej",
			[rect(40, 144, 160, 212)],
		),
	];

	var byId = {};
	for (var i = 0; i < list.length; i++) {
		byId[list[i].id] = list[i];
	}

	var UNITS = { en: ["session", "sessions"], sv: ["sittning", "sittningar"] };

	/* ---------- rendering ---------- */

	var counter = 0;

	function paths(arr, attrs) {
		var s = "";
		for (var i = 0; i < arr.length; i++) {
			s += '<path d="' + arr[i] + '"' + attrs + "/>";
		}
		return s;
	}

	function svg(id, opts) {
		opts = opts || {};
		var p = byId[id];
		if (!p) {
			return "";
		}
		var v = VIEWS[opts.view || p.view] || VIEWS[p.view];
		var lang = opts.lang === "sv" ? "sv" : "en";
		var u = "cbp" + (++counter).toString(36);
		var clipId = u + "c",
			blurId = u + "b",
			maskId = u + "m",
			gradId = u + "g";
		var hasFade = typeof v.fadeFrom === "number";

		var defs =
			'<clipPath id="' +
			clipId +
			'">' +
			paths(v.clip, "") +
			"</clipPath>" +
			'<filter id="' +
			blurId +
			'" filterUnits="userSpaceOnUse" x="-50" y="-50" width="300" height="400">' +
			'<feGaussianBlur stdDeviation="4.5"/></filter>';
		if (hasFade) {
			defs +=
				'<linearGradient id="' +
				gradId +
				'" gradientUnits="userSpaceOnUse" x1="0" y1="' +
				v.fadeFrom +
				'" x2="0" y2="292">' +
				'<stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
				'<mask id="' +
				maskId +
				'" maskUnits="userSpaceOnUse" x="0" y="0" width="' +
				W +
				'" height="' +
				H +
				'">' +
				'<rect x="0" y="0" width="' +
				W +
				'" height="' +
				v.fadeFrom +
				'" fill="#fff"/>' +
				'<rect x="0" y="' +
				v.fadeFrom +
				'" width="' +
				W +
				'" height="' +
				(H - v.fadeFrom) +
				'" fill="url(#' +
				gradId +
				')"/>' +
				"</mask>";
		}

		var stroke =
			' fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"';

		return (
			"" +
			'<svg class="cbp-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
			W +
			" " +
			H +
			'"' +
			' role="img" aria-label="' +
			p.label[lang].replace(/"/g, "&quot;") +
			'"' +
			' preserveAspectRatio="xMidYMid meet" style="display:block;width:100%;height:100%;overflow:visible">' +
			"<defs>" +
			defs +
			"</defs>" +
			"<g" +
			(hasFade ? ' mask="url(#' + maskId + ')"' : "") +
			">" +
			// faint body fill
			paths(v.clip, ' fill="currentColor" fill-opacity="0.045" stroke="none"') +
			// highlighted placement, soft edged, clipped to the body
			'<g clip-path="url(#' +
			clipId +
			')">' +
			'<g filter="url(#' +
			blurId +
			')" style="fill:var(--accent, #c21a1a)" fill-opacity="0.82">' +
			paths(p.area, "") +
			"</g>" +
			"</g>" +
			// outline + anatomy details
			"<g" +
			stroke +
			' stroke-width="1.25" stroke-opacity="0.55">' +
			paths(v.lines, "") +
			"</g>" +
			"<g" +
			stroke +
			' stroke-width="1" stroke-opacity="0.28">' +
			paths(v.details, "") +
			"</g>" +
			"</g>" +
			"</svg>"
		);
	}

	function render(el, id, opts) {
		if (typeof el === "string") {
			el = document.querySelector(el);
		}
		if (el) {
			el.innerHTML = svg(id, opts);
		}
		return el;
	}

	function sessionsText(id, lang) {
		var p = byId[id];
		if (!p) {
			return "";
		}
		var u = UNITS[lang === "sv" ? "sv" : "en"];
		return p.sessions + " " + (p.max === 1 ? u[0] : u[1]);
	}

	global.CBPlacements = {
		list: list,
		views: Object.keys(VIEWS),
		get: (id) => byId[id] || null,
		svg: svg,
		render: render,
		sessionsText: sessionsText,
	};
})(window);
