const API_URL = "http://localhost:3000/plants";
let localPlants = [];
let currentTab = "All";

const plantGrid = document.getElementById("plantGrid");
const searchBar = document.getElementById("searchBar");
const tabButtons = document.querySelectorAll(".tab-btn");
const addPlantForm = document.getElementById("addPlantForm");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");

// 1. Fetch List (GET)
async function fetchPlants() {
    loadingState.style.display = "block";
    errorState.style.display = "none";
    plantGrid.innerHTML = "";
    
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Fetch failed");
        localPlants = await response.json();
        loadingState.style.display = "none";
        renderGrid();
    } catch (err) {
        loadingState.style.display = "none";
        errorState.style.display = "block";
    }
}

// 2. Display List & Calculate Health
function renderGrid() {
    plantGrid.innerHTML = "";
    const query = searchBar.value.toLowerCase();

    const filtered = localPlants.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(query);
        const matchesTab = currentTab === "All" || p.category === currentTab;
        return matchesSearch && matchesTab;
    });

    if (filtered.length === 0) {
        plantGrid.innerHTML = "<p class='status-message'>No plants in this category.</p>";
        return;
    }

    filtered.forEach(plant => {
        const msPassed = Date.now() - plant.lastWateredTime;
        const msIn24h = 86400000;
        const health = Math.max(0, Math.floor(((msIn24h - msPassed) / msIn24h) * 100));
        const isThirsty = msPassed > msIn24h;

        const card = document.createElement("div");
        card.className = "modern-card";
        card.innerHTML = `
            <div class="card-top">
                <img src="https://loremflickr.com/320/240/${plant.name.replace(/\s/g, ',')},plant,nature/all?sig=${plant.id}" alt="${plant.name}">
                <div class="tag">${plant.category}</div>
            </div>
            <div class="card-info">
                <h3>${plant.name}</h3>
                <div class="time-info">
                    <p>📅 Added: ${plant.addedAt}</p>
                    <p>📍 Location: ${plant.location}</p>
                    <p>🚿 Last Watered: ${new Date(plant.lastWateredTime).toLocaleString()}</p>
                </div>
                <div class="health-box">
                    <div class="h-labels">
                        <span>Health: ${health}%</span>
                        <span class="${isThirsty ? 'thirsty' : 'healthy'}">${isThirsty ? 'THIRSTY' : 'HEALTHY'}</span>
                    </div>
                    <div class="h-bg"><div class="h-fill" style="width: ${health}%; background: ${health < 30 ? '#ef233c' : '#52b788'}"></div></div>
                </div>
                <div class="card-footer">
                    <span class="pill">Watered: ${plant.waterCount} times</span>
                    <button class="water-btn" data-id="${plant.id}">Water Now</button>
                </div>
            </div>
        `;
        
        card.querySelector(".water-btn").addEventListener("click", () => waterNow(plant));
        plantGrid.appendChild(card);
    });
}

// 3. Quick Water (PUT)
async function waterNow(plant) {
    const updated = { ...plant, waterCount: plant.waterCount + 1, lastWateredTime: Date.now() };
    try {
        const res = await fetch(`${API_URL}/${plant.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated)
        });
        if (res.ok) fetchPlants();
    } catch (e) {
        console.error("Failed to update watering", e);
    }
}

// 4. Form Submit & Inline Validation (POST)
addPlantForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    document.querySelectorAll(".error-msg").forEach(err => err.textContent = "");

    const dbSelect = document.getElementById("plantSelect").value;
    const customInput = document.getElementById("plantCustom").value.trim();
    const age = document.getElementById("plantAge").value;
    const location = document.getElementById("plantLocation").value.trim();
    const notes = document.getElementById("plantNotes").value.trim();

    const finalName = customInput || dbSelect;
    let isValid = true;

    if (!finalName) { document.getElementById("nameError").textContent = "Select a plant or type custom name"; isValid = false; }
    if (!age) { document.getElementById("ageError").textContent = "Age is required"; isValid = false; }
    if (!location) { document.getElementById("locError").textContent = "Location is required"; isValid = false; }
    if (!notes) { document.getElementById("notesError").textContent = "Care notes are required"; isValid = false; }

    if (!isValid) return;

    // Automatic Category assignment
    let category = "Indoor & Medical"; 
    if (["Rose", "Jasmine", "Sunflower"].includes(finalName)) category = "Flowers";
    else if (["Mango Tree", "Neem Tree", "Apple Tree"].includes(finalName)) category = "Fruits & Trees";

    const newPlant = {
        name: finalName,
        category,
        age: parseInt(age),
        location,
        notes,
        addedAt: new Date().toLocaleString(),
        waterCount: 0,
        lastWateredTime: Date.now()
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newPlant)
        });
        if (res.ok) {
            addPlantForm.reset();
            fetchPlants(); // Auto re-render
        }
    } catch (err) {
        console.error(err);
    }
});

// Search & Filtering Input Listeners
searchBar.addEventListener("input", renderGrid);
tabButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
        tabButtons.forEach(t => t.classList.remove("active"));
        e.target.classList.add("active");
        currentTab = e.target.getAttribute("data-tab");
        document.getElementById("gridTitle").textContent = `${currentTab} Collection`;
        renderGrid();
    });
});

fetchPlants();