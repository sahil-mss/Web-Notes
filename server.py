import re
from flask import Flask, request, jsonify
import requests
from flask_cors import CORS

# ⚠️ Put your Hugging Face API key here (not recommended for public repos)
HF_TOKEN = "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"
MODEL = "facebook/bart-large-cnn"  # or "google/flan-t5-large"

API_URL = f"https://api-inference.huggingface.co/models/{MODEL}"
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

app = Flask(__name__)
CORS(app)

def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()

@app.route("/summarize", methods=["POST"])
def summarize_hf():
    data = request.get_json(force=True)
    content_html = data.get("content", "")
    if not content_html:
        return jsonify({"error": "content required"}), 400

    text = strip_html(content_html)
    if len(text) > 4000:
        text = text[:4000] + " ..."

    payload = {
        "inputs": text,
        "parameters": {"max_length": 180, "min_length": 40, "do_sample": False}
    }

    try:
        resp = requests.post(API_URL, headers=HEADERS, json=payload, timeout=120)
        resp.raise_for_status()
    except Exception as e:
        return jsonify({"error": f"Request failed: {str(e)}"}), 500

    result = resp.json()
    summary = ""
    if isinstance(result, list):
        summary = result[0].get("summary_text") or result[0].get("generated_text") or ""
    else:
        summary = result.get("summary_text") or result.get("generated_text") or ""

    return jsonify({"summary": summary.strip()})

if __name__ == "__main__":
    app.run(port=5000, debug=True)
