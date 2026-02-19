document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    if (localStorage.getItem('sessionId')) {
        window.location.href = 'index.html';
        return;
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            showMessage('Por favor, preencha usuário e senha.', 'error');
            return;
        }

        const submitBtn = loginForm.querySelector('.btn-login');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '🔄 Entrando...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('sessionId', data.sessionId);
                localStorage.setItem('username', data.user.username);
                showMessage('Login realizado com sucesso! Redirecionando...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                showMessage(data.error || 'Usuário ou senha incorretos.', 'error');
            }
        } catch (error) {
            showMessage('Erro ao conectar com o servidor.', 'error');
            console.error('Login error:', error);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    function showMessage(message, type) {
        loginMessage.textContent = message;
        loginMessage.className = `login-message ${type}`;
        loginMessage.style.display = 'block';

        if (type === 'error') {
            setTimeout(() => {
                loginMessage.style.display = 'none';
            }, 5000);
        }
    }
});
