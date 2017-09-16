"use strict";

let storage = {};
let defaults = [true, true, true, true, true];
let policies = ["script-src 'none'; ", "style-src 'none'; ", "img-src 'none'; ", "object-src 'none'; ", "media-src 'none'; "];
let badgeCounts = {};

function loadStorage() {
	let promise = browser.storage.local.get(null).then(
		stored => {
			storage = stored;
			if (!storage.settings) storage.settings = {};
			if (storage.settings.showBadgeText === undefined) {
				storage.settings.showBadgeText = true;
				browser.storage.local.set({ settings: { showBadgeText: true } }).then(
					() => { },
					() => { }
				);
			}
		},
		() => { }
	);

	return promise;
}

function isDefaults(domainSettings) {
	return domainSettings.length === defaults.length && domainSettings.every((v,i) => v === defaults[i]);
}

function handleMessage(message, sender, sendResponse) {
	if (message.target.includes("background")) {
		switch (message.action) {
			case "set-badge-enabled":
				storage.settings.showBadgeText = message.data.showBadgeText;
				browser.storage.local.set({ settings: { showBadgeText: message.data.showBadgeText } }).then(
					() => {
						browser.tabs.query({}).then(
							tabs => {
								for (let tab of tabs) {
									if (tab.url.startsWith("http")) updateBadge(tab.id);
								}
							},
							() => { }
						);
					},
					() => { }
				);
				break;

			case "save-domain":
				updateDomainSettings(message.data.url, message.data.domainSettings);
				break;

			case "popup-init":
				let initSettings;
				if (message.data.url.startsWith("http")) initSettings = storage[getDomain(message.data.url)] || defaults;
				else initSettings = defaults;
				browser.runtime.sendMessage({ target: "popup", action: "popup-init", data: { showBadgeText: storage.settings.showBadgeText, domainSettings: initSettings}});
				break;

			case "page-info":
				let badgeCount = 0;

				let pageSettings = storage[message.data.hostname] || defaults;
				if (!pageSettings[0]) badgeCount += message.data.counts.script;
				if (!pageSettings[1]) badgeCount += message.data.counts.style;
				if (!pageSettings[2]) badgeCount += message.data.counts.image;
				if (!pageSettings[3]) badgeCount += message.data.counts.object;
				if (!pageSettings[4]) badgeCount += message.data.counts.media;

				badgeCounts[sender.tab.id.toString()] = badgeCount;
				updateBadge(sender.tab.id);

				break;

			case "reload-storage":
				loadStorage().then(
					() => {
						browser.runtime.sendMessage({ target: "options", action: "reload-storage" });
					},
					() => { }
				);
				break;
		}
	}
}

function updateDomainSettings(url, domainSettings) {
	let domain = getDomain(url);
	if (isDefaults(domainSettings)) {
		delete storage[domain];

		browser.storage.local.remove(domain).then(
			() => { browser.runtime.sendMessage({ target: "options", action: "reload-storage" }); },
			() => { }
		);
	}
	else {
		storage[domain] = domainSettings;
		let dtmp = {};
		dtmp[domain] = domainSettings;
		browser.storage.local.set(dtmp).then(
			() => { browser.runtime.sendMessage({ target: "options", action: "reload-storage" }); },
			() => { }
		);
	}
}

function getDomain(url) {
	let tmp = document.createElement("a");
	tmp.href = url;
	return tmp.hostname;
}

function updateBadge(tabId) {
	let badgeText = "";
	if (storage.settings.showBadgeText) {
		let count = badgeCounts[tabId.toString()];
		if (!count || typeof count === undefined) count = 0;
		badgeText = count < 1000 ? count.toString() : "1k+";
	}

	browser.browserAction.setBadgeText({ text: badgeText, tabId: tabId });
}

function handleHeaders(details) {
	if (["main_frame", "sub_frame"].includes(details.type) && details.url.startsWith("http")) {
		let domainSettings = storage[getDomain(details.url)];
		if (domainSettings) {
			let headers = details.responseHeaders;
			let policy = "";

			for (let i = 0; i < domainSettings.length; i++) {
				if (domainSettings[i] === false) policy += policies[i];
			}

			if (policy != "") {
				headers.push({ name: "Content-Security-Policy", value: policy });
				return { responseHeaders: headers };
			}
		}
	}
}

loadStorage();
browser.runtime.onMessage.addListener(handleMessage);
browser.webRequest.onHeadersReceived.addListener(handleHeaders, { "urls": ["<all_urls>"] }, ["blocking", "responseHeaders"]);
browser.tabs.onRemoved.addListener((tabId, removeInfo) => { delete badgeCounts[tabId.toString()]; });
