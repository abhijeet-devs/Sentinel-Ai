"""
SentinelAI — Model Training Script
Trains TF-IDF + Logistic Regression pipeline for prompt threat detection.
Saves two models:
  1. Binary classifier (safe vs malicious)
  2. Multi-class attack type classifier
"""

import sys
import os
import json
import joblib
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    roc_auc_score,
)
from sklearn.preprocessing import LabelEncoder

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ── Load Dataset ──────────────────────────────────────────────────────────────

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "sentinel_dataset.json")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "app", "ml", "models")

os.makedirs(MODEL_DIR, exist_ok=True)

print("Loading dataset...")
with open(DATA_PATH) as f:
    dataset = json.load(f)

texts = [r["text"] for r in dataset]
binary_labels = [1 if r["is_malicious"] else 0 for r in dataset]
attack_types = [r["attack_type"] for r in dataset]

# ── Binary Classifier ─────────────────────────────────────────────────────────

print("\n--- Training Binary Classifier (Safe vs. Malicious) ---")
X_train, X_test, y_train, y_test = train_test_split(
    texts, binary_labels, test_size=0.2, random_state=42, stratify=binary_labels
)

binary_pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 3),
        max_features=20000,
        sublinear_tf=True,
        min_df=1,
        analyzer="word",
        token_pattern=r"(?u)\b\w+\b",
    )),
    ("clf", LogisticRegression(
        C=5.0,
        max_iter=1000,
        solver="lbfgs",
        class_weight="balanced",
        random_state=42,
    )),
])

binary_pipeline.fit(X_train, y_train)

y_pred = binary_pipeline.predict(X_test)
y_prob = binary_pipeline.predict_proba(X_test)[:, 1]

print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print(f"AUC-ROC:  {roc_auc_score(y_test, y_prob):.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["Safe", "Malicious"]))

cv_scores = cross_val_score(binary_pipeline, texts, binary_labels, cv=5, scoring="f1")
print(f"Cross-Val F1 (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

joblib.dump(binary_pipeline, os.path.join(MODEL_DIR, "binary_classifier.pkl"))
print(f"\nSaved: {MODEL_DIR}/binary_classifier.pkl")

# ── Multi-Class Attack Classifier ─────────────────────────────────────────────

print("\n--- Training Multi-Class Attack Classifier ---")

# Only train on malicious samples for attack type classification
malicious_mask = [r["is_malicious"] for r in dataset]
mal_texts = [t for t, m in zip(texts, malicious_mask) if m]
mal_labels = [a for a, m in zip(attack_types, malicious_mask) if m]

le = LabelEncoder()
mal_labels_enc = le.fit_transform(mal_labels)

X_train_m, X_test_m, y_train_m, y_test_m = train_test_split(
    mal_texts, mal_labels_enc, test_size=0.2, random_state=42, stratify=mal_labels_enc
)

attack_pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 3),
        max_features=15000,
        sublinear_tf=True,
        min_df=1,
        analyzer="word",
        token_pattern=r"(?u)\b\w+\b",
    )),
    ("clf", LogisticRegression(
        C=3.0,
        max_iter=1000,
        solver="lbfgs",
        class_weight="balanced",
        multi_class="multinomial",
        random_state=42,
    )),
])

attack_pipeline.fit(X_train_m, y_train_m)
y_pred_m = attack_pipeline.predict(X_test_m)

print(f"Accuracy: {accuracy_score(y_test_m, y_pred_m):.4f}")
print("\nClassification Report:")
print(classification_report(y_test_m, y_pred_m, target_names=le.classes_))

joblib.dump(attack_pipeline, os.path.join(MODEL_DIR, "attack_classifier.pkl"))
joblib.dump(le, os.path.join(MODEL_DIR, "label_encoder.pkl"))
print(f"Saved: {MODEL_DIR}/attack_classifier.pkl")
print(f"Saved: {MODEL_DIR}/label_encoder.pkl")

# ── Save Metadata ─────────────────────────────────────────────────────────────

metadata = {
    "binary_classifier": {
        "type": "TF-IDF + Logistic Regression",
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "auc_roc": float(roc_auc_score(y_test, y_prob)),
        "cv_f1_mean": float(cv_scores.mean()),
        "cv_f1_std": float(cv_scores.std()),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
    },
    "attack_classifier": {
        "type": "TF-IDF + Logistic Regression (Multinomial)",
        "accuracy": float(accuracy_score(y_test_m, y_pred_m)),
        "classes": list(le.classes_),
        "training_samples": len(X_train_m),
        "test_samples": len(X_test_m),
    },
}

with open(os.path.join(MODEL_DIR, "model_metadata.json"), "w") as f:
    json.dump(metadata, f, indent=2)

print(f"\nSaved: {MODEL_DIR}/model_metadata.json")
print("\n✅ Model training complete!")
