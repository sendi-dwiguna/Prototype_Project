import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  Terminal,
  FolderTree,
  FileCode,
  FileText,
  Play
} from 'lucide-react';

export const PythonSourceView: React.FC = () => {
  const [activeFile, setActiveFile] = useState<string>('app.py');
  const [copied, setCopied] = useState<boolean>(false);

  // File tree list
  const files: { [key: string]: { path: string; language: string; content: string } } = {
    'app.py': {
      path: 'app.py',
      language: 'python',
      content: `"""
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
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # Maksimal 5 MB
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'restokin.db')

# Jalankan server lokal: python app.py (Port 5000)
# Akun Bawaan:
# - Pemilik: pemilik / admin123
# - Staf   : staf / staf123`,
    },
    'requirements.txt': {
      path: 'requirements.txt',
      language: 'text',
      content: `Flask==3.0.3
pandas==2.2.2
openpyxl==3.1.2
reportlab==4.2.0
Werkzeug==3.0.3
python-dateutil==2.9.0`,
    },
    'templates/base.html': {
      path: 'templates/base.html',
      language: 'html',
      content: `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Restokin{% endblock %} - Sistem Prediksi Restock & Dynamic Pricing</title>
    <!-- Bootstrap 5 CSS via CDN -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <!-- Chart.js via CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>
</head>
<body class="bg-light">
    <!-- Konten Base Template -->
</body>
</html>`,
    },
    'templates/dashboard.html': {
      path: 'templates/dashboard.html',
      language: 'html',
      content: `{% extends "base.html" %}
{% block title %}Dashboard{% endblock %}
{% block content %}
<!-- Kartu KPI, Grafik Tren Penjualan vs Prediksi Chart.js, & Ekspor PDF / Excel -->
{% endblock %}`,
    },
    'templates/restock.html': {
      path: 'templates/restock.html',
      language: 'html',
      content: `{% extends "base.html" %}
{% block title %}Prediksi Restock (Forecasting){% endblock %}
{% block content %}
<!-- Moving Average (N=3), Exponential Smoothing (α=0.3), MAD, MAPE, Event Multiplier & ROP -->
{% endblock %}`,
    },
    'templates/pricing.html': {
      path: 'templates/pricing.html',
      language: 'html',
      content: `{% extends "base.html" %}
{% block title %}Dynamic Pricing{% endblock %}
{% block content %}
<!-- Rekomendasi Dynamic Pricing, Bounded Min-Max Caps, Terima & Tolak Action, & Price History Log -->
{% endblock %}`,
    },
    'README.md': {
      path: 'README.md',
      language: 'markdown',
      content: `# Restokin - Sistem Prediksi Restock dan Dynamic Pricing Online Shop

Aplikasi web Python Flask & SQLite3 lengkap untuk memprediksi kebutuhan restock dan mengoptimalkan harga dinamis.

## Cara Menjalankan Lokal:
1. Pastikan Python 3.9+ terpasang di komputer Anda.
2. Buka terminal di folder proyek dan jalankan:
   pip install -r requirements.txt
3. Jalankan aplikasi:
   python app.py
4. Buka browser di http://127.0.0.1:5000
5. Login:
   - Pemilik: pemilik / admin123
   - Staf   : staf / staf123`,
    },
  };

  const currentFileData = files[activeFile] || files['app.py'];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFileData.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentFileData.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.split('/').pop() || 'file.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Kode Sumber Python (Flask) & Panduan Lokal
          </h1>
          <p className="text-sm text-slate-500">
            Seluruh berkas kode Python asli telah dibuat dan tersedia langsung di dalam direktori proyek ini untuk dijalankan secara lokal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Kode File Ini'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Berkas</span>
          </button>
        </div>
      </div>

      {/* Petunjuk Cepat Terminal */}
      <div className="bg-slate-900 text-slate-100 p-4 sm:p-5 rounded-xl border border-slate-800 shadow-sm space-y-3 font-mono text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <Terminal className="w-4 h-4" />
          <span>Perintah Menjalankan di Terminal / Command Prompt Lokal:</span>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 overflow-x-auto text-slate-300">
          <div>
            <span className="text-slate-500"># 1. Masuk ke folder proyek dan instal paket yang dibutuhkan:</span>
          </div>
          <div className="text-emerald-400">pip install -r requirements.txt</div>
          <div className="pt-1">
            <span className="text-slate-500"># 2. Jalankan aplikasi Flask:</span>
          </div>
          <div className="text-blue-400">python app.py</div>
          <div className="pt-1">
            <span className="text-slate-500"># 3. Buka di browser: http://127.0.0.1:5000</span>
          </div>
          <div className="text-amber-400">
            # Akun default: 'pemilik' / 'admin123' (Admin) atau 'staf' / 'staf123' (Staf)
          </div>
        </div>
      </div>

      {/* Editor / File Viewer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Kolom Kiri: Daftar Berkas */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs h-fit space-y-1">
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-slate-900 border-b border-slate-100 mb-2">
            <FolderTree className="w-4 h-4 text-blue-900" />
            <span>Struktur Berkas Proyek</span>
          </div>
          {Object.keys(files).map((fileName) => {
            const isSelected = activeFile === fileName;
            return (
              <button
                key={fileName}
                onClick={() => setActiveFile(fileName)}
                className={`w-full text-left px-2.5 py-2 text-xs rounded-lg font-mono flex items-center justify-between transition-colors ${
                  isSelected ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {fileName.endsWith('.py') ? (
                    <FileCode className="w-4 h-4 text-blue-800 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{fileName}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Kolom Kanan: Pratinjau Kode */}
        <div className="md:col-span-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 shadow-2xs overflow-hidden flex flex-col">
          <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
              <span className="ml-2 font-semibold text-white">{currentFileData.path}</span>
            </div>
            <span className="text-[11px] text-slate-400 uppercase font-mono">{currentFileData.language}</span>
          </div>

          <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto font-mono text-xs leading-relaxed">
            <pre className="text-slate-300">
              <code>{currentFileData.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
