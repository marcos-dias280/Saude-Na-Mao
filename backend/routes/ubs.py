import os
import requests
from flask import Blueprint, request, jsonify

ubs_routes = Blueprint("ubs_routes", __name__)


@ubs_routes.route("/buscar_ubs_google", methods=["GET"])
def buscar_ubs_google():
    try:
        lat = request.args.get("lat")
        lon = request.args.get("lon")
        radius = request.args.get("radius", "8000")
        google_api_key = os.getenv("GOOGLE_API_KEY")

        if not google_api_key:
            return jsonify({
                "success": False,
                "error": "GOOGLE_API_KEY não configurada"
            }), 500

        if not lat or not lon:
            return jsonify({
                "success": False,
                "error": "Latitude e longitude são obrigatórias"
            }), 400

        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

        keywords = [
            "UBS",
            "UBS/AMA",
            "AMA",
            "AMA UBS",
            "AMA/UBS Integrada",
            "posto de saúde",
            "posto de saude",
            "unidade básica de saúde",
            "unidade basica de saude",
            "unidade de saúde",
            "UPA",
            "pronto atendimento",
            "ambulatório",
            "ambulatorio",
            "atendimento médico ambulatorial",
            "hospital",
            "clínica",
            "clinica"
        ]

        resultados = []
        vistos = set()

        for keyword in keywords:
            params = {
                "location": f"{lat},{lon}",
                "radius": radius,
                "keyword": keyword,
                "key": google_api_key,
                "language": "pt-BR"
            }

            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if response.status_code != 200:
                print(f"Erro HTTP ao buscar '{keyword}':", data)
                continue

            if data.get("status") not in ["OK", "ZERO_RESULTS"]:
                print(f"Erro Google Places para '{keyword}':", data)
                continue

            for item in data.get("results", []):
                place_id = item.get("place_id")

                if place_id and place_id not in vistos:
                    vistos.add(place_id)
                    resultados.append(item)

        return jsonify({
            "success": True,
            "results": resultados,
            "status": "OK"
        }), 200

    except Exception as e:
        print("Erro:", e)
        return jsonify({
            "success": False,
            "error": "Erro ao buscar UBS"
        }), 500