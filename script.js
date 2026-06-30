// Database Default Mocking (Dimuat ke localStorage jika belum ada)
const defaultProduk = [
    
];

const defaultToko = { status: "buka", maintenance: false, pesanMaintenance: "Situs sedang diperbarui." };

if(!localStorage.getItem('db_produk')) localStorage.setItem('db_produk', JSON.stringify(defaultProduk));
if(!localStorage.getItem('db_toko')) localStorage.setItem('db_toko', JSON.stringify(defaultToko));
if(!localStorage.getItem('db_pesanan')) localStorage.setItem('db_pesanan', JSON.stringify([]));
if(!localStorage.getItem('admin_limit_bongkar')) localStorage.setItem('admin_limit_bongkar', '10'); // Default limit awal bongkar 10B

// State Management
let produkData = JSON.parse(localStorage.getItem('db_produk'));
let tokoData = JSON.parse(localStorage.getItem('db_toko'));
let currentPage = 1;
const itemsPerPage = 8;

// DOM Elements
document.addEventListener("DOMContentLoaded", () => {
    // Menghilangkan loading screen
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

    // AUTO-BINDING Form Top Up
    const orderForm = document.getElementById('order-form') || document.querySelector('form');
    if (orderForm) {
        orderForm.addEventListener('submit', handleOrderSubmit);
    }
    
    const submitBtn = document.getElementById('btn-submit-order') || document.querySelector('button[type="submit"]') || document.querySelector('.btn-primary');
    if (submitBtn) {
        submitBtn.setAttribute('onclick', 'prosesPesananLangsung(event)');
    }

    // Atur aksi klik pada navigasi menu "Beranda" & "Order" agar bisa kembali dari halaman bongkar
    const navLinks = document.querySelectorAll('.nav-bar a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === '#beranda' || href === '#order-form-section') {
            link.addEventListener('click', (e) => {
                bukaTabBeranda(e);
            });
        }
    });
});

// Dark/Light Mode
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

// Cek Status Toko & Maintenance
function checkTokoStatus() {
    const badge = document.getElementById('store-status');
    const notice = document.getElementById('maintenance-notice');
    const submitBtn = document.getElementById('btn-submit-order') || document.querySelector('.btn-primary');

    if (tokoData.maintenance && notice) {
        notice.classList.remove('hidden');
        notice.innerHTML = `<strong>⚠️ MODE MAINTENANCE:</strong> ${tokoData.pesanMaintenance}`;
    }
    if (tokoData.maintenance && submitBtn) {
        submitBtn.disabled = true;
    }

    if(tokoData.status === "tutup") {
        if(badge) {
            badge.className = "status-badge status-closed";
            badge.innerText = "🔴 TOKO TUTUP";
        }
        if(submitBtn) submitBtn.disabled = true;
    } else {
        if(badge) {
            badge.className = "status-badge status-open";
            badge.innerText = "🟢 TOKO BUKA";
        }
    }
}

// Render Produk dengan Gambar Dinamis (Koin D vs Koin MD)
function renderProducts() {
    const container = document.getElementById('products-container');
    if(!container) return;
    container.innerHTML = "";

    let start = (currentPage - 1) * itemsPerPage;
    let end = start + itemsPerPage;
    let paginatedItems = produkData.slice(start, end);

    paginatedItems.forEach(prod => {
        let isOut = prod.stok <= 0;
        let isStoreClosed = tokoData.status === "tutup" || tokoData.maintenance;
        
        let gambarThumbnail = "koin-d.webp"; // Gambar default cadangan
        
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
            <div class="product-price">Rp ${prod.harga.toLocaleString('id-ID')}</div>
            <div class="product-stock">Stok: ${prod.stok}</div>
            <button class="btn btn-primary btn-sm btn-block" ${ (isOut || isStoreClosed) ? 'disabled' : ''} onclick="quickBuy('${prod.nama}')">
                ${isOut ? 'HABIS' : 'BELI'}
            </button>
        `;
        container.appendChild(card);
    });

    renderPagination();
}

function renderPagination() {
    const pContainer = document.getElementById('pagination');
    if(!pContainer) return;
    pContainer.innerHTML = "";
    let totalPages = Math.ceil(produkData.length / itemsPerPage);

    let prevBtn = document.createElement('button');
    prevBtn.className = "page-btn";
    prevBtn.innerText = "<< Prev";
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
    nextBtn.className = "page-btn";
    nextBtn.innerText = "Next >>";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; renderProducts(); };
    pContainer.appendChild(nextBtn);
}

// Sinkronisasi data ke Form Order Dropdown
function populateOrderDropdown() {
    const select = document.getElementById('select-product');
    if(!select) return;
    select.innerHTML = '<option value="">-- Pilih Paket Koin --</option>';
    produkData.forEach(prod => {
        if(prod.stok > 0) {
            let opt = document.createElement('option');
            opt.value = `${prod.nama} | Rp ${prod.harga}`;
            opt.innerText = `${prod.nama} (Rp ${prod.harga.toLocaleString('id-ID')})`;
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

// Banner Auto Slider Horizontal Sinkron
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
        dots.forEach((d, i) => {
            if(d) d.className = `dot ${i === index ? 'active' : ''}`;
        });
    }, 4000);
}

// Handler Utama Form Submit Top Up
function handleOrderSubmit(e) {
    if(e) e.preventDefault(); 
    eksekusiKirimWA();
}

// Handler Cadangan jika ditekan langsung pada tombol (Anti-Refresh Halaman)
function prosesPesananLangsung(e) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    eksekusiKirimWA();
}

// Core Engine Pengiriman WhatsApp Universal Top Up
function eksekusiKirimWA() {
    if(tokoData.status === "tutup" || tokoData.maintenance) {
        alert("Maaf, Toko sedang tutup.");
        return;
    }

    const elPid = document.getElementById('player-id') || document.querySelector('input[placeholder*="ID"]');
    const elName = document.getElementById('buyer-name') || document.querySelector('input[placeholder*="Nama"]');
    const elWa = document.getElementById('whatsapp') || document.querySelector('input[placeholder*="WhatsApp"]') || document.querySelector('input[type="tel"]');
    const elProd = document.getElementById('select-product') || document.querySelector('select');
    const elPaymentChecked = document.querySelector('input[name="payment_method"]:checked');

    if(!elPid || !elName || !elProd || !elPaymentChecked) {
        alert("Sistem mendeteksi komponen HTML form tidak lengkap. Silakan periksa kembali berkas index.html Anda.");
        return;
    }

    const pid = elPid.value;
    const name = elName.value;
    const wa = elWa ? elWa.value : "-";
    const prod = elProd.value;
    const payment = elPaymentChecked.value; 

    if(!pid || !name || !prod || !payment) {
        alert("Silakan lengkapi seluruh formulir pesanan Anda terlebih dahulu.");
        return;
    }

    let infoRekening = "";
    if (payment === "DANA") {
        infoRekening = "DANA: 081556828324";
    } else if (payment === "OVO") {
        infoRekening = "OVO: 081556828324";
    } else if (payment === "GOPAY") {
        infoRekening = "GOPAY: 081556828324";
    } else if (payment === "BRI") {
        infoRekening = "Bank BRI: 629001009295530\nAtas Nama: Muhammad Ashari";
    } else if (payment === "SeaBank") {
        infoRekening = "SeaBank: 901811201524\nAtas Nama: Muhammad Ashari";
    } else {
        infoRekening = "Silakan hubungi Admin untuk detail pembayaran.";
    }

    let orderList = JSON.parse(localStorage.getItem('db_pesanan')) || [];
    let trxId = "DOMINO-" + Math.floor(Math.random() * 900000 + 100000);
    orderList.push({ trxId, pid, name, wa, prod, payment, status: "Menunggu Pembayaran" });
    localStorage.setItem('db_pesanan', JSON.stringify(orderList));

    let msg = `*NOTA PESANAN - ${trxId}*\n`;
    msg += `-------------------------------------\n`;
    msg += `ID Game: ${pid}\n`;
    msg += `Nama: ${name}\n`;
    msg += `WhatsApp: ${wa}\n`;
    msg += `Produk: ${prod}\n`;
    msg += `Metode Bayar: ${payment}\n`;
    msg += `Status: Menunggu Pembayaran\n`;
    msg += `-------------------------------------\n\n`;
    msg += `*TUJUAN TRANSFER:*\n`;
    msg += `${infoRekening}\n\n`;
    msg += `-------------------------------------\n`;
    msg += `Silakan lakukan transfer sesuai detail di atas, kemudian kirimkan bukti transfernya ke chat ini untuk diproses.`;

    const whatsappUrl = `https://wa.me/6281556828324?text=${encodeURIComponent(msg)}`;
    window.location.href = whatsappUrl;
}

// ========================================================
// --- SYSTEM MANAGEMENT NAVIGATION & BONGKAR KOIN ---
// ========================================================

// Mengaktifkan halaman Bongkar Koin & Menyembunyikan Beranda
function bukaTabBongkar() {
    if(event) {
        event.preventDefault();
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }

    // Sembunyikan elemen utama halaman beranda
    if(document.getElementById('beranda')) document.getElementById('beranda').style.display = 'none';
    const mainGrid = document.querySelector('.main-grid');
    if(mainGrid) mainGrid.style.display = 'none';
    
    // Tampilkan panel formulir Bongkar Koin
    const sectionBongkar = document.getElementById('bongkar-koin-section');
    if(sectionBongkar) {
        sectionBongkar.classList.remove('hidden');
        sectionBongkar.style.display = 'block';
    }
    
    updateTampilanLimit();
}

// Mengembalikan tampilan dari Tab Bongkar ke Beranda/Order Utama
function bukaTabBeranda(e) {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    // Beri penanda active kembali ke menu penunjuk target
    if(e) {
        e.currentTarget.classList.add('active');
    }

    // Tampilkan kembali elemen utama beranda
    if(document.getElementById('beranda')) document.getElementById('beranda').style.display = 'block';
    const mainGrid = document.querySelector('.main-grid');
    if(mainGrid) mainGrid.style.display = 'grid';
    
    // Sembunyikan panel bongkar koin
    const sectionBongkar = document.getElementById('bongkar-koin-section');
    if(sectionBongkar) {
        sectionBongkar.style.display = 'none';
        sectionBongkar.classList.add('hidden');
    }
}

// Menangani kalkulasi estimasi bongkar kosong (Anti-Error)
function hitungEstimasiBongkar() {
    const jumlah = document.getElementById('bongkar-jumlah').value;
    console.log("Sistem memproses estimasi jumlah bongkar: " + jumlah + "B");
}

// Sinkronisasi Sisa Kuota Dari LocalStorage Ke Tampilan HTML Pembeli
function updateTampilanLimit() {
    const currentLimit = parseInt(localStorage.getItem('admin_limit_bongkar')) || 0;
    const elText = document.getElementById('live-limit-bongkar');
    const btnSubmit = document.getElementById('btn-submit-bongkar');

    if (elText) elText.innerText = currentLimit + "B";

    if (currentLimit <= 0) {
        if (elText) elText.innerText = "HABIS (Kuota Penuh)";
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerText = "MAAF, KUOTA BONGKARAN HARI INI HABIS";
            btnSubmit.style.backgroundColor = "#e53e3e";
        }
    } else {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = "AJUKAN BONGKAR KE WA";
            btnSubmit.style.backgroundColor = "#38a169";
        }
    }
}

// Engine Eksekusi Pengiriman Notulen Bongkar via WhatsApp
function eksekusiBongkarWA(event) {
    event.preventDefault();

    const jumlahBongkar = parseInt(document.getElementById('bongkar-jumlah').value);
    const rekeningUser = document.getElementById('bongkar-rekening').value;
    const namaUser = document.getElementById('bongkar-nama').value;
    const currentLimit = parseInt(localStorage.getItem('admin_limit_bongkar')) || 0;

    if (!jumlahBongkar || !rekeningUser || !namaUser) {
        alert("Silakan lengkapi data formulir penjualan koin Anda.");
        return;
    }

    if (jumlahBongkar > currentLimit) {
        alert(`Gagal! Jumlah bongkaran (${jumlahBongkar}B) melebihi sisa kuota hari ini (${currentLimit}B).`);
        return;
    }

    // Potong limit kuota secara otomatis
    const limitBaru = currentLimit - jumlahBongkar;
    localStorage.setItem('admin_limit_bongkar', limitBaru.toString());
    updateTampilanLimit();

    let trxIdBongkar = "BONGKAR-" + Math.floor(Math.random() * 900000 + 100000);

    let msg = `*FORMULIR BONGKAR KOIN - ${trxIdBongkar}*\n`;
    msg += `-------------------------------------\n`;
    msg += `Jumlah Bongkar: ${jumlahBongkar}B Koin\n`;
    msg += `Tujuan Pencairan: ${rekeningUser}\n`;
    msg += `Atas Nama: ${namaUser}\n`;
    msg += `-------------------------------------\n\n`;
    msg += `Halo Admin, saya sudah mengisi form bongkar koin sebesar ${jumlahBongkar}B. Mohon infokan nomor ID kirim game Anda agar saya bisa transfer koin sekarang.`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=6281556828324&text=${encodeURIComponent(msg)}`;
    window.location.href = whatsappUrl;
}
