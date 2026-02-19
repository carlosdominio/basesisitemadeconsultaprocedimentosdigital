document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    if (localStorage.getItem('isLoggedIn')) {
        window.location.href = 'index.html';
        return;
    }

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (username === 'admin' && password === 'Anovasenhae8763') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', username);
            localStorage.setItem('loginTime', new Date().toISOString());

            showMessage('Login realizado com sucesso! Redirecionando...', 'success');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showMessage('Usuário ou senha incorretos. Tente novamente.', 'error');
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

    loginForm.addEventListener('submit', function() {
        const submitBtn = loginForm.querySelector('.btn-login');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '🔄 Entrando...';
        submitBtn.disabled = true;

        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }, 2000);
    });
});
