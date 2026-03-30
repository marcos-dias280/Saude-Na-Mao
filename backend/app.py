import os
from dotenv import load_dotenv
from flask import Flask, render_template
from flask_cors import CORS
from routes.auth import auth_routes
from routes.appointment import appointment_routes
from routes.ubs import ubs_routes
from database.db import create_tables

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(dotenv_path=ENV_PATH)

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

app.config["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")

CORS(app)

create_tables()

app.register_blueprint(auth_routes)
app.register_blueprint(appointment_routes)
app.register_blueprint(ubs_routes)


@app.route("/")
def home():
    return render_template("home.html")


@app.route("/login-page")
def login_page():
    return render_template("login.html")


@app.route("/register-page")
def register_page():
    return render_template("registrer.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)