import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import gc

torch.cuda.empty_cache()
gc.collect()

print("Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained("tiiuae/falcon-7b-instruct")

print("Loading base model...")
base_model = AutoModelForCausalLM.from_pretrained(
    "tiiuae/falcon-7b-instruct",
    torch_dtype=torch.float16,
    load_in_4bit=True,
    device_map="auto"
)

print("Loading LoRA adapter...")
model = PeftModel.from_pretrained(base_model, "./fine_tuned_model")
print("Model loaded successfully!")

def generate_response(prompt, max_tokens=150):  # Increased max tokens
    try:
        # Enhanced prompt with better context and instructions
        full_prompt = f"""You are a helpful customer service representative for our company. 
Provide a complete, professional, and helpful response. 
Never mention being an AI model. Always be willing to help and check specific details.

Customer: {prompt}

Agent Response:"""
        
        print(f"\nProcessing: {prompt}")
        
        inputs = tokenizer(full_prompt, return_tensors="pt", truncation=True, max_length=512)
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id,
            repetition_penalty=1.2
        )
        
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return response.split("Agent Response:")[-1].strip()
    
    except Exception as e:
        return f"Error generating response: {str(e)}"

# Updated test queries
test_queries = [
    "Can I get a refund for my order #12345?",
    "I want to change my delivery address for order #789",
    "Do you ship to Canada?",
    "The product is defective. What should I do?",
    "How long does express shipping take?"
]

print("\nStarting tests...")
for query in test_queries:
    print(f"\nCustomer Query: {query}")
    response = generate_response(query)
    print(f"Agent Response: {response}")
    print("-" * 80)

print("\nTesting completed!")