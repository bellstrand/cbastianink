/* Language for the smaller pages (privacy policy, booking confirmation).
 * Same choice as the front page: ?lang=, then the saved "cb-lang", then the
 * browser. Both languages are in the HTML; [data-l="en"|"sv"] blocks are shown
 * or hidden by page.css. Load in <head> so the right language shows at once. */
(() => {
	var root = document.documentElement,
		l = new URLSearchParams(location.search).get("lang");
	function saved() {
		try {
			return localStorage.getItem("cb-lang");
		} catch (e) {
			return null;
		}
	}
	if (l !== "sv" && l !== "en") l = saved();
	if (l !== "sv" && l !== "en")
		l = /^sv/i.test(navigator.language || "") ? "sv" : "en";
	root.lang = l;

	function apply() {
		var sv = root.lang === "sv",
			title = document.querySelector("title"),
			btn = document.getElementById("langBtn");
		if (title && title.dataset[root.lang])
			title.textContent = title.dataset[root.lang];
		if (!btn) return;
		btn.innerHTML = sv
			? "<span><span>EN/</span><b>SV</b></span>"
			: "<span><b>EN</b><span>/SV</span></span>";
		btn.setAttribute(
			"aria-label",
			sv
				? "Språk: svenska. Byt till engelska"
				: "Language: English. Switch to Swedish",
		);
	}
	document.addEventListener("DOMContentLoaded", () => {
		apply();
		var btn = document.getElementById("langBtn");
		if (btn)
			btn.addEventListener("click", () => {
				root.lang = root.lang === "en" ? "sv" : "en";
				try {
					localStorage.setItem("cb-lang", root.lang);
				} catch (e) {}
				apply();
			});
		var nav = document.getElementById("nav");
		if (nav) {
			var onScroll = () => nav.classList.toggle("scrolled", scrollY > 40);
			addEventListener("scroll", onScroll, { passive: true });
			onScroll();
		}
	});
})();
