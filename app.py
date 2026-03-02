from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

MONGO_URI = "mongodb+srv://studyuser:Kushi713@studymanager.b17jad0.mongodb.net/?appName=StudyManager"

client = MongoClient(MONGO_URI)
db = client["study_manager"]
files = db["files"]

@app.route("/")
def home():
    return "Backend Online 🚀"

# SAVE FILE / NOTE
@app.route("/api/save", methods=["POST"])
def save():
    data = request.json
    data["deleted"] = False
    files.insert_one(data)
    return jsonify({"status": "saved"})

# GET FILES
@app.route("/api/get", methods=["GET"])
def get_files():
    category = request.args.get("category")
    subject = request.args.get("subject")
    unit = request.args.get("unit")

    results = list(files.find({
        "category": category,
        "subject": subject,
        "unit": unit,
        "deleted": False
    }, {"_id": 0}))

    return jsonify(results)

# DELETE (MOVE TO RECYCLE)
@app.route("/api/delete", methods=["POST"])
def delete():
    data = request.json
    files.update_one(
        {"name": data["name"]},
        {"$set": {"deleted": True}}
    )
    return jsonify({"status": "moved to recycle"})

# GET RECYCLE
@app.route("/api/recycle", methods=["GET"])
def recycle():
    results = list(files.find({"deleted": True}, {"_id": 0}))
    return jsonify(results)

# RESTORE
@app.route("/api/restore", methods=["POST"])
def restore():
    data = request.json
    files.update_one(
        {"name": data["name"]},
        {"$set": {"deleted": False}}
    )
    return jsonify({"status": "restored"})

# RENAME
@app.route("/api/rename", methods=["POST"])
def rename():
    data = request.json
    files.update_one(
        {"name": data["old"]},
        {"$set": {"name": data["new"]}}
    )
    return jsonify({"status": "renamed"})

# SEARCH
@app.route("/api/search", methods=["GET"])
def search():
    keyword = request.args.get("q")
    results = list(files.find({
        "deleted": False,
        "$or": [
            {"name": {"$regex": keyword, "$options": "i"}},
            {"content": {"$regex": keyword, "$options": "i"}}
        ]
    }, {"_id": 0}))
    return jsonify(results)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)