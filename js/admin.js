// ===== GENERADOR DE QR =====
const generateQR = (tableNumber, color = '#2c3e50', bgColor = '#ffffff', size = 300) => {
    const baseUrl = window.location.origin;
    // Añadir parámetro de mesa y modo cliente
    const url = `${baseUrl}?table=${tableNumber}&mode=client`;
    
    // Usar API de QR con colores personalizados
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?
        size=${size}x${size}&
        data=${encodeURIComponent(url)}&
        color=${color.replace('#', '')}&
        bgcolor=${bgColor.replace('#', '')}&
        format=png&
        margin=20`;
    
    return { url, qrApiUrl };
}

// Elementos del generador QR
const qrTableNumber = document.getElementById('qrTableNumber');
const qrColor = document.getElementById('qrColor');
const qrBgColor = document.getElementById('qrBgColor');
const qrSize = document.getElementById('qrSize');
const qrImage = document.getElementById('qrImage');
const qrPlaceholder = document.getElementById('qrPlaceholder');
const qrInfo = document.getElementById('qrInfo');
const qrInfoTable = document.getElementById('qrInfoTable');
const qrInfoUrl = document.getElementById('qrInfoUrl');
const qrPreviewContainer = document.getElementById('qrPreviewContainer');

// Generar QR individual
document.getElementById('generateSingleQRBtn')?.addEventListener('click', () => {
    const table = parseInt(qrTableNumber.value);
    if (!table || table < 1) {
        showNotification('⚠️ Ingresa un número de mesa válido', 'warning');
        return;
    }
    
    const color = qrColor.value;
    const bgColor = qrBgColor.value;
    const size = parseInt(qrSize.value);
    
    const { url, qrApiUrl } = generateQR(table, color, bgColor, size);
    
    // Mostrar QR
    qrImage.src = qrApiUrl;
    qrImage.style.display = 'block';
    qrPlaceholder.style.display = 'none';
    qrInfo.style.display = 'block';
    
    // Mostrar información
    qrInfoTable.textContent = table;
    qrInfoUrl.textContent = url;
    qrInfoStatus.textContent = '✅ Listo para usar';
    qrInfoStatus.style.color = '#27ae60';
    
    // Guardar para descarga
    qrImage.dataset.url = url;
    qrImage.dataset.table = table;
    
    showNotification(`✅ QR generado para la Mesa ${table}`, 'success');
});

// Descargar QR
document.getElementById('downloadQRBtn')?.addEventListener('click', () => {
    const table = parseInt(qrTableNumber.value);
    if (!qrImage.src || !qrImage.src.includes('qrserver')) {
        showNotification('⚠️ Genera un QR primero', 'warning');
        return;
    }
    
    // Descargar en alta resolución
    const link = document.createElement('a');
    link.href = qrImage.src;
    link.download = `qr-mesa-${table || '1'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`✅ QR descargado para la Mesa ${table || '1'}`, 'success');
});

// Generar todos los QR en una nueva ventana
document.getElementById('generateAllQRBtn')?.addEventListener('click', () => {
    const color = qrColor.value;
    const bgColor = qrBgColor.value;
    const size = parseInt(qrSize.value);
    const baseUrl = window.location.origin;
    
    // Crear una ventana con todos los QR
    const win = window.open('', '_blank');
    if (!win) {
        showNotification('⚠️ Permite las ventanas emergentes', 'warning');
        return;
    }
    
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QRs para Mesas</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f6fa; }
                .header { text-align: center; margin-bottom: 2rem; }
                .header h1 { color: #2c3e50; }
                .header p { color: #666; }
                .qr-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 20px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .qr-item {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    transition: transform 0.3s ease;
                }
                .qr-item:hover { transform: translateY(-5px); }
                .qr-item img {
                    width: 100%;
                    max-width: 200px;
                    height: auto;
                    margin: 10px 0;
                }
                .qr-item h3 {
                    margin: 10px 0 5px;
                    color: #2c3e50;
                }
                .qr-item .url {
                    font-size: 0.7rem;
                    color: #999;
                    word-break: break-all;
                }
                .qr-item .badge {
                    display: inline-block;
                    padding: 0.2rem 0.8rem;
                    background: #27ae60;
                    color: white;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    margin-top: 0.5rem;
                }
                @media print {
                    .qr-item { page-break-inside: avoid; }
                    .no-print { display: none; }
                }
                @media (max-width: 768px) {
                    .qr-grid { grid-template-columns: repeat(2, 1fr); }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📱 Códigos QR para Mesas</h1>
                <p>Escanea con tu teléfono para ver la carta digital</p>
                <button onclick="window.print()" class="no-print" style="padding: 0.5rem 2rem; background: #2c3e50; color: white; border: none; border-radius: 6px; cursor: pointer; margin: 1rem 0;">
                    🖨️ Imprimir
                </button>
            </div>
            <div class="qr-grid" id="qrGrid"></div>
            <script>
                const baseUrl = '${baseUrl}';
                const color = '${color}';
                const bgColor = '${bgColor}';
                const size = ${size};
                const totalTables = 20;
                const grid = document.getElementById('qrGrid');
                
                for (let i = 1; i <= totalTables; i++) {
                    const url = baseUrl + '?table=' + i + '&mode=client';
                    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?' + 
                        'size=' + size + 'x' + size +
                        '&data=' + encodeURIComponent(url) +
                        '&color=' + color.replace('#', '') +
                        '&bgcolor=' + bgColor.replace('#', '') +
                        '&format=png&margin=20';
                    
                    const div = document.createElement('div');
                    div.className = 'qr-item';
                    div.innerHTML = 
                        '<h3>Mesa ' + i + '</h3>' +
                        '<img src="' + qrUrl + '" alt="QR Mesa ' + i + '">' +
                        '<div class="url">' + url + '</div>' +
                        '<div class="badge">✅ Activo</div>';
                    grid.appendChild(div);
                }
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
});

// Botón de QR en el navbar
document.getElementById('generateQRBtn')?.addEventListener('click', () => {
    // Cambiar a la pestaña QR
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="qr"]')?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tabQR')?.classList.add('active');
});