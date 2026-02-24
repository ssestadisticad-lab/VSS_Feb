// --- FUNCIONES DEL MODAL ---
window.almacenTarjetas = {};
window.abrirTarjeta = function(idBoton) {
    const textoReal = window.almacenTarjetas[idBoton];
    const contenedorTexto = document.getElementById('texto-tarjeta');
    const modal = document.getElementById('modal-info');
    if (contenedorTexto && modal) { contenedorTexto.innerText = textoReal; modal.style.display = 'flex'; }
};
window.cerrarTarjeta = function() { document.getElementById('modal-info').style.display = 'none'; };

// --- LOGIN EXPRÉS ---
function verificarPassword() {
    const passIngresado = document.getElementById('password-input').value;
    const passCorrecto = "2026_SS12"; 
    if (passIngresado === passCorrecto) { document.getElementById('login-overlay').style.display = 'none'; } 
    else { document.getElementById('error-msg').style.display = 'block'; }
}
document.getElementById('password-input').addEventListener('keypress', function (e) { if (e.key === 'Enter') verificarPassword(); });

// =========================================================
// --- 1. INICIALIZACIÓN DEL MAPA ---
// =========================================================
const map = L.map('map').setView([19.4326, -99.1332], 9);

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OSM' }).addTo(map);
const googleHybridLayer = L.tileLayer('http://mt0.google.com/vt/lyrs=y&hl=es&x={x}&y={y}&z={z}', { maxZoom: 20, attribution: '© Google' });
const googleTrafficLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m@221097413,traffic&x={x}&y={y}&z={z}', { maxZoom: 20, attribution: '© Google' });

const baseMaps = { "OpenStreetMap": osmLayer, "Google Híbrido": googleHybridLayer, "Google Tráfico": googleTrafficLayer };

// =========================================================
// --- 2. GESTIÓN DE INCIDENTES, CLUSTERS Y CALOR ---
// =========================================================

// NUEVO: En lugar de un grupo normal, usamos un Cluster Group para agrupar puntos
let grupoMarcadores = L.markerClusterGroup({
    maxClusterRadius: 40, // Radio de agrupación
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 16 // Se separan solos si te acercas mucho
}).addTo(map);

// Tu configuración de Calor difuminado y rojo
let heatLayer = L.heatLayer([], { 
    radius: 40, blur: 30, maxZoom: 11, max: 0.6, 
    gradient: { 0.2: '#fee5d9', 0.4: '#fcae91', 0.6: '#fb6a4a', 0.8: '#de2d26', 1.0: '#a50f15' } 
}).addTo(map);

L.control.layers(baseMaps, { "📍 Agrupación de Eventos": grupoMarcadores, "🔥 Mapa de Calor": heatLayer }).addTo(map);

let datosCrudosIncidentes = null;
let filtroActivoMunicipio = null;

function normalizarTexto(texto) {
    if (!texto) return "";
    return texto.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// --- ÍCONO DE ALERTA PERSONALIZADO (Sin descargar imágenes) ---
const iconoAlerta = L.divIcon({
    className: 'icono-alerta-custom',
    // Hemos agregado 'stroke' (borde blanco) y 'stroke-width' (grosor) al SVG
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#d9534f" stroke="#ffffff" stroke-width="1" stroke-linejoin="round" width="32px" height="32px">
            <path d="M12 2L1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
           </svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32], 
    popupAnchor: [0, -32]
});

// --- FUNCIÓN MAESTRA DE INCIDENTES ---
function renderizarIncidentes(municipioFiltro) {
    if (!datosCrudosIncidentes) return;

    grupoMarcadores.clearLayers(); 
    let coordenadasCalor = [];     
    let contadorEventos = 0; 

    L.geoJSON(datosCrudosIncidentes, {
        filter: function(feature) {
            if (!municipioFiltro) return true;
            let munPunto = normalizarTexto(feature.properties['MUNICIPIO']);
            let munFiltroStr = normalizarTexto(municipioFiltro);
            return munFiltroStr.includes(munPunto) || munPunto.includes(munFiltroStr);
        },
        // NUEVO: Le decimos a Leaflet que use nuestro triángulo en lugar del alfiler azul
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, { icon: iconoAlerta });
        },
        onEachFeature: function (feature, layer) {
            contadorEventos++; 
            
            const limpiar = (dato) => (dato && dato !== "NaN" && dato !== "null" && dato !== null) ? dato : '';

            let municipio = limpiar(feature.properties['MUNICIPIO']) || 'Desconocido';
            let fecha = limpiar(feature.properties['FECHA']) || 'Sin fecha';
            let hora = limpiar(feature.properties['HORA']) || 'Sin hora';
            let vehiculos = limpiar(feature.properties['VEHÍCULOS']);
            let detenidos = limpiar(feature.properties['DETENIDOS']);
            let inmueble = limpiar(feature.properties['INMUEBLE']); 
            let caracteristicas = limpiar(feature.properties['CARACTERÍSTICAS DEL VEHÍCULO / INMUEBLE']);
            let descripcion = limpiar(feature.properties['DESCRIPCIÓN']);
            let observaciones = limpiar(feature.properties['OBSERVACIONES']);

            let popupContent = `
                <div style="font-family: sans-serif; min-width: 220px;">
                    <h4 style="margin-top:0; margin-bottom: 5px; color:#d9534f; font-size: 16px;">${municipio}</h4>
                    <p style="font-size: 13px; color: #555; margin-bottom: 8px;">📅 ${fecha} | ⏰ ${hora}</p>
            `;

            let indicadores = "";
            if (inmueble) indicadores += `<b>Tipo:</b> ${inmueble}<br>`; 
            if (vehiculos) indicadores += `<b>Vehículos:</b> ${vehiculos}<br>`;
            if (detenidos) indicadores += `<b>Detenidos:</b> <span style="color: #d9534f; font-weight: bold;">${detenidos}</span><br>`;
            
            if (indicadores !== "") popupContent += `<div style="font-size: 13px; margin-bottom: 12px; background: #f8f9fa; padding: 5px; border-left: 3px solid #ffc107; line-height: 1.4;">${indicadores}</div>`;

            let textoModal = "";
            if (descripcion) textoModal += `--- DESCRIPCIÓN ---\n${descripcion}\n\n`;
            if (caracteristicas) textoModal += `--- CARACTERÍSTICAS ---\n${caracteristicas}\n\n`;
            if (observaciones) textoModal += `--- OBSERVACIONES ---\n${observaciones}`;

            if (textoModal.trim() !== "") {
                let idUnico = "tarjeta_" + Math.random().toString(36).substr(2, 9);
                window.almacenTarjetas[idUnico] = textoModal;
                popupContent += `<button onclick="window.abrirTarjeta('${idUnico}')" style="width: 100%; padding: 8px; background-color: #d9534f; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px;">Ver Reporte Completo</button>`;
            }
            
            popupContent += `</div>`;
            layer.bindPopup(popupContent);
            
            grupoMarcadores.addLayer(layer);
            
            if (feature.geometry && feature.geometry.coordinates) {
                coordenadasCalor.push([feature.geometry.coordinates[1], feature.geometry.coordinates[0], 1]);
            }
        }
    });

    heatLayer.setLatLngs(coordenadasCalor);

    document.getElementById('conteo-titulo').innerText = municipioFiltro ? municipioFiltro : 'Todo el Estado';
    document.getElementById('conteo-numero').innerText = contadorEventos + (contadorEventos === 1 ? ' Evento' : ' Eventos');
    document.getElementById('panel-conteo').style.display = 'block';
}

fetch('datos.geojson')
    .then(response => response.json())
    .then(data => { datosCrudosIncidentes = data; renderizarIncidentes(null); })
    .catch(error => console.error('Error al cargar datos:', error));

window.quitarFiltro = function() {
    filtroActivoMunicipio = null;
    renderizarIncidentes(null);
    document.getElementById('btn-reset-filtro').style.display = 'none';
    map.setView([19.4326, -99.1332], 9); 
};

// =========================================================
// --- 3. POLÍGONOS (MUNICIPIOS Y COLONIAS) ---
// =========================================================
const ZOOM_ETIQUETAS_MUN = 10;
const ZOOM_PARA_COLONIAS = 12; 
let capaMunicipios; let capaColonias;

fetch('municipios.geojson')
    .then(response => response.json())
    .then(data => {
        capaMunicipios = L.geoJSON(data, {
            style: { color: '#000000', weight: 1.5, fillColor: '#000000', fillOpacity: 0.02 },
            onEachFeature: function (feature, layer) {
                if (feature.properties && feature.properties.nom_mun) {
                    layer.bindTooltip(feature.properties.nom_mun, { permanent: true, direction: "center", className: "etiqueta-municipio" });
                }
                layer.on('click', function(e) {
                    map.fitBounds(layer.getBounds()); 
                    let munNombre = feature.properties.nom_mun;
                    filtroActivoMunicipio = munNombre;
                    document.getElementById('btn-reset-filtro').style.display = 'block';
                    renderizarIncidentes(munNombre);
                });
            }
        }).addTo(map);
        controlarZoomDinamico(); 
    }).catch(e => console.error('Error Municipios:', e));

fetch('colonias.geojson')
    .then(response => response.json())
    .then(data => {
        capaColonias = L.geoJSON(data, {
            style: { color: '#666666', weight: 1.5, dashArray: '5, 5', fillColor: '#ffffff', fillOpacity: 0.01 },
            onEachFeature: function (feature, layer) {
                let nombreColonia = feature.properties.nom_col || 'Colonia sin nombre';
                layer.bindPopup(`<div style="text-align: center; color: #333;"><b>Colonia:</b><br>${nombreColonia}</div>`);
                layer.on('click', function(e) { map.fitBounds(layer.getBounds()); });
            }
        });
        controlarZoomDinamico(); 
    }).catch(e => console.error('Error Colonias:', e));

function controlarZoomDinamico() {
    let zoomActual = map.getZoom();
    let contenedorMapa = document.getElementById('map');
    
    if (zoomActual >= ZOOM_ETIQUETAS_MUN) { contenedorMapa.classList.remove('ocultar-etiquetas-mun'); } 
    else { contenedorMapa.classList.add('ocultar-etiquetas-mun'); }

    if (capaColonias) {
        if (zoomActual >= ZOOM_PARA_COLONIAS) { if (!map.hasLayer(capaColonias)) map.addLayer(capaColonias); } 
        else { if (map.hasLayer(capaColonias)) map.removeLayer(capaColonias); }
    }
}
map.on('zoomend', controlarZoomDinamico);

// =========================================================
// --- 4. CLIC DERECHO (COORDENADAS) ---
// =========================================================
map.on('contextmenu', function(e) {
    let lat = e.latlng.lat.toFixed(6); let lng = e.latlng.lng.toFixed(6);
    let popupContent = `
        <div style="text-align: center; font-family: sans-serif; min-width: 140px;">
            <b style="color: #0056b3; font-size: 13px;">Ubicación seleccionada</b><br>
            <div style="font-size: 14px; background: #f0f0f0; padding: 4px 6px; border-radius: 4px; border: 1px solid #ccc; margin-top: 6px; cursor: text; user-select: all;">
                ${lat}, ${lng}
            </div><div style="font-size: 10px; color: #777; margin-top: 4px;">Clic en el número para copiar</div>
        </div>`;
    L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(map);
});