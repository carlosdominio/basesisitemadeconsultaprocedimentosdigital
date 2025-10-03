const API_URL = '/api';

// Elementos DOM
const clientSelect = document.getElementById('clientSelect');
const proceduresContainer = document.getElementById('proceduresContainer');
const proceduresList = document.getElementById('proceduresList');
const addProcedureBtn = document.getElementById('addProcedureBtn');
const editProcedureBtn = document.getElementById('editProcedureBtn');
const deleteProcedureBtn = document.getElementById('deleteProcedureBtn');
const addClientBtn = document.getElementById('addClientBtn');
const editClientBtn = document.getElementById('editClientBtn');
const providerSelect = document.getElementById('providerSelect');
const providerProceduresContainer = document.getElementById('providerProceduresContainer');
const providerProceduresList = document.getElementById('providerProceduresList');
const addProviderBtn = document.getElementById('addProviderBtn');
const editProviderBtn = document.getElementById('editProviderBtn');
const deleteProviderBtn = document.getElementById('deleteProviderBtn');
const addProviderProcedureBtn = document.getElementById('addProviderProcedureBtn');
const editProviderProcedureBtn = document.getElementById('editProviderProcedureBtn');
const deleteProviderProcedureBtn = document.getElementById('deleteProviderProcedureBtn');
const sinistroSelect = document.getElementById('sinistroSelect');
const additionalProviderProceduresContainer = document.getElementById('additionalProviderProceduresContainer');
const additionalProviderProceduresList = document.getElementById('additionalProviderProceduresList');
const additionalProviderProceduresTitle = document.getElementById('additionalProviderProceduresTitle');
const providerProceduresTitle = document.getElementById('providerProceduresTitle');
const addAdditionalProviderProcedureBtn = document.getElementById('addAdditionalProviderProcedureBtn');
const editAdditionalProviderProcedureBtn = document.getElementById('editAdditionalProviderProcedureBtn');
const deleteAdditionalProviderProcedureBtn = document.getElementById('deleteAdditionalProviderProcedureBtn');

// Modal elements
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalInput = document.getElementById('modalInput');
const modalSave = document.getElementById('modalSave');
const modalCancel = document.getElementById('modalCancel');
const close = document.getElementsByClassName('close')[0];
const boldBtn = document.getElementById('boldBtn');
const italicBtn = document.getElementById('italicBtn');
const underlineBtn = document.getElementById('underlineBtn');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const colorPicker = document.getElementById('colorPicker');

// --- Funções de Carregamento de Dados (Fetch) ---

async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        return response.json();
    } catch (error) {
        console.error('API Error:', error);
        alert('Ocorreu um erro ao comunicar com o servidor.');
        return null;
    }
}

async function populateClients() {
    const clients = await fetchData(`${API_URL}/clients`);
    clientSelect.innerHTML = '<option value="">-- Escolha um cliente --</option>';
    if (clients) {
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            clientSelect.appendChild(option);
        });
    }
}

async function populateProviders() {
    const providers = await fetchData(`${API_URL}/providers`);
    providerSelect.innerHTML = '<option value="">-- Escolha um prestador --</option>';
    if (providers) {
        providers.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.id;
            option.textContent = provider.name;
            providerSelect.appendChild(option);
        });
    }
}

async function showProcedures(clientId) {
    if (!clientId) {
        proceduresContainer.style.display = 'none';
        return;
    }
    const procedures = await fetchData(`${API_URL}/clients/${clientId}/procedures`);
    proceduresList.innerHTML = '';
    if (procedures) {
        procedures.forEach((proc, index) => {
            const li = document.createElement('li');
            li.innerHTML = `${index + 1}. ${proc.procedure_text}`;
            li.dataset.id = proc.id; // Armazena o ID do BD
            li.dataset.index = index;
            li.addEventListener('click', () => {
                // Remove selected from others
                document.querySelectorAll('#proceduresList li').forEach(el => el.classList.remove('selected'));
                li.classList.add('selected');
            });
            proceduresList.appendChild(li);
        });
        proceduresContainer.style.display = 'block';
    }
}

async function showProviderProcedures(providerId, sinistroType) {
    if (!providerId || !sinistroType) {
        providerProceduresContainer.style.display = 'none';
        return;
    }
    const procedures = await fetchData(`${API_URL}/providers/${providerId}/procedures/${sinistroType}`);
    providerProceduresList.innerHTML = '';
    if (procedures) {
        procedures.forEach((proc, index) => {
            const li = document.createElement('li');
            li.innerHTML = `${index + 1}. ${proc.procedure_text}`;
            li.dataset.id = proc.id;
            li.addEventListener('click', () => {
                // Remove selected from others
                document.querySelectorAll('#providerProceduresList li').forEach(el => el.classList.remove('selected'));
                li.classList.add('selected');
            });
            providerProceduresList.appendChild(li);
        });
    }
    providerProceduresContainer.style.display = 'block';
}

async function showAdditionalProviderProcedures(providerId, sinistroType) {
    if (!providerId || !sinistroType) {
        additionalProviderProceduresContainer.style.display = 'none';
        return;
    }
    const procedures = await fetchData(`${API_URL}/providers/${providerId}/additional-procedures/${sinistroType}`);
    additionalProviderProceduresList.innerHTML = '';
    if (procedures) {
        procedures.forEach((proc, index) => {
            const li = document.createElement('li');
            li.innerHTML = `${index + 1}. ${proc.procedure_text}`;
            li.dataset.id = proc.id;
            li.addEventListener('click', () => {
                // Remove selected from others
                document.querySelectorAll('#additionalProviderProceduresList li').forEach(el => el.classList.remove('selected'));
                li.classList.add('selected');
            });
            additionalProviderProceduresList.appendChild(li);
        });
    }
    additionalProviderProceduresContainer.style.display = 'block';
}

// Modal functions
function showModal(title, initialValue, callback) {
    modalTitle.textContent = title;
    modalInput.innerHTML = initialValue || '';
    modal.style.display = 'block';
    modalSave.onclick = () => {
        const value = modalInput.innerHTML.trim();
        if (value) {
            callback(value);
            modal.style.display = 'none';
        }
    };
    modalCancel.onclick = () => {
        modal.style.display = 'none';
    };
    close.onclick = () => {
        modal.style.display = 'none';
    };
}

// Editor commands
boldBtn.addEventListener('click', () => document.execCommand('bold'));
italicBtn.addEventListener('click', () => document.execCommand('italic'));
underlineBtn.addEventListener('click', () => document.execCommand('underline'));
fontSizeSelect.addEventListener('change', () => document.execCommand('fontSize', false, fontSizeSelect.value));
colorPicker.addEventListener('change', () => document.execCommand('foreColor', false, colorPicker.value));

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    populateClients();
    populateProviders();

    clientSelect.addEventListener('change', () => {
        showProcedures(clientSelect.value);
    });

    providerSelect.addEventListener('change', () => {
        const sinistro = sinistroSelect.value;
        showProviderProcedures(providerSelect.value, sinistro);
        showAdditionalProviderProcedures(providerSelect.value, sinistro);
    });

    sinistroSelect.addEventListener('change', () => {
        const provider = providerSelect.value;
        showProviderProcedures(provider, sinistroSelect.value);
        showAdditionalProviderProcedures(provider, sinistroSelect.value);
    });

    // Placeholder for other buttons - for now, just basic functionality
    addProcedureBtn.addEventListener('click', () => {
        const clientId = clientSelect.value;
        if (!clientId) {
            alert('Selecione um cliente primeiro.');
            return;
        }
        showModal('Adicionar Procedimento', '', async (procedureText) => {
            const result = await fetchData(`${API_URL}/clients/${clientId}/procedures`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({procedure_text: procedureText})
            });
            if (result) {
                showProcedures(clientId);
            }
        });
    });

    editProcedureBtn.addEventListener('click', async () => {
        const clientId = clientSelect.value;
        const selectedLi = document.querySelector('#proceduresList li.selected');
        if (!selectedLi) {
            alert('Selecione um procedimento para editar.');
            return;
        }
        const procId = selectedLi.dataset.id;
        const currentText = selectedLi.innerHTML.substring(3); // Since it may have HTML
        showModal('Editar Procedimento', currentText, async (newText) => {
            if (newText !== currentText) {
                const result = await fetchData(`${API_URL}/clients/${clientId}/procedures/${procId}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({procedure_text: newText})
                });
                if (result) {
                    showProcedures(clientId);
                }
            }
        });
    });

    deleteProcedureBtn.addEventListener('click', async () => {
        const clientId = clientSelect.value;
        const selectedLi = document.querySelector('#proceduresList li.selected');
        if (!selectedLi) {
            alert('Selecione um procedimento para remover.');
            return;
        }
        if (confirm('Tem certeza que deseja remover este procedimento?')) {
            const procId = selectedLi.dataset.id;
            const result = await fetchData(`${API_URL}/clients/${clientId}/procedures/${procId}`, {
                method: 'DELETE'
            });
            if (result) {
                showProcedures(clientId);
            }
        }
    });

    addClientBtn.addEventListener('click', async () => {
        const name = prompt('Nome do cliente:');
        if (name) {
            const result = await fetchData(`${API_URL}/clients`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name})
            });
            if (result) {
                populateClients();
            }
        }
    });

    editClientBtn.addEventListener('click', async () => {
        const clientId = clientSelect.value;
        if (!clientId) {
            alert('Selecione um cliente para editar.');
            return;
        }
        const newName = prompt('Novo nome do cliente:');
        if (newName) {
            const result = await fetchData(`${API_URL}/clients/${clientId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name: newName})
            });
            if (result) {
                populateClients();
                // If the current client is selected, refresh procedures
                if (clientSelect.value === clientId) {
                    showProcedures(clientId);
                }
            }
        }
    });

    addProviderBtn.addEventListener('click', async () => {
        const name = prompt('Nome do prestador:');
        if (name) {
            const image = prompt('Imagem (opcional):') || '';
            const result = await fetchData(`${API_URL}/providers`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name, image})
            });
            if (result) {
                populateProviders();
            }
        }
    });

    editProviderBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        if (!providerId) {
            alert('Selecione um prestador para editar.');
            return;
        }
        const newName = prompt('Novo nome do prestador:');
        if (newName) {
            const result = await fetchData(`${API_URL}/providers/${providerId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name: newName, image: ''}) // Assuming no image edit for now
            });
            if (result) {
                populateProviders();
            }
        }
    });


    deleteProviderBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        if (!providerId) {
            alert('Selecione um prestador para excluir.');
            return;
        }
        if (confirm('Tem certeza que deseja excluir este prestador?')) {
            const result = await fetchData(`${API_URL}/providers/${providerId}`, {
                method: 'DELETE'
            });
            if (result) {
                populateProviders();
                providerSelect.value = '';
                showProviderProcedures('', '');
                showAdditionalProviderProcedures('', '');
            }
        }
    });

    addProviderProcedureBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        const sinistro = sinistroSelect.value;
        if (!providerId || !sinistro) {
            alert('Selecione um prestador e um tipo de sinistro.');
            return;
        }
        const procedureText = prompt('Texto do procedimento:');
        if (procedureText) {
            const result = await fetchData(`${API_URL}/providers/${providerId}/procedures/${sinistro}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({procedure_text: procedureText})
            });
            if (result) {
                showProviderProcedures(providerId, sinistro);
            }
        }
    });

    editProviderProcedureBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        const sinistro = sinistroSelect.value;
        const selectedLi = document.querySelector('#providerProceduresList li.selected');
        if (!selectedLi) {
            alert('Selecione um procedimento para editar.');
            return;
        }
        const procId = selectedLi.dataset.id;
        const currentText = selectedLi.textContent.substring(3);
        const newText = prompt('Novo texto do procedimento:', currentText);
        if (newText && newText !== currentText) {
            const result = await fetchData(`${API_URL}/providers/${providerId}/procedures/${procId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({procedure_text: newText})
            });
            if (result) {
                showProviderProcedures(providerId, sinistro);
            }
        }
    });

    deleteProviderProcedureBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        const sinistro = sinistroSelect.value;
        const selectedLi = document.querySelector('#providerProceduresList li.selected');
        if (!selectedLi) {
            alert('Selecione um procedimento para remover.');
            return;
        }
        if (confirm('Tem certeza que deseja remover este procedimento?')) {
            const procId = selectedLi.dataset.id;
            const result = await fetchData(`${API_URL}/providers/${providerId}/procedures/${procId}`, {
                method: 'DELETE'
            });
            if (result) {
                showProviderProcedures(providerId, sinistro);
            }
        }
    });

    addAdditionalProviderProcedureBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        const sinistro = sinistroSelect.value;
        if (!providerId || !sinistro) {
            alert('Selecione um prestador e um tipo de sinistro.');
            return;
        }
        const procedureText = prompt('Texto do procedimento adicional:');
        if (procedureText) {
            const result = await fetchData(`${API_URL}/providers/${providerId}/additional-procedures/${sinistro}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({procedure_text: procedureText})
            });
            if (result) {
                showAdditionalProviderProcedures(providerId, sinistro);
            }
        }
    });

    editAdditionalProviderProcedureBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        const sinistro = sinistroSelect.value;
        const selectedLi = document.querySelector('#additionalProviderProceduresList li.selected');
        if (!selectedLi) {
            alert('Selecione um procedimento adicional para editar.');
            return;
        }
        const procId = selectedLi.dataset.id;
        const currentText = selectedLi.textContent.substring(3);
        const newText = prompt('Novo texto do procedimento adicional:', currentText);
        if (newText && newText !== currentText) {
            const result = await fetchData(`${API_URL}/providers/${providerId}/additional-procedures/${procId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({procedure_text: newText})
            });
            if (result) {
                showAdditionalProviderProcedures(providerId, sinistro);
            }
        }
    });

    deleteAdditionalProviderProcedureBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        const sinistro = sinistroSelect.value;
        const selectedLi = document.querySelector('#additionalProviderProceduresList li.selected');
        if (!selectedLi) {
            alert('Selecione um procedimento adicional para remover.');
            return;
        }
        if (confirm('Tem certeza que deseja remover este procedimento adicional?')) {
            const procId = selectedLi.dataset.id;
            const result = await fetchData(`${API_URL}/providers/${providerId}/additional-procedures/${procId}`, {
                method: 'DELETE'
            });
            if (result) {
                showAdditionalProviderProcedures(providerId, sinistro);
            }
        }
    });
});