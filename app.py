from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from pymongo import MongoClient
import os

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

CORS(app)

MONGO_URI = "mongodb+srv://studyuser:Kushi713@studymanager.b17jad0.mongodb.net/?appName=StudyManager"

client = MongoClient(MONGO_URI)
db = client["study_manager"]
files = db["files"]

@app.route("/")
def home():
    return render_template("index.html")

# SAVE
@app.route("/api/save", methods=["POST"])
def save():
    data = request.json
    data["deleted"] = False
    files.insert_one(data)
    return jsonify({"status": "saved"})

# GET FILES
@app.route("/api/get")
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

# DELETE
@app.route("/api/delete", methods=["POST"])
def delete():
    data = request.json
    files.update_one({"name": data["name"]}, {"$set": {"deleted": True}})
    return jsonify({"status": "deleted"})

# RECYCLE
@app.route("/api/recycle")
def recycle():
    results = list(files.find({"deleted": True}, {"_id": 0}))
    return jsonify(results)

# RESTORE
@app.route("/api/restore", methods=["POST"])
def restore():
    data = request.json
    files.update_one({"name": data["name"]}, {"$set": {"deleted": False}})
    return jsonify({"status": "restored"})

# RENAME
@app.route("/api/rename", methods=["POST"])
def rename():
    data = request.json
    files.update_one({"name": data["old"]}, {"$set": {"name": data["new"]}})
    return jsonify({"status": "renamed"})

# SEARCH
@app.route("/api/search")
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
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)