// Database Default Mocking (Dimuat ke localStorage jika belum ada)
const defaultProduk = [
    {
        "id": 21,
        "nama": "2B Koin Ungu-MD",
        "harga": 140000,
        "stok": 10
    },
    {
        "id": 22,
        "nama": "1B Koin Ungu-MD",
        "harga": 70000,
        "stok": 10
    },
    {
        "id": 23,
        "nama": "400M Koin Ungu-MD",
        "harga": 35000,
        "stok": 10
    },
    {
        "id": 24,
        "nama": "200M Koin Ungu-MD",
        "harga": 20000,
        "stok": 10
    },
    {
        "id": 25,
        "nama": "60M Koin Ungu-MD",
        "harga": 6000,
        "stok": 10
    },
    {
        "id": 26,
        "nama": "1M Koin Ungu-MD",
        "harga": 200,
        "stok": 500
    }
];

const defaultToko = {
    "status": "buka",
    "maintenance": false,
    "pesanMaintenance": "Situs sedang diperbarui."
};

if(!localStorage.getItem('db_produk')) localStorage.setItem('db_produk', JSON.stringify(defaultProduk));
if(!localStorage.getItem('db_toko')) localStorage.setItem('db_toko', JSON.stringify(defaultToko));
if(!localStorage.getItem('db_pesanan')) localStorage.setItem('db_pesanan', JSON.stringify([]));
if(!localStorage.getItem('admin_limit_bongkar')) localStorage.setItem('admin_limit_bongkar', '0');

let currentPage = 1;
const itemsPerPage = 8;

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if(loader) loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
    }, 600);

    initTheme();
    checkTokoStatus();
    renderProducts();
    populateOrderDropdown();
    initSlider();
    updateTampilanLimit();

    const orderForm = document.getElementById('order-form') || document.querySelector('form');
    if (orderForm) { orderForm.addEventListener('submit', handleOrderSubmit); }
    
    const submitBtn = document.getElementById('btn-submit-order') || document.querySelector('button[type="submit"]') || document.querySelector('.btn-primary');
    if (submitBtn) { submitBtn.setAttribute('onclick', 'prosesPesananLangsung(event)'); }

    const navLinks = document.querySelectorAll('.nav-bar a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === '#beranda' || href === '#order-form-section') {
            link.addEventListener('click', (e) => { bukaTabBeranda(e); });
        }
    });
});

function initTheme() {
    const btn = document.getElementById('theme-toggle');
    if(!btn) return;
    if(localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        btn.innerHTML = '<i class="fas fa-sun"></i>';
    }
    btn.addEventListener('click', () => {
        let currentTheme = document.documentElement.getAttribute('data-theme');
        if(currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            btn.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            btn.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });
}

function checkTokoStatus() {
    let tokoData = JSON.parse(localStorage.getItem('db_toko')) || defaultToko;
    const badge = document.getElementById('store-status');
    const notice = document.getElementById('maintenance-notice');
    const submitBtn = document.getElementById('btn-submit-order') || document.querySelector('.btn-primary');

    if (tokoData.maintenance && notice) {
        notice.classList.remove('hidden');
        notice.innerHTML = `<strong>⚠️ MODE MAINTENANCE:</strong> ${tokoData.pesanMaintenance}`;
    }
    if (tokoData.maintenance && submitBtn) { submitBtn.disabled = true; }

    if(tokoData.status === "tutup") {
        if(badge) { badge.className = "status-badge status-closed"; badge.innerText = "🔴 TOKO TUTUP"; }
        if(submitBtn) submitBtn.disabled = true;
    } else {
        if(badge) { badge.className = "status-badge status-open"; badge.innerText = "🟢 TOKO BUKA"; }
    }
}

function renderProducts() {
    const container = document.getElementById('products-container');
    if(!container) return;
    container.innerHTML = "";

    let produkData = JSON.parse(localStorage.getItem('db_produk')) || [];
    let tokoData = JSON.parse(localStorage.getItem('db_toko')) || defaultToko;

    let start = (currentPage - 1) * itemsPerPage;
    let end = start + itemsPerPage;
    let paginatedItems = produkData.slice(start, end);

    paginatedItems.forEach(prod => {
        let isOut = prod.stok <= 0;
        let isStoreClosed = tokoData.status === "tutup" || tokoData.maintenance;
        let gambarThumbnail = "koin-d.webp";
        
        if (prod.nama.toUpperCase().includes("KOIN UNGU") || prod.nama.toUpperCase().includes("MD")) {
            gambarThumbnail = "koin-md.png"; 
        } else if (prod.nama.toUpperCase().includes("KOIN EMAS") || prod.nama.toUpperCase().includes("-D")) {
            gambarThumbnail = "koin-d.webp";
        }

        let card = document.createElement('div');
        card.className = "product-card";
        card.innerHTML = `
            ${isOut ? '<span class="badge-out">STOK HABIS</span>' : ''}
            <img class="product-img" src="${gambarThumbnail}" alt="${prod.nama}">
            <div class="product-name">${prod.nama}</div>
            <div class="product-price">Rp ${Number(prod.harga).toLocaleString('id-ID')}</div>
            <div class="product-stock">Stok: ${prod.stok}</div>
            <button class="btn btn-primary btn-sm btn-block" ${ (isOut || isStoreClosed) ? 'disabled' : ''} onclick="quickBuy('${prod.nama}')">
                ${isOut ? 'HABIS' : 'BELI'}
            </button>
`;
        container.appendChild(card);
    });
    renderPagination(produkData);
}

function renderPagination(produkData) {
    const pContainer = document.getElementById('pagination');
    if(!pContainer) return;
    pContainer.innerHTML = "";
    let totalPages = Math.ceil(produkData.length / itemsPerPage);
    if(totalPages <= 1) return;

    let prevBtn = document.createElement('button');
    prevBtn.className = "page-btn"; prevBtn.innerText = "<< Prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; renderProducts(); };
    pContainer.appendChild(prevBtn);

    for(let i=1; i<=totalPages; i++) {
        let pBtn = document.createElement('button');
        pBtn.className = `page-btn ${currentPage === i ? 'active' : ''}`;
        pBtn.innerText = i;
        pBtn.onclick = () => { currentPage = i; renderProducts(); };
        pContainer.appendChild(pBtn);
    }

    let nextBtn = document.createElement('button');
    nextBtn.className = "page-btn"; nextBtn.innerText = "Next >>";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; renderProducts(); };
    pContainer.appendChild(nextBtn);
}

function populateOrderDropdown() {
    const select = document.getElementById('select-product');
    if(!select) return;
    select.innerHTML = '<option value="">-- Pilih Paket Koin --</option>';
    let produkData = JSON.parse(localStorage.getItem('db_produk')) || [];
    produkData.forEach(prod => {
        if(prod.stok > 0) {
            let opt = document.createElement('option');
            opt.value = `${prod.nama} | Rp ${prod.harga}`;
            opt.innerText = `${prod.nama} (Rp ${Number(prod.harga).toLocaleString('id-ID')})`;
            select.appendChild(opt);
        }
    });
}

function quickBuy(namaProduk) {
    const select = document.getElementById('select-product');
    if(!select) return;
    for(let i=0; i<select.options.length; i++) {
        if(select.options[i].value.includes(namaProduk)) {
            select.selectedIndex = i;
            const targetSection = document.getElementById('order-form-section');
            if(targetSection) targetSection.scrollIntoView({behavior: 'smooth'});
            break;
        }
    }
}

function initSlider() {
    const wrapper = document.getElementById('slider-wrapper');
    const dotsContainer = document.getElementById('slider-dots');
    const slides = document.querySelectorAll('.slide');
    if (!wrapper || slides.length === 0) return;
    let index = 0;
    if (dotsContainer) {
        dotsContainer.innerHTML = "";
        slides.forEach((_, i) => {
            let dot = document.createElement('span');
            dot.className = `dot ${i === 0 ? 'active' : ''}`;
            dotsContainer.appendChild(dot);
        });
    }
    setInterval(() => {
        index = (index + 1) % slides.length;
        if(wrapper) wrapper.style.transform = `translateX(-${index * 100}%)`;
        let dots = document.querySelectorAll('.dot');
        dots.forEach((d, i) => { if(d) d.className = `dot ${i === index ? 'active' : ''}`; });
    }, 4000);
}

function handleOrderSubmit(e) { if(e) e.preventDefault(); eksekusiKirimWA(); }
function prosesPesananLangsung(e) { if(e) { e.preventDefault(); e.stopPropagation(); } eksekusiKirimWA(); }

function eksekusiKirimWA() {
    let tokoData = JSON.parse(localStorage.getItem('db_toko')) || defaultToko;
    if(tokoData.status === "tutup" || tokoData.maintenance) { alert("Maaf, Toko sedang tutup."); return; }

    const elPid = document.getElementById('player-id') || document.querySelector('input[placeholder*="ID"]');
    const elName = document.getElementById('buyer-name') || document.querySelector('input[placeholder*="Nama"]');
    const elWa = document.getElementById('whatsapp') || document.querySelector('input[placeholder*="WhatsApp"]');
    const elProd = document.getElementById('select-product') || document.querySelector('select');
    const elPaymentChecked = document.querySelector('input[name="payment_method"]:checked');

    if(!elPid || !elName || !elProd || !elPaymentChecked) { alert("Form HTML kurang lengkap."); return; }
    const pid = elPid.value; const name = elName.value; const wa = elWa ? elWa.value : "-"; const prod = elProd.value; const payment = elPaymentChecked.value;

    if(!pid || !name || !prod || !payment) { alert("Silakan lengkapi formulir."); return; }

    let infoRekening = payment === "BRI" ? "Bank BRI: 629001009295530\nAtas Nama: Muhammad Ashari" : "DANA/OVO/GOPAY: 081556828324";
    let orderList = JSON.parse(localStorage.getItem('db_pesanan')) || [];
    let trxId = "DOMINO-" + Math.floor(Math.random() * 900000 + 100000);
    orderList.push({ trxId, pid, name, wa, prod, payment, status: "Menunggu Pembayaran" });
    localStorage.setItem('db_pesanan', JSON.stringify(orderList));

    let msg = `*NOTA PESANAN - ${trxId}*\n-------------------------------------\nID Game: ${pid}\nNama: ${name}\nWhatsApp: ${wa}\nProduk: ${prod}\nMetode Bayar: ${payment}\nStatus: Menunggu Pembayaran\n-------------------------------------\n\n*TUJUAN TRANSFER:*\n${infoRekening}\n\n-------------------------------------\nSilakan lakukan transfer sesuai detail di atas, kemudian kirimkan bukti transfernya ke chat ini.`;
    window.location.href = `https://wa.me/6281556828324?text=${encodeURIComponent(msg)}`;
}

function bukaTabBongkar() {
    if(event) { event.preventDefault(); document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active')); event.currentTarget.classList.add('active'); }
    if(document.getElementById('beranda')) document.getElementById('beranda').style.display = 'none';
    const mainGrid = document.querySelector('.main-grid'); if(mainGrid) mainGrid.style.display = 'none';
    const sectionBongkar = document.getElementById('bongkar-koin-section'); if(sectionBongkar) { sectionBongkar.classList.remove('hidden'); sectionBongkar.style.display = 'block'; }
    updateTampilanLimit();
}

function bukaTabBeranda(e) {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if(e) e.currentTarget.classList.add('active');
    if(document.getElementById('beranda')) document.getElementById('beranda').style.display = 'block';
    const mainGrid = document.querySelector('.main-grid'); if(mainGrid) mainGrid.style.display = 'grid';
    const sectionBongkar = document.getElementById('bongkar-koin-section'); if(sectionBongkar) { sectionBongkar.style.display = 'none'; sectionBongkar.classList.add('hidden'); }
}

function updateTampilanLimit() {
    const currentLimit = parseInt(localStorage.getItem('admin_limit_bongkar')) || 0;
    const elText = document.getElementById('live-limit-bongkar');
    const btnSubmit = document.getElementById('btn-submit-bongkar');
    if (elText) elText.innerText = currentLimit + "B";
    if (currentLimit <= 0) {
        if (elText) elText.innerText = "HABIS";
        if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerText = "MAAF, KUOTA HABIS"; btnSubmit.style.backgroundColor = "#e53e3e"; }
    } else {
        if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerText = "AJUKAN BONGKAR KE WA"; btnSubmit.style.backgroundColor = "#38a169"; }
    }
}

function eksekusiBongkarWA(event) {
    event.preventDefault();
    const jumlahBongkar = parseInt(document.getElementById('bongkar-jumlah').value);
    const rekeningUser = document.getElementById('bongkar-rekening').value;
    const namaUser = document.getElementById('bongkar-nama').value;
    const currentLimit = parseInt(localStorage.getItem('admin_limit_bongkar')) || 0;

    if (!jumlahBongkar || !rekeningUser || !namaUser) { alert("Silakan lengkapi data."); return; }
    if (jumlahBongkar > currentLimit) { alert(`Kuota tidak mencukupi (${currentLimit}B).`); return; }

    localStorage.setItem('admin_limit_bongkar', (currentLimit - jumlahBongkar).toString());
    updateTampilanLimit();

    let trxIdBongkar = "BONGKAR-" + Math.floor(Math.random() * 900000 + 100000);
    let msg = `*FORMULIR BONGKAR KOIN - ${trxIdBongkar}*\n-------------------------------------\nJumlah Bongkar: ${jumlahBongkar}B Koin\nTujuan Pencairan: ${rekeningUser}\nAtas Nama: ${namaUser}\n-------------------------------------\n\nHalo Admin, saya sudah mengisi form bongkar koin sebesar ${jumlahBongkar}B. Mohon infokan nomor ID kirim game Anda.`;
    window.location.href = `https://api.whatsapp.com/send?phone=6281556828324&text=${encodeURIComponent(msg)}`;
}
