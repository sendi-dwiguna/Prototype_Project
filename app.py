"""
Restokin - Sistem Prediksi Restock dan Dynamic Pricing untuk Online Shop
Dibangun menggunakan Python Flask dan SQLite3
"""

import os
import sqlite3
import math
import io
from datetime import datetime, timedelta
from functools import wraps

from flask import (
    Flask, render_template, request, redirect, url_for,
    flash, session, send_file, jsonify, abort
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Inisialisasi Aplikasi Flask
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "restokin-secret-key-super-aman-2026")
app.permanent_session_lifetime = timedelta(minutes=30)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # Maksimal unggah 5 MB
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'restokin.db')


# ====================================================================
# HELPER DATABASE & FILTER FORMAT INDONESIA
# ====================================================================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.template_filter('rupiah')
def rupiah_filter(val):
    try:
        val = float(val or 0)
        return f"Rp {val:,.0f}".replace(",", ".")
    except (ValueError, TypeError):
        return "Rp 0"

@app.template_filter('tgl_indo')
def tgl_indo_filter(date_str):
    if not date_str:
        return "-"
    try:
        # Menangani format YYYY-MM-DD atau ISO
        clean_date = str(date_str).split("T")[0].split(" ")[0]
        dt = datetime.strptime(clean_date, "%Y-%m-%d")
        return dt.strftime("%d-%m-%Y")
    except Exception:
        return str(date_str)


# ====================================================================
# INISIALISASI DATABASE & DATA DUMMY
# ====================================================================

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Tabel Users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        nama_lengkap TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('pemilik', 'staf')),
        created_at TEXT NOT NULL
    )
    """)

    # Tabel Percobaan Login Gagal (Account Lockout)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        attempt_time TEXT NOT NULL,
        success INTEGER NOT NULL
    )
    """)

    # Tabel Produk
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT UNIQUE NOT NULL,
        nama_produk TEXT NOT NULL,
        harga_modal REAL NOT NULL,
        harga_jual REAL NOT NULL,
        stok_saat_ini INTEGER NOT NULL,
        batas_stok_min INTEGER NOT NULL,
        harga_min REAL NOT NULL,
        harga_max REAL NOT NULL,
        lead_time_hari INTEGER NOT NULL,
        catatan TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Tabel Log Riwayat Perubahan Stok
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stock_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        jenis_perubahan TEXT NOT NULL,
        jumlah_perubahan INTEGER NOT NULL,
        stok_sebelum INTEGER NOT NULL,
        stok_sesudah INTEGER NOT NULL,
        keterangan TEXT,
        user_id INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # Tabel Penjualan
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        jumlah_terjual INTEGER NOT NULL,
        harga_satuan REAL NOT NULL,
        total_harga REAL NOT NULL,
        tanggal_penjualan TEXT NOT NULL,
        catatan TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
    """)

    # Tabel Event Promosi / Lonjakan Permintaan
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_event TEXT NOT NULL,
        faktor_pengali REAL NOT NULL,
        tanggal_mulai TEXT NOT NULL,
        tanggal_selesai TEXT NOT NULL,
        deskripsi TEXT
    )
    """)

    # Tabel Riwayat Perubahan Harga (Dynamic Pricing Log)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        harga_lama REAL NOT NULL,
        harga_baru REAL NOT NULL,
        alasan TEXT,
        user_id INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # Tabel Rekomendasi Dynamic Pricing Ditangguhkan / Ditolak
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pricing_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        periode TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # Tabel Riwayat Eksekusi Restock
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS restock_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        jumlah_restock INTEGER NOT NULL,
        metode_peramalan TEXT NOT NULL,
        event_applied TEXT,
        catatan TEXT,
        user_id INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
    """)

    conn.commit()

    # Cek & Masukkan Data Dummy Awal
    cursor.execute("SELECT COUNT(*) as count FROM users")
    if cursor.fetchone()['count'] == 0:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO users (username, nama_lengkap, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, ('pemilik', 'Budi Santoso (Pemilik Toko)', generate_password_hash('admin123'), 'pemilik', now))
        cursor.execute("""
            INSERT INTO users (username, nama_lengkap, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, ('staf', 'Siti Rahma (Staf Operasional)', generate_password_hash('staf123'), 'staf', now))
        conn.commit()

    cursor.execute("SELECT COUNT(*) as count FROM products")
    if cursor.fetchone()['count'] == 0:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        dummy_products = [
            ('SKU-001', 'Kemeja Flanel Premium Pria', 85000, 145000, 8, 10, 120000, 185000, 7, 'Kategori Pakaian Pria - Best Seller', now),
            ('SKU-002', 'Gamis Rayon Viscose Cantik', 95000, 165000, 14, 12, 140000, 210000, 5, 'Kategori Muslim Fashion - Bahan adem', now),
            ('SKU-003', 'Sepatu Sneaker Casual Canvas', 130000, 225000, 35, 15, 190000, 280000, 10, 'Kategori Sepatu - Stok mencukupi', now),
            ('SKU-004', 'Tas Ransel Laptop Anti Air', 110000, 195000, 4, 8, 160000, 250000, 6, 'Kategori Aksesoris - Stok menipis', now),
            ('SKU-005', 'Kaos Polos Katun Combed 30s', 32000, 65000, 52, 20, 50000, 85000, 4, 'Kategori Basic Wear - Penjualan stabil', now),
        ]
        cursor.executemany("""
            INSERT INTO products (sku, nama_produk, harga_modal, harga_jual, stok_saat_ini, batas_stok_min, harga_min, harga_max, lead_time_hari, catatan, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, dummy_products)
        conn.commit()

        # Riwayat Penjualan Dummy minimal 4 periode (4 bulan ke belakang)
        sales_data = [
            # SKU-001 (Kemeja)
            (1, 28, 145000, 28*145000, '2026-07-15', 'Penjualan Periode 1'),
            (1, 35, 145000, 35*145000, '2026-08-18', 'Penjualan Periode 2'),
            (1, 42, 145000, 42*145000, '2026-09-20', 'Penjualan Periode 3'),
            (1, 50, 145000, 50*145000, '2026-10-22', 'Penjualan Periode 4'),
            (1, 15, 145000, 15*145000, '2026-11-05', 'Penjualan Berjalan Bulan Ini'),

            # SKU-002 (Gamis)
            (2, 20, 165000, 20*165000, '2026-07-10', 'Penjualan Periode 1'),
            (2, 25, 165000, 25*165000, '2026-08-12', 'Penjualan Periode 2'),
            (2, 30, 165000, 30*165000, '2026-09-14', 'Penjualan Periode 3'),
            (2, 38, 165000, 38*165000, '2026-10-18', 'Penjualan Periode 4'),
            (2, 12, 165000, 12*165000, '2026-11-08', 'Penjualan Berjalan Bulan Ini'),

            # SKU-003 (Sepatu)
            (3, 15, 225000, 15*225000, '2026-07-05', 'Penjualan Periode 1'),
            (3, 14, 225000, 14*225000, '2026-08-08', 'Penjualan Periode 2'),
            (3, 12, 225000, 12*225000, '2026-09-11', 'Penjualan Periode 3'),
            (3, 10, 225000, 10*225000, '2026-10-14', 'Penjualan Periode 4'),
            (3, 4, 225000, 4*225000, '2026-11-02', 'Penjualan Berjalan Bulan Ini'),

            # SKU-004 (Tas Ransel)
            (4, 18, 195000, 18*195000, '2026-07-22', 'Penjualan Periode 1'),
            (4, 22, 195000, 22*195000, '2026-08-25', 'Penjualan Periode 2'),
            (4, 28, 195000, 28*195000, '2026-09-27', 'Penjualan Periode 3'),
            (4, 34, 195000, 34*195000, '2026-10-29', 'Penjualan Periode 4'),
            (4, 9, 195000, 9*195000, '2026-11-09', 'Penjualan Berjalan Bulan Ini'),

            # SKU-005 (Kaos Polos)
            (5, 60, 65000, 60*65000, '2026-07-02', 'Penjualan Periode 1'),
            (5, 65, 65000, 65*65000, '2026-08-04', 'Penjualan Periode 2'),
            (5, 72, 65000, 72*65000, '2026-09-06', 'Penjualan Periode 3'),
            (5, 80, 65000, 80*65000, '2026-10-09', 'Penjualan Periode 4'),
            (5, 25, 65000, 25*65000, '2026-11-04', 'Penjualan Berjalan Bulan Ini'),
        ]
        cursor.executemany("""
            INSERT INTO sales (product_id, jumlah_terjual, harga_satuan, total_harga, tanggal_penjualan, catatan, created_at)
            VALUES (?, ?, ?, ?, ?, ?, '2026-11-12 00:00:00')
        """, sales_data)
        conn.commit()

        # Dummy Events
        dummy_events = [
            ('Promo 11.11 Mega Sale', 1.50, '2026-11-10', '2026-11-12', 'Pesta diskon nasional lonjakan +50%'),
            ('Ramadan & Lebaran Fest', 1.60, '2027-03-01', '2027-04-05', 'Lonjakan pembelian busana & kebutuhan hari raya'),
            ('Payday Sale Akhir Bulan', 1.25, '2026-11-25', '2026-11-30', 'Pekan gajian rutin +25%'),
        ]
        cursor.executemany("""
            INSERT INTO events (nama_event, faktor_pengali, tanggal_mulai, tanggal_selesai, deskripsi)
            VALUES (?, ?, ?, ?, ?)
        """, dummy_events)
        conn.commit()

    conn.close()

# Jalankan init saat import
init_db()


# ====================================================================
# AUTENTIKASI & KEAMANAN (RBAC, TIMEOUT & LOCKOUT)
# ====================================================================

@app.before_request
def check_session_timeout():
    # Cek timeout sesi 30 menit
    if 'user_id' in session:
        last_active = session.get('last_active')
        if last_active:
            try:
                last_time = datetime.fromisoformat(last_active)
                if datetime.now() - last_time > timedelta(minutes=30):
                    session.clear()
                    flash('Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit. Silakan login kembali.', 'warning')
                    return redirect(url_for('login'))
            except Exception:
                pass
        session['last_active'] = datetime.now().isoformat()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Silakan masuk terlebih dahulu untuk mengakses halaman ini.', 'warning')
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def role_required(required_role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                flash('Silakan masuk terlebih dahulu.', 'warning')
                return redirect(url_for('login'))
            if session.get('role') != required_role:
                flash('Akses ditolak. Fitur ini hanya dapat diakses oleh Pemilik Toko.', 'danger')
                return redirect(url_for('dashboard'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def is_account_locked(username):
    """Cek apakah akun terkunci selama 15 menit jika ada 5 kali kegagalan login berturut-turut."""
    conn = get_db()
    cursor = conn.cursor()
    fifteen_mins_ago = (datetime.now() - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        SELECT COUNT(*) as failed_count
        FROM login_attempts
        WHERE username = ? AND success = 0 AND attempt_time >= ?
    """, (username, fifteen_mins_ago))
    row = cursor.fetchone()
    conn.close()
    return (row['failed_count'] if row else 0) >= 5

def record_login_attempt(username, success):
    conn = get_db()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("""
        INSERT INTO login_attempts (username, attempt_time, success)
        VALUES (?, ?, ?)
    """, (username, now, 1 if success else 0))
    if success:
        # Bersihkan percobaan gagal lama jika berhasil
        conn.execute("DELETE FROM login_attempts WHERE username = ?", (username,))
    conn.commit()
    conn.close()


@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        if not username or not password:
            flash('Harap isi username dan password.', 'danger')
            return render_template('login.html')

        if is_account_locked(username):
            flash('Akun ini sementara terkunci selama 15 menit karena salah memasukkan password sebanyak 5 kali. Coba lagi nanti.', 'danger')
            return render_template('login.html')

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        conn.close()

        if user and check_password_hash(user['password_hash'], password):
            record_login_attempt(username, True)
            session.permanent = True
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['nama_lengkap'] = user['nama_lengkap']
            session['role'] = user['role']
            session['last_active'] = datetime.now().isoformat()

            flash(f'Selamat datang kembali, {user["nama_lengkap"]}!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page or url_for('dashboard'))
        else:
            record_login_attempt(username, False)
            conn = get_db()
            fifteen_mins_ago = (datetime.now() - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S")
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) as count FROM login_attempts
                WHERE username = ? AND success = 0 AND attempt_time >= ?
            """, (username, fifteen_mins_ago))
            fail_count = cursor.fetchone()['count']
            conn.close()

            sisa = max(0, 5 - fail_count)
            if sisa == 0:
                flash('Password salah 5 kali berturut-turut! Akun Anda kini terkunci selama 15 menit.', 'danger')
            else:
                flash(f'Username atau password salah. Sisa kesempatan sebelum akun terkunci: {sisa} kali.', 'danger')

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Anda telah berhasil keluar dari sistem Restokin.', 'info')
    return redirect(url_for('login'))


# ====================================================================
# MODUL E: DASHBOARD
# ====================================================================

def get_stock_status(stok, batas_min):
    """
    Status stok otomatis:
    - Aman: stok > batas min + 5
    - Waspada: batas min < stok <= batas min + 5
    - Kritis: stok <= batas min
    """
    if stok <= batas_min:
        return 'Kritis'
    elif stok <= batas_min + 5:
        return 'Waspada'
    else:
        return 'Aman'

@app.route('/')
@login_required
def dashboard():
    conn = get_db()
    cursor = conn.cursor()

    # Hitung Statistik Kartu
    cursor.execute("SELECT * FROM products ORDER BY nama_produk ASC")
    products = [dict(row) for row in cursor.fetchall()]

    total_produk = len(products)
    produk_kritis = 0
    total_modal_stok = 0
    total_nilai_jual = 0

    for p in products:
        p['status'] = get_stock_status(p['stok_saat_ini'], p['batas_stok_min'])
        if p['status'] == 'Kritis':
            produk_kritis += 1
        total_modal_stok += (p['stok_saat_ini'] * p['harga_modal'])
        total_nilai_jual += (p['stok_saat_ini'] * p['harga_jual'])

    # Penjualan Bulan Berjalan
    now_month = datetime.now().strftime("%Y-%m")
    cursor.execute("""
        SELECT COALESCE(SUM(total_harga), 0) as total_penjualan,
               COALESCE(SUM(jumlah_terjual), 0) as total_qty
        FROM sales
        WHERE strftime('%Y-%m', tanggal_penjualan) = ?
    """, (now_month,))
    sales_month = cursor.fetchone()
    total_penjualan_bulan_ini = sales_month['total_penjualan']

    # Estimasi Margin Rata-rata dari Seluruh Produk
    total_margin_pct = 0
    if total_produk > 0:
        for p in products:
            if p['harga_jual'] > 0:
                total_margin_pct += ((p['harga_jual'] - p['harga_modal']) / p['harga_jual']) * 100
        avg_margin = total_margin_pct / total_produk
    else:
        avg_margin = 0

    # 5 Penjualan Terbaru
    cursor.execute("""
        SELECT s.*, p.nama_produk, p.sku
        FROM sales s
        JOIN products p ON s.product_id = p.id
        ORDER BY s.tanggal_penjualan DESC, s.id DESC
        LIMIT 5
    """)
    recent_sales = cursor.fetchall()

    # Event Mendatang
    cursor.execute("SELECT * FROM events ORDER BY tanggal_mulai ASC")
    events = cursor.fetchall()

    conn.close()

    return render_template(
        'dashboard.html',
        total_produk=total_produk,
        produk_kritis=produk_kritis,
        total_penjualan_bulan_ini=total_penjualan_bulan_ini,
        avg_margin=avg_margin,
        products=products,
        recent_sales=recent_sales,
        events=events
    )


# ====================================================================
# MODUL A: MANAJEMEN PRODUK & STOK
# ====================================================================

@app.route('/products')
@login_required
def products_list():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products ORDER BY id DESC")
    raw_products = cursor.fetchall()
    
    products = []
    for r in raw_products:
        p = dict(r)
        p['status'] = get_stock_status(p['stok_saat_ini'], p['batas_stok_min'])
        products.append(p)
    conn.close()
    return render_template('products.html', products=products)

@app.route('/products/create', methods=['POST'])
@role_required('pemilik')
def product_create():
    sku = request.form.get('sku', '').strip().upper()
    nama = request.form.get('nama_produk', '').strip()
    try:
        modal = float(request.form.get('harga_modal', 0))
        jual = float(request.form.get('harga_jual', 0))
        stok = int(request.form.get('stok_saat_ini', 0))
        batas_min = int(request.form.get('batas_stok_min', 0))
        h_min = float(request.form.get('harga_min', modal))
        h_max = float(request.form.get('harga_max', jual * 1.5))
        lead_time = int(request.form.get('lead_time_hari', 3))
    except ValueError:
        flash('Data numerik tidak valid. Pastikan harga dan stok berupa angka.', 'danger')
        return redirect(url_for('products_list'))

    catatan = request.form.get('catatan', '').strip()

    if not sku or not nama:
        flash('SKU dan Nama Produk wajib diisi.', 'danger')
        return redirect(url_for('products_list'))

    conn = get_db()
    cursor = conn.cursor()
    try:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO products (sku, nama_produk, harga_modal, harga_jual, stok_saat_ini, batas_stok_min, harga_min, harga_max, lead_time_hari, catatan, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (sku, nama, modal, jual, stok, batas_min, h_min, h_max, lead_time, catatan, now))
        prod_id = cursor.lastrowid

        # Catat log stok awal
        cursor.execute("""
            INSERT INTO stock_logs (product_id, jenis_perubahan, jumlah_perubahan, stok_sebelum, stok_sesudah, keterangan, user_id, created_at)
            VALUES (?, 'Stok Awal', ?, 0, ?, 'Inisialisasi Produk Baru', ?, ?)
        """, (prod_id, stok, stok, session.get('user_id'), now))
        conn.commit()
        flash(f'Produk {nama} ({sku}) berhasil ditambahkan!', 'success')
    except sqlite3.IntegrityError:
        flash(f'SKU "{sku}" sudah terdaftar! Gunakan SKU lain.', 'danger')
    finally:
        conn.close()

    return redirect(url_for('products_list'))

@app.route('/products/edit/<int:product_id>', methods=['POST'])
@role_required('pemilik')
def product_edit(product_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    prod = cursor.fetchone()
    if not prod:
        conn.close()
        flash('Produk tidak ditemukan.', 'danger')
        return redirect(url_for('products_list'))

    nama = request.form.get('nama_produk', '').strip()
    try:
        modal = float(request.form.get('harga_modal', prod['harga_modal']))
        jual = float(request.form.get('harga_jual', prod['harga_jual']))
        batas_min = int(request.form.get('batas_stok_min', prod['batas_stok_min']))
        h_min = float(request.form.get('harga_min', prod['harga_min']))
        h_max = float(request.form.get('harga_max', prod['harga_max']))
        lead_time = int(request.form.get('lead_time_hari', prod['lead_time_hari']))
    except ValueError:
        flash('Input numerik tidak valid.', 'danger')
        conn.close()
        return redirect(url_for('products_list'))

    catatan = request.form.get('catatan', '').strip()

    # Jika harga berubah, catat ke price_history
    if jual != prod['harga_jual']:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO price_history (product_id, harga_lama, harga_baru, alasan, user_id, created_at)
            VALUES (?, ?, ?, 'Diubah manual oleh pemilik toko', ?, ?)
        """, (product_id, prod['harga_jual'], jual, session.get('user_id'), now))

    cursor.execute("""
        UPDATE products
        SET nama_produk = ?, harga_modal = ?, harga_jual = ?, batas_stok_min = ?,
            harga_min = ?, harga_max = ?, lead_time_hari = ?, catatan = ?
        WHERE id = ?
    """, (nama, modal, jual, batas_min, h_min, h_max, lead_time, catatan, product_id))

    conn.commit()
    conn.close()
    flash(f'Produk {nama} berhasil diperbarui.', 'success')
    return redirect(url_for('products_list'))

@app.route('/products/delete/<int:product_id>', methods=['POST'])
@role_required('pemilik')
def product_delete(product_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM stock_logs WHERE product_id = ?", (product_id,))
    cursor.execute("DELETE FROM sales WHERE product_id = ?", (product_id,))
    cursor.execute("DELETE FROM price_history WHERE product_id = ?", (product_id,))
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    flash('Produk beserta riwayatnya berhasil dihapus.', 'info')
    return redirect(url_for('products_list'))

@app.route('/stock/adjust', methods=['GET', 'POST'])
@login_required
def stock_adjust():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        product_id = int(request.form.get('product_id', 0))
        jenis = request.form.get('jenis_perubahan', 'Masuk')  # 'Masuk' atau 'Stock Opname'
        jumlah = int(request.form.get('jumlah', 0))
        keterangan = request.form.get('keterangan', '').strip()

        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        prod = cursor.fetchone()

        if not prod:
            flash('Produk tidak ditemukan.', 'danger')
            conn.close()
            return redirect(url_for('stock_adjust'))

        stok_lama = prod['stok_saat_ini']
        if jenis == 'Masuk':
            stok_baru = stok_lama + jumlah
            perubahan_net = jumlah
        elif jenis == 'Stock Opname':
            stok_baru = jumlah
            perubahan_net = stok_baru - stok_lama
        else:  # Keluar manual / rusak
            stok_baru = max(0, stok_lama - jumlah)
            perubahan_net = -jumlah

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Update stok produk
        cursor.execute("UPDATE products SET stok_saat_ini = ? WHERE id = ?", (stok_baru, product_id))

        # Catat ke log stok
        cursor.execute("""
            INSERT INTO stock_logs (product_id, jenis_perubahan, jumlah_perubahan, stok_sebelum, stok_sesudah, keterangan, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (product_id, jenis, perubahan_net, stok_lama, stok_baru, keterangan, session.get('user_id'), now))

        conn.commit()
        flash(f'Stok {prod["nama_produk"]} berhasil disesuaikan dari {stok_lama} menjadi {stok_baru}.', 'success')
        conn.close()
        return redirect(url_for('stock_adjust'))

    cursor.execute("SELECT * FROM products ORDER BY nama_produk ASC")
    products = cursor.fetchall()

    # Ambil 25 log terakhir
    cursor.execute("""
        SELECT l.*, p.nama_produk, p.sku, u.nama_lengkap as nama_user
        FROM stock_logs l
        JOIN products p ON l.product_id = p.id
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.id DESC
        LIMIT 25
    """)
    logs = cursor.fetchall()
    conn.close()

    return render_template('stock_adjust.html', products=products, logs=logs)


# ====================================================================
# MODUL B: PENCATATAN & IMPOR DATA PENJUALAN
# ====================================================================

@app.route('/sales', methods=['GET', 'POST'])
@login_required
def sales_list():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        # Input penjualan manual
        product_id = int(request.form.get('product_id', 0))
        qty = int(request.form.get('jumlah_terjual', 0))
        tgl = request.form.get('tanggal_penjualan', datetime.now().strftime("%Y-%m-%d"))
        catatan = request.form.get('catatan', '').strip()

        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        prod = cursor.fetchone()

        if not prod:
            flash('Produk tidak valid.', 'danger')
            conn.close()
            return redirect(url_for('sales_list'))

        if qty <= 0:
            flash('Jumlah terjual harus lebih dari 0.', 'danger')
            conn.close()
            return redirect(url_for('sales_list'))

        if prod['stok_saat_ini'] < qty:
            flash(f'Stok tidak mencukupi! Stok saat ini: {prod["stok_saat_ini"]}, permintaan: {qty}.', 'danger')
            conn.close()
            return redirect(url_for('sales_list'))

        # Hitung harga
        harga_satuan = prod['harga_jual']
        total = qty * harga_satuan
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Simpan penjualan
        cursor.execute("""
            INSERT INTO sales (product_id, jumlah_terjual, harga_satuan, total_harga, tanggal_penjualan, catatan, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (product_id, qty, harga_satuan, total, tgl, catatan, now))

        # Kurangi stok otomatis & catat log
        stok_baru = prod['stok_saat_ini'] - qty
        cursor.execute("UPDATE products SET stok_saat_ini = ? WHERE id = ?", (stok_baru, product_id))
        cursor.execute("""
            INSERT INTO stock_logs (product_id, jenis_perubahan, jumlah_perubahan, stok_sebelum, stok_sesudah, keterangan, user_id, created_at)
            VALUES (?, 'Penjualan', ?, ?, ?, ?, ?, ?)
        """, (product_id, -qty, prod['stok_saat_ini'], stok_baru, f'Penjualan manual ({qty} pcs)', session.get('user_id'), now))

        conn.commit()
        flash(f'Penjualan {qty} pcs {prod["nama_produk"]} berhasil dicatat. Sisa stok: {stok_baru}.', 'success')
        conn.close()
        return redirect(url_for('sales_list'))

    # Filter parameter
    filter_product = request.args.get('product_id', '')
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')

    query = """
        SELECT s.*, p.nama_produk, p.sku
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE 1=1
    """
    params = []

    if filter_product:
        query += " AND s.product_id = ?"
        params.append(filter_product)
    if start_date:
        query += " AND s.tanggal_penjualan >= ?"
        params.append(start_date)
    if end_date:
        query += " AND s.tanggal_penjualan <= ?"
        params.append(end_date)

    query += " ORDER BY s.tanggal_penjualan DESC, s.id DESC"
    cursor.execute(query, params)
    sales = cursor.fetchall()

    cursor.execute("SELECT id, sku, nama_produk FROM products ORDER BY nama_produk ASC")
    products = cursor.fetchall()

    conn.close()
    return render_template('sales.html', sales=sales, products=products, filter_product=filter_product, start_date=start_date, end_date=end_date)

@app.route('/sales/import', methods=['POST'])
@login_required
def sales_import():
    file = request.files.get('file_sales')
    if not file or file.filename == '':
        flash('Silakan pilih berkas CSV atau Excel terlebih dahulu.', 'danger')
        return redirect(url_for('sales_list'))

    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ['.csv', '.xlsx']:
        flash(f'Format berkas "{ext}" tidak didukung. Harap unggah berkas .csv (UTF-8) atau .xlsx dengan ukuran maksimal 5 MB.', 'danger')
        return redirect(url_for('sales_list'))

    try:
        if ext == '.csv':
            df = pd.read_csv(file, encoding='utf-8')
        else:
            df = pd.read_excel(file)
    except Exception as e:
        flash(f'Gagal membaca berkas: {str(e)}. Pastikan format file valid.', 'danger')
        return redirect(url_for('sales_list'))

    # Validasi Header / Kolom
    required_cols = {'SKU', 'Jumlah', 'Tanggal'}
    current_cols = set(df.columns)
    if not required_cols.issubset(current_cols):
        missing = list(required_cols - current_cols)
        flash(f'Format kolom tidak sesuai! Kolom wajib yang hilang: {", ".join(missing)}. Kolom yang harus ada: SKU, Jumlah, Tanggal, [Catatan - opsional]. Silakan unduh template contoh.', 'danger')
        return redirect(url_for('sales_list'))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, sku, nama_produk, harga_jual, stok_saat_ini FROM products")
    products_db = {row['sku'].upper(): dict(row) for row in cursor.fetchall()}

    success_count = 0
    errors = []
    sales_to_insert = []
    stock_updates = {}

    for idx, row in df.iterrows():
        baris_ke = idx + 2  # baris 1 adalah header

        sku_val = str(row['SKU']).strip().upper()
        if not sku_val or pd.isna(row['SKU']):
            errors.append(f"Baris {baris_ke}, Kolom 'SKU': Kolom SKU tidak boleh kosong.")
            continue

        if sku_val not in products_db:
            errors.append(f"Baris {baris_ke}, Kolom 'SKU': SKU '{sku_val}' tidak ditemukan di database. Pastikan produk sudah terdaftar terlebih dahulu.")
            continue

        # Validasi Jumlah
        try:
            qty_val = int(row['Jumlah'])
            if qty_val <= 0:
                errors.append(f"Baris {baris_ke}, Kolom 'Jumlah': Nilai ({row['Jumlah']}) harus bilangan bulat positif > 0.")
                continue
        except (ValueError, TypeError):
            errors.append(f"Baris {baris_ke}, Kolom 'Jumlah': Nilai '{row['Jumlah']}' bukan angka integer yang valid.")
            continue

        # Validasi Tanggal (dd-mm-yyyy atau yyyy-mm-dd)
        tgl_raw = str(row['Tanggal']).strip()
        tgl_parsed = None
        for fmt in ('%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d'):
            try:
                tgl_parsed = datetime.strptime(tgl_raw, fmt).strftime('%Y-%m-%d')
                break
            except ValueError:
                pass

        if not tgl_parsed:
            errors.append(f"Baris {baris_ke}, Kolom 'Tanggal': Format tanggal '{tgl_raw}' tidak valid. Gunakan format dd-mm-yyyy (contoh: 25-10-2026).")
            continue

        catatan_val = str(row.get('Catatan', '')).strip() if 'Catatan' in df.columns and not pd.isna(row.get('Catatan')) else 'Impor File'

        prod_info = products_db[sku_val]
        current_allocated = stock_updates.get(sku_val, prod_info['stok_saat_ini'])
        if current_allocated < qty_val:
            errors.append(f"Baris {baris_ke}, Kolom 'Jumlah': Stok {sku_val} tidak mencukupi (sisa: {current_allocated}, diminta: {qty_val}).")
            continue

        stock_updates[sku_val] = current_allocated - qty_val

        sales_to_insert.append({
            'product_id': prod_info['id'],
            'sku': sku_val,
            'qty': qty_val,
            'harga': prod_info['harga_jual'],
            'total': qty_val * prod_info['harga_jual'],
            'tgl': tgl_parsed,
            'catatan': catatan_val,
            'stok_lama': current_allocated,
            'stok_baru': current_allocated - qty_val
        })

    if errors:
        # Tampilkan error baris demi baris jika ada kegagalan validasi
        pesan_error = f"Ditemukan {len(errors)} kesalahan pada berkas unggahan:<br>• " + "<br>• ".join(errors[:8])
        if len(errors) > 8:
            pesan_error += f"<br>...dan {len(errors)-8} kesalahan lainnya. Seluruh baris dibatalkan demi integritas data."
        flash(pesan_error, 'danger')
        conn.close()
        return redirect(url_for('sales_list'))

    # Jika semua baris valid, lakukan transaksi
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for item in sales_to_insert:
        cursor.execute("""
            INSERT INTO sales (product_id, jumlah_terjual, harga_satuan, total_harga, tanggal_penjualan, catatan, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (item['product_id'], item['qty'], item['harga'], item['total'], item['tgl'], item['catatan'], now))

        cursor.execute("UPDATE products SET stok_saat_ini = ? WHERE id = ?", (item['stok_baru'], item['product_id']))

        cursor.execute("""
            INSERT INTO stock_logs (product_id, jenis_perubahan, jumlah_perubahan, stok_sebelum, stok_sesudah, keterangan, user_id, created_at)
            VALUES (?, 'Penjualan (Impor)', ?, ?, ?, ?, ?, ?)
        """, (item['product_id'], -item['qty'], item['stok_lama'], item['stok_baru'], f"Impor {filename}", session.get('user_id'), now))

        success_count += 1

    conn.commit()
    conn.close()
    flash(f'Berhasil mengimpor {success_count} data transaksi penjualan massal tanpa error!', 'success')
    return redirect(url_for('sales_list'))


@app.route('/sales/template/<fmt>')
@login_required
def download_sales_template(fmt):
    """Menyediakan tombol unduh template CSV dan Excel contoh dengan instruksi."""
    data = [
        {"SKU": "SKU-001", "Jumlah": 5, "Tanggal": "10-11-2026", "Catatan": "Pesanan Shopee #1029"},
        {"SKU": "SKU-002", "Jumlah": 3, "Tanggal": "11-11-2026", "Catatan": "Pesanan Tokopedia #8812"},
        {"SKU": "SKU-005", "Jumlah": 10, "Tanggal": "12-11-2026", "Catatan": "Pesanan TikTok Shop #3021"},
    ]
    df = pd.DataFrame(data)

    if fmt == 'csv':
        output = io.StringIO()
        df.to_csv(output, index=False, encoding='utf-8')
        mem = io.BytesIO()
        mem.write(output.getvalue().encode('utf-8'))
        mem.seek(0)
        return send_file(mem, mimetype='text/csv', as_attachment=True, download_name='template_penjualan_restokin.csv')
    else:
        mem = io.BytesIO()
        with pd.ExcelWriter(mem, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Template Penjualan')
        mem.seek(0)
        return send_file(mem, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', as_attachment=True, download_name='template_penjualan_restokin.xlsx')


# ====================================================================
# MODUL C: PREDIKSI KEBUTUHAN RESTOCK (FORECASTING)
# ====================================================================

def compute_forecasts(product_id, periode_tipe='Bulanan'):
    """
    Menghitung Moving Average dan Exponential Smoothing,
    serta metrik akurasi MAD (Mean Absolute Deviation) dan MAPE.
    Syarat: minimal 3 periode data penjualan.
    """
    conn = get_db()
    cursor = conn.cursor()

    # Tentukan grup periode
    if periode_tipe == 'Mingguan':
        date_format = '%Y-W%W'
    else:
        date_format = '%Y-%m'

    cursor.execute(f"""
        SELECT strftime('{date_format}', tanggal_penjualan) as periode,
               SUM(jumlah_terjual) as total_qty
        FROM sales
        WHERE product_id = ?
        GROUP BY periode
        ORDER BY periode ASC
    """, (product_id,))
    periods = cursor.fetchall()
    conn.close()

    if len(periods) < 3:
        return {
            'cukup_data': False,
            'pesan': f'Produk ini baru memiliki {len(periods)} periode penjualan. Diperlukan minimal 3 periode data historis untuk menghasilkan peramalan yang akurat.',
            'jumlah_periode': len(periods)
        }

    actuals = [row['total_qty'] for row in periods]
    period_labels = [row['periode'] for row in periods]
    n = len(actuals)

    # 1. Moving Average (N=3)
    k = 3
    ma_forecasts = [None] * k
    for i in range(k, n):
        ma_val = sum(actuals[i-k:i]) / k
        ma_forecasts.append(round(ma_val, 2))
    
    # Nilai prediksi MA periode berikutnya
    next_ma = round(sum(actuals[-k:]) / k, 2)

    # 2. Exponential Smoothing (alpha = 0.3)
    alpha = 0.3
    es_forecasts = [actuals[0]]
    for i in range(1, n):
        es_val = alpha * actuals[i-1] + (1 - alpha) * es_forecasts[i-1]
        es_forecasts.append(round(es_val, 2))
    
    # Nilai prediksi ES periode berikutnya
    next_es = round(alpha * actuals[-1] + (1 - alpha) * es_forecasts[-1], 2)

    # Evaluasi Akurasi (MAD & MAPE)
    # Untuk MA (hanya dari indeks k sampai n-1)
    ma_errors = []
    ma_pct_errors = []
    for i in range(k, n):
        err = abs(actuals[i] - ma_forecasts[i])
        ma_errors.append(err)
        if actuals[i] > 0:
            ma_pct_errors.append((err / actuals[i]) * 100)

    ma_mad = round(sum(ma_errors) / len(ma_errors), 2) if ma_errors else 0
    ma_mape = round(sum(ma_pct_errors) / len(ma_pct_errors), 2) if ma_pct_errors else 0

    # Untuk ES (dari indeks 1 sampai n-1)
    es_errors = []
    es_pct_errors = []
    for i in range(1, n):
        err = abs(actuals[i] - es_forecasts[i])
        es_errors.append(err)
        if actuals[i] > 0:
            es_pct_errors.append((err / actuals[i]) * 100)

    es_mad = round(sum(es_errors) / len(es_errors), 2) if es_errors else 0
    es_mape = round(sum(es_pct_errors) / len(es_pct_errors), 2) if es_pct_errors else 0

    # Standar Deviasi Permintaan Historis untuk Safety Stock
    mean_demand = sum(actuals) / n
    variance = sum((x - mean_demand) ** 2 for x in actuals) / max(1, (n - 1))
    std_dev = math.sqrt(variance)

    return {
        'cukup_data': True,
        'period_labels': period_labels,
        'actuals': actuals,
        'ma_forecasts': ma_forecasts,
        'es_forecasts': es_forecasts,
        'next_ma': next_ma,
        'next_es': next_es,
        'ma_mad': ma_mad,
        'ma_mape': ma_mape,
        'es_mad': es_mad,
        'es_mape': es_mape,
        'std_dev': round(std_dev, 2),
        'mean_demand': round(mean_demand, 2)
    }

@app.route('/restock', methods=['GET', 'POST'])
@login_required
def restock_forecasting():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products ORDER BY nama_produk ASC")
    products = cursor.fetchall()

    cursor.execute("SELECT * FROM events ORDER BY tanggal_mulai ASC")
    events = cursor.fetchall()

    selected_product_id = request.args.get('product_id', products[0]['id'] if products else None)
    if selected_product_id:
        selected_product_id = int(selected_product_id)

    periode_tipe = request.args.get('periode', 'Bulanan')
    metode_pilihan = request.args.get('metode', 'Moving Average')
    event_id = request.args.get('event_id', '')

    selected_product = None
    if selected_product_id:
        cursor.execute("SELECT * FROM products WHERE id = ?", (selected_product_id,))
        selected_product = cursor.fetchone()

    forecast_data = None
    event_multiplier = 1.0
    active_event_name = 'Normal (Tanpa Event)'

    if event_id:
        cursor.execute("SELECT * FROM events WHERE id = ?", (int(event_id),))
        ev = cursor.fetchone()
        if ev:
            event_multiplier = ev['faktor_pengali']
            active_event_name = f"{ev['nama_event']} ({event_multiplier}x)"

    rop = 0
    rekomendasi_restock = 0
    safety_stock = 0

    if selected_product:
        forecast_data = compute_forecasts(selected_product['id'], periode_tipe)
        if forecast_data.get('cukup_data'):
            # Pilih metode dasar
            base_pred = forecast_data['next_ma'] if metode_pilihan == 'Moving Average' else forecast_data['next_es']
            # Kalikan faktor event
            demand_prediksi_event = round(base_pred * event_multiplier, 2)
            forecast_data['demand_prediksi_final'] = demand_prediksi_event

            # Hitung Reorder Point (ROP):
            # Lead time dalam hari. Jika periode bulanan, konversi permintaan harian = demand_prediksi / 30
            # Safety Stock = 1.65 (service level 95%) * std_dev * sqrt(lead_time_hari / 30)
            lead_time = selected_product['lead_time_hari']
            daily_demand = demand_prediksi_event / (7 if periode_tipe == 'Mingguan' else 30)
            lead_time_demand = daily_demand * lead_time
            
            # Safety stock
            safety_factor = 1.65
            safety_stock = round(safety_factor * (forecast_data['std_dev'] / math.sqrt(7 if periode_tipe == 'Mingguan' else 30)) * math.sqrt(lead_time))
            safety_stock = max(safety_stock, selected_product['batas_stok_min'])

            rop = round(lead_time_demand + safety_stock)
            
            # Rekomendasi Restock Qty = max(0, Prediksi Demand + Safety Stock - Stok Saat Ini)
            stok_ada = selected_product['stok_saat_ini']
            rekomendasi_restock = max(0, round((demand_prediksi_event + safety_stock) - stok_ada))

            forecast_data['rop'] = rop
            forecast_data['safety_stock'] = safety_stock
            forecast_data['rekomendasi_restock'] = rekomendasi_restock
            forecast_data['daily_demand'] = round(daily_demand, 2)

    conn.close()

    return render_template(
        'restock.html',
        products=products,
        events=events,
        selected_product=selected_product,
        forecast_data=forecast_data,
        periode_tipe=periode_tipe,
        metode_pilihan=metode_pilihan,
        event_id=event_id,
        event_multiplier=event_multiplier,
        active_event_name=active_event_name
    )

@app.route('/restock/execute', methods=['POST'])
@login_required
def restock_execute():
    """Tombol 'Tandai Sudah Dijalankan': menambahkan stok masuk sesuai rekomendasi restock."""
    product_id = int(request.form.get('product_id'))
    jumlah = int(request.form.get('jumlah_restock', 0))
    metode = request.form.get('metode_peramalan', 'Moving Average')
    event_applied = request.form.get('event_applied', 'Normal')

    if jumlah <= 0:
        flash('Jumlah restock harus lebih dari 0.', 'warning')
        return redirect(url_for('restock_forecasting', product_id=product_id))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    prod = cursor.fetchone()

    if not prod:
        conn.close()
        flash('Produk tidak ditemukan.', 'danger')
        return redirect(url_for('restock_forecasting'))

    stok_sebelum = prod['stok_saat_ini']
    stok_sesudah = stok_sebelum + jumlah
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Update stok
    cursor.execute("UPDATE products SET stok_saat_ini = ? WHERE id = ?", (stok_sesudah, product_id))

    # Catat ke restock executions
    cursor.execute("""
        INSERT INTO restock_executions (product_id, jumlah_restock, metode_peramalan, event_applied, catatan, user_id, created_at)
        VALUES (?, ?, ?, ?, 'Restock otomatis dari sistem peramalan', ?, ?)
    """, (product_id, jumlah, metode, event_applied, session.get('user_id'), now))

    # Catat log stok
    cursor.execute("""
        INSERT INTO stock_logs (product_id, jenis_perubahan, jumlah_perubahan, stok_sebelum, stok_sesudah, keterangan, user_id, created_at)
        VALUES (?, 'Restock Masuk', ?, ?, ?, ?, ?, ?)
    """, (product_id, jumlah, stok_sebelum, stok_sesudah, f'Eksekusi Restock ({metode}, Event: {event_applied})', session.get('user_id'), now))

    conn.commit()
    conn.close()

    flash(f'Restock {prod["nama_produk"]} sebanyak {jumlah} unit berhasil dijalankan! Stok bertambah dari {stok_sebelum} menjadi {stok_sesudah}.', 'success')
    return redirect(url_for('restock_forecasting', product_id=product_id))


# ====================================================================
# MODUL D: REKOMENDASI PENYESUAIAN HARGA (DYNAMIC PRICING)
# ====================================================================

def compute_dynamic_pricing_for_all():
    """
    Menghitung rekomendasi penyesuaian harga berdasarkan:
    1. Sales Velocity (unit terjual / hari dalam 30 hari terakhir)
    2. Rasio Stok terhadap Batas Minimum
    - Jika stok menipis (<= batas_min) & penjualan cepat -> sarankan kenaikan harga (+5% s.d +15%)
    - Jika stok menumpuk (> 2x batas_min) & penjualan lambat -> sarankan penurunan harga (-5% s.d -12%)
    - Hasil dibatasi secara ketat oleh harga_min dan harga_max
    """
    conn = get_db()
    cursor = conn.cursor()

    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

    cursor.execute("""
        SELECT p.*,
               COALESCE((
                   SELECT SUM(jumlah_terjual)
                   FROM sales
                   WHERE product_id = p.id AND tanggal_penjualan >= ?
               ), 0) as total_sold_30d
        FROM products p
        ORDER BY p.nama_produk ASC
    """, (thirty_days_ago,))
    products = [dict(row) for row in cursor.fetchall()]

    # Cek keputusan tolak periode ini
    current_month = datetime.now().strftime("%Y-%m")
    cursor.execute("""
        SELECT product_id FROM pricing_decisions
        WHERE periode = ? AND status = 'ditolak'
    """, (current_month,))
    rejected_ids = {row['product_id'] for row in cursor.fetchall()}

    recommendations = []

    for p in products:
        p_id = p['id']
        is_dismissed = p_id in rejected_ids

        sold_30d = p['total_sold_30d']
        velocity_per_day = sold_30d / 30.0  # unit per hari
        stok = p['stok_saat_ini']
        min_stok = p['batas_stok_min']
        harga_saat_ini = p['harga_jual']
        modal = p['harga_modal']
        h_min = p['harga_min']
        h_max = p['harga_max']

        # Status inventory
        if velocity_per_day > 0:
            runway_days = round(stok / velocity_per_day, 1)
        else:
            runway_days = 999  # tidak ada penjualan

        action = 'Pertahankan'
        adjustment_pct = 0.0
        alasan = 'Keseimbangan stok dan laju penjualan normal.'

        # Logika Dynamic Pricing
        if (stok <= min_stok or runway_days < 10) and velocity_per_day >= 0.8:
            action = 'Naikkan Harga'
            adjustment_pct = 10.0  # Rekomendasi naik 10%
            alasan = f'Stok menipis ({stok} pcs) sementara perputaran penjualan sangat cepat ({velocity_per_day:.1f} pcs/hari). Menaikkan harga dapat menjaga margin optimal dan mencegah out-of-stock terlalu cepat.'
        elif (stok > min_stok * 2.5 or runway_days > 45) and velocity_per_day <= 0.4:
            action = 'Turunkan Harga'
            adjustment_pct = -10.0  # Rekomendasi diskon 10%
            alasan = f'Stok menumpuk ({stok} pcs) dan perputaran lambat ({velocity_per_day:.1f} pcs/hari). Diskon strategis direkomendasikan untuk mempercepat likuiditas barang.'

        # Hitung harga baru yang dibatasi
        harga_kalkulasi = harga_saat_ini * (1 + (adjustment_pct / 100.0))
        # Pembulatan ke kelipatan seribu terdekat agar rapi
        harga_kalkulasi = round(harga_kalkulasi / 1000.0) * 1000

        # Boundary clamping (Harga Minimum & Maksimum)
        harga_saran = max(h_min, min(h_max, harga_kalkulasi))

        # Margin sebelum dan sesudah
        margin_sebelum = round(((harga_saat_ini - modal) / harga_saat_ini) * 100, 1) if harga_saat_ini > 0 else 0
        margin_sesudah = round(((harga_saran - modal) / harga_saran) * 100, 1) if harga_saran > 0 else 0

        recommendations.append({
            'product_id': p_id,
            'sku': p['sku'],
            'nama_produk': p['nama_produk'],
            'stok_saat_ini': stok,
            'batas_stok_min': min_stok,
            'sold_30d': sold_30d,
            'velocity_per_day': round(velocity_per_day, 2),
            'runway_days': runway_days,
            'harga_modal': modal,
            'harga_saat_ini': harga_saat_ini,
            'harga_min': h_min,
            'harga_max': h_max,
            'action': action,
            'adjustment_pct': adjustment_pct,
            'harga_saran': harga_saran,
            'selisih': harga_saran - harga_saat_ini,
            'margin_sebelum': margin_sebelum,
            'margin_sesudah': margin_sesudah,
            'alasan': alasan,
            'is_dismissed': is_dismissed
        })

    conn.close()
    return recommendations

@app.route('/pricing')
@login_required
def pricing_recommendations():
    recs = compute_dynamic_pricing_for_all()
    # Riwayat perubahan harga terbaru
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT h.*, p.nama_produk, p.sku, u.nama_lengkap as nama_user
        FROM price_history h
        JOIN products p ON h.product_id = p.id
        LEFT JOIN users u ON h.user_id = u.id
        ORDER BY h.id DESC
        LIMIT 15
    """)
    history = cursor.fetchall()
    conn.close()
    return render_template('pricing.html', recommendations=recs, history=history)

@app.route('/pricing/action', methods=['POST'])
@role_required('pemilik')
def pricing_action():
    product_id = int(request.form.get('product_id'))
    action_type = request.form.get('action_type')  # 'terima' atau 'tolak'
    harga_baru = float(request.form.get('harga_baru', 0))
    alasan = request.form.get('alasan', 'Persetujuan Dynamic Pricing')

    current_month = datetime.now().strftime("%Y-%m")
    conn = get_db()
    cursor = conn.cursor()

    if action_type == 'terima':
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        prod = cursor.fetchone()
        if prod:
            harga_lama = prod['harga_jual']
            # Update harga jual produk
            cursor.execute("UPDATE products SET harga_jual = ? WHERE id = ?", (harga_baru, product_id))
            # Catat riwayat perubahan harga
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("""
                INSERT INTO price_history (product_id, harga_lama, harga_baru, alasan, user_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (product_id, harga_lama, harga_baru, alasan, session.get('user_id'), now))
            
            # Reset jika sebelumnya ditolak
            cursor.execute("DELETE FROM pricing_decisions WHERE product_id = ? AND periode = ?", (product_id, current_month))
            conn.commit()
            flash(f'Harga jual untuk {prod["nama_produk"]} berhasil diperbarui dari Rp {harga_lama:,.0f} menjadi Rp {harga_baru:,.0f}!', 'success')
    elif action_type == 'tolak':
        # Catat penolakan sehingga disembunyikan untuk periode ini
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT OR REPLACE INTO pricing_decisions (product_id, periode, status, created_at)
            VALUES (?, ?, 'ditolak', ?)
        """, (product_id, current_month, now))
        conn.commit()
        flash('Rekomendasi harga berhasil ditolak dan disembunyikan untuk periode ini.', 'info')

    conn.close()
    return redirect(url_for('pricing_recommendations'))


# ====================================================================
# MODUL MANAJEMEN EVENT KHUSUS
# ====================================================================

@app.route('/events', methods=['GET', 'POST'])
@role_required('pemilik')
def events_management():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        nama = request.form.get('nama_event', '').strip()
        pengali = float(request.form.get('faktor_pengali', 1.0))
        mulai = request.form.get('tanggal_mulai')
        selesai = request.form.get('tanggal_selesai')
        deskripsi = request.form.get('deskripsi', '').strip()

        if not nama or not mulai or not selesai:
            flash('Nama Event dan Rentang Tanggal wajib diisi.', 'danger')
        else:
            cursor.execute("""
                INSERT INTO events (nama_event, faktor_pengali, tanggal_mulai, tanggal_selesai, deskripsi)
                VALUES (?, ?, ?, ?, ?)
            """, (nama, pengali, mulai, selesai, deskripsi))
            conn.commit()
            flash(f'Event {nama} berhasil ditambahkan!', 'success')
            return redirect(url_for('events_management'))

    cursor.execute("SELECT * FROM events ORDER BY tanggal_mulai ASC")
    events = cursor.fetchall()
    conn.close()
    return render_template('events.html', events=events)

@app.route('/events/delete/<int:event_id>', methods=['POST'])
@role_required('pemilik')
def event_delete(event_id):
    conn = get_db()
    conn.execute("DELETE FROM events WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()
    flash('Event berhasil dihapus.', 'info')
    return redirect(url_for('events_management'))


# ====================================================================
# MODUL F: MANAJEMEN PENGGUNA (AKUN)
# ====================================================================

@app.route('/users', methods=['GET', 'POST'])
@role_required('pemilik')
def users_list():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        username = request.form.get('username', '').strip().lower()
        nama_lengkap = request.form.get('nama_lengkap', '').strip()
        password = request.form.get('password', '')
        role = request.form.get('role', 'staf')

        if not username or not password or not nama_lengkap:
            flash('Semua kolom pengguna wajib diisi.', 'danger')
        else:
            try:
                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                pwd_hash = generate_password_hash(password)
                cursor.execute("""
                    INSERT INTO users (username, nama_lengkap, password_hash, role, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (username, nama_lengkap, pwd_hash, role, now))
                conn.commit()
                flash(f'Pengguna "{username}" dengan peran "{role}" berhasil dibuat!', 'success')
                return redirect(url_for('users_list'))
            except sqlite3.IntegrityError:
                flash(f'Username "{username}" sudah ada. Gunakan username lain.', 'danger')

    cursor.execute("SELECT id, username, nama_lengkap, role, created_at FROM users ORDER BY id ASC")
    users = cursor.fetchall()
    conn.close()
    return render_template('users.html', users=users)

@app.route('/users/update-role/<int:user_id>', methods=['POST'])
@role_required('pemilik')
def user_update_role(user_id):
    new_role = request.form.get('role', 'staf')
    if user_id == session.get('user_id'):
        flash('Anda tidak dapat mengubah peran akun Anda sendiri saat sedang masuk.', 'warning')
        return redirect(url_for('users_list'))

    conn = get_db()
    conn.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
    conn.commit()
    conn.close()
    flash('Peran pengguna berhasil diperbarui.', 'success')
    return redirect(url_for('users_list'))


# ====================================================================
# MODUL E: EKSPOR LAPORAN (PDF & EXCEL .XLSX)
# ====================================================================

@app.route('/export/excel')
@role_required('pemilik')
def export_excel():
    """Ekspor laporan lengkap rekomendasi restock dan dynamic pricing ke berkas .xlsx"""
    wb = Workbook()
    
    # Header Styling
    header_font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
    thin_border = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='thin', color='D1D5DB')
    )

    # 1. Sheet Ringkasan Restock
    ws1 = wb.active
    ws1.title = "Rekomendasi Restock"

    headers1 = ["SKU", "Nama Produk", "Stok Saat Ini", "Batas Min", "Status", "Lead Time (Hari)", "Prediksi Demand", "Reorder Point", "Rekomendasi Restock"]
    ws1.append(headers1)

    for col_num, h in enumerate(headers1, 1):
        cell = ws1.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', vertical='center')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products ORDER BY nama_produk ASC")
    products = cursor.fetchall()

    row_idx = 2
    for p in products:
        status = get_stock_status(p['stok_saat_ini'], p['batas_stok_min'])
        fc = compute_forecasts(p['id'], 'Bulanan')
        if fc.get('cukup_data'):
            pred = fc['next_ma']
            daily = pred / 30.0
            safety = max(p['batas_stok_min'], round(1.65 * (fc['std_dev'] / math.sqrt(30)) * math.sqrt(p['lead_time_hari'])))
            rop = round((daily * p['lead_time_hari']) + safety)
            rec = max(0, round((pred + safety) - p['stok_saat_ini']))
        else:
            pred = "Data < 3 bln"
            rop = p['batas_stok_min']
            rec = max(0, p['batas_stok_min'] - p['stok_saat_ini'])

        ws1.append([
            p['sku'], p['nama_produk'], p['stok_saat_ini'], p['batas_stok_min'],
            status, p['lead_time_hari'], pred, rop, rec
        ])
        for c in range(1, len(headers1) + 1):
            ws1.cell(row=row_idx, column=c).border = thin_border
        row_idx += 1

    # 2. Sheet Dynamic Pricing
    ws2 = wb.create_sheet(title="Dynamic Pricing")
    headers2 = ["SKU", "Nama Produk", "Stok", "Harga Modal", "Harga Saat Ini", "Harga Minimum", "Harga Maksimum", "Saran Aksi", "Harga Rekomendasi", "Margin Lama (%)", "Margin Baru (%)"]
    ws2.append(headers2)

    for col_num, h in enumerate(headers2, 1):
        cell = ws2.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', vertical='center')

    recs = compute_dynamic_pricing_for_all()
    row_idx = 2
    for r in recs:
        ws2.append([
            r['sku'], r['nama_produk'], r['stok_saat_ini'], r['harga_modal'],
            r['harga_saat_ini'], r['harga_min'], r['harga_max'],
            r['action'], r['harga_saran'], f"{r['margin_sebelum']}%", f"{r['margin_sesudah']}%"
        ])
        for c in range(1, len(headers2) + 1):
            ws2.cell(row=row_idx, column=c).border = thin_border
        row_idx += 1

    # Auto-adjust column width
    for ws in [ws1, ws2]:
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = col[0].column_letter
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    conn.close()

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    filename = f"Laporan_Restokin_{datetime.now().strftime('%d%m%Y_%H%M')}.xlsx"
    return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', as_attachment=True, download_name=filename)


@app.route('/export/pdf')
@role_required('pemilik')
def export_pdf():
    """Ekspor laporan resmi ringkasan Restock & Dynamic Pricing ke PDF dengan ReportLab."""
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    story = []

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=14
    )
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=12,
        spaceAfter=6
    )

    now_str = datetime.now().strftime("%d-%m-%Y %H:%M WIB")
    story.append(Paragraph("RESTOKIN - LAPORAN ANALISIS INVENTARIS & HARGA", title_style))
    story.append(Paragraph(f"Digenerate secara otomatis pada: {now_str} | Otorisasi: Pemilik Toko ({session.get('nama_lengkap', 'Admin')})", subtitle_style))
    story.append(Spacer(1, 8))

    # Tabel 1: Rekomendasi Restock
    story.append(Paragraph("1. Ringkasan Rekomendasi Restock (Forecasting)", section_style))
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products ORDER BY nama_produk ASC")
    products = cursor.fetchall()

    table1_data = [["SKU", "Nama Produk", "Stok", "Min", "Status", "ROP", "Saran Restock"]]
    for p in products:
        status = get_stock_status(p['stok_saat_ini'], p['batas_stok_min'])
        fc = compute_forecasts(p['id'], 'Bulanan')
        if fc.get('cukup_data'):
            pred = fc['next_ma']
            safety = max(p['batas_stok_min'], round(1.65 * (fc['std_dev'] / math.sqrt(30)) * math.sqrt(p['lead_time_hari'])))
            rop = round(((pred / 30.0) * p['lead_time_hari']) + safety)
            rec = max(0, round((pred + safety) - p['stok_saat_ini']))
        else:
            rop = p['batas_stok_min']
            rec = max(0, p['batas_stok_min'] - p['stok_saat_ini'])

        table1_data.append([
            p['sku'],
            p['nama_produk'][:26],
            str(p['stok_saat_ini']),
            str(p['batas_stok_min']),
            status,
            str(rop),
            f"+{rec} pcs" if rec > 0 else "0"
        ])

    t1 = Table(table1_data, colWidths=[65, 175, 45, 40, 60, 45, 80])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(t1)
    story.append(Spacer(1, 14))

    # Tabel 2: Rekomendasi Dynamic Pricing
    story.append(Paragraph("2. Ringkasan Dynamic Pricing (Penyesuaian Harga)", section_style))
    recs = compute_dynamic_pricing_for_all()

    table2_data = [["SKU", "Nama Produk", "Harga Lama", "Harga Rekomendasi", "Saran Aksi", "Margin Baru"]]
    for r in recs:
        table2_data.append([
            r['sku'],
            r['nama_produk'][:26],
            f"Rp {r['harga_saat_ini']:,.0f}".replace(",", "."),
            f"Rp {r['harga_saran']:,.0f}".replace(",", "."),
            r['action'],
            f"{r['margin_sesudah']}%"
        ])

    t2 = Table(table2_data, colWidths=[65, 175, 85, 85, 85, 55])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(t2)
    conn.close()

    doc.build(story)
    output.seek(0)
    filename = f"Laporan_Restokin_{datetime.now().strftime('%d%m%Y_%H%M')}.pdf"
    return send_file(output, mimetype='application/pdf', as_attachment=True, download_name=filename)


# ====================================================================
# API JSON UNTUK GRAFIK CHART.JS PADA DASHBOARD
# ====================================================================

@app.route('/api/chart/sales-forecast/<int:product_id>')
@login_required
def api_chart_sales_forecast(product_id):
    fc = compute_forecasts(product_id, 'Bulanan')
    if not fc.get('cukup_data'):
        return jsonify({'success': False, 'message': 'Data penjualan belum mencapai 3 periode.'})

    labels = list(fc['period_labels'])
    labels.append("Periode Berikutnya (Prediksi)")

    actual_series = list(fc['actuals']) + [None]
    ma_series = list(fc['ma_forecasts']) + [fc['next_ma']]
    es_series = list(fc['es_forecasts']) + [fc['next_es']]

    return jsonify({
        'success': True,
        'labels': labels,
        'actual': actual_series,
        'ma': ma_series,
        'es': es_series,
        'ma_mad': fc['ma_mad'],
        'ma_mape': fc['ma_mape'],
        'es_mad': fc['es_mad'],
        'es_mape': fc['es_mape']
    })


# ====================================================================
# RUN SERVER LOKAL
# ====================================================================

if __name__ == '__main__':
    print("=================================================================")
    print("  RESTOKIN - Sistem Prediksi Restock dan Dynamic Pricing Online Shop")
    print("  Server berjalan di: http://127.0.0.1:5000")
    print("  Akun Default:")
    print("    • Pemilik Toko : pemilik / admin123")
    print("    • Staf Toko    : staf / staf123")
    print("=================================================================")
    app.run(host='0.0.0.0', port=5000, debug=True)
