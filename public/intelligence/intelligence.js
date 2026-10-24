(() => {
 const $ = (id) => document.getElementById(id);
 const status = { argon: "NOT CONFIGURED", ultron: "NOT CONFIGURED", au: "FOUNDATION", data: "OFFLINE" };
 // This foundation deliberately does not manufacture live metrics. The protected overview
 // endpoint is added only after Access + D1 are configured; failures remain visibly offline.
 async function refresh() {
   $("refresh").disabled = true;
   $("refresh").textContent = "Checking…";
   const now = new Date();
   $("last-checked").textContent = "UI checked at " + now.toLocaleString() + " · not a monitoring heartbeat";
   try {
     const response = await fetch("/api/intelligence/overview", {headers:{"accept":"application/json"},cache:"no-store",credentials:"same-origin"});
     if (!response.ok) throw new Error("Protected intelligence API unavailable (" + response.status + ")");
     const data = await response.json();
     if (data.live !== true) throw new Error("Monitoring integrations are not verified");
     // Render only explicit server fields; no invented fallback metrics.
     const map = [["argon","argon"],["ultron","ultron"],["au","au"],["data","data"]];
     for (const [prefix,key] of map) {
       if (typeof data.agents?.[key]?.status === "string") $(prefix+"-status").textContent = data.agents[key].status.toUpperCase();
       if (typeof data.agents?.[key]?.detail === "string") $(prefix+"-detail").textContent = data.agents[key].detail;
     }
     document.querySelector(".status").innerHTML = '<i class="dot"></i> CONNECTED';
     document.querySelector(".status").style.color = "var(--blue)";
     $("incident-count").textContent = String(data.incidents?.length ?? 0) + " records";
     if (Array.isArray(data.incidents) && data.incidents.length) {
       $("incidents-empty").hidden = true;
       $("incidents-list").hidden = false;
       $("incidents-list").replaceChildren(...data.incidents.map(item => {
         const row = document.createElement("article"); row.className = "brief-row";
         const title = document.createElement("strong"); title.textContent = "["+String(item.severity||"unknown").toUpperCase()+"] "+String(item.title||"Untitled incident");
         const detail = document.createElement("p"); detail.textContent = String(item.summary||"") + " · source " + String(item.agent||"unknown") + " · confidence " + Math.round(Number(item.confidence||0)*100)+"%";
         row.append(title,detail); return row;
       }));
     }
   } catch {
     document.querySelector(".status").innerHTML = '<i class="dot amber"></i> NOT LIVE';
     $("incident-count").textContent = "No live feed";
   } finally {
     $("refresh").disabled = false; $("refresh").textContent = "↻ Refresh status";
   }
 }
 $("refresh").addEventListener("click", refresh);
 document.querySelectorAll(".nav").forEach(link => link.addEventListener("click", () => {
   document.querySelectorAll(".nav").forEach(item=>item.classList.remove("active")); link.classList.add("active");
 }));
 refresh();
})();