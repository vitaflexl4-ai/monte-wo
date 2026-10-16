// Monte Wo - Premium Live Mobile App Preview Component Switcher
const AppPreviewState = {
    active_screen: "strength_index",
    athlete_rank: "Bati",
    telemetry: { squat: "—", bench: "—", deadlift: "—" }
};

function switchPreviewScreen(screenId) {
    AppPreviewState.active_screen = screenId;
    console.log(`📱 App Preview Navigation triggered: Loading [${screenId}] viewport layout.`);
    
    // UI Render Bindings for the HTML elements
    const viewContainer = document.getElementById("app-screen-container");
    if (viewContainer) {
        viewContainer.dataset.activeView = screenId;
    }
    return AppPreviewState;
}

console.log("=== MONTE WO FRONTEND PREVIEW FRAMEWORK ONLINE ===");
