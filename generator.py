import os, json
from openai import OpenAI

client = OpenAI(base_url="https://openrouter.ai", api_key=os.environ.get("OPENROUTER_API_KEY"))

def generate_plan(user_goal, culture_preference):
    response = client.chat.completions.create(model="meta-llama/llama-3.3-70b-instruct:free", response_format={"type": "json_object"}, messages=[{"role": "system", "content": "You are the Monte Wo Core Engine. Generate a custom 1-day Gymbro workout and a matching nutrition meal plan combining global fitness staples and authentic Haitian food. Output strict JSON with keys: 'workout_routine', 'meal_plan', 'total_estimated_macros'."}, {"role": "user", "content": f"Goal: {user_goal}. Food Preference: {culture_preference}."}])
    try:
        return json.loads(response.choices.message.content)
    except:
        return json.loads(str(response))

print("=== GENERATING MONTE WO HIGH-PERFORMANCE PLAN ===")
print(json.dumps(generate_plan("Clean Bulk / Hypertrophy", "Include Haitian staples like Griot and Diri ak Djon Djon alongside clean global macros"), indent=2))