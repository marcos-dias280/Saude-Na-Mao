from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash

auth_routes = Blueprint("auth", __name__)


@auth_routes.route("/register", methods=["POST"])
def register():
    conn = None

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Dados não enviados"}), 400

        nome = data.get("nome")
        email = data.get("email")
        senha = data.get("senha")

        if not nome or not email or not senha:
            return jsonify({"error": "Nome, email e senha são obrigatórios"}), 400

        senha_hash = generate_password_hash(senha)

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
            (nome, email, senha_hash)
        )
        conn.commit()

        return jsonify({
            "user_id": cursor.lastrowid,
            "nome": nome,
            "message": "Usuário cadastrado com sucesso"
        }), 201

    except Exception as e:
        print(f"Erro no registro: {e}")
        return jsonify({"error": "Email já cadastrado ou erro no cadastro"}), 400

    finally:
        if conn:
            conn.close()


@auth_routes.route("/login", methods=["POST"])
def login():
    conn = None

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Dados não enviados"}), 400

        email = data.get("email")
        senha = data.get("senha")

        if not email or not senha:
            return jsonify({"error": "Email e senha são obrigatórios"}), 400

        conn = get_db_connection()
        user = conn.execute(
            "SELECT * FROM usuarios WHERE email = ?",
            (email,)
        ).fetchone()

        if user and check_password_hash(user["senha"], senha):
            return jsonify({
                "user_id": user["id"],
                "nome": user["nome"]
            }), 200

        return jsonify({"error": "Credenciais inválidas"}), 401

    except Exception as e:
        print(f"Erro no login: {e}")
        return jsonify({"error": "Erro interno no login"}), 500

    finally:
        if conn:
            conn.close()