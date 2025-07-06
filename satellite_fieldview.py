import ee
import folium
import requests
import json
from datetime import datetime, timedelta

# Initialize Earth Engine
ee.Initialize(project='project7-463821')

# AgroMonitoring API details
API_KEY = "a57be93e6b755d4f85fe6c922f3084ab"
POLYGON_ID = "6818b7dbd23361542f21605b"

def get_agromonitoring_polygon():
    """Fetch polygon from AgroMonitoring API"""
    url = f"https://api.agromonitoring.com/agro/1.0/polygons/{POLYGON_ID}?appid={API_KEY}"
    response = requests.get(url)
    if response.status_code == 200:
        geojson = response.json()["geo_json"]
        return ee.Geometry(geojson["geometry"] if geojson["type"] == "Feature" else geojson)
    else:
        raise Exception(f"Failed to fetch polygon: {response.text}")

def get_sentinel_image(polygon):
    """Get the best available Sentinel-2 image with fallback options"""
    # Try recent first (last 30 days)
    end_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=31)).strftime('%Y-%m-%d')
    
    s2_collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
        .filterBounds(polygon) \
        .filterDate(start_date, end_date) \
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))  # More lenient cloud filter
    
    # Check if we have any images
    image_count = s2_collection.size().getInfo()
    if image_count == 0:
        # Try broader search if no recent images
        s2_collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
            .filterBounds(polygon) \
            .filterDate('2023-01-01', end_date) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50))
        
        image_count = s2_collection.size().getInfo()
        if image_count == 0:
            raise Exception("No suitable Sentinel-2 images found for this location")
    
    # Get the least cloudy image
    return s2_collection.sort('CLOUDY_PIXEL_PERCENTAGE').first()

def create_folium_map(polygon, image):
    """Create interactive map with multiple visualization options"""
    # Get centroid for map center
    centroid = polygon.centroid().getInfo()['coordinates']
    m = folium.Map(location=[centroid[1], centroid[0]], zoom_start=14)

    # Visualization parameters
    vis_params = {
        'true_color': {
            'bands': ['B4', 'B3', 'B2'],
            'min': 0,
            'max': 3000
        },
        'false_color': {
            'bands': ['B8', 'B4', 'B3'],
            'min': 0,
            'max': 3000
        }
    }

    # Add all visualization layers
    for name, params in vis_params.items():
        map_id = image.visualize(**params).getMapId()
        folium.raster_layers.TileLayer(
            tiles=map_id['tile_fetcher'].url_format,
            attr='Google Earth Engine',
            name=f'Sentinel-2 ({name.replace("_", " ")})',
            overlay=True,
            control=True
        ).add_to(m)

    # Add NDVI layer
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    ndvi_map_id = ndvi.getMapId({
        'min': -1,
        'max': 1,
        'palette': ['red', 'yellow', 'green']
    })
    folium.raster_layers.TileLayer(
        tiles=ndvi_map_id['tile_fetcher'].url_format,
        attr='Google Earth Engine',
        name='NDVI',
        overlay=True,
        control=True
    ).add_to(m)

    # Add polygon boundary
    folium.GeoJson(
        data=json.loads(polygon.toGeoJSONString()),
        name='Field Boundary',
        style_function=lambda x: {'color': 'red', 'weight': 2}
    ).add_to(m)

    folium.LayerControl().add_to(m)
    m.save('satellite_imagery_folium.html')
    print("Map saved to satellite_imagery_folium.html")

# Main execution
try:
    print("Fetching field boundary...")
    polygon = get_agromonitoring_polygon()
    print("Searching for Sentinel-2 imagery...")
    s2_image = get_sentinel_image(polygon)
    print(f"Found image from {s2_image.date().format('YYYY-MM-dd').getInfo()}")
    print("Generating map...")
    create_folium_map(polygon, s2_image)
    print("Done!")
except Exception as e:
    print(f"Error: {str(e)}")
    print("Possible solutions:")
    print("- Try a different date range")
    print("- Increase the cloud cover tolerance")
    print("- Verify your polygon coordinates")