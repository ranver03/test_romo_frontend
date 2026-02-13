// Global Configuration
const API_BASE_URL = "http://localhost:54391/api";

// Utility function for API calls
async function callApi(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.Message || 'Something went wrong');
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        Swal.fire('Error', error.message, 'error');
        throw error; 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Elements ---
    const loginScreen = document.getElementById('login-screen');
    const appLayout = document.getElementById('app-layout');
    const loginForm = document.getElementById('login-form');
    const userNameSpan = document.getElementById('user-name');
    const logoutButton = document.getElementById('logout-button');
    const views = document.querySelectorAll('.view');
    const sidebarLinks = document.querySelectorAll('.sidebar .list-group-item');
    const currentViewTitle = document.getElementById('current-view-title');
    const menuToggle = document.getElementById('menu-toggle');
    const wrapper = document.getElementById('wrapper');

    // Modales
    const invoiceDetailsModal = new bootstrap.Modal(document.getElementById('invoiceDetailsModal'));
    const createInvoiceModal = new bootstrap.Modal(document.getElementById('createInvoiceModal'));
    const clientModal = new bootstrap.Modal(document.getElementById('clientModal'));

    // Elementos de Facturas
    const invoicesTableBody = document.getElementById('invoices-table-body');
    const productItemsContainer = document.getElementById('product-items-container');
    const addProductRowButton = document.getElementById('add-product-row');
    const createInvoiceForm = document.getElementById('create-invoice-form');

    // Elementos de Clientes
    const clientsTableBody = document.getElementById('clients-table-body');
    const clientForm = document.getElementById('client-form');

    let availableProducts = []; 

    // --- 2. Core Functions (Carga de Datos) ---

    async function loadInvoices() {
        try {
            const invoices = await callApi('/facturas/listar');
            invoicesTableBody.innerHTML = ''; 
            invoices.forEach(invoice => {
                const row = invoicesTableBody.insertRow();
                row.innerHTML = `
                    <td>${invoice.FacturaID}</td>
                    <td>${invoice.NumeroFactura}</td>
                    <td>${invoice.Fecha.split('T')[0]}</td>
                    <td>${invoice.ClienteNombre}</td>
                    <td>$${invoice.Total.toFixed(2)}</td>
                    <td><button class="btn btn-info btn-sm view-details" data-invoice-id="${invoice.FacturaID}">Ver Detalles</button></td>
                `;
            });
        } catch (error) { }
    }

    async function loadClients() {
        try {
            const clientes = await callApi('/clientes/listar');
            clientsTableBody.innerHTML = '';
            clientes.forEach(c => {
                const row = clientsTableBody.insertRow();
                row.innerHTML = `
                    <td>${c.ClienteID}</td>
                    <td>${c.Identificacion}</td>
                    <td>${c.RazonSocial}</td>
                    <td>${c.Email}</td>
                    <td>
                        <button class="btn btn-warning btn-sm edit-client" data-id="${c.ClienteID}"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-sm delete-client" data-id="${c.ClienteID}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
            });
        } catch (error) { }
    }

    function showView(viewId) {
        views.forEach(view => view.classList.add('d-none'));
        const targetView = document.getElementById(`${viewId}-view`);
        if (targetView) targetView.classList.remove('d-none');

        sidebarLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`[data-view="${viewId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            currentViewTitle.textContent = activeLink.textContent;
        }
        
        if (viewId === 'invoices') loadInvoices();
        if (viewId === 'clients') loadClients();
        if (viewId === 'products') loadProducts();
    }

    // --- 3. Invoices Logic (CRUD y Detalles) ---

    // Ver detalle de una factura
    invoicesTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('view-details')) {
            const invoiceId = event.target.dataset.invoiceId;
            try {
                const allInvoices = await callApi('/facturas/listar');
                const invoice = allInvoices.find(inv => inv.FacturaID == invoiceId);

                if (invoice) {
                    document.getElementById('modal-invoice-id').textContent = invoice.FacturaID;
                    document.getElementById('modal-invoice-number').textContent = `(${invoice.NumeroFactura})`;
                    document.getElementById('modal-invoice-date').textContent = invoice.Fecha.split('T')[0];
                    document.getElementById('modal-invoice-client').textContent = invoice.ClienteNombre;
                    document.getElementById('modal-invoice-total').textContent = `$${invoice.Total.toFixed(2)}`;

                    const detailsBody = document.getElementById('modal-invoice-details-body');
                    detailsBody.innerHTML = '';
                    invoice.Detalles.forEach(detail => {
                        const row = detailsBody.insertRow();
                        row.innerHTML = `
                            <td>${detail.ProductoNombre}</td>
                            <td>${detail.Cantidad}</td>
                            <td>$${detail.PrecioUnitario.toFixed(2)}</td>
                            <td>$${detail.SubtotalLinea.toFixed(2)}</td>
                        `;
                    });
                    invoiceDetailsModal.show();
                }
            } catch (error) { }
        }
    });

    function addProductRow() {
        const newRow = document.createElement('div');
        newRow.classList.add('row', 'mb-2', 'product-item');
        newRow.innerHTML = `
            <div class="col-md-6">
                <select class="form-select product-id" required>
                    <option value="">Seleccione un producto</option>
                    ${availableProducts.map(p => `<option value="${p.ProductoID}">${p.Nombre} ($${p.PrecioUnitario.toFixed(2)})</option>`).join('')}
                </select>
            </div>
            <div class="col-md-4">
                <input type="number" class="form-control quantity" placeholder="Cantidad" min="1" required>
            </div>
            <div class="col-md-2 d-flex align-items-center">
                <button type="button" class="btn btn-danger btn-sm remove-product-row">&times;</button>
            </div>`;
        productItemsContainer.appendChild(newRow);
    }

    if(addProductRowButton) addProductRowButton.addEventListener('click', addProductRow);

    productItemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-product-row')) {
            e.target.closest('.product-item').remove();
        }
    });

    document.getElementById('new-invoice-button').addEventListener('click', async () => {
        createInvoiceForm.reset();
        productItemsContainer.innerHTML = '';
        try {
            availableProducts = await callApi('/productos/listar');
        } catch (e) { 
            console.warn("Error cargando productos, usando simulados.");
            availableProducts = [{ ProductoID: 1, Nombre: 'Error al cargar', PrecioUnitario: 0 }];
        }
        addProductRow();
        createInvoiceModal.show();
    });

    createInvoiceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const clienteId = document.getElementById('cliente-id').value;
        const productItems = document.querySelectorAll('.product-item');
        const detalles = [];

        productItems.forEach(item => {
            const productId = item.querySelector('.product-id').value;
            const quantity = item.querySelector('.quantity').value;
            if (productId && quantity) {
                detalles.push({ ProductoID: parseInt(productId), Cantidad: parseInt(quantity) });
            }
        });

        if (detalles.length === 0) {
            Swal.fire('Error', 'Debe agregar al menos un producto', 'warning');
            return;
        }

        try {
            await callApi('/facturas/crear', 'POST', { ClienteID: parseInt(clienteId), Detalles: detalles });
            Swal.fire('Éxito', 'Factura creada exitosamente!', 'success');
            createInvoiceModal.hide();
            loadInvoices();
        } catch (error) { }
    });

    // --- 4. Clients Logic (CRUD) ---

    document.getElementById('btn-nuevo-cliente').addEventListener('click', () => {
        clientForm.reset();
        document.getElementById('client-id').value = '';
        document.getElementById('clientModalLabel').textContent = 'Nuevo Cliente';
        clientModal.show();
    });

    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('client-id').value;
        const data = {
            Identificacion: document.getElementById('client-identificacion').value,
            RazonSocial: document.getElementById('client-razonsocial').value,
            Email: document.getElementById('client-email').value,
            Activo: true
        };
        try {
            if (id) {
                data.ClienteID = parseInt(id);
                await callApi('/clientes/actualizar', 'PUT', data);
            } else {
                await callApi('/clientes/crear', 'POST', data);
            }
            Swal.fire('Éxito', 'Cliente guardado correctamente', 'success');
            clientModal.hide();
            loadClients();
        } catch (error) {}
    });

    clientsTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;

        if (btn.classList.contains('edit-client')) {
            const c = await callApi(`/clientes/obtener/${id}`);
            document.getElementById('client-id').value = c.ClienteID;
            document.getElementById('client-identificacion').value = c.Identificacion;
            document.getElementById('client-razonsocial').value = c.RazonSocial;
            document.getElementById('client-email').value = c.Email;
            document.getElementById('clientModalLabel').textContent = 'Editar Cliente';
            clientModal.show();
        }

        if (btn.classList.contains('delete-client')) {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: "El cliente se desactivará.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar'
            });
            if (result.isConfirmed) {
                await callApi(`/clientes/eliminar/${id}`, 'DELETE');
                loadClients();
            }
        }
    });


    // --- 4.5. Products Logic (CRUD) ---
    const productModal = new bootstrap.Modal(document.getElementById('productModal'));
    const productForm = document.getElementById('product-form');
    const productsTableBody = document.getElementById('products-table-body');

    async function loadProducts() {
        try {
            const productos = await callApi('/productos/listar');
            productsTableBody.innerHTML = '';
            productos.forEach(p => {
                const row = productsTableBody.insertRow();
                row.innerHTML = `
                    <td>${p.ProductoID}</td>
                    <td>${p.Nombre}</td>
                    <td>$${p.PrecioUnitario.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-warning btn-sm edit-product" data-id="${p.ProductoID}"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-sm delete-product" data-id="${p.ProductoID}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
            });
        } catch (error) { }
    }

    document.getElementById('btn-nuevo-producto').addEventListener('click', () => {
        productForm.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('productModalLabel').textContent = 'Nuevo Producto';
        productModal.show();
    });

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('product-id').value;
        const data = {
                SKU: document.getElementById('product-sku').value,
                Nombre: document.getElementById('product-nombre').value,
                PrecioUnitario: parseFloat(document.getElementById('product-precio').value),
                IVA_Porcentaje: parseFloat(document.getElementById('product-iva').value),
                Stock: parseInt(document.getElementById('product-stock').value),
                Activo: true
            };
        try {
            if (id) {
                data.ProductoID = parseInt(id);
                await callApi('/productos/actualizar', 'PUT', data);
            } else {
                await callApi('/productos/crear', 'POST', data);
            }
            Swal.fire('Éxito', 'Producto guardado', 'success');
            productModal.hide();
            loadProducts();
        } catch (error) {}
    });

    productsTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;

        if (btn.classList.contains('edit-product')) {
            const p = await callApi(`/productos/obtener/${id}`);
            document.getElementById('product-id').value = p.ProductoID;
            document.getElementById('product-nombre').value = p.Nombre;
            document.getElementById('product-precio').value = p.PrecioUnitario;
            document.getElementById('productModalLabel').textContent = 'Editar Producto';
            productModal.show();
        }

        if (btn.classList.contains('delete-product')) {
            const result = await Swal.fire({ title: '¿Eliminar producto?', icon: 'warning', showCancelButton: true });
            if (result.isConfirmed) {
                await callApi(`/productos/eliminar/${id}`, 'DELETE');
                loadProducts();
            }
        }
    });


    // --- 5. Auth & Sidebar Logic ---

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await callApi('/auth/login', 'POST', { Username: username, Password: password });
            if (response.Success) {
                localStorage.setItem('userName', response.Usuario);
                Swal.fire('Éxito', response.Message, 'success');
                checkLoginStatus();
            }
        } catch (error) { }
    });

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('userName');
        checkLoginStatus();
        Swal.fire('Sesión Cerrada', 'Has salido del sistema.', 'info');
    });

    menuToggle.addEventListener('click', () => wrapper.classList.toggle('toggled'));

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = e.currentTarget.dataset.view;
            showView(viewId);
        });
    });

    function checkLoginStatus() {
        const userName = localStorage.getItem('userName');
        if (userName) {
            loginScreen.classList.add('d-none');
            appLayout.classList.remove('d-none');
            userNameSpan.textContent = userName;
            showView('invoices'); 
        } else {
            loginScreen.classList.remove('d-none');
            appLayout.classList.add('d-none');
        }
    }

    // Inicializar la App
    checkLoginStatus();
});