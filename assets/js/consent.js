/* Cookie consent, shared by every page.
 *
 * The tracking code pasted in Pages CMS (Site settings → Tracking) is written
 * into the page by the build as inert <script type="text/plain" data-consent>.
 * This file runs those scripts only once the visitor clicks Accept, and the
 * Google tag gets Consent Mode v2 signals ("denied" by default).
 * gtag() exists from the start, so pages can send events at any time; they
 * wait in dataLayer and only reach Google if the tag is switched on.
 * The choice is kept in localStorage ("cb-consent": "granted" | "denied").
 * Any element with [data-cookie-settings] reopens the banner. */
(() => {
	var KEY = "cb-consent",
		d = document,
		root = d.documentElement;

	window.dataLayer = window.dataLayer || [];
	window.gtag = function () {
		dataLayer.push(arguments);
	};
	var DENIED = {
		ad_storage: "denied",
		ad_user_data: "denied",
		ad_personalization: "denied",
		analytics_storage: "denied",
	};
	var GRANTED = {
		ad_storage: "granted",
		ad_user_data: "granted",
		ad_personalization: "granted",
		analytics_storage: "granted",
	};
	gtag("consent", "default", DENIED);

	var T = {
		en: {
			title: "Cookies",
			text: "With your OK, we use cookies from Google and Meta for visitor statistics and to see whether our ads lead to bookings. Nothing is tracked unless you accept, and you can change your mind any time under “Cookie settings” at the bottom of the page.",
			link: "Privacy policy",
			reject: "Reject",
			accept: "Accept",
			now_granted: "Right now: accepted.",
			now_denied: "Right now: rejected.",
		},
		sv: {
			title: "Cookies",
			text: "Med ditt OK använder vi cookies från Google och Meta för besöksstatistik och för att se om våra annonser leder till bokningar. Inget spåras om du inte godkänner, och du kan ändra dig när som helst under ”Cookie-inställningar” längst ner på sidan.",
			link: "Integritetspolicy",
			reject: "Avvisa",
			accept: "Godkänn",
			now_granted: "Just nu: godkänt.",
			now_denied: "Just nu: avvisat.",
		},
	};
	function t(k) {
		return (T[root.lang] || T.en)[k];
	}
	function stored() {
		try {
			return localStorage.getItem(KEY);
		} catch (e) {
			return null;
		}
	}
	function store(v) {
		try {
			localStorage.setItem(KEY, v);
		} catch (e) {}
	}

	// Swap each waiting script for a live copy, in page order.
	var started = false;
	function runWaiting() {
		if (started) return;
		started = true;
		[].forEach.call(
			d.querySelectorAll('script[type="text/plain"][data-consent]'),
			(old) => {
				var s = d.createElement("script");
				[].forEach.call(old.attributes, (a) => {
					if (a.name !== "type" && a.name !== "data-consent")
						s.setAttribute(a.name, a.value);
				});
				if (old.dataset.consent) s.type = old.dataset.consent;
				if (!old.hasAttribute("async")) s.async = false;
				s.text = old.text;
				old.replaceWith(s);
			},
		);
	}
	function grant() {
		gtag("consent", "update", GRANTED);
		if (typeof window.fbq === "function") fbq("consent", "grant");
		runWaiting();
	}
	// Withdrawn consent: tell the tags that already run, and remove their cookies.
	function deny() {
		gtag("consent", "update", DENIED);
		if (typeof window.fbq === "function") fbq("consent", "revoke");
		var host = location.hostname,
			base = host.replace(/^www\./, "");
		d.cookie.split(";").forEach((c) => {
			var n = c.split("=")[0].trim();
			if (!/^(_gcl|_ga|_gid|_gat|_fbp|_fbc)/.test(n)) return;
			[null, host, "." + base].forEach((dm) => {
				d.cookie = n + "=; Max-Age=0; path=/" + (dm ? "; domain=" + dm : "");
			});
		});
	}

	/* ---------- banner ---------- */
	var css =
		".cc{position:fixed;z-index:110;left:50%;bottom:calc(12px + env(safe-area-inset-bottom));translate:-50% 0;" +
		"width:min(560px,calc(100% - 24px));padding:18px 20px 16px;background:rgba(10,10,10,.97);" +
		"border:1px solid var(--hair,rgba(232,226,212,.14));border-top:2px solid var(--accent,#b3191d);" +
		"box-shadow:0 10px 40px rgba(0,0,0,.7);color:var(--bone,#e8e2d4);font-family:var(--serif,serif)}" +
		".cc[hidden]{display:none}" +
		".cc-h{margin:0;font-family:var(--caps,serif);font-size:.7rem;letter-spacing:.24em;text-transform:uppercase;color:var(--bone,#e8e2d4)}" +
		".cc p{margin:6px 0 0;font-size:1.02rem;line-height:1.45;color:var(--bone-2,rgba(232,226,212,.78))}" +
		".cc a{color:var(--bone,#e8e2d4)}" +
		".cc .cc-now{font-style:italic;color:var(--bone-3,rgba(232,226,212,.6))}" +
		".cc-b{display:flex;gap:10px;margin-top:14px}" +
		".cc-b button{flex:1;min-height:46px;cursor:pointer;background:none;border:1px solid var(--bone-3,rgba(232,226,212,.6));" +
		"color:var(--bone,#e8e2d4);font-family:var(--caps,serif);font-size:.68rem;letter-spacing:.24em;text-transform:uppercase;" +
		"transition:border-color .4s,box-shadow .5s}" +
		".cc-b button:hover{border-color:var(--accent-hi,#d42a2a);box-shadow:0 0 24px var(--accent-glow,rgba(179,25,29,.35))}";

	var box = null;
	function build() {
		var st = d.createElement("style");
		st.textContent = css;
		d.head.appendChild(st);
		box = d.createElement("section");
		box.className = "cc";
		box.hidden = true;
		box.setAttribute("role", "dialog");
		box.setAttribute("aria-labelledby", "cc-h");
		box.setAttribute("aria-describedby", "cc-p");
		box.innerHTML =
			'<p class="cc-h" id="cc-h"></p><p id="cc-p"><span></span> <a href="/privacy-policy#cookies"></a></p>' +
			'<p class="cc-now" hidden></p>' +
			'<div class="cc-b"><button type="button" data-v="denied"></button><button type="button" data-v="granted"></button></div>';
		box.addEventListener("click", (e) => {
			var b = e.target.closest("button[data-v]");
			if (!b) return;
			store(b.dataset.v);
			if (b.dataset.v === "granted") grant();
			else deny();
			box.hidden = true;
		});
		d.body.appendChild(box);
	}
	function text() {
		if (!box) return;
		box.querySelector("#cc-h").textContent = t("title");
		box.querySelector("#cc-p span").textContent = t("text");
		box.querySelector("#cc-p a").textContent = t("link");
		box.querySelector('[data-v="denied"]').textContent = t("reject");
		box.querySelector('[data-v="granted"]').textContent = t("accept");
		var now = box.querySelector(".cc-now"),
			v = stored();
		now.hidden = !v;
		if (v) now.textContent = t(v === "granted" ? "now_granted" : "now_denied");
	}
	function open(focus) {
		text();
		box.hidden = false;
		if (focus) box.querySelector("button").focus();
	}
	function init() {
		build();
		var v = stored();
		if (v === "granted") grant();
		else if (!v) open(false);
		d.addEventListener("click", (e) => {
			if (!e.target.closest("[data-cookie-settings]")) return;
			e.preventDefault();
			open(true);
		});
		// Pages switch language by changing <html lang>; follow along.
		new MutationObserver(text).observe(root, {
			attributes: true,
			attributeFilter: ["lang"],
		});
	}
	// Runs once the whole page (and so every waiting script) has been read.
	if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init);
	else init();
})();
