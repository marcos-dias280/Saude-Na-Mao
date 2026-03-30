from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from datetime import datetime

appointment_routes = Blueprint("appointment_routes", __name__)


def validar_data_hora(data_str, hora_str):
    try:
        data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
        hora_obj = datetime.strptime(hora_str, "%H:%M").time()
        data_hora = datetime.combine(data_obj, hora_obj)

        if data_hora < datetime.now():
            return False, "Não é possível agendar consulta em data ou horário passados."

        return True, None
    except ValueError:
        return False, "Data ou hora em formato inválido."


@appointment_routes.route("/agendar_consulta", methods=["POST"])
def agendar_consulta():
    conn = None

    try:
        dados = request.get_json()

        if not dados:
            return jsonify({
                "success": False,
                "message": "Dados não enviados."
            }), 400

        usuario_id = dados.get("usuario_id")
        especialidade = dados.get("especialidade")
        data = dados.get("data")
        hora = dados.get("hora")

        if not usuario_id or not especialidade or not data or not hora:
            return jsonify({
                "success": False,
                "message": "Todos os campos são obrigatórios."
            }), 400

        valido, erro = validar_data_hora(data, hora)
        if not valido:
            return jsonify({
                "success": False,
                "message": erro
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verifica conflito de horário para a mesma especialidade
        conflito = conn.execute(
            """
            SELECT id
            FROM consultas
            WHERE especialidade = ? AND data = ? AND hora = ?
            """,
            (especialidade, data, hora)
        ).fetchone()

        if conflito:
            return jsonify({
                "success": False,
                "message": "Já existe uma consulta agendada para essa especialidade nesse horário."
            }), 409

        cursor.execute(
            """
            INSERT INTO consultas (usuario_id, especialidade, data, hora)
            VALUES (?, ?, ?, ?)
            """,
            (usuario_id, especialidade, data, hora)
        )
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Consulta agendada com sucesso.",
            "consulta_id": cursor.lastrowid
        }), 201

    except Exception as e:
        print(f"Erro ao agendar consulta: {e}")
        return jsonify({
            "success": False,
            "message": "Erro ao agendar consulta."
        }), 500

    finally:
        if conn:
            conn.close()


@appointment_routes.route("/consultas/usuario/<int:usuario_id>", methods=["GET"])
def listar_consultas(usuario_id):
    conn = None

    try:
        conn = get_db_connection()

        consultas = conn.execute(
            """
            SELECT id, usuario_id, especialidade, data, hora
            FROM consultas
            WHERE usuario_id = ?
            ORDER BY data ASC, hora ASC
            """,
            (usuario_id,)
        ).fetchall()

        lista = []
        for consulta in consultas:
            lista.append({
                "id": consulta["id"],
                "usuario_id": consulta["usuario_id"],
                "especialidade": consulta["especialidade"],
                "data": consulta["data"],
                "hora": consulta["hora"]
            })

        return jsonify({
            "success": True,
            "consultas": lista
        }), 200

    except Exception as e:
        print(f"Erro ao listar consultas: {e}")
        return jsonify({
            "success": False,
            "message": "Erro ao buscar consultas."
        }), 500

    finally:
        if conn:
            conn.close()


@appointment_routes.route("/consultas/<int:consulta_id>", methods=["DELETE"])
def cancelar_consulta(consulta_id):
    conn = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        consulta = conn.execute(
            "SELECT id FROM consultas WHERE id = ?",
            (consulta_id,)
        ).fetchone()

        if not consulta:
            return jsonify({
                "success": False,
                "message": "Consulta não encontrada."
            }), 404

        cursor.execute("DELETE FROM consultas WHERE id = ?", (consulta_id,))
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Consulta cancelada com sucesso."
        }), 200

    except Exception as e:
        print(f"Erro ao cancelar consulta: {e}")
        return jsonify({
            "success": False,
            "message": "Erro ao cancelar consulta."
        }), 500

    finally:
        if conn:
            conn.close()