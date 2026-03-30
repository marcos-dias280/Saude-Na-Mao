document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("appointment-form");
    const modal = document.getElementById("appointment-modal");
    const closeButton = document.querySelector(".close-button");
    const openModalButtons = document.querySelectorAll(".open-modal-btn");

    const consultasSection = document.getElementById("minhas-consultas");
    const consultasConteudo = document.getElementById("consultas-conteudo");

    const inputEspecialidade = document.getElementById("especialidade");
    const inputData = document.getElementById("data-consulta");
    const inputHora = document.getElementById("hora-consulta");

    const navLogin = document.getElementById("nav-login");
    const navCadastro = document.getElementById("nav-cadastro");
    const navUser = document.getElementById("nav-user");
    const userName = document.getElementById("user-name");
    const logoutBtn = document.getElementById("logout-btn");

    function getUsuarioId() {
        return localStorage.getItem("user_id");
    }

    function getNomeUsuario() {
        return localStorage.getItem("nome");
    }

    function usuarioEstaLogado() {
        const usuarioId = getUsuarioId();
        return !!(usuarioId && usuarioId !== "undefined" && usuarioId !== "null");
    }

    function atualizarNavbar() {
        const usuarioId = getUsuarioId();
        const nomeUsuario = getNomeUsuario();

        if (usuarioId && nomeUsuario) {
            if (navLogin) navLogin.style.display = "none";
            if (navCadastro) navCadastro.style.display = "none";
            if (navUser) navUser.style.display = "flex";
            if (userName) userName.textContent = nomeUsuario;
            if (consultasSection) consultasSection.style.display = "block";
        } else {
            if (navLogin) navLogin.style.display = "flex";
            if (navCadastro) navCadastro.style.display = "flex";
            if (navUser) navUser.style.display = "none";
            if (consultasSection) consultasSection.style.display = "none";
        }
    }

    function configurarLogout() {
        if (!logoutBtn) return;

        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("user_id");
            localStorage.removeItem("nome");
            alert("Logout realizado com sucesso.");
            window.location.href = "/";
        });
    }

    function abrirModal(event) {
        event.preventDefault();

        if (!usuarioEstaLogado()) {
            alert("Você precisa estar logado para agendar uma consulta.");
            window.location.href = "/login-page";
            return;
        }

        if (modal) {
            modal.style.display = "flex";
        }
    }

    function fecharModal() {
        if (modal) {
            modal.style.display = "none";
        }
    }

    openModalButtons.forEach((button) => {
        button.addEventListener("click", abrirModal);
    });

    if (closeButton) {
        closeButton.addEventListener("click", fecharModal);
    }

    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            fecharModal();
        }
    });

    function formatarData(dataIso) {
        if (!dataIso) return "";
        const [ano, mes, dia] = dataIso.split("-");
        return `${dia}/${mes}/${ano}`;
    }

    function definirDataMinima() {
        if (!inputData) return;

        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const dia = String(hoje.getDate()).padStart(2, "0");

        inputData.min = `${ano}-${mes}-${dia}`;
    }

    function renderizarMensagem(mensagem, classe = "") {
        if (!consultasConteudo) return;
        consultasConteudo.innerHTML = `<p class="${classe}">${mensagem}</p>`;
    }

    async function agendarConsulta(event) {
        event.preventDefault();

        const usuarioId = getUsuarioId();

        if (!usuarioId) {
            alert("Usuário não identificado. Faça login novamente.");
            return;
        }

        const especialidade = inputEspecialidade?.value.trim();
        const data = inputData?.value;
        const hora = inputHora?.value;

        if (!especialidade || !data || !hora) {
            alert("Preencha todos os campos.");
            return;
        }

        try {
            const response = await fetch("/agendar_consulta", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    usuario_id: Number(usuarioId),
                    especialidade,
                    data,
                    hora
                })
            });

            const resultado = await response.json();

            if (!response.ok || !resultado.success) {
                alert(resultado.message || "Erro ao agendar consulta.");
                return;
            }

            alert("Consulta agendada com sucesso!");
            if (form) form.reset();
            fecharModal();
            await listarConsultas();
        } catch (error) {
            console.error("Erro ao agendar consulta:", error);
            alert("Erro de conexão com o servidor.");
        }
    }

    async function listarConsultas() {
        const usuarioId = getUsuarioId();

        if (!usuarioId) {
            if (consultasSection) consultasSection.style.display = "none";
            return;
        }

        if (consultasSection) {
            consultasSection.style.display = "block";
        }

        try {
            const response = await fetch(`/consultas/usuario/${usuarioId}`);
            const resultado = await response.json();

            if (!response.ok || !resultado.success) {
                renderizarMensagem(resultado.message || "Erro ao carregar consultas.", "erro-consultas");
                return;
            }

            const consultas = resultado.consultas || [];

            if (consultas.length === 0) {
                consultasConteudo.innerHTML = `
                    <div class="consultas-box consultas-box-bloqueada">
                        <h3>Nenhuma consulta agendada</h3>
                        <p>Você ainda não possui consultas marcadas.</p>
                    </div>
                `;
                return;
            }

            consultasConteudo.innerHTML = `
                <div class="consultas-box">
                    <h3>Consultas agendadas</h3>
                    <div class="consultas-lista">
                        ${consultas.map((consulta) => `
                            <div class="consulta-card">
                                <p><strong>Especialidade:</strong> ${consulta.especialidade}</p>
                                <p><strong>Data:</strong> ${formatarData(consulta.data)}</p>
                                <p><strong>Hora:</strong> ${consulta.hora}</p>
                                <button class="btn btn-cancelar" data-id="${consulta.id}">
                                    Cancelar consulta
                                </button>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;

            adicionarEventosCancelar();
        } catch (error) {
            console.error("Erro ao listar consultas:", error);
            renderizarMensagem("Erro de conexão com o servidor.", "erro-consultas");
        }
    }

    function adicionarEventosCancelar() {
        const botoesCancelar = document.querySelectorAll(".btn-cancelar");

        botoesCancelar.forEach((botao) => {
            botao.addEventListener("click", async () => {
                const consultaId = botao.dataset.id;
                const confirmar = confirm("Deseja realmente cancelar esta consulta?");
                if (!confirmar) return;

                try {
                    const response = await fetch(`/consultas/${consultaId}`, {
                        method: "DELETE"
                    });

                    const resultado = await response.json();

                    if (!response.ok || !resultado.success) {
                        alert(resultado.message || "Erro ao cancelar consulta.");
                        return;
                    }

                    alert("Consulta cancelada com sucesso!");
                    await listarConsultas();
                } catch (error) {
                    console.error("Erro ao cancelar consulta:", error);
                    alert("Erro de conexão com o servidor.");
                }
            });
        });
    }

    atualizarNavbar();
    configurarLogout();
    definirDataMinima();

    if (form) {
        form.addEventListener("submit", agendarConsulta);
    }

    listarConsultas();
});