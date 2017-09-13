"use strict";

let scriptCount	= 0;
let styleCount	= 0;
let imageCount	= 0;
let objectCount	= 0;
let mediaCount	= 0;

function getElementCounts() {
	let tmp_scriptCount	= document.getElementsByTagName("script").length;
	let tmp_styleCount	= document.getElementsByTagName("style").length;
	let tmp_imageCount	= document.getElementsByTagName("img").length;
	let tmp_objectCount	= document.getElementsByTagName("object").length + document.getElementsByTagName("embed").length + document.getElementsByTagName("applet").length;
	let tmp_mediaCount	= document.getElementsByTagName("audio").length + document.getElementsByTagName("video").length;

	let links = document.getElementsByTagName("link");
	for (let link of links) {
		if (link.getAttribute("type") === "text/css" || link.getAttribute("rel") === "stylesheet") tmp_styleCount++;
	}

	scriptCount	= Math.max(scriptCount, tmp_scriptCount);
	styleCount	= Math.max(styleCount, tmp_styleCount);
	imageCount	= Math.max(imageCount, tmp_imageCount);
	objectCount	= Math.max(objectCount, tmp_objectCount);
	mediaCount	= Math.max(mediaCount, tmp_mediaCount);

	browser.runtime.sendMessage({
		target: "background",
		action: "page-info",
		data: {
			"hostname": document.location.hostname,
			"counts": {
				"script":	scriptCount,
				"style":	styleCount,
				"image":	imageCount,
				"object":	objectCount,
				"media":	mediaCount
			}
		}
	});

	document.removeEventListener("DOMContentLoaded", getElementCounts);
}

function handleLoad() {
	getElementCounts();
	window.removeEventListener("load", handleLoad);
}

if (document.location.href.startsWith("http")) {
	window.addEventListener("load", handleLoad);
	document.addEventListener("DOMContentLoaded", getElementCounts);
}