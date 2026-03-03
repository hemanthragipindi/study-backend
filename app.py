import bcrypt
from flask import Flask, jsonify, render_template, request, session
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
import os

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.environ.get("SECRET_KEY", "fallback_dev_key")

CORS(app)

MONGO_URI = os.environ.get("MONGO_URI")

if not MONGO_URI:
    raise Exception("MONGO_URI environment variable not set")
client = MongoClient(MONGO_URI)

db = client["study_manager"]
files = db["files"]
users = db["users"]
subjects = db["subjects"]

# ================= SESSION CHECK =================
@app.route("/check-session")
def check_session():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"user": session["user"]})

# ================= HOME =================
@app.route("/")
def home():
    if "user" not in session:
        return render_template("login.html")
    return render_template("index.html", user=session["user"])

# ================= REGISTER =================
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    if users.find_one({"email": email}):
        return jsonify({"error": "User exists"}), 400

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    users.insert_one({
        "email": email,
        "password": hashed
    })

    return jsonify({"message": "Registered successfully"})

# ================= LOGIN =================
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    user = users.find_one({"email": email})
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not bcrypt.checkpw(password.encode(), user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    session["user"] = email
    return jsonify({"message": "Login successful"})

# ================= LOGOUT =================
@app.route("/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

# ================= SUBJECTS =================
@app.route("/api/add-subject", methods=["POST"])
def add_subject():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    subjects.insert_one({
        "name": data["name"],
        "category": data["category"],
        "user": session["user"]
    })

    return jsonify({"status": "added"})

@app.route("/api/get-subjects")
def get_subjects():
    if "user" not in session:
        return jsonify([])

    category = request.args.get("category")

    result = list(subjects.find({
        "category": category,
        "user": session["user"]
    }))

    for r in result:
        r["_id"] = str(r["_id"])

    return jsonify(result)

# ================= SAVE FILE =================
@app.route("/api/save", methods=["POST"])
def save():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    data["deleted"] = False
    data["user"] = session["user"]

    files.insert_one(data)
    return jsonify({"status": "saved"})

# ================= GET FILES =================
@app.route("/api/get")
def get_files():
    if "user" not in session:
        return jsonify([])

    result = list(files.find({
        "category": request.args.get("category"),
        "subject": request.args.get("subject"),
        "unit": request.args.get("unit"),
        "deleted": False,
        "user": session["user"]
    }))

    for r in result:
        r["_id"] = str(r["_id"])

    return jsonify(result)

# ================= DELETE =================
@app.route("/api/delete", methods=["POST"])
def delete():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json

    files.update_one(
        {
            "_id": ObjectId(data["id"]),
            "user": session["user"]
        },
        {"$set": {"deleted": True}}
    )

    return jsonify({"status": "deleted"})

# ================= PERMANENT DELETE =================
@app.route("/api/permanent-delete", methods=["POST"])
def permanent_delete():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json

    files.delete_one({
        "_id": ObjectId(data["id"]),
        "user": session["user"]
    })

    return jsonify({"status": "removed"})

# ================= RESTORE =================
@app.route("/api/restore", methods=["POST"])
def restore():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json

    files.update_one(
        {
            "_id": ObjectId(data["id"]),
            "user": session["user"]
        },
        {"$set": {"deleted": False}}
    )

    return jsonify({"status": "restored"})

# ================= RECYCLE =================
@app.route("/api/recycle")
def recycle():
    if "user" not in session:
        return jsonify([])

    result = list(files.find({
        "deleted": True,
        "user": session["user"]
    }))

    for r in result:
        r["_id"] = str(r["_id"])

    return jsonify(result)

# ================= STATS =================
@app.route("/api/stats")
def stats():
    if "user" not in session:
        return jsonify({})

    user = session["user"]

    return jsonify({
        "total_files": files.count_documents({"user": user, "deleted": False}),
        "deleted_files": files.count_documents({"user": user, "deleted": True}),
        "subjects": subjects.count_documents({"user": user})
    })

# ================= CHANGE PASSWORD =================
@app.route("/api/change-password", methods=["POST"])
def change_password():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json

    if not data.get("old") or not data.get("new"):
        return jsonify({"error": "Missing fields"}), 400

    user = users.find_one({"email": session["user"]})

    if not bcrypt.checkpw(data["old"].encode(), user["password"]):
        return jsonify({"error": "Wrong password"}), 400

    new_hash = bcrypt.hashpw(data["new"].encode(), bcrypt.gensalt())

    users.update_one(
        {"email": session["user"]},
        {"$set": {"password": new_hash}}
    )

    return jsonify({"message": "Password updated"})

# ================= RUN =================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)