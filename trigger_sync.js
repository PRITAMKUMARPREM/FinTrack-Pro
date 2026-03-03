async function triggerSync() {
    try {
        console.log("Triggering simulated sync callback...");
        const response = await fetch('http://localhost:5050/auth/google/callback?state=simulated_jwt_token_for_demo_purposes_only&code=SIMULATED_CODE');
        console.log("Sync trigger returned status:", response.status);
    } catch (err) {
        console.error("Trigger fail:", err.message);
    }
}

triggerSync();
