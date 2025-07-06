# Farm Analytics Dashboard

## Overview
A modern, responsive web dashboard for farm sensor data visualization and analytics. This dashboard provides real-time insights into crop health, soil conditions, weather data, and satellite imagery.

## Features

### 📊 Data Visualization
- **NDVI Time Series**: Normalized Difference Vegetation Index tracking crop health over time
- **NDRE Time Series**: Normalized Difference Red Edge Index for vegetation analysis
- **Nitrogen Estimates**: Soil nitrogen level monitoring and predictions
- **Weather Data**: Real-time weather information with OpenWeatherMap integration
- **Soil Data**: Historical soil temperature and moisture readings
- **Real-time Soil Data**: Live soil sensor readings including pH, temperature, and moisture
- **Satellite Field View**: Interactive satellite imagery with field boundaries

### 🎯 Navigation
- **Overview**: Main dashboard with all widgets
- **Analytics**: Summary statistics and trend analysis
- **Settings**: Configuration and data source information

### 🎨 Modern UI Features
- Responsive design that works on desktop, tablet, and mobile
- Glass-morphism design with blur effects
- Smooth animations and hover effects
- Real-time date/time display
- Loading indicators for data fetching
- Error handling with user-friendly messages

### 🛠️ Technical Features
- **Chart.js Integration**: Interactive charts with zoom and pan capabilities
- **CSV Data Fallback**: Embedded data ensures charts display even if external files fail
- **Error Handling**: Robust error handling with graceful degradation
- **Cross-browser Compatibility**: Works on Chrome, Firefox, Safari, and Edge
- **Responsive Grid Layout**: Automatic layout adjustment for different screen sizes

## File Structure
```
├── index.html              # Main HTML file
├── style.css               # CSS styles with modern design
├── script.js               # JavaScript functionality
├── satellite_imagery_folium.html  # Satellite map widget
├── ndvi_time_series.csv    # NDVI data
├── ndre_time_series.csv    # NDRE data
├── nitrogen_estimates.csv  # Nitrogen data
└── README.md              # This documentation
```

## Usage
1. Open `index.html` in a web browser
2. Navigate between sections using the sidebar
3. View real-time data updates
4. Interact with charts (zoom, pan, hover for details)
5. Access satellite imagery in the bottom-right widget

## Data Sources
- **Weather**: OpenWeatherMap API
- **Satellite**: Sentinel-2 imagery via Folium
- **Sensor Data**: Local CSV files with embedded fallback data

## Browser Compatibility
- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

## Mobile Responsive
The dashboard automatically adapts to different screen sizes:
- **Desktop**: Full grid layout with sidebar
- **Tablet**: Adjusted grid with horizontal navigation
- **Mobile**: Single column layout with compact navigation

## Future Enhancements
- Real-time WebSocket data updates
- Historical data export functionality
- Advanced analytics and machine learning predictions
- Field management tools
- Alert system for critical conditions

## Support
For issues or questions, please check the browser console for error messages and ensure all dependencies are properly loaded.
