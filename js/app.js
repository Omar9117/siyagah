/**
 * Siyagah (صياغة) Frontend Application
 */

// CONFIGURATION: Replace with your deployed Cloudflare Worker URL
const API_URL = "https://siyagah-api.YOUR-SUBDOMAIN.workers.dev/rewrite";

document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const inputText = document.getElementById("input-text");
    const outputText = document.getElementById("output-text");
    const dialectSelect = document.getElementById("dialect-select");
    const styleSelect = document.getElementById("style-select");
    const intensityRange = document.getElementById("intensity-range");
    const intensityLabel = document.getElementById("intensity-val-label");
    const charCounter = document.getElementById("char-counter");
    
    const btnRewrite = document.getElementById("btn-rewrite");
    const btnClear = document.getElementById("btn-clear");
    const btnCopy = document.getElementById("btn-copy");
    const btnDownload = document.getElementById("btn-download");
    const btnReuse = document.getElementById("btn-reuse");
    const statusBanner = document.getElementById("status-banner");

    // Intensity Live Label Updater
    intensityRange.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        let category = "متوسطة";
        if (val < 35) category = "خفيفة";
        else if (val > 70) category = "قوية";
        intensityLabel.textContent = `${category} (${val}%)`;
    });

    // Character Counter
    inputText.addEventListener("input", () => {
        const count = inputText.value.length;
        charCounter.textContent = `${count.toLocaleString('ar-EG')} / 12,000`;
    });

    // Keyboard Shortcut: Ctrl/Cmd + Enter
    inputText.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            triggerRewrite();
        }
    });

    // Trigger Rewrite Action
    btnRewrite.addEventListener("click", triggerRewrite);

    async function triggerRewrite() {
        const text = inputText.value.trim();

        if (!text) {
            showStatus("يرجى إدخال نص لإعادة صياغته.", "error");
            return;
        }

        if (text.length > 12000) {
            showStatus("النص أطول من الحد المسموح به (12,000 حرف).", "error");
            return;
        }

        setLoadingState(true);
        showStatus("جاري إعادة الصياغة بالذكاء الاصطناعي...", "info");

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text,
                    dialect: dialectSelect.value,
                    style: styleSelect.value,
                    intensity: parseInt(intensityRange.value, 10)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "حدث خطأ غير متوقع في الخادم.");
            }

            // Safe Rendering: assign textContent to prevent XSS
            outputText.textContent = data.rewritten_text;
            outputText.classList.remove("placeholder");
            enableOutputButtons(true);
            showStatus("تمت إعادة الصياغة بنجاح!", "success");

        } catch (err) {
            showStatus(`خطأ: ${err.message}`, "error");
        } finally {
            setLoadingState(false);
        }
    }

    // Clear Action
    btnClear.addEventListener("click", () => {
        inputText.value = "";
        outputText.textContent = "ستظهر النتيجة هنا بعد إعادة الصياغة...";
        outputText.classList.add("placeholder");
        charCounter.textContent = "0 / 12,000";
        enableOutputButtons(false);
        hideStatus();
    });

    // Reuse Output Action
    btnReuse.addEventListener("click", () => {
        if (outputText.classList.contains("placeholder")) return;
        inputText.value = outputText.textContent;
        charCounter.textContent = `${inputText.value.length.toLocaleString('ar-EG')} / 12,000`;
        showStatus("تم نقل النص إلى صندوق المدخلات.", "info");
    });

    // Copy Action
    btnCopy.addEventListener("click", async () => {
        const text = outputText.textContent;
        if (outputText.classList.contains("placeholder") || !text) return;

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Legacy fallback
                const tempTextArea = document.createElement("textarea");
                tempTextArea.value = text;
                document.body.appendChild(tempTextArea);
                tempTextArea.select();
                document.execCommand("copy");
                document.body.removeChild(tempTextArea);
            }
            showStatus("تم نسخ النص إلى المحفظة!", "success");
        } catch (err) {
            showStatus("تعذر نسخ النص تلقائياً.", "error");
        }
    });

    // Download Action
    btnDownload.addEventListener("click", () => {
        const text = outputText.textContent;
        if (outputText.classList.contains("placeholder") || !text) return;

        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `صياغة_${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Helpers
    function setLoadingState(isLoading) {
        btnRewrite.disabled = isLoading;
        btnClear.disabled = isLoading;
        if (isLoading) {
            btnRewrite.textContent = "جاري الصياغة...";
        } else {
            btnRewrite.textContent = "أعد الصياغة ✨";
        }
    }

    function enableOutputButtons(enabled) {
        btnCopy.disabled = !enabled;
        btnDownload.disabled = !enabled;
        btnReuse.disabled = !enabled;
    }

    function showStatus(msg, type) {
        statusBanner.textContent = msg;
        statusBanner.className = `status-banner ${type}`;
    }

    function hideStatus() {
        statusBanner.className = "status-banner hidden";
        statusBanner.textContent = "";
    }
});
