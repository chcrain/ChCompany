import requests

# Define the Hugging Face API URL
API_URL = "https://api-inference.huggingface.co/models/chcrain/falcon-7b-instruct-finetuned"

# Optional: Add your Hugging Face API key for faster responses
HEADERS = {
    "Authorization": "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",  # Replace with your actual key or remove this line if not using one
    "Content-Type": "application/json"
}

# Define the test prompt
payload = {
    "inputs": "Explain artificial intelligence in simple terms."
}

# Send the request
response = requests.post(API_URL, headers=HEADERS, json=payload)

# Print the result
if response.status_code == 200:
    data = response.json()
    if isinstance(data, list) and len(data) > 0 and "generated_text" in data[0]:
        print("\n✅ Model Response:")
        print(data[0]["generated_text"])
    else:
        print("\n⚠️ Unexpected response format:", data)
else:
    print(f"\n❌ API Request Failed! Status Code: {response.status_code}")
    print("Response:", response.text)
