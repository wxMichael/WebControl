"use strict";

let optionIDs = ["script", "style", "image", "object", "media"];
let domainSettings = [true, true, true, true, true];
let showBadgeText = true;
let badgeToggle = document.getElementById("badge-toggle");
badgeToggle.dataset.enabled = showBadgeText;

badgeToggle.addEventListener("click", handleClick);
document.getElementById("options-link").addEventListener("click", handleClick);
browser.runtime.onMessage.addListener(handleMessage);

for (let option of optionIDs) {
	document.getElementById(option).addEventListener("change", handleChange);
}

browser.tabs.query({ currentWindow: true, active: true }).then(
	tabs => {
		browser.runtime.sendMessage({ target: "background", action: "popup-init", data: { url: tabs[0].url } });
		if (!tabs[0].url.startsWith("http")) {
			let inputs = document.getElementsByTagName("input");
			for (let input of inputs) {
				input.disabled = true;
			}
		}
	},
	() => { }
);

function handleMessage(message, sender, sendResponse) {
	if (message.target.includes("popup")) {
		switch (message.action) {
			case "popup-init":
				showBadgeText = message.data.showBadgeText;
				badgeToggle.dataset.enabled = showBadgeText.toString();
				domainSettings = message.data.domainSettings;
				for (const [index, option] of optionIDs.entries()) {
					document.getElementById(option).checked = domainSettings[index];
				}
				break;
		}
	}
}

function handleChange(e) {
	domainSettings[optionIDs.indexOf(e.target.id)] = e.target.checked;

	browser.tabs.query({ active: true, currentWindow: true }).then(
		tabs => {
			browser.runtime.sendMessage({ target: "background", action: "save-domain", data: { url: tabs[0].url, domainSettings: domainSettings } });
		},
		() => { }
	);
	return true;
}

function handleClick(e) {
	switch (e.target.id) {
		case "badge-toggle":
		case "badge-toggle-img":
			showBadgeText = !showBadgeText;
			document.getElementById("badge-toggle").dataset.enabled = showBadgeText.toString();

			browser.runtime.sendMessage({ target: "background,options", action: "set-badge-enabled", data: { showBadgeText: showBadgeText } });
			break;

		case "options-link":
		case "options-link-img":
			browser.runtime.openOptionsPage();
			window.close();
			break;
	}
}
