import os
import json
from openai import OpenAI

# Pulling the key securely from the system environment instead of hardcoding it
client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.environ.get("GROQ_API_KEY")
)

response = client.chat.completions.create(
    model="openai/gpt-oss-20b",
    response_format={"type": "json_object"},
    messages=[
        {
            "role": "system", 
            "content": "You are a backend helper. Always output valid JSON with keys: 'status', 'daily_calories', 'active_minutes', 'heart_rate'."
        },
        {
            "role": "user", 
            "content": "Generate sample live telemetry metric numbers for a premium fitness dashboard."
        }
    ]
)

raw_data = response.choices.message.content
json_data = json.loads(raw_data)
print(json.dumps(json_data, indent=2))
