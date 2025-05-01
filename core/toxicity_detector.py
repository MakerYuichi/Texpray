from transformers import pipeline

classifier = pipeline("text-classification", model="unitary/toxic-bert")

def detect_toxicity(mssg : str) -> tuple:
    result = classifier(mssg)[0]
    score = result["score"]
    toxic = score>=0.5
    label = "toxic" if toxic else "non-toxic"
    
    return round(score*100, 2), label

print(detect_toxicity("I hope you fail."))




