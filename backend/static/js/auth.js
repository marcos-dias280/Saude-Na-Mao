function login() {
    const email = document.getElementById("email")?.value.trim();
    const senha = document.getElementById("senha")?.value;

    if (!email || !senha) {
        alert("Preencha email e senha.");
        return;
    }

    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, senha })
    })
        .then(async (res) => {
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || "Erro no login");
            }

            return data;
        })
        .then((data) => {
            if (data.user_id && data.nome) {
                localStorage.setItem("user_id", data.user_id);
                localStorage.setItem("nome", data.nome);
                window.location.href = "/";
            } else {
                alert(data.error || "Erro no login");
            }
        })
        .catch((err) => {
            console.error("Erro no login:", err);
            alert(err.message || "Erro na requisição");
        });
}

function register() {
    const nome = document.getElementById("nome")?.value.trim();
    const email = document.getElementById("email-cadastro")?.value.trim();
    const senha = document.getElementById("senha-cadastro")?.value;

    if (!nome || !email || !senha) {
        alert("Preencha nome, email e senha.");
        return;
    }

    fetch("/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ nome, email, senha })
    })
        .then(async (res) => {
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || "Erro ao cadastrar");
            }

            return data;
        })
        .then((data) => {
            if (data.user_id && data.nome) {
                localStorage.setItem("user_id", data.user_id);
                localStorage.setItem("nome", data.nome);

                alert("Cadastro realizado com sucesso!");
                window.location.href = "/";
            } else {
                alert(data.error || "Erro ao cadastrar");
            }
        })
        .catch((err) => {
            console.error("Erro no cadastro:", err);
            alert(err.message || "Erro ao cadastrar");
        });
}