const API_BASE_URL = window.location.origin;
const UBS_PREFERRED_RADIUS_KM = 5;
const UBS_MAX_RADIUS_KM = 8;
const UBS_RESULT_LIMIT = 8;

if (typeof mapboxgl !== "undefined") {
    mapboxgl.accessToken = "pk.eyJ1IjoibWRzYW50MjgiLCJhIjoiY21uYnZ3NTZlMHoyeDJwcHBscXZweXVtMiJ9.P2XjItV5yIbTidyb2ZYj2Q";
}

let map = null;
let carregando = false;
let marcadoresUBS = [];

function usuarioLogado() {
    const user_id = localStorage.getItem("user_id");
    return !!(user_id && user_id !== "undefined" && user_id !== "null");
}

function obterUsuarioId() {
    const user_id = localStorage.getItem("user_id");
    return usuarioLogado() ? parseInt(user_id, 10) : null;
}

function obterNomeUsuario() {
    const nome = localStorage.getItem("nome");
    return nome && nome !== "undefined" && nome !== "null" ? nome : "";
}

function limparMarcadoresUBS() {
    marcadoresUBS.forEach((marker) => marker.remove());
    marcadoresUBS = [];
}

async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || data?.error || "Erro na requisição");
    }

    return data;
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarMenu(obterNomeUsuario());
    inicializarMenuMobile();
    inicializarBuscaUBS();
});

function inicializarMenu(nome) {
    const navLogin = document.getElementById("nav-login");
    const navCadastro = document.getElementById("nav-cadastro");
    const navUser = document.getElementById("nav-user");
    const userName = document.getElementById("user-name");

    if (usuarioLogado()) {
        if (navLogin) navLogin.style.display = "none";
        if (navCadastro) navCadastro.style.display = "none";

        if (navUser && userName) {
            navUser.style.display = "block";
            userName.textContent = nome;
        }
    } else {
        if (navUser) navUser.style.display = "none";
    }
}

function inicializarMenuMobile() {
    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = document.getElementById("nav-links");

    if (!menuToggle || !navLinks) return;

    menuToggle.addEventListener("click", () => {
        navLinks.classList.toggle("active");
    });

    document.querySelectorAll("#nav-links a").forEach((link) => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
        });
    });
}

function inicializarBuscaUBS() {
    const btn = document.getElementById("find-ubs-btn");

    btn?.addEventListener("click", () => {
        if (carregando) return;

        if (!navigator.geolocation) {
            alert("Geolocalização não suportada.");
            return;
        }

        carregando = true;

        const ul = document.getElementById("ubs-list");
        if (ul) ul.innerHTML = "<li>Buscando unidades...</li>";

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;

                    criarMapa(lat, lon);
                    await buscarUBS(lat, lon);
                } catch (erro) {
                    console.error("Erro ao buscar UBS:", erro);
                    alert("Erro ao buscar UBS.");
                } finally {
                    carregando = false;
                }
            },
            () => {
                alert("Permita acesso à localização.");
                carregando = false;
            }
        );
    });
}

async function buscarUBS(lat, lon) {
    try {
        const lista = await buscarUBSGoogle(lat, lon);
        const final = ranquear(lista);
        mostrarUBS(final);
    } catch (err) {
        console.error(err);
        mostrarUBS([]);
        alert("Erro ao buscar UBS.");
    }
}

async function buscarUBSGoogle(lat, lon) {
    const data = await fetchJson(
        `${API_BASE_URL}/buscar_ubs_google?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&radius=${UBS_MAX_RADIUS_KM * 1000}`
    );

    const listaBruta = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.resultados)
        ? data.resultados
        : [];

    if (!listaBruta.length) return [];

    return listaBruta
        .map((local) => {
            const geometry = local.geometry || local.geometria || {};
            const location = geometry.location || geometry.localização || {};

            const lat2 = typeof location.lat === "number" ? location.lat : parseFloat(location.lat);
            const lon2 = typeof location.lng === "number" ? location.lng : parseFloat(location.lng);

            if (!Number.isFinite(lat2) || !Number.isFinite(lon2)) return null;

            const nome = local.name || local.nome || "Unidade de Saúde";
            const endereco =
                local.vicinity ||
                local.vizinhança ||
                local.formatted_address ||
                local.formattedAddress ||
                nome;

            const tipos = Array.isArray(local.types)
                ? local.types
                : Array.isArray(local.tipos)
                ? local.tipos
                : [];

            return {
                text: nome,
                place_name: endereco,
                center: [lon2, lat2],
                distancia: calcularDistancia(lat, lon, lat2, lon2),
                prioridade: prioridade(nome, tipos)
            };
        })
        .filter(Boolean)
        .filter((item) => item.distancia <= UBS_MAX_RADIUS_KM);
}

function prioridade(nome = "", tipos = []) {
    const texto = `${nome} ${tipos.join(" ")}`.toLowerCase();

    if (
        texto.includes("ubs") ||
        texto.includes("ubs/ama") ||
        texto.includes("ama/ubs") ||
        texto.includes("posto de saúde") ||
        texto.includes("posto de saude") ||
        texto.includes("unidade básica") ||
        texto.includes("unidade basica")
    ) {
        return 1;
    }

    if (
        texto.includes("ama") ||
        texto.includes("ambulatório") ||
        texto.includes("ambulatorio") ||
        texto.includes("atendimento médico ambulatorial") ||
        texto.includes("atendimento medico ambulatorial") ||
        texto.includes("upa") ||
        texto.includes("pronto atendimento")
    ) {
        return 2;
    }

    if (
        texto.includes("hospital") ||
        texto.includes("clínica") ||
        texto.includes("clinica")
    ) {
        return 3;
    }

    return 4;
}

function ranquear(lista) {
    const unicos = deduplicarLocais(lista);

    const dentroDoRaio = unicos
        .filter((item) => item.distancia <= UBS_MAX_RADIUS_KM)
        .sort((a, b) => {
            const diferencaDistancia = a.distancia - b.distancia;

            if (Math.abs(diferencaDistancia) < 0.4) {
                return a.prioridade - b.prioridade || diferencaDistancia;
            }

            return diferencaDistancia;
        });

    return dentroDoRaio.slice(0, UBS_RESULT_LIMIT);
}

function deduplicarLocais(lista) {
    const mapa = new Map();

    lista.forEach((local) => {
        const nome = (local.text || "").toLowerCase().trim();
        const [lon, lat] = Array.isArray(local.center) ? local.center : [0, 0];
        const chave = `${nome}-${Number(lon).toFixed(5)}-${Number(lat).toFixed(5)}`;

        if (!mapa.has(chave)) {
            mapa.set(chave, local);
        } else {
            const existente = mapa.get(chave);
            if ((local.prioridade ?? 99) < (existente.prioridade ?? 99)) {
                mapa.set(chave, local);
            }
        }
    });

    return Array.from(mapa.values());
}

function criarMapa(lat, lon) {
    if (typeof mapboxgl === "undefined") {
        console.error("Mapbox não carregado.");
        return;
    }

    if (map) map.remove();

    limparMarcadoresUBS();

    map = new mapboxgl.Map({
        container: "ubs-map",
        style: "mapbox://styles/mapbox/streets-v11",
        center: [lon, lat],
        zoom: 13
    });

    new mapboxgl.Marker({ color: "blue" })
        .setLngLat([lon, lat])
        .setPopup(new mapboxgl.Popup().setText("Você está aqui"))
        .addTo(map);
}

function mostrarUBS(lista) {
    const ul = document.getElementById("ubs-list");
    if (!ul) return;

    ul.innerHTML = "";
    limparMarcadoresUBS();

    if (!lista.length) {
        ul.innerHTML = "<li>Nenhuma UBS encontrada</li>";
        return;
    }

    lista.forEach((local) => {
        const nome = local.text || "Unidade de Saúde";
        const endereco = local.place_name || "";
        const [lon, lat] = local.center;
        const distancia = Number(local.distancia).toFixed(2);

        let tipo = "Unidade de Saúde";
        if (local.prioridade === 1) tipo = "UBS / Posto de Saúde";
        else if (local.prioridade === 2) tipo = "UPA / Pronto Atendimento";
        else if (local.prioridade === 3) tipo = "Hospital / Clínica";

        if (map && typeof mapboxgl !== "undefined") {
            const marker = new mapboxgl.Marker()
                .setLngLat([lon, lat])
                .setPopup(
                    new mapboxgl.Popup().setHTML(`
                        <strong>${nome}</strong><br>
                        ${tipo}<br>
                        ${distancia} km<br>
                        ${endereco}
                    `)
                )
                .addTo(map);

            marcadoresUBS.push(marker);
        }

        const li = document.createElement("li");
        li.innerHTML = `
            <strong>${nome}</strong><br>
            <small>${tipo}</small><br>
            <small>${endereco}</small><br>
            📍 ${distancia} km de distância<br>
            <button type="button" onclick="abrirRota(${lat}, ${lon})">Ver rota</button>
        `;
        ul.appendChild(li);
    });
}

function abrirRota(lat, lon) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, "_blank");
}

window.abrirRota = abrirRota;

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}