import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

repo_name = "chcrain/falcon-7b-instruct-finetuned"

# Enable 4-bit quantization to reduce memory usage
quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4"
)

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(repo_name)

# Load model with quantization and device mapping
model = AutoModelForCausalLM.from_pretrained(
    repo_name,
    quantization_config=quantization_config,
    device_map="auto"
)

# Move model to GPU (if available)
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Test with a sample prompt
input_text = "Tell me a fun fact about AI."
inputs = tokenizer(input_text, return_tensors="pt").to(device)  # Move to GPU

# Generate output (disable gradient calculation to save memory)
with torch.no_grad():
    output = model.generate(**inputs, max_length=50)

# Decode and print result
print(tokenizer.decode(output[0], skip_special_tokens=True))
