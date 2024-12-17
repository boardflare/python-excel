import { abortController } from "./utils/common.js";
import { createNewFunction } from "./editor/create.js";

window.appName = 'Python';

// Google Analytics config
window.appConfig = {
    app_version: "1.0.7",
    content_group: window.appName,
    content_type: "Excel",
};

window.supportsF16 = false;
window.isChromiumOrEdge = false;

// Function to initialize browser info
async function initializeBrowserInfo() {
    // Browser info
    const adapter = await navigator.gpu.requestAdapter();
    window.supportsF16 = adapter?.features.has('shader-f16');
    const memory = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;
    const downlink = navigator.connection.downlink;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-8XNNM225DV', {
        ...window.appConfig,
        //debug_mode: true,
        supportsF16: window.supportsF16,
        memory: memory,
        cores: cores
    });

    // Set isChromiumOrEdge value
    const brands = navigator.userAgentData?.brands;
    if (brands) {
        isChromiumOrEdge = brands.some(brand => ["Chromium", "Microsoft Edge"].includes(brand.brand));
    }
}

// Setup page on load
document.addEventListener('DOMContentLoaded', async function () {
    await initializeBrowserInfo();

    // cancel button
    const cancelButton = document.getElementById('cancelButton');
    cancelButton.addEventListener('click', function () {
        this.disabled = true; // disable the button after first click
        console.log('Cancel button clicked from taskpane!');
        // Abort ongoing tasks in p-queue
        abortController.abort();
        // Reload to reset the app
        setTimeout(function () {
            location.reload();
        }, 500);
    });
});

// Add button handlers when Office is ready
Office.onReady(() => {
    document.getElementById("createNewFunction").onclick = createNewFunction;
});