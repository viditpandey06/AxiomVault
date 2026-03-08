from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import uvicorn
import datetime

app = FastAPI(title="Encrypted Chat AI Moderation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Isolation Forest Model Initialization (for simplicity, we train an initial baseline model)
# In production, this would be loaded from a saved pkl file or retrained periodically.
baseline_data = pd.DataFrame({
    'message_rate_per_min': [2, 5, 3, 10, 4, 1, 20, 2],
    'unique_receivers_24h': [1, 2, 1,  5, 2, 1, 15, 1],
    'ip_changes_7d':        [0, 0, 1,  0, 0, 0,  2, 0],
    'reports_received':     [0, 0, 0,  1, 0, 0,  5, 0]
})

model = IsolationForest(contamination=0.1, random_state=42)
model.fit(baseline_data)

class MetadataFeatures(BaseModel):
    user_id: str
    message_rate_per_min: float
    unique_receivers_24h: int
    ip_changes_7d: int
    reports_received: int

@app.post("/analyze")
async def analyze_behavior(data: MetadataFeatures):
    try:
        # Prepare input
        features = pd.DataFrame([{
            'message_rate_per_min': data.message_rate_per_min,
            'unique_receivers_24h': data.unique_receivers_24h,
            'ip_changes_7d': data.ip_changes_7d,
            'reports_received': data.reports_received
        }])
        
        # Predict: 1 for inliers (normal), -1 for outliers (spam)
        prediction = model.predict(features)[0]
        
        # Decision function: usually negative for outliers, positive for inliers
        score = model.decision_function(features)[0]
        
        # Convert score to an anomaly probability (0 to 1, where 1 is highly spammy)
        # This is a basic normalization for the sake of the portfolio project
        spam_score = float(1.0 / (1.0 + np.exp(score * 10)))
        
        # Overrides based on obvious rules
        if data.reports_received > 3 or data.message_rate_per_min > 60:
            spam_score = max(spam_score, 0.95)

        return {"user_id": data.user_id, "spam_score": spam_score, "is_anomaly": int(prediction == -1)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
