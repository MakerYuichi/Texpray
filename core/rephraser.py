from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

model_name = "google/gemma-7b-it"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name, device_map = "auto", torch_dtype = "auto")

rephraser = pipeline("text-generation", model=model, tokenizer=tokenizer)


def rephrase_text(text:str) -> str:
    prompt = f"""<s>[INST] Rewrite the following text to be kind, respectful, and non-toxic, while preserving the original intent: 
    Original: {text}
    Rephrased version: [/INST]"""
    output = rephraser(prompt, max_new_tokens=100, num_return_sequences = 3, num_beams=10, do_sample = True, top_k = 50)
    suggestions = [o["generated_text"].replace("prompt", "").strip() for o in output]
    return suggestions 

