import json

def create_simple_dataset():
    data = {
        "prompt": "hello",
        "response": "hello world"
    }

    # Open a new file named simple_dataset.jsonl (or overwrite if it exists)
    with open("simple_dataset.jsonl", "w", encoding="utf-8") as f:
        # Convert the data dict to a JSON string and add a newline
        f.write(json.dumps(data) + "\n")

    print("Created simple_dataset.jsonl with one prompt-response pair.")

if __name__ == "__main__":
    create_simple_dataset()
