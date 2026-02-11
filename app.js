// Global Configuration
const API_BASE_URL = "http://localhost:54391/api";

// Utility function for API calls
async function callApi(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (data) {
        options.body = JSON.stringify(data);
    }

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

// --- Login Functionality ---
document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const appLayout = document.getElementById('app-layout');
    const loginForm = document.getElementById('login-form');
    const userNameSpan = document.getElementById('user-name');
    const logoutButton = document.getElementById('logout-button');

    function checkLoginStatus() {
        const userName = localStorage.getItem('userName');
        if (userName) {
            loginScreen.classList.add('d-none');
            appLayout.classList.remove('d-none');
            userNameSpan.textContent = userName;
            showView('invoices'); // Default view after login
        } else {
            loginScreen.classList.remove('d-none');
            appLayout.classList.add('d-none');
        }
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await callApi('/auth/login', 'POST', { Username: username, Password: password });
            if (response.Success) {
                localStorage.setItem('userName', response.Usuario);
                Swal.fire('Éxito', response.Message, 'success');
                checkLoginStatus();
            } else {
                Swal.fire('Error', response.Message, 'error');
            }
        } catch (error) {
            // Error handled by callApi utility function
        }
    });

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('userName');
        checkLoginStatus();
        Swal.fire('Sesión Cerrada', 'Has cerrado sesión correctamente.', 'info');
    });

    // Initial check
    checkLoginStatus();

    // --- Sidebar Toggle ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarWrapper = document.getElementById('sidebar-wrapper');
    const wrapper = document.getElementById('wrapper');

    menuToggle.addEventListener('click', () => {
        wrapper.classList.toggle('toggled');
    });

    // --- View Switching ---
    const sidebarLinks = document.querySelectorAll('.sidebar .list-group-item');
    const views = document.querySelectorAll('.view');
    const currentViewTitle = document.getElementById('current-view-title');

    function showView(viewId) {
        views.forEach(view => view.classList.add('d-none'));
        document.getElementById(`${viewId}-view`).classList.remove('d-none');

        sidebarLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`[data-view="${viewId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            currentViewTitle.textContent = activeLink.textContent;
        }
        
        // Load data for the view if necessary
        if (viewId === 'invoices') {
            loadInvoices();
        } else if (viewId === 'products') {
            // loadProducts(); // Placeholder for future implementation
        }
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const viewId = event.target.dataset.view;
            showView(viewId);
        });
    });

    // --- Invoice Listing ---
    const invoicesTableBody = document.getElementById('invoices-table-body');
    const invoiceDetailsModal = new bootstrap.Modal(document.getElementById('invoiceDetailsModal'));

    async function loadInvoices() {
        try {
            const invoices = await callApi('/facturas/listar');
            invoicesTableBody.innerHTML = ''; // Clear existing rows
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
        } catch (error) {
            // Error handled by callApi
        }
    }

    invoicesTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('view-details')) {
            const invoiceId = event.target.dataset.invoiceId;
            // In a real scenario, you might fetch a single invoice by ID.
            // For this task, we'll simulate finding it from the loaded list.
            try {
                const allInvoices = await callApi('/facturas/listar'); // Re-fetch or use a cached list
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
            } catch (error) {
                // Error handled by callApi
            }
        }
    });

    // --- Invoice Creation ---
    const newInvoiceButton = document.getElementById('new-invoice-button');
    const createInvoiceModal = new bootstrap.Modal(document.getElementById('createInvoiceModal'));
    const createInvoiceForm = document.getElementById('create-invoice-form');
    const addProductRowButton = document.getElementById('add-product-row');
    const productItemsContainer = document.getElementById('product-items-container');
    let availableProducts = []; // To store product catalog

    // Placeholder for loading products (as per requirements, not yet available on backend)
    async function loadProductsForForm() {
        try {
            // Simulating product data since endpoint is not available
            // In a real scenario: availableProducts = await callApi('/productos/listar');
            availableProducts = [
                { ProductoID: 1, Nombre: 'Laptop', PrecioUnitario: 1200.00 },
                { ProductoID: 2, Nombre: 'Mouse', PrecioUnitario: 25.00 },
                { ProductoID: 3, Nombre: 'Teclado', PrecioUnitario: 75.00 },
                { ProductoID: 4, Nombre: 'Monitor', PrecioUnitario: 300.00 },
            ];
            addProductRow(); // Add an initial product row
        } catch (error) {
            console.warn('Could not load products. Using simulated data.', error); // Use warn as it's expected
            availableProducts = [
                { ProductoID: 1, Nombre: 'Laptop', PrecioUnitario: 1200.00 },
                { ProductoID: 2, Nombre: 'Mouse', PrecioUnitario: 25.00 },
                { ProductoID: 3, Nombre: 'Teclado', PrecioUnitario: 75.00 },
                { ProductoID: 4, Nombre: 'Monitor', PrecioUnitario: 300.00 },
            ];
            addProductRow(); // Add an initial product row
        }
    }

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
            </div>
        `;
        productItemsContainer.appendChild(newRow);
    }

    addProductRowButton.addEventListener('click', addProductRow);

    productItemsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-product-row')) {
            event.target.closest('.product-item').remove();
        }
    });

    newInvoiceButton.addEventListener('click', () => {
        createInvoiceForm.reset();
        productItemsContainer.innerHTML = ''; // Clear previous product rows
        loadProductsForForm(); // Load products and add an initial row
        createInvoiceModal.show();
    });

    createInvoiceForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const clienteId = document.getElementById('cliente-id').value;
        const productItems = document.querySelectorAll('.product-item');
        const detalles = [];

        let isValid = true;
        productItems.forEach(item => {
            const productId = item.querySelector('.product-id').value;
            const quantity = item.querySelector('.quantity').value;

            if (productId && quantity && parseInt(quantity) > 0) {
                detalles.push({
                    ProductoID: parseInt(productId),
                    Cantidad: parseInt(quantity)
                });
            } else {
                isValid = false;
            }
        });

        if (!isValid || detalles.length === 0) {
            Swal.fire('Advertencia', 'Por favor, complete todos los campos de producto y asegúrese de que la cantidad sea válida.', 'warning');
            return;
        }

        const invoiceData = {
            ClienteID: parseInt(clienteId),
            Detalles: detalles
        };

        try {
            const response = await callApi('/facturas/crear', 'POST', invoiceData);
            Swal.fire('Éxito', 'Factura creada exitosamente!', 'success');
            createInvoiceModal.hide();
            loadInvoices(); // Refresh the invoice list
        } catch (error) {
            // Error handled by callApi
        }
    });
});
