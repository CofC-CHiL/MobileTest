// ============================================================
// SHOC AI Chatbot – Lightweight assistant for the SHOC map
// Uses Google Gemini API (free tier) for natural‑language Q&A
// ============================================================

(function () {
    "use strict";

    // ── Gemini Configuration ──────────────────────────────────
    const GEMINI_API_KEY = ""; // User must supply key
    const GEMINI_MODEL = "gemini-2.0-flash";
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=`;

    // ── System prompt (SHOC context) ─────────────────────────
    const SYSTEM_PROMPT = `You are SHOC Assistant, a helpful and concise AI guide for the Spatial History of Charleston (SHOC) interactive map website.

ABOUT SHOC:
- SHOC is a deep-mapping project by the College of Charleston that overlays historic maps and data onto a modern map of Charleston, SC.
- The site lets users explore places, people, and historic maps from roughly 1670–1950.
- Data comes from ArcGIS feature layers hosted on the College of Charleston's GIS server (lyre.cofc.edu).

AVAILABLE DATA LAYERS:
1. **Historic Maps (map_index)** – Georeferenced tile layers of historic plats, surveys, and city maps. Attributes: title, cartographer, mapyear, publisher, map_author, source_type, source_caption.
2. **Places Index (places_index)** – Point locations representing historic addresses. Attributes: orig_no_street_address, place_ID, OBJECTID.
3. **Places Detail (places)** – Detailed records of structures at each place. Attributes: orig_address_no, orig_address_street, orig_city, prime_material, add_material, function_prime, function_second, place_descript, source_year, place_source, max_stories, curr_address_no, curr_address_street, curr_city, map_url.
4. **People (DBO_people_cd1888)** – 1888 City Directory entries. Attributes: USER_Salutation, USER_Given_Name, USER_Surname, USER_Name_as_given, USER_cccupation_title, USER_business_name_employer, USER_Office_Business_Address, USER_Residence_cityDirect, USER_Other_desription, resident_boards, USER_POC, USER_Business_Name, USER_street_number_name.

WEBSITE FEATURES YOU CAN EXPLAIN:
- Search bar: searches across maps, places, and people simultaneously.
- Date range slider (1670–1950): filters points and maps by year.
- Historic Map Opacity slider: adjusts transparency of overlay map.
- Sidebar tabs: Maps, Places, People – each shows filtered results.
- Clicking a point on the map shows its details; clicking a map in the list loads it as an overlay.
- "Take a Tour" button walks users through the interface.
- Places/People tabs: Toggle which layer of points is visible on the map.

ACTIONS YOU CAN TRIGGER:
When it would be helpful, include ONE of these special action tags in your response. Place them on their own line at the very end of your message:
- [ACTION:SEARCH:query text] – Fills the search bar with "query text" and triggers a search.
- [ACTION:ZOOM:longitude,latitude,zoomLevel] – Zooms the map to specific coordinates.
- [ACTION:TOUR] – Starts the guided tour of the interface.
- [ACTION:TAB:maps|places|people] – Switches to the specified sidebar tab.
- [ACTION:DATE:minYear,maxYear] – Sets the date range slider.

GUIDELINES:
- Be concise (2-4 sentences typical). Use bullet points for lists.
- When users ask about a place or person, suggest searching for it.
- When users seem lost, suggest starting the tour.
- If asked about data not in the system, say so honestly.
- Do not make up historical facts; stick to what the data layers contain.
- Respond in a friendly, knowledgeable tone.`;

    // ── Chat History ──────────────────────────────────────────
    let chatHistory = [];

    // ── Build DOM ─────────────────────────────────────────────
    function buildUI() {
        // FAB button
        const fab = document.createElement("button");
        fab.id = "shoc-chat-fab";
        fab.setAttribute("aria-label", "Open SHOC Assistant");
        fab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>`;
        document.body.appendChild(fab);

        // Chat window
        const win = document.createElement("div");
        win.id = "shoc-chat-window";
        win.innerHTML = `
            <div id="shoc-chat-header">
                <div>
                    <div class="chat-title">SHOC Assistant</div>
                    <div class="chat-subtitle">AI-powered map guide</div>
                </div>
                <button id="shoc-chat-close" aria-label="Close chat">&times;</button>
            </div>
            <div id="shoc-chat-messages"></div>
            <div class="chat-suggestions" id="shoc-chat-suggestions"></div>
            <div id="shoc-chat-input-area">
                <input id="shoc-chat-input" type="text" placeholder="Ask about Charleston history…" autocomplete="off" />
                <button id="shoc-chat-send" aria-label="Send">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
            </div>`;
        document.body.appendChild(win);

        // Wire events
        fab.addEventListener("click", toggleChat);
        document.getElementById("shoc-chat-close").addEventListener("click", toggleChat);
        document.getElementById("shoc-chat-send").addEventListener("click", sendMessage);
        document.getElementById("shoc-chat-input").addEventListener("keydown", (e) => {
            if (e.key === "Enter") sendMessage();
        });

        // Welcome message
        addBotMessage("👋 Hi! I'm the **SHOC Assistant**. I can help you explore Charleston's spatial history.\n\nTry asking about a place, a person from the 1888 directory, or how to use the map!");
        showSuggestions([
            "What is the SHOC project?",
            "Search for King Street",
            "Show me maps from the 1800s",
            "Start the tour"
        ]);
    }

    // ── Toggle Chat Window ────────────────────────────────────
    function toggleChat() {
        const win = document.getElementById("shoc-chat-window");
        win.classList.toggle("open");
    }

    // ── Add Messages ──────────────────────────────────────────
    function addBotMessage(text) {
        const container = document.getElementById("shoc-chat-messages");
        const div = document.createElement("div");
        div.className = "chat-msg bot";
        div.innerHTML = formatMarkdown(text);
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function addUserMessage(text) {
        const container = document.getElementById("shoc-chat-messages");
        const div = document.createElement("div");
        div.className = "chat-msg user";
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function showTyping() {
        const container = document.getElementById("shoc-chat-messages");
        const div = document.createElement("div");
        div.className = "chat-msg bot typing";
        div.id = "shoc-typing";
        div.innerHTML = "<span></span><span></span><span></span>";
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function removeTyping() {
        const el = document.getElementById("shoc-typing");
        if (el) el.remove();
    }

    // ── Suggestion Chips ──────────────────────────────────────
    function showSuggestions(items) {
        const box = document.getElementById("shoc-chat-suggestions");
        box.innerHTML = "";
        items.forEach((text) => {
            const chip = document.createElement("button");
            chip.className = "chat-chip";
            chip.textContent = text;
            chip.addEventListener("click", () => {
                document.getElementById("shoc-chat-input").value = text;
                sendMessage();
            });
            box.appendChild(chip);
        });
    }

    function clearSuggestions() {
        document.getElementById("shoc-chat-suggestions").innerHTML = "";
    }

    // ── Simple Markdown ───────────────────────────────────────
    function formatMarkdown(text) {
        // Remove action tags from display
        let clean = text.replace(/\[ACTION:[^\]]+\]/g, "").trim();
        // Bold
        clean = clean.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        // Newlines
        clean = clean.replace(/\n/g, "<br>");
        // Bullet points
        clean = clean.replace(/^- /gm, "• ");
        return clean;
    }

    // ── Execute Actions from Bot Response ─────────────────────
    function executeActions(text) {
        const actionMatch = text.match(/\[ACTION:(\w+)(?::([^\]]*))?\]/);
        if (!actionMatch) return;

        const type = actionMatch[1];
        const param = actionMatch[2] || "";

        switch (type) {
            case "SEARCH": {
                const searchBar = document.getElementById("searchBar");
                const searchButton = document.getElementById("searchButton");
                if (searchBar) {
                    searchBar.value = param;
                    searchBar.dispatchEvent(new Event("input", { bubbles: true }));
                    // Open sidebar
                    const featureNode = document.getElementById("feature-node");
                    if (featureNode) featureNode.style.display = "block";
                }
                break;
            }
            case "ZOOM": {
                const parts = param.split(",").map(Number);
                if (parts.length >= 2 && window.SHOC_VIEW && window.SHOC_VIEW.view) {
                    const opts = { center: [parts[0], parts[1]] };
                    if (parts[2]) opts.zoom = parts[2];
                    window.SHOC_VIEW.view.goTo(opts);
                }
                break;
            }
            case "TOUR": {
                if (typeof window.startTour === "function") {
                    setTimeout(() => window.startTour(), 500);
                    // Close chat so tour is visible
                    document.getElementById("shoc-chat-window").classList.remove("open");
                }
                break;
            }
            case "TAB": {
                const tabMap = { maps: "mapsCounter", places: "pointsCounter", people: "peopleCounter" };
                const tabId = tabMap[param.toLowerCase()];
                if (tabId) {
                    $(`#${tabId}`).tab("show");
                    const featureNode = document.getElementById("feature-node");
                    if (featureNode) featureNode.style.display = "block";
                }
                break;
            }
            case "DATE": {
                const [minY, maxY] = param.split(",").map(Number);
                const sl = document.getElementById("dateSlider_l");
                const sr = document.getElementById("dateSlider_r");
                if (sl && sr && minY && maxY) {
                    sl.value = minY;
                    sr.value = maxY;
                    sl.dispatchEvent(new Event("input", { bubbles: true }));
                    sr.dispatchEvent(new Event("input", { bubbles: true }));
                }
                break;
            }
        }
    }

    // ── Send Message ──────────────────────────────────────────
    async function sendMessage() {
        const input = document.getElementById("shoc-chat-input");
        const text = input.value.trim();
        if (!text) return;

        addUserMessage(text);
        input.value = "";
        clearSuggestions();
        showTyping();

        // Add to history
        chatHistory.push({ role: "user", parts: [{ text }] });

        try {
            const reply = await callGemini(text);
            removeTyping();
            addBotMessage(reply);
            executeActions(reply);

            // Contextual follow-up suggestions
            showSuggestions(generateFollowUps(reply));
        } catch (err) {
            removeTyping();
            addBotMessage("Sorry, I'm having trouble connecting right now. Please try again in a moment.");
            console.error("Chatbot error:", err);
        }
    }

    // ── Call Gemini API ───────────────────────────────────────
    async function callGemini(userMessage) {
        if (!GEMINI_API_KEY) {
            return handleOfflineResponse(userMessage);
        }

        const body = {
            system_instruction: {
                parts: [{ text: SYSTEM_PROMPT }]
            },
            contents: chatHistory.slice(-10), // Keep last 10 turns
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 300,
                topP: 0.9
            }
        };

        const res = await fetch(GEMINI_URL + GEMINI_API_KEY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error("Gemini API error:", errData);
            return handleOfflineResponse(userMessage);
        }

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try rephrasing.";

        // Save assistant response to history
        chatHistory.push({ role: "model", parts: [{ text: reply }] });

        return reply;
    }

    // ── Helpers for word-boundary matching ───────────────────
    // Returns true only if `word` appears as a whole word (not as a
    // substring of another word, e.g. "how" inside "show").
    function hasWord(text, word) {
        return new RegExp(`\\b${word}\\b`, "i").test(text);
    }
    function hasAnyWord(text, words) {
        return words.some(w => hasWord(text, w));
    }

    // Try to extract a street address like "106 Coming Street" or
    // "12 King St" from a message. Returns the address string or null.
    function extractAddress(text) {
        const m = text.match(/\b(\d{1,5}\s+[A-Za-z][A-Za-z\s]{1,30}?\b(?:street|st|road|rd|ave|avenue|blvd|boulevard|lane|ln|drive|dr|way|place|pl|court|ct|alley|row))\b/i);
        return m ? m[1].trim() : null;
    }

    // ── Offline / No-API-Key Fallback ────────────────────────
    function handleOfflineResponse(msg) {
        const lower = msg.toLowerCase();

        // ── 1. Address-specific queries ("106 Coming Street", "who lived at…") ──
        const address = extractAddress(msg);
        if (address) {
            // If they're asking about people at an address
            if (hasAnyWord(lower, ["who", "lived", "live", "anyone", "person", "people", "resident", "residents", "occupy", "occupied"])) {
                return `Let me search for people and places at **${address}**. I'll pull up the search results for you!\n\n[ACTION:SEARCH:${address}]`;
            }
            // Otherwise just search the address
            return `Searching for **${address}** on the map!\n\n[ACTION:SEARCH:${address}]`;
        }

        // ── 2. "Who lived at" without a parseable address ──
        if (hasAnyWord(lower, ["who", "lived", "anyone"]) && hasAnyWord(lower, ["at", "on", "street", "st", "address"])) {
            // Try to extract whatever comes after "at" or "on"
            const afterAt = msg.match(/(?:at|on)\s+(.{3,})/i);
            if (afterAt) {
                const searchTerm = afterAt[1].replace(/[?.!]+$/, "").trim();
                return `Let me search for **${searchTerm}** to find who may have lived there!\n\n[ACTION:SEARCH:${searchTerm}]`;
            }
            return "I can look up residents from the **1888 City Directory**! Just tell me a street address (e.g. \"106 Coming Street\") and I'll search for it.";
        }

        // ── 3. People / 1888 directory intent ──
        // Check this BEFORE the generic "show" / "search" handlers so
        // "show people" doesn't fall through to something else.
        if (hasAnyWord(lower, ["people", "person", "persons", "resident", "residents", "1888", "directory"])) {
            return "The **People** layer contains entries from the **1888 Charleston City Directory**. You can search by name, occupation, or street address. Let me switch to the People tab!\n\n[ACTION:TAB:people]";
        }

        // ── 4. Tour / help (word-boundary so "show" ≠ "how") ──
        if (hasWord(lower, "tour") || (hasWord(lower, "help") && !hasWord(lower, "search")) || hasWord(lower, "how to") || (hasWord(lower, "how") && hasAnyWord(lower, ["use", "do", "does", "work", "works", "start"]))) {
            return "Let me start the guided tour for you! It will walk you through all the features of the map.\n\n[ACTION:TOUR]";
        }

        // ── 5. Specific well-known streets ──
        if (lower.includes("king street") || lower.includes("king st")) {
            return "Let me search for **King Street** on the map for you!\n\n[ACTION:SEARCH:King Street]";
        }
        if (lower.includes("meeting street") || lower.includes("meeting st")) {
            return "Searching for **Meeting Street**…\n\n[ACTION:SEARCH:Meeting Street]";
        }
        if (lower.includes("broad street") || lower.includes("broad st")) {
            return "Searching for **Broad Street**…\n\n[ACTION:SEARCH:Broad Street]";
        }
        if (lower.includes("church street") || lower.includes("church st")) {
            return "Searching for **Church Street**…\n\n[ACTION:SEARCH:Church Street]";
        }
        if (lower.includes("tradd street") || lower.includes("tradd st")) {
            return "Searching for **Tradd Street**…\n\n[ACTION:SEARCH:Tradd Street]";
        }

        // ── 6. Generic search / find / show intent ──
        if (hasAnyWord(lower, ["search", "find", "look", "show", "where"])) {
            const terms = msg.replace(/\b(search|find|look|show|where|for|up|me|the|can|you|is|are|was|were|it|a|an)\b/gi, "").trim();
            if (terms.length > 1) {
                return `Searching for **${terms}**…\n\n[ACTION:SEARCH:${terms}]`;
            }
            return "What would you like me to search for? You can ask about a street, a building type, a person's name, or a material like 'brick' or 'wood'.";
        }

        // ── 7. Map date filtering ──
        if (hasWord(lower, "map") || hasWord(lower, "maps")) {
            const yearMatch = lower.match(/\b(1[6-9]\d{2})\b/);
            if (yearMatch) {
                const decade = Math.floor(parseInt(yearMatch[1]) / 100) * 100;
                return `Let me filter the date range to show historic maps from the ${decade}s!\n\n[ACTION:DATE:${decade},${decade + 99}]`;
            }
            if (lower.includes("18th") || lower.includes("1800")) {
                return "Let me filter the date range to show historic maps from the 1800s!\n\n[ACTION:DATE:1800,1899]";
            }
            if (lower.includes("17th") || lower.includes("1700")) {
                return "Let me filter the date range to show historic maps from the 1700s!\n\n[ACTION:DATE:1670,1799]";
            }
            if (lower.includes("19th") || lower.includes("1900")) {
                return "Let me filter the date range to show historic maps from the 1900s!\n\n[ACTION:DATE:1900,1950]";
            }
            return "The **Maps** tab shows georeferenced historic maps that overlay onto the modern map. Use the **Date Range** slider (1670–1950) to filter by era, or search for a map title. Let me switch to the Maps tab!\n\n[ACTION:TAB:maps]";
        }

        // ── 8. What is SHOC? ──
        if ((lower.includes("what is") || lower.includes("what's") || lower.includes("tell me about")) && lower.includes("shoc")) {
            return "**SHOC** (Spatial History of Charleston) is a deep-mapping project by the College of Charleston. It overlays georeferenced historic maps onto a modern base map and connects them with detailed records of **places** and **people** from Charleston's past (1670–1950).";
        }

        // ── 9. Zoom to Charleston ──
        if (hasWord(lower, "zoom") && lower.includes("charleston")) {
            return "Zooming to the heart of historic Charleston!\n\n[ACTION:ZOOM:-79.931,32.776,16]";
        }

        // ── 10. Opacity / transparency ──
        if (lower.includes("opacity") || lower.includes("transparent") || lower.includes("transparency")) {
            return "You can adjust the historic map transparency using the **Historic Map Opacity** slider in the top navigation bar. Slide it left to see more of the modern base map underneath.";
        }

        // ── 11. Greetings ──
        if (hasAnyWord(lower, ["hi", "hello", "hey", "yo", "sup", "greetings"])) {
            return "Hello! 👋 I can help you explore Charleston's spatial history. Try asking about a street address, a person from the 1888 directory, or how to use the map!";
        }

        // ── 12. Thanks ──
        if (hasAnyWord(lower, ["thanks", "thank", "thx", "ty"])) {
            return "You're welcome! Let me know if there's anything else you'd like to explore on the map. 😊";
        }

        // ── Default ──
        return "I can help you explore the SHOC map! Try asking me to:\n- **Search** for a street or address (e.g. \"106 Coming Street\")\n- **Who lived** at a specific address\n- **Show maps** from a specific era (e.g. \"maps from 1800s\")\n- **Start the tour** to learn the interface\n\nWhat would you like to know?";
    }

    // ── Generate Follow-up Suggestions ────────────────────────
    function generateFollowUps(reply) {
        const lower = reply.toLowerCase();
        if (lower.includes("search") || lower.includes("street")) {
            return ["Who lived at 106 Coming St?", "Maps from 1800s", "What is SHOC?"];
        }
        if (lower.includes("tour")) {
            return ["Search 42 Broad Street", "People from 1888", "Show maps"];
        }
        if (lower.includes("people") || lower.includes("1888") || lower.includes("directory")) {
            return ["Search for a name", "Show maps from 1888", "Search King Street"];
        }
        if (lower.includes("map")) {
            return ["Search for a place", "People from 1888", "What is SHOC?"];
        }
        return ["Search 106 Coming Street", "Show maps from 1800s", "Start the tour", "What is SHOC?"];
    }

    // ── Initialize on DOM Ready ───────────────────────────────
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", buildUI);
    } else {
        buildUI();
    }
})();
