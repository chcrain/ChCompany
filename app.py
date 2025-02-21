import gradio as gr
from transformers import AutoModelForCausalLM, AutoTokenizer

# Load your fine-tuned model
model_name = "chcrain/falcon-7b-instruct-finetuned"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

def generate_response(prompt):
    inputs = tokenizer(prompt, return_tensors="pt")
    output = model.generate(**inputs, max_length=200)
    return tokenizer.decode(output[0], skip_special_tokens=True)

# Create a simple chatbot UI
iface = gr.Interface(
    fn=generate_response,
    inputs=gr.Textbox(label="Enter your prompt"),
    outputs=gr.Textbox(label="AI Response"),
    title="Falcon 7B Chatbot",
    description="A chatbot powered by Falcon 7B fine-tuned for conversations."
)

iface.launch()
