// --- FUNCIONES DEL MODAL DE TARJETA ---

// 1. Creamos un "almacén" global en memoria
window.almacenTarjetas = {};

// 2. Pegamos la función a 'window' para que Leaflet la encuentre sí o sí
window.abrirTarjeta = function(idBoton) {
    const textoReal = window.almacenTarjetas[idBoton];
    
    // Verificamos que los elementos existan antes de intentar abrirlos
    const contenedorTexto = document.getElementById('texto-tarjeta');
    const modal = document.getElementById('modal-info');
    
    if (contenedorTexto && modal) {
        contenedorTexto.innerText = textoReal;
        modal.style.display = 'flex';
    } else {
        console.error("Falta el código HTML del Modal en tu index.html");
    }
};

window.cerrarTarjeta = function() {
    document.getElementById('modal-info').style.display = 'none';
};
// --- LÓGICA DEL LOGIN EXPRÉS ---
function verificarPassword() {
    const passIngresado = document.getElementById('password-input').value;
    const passCorrecto = "2026_SS12"; 

    if (passIngresado === passCorrecto) {
        // Si es correcta, desaparecemos la pantalla de bloqueo
        document.getElementById('login-overlay').style.display = 'none';
    } else {
        // Si es incorrecta, mostramos el mensaje de error
        document.getElementById('error-msg').style.display = 'block';
    }
}

// Permite dar "Enter" en el teclado para iniciar sesión
document.getElementById('password-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        verificarPassword();
    }
});

// 1. Inicializamos el mapa centrado en el Estado de México / CDMX
const map = L.map('map').setView([19.4326, -99.1332], 9);

// 2. Definimos los Mapas Base
// OpenStreetMap
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
});

// Google Híbrido (Satélite + Calles)
const googleHybridLayer = L.tileLayer('http://mt0.google.com/vt/lyrs=y&hl=es&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '© Google'
});

// Google Tráfico (Mapa normal con capa de tráfico)
const googleTrafficLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m@221097413,traffic&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '© Google'
});

// Añadimos OSM como mapa por defecto al cargar la página
osmLayer.addTo(map);

// 3. Creamos el control para alternar entre mapas base
const baseMaps = {
    "OpenStreetMap": osmLayer,
    "Google Híbrido": googleHybridLayer,
    "Google Tráfico": googleTrafficLayer
};
L.control.layers(baseMaps).addTo(map);


// =========================================================
// --- CAPAS DE DELIMITACIÓN ADMINISTRATIVA (POLÍGONOS) ---
// =========================================================

// =========================================================
// --- CAPAS DE DELIMITACIÓN ADMINISTRATIVA (POLÍGONOS) ---
// =========================================================

// Configuración: Define a qué nivel de zoom (acercamiento) quieres que pasen las cosas
const ZOOM_ETIQUETAS_MUN = 10; // Zoom para que aparezcan los nombres de los Municipios
const ZOOM_PARA_COLONIAS = 12; // Zoom para que se dibujen los polígonos de las Colonias

let capaMunicipios;
let capaColonias;

// 1. CARGAMOS LOS MUNICIPIOS
fetch('municipios.geojson')
    .then(response => response.json())
    .then(data => {
        capaMunicipios = L.geoJSON(data, {
            style: { color: '#000000', weight: 1.5, fillColor: '#000000', fillOpacity: 0.02 },
            onEachFeature: function (feature, layer) {
                if (feature.properties && feature.properties.nom_mun) {
                    layer.bindTooltip(feature.properties.nom_mun, {
                        permanent: true,
                        direction: "center",
                        className: "etiqueta-municipio"
                    });
                }
                layer.on('click', function(e) {
                    map.fitBounds(layer.getBounds());
                });
            }
        }).addTo(map);
        
        controlarZoomDinamico(); // Ejecutamos la revisión de zoom inicial
    })
    .catch(error => console.error('Error al cargar Municipios:', error));

// 2. CARGAMOS LAS COLONIAS
fetch('colonias.geojson')
    .then(response => response.json())
    .then(data => {
        capaColonias = L.geoJSON(data, {
            style: { color: '#666666', weight: 1.5, dashArray: '5, 5', fillColor: '#ffffff', fillOpacity: 0.01 },
            onEachFeature: function (feature, layer) {
                // Leemos el nombre de la colonia desde tu archivo
                let nombreColonia = feature.properties.nom_col || 'Colonia sin nombre';
                
                // Le asignamos una burbuja informativa (Popup) que se abre al hacer clic
                layer.bindPopup(`<div style="text-align: center; color: #333;"><b>Colonia:</b><br>${nombreColonia}</div>`);
                
                layer.on('click', function(e) {
                    // Primero centramos la cámara en la colonia...
                    map.fitBounds(layer.getBounds());
                    // (La burbuja de la colonia se abre solita gracias al bindPopup)
                });
            }
        });
        
        controlarZoomDinamico(); // Ejecutamos la revisión de zoom inicial
    })
    .catch(error => console.error('Error al cargar Colonias:', error));

// 3. LÓGICA MAESTRA DE ZOOM DINÁMICO
function controlarZoomDinamico() {
    let zoomActual = map.getZoom();
    let contenedorMapa = document.getElementById('map'); // Agarra el div completo del mapa

    // A) Control de las letras de los Municipios
    if (zoomActual >= ZOOM_ETIQUETAS_MUN) {
        // Si estamos cerca, le quitamos la capa de invisibilidad
        contenedorMapa.classList.remove('ocultar-etiquetas-mun');
    } else {
        // Si nos alejamos, le ponemos la capa de invisibilidad
        contenedorMapa.classList.add('ocultar-etiquetas-mun');
    }

    // B) Control de las líneas de las Colonias
    if (capaColonias) {
        if (zoomActual >= ZOOM_PARA_COLONIAS) {
            // Si no está dibujada en el mapa, la dibujamos
            if (!map.hasLayer(capaColonias)) map.addLayer(capaColonias);
        } else {
            // Si nos alejamos, la borramos para no saturar
            if (map.hasLayer(capaColonias)) map.removeLayer(capaColonias);
        }
    }
}

// Le decimos al mapa que ejecute la función cada vez que el usuario termine de usar la ruedita del ratón
map.on('zoomend', controlarZoomDinamico);

// =========================================================


// 4. Cargamos los datos del archivo GeoJSON externo
fetch('datos.geojson')
    .then(response => response.json())
    .then(data => {
        // Añadimos los datos al mapa
        L.geoJSON(data, {
             // Esta función se ejecuta por cada punto en tu GeoJSON
            onEachFeature: function (feature, layer) {
                if (feature.properties) {
                    let estado = feature.properties['Entidad fererativa '] || '';
                    let municipio = feature.properties['Municipio '] || 'Municipio desconocido';
                    let colonia = feature.properties['Localidad y/o colonia '] || 'Sin descripción';
                    let link = feature.properties['Link o tarjeta. '];
                    
                    let popupContent = `
                        <div style="font-family: sans-serif; min-width: 220px;">
                            <h4 style="margin-top:0; margin-bottom: 5px; color:#0056b3; font-size: 16px;">${municipio}</h4>
                            <p style="font-size: 13px; color: #555; margin-bottom: 10px;">${estado}</p>
                            <p style="font-size: 14px; margin-bottom: 10px;"><b>Ubicación:</b><br>${colonia}</p>
                    `;
                    
                    if (link && link !== "" && link !== "NaN" && link !== null) {
                        if (link.startsWith("http")) {
                            popupContent += `<a href="${link}" target="_blank" style="display:block; text-align:center; padding:8px 12px; background-color:#d9534f; color:white; text-decoration:none; border-radius:4px; font-weight:bold; font-size: 13px;">Ver Enlace Externo</a>`;
                        } else {
                            // MAGIA AQUÍ: Creamos un ID único y aleatorio para este punto
                            let idUnico = "tarjeta_" + Math.random().toString(36).substr(2, 9);
                            
                            // Guardamos el texto largo en nuestro almacén de JavaScript, no en el HTML
                            window.almacenTarjetas[idUnico] = link;
                            
                            // El botón ahora solo manda a llamar ese ID cortito y 100% seguro
                            popupContent += `<button onclick="abrirTarjeta('${idUnico}')" style="width: 100%; padding: 8px; background-color: #007BFF; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px;">Ver Tarjeta Completa</button>`;
                        }
                    }
                    
                    popupContent += `</div>`;
                    layer.bindPopup(popupContent);
                }
            }
        }).addTo(map);
    })
    .catch(error => console.error('Error al cargar el GeoJSON:', error));

// =========================================================
// --- OBTENER COORDENADAS CON CLIC SECUNDARIO (RIGHT CLICK) ---
// =========================================================

map.on('contextmenu', function(e) {
    // 1. Extraemos la latitud y longitud del punto donde hizo clic el usuario
    // Le ponemos .toFixed(6) para que nos dé 6 decimales de precisión (estándar GPS)
    let lat = e.latlng.lat.toFixed(6);
    let lng = e.latlng.lng.toFixed(6);
    
    // 2. Unimos las coordenadas en formato "Latitud, Longitud"
    let coordenadasStr = `${lat}, ${lng}`;
    
    // 3. Diseñamos la burbujita
    // El truco mágico aquí es "user-select: all;", hace que si el usuario 
    // le da un solo clic izquierdo al número, se seleccione todo automáticamente para copiarlo rápido.
    let popupContent = `
        <div style="text-align: center; font-family: sans-serif; min-width: 140px;">
            <b style="color: #0056b3; font-size: 13px;">Ubicación seleccionada</b><br>
            <div style="font-size: 14px; background: #f0f0f0; padding: 4px 6px; border-radius: 4px; border: 1px solid #ccc; margin-top: 6px; cursor: text; user-select: all;">
                ${coordenadasStr}
            </div>
            <div style="font-size: 10px; color: #777; margin-top: 4px;">Clic en el número para seleccionar</div>
        </div>
    `;
    
    // 4. Mostramos la burbuja en el punto exacto del clic
    L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);
});