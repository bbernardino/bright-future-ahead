import { useState } from 'react'
import Sunlight from './assets/Images/Sunlight.jpg'
import './App.css'

import { fetchData } from '../src/scrape.js';
import { getPValue } from '../src/spencer_1.js';
import { parseLocationInput, parseDateInput, geocodeCityCountry } from './geo_1.js'

function App() {
  const [countryAndCity, setCountryAndCity] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <img src={Sunlight} alt="Sunlight"/>
      <h1>Bright Future — geocoded test</h1>

      <input
        type="text"
        value={countryAndCity}
        onChange={(e) => setCountryAndCity(e.target.value)}
        placeholder="Location (City, Country)"
        style={{ padding: "8px", marginRight: "10px", marginBottom: "10px", fontSize: "16px" }}
      />

      <input
        type="text"
        value={currentDate}
        onChange={(e) => setCurrentDate(e.target.value)}
        placeholder="Date (MM/DD)"
        style={{ padding: "8px", fontSize: "16px" }}
      />

      <button
        onClick={async () => {
          try {
            const { city, country } = parseLocationInput(countryAndCity);
            const { month, day } = parseDateInput(currentDate);

            // Geocode
            const { latitude, longitude } = await geocodeCityCountry(city, country);

            const { temp, precip, years } = await fetchData(longitude, latitude);
            const pVal = await getPValue(precip, years, month, day);
            alert(`At ${city}, ${country} on ${month}/${day} probability of rain: ${pVal}`);
          } catch (err) {
            alert('Error: ' + (err && err.message ? err.message : String(err)));
          }
        }}
        style={{ padding: "8px", fontSize: "16px", marginLeft: "8px" }}
      >
        Click For Weather (geo)
      </button>

    </div>
  )
}

export default App;
