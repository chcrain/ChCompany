\import os
import sys
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# Load Hugging Face API Token from environment variables
HF_TOKEN = os.getenv("HUGGINGFACE_API_KEY")

if not HF_TOKEN:
    raise ValueError("❌ Hugging Face API token is missing! Set it in environment variables.")

# Define model repo
MODEL_NAME = "chcrain/falcon-7b-instruct-finetuned"

try:
    # Load tokenizer with API token
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, token=HF_TOKEN)

    # Load model with API token and GPU support
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.float16,
        device_map="auto",
        token=HF_TOKEN
    )

    # Ensure the model is on GPU if available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"✅ Model loaded successfully on {device}")

except Exception as e:
    print(f"❌ Failed to load model: {str(e)}")
    sys.exit(1)

# Get user input (default fallback if no input provided)
user_input = sys.argv[1] if len(sys.argv) > 1 else "Tell me a fun fact about AI."

# Tokenize input
inputs = tokenizer(user_input, return_tensors="pt").to(device)

# Generate response
try:
    with torch.no_grad():
        output = model.generate(**inputs, max_length=200)

    # Print the generated response
    print(tokenizer.decode(output[0], skip_special_tokens=True))

except Exception as e:
    print(f"❌ Error during inference: {str(e)}")
    sys.exit(1)

