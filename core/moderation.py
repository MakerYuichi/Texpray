from core.toxicity_detector import detect_toxicity
from core.rephraser import rephrase_text
from models.pydantic import ModerationResponse

def moderate_text(mssg:str) -> ModerationResponse:
    score, label = detect_toxicity(mssg)
    
    
    if label== "toxic":
        alt = rephrase_text(mssg)
        return{
        "original" : mssg,
        "toxicity_score" : score,
        "status" : "toxic",
        "suggestion" : alt[0],
        "alternatives" : alt[1:]
    }
        
    else:
        return{
            "original":mssg,
            "toxicity_score" : score,
            "status" : "clean",
        }