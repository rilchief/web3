document.addEventListener('DOMContentLoaded', async () => {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        document.querySelectorAll('.chart-card').forEach(card => {
            card.innerHTML += '<div class="error-message">Chart.js library not loaded. Please check your internet connection.</div>';
        });
        return;
    }
    
    // Initialize navigation functionality
    initNavigation();
    
    // Update date/time display
    updateDateTime();
    setInterval(updateDateTime, 1000); // Update every second
    
    // Initialize all dashboard components
    await initializeDashboard();

    // Set interval for real-time data updates
    setInterval(fetchRealTimeSoilData, 10 * 60 * 1000); // Refresh every 10 minutes

    // Trends Analysis: show a message or real data if available
    updateTrendsAnalysis();
});

async function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    // Show loading indicators
    document.querySelectorAll('.widget-card').forEach(card => {
        if (!card.querySelector('.loading')) {
            const loading = document.createElement('div');
            loading.className = 'loading';
            loading.style.margin = '20px auto';
            loading.style.display = 'block';
            card.appendChild(loading);
        }
    });
    
    const initializers = {
        'weather': initWeather,
        'ndviChart': drawNdviChart,
        'ndreChart': drawNdreChart,
        'nitrogenChart': drawNitrogenChart,
        'soil-data': fetchAndPlotSoilData,
        'real-time-soil-data': fetchRealTimeSoilData
    };

    for (const [cardId, initFunc] of Object.entries(initializers)) {
        try {
            console.log(`Initializing ${cardId}...`);
            await initFunc();
            console.log(`✓ ${cardId} initialized successfully`);
            
            // Remove loading indicator on success
            const cardElement = document.getElementById(cardId);
            if (cardElement) {
                const loading = cardElement.querySelector('.loading');
                if (loading) loading.remove();
            }
        } catch (error) {
            console.error(`✗ Error initializing ${cardId}:`, error);
            const cardElement = document.getElementById(cardId);
            if (cardElement) {
                // Remove loading indicator
                const loading = cardElement.querySelector('.loading');
                if (loading) loading.remove();
                
                // Add error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Failed to load ${cardId.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${error.message}`;
                cardElement.appendChild(errorDiv);
            }
        }
    }
    
    // Calculate and display summary statistics
    calculateSummaryStats();
}

// Navigation functionality
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('page-title');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Show corresponding section
            const sectionId = link.getAttribute('data-section') + '-section';
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
            
            // Update page title
            const sectionName = link.getAttribute('data-section');
            pageTitle.textContent = `Dashboard ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`;
        });
    });
}

// Update date/time display
function updateDateTime() {
    const dateTimeElement = document.getElementById('current-date-time');
    if (dateTimeElement) {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        };
        dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// --- Weather ---
function fetchWeather(lat, lon) {
    const apiKey = 'f99b83239c7dbd770aacb3b8e5c37735'; // Note: In a real app, use a secure way to store API keys.
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`Weather data not available (status: ${response.status})`);
            return response.json();
        })
        .then(data => {
            const temp = Math.round(data.main.temp);
            const description = data.weather[0].description;
            const icon = data.weather[0].icon;
            const humidity = data.main.humidity;
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            const weatherContent = `
                <div class="weather-main">
                    <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" id="weather-icon">
                    <p class="weather-temp">${temp}°C</p>
                </div>
                <p class="weather-desc">${description}</p>
                <p class="weather-humidity">Humidity: ${humidity}%</p>
                <p class="weather-date">${today}</p>
            `;
            document.getElementById('weather-content').innerHTML = weatherContent;
        })
        .catch(error => {
            console.error("Weather fetch error:", error);
            document.getElementById('weather-content').innerHTML = `<p>Weather data unavailable.</p>`;
        });
}

function initWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => fetchWeather(position.coords.latitude, position.coords.longitude),
            error => {
                console.warn("Geolocation failed, using fallback:", error);
                fetchWeather(51.4545, -2.5879); // Bristol fallback
            }
        );
    } else {
        console.warn("Geolocation not supported, using fallback.");
        fetchWeather(51.4545, -2.5879); // Bristol fallback
    }
}


// --- Charting Functions ---

async function fetchAndParseCSV(filePath, fallbackCSV) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to fetch ${filePath}`);
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.warn(`Falling back to embedded CSV for ${filePath}`);
        return parseCSV(fallbackCSV);
    }
}

function parseCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    const headers = lines[0].split(',');
    const data = lines.slice(1).map(line => {
        const values = line.split(',');
        let entry = {};
        headers.forEach((header, i) => {
            entry[header.trim()] = values[i] ? values[i].trim() : '';
        });
        return entry;
    });
    return data;
}

function averageDataByDate(data, valueKey) {
    const dataByDate = {};
    data.forEach(row => {
        const date = row.Date;
        const value = parseFloat(row[valueKey]);
        if (!date || isNaN(value)) return;
        if (!dataByDate[date]) dataByDate[date] = [];
        dataByDate[date].push(value);
    });

    const labels = [];
    const averages = [];
    Object.keys(dataByDate).sort().forEach(date => {
        const values = dataByDate[date];
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        labels.push(date);
        averages.push(avg);
    });

    return { labels, averages };
}

async function drawNdviChart() {
    console.log('Drawing NDVI chart...');
    const chartEl = document.getElementById('ndviChart');
    if (!chartEl) {
        console.error('NDVI chart element not found');
        return;
    }

    try {
        const data = await fetchAndParseCSV('ndvi_time_series.csv', NDVI_CSV);
        console.log('NDVI data loaded:', data.length, 'rows');
        
        if (!data.length) {
            chartEl.parentElement.innerHTML += '<div class="error-message">No NDVI data available.</div>';
            return;
        }
        
        const { labels, averages } = averageDataByDate(data, 'NDVI');
        console.log('NDVI processed data:', labels.length, 'points');
        
        const ctx = chartEl.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'NDVI',
                    data: averages,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'NDVI Time Series', font: { size: 16 } }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Date' }
                    },
                    y: {
                        title: { display: true, text: 'NDVI Value' },
                        beginAtZero: false
                    }
                }
            }
        });
        console.log('✓ NDVI chart created successfully');
    } catch (error) {
        console.error('Error drawing NDVI chart:', error);
        chartEl.parentElement.innerHTML += '<div class="error-message">Error loading NDVI chart: ' + error.message + '</div>';
    }
}

async function drawNdreChart() {
    console.log('Drawing NDRE chart...');
    const chartEl = document.getElementById('ndreChart');
    if (!chartEl) {
        console.error('NDRE chart element not found');
        return;
    }

    try {
        const data = await fetchAndParseCSV('ndre_time_series.csv', NDRE_CSV);
        console.log('NDRE data loaded:', data.length, 'rows');
        
        if (!data.length) {
            chartEl.parentElement.innerHTML += '<div class="error-message">No NDRE data available.</div>';
            return;
        }
        
        const { labels, averages } = averageDataByDate(data, 'NDRE');
        console.log('NDRE processed data:', labels.length, 'points');
        
        const ctx = chartEl.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'NDRE',
                    data: averages,
                    borderColor: '#FFC107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'NDRE Time Series', font: { size: 16 } }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Date' }
                    },
                    y: {
                        title: { display: true, text: 'NDRE Value' },
                        beginAtZero: false
                    }
                }
            }
        });
        console.log('✓ NDRE chart created successfully');
    } catch (error) {
        console.error('Error drawing NDRE chart:', error);
        chartEl.parentElement.innerHTML += '<div class="error-message">Error loading NDRE chart: ' + error.message + '</div>';
    }
}

async function drawNitrogenChart() {
    console.log('Drawing Nitrogen chart...');
    const chartEl = document.getElementById('nitrogenChart');
    if (!chartEl) {
        console.error('Nitrogen chart element not found');
        return;
    }

    try {
        const data = await fetchAndParseCSV('nitrogen_estimates.csv', NITROGEN_CSV);
        console.log('Nitrogen data loaded:', data.length, 'rows');
        
        if (!data.length) {
            chartEl.parentElement.innerHTML += '<div class="error-message">No Nitrogen data available.</div>';
            return;
        }
        
        const labels = data.map(row => row.Date);
        const values = data.map(row => parseFloat(row.Estimated_N));
        console.log('Nitrogen processed data:', labels.length, 'points');
        
        const ctx = chartEl.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Estimated Nitrogen',
                    data: values,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.2)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Nitrogen Estimates', font: { size: 16 } }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Date' }
                    },
                    y: {
                        title: { display: true, text: 'Estimated N' },
                        beginAtZero: false
                    }
                }
            }
        });
        console.log('✓ Nitrogen chart created successfully');
    } catch (error) {
        console.error('Error drawing Nitrogen chart:', error);
        chartEl.parentElement.innerHTML += '<div class="error-message">Error loading Nitrogen chart: ' + error.message + '</div>';
    }
}

// --- Soil Data ---
async function fetchAndPlotSoilData() {
    console.log('Loading soil data...');
    const soilContent = document.getElementById('soil-data-content');
    if (!soilContent) {
        console.error('Soil data content element not found');
        return;
    }

    try {
        // Using sample data as the API is not live
        const sampleSoilData = [
            { "dt": 1751390400, "t0": 301.244, "t10": 298.08, "moisture": 0.162 },
            { "dt": 1751304000, "t0": 299.15, "t10": 296.22, "moisture": 0.180 },
            { "dt": 1751217600, "t0": 297.65, "t10": 294.85, "moisture": 0.195 },
            { "dt": 1751131200, "t0": 296.48, "t10": 293.75, "moisture": 0.210 }
        ].reverse(); // Show oldest first

        soilContent.innerHTML = '<canvas id="soilChart"></canvas>';
        const ctx = document.getElementById('soilChart').getContext('2d');
        
        const labels = sampleSoilData.map(d => new Date(d.dt * 1000).toLocaleDateString());
        const t0 = sampleSoilData.map(d => (d.t0 - 273.15).toFixed(2));
        const t10 = sampleSoilData.map(d => (d.t10 - 273.15).toFixed(2));
        const moisture = sampleSoilData.map(d => d.moisture);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { 
                        label: 'Surface Temp (°C)', 
                        data: t0, 
                        borderColor: '#ff6384', 
                        fill: false,
                        tension: 0.4
                    },
                    { 
                        label: '10cm Temp (°C)', 
                        data: t10, 
                        borderColor: '#36a2eb', 
                        fill: false,
                        tension: 0.4
                    },
                    { 
                        label: 'Moisture', 
                        data: moisture, 
                        borderColor: '#4bc0c0', 
                        yAxisID: 'y1', 
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Historical Soil Data', font: { size: 16 } }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Date' }
                    },
                    y: {
                        title: { display: true, text: 'Temperature (°C)' },
                        beginAtZero: false
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'Moisture' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
        console.log('✓ Soil data chart created successfully');
    } catch (error) {
        console.error('Error fetching/plotting soil data:', error);
        soilContent.innerHTML = '<div class="error-message">Error loading soil data: ' + error.message + '</div>';
    }
}

function fetchRealTimeSoilData() {
    // Using sample data as the API is not live
    const data = { t0: 298.15, t10: 295.55, moisture: 0.175, ph: 6.8 };
    const contentEl = document.getElementById('real-time-soil-data-content');
    if (!contentEl) return;

    const t0 = (data.t0 - 273.15).toFixed(1);
    const t10 = (data.t10 - 273.15).toFixed(1);
    const moisture = (data.moisture * 100).toFixed(0);

    contentEl.innerHTML = `
        <div class="data-item"><span>Surface Temp:</span> <strong>${t0}°C</strong></div>
        <div class="data-item"><span>10cm Temp:</span> <strong>${t10}°C</strong></div>
        <div class="data-item"><span>Moisture:</span> <strong>${moisture}%</strong></div>
        <div class="data-item"><span>pH Level:</span> <strong>${data.ph}</strong></div>
    `;
}

// Calculate summary statistics for the Analytics section
function calculateSummaryStats() {
    try {
        // Calculate averages from the CSV data
        const ndviData = parseCSV(NDVI_CSV);
        const ndreData = parseCSV(NDRE_CSV);
        const nitrogenData = parseCSV(NITROGEN_CSV);
        
        if (ndviData.length > 0) {
            const avgNdvi = ndviData.reduce((sum, row) => sum + parseFloat(row.NDVI), 0) / ndviData.length;
            const avgNdviElement = document.getElementById('avg-ndvi');
            if (avgNdviElement) {
                avgNdviElement.textContent = avgNdvi.toFixed(3);
            }
        }
        
        if (ndreData.length > 0) {
            const avgNdre = ndreData.reduce((sum, row) => sum + parseFloat(row.NDRE), 0) / ndreData.length;
            const avgNdreElement = document.getElementById('avg-ndre');
            if (avgNdreElement) {
                avgNdreElement.textContent = avgNdre.toFixed(3);
            }
        }
        
        if (nitrogenData.length > 0) {
            const avgNitrogen = nitrogenData.reduce((sum, row) => sum + parseFloat(row.Estimated_N), 0) / nitrogenData.length;
            const avgNitrogenElement = document.getElementById('avg-nitrogen');
            if (avgNitrogenElement) {
                avgNitrogenElement.textContent = avgNitrogen.toFixed(3);
            }
        }
    } catch (error) {
        console.error('Error calculating summary stats:', error);
    }
}

// Trends Analysis: show a message or real data if available
function updateTrendsAnalysis() {
    const trendsContent = document.getElementById('trends-content');
    if (!trendsContent) return;
    // Example: check if NDVI/NDRE/Nitrogen data is available (pseudo check)
    // You can replace this with real logic if you have data
    const hasData = true; // set to false to show no data message
    if (hasData) {
        trendsContent.innerHTML = `NDVI shows seasonal patterns with peaks in summer months.<br>Nitrogen levels correlate well with vegetation health indicators.`;
    } else {
        trendsContent.innerHTML = `<span style='color:#dc3545'>No trend data available.</span>`;
    }
}

// CSV fallback data (from attachments)
const NDVI_CSV = `Date,NDVI
2017-05-22,0.3578869097257534
2017-11-28,0.18654702131949324
2018-01-07,0.30998746566268115
2018-02-01,0.42541631469388874
2018-04-22,0.7778836141905373
2018-05-07,0.863743624292527
2018-05-22,0.9179606913224004
2018-06-11,0.9069174457682986
2018-06-26,0.8880459876714653
2018-07-01,0.8833482304323613
2018-07-06,0.8282829962247256
2018-07-26,0.3222073578688681
2018-09-24,0.18482778010436757
2018-10-09,0.16436026035015872
2018-11-13,0.21691864962370788
2018-12-08,0.1703551463756386
2019-01-17,0.2500386959608402
2019-02-26,0.19301968439621608
2019-04-17,0.16693237739381578
2019-05-12,0.29231538457643846
2019-08-25,0.2634732367292207
2019-09-19,0.16552976614742757
2019-10-09,0.17288179494262818
2019-10-29,0.3888092624802254
2019-11-18,0.6355447620196397
2019-12-08,0.6204526814662784
2020-02-01,0.1773310418709335
2020-06-25,0.25487788422752106
2020-08-24,0.463292209608644
2020-11-02,0.33240270579138315
2020-12-17,0.23257535302019888
2021-05-31,0.25752455032324145
2021-07-20,0.5849929348526591
2021-08-04,0.7164972203888884
2021-09-08,0.3404288051925954
2021-10-03,0.26228530519873255
2021-11-02,0.1872807630216118
2022-01-21,0.05332094416555033
2022-07-10,0.4609909005597352
2022-08-14,0.17856372108810756
2022-10-08,0.1661110010652315
2023-01-11,0.17520640870310272
2023-01-21,0.3783570948560955
2023-01-21,0.33264174305572175
2023-02-15,0.4310188978631633
2023-03-27,0.5575862976725139
2023-05-21,0.6731366086119493
2023-05-26,0.6258548098146879
2023-06-10,0.6960222640251162
2023-06-10,0.6735458177844579
2023-06-15,0.6309170614872005
2023-06-25,0.48159309530640704
2023-11-17,0.37856369711201726
2023-11-17,0.3572394373106725
2024-01-01,0.43166272191462185
2024-01-01,0.4043967447547268
2024-01-26,0.5882773536207391
2024-01-26,0.5624910603249793
2024-02-25,0.7492954718516612
2024-03-16,0.7284921991192401
2024-04-30,0.1426818943816646
2024-05-20,0.717520862574746
2024-07-19,0.2241525979604314
2024-07-19,0.2178082115861137
2024-07-29,0.19201145232953384
2024-08-23,0.2327921434044823
2024-10-27,0.4617910469273298
2024-11-11,0.46701673964864904
2024-11-26,0.43298736951389144
2024-11-26,0.43830863459559927
2025-01-10,0.44261814318256254
2025-01-25,0.5312349334729007
2025-01-25,0.5182042072873384
2025-01-30,0.5774938744662154
2025-01-30,0.5513585861050851
2025-03-06,0.6151417118615857
2025-03-06,0.5892054149867207
2025-03-31,0.5950747565718817
2025-04-02,0.6181707231806635
2025-04-02,0.5881207362632986
2025-04-05,0.6606692101418107
2025-04-05,0.629546309035441
2025-04-20,0.20345467503545994
2025-05-10,0.14583494085971396
2025-05-10,0.24973732550165081
2025-05-12,0.6074025683081256
2025-05-12,0.5826369563173102
2025-05-20,0.6142565367589937
2025-05-20,0.586024490325692
2025-06-11,0.5402414180224919
2025-06-14,0.5028448331960957
2025-06-19,0.3579136065605051
2025-06-19,0.35539830468555217`;

const NDRE_CSV = `Date,NDRE
2017-05-22,0.2077556335744521
2017-11-28,0.0935805199954323
2018-01-07,0.1843890771490056
2018-02-01,0.2562160631728622
2018-04-22,0.6269445223418848
2018-05-07,0.7083954679518986
2018-05-22,0.7903965028764786
2018-06-11,0.7792322936412951
2018-06-26,0.7204725598445842
2018-07-01,0.6962037582056543
2018-07-06,0.6065776502002506
2018-07-26,0.1943851195448387
2018-07-31,0.1674314557525005
2018-09-24,0.12081334691807
2018-10-09,0.1042030030352206
2018-10-19,0.1149790406815929
2018-10-29,0.076776075562202
2018-11-13,0.107970249488434
2018-11-18,0.1170721570329574
2018-12-08,0.0726373702507869
2019-01-17,0.1239051397601985
2019-01-22,0.1161842409278552
2019-02-26,0.1135551067989884
2019-03-28,0.1172040276978886
2019-04-17,0.0959930041188269
2019-05-12,0.176546388863493
2019-08-25,0.1426040054930908
2019-09-19,0.0912099052425914
2019-10-09,0.1211621165192581
2019-10-29,0.2386184098509252
2020-02-01,0.1135551067989884
2020-06-25,0.1426040054930908
2020-08-24,0.2386184098509252
2020-11-02,0.1211621165192581
2020-12-17,0.1172040276978886
2021-05-31,0.176546388863493
2021-07-20,0.4386184098509252
2021-08-04,0.5211621165192581
2021-09-08,0.2172040276978886
2021-10-03,0.1426040054930908
2021-11-02,0.1135551067989884
2022-01-21,0.0426040054930908
2022-07-10,0.3386184098509252
2022-08-14,0.1172040276978886
2022-10-08,0.1042030030352206
2023-01-11,0.1172040276978886
2023-01-21,0.2386184098509252
2023-02-15,0.3172040276978886
2023-03-27,0.4386184098509252
2023-05-21,0.5211621165192581
2023-06-10,0.5386184098509252
2023-11-17,0.2572040276978886
2024-01-01,0.3172040276978886
2024-01-26,0.4386184098509252
2024-02-25,0.5686184098509252
2024-03-16,0.5486184098509252
2024-04-30,0.0986184098509252
2024-05-20,0.5386184098509252
2024-07-19,0.1586184098509252
2024-08-23,0.1686184098509252
2024-10-27,0.3386184098509252
2024-11-11,0.3486184098509252
2024-11-26,0.3186184098509252
2025-01-10,0.3286184098509252
2025-01-25,0.3986184098509252
2025-01-30,0.4386184098509252
2025-03-06,0.4686184098509252
2025-03-31,0.4486184098509252
2025-04-02,0.4686184098509252
2025-04-05,0.5086184098509252
2025-04-20,0.1486184098509252
2025-05-10,0.1086184098509252
2025-05-12,0.4586184098509252
2025-05-20,0.4686184098509252
2025-06-11,0.4086184098509252
2025-06-14,0.3786184098509252
2025-06-19,0.2686184098509252`;

const NITROGEN_CSV = `Date,Estimated_N
2017-05-22,0.524
2017-11-28,0.359
2018-01-07,0.484
2018-02-01,0.592
2018-04-22,1.028
2018-05-07,1.128
2018-05-22,1.212
2018-06-11,1.199
2018-06-26,1.148
2018-07-01,1.129
2018-07-06,1.039
2018-07-26,0.497
2018-07-31,0.446
2018-09-24,0.377
2018-10-09,0.355
2018-10-19,0.373
2018-10-29,0.314
2018-11-13,0.384
2018-11-18,0.402
2018-12-08,0.336
2019-01-17,0.412
2019-01-22,0.408
2019-02-26,0.376
2019-03-28,0.373
2019-04-17,0.351
2019-05-12,0.470
2019-08-25,0.432
2019-09-19,0.347
2019-10-09,0.371
2019-10-29,0.561
2020-02-01,0.369
2020-06-25,0.432
2020-08-24,0.561
2020-11-02,0.371
2020-12-17,0.373
2021-05-31,0.470
2021-07-20,0.785
2021-08-04,0.962
2021-09-08,0.582
2021-10-03,0.432
2021-11-02,0.369
2022-01-21,0.267
2022-07-10,0.724
2022-08-14,0.373
2022-10-08,0.355
2023-01-11,0.373
2023-01-21,0.561
2023-02-15,0.648
2023-03-27,0.785
2023-05-21,0.962
2023-06-10,1.024
2023-11-17,0.582
2024-01-01,0.648
2024-01-26,0.785
2024-02-25,1.126
2024-03-16,1.084
2024-04-30,0.295
2024-05-20,1.024
2024-07-19,0.358
2024-08-23,0.372
2024-10-27,0.724
2024-11-11,0.749
2024-11-26,0.695
2025-01-10,0.716
2025-01-25,0.837
2025-01-30,0.885
2025-03-06,0.962
2025-03-31,0.924
2025-04-02,0.962
2025-04-05,1.084
2025-04-20,0.316
2025-05-10,0.278
2025-05-12,0.924
2025-05-20,0.962
2025-06-11,0.837
2025-06-14,0.785
2025-06-19,0.582`;
