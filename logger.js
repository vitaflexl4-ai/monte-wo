// Monte Wo - Premium Gym History Logger Engine
const WorkoutHistory = [];

function logExerciseSet(exerciseName, weightLbs, repsCount) {
    const totalVolume = weightLbs * repsCount;
    const entry = {
        timestamp: new Date().toLocaleTimeString(),
        exercise: exerciseName,
        weight: `${weightLbs} lbs`,
        reps: repsCount,
        volume: `${totalVolume} lbs`
    };
    WorkoutHistory.push(entry);
    console.log(`🏋️ Logged: ${exerciseName} | ${weightLbs}lbs x ${repsCount} (Vol: ${totalVolume}lbs)`);
    return entry;
}

console.log("=== MONTE WO HISTORY TRACKER ONLINE ===");
logExerciseSet("Bench Press", 225, 8);
