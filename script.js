// Database Default Mocking (Dimuat ke localStorage jika belum ada)
const defaultProduk = [
    { id: 1, nama: "200M Koin Emas-D", harga: 17100, stok: 10 },
    { id: 2, nama: "300M Koin Emas-D", harga: 23400, stok: 15 },
    { id: 3, nama: "400M Koin Emas-D", harga: 29700, stok: 5 },
    { id: 4, nama: "500M Koin Emas-D", harga: 36000, stok: 12 },
    { id: 5, nama: "600M Koin Emas-D", harga: 42300, stok: 0 },
    { id: 6, nama: "700M Koin Emas-D", harga: 48600, stok: 8 },
    { id: 7, nama: "800M Koin Emas-D", harga: 54900, stok: 14 },
    { id: 8, nama: "900M Koin Emas-D", harga: 61200, stok: 9 },
    { id: 9, nama: "1B Koin Emas-D", harga: 67500, stok: 20 },
    { id: 10, nama: "1.5B Koin Emas-D", harga: 99000, stok: 3 },
    { id: 11, nama: "2B Koin Emas-D", harga: 130500, stok: 2 },
    { id: 12, nama: "2.7B Koin Emas-D", harga: 174600, stok: 4 },
    { id: 13, nama: "3B Koin Emas-D", harga: 193500, stok: 6 },
    { id: 14, nama: "4B Koin Emas-D", harga: 256500, stok: 0 },
    { id: 15, nama: "5B Koin Emas-D", harga: 319500, stok: 1 },
    { id: 16, nama: "6B Koin Emas-D", harga: 382500, stok: 4 },
    { id: 17, nama: "7B Koin Emas-D", harga: 445500, stok: 2 },
    { id: 18, nama: "8B Koin Emas-D", harga: 508500, stok: 3 }, 
    { id: 19, nama: "9B Koin Emas-D", harga: 571500, stok: 5 },
    { id: 20, nama: "10B Koin Emas-D", harga: 634500, stok: 2 }
];

const defaultToko = { status: "buka", maintenance: false, pesanMaintenance: "Situs sedang diperbarui." };

if(!localStorage.getItem('db_produk')) localStorage.setItem('db_produk', JSON.stringify(defaultProduk));
if(!localStorage.getItem('db_toko')) localStorage.setItem('db_toko', JSON.stringify(defaultToko));
if(!localStorage.getItem('db_pesanan')) localStorage.setItem('db_pesanan', JSON.stringify([]));

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

    // AUTO-BINDING: Mencari form atau tombol pesan secara otomatis jika ID manual salah
    const orderForm = document.getElementById('order-form') || document.querySelector('form');
    if (orderForm) {
        orderForm.addEventListener('submit', handleOrderSubmit);
    }
    
    const submitBtn = document.getElementById('btn-submit-order') || document.querySelector('button[type="submit"]') || document.querySelector('.btn-primary');
    if (submitBtn) {
        // Pasang onclick cadangan agar jika form bypass, tombol tetap menangkap aksi klik
        submitBtn.setAttribute('onclick', 'prosesPesananLangsung(event)');
    }
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

// Render Produk dengan Pagination
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
        
        let card = document.createElement('div');
        card.className = "product-card";
        card.innerHTML = `
            ${isOut ? '<span class="badge-out">STOK HABIS</span>' : ''}
            <img class="product-img" src="http://gamingku.xtgem.com/thumbnail.webp" alt="Coin">
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
        wrapper.style.transform = `translateX(-${index * 100}%)`;
        
        let dots = document.querySelectorAll('.dot');
        dots.forEach((d, i) => {
            if(d) d.className = `dot ${i === index ? 'active' : ''}`;
        });
    }, 4000);
}

// Handler Utama Form Submit
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

/// Core Engine Pengiriman WhatsApp Universal (Versi Tombol Ceklis / Radio)
function eksekusiKirimWA() {
    if(tokoData.status === "tutup" || tokoData.maintenance) {
        alert("Maaf, Toko sedang tutup.");
        return;
    }

    // Mengambil elemen input teks & produk
    const elPid = document.getElementById('player-id') || document.querySelector('input[placeholder*="ID"]');
    const elName = document.getElementById('buyer-name') || document.querySelector('input[placeholder*="Nama"]');
    const elWa = document.getElementById('whatsapp') || document.querySelector('input[placeholder*="WhatsApp"]') || document.querySelector('input[type="tel"]');
    const elProd = document.getElementById('select-product') || document.querySelector('select');

    // FIX CEKLIS: Mengambil nilai dari radio button yang sedang dicentang/diceklis oleh user
    const elPaymentChecked = document.querySelector('input[name="payment_method"]:checked');

    if(!elPid || !elName || !elProd || !elPaymentChecked) {
        alert("Sistem mendeteksi komponen HTML form tidak lengkap. Silakan periksa kembali berkas index.html Anda.");
        return;
    }

    const pid = elPid.value;
    const name = elName.value;
    const wa = elWa ? elWa.value : "-";
    const prod = elProd.value;
    
    // Ambil nilai utama metode pembayaran (pasti berhuruf besar sesuai atribut value di HTML)
    const payment = elPaymentChecked.value; 

    if(!pid || !name || !prod || !payment) {
        alert("Silakan lengkapi seluruh formulir pesanan Anda terlebih dahulu.");
        return;
    }

    // Penentuan Informasi Rekening berdasarkan tombol ceklis yang dipilih
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

    // Simpan log data transaksi ke LocalStorage
    let orderList = JSON.parse(localStorage.getItem('db_pesanan')) || [];
    let trxId = "DOMINO-" + Math.floor(Math.random() * 900000 + 100000);
    orderList.push({ trxId, pid, name, wa, prod, payment, status: "Menunggu Pembayaran" });
    localStorage.setItem('db_pesanan', JSON.stringify(orderList));

    // Susun Format Teks Pesan WhatsApp
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

    // Pengalihan langsung via lokasi dokumen berjalan (Aman dari pemblokiran browser)
    // PERBAIKAN: Tanda kurung ditutup dengan benar di akhir )
const whatsappUrl = `https://wa.me/6281556828324?text=${encodeURIComponent(msg)}`;
window.location.href = whatsappUrl;
}
