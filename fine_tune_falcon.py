import os  # Add this import
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer, DataCollatorForLanguageModeling
from datasets import load_dataset
from transformers import BitsAndBytesConfig
from peft import prepare_model_for_kbit_training, LoraConfig, get_peft_model

# Rest of your code remains the same

print(f"CUDA available: {torch.cuda.is_available()}")
print(f"Current device: {torch.cuda.current_device()}")
print(f"Device name: {torch.cuda.get_device_name()}")

MODEL_NAME = "tiiuae/falcon-7b-instruct"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
print(f"✅ Tokenizer padding token: {tokenizer.pad_token}")

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4"
)

print("Loading model...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=quantization_config,
    torch_dtype=torch.float16,
    device_map="auto",
    trust_remote_code=False
)

print("Preparing model for training...")
model = prepare_model_for_kbit_training(model)

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["query_key_value"],
    lora_dropout=0.1,
    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)
print("✅ LoRA adaptor added to model")
model.print_trainable_parameters()

# Load and preprocess dataset
dataset = load_dataset("json", data_files="simple_dataset.jsonl", split="train")
print(f"Dataset size: {len(dataset)} samples")

def tokenize_function(examples):
    if "prompt" not in examples or "response" not in examples:
        raise ValueError("Dataset missing 'prompt' or 'response' fields")
    
    combined_texts = [p + " " + r for p, r in zip(examples["prompt"], examples["response"])]
    outputs = tokenizer(
        combined_texts, 
        truncation=True, 
        padding="max_length", 
        max_length=512,
        return_tensors="pt"
    )
    return outputs

# Process the dataset without splitting
train_dataset = dataset.map(
    tokenize_function, 
    batched=True,
    remove_columns=dataset.column_names
).with_format("torch")

training_args = TrainingArguments(
    output_dir="./fine_tuned_falcon",
    save_strategy="epoch",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    learning_rate=5e-5,
    num_train_epochs=3,
    warmup_steps=2,
    save_total_limit=2,
    logging_dir="./logs",
    logging_steps=1,
    report_to="none",
    gradient_checkpointing=True,
    fp16=True,
    optim="adamw_torch",
    max_grad_norm=1.0,
    weight_decay=0.01
)

data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    data_collator=data_collator,
)

print("Starting training...")
train_result = trainer.train()
print(f"Training metrics: {train_result.metrics}")

print("Saving model...")
model.save_pretrained("./fine_tuned_model")
tokenizer.save_pretrained("./fine_tuned_model")
print("🎉 Training complete! Fine-tuned model saved to './fine_tuned_model'")

# Print final model path
print(f"Model saved to: {os.path.abspath('./fine_tuned_model')}")