
/**
 * Siyagah (صياغة) Frontend Application
 */

// Your deployed Cloudflare Worker URL
const API_URL = "https://siyagah-api.omar20111109.workers.dev/";

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

    // Check that the required page elements exist
    if (
        !inputText ||
        !outputText ||
        !dialectSelect ||
        !styleSelect ||
        !intensityRange ||
        !intensityLabel ||
        !charCounter ||
        !btnRewrite ||
        !btnClear ||
        !btnCopy ||
        !btnDownload ||
        !btnReuse ||
        !statusBanner
    ) {
        console.error("Siyagah: One or more required HTML elements are missing.");
        return;
    }

    // Intensity Live Label Updater
    intensityRange.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        let category = "متوسطة";

        if (val < 35) {
            category = "خفيفة";
        } else if (val > 70) {
            category = "قوية";
        }

        intensityLabel.textContent = `${category} (${val}%)`;
    });

    // Character Counter
    inputText.addEventListener("input", () => {
        const count = inputText.value.length;
        charCounter.textContent =
            `${count.toLocaleString("ar-EG")} / 12,000`;
    });

    // Keyboard Shortcut: Ctrl/Cmd + Enter
    inputText.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            triggerRewrite();
        }
    });

    // Rewrite Button
    btnRewrite.addEventListener("click", triggerRewrite);

    async function triggerRewrite() {
        const text = inputText.value.trim();

        if (!text) {
            showStatus("يرجى إدخال نص لإعادة صياغته.", "error");
            return;
        }

        if (text.length > 12000) {
            showStatus(
                "النص أطول من الحد المسموح به (12,000 حرف).",
                "error"
            );
            return;
        }

        setLoadingState(true);
        showStatus("جاري إعادة الصياغة بالذكاء الاصطناعي...", "info");

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    text: text,
                    dialect: dialectSelect.value,
                    style: styleSelect.value,
                    intensity: parseInt(intensityRange.value, 10)
                })
            });

            let data;

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    "استجابة غير صالحة من الخادم. يرجى المحاولة لاحقاً."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.error || "حدث خطأ غير متوقع في الخادم."
                );
            }

            if (
                typeof data.rewritten_text !== "string" ||
                !data.rewritten_text.trim()
            ) {
                throw new Error("لم يتم استلام نص معاد صياغته.");
            }

            // Display the result safely
            outputText.textContent = data.rewritten_text.trim();
            outputText.classList.remove("placeholder");

            enableOutputButtons(true);
            showStatus("تمت إعادة الصياغة بنجاح!", "success");

        } catch (err) {
            console.error("Siyagah rewrite error:", err);

            if (err instanceof TypeError) {
                showStatus(
                    "تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مجدداً.",
                    "error"
                );
            } else {
                showStatus(`خطأ: ${err.message}`, "error");
            }
        } finally {
            setLoadingState(false);
        }
    }

    // Clear Button
    btnClear.addEventListener("click", () => {
        inputText.value = "";
        outputText.textContent =
            "ستظهر النتيجة هنا بعد إعادة الصياغة...";
        outputText.classList.add("placeholder");

        charCounter.textContent = "0 / 12,000";

        enableOutputButtons(false);
        hideStatus();
        inputText.focus();
    });

    // Reuse Output Button
    btnReuse.addEventListener("click", () => {
        if (outputText.classList.contains("placeholder")) {
            return;
        }

        inputText.value = outputText.textContent;
        charCounter.textContent =
            `${inputText.value.length.toLocaleString("ar-EG")} / 12,000`;

        showStatus("تم نقل النص إلى صندوق المدخلات.", "info");
        inputText.focus();
    });

    // Copy Button
    btnCopy.addEventListener("click", async () => {
        const text = outputText.textContent;

        if (outputText.classList.contains("placeholder") || !text) {
            return;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const tempTextArea = document.createElement("textarea");
                tempTextArea.value = text;
                tempTextArea.style.position = "fixed";
                tempTextArea.style.opacity = "0";

                document.body.appendChild(tempTextArea);
                tempTextArea.select();

                const copied = document.execCommand("copy");
                document.body.removeChild(tempTextArea);

                if (!copied) {
                    throw new Error("Copy command failed");
                }
            }

            showStatus("تم نسخ النص إلى الحافظة!", "success");

        } catch (err) {
            console.error("Siyagah copy error:", err);
            showStatus("تعذر نسخ النص تلقائياً.", "error");
        }
    });

    // Download Button
    btnDownload.addEventListener("click", () => {
        const text = outputText.textContent;

        if (outputText.classList.contains("placeholder") || !text) {
            return;
        }

        const blob = new Blob([text], {
            type: "text/plain;charset=utf-8"
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download =
            `صياغة_${new Date().toISOString().slice(0, 10)}.txt`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    });

    // Loading State
    function setLoadingState(isLoading) {
        btnRewrite.disabled = isLoading;
        btnClear.disabled = isLoading;

        btnRewrite.textContent = isLoading
            ? "جاري الصياغة..."
            : "أعد الصياغة ✨";
    }

    // Enable or Disable Output Buttons
    function enableOutputButtons(enabled) {
        btnCopy.disabled = !enabled;
        btnDownload.disabled = !enabled;
        btnReuse.disabled = !enabled;
    }

    // Status Message
    function showStatus(msg, type) {
        statusBanner.textContent = msg;
        statusBanner.className = `status-banner ${type}`;
    }

    // Hide Status Message
    function hideStatus() {
        statusBanner.className = "status-banner hidden";
        statusBanner.textContent = "";
    }

    // Initialize the output buttons as disabled
    enableOutputButtons(false);
});
