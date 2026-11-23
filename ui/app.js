const processButton = document.querySelector("#process");
const status = document.querySelector("#status");
const clips = document.querySelector("#clips");

processButton.addEventListener("click", async () => {
  const payload = {
    path: document.querySelector("#video").value.trim(),
    count: Number(document.querySelector("#count").value),
    min: Number(document.querySelector("#min").value),
    max: Number(document.querySelector("#max").value),
    out: document.querySelector("#out").value.trim() || "./out",
    dryRun: document.querySelector("#dry").checked,
    force: document.querySelector("#force").checked,
    uppercase: document.querySelector("#uppercase").checked,
  };
  processButton.disabled = true;
  status.className = "status";
  status.textContent = "Analyzing video and generating clips...";
  clips.innerHTML = "";
  try {
    const response = await fetch("/api/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    const list = result.clips ?? result;
    status.textContent = `${list.length} clip${list.length === 1 ? "" : "s"} ready in ${payload.out}`;
    clips.innerHTML = list.map((clip) => `
      <article class="clip">
        <div class="index">${String(clip.index).padStart(2, "0")}</div>
        <div><h3>${escapeHtml(clip.title)}</h3><p>${formatTime(clip.start)} - ${formatTime(clip.end)} · ${escapeHtml(clip.reason)}</p></div>
        <div class="score">${clip.score}/10</div>
      </article>
    `).join("");
  } catch (error) {
    status.className = "status error";
    status.textContent = error.message;
  } finally {
    processButton.disabled = false;
  }
});

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}
