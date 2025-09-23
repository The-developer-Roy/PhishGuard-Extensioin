const analyzeBtn = document.getElementById("analyzeBtn");
const resultDiv = document.getElementById("result");

function setLoading(isLoading) {
  if (isLoading) {
    resultDiv.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Analyzing email...</p>
      </div>
    `;
  } else {
    resultDiv.innerHTML = "";
  }
}

function renderLinkResult(link, legit, verdict) {
  const card = document.createElement("div");
  card.className = "link-card";

  const verdictClass = verdict.includes("Safe") ? "safe" : "suspicious";

  card.innerHTML = `
    <p class="link-text">${link}</p>
    <p class="score">Score: <b>${legit}</b></p>
    <span class="verdict ${verdictClass}">${verdict}</span>
  `;

  resultDiv.appendChild(card);
}

analyzeBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () => {
        let emailBody = document.querySelector("div.ii.gt");
        return emailBody ? emailBody.innerHTML : "";
      }
    },
    async (results) => {
      let htmlContent = results[0].result;
      if (!htmlContent) {
        resultDiv.innerText = "❌ No email detected!";
        return;
      }

      try {
        setLoading(true);

        // Step 1: Extract links via your extractor API
        let response = await fetch("https://extractor-api-cxgh.onrender.com/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email_body: htmlContent })
        });

        let data = await response.json();
        let links = data.links || [];

        if (links.length === 0) {
          setLoading(false);
          resultDiv.innerText = "⚠️ No links found!";
          return;
        }

        setLoading(false);
        resultDiv.innerHTML = `<h3>Links Found: ${links.length}</h3>`;

        // Step 2: Send each link to your AI model API
        for (let link of links) {
          try {
            let aiRes = await fetch("https://phishguard-api-1o0r.onrender.com/predict", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: link })
            });

            let aiData = await aiRes.json();

            console.log(aiData);

            let legit =
              aiData.confidence?.Legit !== undefined
                ? aiData.confidence.Legit
                : "Error";

            let verdict = legit >= 0.5 ? "✅ Safe" : "⚠️ Suspicious";

            renderLinkResult(link, legit, verdict);
          } catch (err) {
            renderLinkResult(link, "Error", "❌ Failed to analyze");
          }
        }
      } catch (err) {
        setLoading(false);
        resultDiv.innerText = "Error: " + err.message;
      }
    }
  );
});
