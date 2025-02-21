import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# Load the merged model
MODEL_PATH = "./merged_falcon_model"

print("Loading merged model...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    torch_dtype=torch.float16,
    device_map="auto"
).eval()  # Set to evaluation mode

# Function to generate text
def generate_text(prompt):
    with torch.inference_mode():  # Disable gradients for faster inference
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)  # Move inputs to correct device
        output = model.generate(
            **inputs,
            max_length=200,
            do_sample=True,  # Enable sampling
            top_k=50,  # Consider top 50 words at each step
            top_p=0.9,  # Nucleus sampling
            temperature=0.7,  # Adjust randomness
        )
    return tokenizer.decode(output[0], skip_special_tokens=True)

# Test model response
print("Model is ready! Testing response...")
response = generate_text("Hello! How are you today?")
print("Model Output:", response)
