(() => {
  "use strict";

  const MAX_LENGTH = 12000;
  const form = document.getElementById("rewrite-form");
  const source = document.getElementById("source-text");
  const count = document.getElementById("char-count");
  const intensity = document.getElementById("intensity");
  const intensityValue = document.getElementById("intensity-value");
  const result = document.getElementById("result-text");
  const resultMeta = document.getElementById("result-meta");
  const status = document.getElementById("app-status");
  const rewriteButton = document.getElementById("rewrite-button");
  const clearButton = document.getElementById("clear-button");
  const reuseButton = document.getElementById("reuse-button");
  const copyButton = document.getElementById("copy-button");
  const downloadButton = document.getElementById("download-button");
  let rewrittenText = "";
  let isLoading = false;

  const arabicNumber = new Intl.NumberFormat("ar-EG");

  function setStatus(message, state = "") {
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  }

  function updateCount() {
    const length = Array.from(source.value).length;
    count.textContent = `${arabicNumber.format(length)} / ${arabicNumber.format(MAX_LENGTH)} حرف`;
    count.classList.toggle("near-limit", length >= MAX_LENGTH * 0.9);
    clearButton.disabled = isLoading || (length === 0 && !rewrittenText);
  }

  function updateIntensity() {
    const value = Number(intensity.value);
    const category = value <= 33 ? "خفيفة" : value <= 66 ? "متوسطة" : "قوية";
    intensityValue.textContent = `${category} (${arabicNumber.format(value)}٪)`;
    intensity.setAttribute("aria-valuetext", intensityValue.textContent);
    intensity.style.setProperty("--range-progress", `${value}%`);
  }

  function setResult(text) {
    rewrittenText = text;
    result.replaceChildren();
    result.textContent = text;
    result.classList.remove("has-result");
    void result.offsetWidth;
    result.classList.add("has-result");
    resultMeta.textContent = `${arabicNumber.format(Array.from(text).length)} حرف`;
    reuseButton.disabled = false;
    copyButton.disabled = false;
    downloadButton.disabled = false;
    updateCount();
  }

  function resetResult() {
    rewrittenText = "";
    result.classList.remove("has-result");
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "ستظهر صياغتك الجديدة هنا";
    const emptyRule = document.createElement("span");
    emptyRule.className = "empty-rule";
    emptyRule.setAttribute("aria-hidden", "true");
    const emptyNote = document.createElement("p");
    emptyNote.className = "empty-note";
    emptyNote.textContent = "ابدأ بنصّك، وسنحافظ على فكرته.";
    result.replaceChildren(emptyMessage, emptyRule, emptyNote);
    resultMeta.textContent = "بانتظار نصّك";
    reuseButton.disabled = true;
    copyButton.disabled = true;
    downloadButton.disabled = true;
    updateCount();
  }

  function setLoading(loading) {
    isLoading = loading;
    rewriteButton.classList.toggle("is-loading", loading);
    rewriteButton.disabled = loading;
    rewriteButton.setAttribute("aria-busy", String(loading));
    clearButton.disabled = loading || (source.value.length === 0 && !rewrittenText);
    reuseButton.disabled = loading || !rewrittenText;
    copyButton.disabled = loading || !rewrittenText;
    downloadButton.disabled = loading || !rewrittenText;
    source.readOnly = loading;
    form.querySelectorAll('input[name="dialect"], #style, #intensity').forEach((control) => {
      control.disabled = loading;
    });
    if (loading) setStatus("نبحث عن الصياغة الأقرب إلى قصدك…");
  }

  function configuredApiUrl() {
    const config = window.SIYAGAH_CONFIG;
    const url = config && typeof config.API_URL === "string" ? config.API_URL.trim() : "";
    if (!url || /(?:YOUR|PLACEHOLDER|REPLACE_ME|CHANGE_ME|example\.com)/i.test(url)) return "";
    return url;
  }

  async function rewrite(event) {
    event.preventDefault();
    if (isLoading) return;
    const text = source.value.trim();
    if (!text) {
      setStatus("اكتب نصّك أولاً، ثم أعد الصياغة.", "error");
      source.focus();
      return;
    }
    if (Array.from(source.value).length > MAX_LENGTH) {
      setStatus("النص أطول من الحد المسموح. اختصره إلى ١٢٬٠٠٠ حرف.", "error");
      source.focus();
      return;
    }
    const apiUrl = configuredApiUrl();
    if (!apiUrl) {
      setStatus("لم تُضبط خدمة الصياغة بعد. يجب إعداد عنوان الـ Worker في ملف الإعدادات قبل استخدام الأداة.", "error");
      return;
    }

    const dialect = form.querySelector('input[name="dialect"]:checked').value;
    const style = document.getElementById("style").value;
    const selectedIntensity = Number(intensity.value);
    setLoading(true);
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, dialect, style, intensity: selectedIntensity })
      });
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error("تعذّر قراءة رد الخدمة. حاول مرة أخرى.");
      }
      if (!response.ok) {
        const detail = typeof payload?.error === "string" ? payload.error : "";
        throw new Error(detail || "لم تكتمل إعادة الصياغة. حاول مرة أخرى.");
      }
      if (typeof payload?.rewritten_text !== "string" || !payload.rewritten_text.trim()) {
        throw new Error("لم تصل صياغة صالحة من الخدمة. حاول مرة أخرى.");
      }
      setResult(payload.rewritten_text);
      setStatus("اكتملت إعادة الصياغة. راجع النص الجديد قبل استخدامه.", "success");
    } catch (error) {
      setStatus(error instanceof TypeError
        ? "تعذّر الاتصال بخدمة الصياغة. تحقّق من الاتصال وحاول مرة أخرى."
        : (error.message || "حدث خطأ غير متوقع. حاول مرة أخرى."), "error");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!rewrittenText) return;
    try {
      await navigator.clipboard.writeText(rewrittenText);
      setStatus("نُسخت الصياغة الجديدة إلى الحافظة.", "success");
    } catch {
      const temporary = document.createElement("textarea");
      temporary.value = rewrittenText;
      temporary.setAttribute("readonly", "");
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.append(temporary);
      temporary.select();
      const copied = document.execCommand("copy");
      temporary.remove();
      setStatus(copied ? "نُسخت الصياغة الجديدة إلى الحافظة." : "تعذّر النسخ. حدّد النص وانسخه يدويًا.", copied ? "success" : "error");
    }
  }

  function downloadResult() {
    if (!rewrittenText) return;
    const blob = new Blob(["\uFEFF", rewrittenText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "siyagah-rewrite.txt";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("تم تنزيل الصياغة كملف نصي.", "success");
  }

  form.addEventListener("submit", rewrite);
  source.addEventListener("input", () => {
    updateCount();
    if (status.dataset.state === "error") setStatus("");
  });
  intensity.addEventListener("input", updateIntensity);
  clearButton.addEventListener("click", () => {
    source.value = "";
    resetResult();
    setStatus("تم مسح النص والصياغة الجديدة.");
    source.focus();
  });
  reuseButton.addEventListener("click", () => {
    if (!rewrittenText) return;
    source.value = Array.from(rewrittenText).slice(0, MAX_LENGTH).join("");
    updateCount();
    setStatus("أصبحت الصياغة الجديدة هي النص الأصلي. يمكنك تعديلها أو إعادة صياغتها.");
    source.focus();
  });
  copyButton.addEventListener("click", copyResult);
  downloadButton.addEventListener("click", downloadResult);
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!isLoading) form.requestSubmit();
    }
  });

  updateCount();
  updateIntensity();
})();
