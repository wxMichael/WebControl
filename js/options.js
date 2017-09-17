"use strict";

let storage = {};
let badgeToggle		= document.getElementById("badge-toggle");
let domainSelect	= document.getElementById("domains");
let importFile		= document.getElementById("import-file");

let domainScripts	= document.getElementById("domain-scripts");
let domainStyles	= document.getElementById("domain-styles");
let domainImages	= document.getElementById("domain-images");
let domainObjects	= document.getElementById("domain-objects");
let domainMedia		= document.getElementById("domain-media");

function handleMessage(message, sender, sendResponse) {
	if (message.target.includes("options")) {
		switch (message.action) {
			case "reload-storage":
				loadStorage();
				break;

			case "set-badge-enabled":
				storage.settings.showBadgeText = message.data.showBadgeText;
				badgeToggle.checked = message.data.showBadgeText;
				break;
		}
	}
}

function loadStorage() {
	disableOptions(true);
	let promise = browser.storage.local.get(null).then(
		stored => {
			storage = stored;
			applyStoredSettings();
			disableOptions(false);
		},
		() => { }
	);

	return promise;
}

function triggerStorageReload() {
	disableOptions(true);
	browser.runtime.sendMessage({ target: "background", action: "reload-storage" });
}

function disableOptions(disabled) {
	let inputs = document.querySelectorAll("input, select");
	for (let input of inputs) {
		input.disabled = disabled;
	}
}

function applyStoredSettings() {
	badgeToggle.checked = storage.settings.showBadgeText;
	
	while (domainSelect.length > 0) domainSelect.remove(0);

	clearInfo();
	for (let property in storage) {
		if (property === "settings") continue;
		let opt		= document.createElement("option");
		opt.text	= property;
		opt.value	= property;
		domainSelect.add(opt);
	}
}

function textFromBool(bool) {
	return (bool === true ? "Enabled" : "Disabled");
}

function clearInfo() {
	let fill = "----";
	domainScripts.innerText	= fill;
	domainStyles.innerText	= fill;
	domainImages.innerText	= fill;
	domainObjects.innerText	= fill;
	domainMedia.innerText	= fill;

	domainScripts.dataset.enabled	= "";
	domainStyles.dataset.enabled	= "";
	domainImages.dataset.enabled	= "";
	domainObjects.dataset.enabled	= "";
	domainMedia.dataset.enabled		= "";
}

function pad(input) {
	return input.toString().padStart(2, "0");
}

function importError() {
	alert("Import failed! Invalid content in json file.");
}

function processImport(imported) {
	if (!imported.hasOwnProperty("settings") || typeof imported.settings !== "object") return false;
	if (!imported.settings.hasOwnProperty("showBadgeText") || typeof imported.settings.showBadgeText !== "boolean") return false;
	for (let property in imported) {
		if (property === "settings") continue;

		if (!Array.isArray(imported[property]) || imported[property].length !== 5) return false;

		for (let i = 0; i < 5; i++) {
			if (typeof imported[property][i] !== "boolean") return false;
		}
	}

	browser.storage.local.clear().then(
		() => {
			browser.storage.local.set(imported).then(
				() => { triggerStorageReload(); },
				() => { }
			);
		},
		() => { }
	);

	return true;
}

// ----------------------------------------

clearInfo();

window.addEventListener("load", loadStorage);

document.getElementById("remove-all").addEventListener("click", e => {
	if (confirm("Delete all domain settings?")) {
		browser.storage.local.clear().then(
			() => {
				let tmp = (storage.settings ? storage.settings.showBadgeText === true : true);
				browser.storage.local.set({ settings: { showBadgeText: tmp } }).then(
					() => { triggerStorageReload(); },
					() => { }
				);
			},
			() => { }
		);
	}
});

badgeToggle.addEventListener("change", e => {
	storage.settings.showBadgeText = e.target.checked;
	browser.runtime.sendMessage({ target: "background", action: "set-badge-enabled", data: { showBadgeText: storage.settings.showBadgeText } });
});

domainSelect.addEventListener("change", e => {
	if (domainSelect.selectedOptions.length === 1) {
		let selection = storage[domainSelect.selectedOptions[0].value];
		domainScripts.innerText	= textFromBool(selection[0]);
		domainStyles.innerText	= textFromBool(selection[1]);
		domainImages.innerText	= textFromBool(selection[2]);
		domainObjects.innerText	= textFromBool(selection[3]);
		domainMedia.innerText	= textFromBool(selection[4]);

		domainScripts.dataset.enabled	= selection[0].toString();
		domainStyles.dataset.enabled	= selection[1].toString();
		domainImages.dataset.enabled	= selection[2].toString();
		domainObjects.dataset.enabled	= selection[3].toString();
		domainMedia.dataset.enabled		= selection[4].toString();
	}
	else {
		clearInfo();
	}
});

document.getElementById("remove").addEventListener("click", e => {
	if (domainSelect.selectedIndex === -1) return;

	let domain = domainSelect.selectedOptions[0].value;

	if (storage[domain]) delete storage[domain];
	browser.storage.local.remove(domain).then(
		() => { triggerStorageReload(); },
		() => { }
	);
});

document.getElementById("export").addEventListener("click", e => {
	let blob = new Blob([JSON.stringify(storage)], { type: "application/json" });
	let d = new Date();

	browser.downloads.download({
		saveAs: true,
		filename: `WebControl-${d.getFullYear()}-${pad(d.getMonth())}-${pad(d.getDate())}__${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.json`,
		url: URL.createObjectURL(blob)
	});
});

document.getElementById("import").addEventListener("click", e => {
	importFile.click();
});

importFile.addEventListener("change", e => {
	if (importFile.files.length === 0 || importFile.files[0].size === 0) {
		importError();
		return;
	}

	let reader = new FileReader();
	reader.onload = () => {
		try {
			let imported = JSON.parse(reader.result);
			if (!processImport(imported)) importError();
		}
		catch (error) {
			alert("Import failed! Syntax error in json file.");
		}
	};

	reader.readAsText(importFile.files[0]);
});

browser.runtime.onMessage.addListener(handleMessage);
