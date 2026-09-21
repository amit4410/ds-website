import os
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier

MODEL_PATH = "model.joblib"


def train_and_save():
    X, y = load_iris(return_X_y=True)
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)
    print("Model trained and saved")


def load_model():
    if not os.path.exists(MODEL_PATH):
        train_and_save()
    return joblib.load(MODEL_PATH)


LABELS = ["setosa", "versicolor", "virginica"]
model = load_model()
history = []

app = FastAPI(title="Data Science Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    features: list[float]


class PredictResponse(BaseModel):
    prediction: int
    label: str
    confidence: float


@app.get("/")
def root():
    return {"message": "Backend running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if len(req.features) != 4:
        raise HTTPException(status_code=400, detail="Expected exactly 4 features")

    X = np.array([req.features])
    pred = int(model.predict(X)[0])
    proba = float(model.predict_proba(X)[0][pred])
    label = LABELS[pred]

    history.append({
        "features": ", ".join(str(f) for f in req.features),
        "label": label,
        "confidence": proba,
    })

    return PredictResponse(prediction=pred, label=label, confidence=proba)


@app.get("/history")
def get_history():
    return list(reversed(history[-50:]))