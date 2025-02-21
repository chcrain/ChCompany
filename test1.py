import time
import requests

API_URL = "https://api-inference.huggingface.co/models/chcrain/falcon-7b-instruct-finetuned"
HEADERS = {
    "Authorization": "Bearer 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",
    "Content-Type": "application/json"
}
payload = {"inputs": "Explain artificial intelligence in simple terms."}

for attempt in range(5):  # Retry up to 5 times
    response = requests.post(API_URL, headers=HEADERS, json=payload)
    if response.status_code == 200:
        print("\n✅ Model Response:", response.json()[0]["generated_text"])
        break
    elif response.status_code == 503:
        print(f"\n⏳ Model is still loading... Retrying in 10 seconds (Attempt {attempt + 1}/5)")
        time.sleep(10)  # Wait 10 seconds before retrying
    else:
        print(f"\n❌ API Request Failed! Status Code: {response.status_code}")
        print("Response:", response.text)
        break

