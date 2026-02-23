import pandas as pd
import geopandas as gpd

# 1. Cargar los datos
# Aquí pondrías: df = pd.read_excel('tus_datos.xlsx') o pd.read_csv('tus_datos.csv')
# Por ahora, recreo tu registro de muestra en un DataFrame:
datos = {
    'Entidad fererativa': ['Estado de México'],
    'Municipio': ['Jilotepec'],
    'Localidad y/o colonia': ['Carretera México–Querétaro km 107, Colonia Tecolapan'],
    'Link o tarjeta.': ['atencion'],
    'Coordenadas': ['20.083251, -99.632615']
}
df = pd.DataFrame(datos)

# 2. Separar la columna 'Coordenadas' en Latitud y Longitud
# El split(',') divide el texto donde encuentra la coma.
df[['Latitud', 'Longitud']] = df['Coordenadas'].str.split(',', expand=True)

# Limpiamos posibles espacios en blanco y convertimos a números (float)
df['Latitud'] = pd.to_numeric(df['Latitud'].str.strip())
df['Longitud'] = pd.to_numeric(df['Longitud'].str.strip())

# 3. Crear la geometría espacial
# ¡Regla de oro GIS!: points_from_xy siempre pide primero Longitud (X) y luego Latitud (Y)
geometrias = gpd.points_from_xy(df['Longitud'], df['Latitud'])

# 4. Crear el GeoDataFrame
gdf = gpd.GeoDataFrame(df, geometry=geometrias, crs="EPSG:4326")

# (Opcional) Borramos las columnas de coordenadas para que el GeoJSON pese menos, 
# la geometría ya guarda esa información.
gdf = gdf.drop(columns=['Coordenadas', 'Latitud', 'Longitud'])

# 5. Exportar a GeoJSON
gdf.to_file('datos.geojson', driver='GeoJSON')
print("¡Archivo datos.geojson generado con éxito! Listo para subir a GitHub.")