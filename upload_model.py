from transformers import AutoModelForCausalLM, AutoTokenizer
from huggingface_hub import login

# Ensure you are logged in to Hugging Face
login()

# Define your repository name (update if needed)
repo_name = "chcrain/falcon-7b-instruct-finetuned"

# Path where your fine-tuned model is saved
model_path = "./fine_tuned_model"  # Update this if your model is stored elsewhere

# Load the tokenizer and model from local directory
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForCausalLM.from_pretrained(model_path)

# Push tokenizer & model to Hugging Face
print("🚀 Uploading tokenizer...")
tokenizer.push_to_hub(repo_name)

print("🚀 Uploading model...")
model.push_to_hub(repo_name)

print(f"🎉 Model uploaded successfully! View it at: https://huggingface.co/{repo_name}")
