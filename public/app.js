async function checkAuth() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            window.location.href = 'login.html';
            return false;
        }

        const response = await fetch('/api/auth/check', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (!data.authenticated) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
        return false;
    }
}

if (!localStorage.getItem('authToken')) {
    window.location.href = 'login.html';
}

const authChecked = checkAuth().then(authenticated => {
    if (!authenticated) {
        throw new Error('Authentication failed');
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            // For token-based authentication, we just need to remove the token from localStorage
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            window.location.href = 'login.html';
        });
    }
});
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
const deleteClientBtn = document.getElementById('deleteClientBtn');
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

// Provider modal elements
const providerModal = document.getElementById('providerModal');
const providerModalTitle = document.getElementById('providerModalTitle');
const providerNameInput = document.getElementById('providerNameInput');
const providerImageInput = document.getElementById('providerImageInput');
const providerModalSave = document.getElementById('providerModalSave');
const providerModalCancel = document.getElementById('providerModalCancel');
const providerClose = document.getElementsByClassName('provider-close')[0];

// Confirmation modal elements
const confirmModal = document.getElementById('confirmModal');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmModalConfirm = document.getElementById('confirmModalConfirm');
const confirmModalCancel = document.getElementById('confirmModalCancel');
const confirmClose = document.getElementsByClassName('confirm-close')[0];
const boldBtn = document.getElementById('boldBtn');
const italicBtn = document.getElementById('italicBtn');
const underlineBtn = document.getElementById('underlineBtn');
const imageBtn = document.getElementById('imageBtn');
const imageInput = document.getElementById('imageInput');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const colorPicker = document.getElementById('colorPicker');

// Image modal elements
const imageModal = document.getElementById('imageModal');
const imageModalImg = document.getElementById('imageModalImg');
const imageCaption = document.getElementById('imageCaption');
const imageClose = document.getElementsByClassName('image-close')[0];

// --- Funções de Carregamento de Dados (Fetch) ---

async function fetchData(url, options = {}) {
    try {
        const token = localStorage.getItem('authToken');
        const headers = options.headers || {};
        headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(url, {
            ...options,
            headers: headers
        });
        
        if (response.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            window.location.href = 'login.html';
            return null;
        }
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
        if (procedures.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <h3>Nenhum procedimento encontrado</h3>
                <p>Adicione o primeiro procedimento para este cliente.</p>
            `;
            proceduresList.appendChild(emptyState);
        } else {
            procedures.forEach((proc, index) => {
                const li = document.createElement('li');
                li.className = 'procedure-item';

                const contentDiv = document.createElement('div');
                contentDiv.className = 'procedure-content';
                contentDiv.innerHTML = proc.procedure_text;
                if (proc.image_data) {
                    contentDiv.innerHTML += `<br><img src="${proc.image_data}" alt="Imagem do procedimento" style="max-width: 100%; height: auto; margin-top: 0.5rem; border-radius: 4px;">`;
                }

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'procedure-actions';
                actionsDiv.innerHTML = `
                    <button class="btn btn-icon move-up-btn" data-proc-id="${proc.id}" title="Mover para cima">↑</button>
                    <button class="btn btn-icon move-down-btn" data-proc-id="${proc.id}" title="Mover para baixo">↓</button>
                    <button class="btn btn-icon btn-secondary edit-icon" data-proc-id="${proc.id}" title="Editar procedimento">✏️</button>
                `;

                li.appendChild(contentDiv);
                li.appendChild(actionsDiv);

                li.dataset.id = proc.id;
                li.dataset.index = index;

                li.addEventListener('click', (e) => {
                    // Se clicou nos botões, não seleciona o item
                    if (e.target.closest('.procedure-actions')) {
                        return;
                    }
                    // Remove selected from others
                    document.querySelectorAll('#proceduresList li').forEach(el => el.classList.remove('selected'));
                    li.classList.add('selected');
                });
                proceduresList.appendChild(li);
            });
        }
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
    const capitalizedSinistro = sinistroType.charAt(0).toUpperCase() + sinistroType.slice(1);
    providerProceduresTitle.innerHTML = `Procedimentos Demais CLIENTES <span class="sinistro-red">${capitalizedSinistro}</span>`;
    if (procedures && procedures.length > 0) {
        procedures.forEach((proc, index) => {
            const li = document.createElement('li');
            li.className = 'procedure-item';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'procedure-content';
            contentDiv.textContent = proc.procedure_text;

            li.appendChild(contentDiv);
            li.dataset.id = proc.id;

            li.addEventListener('click', () => {
                document.querySelectorAll('#providerProceduresList li').forEach(el => el.classList.remove('selected'));
                li.classList.add('selected');
            });

            providerProceduresList.appendChild(li);
        });
        providerProceduresContainer.style.display = 'block';
    } else {
        providerProceduresContainer.style.display = 'none';
    }
}

async function showAdditionalProviderProcedures(providerId, sinistroType) {
    if (!providerId || !sinistroType) {
        additionalProviderProceduresContainer.style.display = 'none';
        return;
    }

    const capitalizedSinistro = sinistroType.charAt(0).toUpperCase() + sinistroType.slice(1);
    additionalProviderProceduresTitle.innerHTML = `Procedimentos AON <span class="sinistro-red">${capitalizedSinistro}</span>`;

    const procedures = await fetchData(`${API_URL}/providers/${providerId}/additional-procedures/${sinistroType}`);
    additionalProviderProceduresList.innerHTML = '';
    if (procedures && procedures.length > 0) {
        procedures.forEach((proc, index) => {
            const li = document.createElement('li');
            li.className = 'procedure-item';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'procedure-content';
            contentDiv.textContent = proc.procedure_text;

            li.appendChild(contentDiv);
            li.dataset.id = proc.id;

            li.addEventListener('click', () => {
                document.querySelectorAll('#additionalProviderProceduresList li').forEach(el => el.classList.remove('selected'));
                li.classList.add('selected');
            });

            additionalProviderProceduresList.appendChild(li);
        });
        additionalProviderProceduresContainer.style.display = 'block';
    } else {
        additionalProviderProceduresContainer.style.display = 'none';
    }
}

// --- Funções de Modal para Prestadores ---

function openProviderModal(mode, providerId = null) {
    if (mode === 'add') {
        providerModalTitle.textContent = 'Adicionar Prestador';
        providerNameInput.value = '';
        providerImageInput.value = '';
        providerModalSave.onclick = addProvider;
    } else if (mode === 'edit') {
        providerModalTitle.textContent = 'Editar Prestador';
        // Buscar dados do prestador para editar
        const selectedOption = providerSelect.options[providerSelect.selectedIndex];
        const currentName = selectedOption.textContent;
        providerNameInput.value = currentName;
        providerImageInput.value = ''; // Não implementamos edição de imagem ainda
        providerModalSave.onclick = () => editProvider(providerId);
    }
    providerModal.style.display = 'block';
    providerNameInput.focus();
}

async function addProvider() {
    const name = providerNameInput.value.trim();
    const image = providerImageInput.value.trim();
    
    if (!name) {
        alert('O nome do prestador é obrigatório.');
        providerNameInput.focus();
        return;
    }
    
    const result = await fetchData(`${API_URL}/providers`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, image})
    });
    
    if (result) {
        populateProviders();
        providerModal.style.display = 'none';
    }
}

async function editProvider(providerId) {
    const newName = providerNameInput.value.trim();
    const newImage = providerImageInput.value.trim();
    
    if (!newName) {
        alert('O nome do prestador é obrigatório.');
        providerNameInput.focus();
        return;
    }
    
    const result = await fetchData(`${API_URL}/providers/${providerId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: newName, image: newImage})
    });
    
    if (result) {
        populateProviders();
        providerModal.style.display = 'none';
    }
}

function openConfirmModal(providerId) {
    const selectedOption = providerSelect.options[providerSelect.selectedIndex];
    const providerName = selectedOption.textContent;
    confirmModalMessage.textContent = `Tem certeza que deseja excluir o prestador "${providerName}"?`;
    confirmModalConfirm.onclick = async () => {
        const result = await fetchData(`${API_URL}/providers/${providerId}`, {
            method: 'DELETE'
        });
        
        if (result) {
            populateProviders();
            providerSelect.value = '';
            showProviderProcedures('', '');
            showAdditionalProviderProcedures('', '');
            confirmModal.style.display = 'none';
        }
    };
    confirmModal.style.display = 'block';
}

// --- Funções de Modal para Procedimentos ---
function showModal(title, initialValue, callback) {
    modalTitle.textContent = title;
    modalInput.value = initialValue || '';
    
    // Reset form elements
    fontSizeSelect.value = '16';
    fontColorSelect.value = '#000000';
    imageUrlInput.value = '';
    imageFileInput.value = '';
    imagePreviewContainer.style.display = 'none';
    imagePreview.src = '';
    
    modal.style.display = 'block';
    modalInput.focus();
    
    modalSave.onclick = () => {
        const value = modalInput.value.trim();
        if (value) {
            // Apply formatting
            const fontSize = fontSizeSelect.value;
            const fontColor = fontColorSelect.value;
            const imageUrl = imageUrlInput.value.trim();
            
            let formattedText = `<span style="font-size: ${fontSize}px; color: ${fontColor};">${value}</span>`;
            
            if (imageUrl) {
                formattedText += `<br><img src="${imageUrl}" alt="Imagem" style="max-width: 100%; max-height: 300px; margin-top: 10px;">`;
            }
            
            callback(formattedText);
            modal.style.display = 'none';
        }
    };
    
    modalCancel.onclick = () => {
        modal.style.display = 'none';
    };
    
    close.onclick = () => {
        modal.style.display = 'none';
    };
    
    // Image upload functionality
    imageUploadBtn.addEventListener('click', () => {
        imageFileInput.click();
    });
    
    imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataURL = event.target.result;
                imageUrlInput.value = dataURL;
                imagePreview.src = dataURL;
                imagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    
    imageUrlInput.addEventListener('input', () => {
        const url = imageUrlInput.value.trim();
        if (url) {
            imagePreview.src = url;
            imagePreviewContainer.style.display = 'block';
        } else {
            imagePreviewContainer.style.display = 'none';
            imagePreview.src = '';
        }
    });
}

// Provider modal close events
providerModalCancel.onclick = () => {
    providerModal.style.display = 'none';
};
providerClose.onclick = () => {
    providerModal.style.display = 'none';
};
window.addEventListener('click', (event) => {
    if (event.target === providerModal) {
        providerModal.style.display = 'none';
    }
});

// Confirm modal close events
confirmModalCancel.onclick = () => {
    confirmModal.style.display = 'none';
};
confirmClose.onclick = () => {
    confirmModal.style.display = 'none';
};
window.addEventListener('click', (event) => {
    if (event.target === confirmModal) {
        confirmModal.style.display = 'none';
    }
});

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
        const contentDiv = selectedLi.querySelector('.procedure-content');
        const currentText = contentDiv.textContent.trim();
        showModal('Editar Procedimento', currentText, async (newText) => {
            if (newText && newText !== currentText) {
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
});
    // Image modal functionality
    let scale = 1;
    let panning = false;
    let pointX = 0;
    let pointY = 0;
    let start = { x: 0, y: 0 };
    
    function setTransform() {
        imageModalImg.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    }
    
    imageModalImg.onmousedown = function(e) {
        e.preventDefault();
        panning = true;
        start = { x: e.clientX - pointX, y: e.clientY - pointY };
        imageModalImg.style.cursor = 'grabbing';
    };
    
    document.onmouseup = function() {
        panning = false;
        imageModalImg.style.cursor = 'grab';
    };
    
    document.onmousemove = function(e) {
        if (!panning) return;
        pointX = (e.clientX - start.x);
        pointY = (e.clientY - start.y);
        setTransform();
    };
    
    imageModalImg.onwheel = function(e) {
        e.preventDefault();
        let xs = (e.clientX - pointX) / scale;
        let ys = (e.clientY - pointY) / scale;
        let delta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);
        (delta > 0) ? (scale *= 1.2) : (scale /= 1.2);
        pointX = e.clientX - xs * scale;
        pointY = e.clientY - ys * scale;
        setTransform();
    };
    
    imageClose.onclick = function() {
        imageModal.style.display = "none";
        scale = 1;
        pointX = 0;
        pointY = 0;
        setTransform();
    };
    
    // Event delegation for images in procedures
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'IMG' && e.target.closest('#proceduresList')) {
            imageModal.style.display = "block";
            imageModalImg.src = e.target.src;
            imageCaption.innerHTML = "Imagem do procedimento";
        }

        // Event delegation for move up buttons in procedures
        if (e.target.classList.contains('move-up-btn') && e.target.closest('#proceduresList')) {
            const procId = e.target.dataset.procId;
            const clientId = clientSelect.value;
            if (!procId || !clientId) return;

            fetchData(`${API_URL}/clients/${clientId}/procedures/${procId}/move-up`, {
                method: 'PUT'
            }).then(result => {
                if (result) {
                    showProcedures(clientId);
                }
            });
        }

        // Event delegation for move down buttons in procedures
        if (e.target.classList.contains('move-down-btn') && e.target.closest('#proceduresList')) {
            const procId = e.target.dataset.procId;
            const clientId = clientSelect.value;
            if (!procId || !clientId) return;

            fetchData(`${API_URL}/clients/${clientId}/procedures/${procId}/move-down`, {
                method: 'PUT'
            }).then(result => {
                if (result) {
                    showProcedures(clientId);
                }
            });
        }

        // Event delegation for edit icons in procedures
        if (e.target.classList.contains('edit-icon') && e.target.closest('#proceduresList')) {
            const procId = e.target.dataset.procId;
            const clientId = clientSelect.value;
            if (!procId || !clientId) return;

            // Find the procedure text from the DOM
            const li = e.target.closest('li');
            const currentText = li.innerHTML.replace(/ <span class="(edit-icon|move-up-btn|move-down-btn)"[^>]*>.*?<\/span>/g, ''); // Remove icons from text

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
        }

    });


    deleteProcedureBtn.addEventListener('click', async () => {
        const clientId = clientSelect.value;
        const selectedLi = document.querySelector('#proceduresList li.selected');
        if (!selectedLi) {
            alert('Selecione um procedimento para remover.');
            return;
        }
        const procId = selectedLi.dataset.id;
        const contentDiv = selectedLi.querySelector('.procedure-content');
        const currentText = contentDiv.textContent.trim();
        confirmModalTitle.textContent = 'Remover Procedimento';
        confirmModalMessage.textContent = `Tem certeza que deseja remover o procedimento "${currentText}"?`;
        confirmModalConfirm.onclick = async () => {
            const result = await fetchData(`${API_URL}/clients/${clientId}/procedures/${procId}`, {
                method: 'DELETE'
            });
            if (result) {
                showProcedures(clientId);
                confirmModal.style.display = 'none';
            }
        };
        confirmModal.style.display = 'block';
    });

    addClientBtn.addEventListener('click', async () => {
        const name = prompt('Nome do cliente:');
        if (name) {
            try {
                const response = await fetch(`${API_URL}/clients`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({name})
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    alert(errorData.error || 'Erro ao adicionar cliente.');
                    return;
                }
                const result = await response.json();
                populateClients();
            } catch (error) {
                alert('Erro ao comunicar com o servidor.');
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

    deleteClientBtn.addEventListener('click', async () => {
        const clientId = clientSelect.value;
        if (!clientId) {
            alert('Selecione um cliente para remover.');
            return;
        }
        if (confirm('Tem certeza que deseja remover este cliente?')) {
            const result = await fetchData(`${API_URL}/clients/${clientId}`, {
                method: 'DELETE'
            });
            if (result) {
                populateClients();
                clientSelect.value = '';
                showProcedures('', '');
            }
        }
    });

    addProviderBtn.addEventListener('click', () => {
        openProviderModal('add');
    });

    editProviderBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        if (!providerId) {
            alert('Selecione um prestador para editar.');
            return;
        }
        openProviderModal('edit', providerId);
    });


    deleteProviderBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        if (!providerId) {
            alert('Selecione um prestador para excluir.');
            return;
        }
        openConfirmModal(providerId);
    });

    addProviderProcedureBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        const sinistro = sinistroSelect.value;
        if (!providerId || !sinistro) {
            alert('Selecione um prestador e um tipo de sinistro.');
            return;
        }
        showModal('Adicionar Procedimento', '', async (procedureText) => {
            const result = await fetchData(`${API_URL}/providers/${providerId}/procedures/${sinistro}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({procedure_text: procedureText})
            });
            if (result) {
                showProviderProcedures(providerId, sinistro);
            }
        });
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
        const contentDiv = selectedLi.querySelector('.procedure-content');
        const currentText = contentDiv.textContent.trim();
        showModal('Editar Procedimento', currentText, async (newText) => {
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
    });

    deleteProviderProcedureBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        const sinistro = sinistroSelect.value;
        const selectedLi = document.querySelector('#providerProceduresList li.selected');
        if (!selectedLi) {
            alert('Selecione um procedimento para remover.');
            return;
        }
        const procId = selectedLi.dataset.id;
        const contentDiv = selectedLi.querySelector('.procedure-content');
        const currentText = contentDiv.textContent.trim();
        confirmModalTitle.textContent = 'Remover Procedimento';
        confirmModalMessage.textContent = `Tem certeza que deseja remover o procedimento "${currentText}"?`;
        confirmModalConfirm.onclick = async () => {
            const result = await fetchData(`${API_URL}/providers/${providerId}/procedures/${procId}`, {
                method: 'DELETE'
            });
            if (result) {
                showProviderProcedures(providerId, sinistro);
                confirmModal.style.display = 'none';
            }
        };
        confirmModal.style.display = 'block';
    });

    addAdditionalProviderProcedureBtn.addEventListener('click', async () => {
        const providerId = providerSelect.value;
        const sinistro = sinistroSelect.value;
        if (!providerId || !sinistro) {
            alert('Selecione um prestador e um tipo de sinistro.');
            return;
        }
        showModal('Adicionar Procedimento Adicional', '', async (procedureText) => {
            const result = await fetchData(`${API_URL}/providers/${providerId}/additional-procedures/${sinistro}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({procedure_text: procedureText})
            });
            if (result) {
                showAdditionalProviderProcedures(providerId, sinistro);
            }
        });
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
        const contentDiv = selectedLi.querySelector('.procedure-content');
        const currentText = contentDiv.textContent.trim();
        showModal('Editar Procedimento Adicional', currentText, async (newText) => {
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
        const procId = selectedLi.dataset.id;
        const contentDiv = selectedLi.querySelector('.procedure-content');
        const currentText = contentDiv.textContent.trim();
        confirmModalTitle.textContent = 'Remover Procedimento Adicional';
        confirmModalMessage.textContent = `Tem certeza que deseja remover o procedimento adicional "${currentText}"?`;
        confirmModalConfirm.onclick = async () => {
            const result = await fetchData(`${API_URL}/providers/${providerId}/additional-procedures/${procId}`, {
                method: 'DELETE'
            });
            if (result) {
                showAdditionalProviderProcedures(providerId, sinistro);
                confirmModal.style.display = 'none';
            }
        };
        confirmModal.style.display = 'block';
    });
});


