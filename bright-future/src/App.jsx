import { useState } from 'react'
import reactLogo from './assets/react.svg'
import Sunlight from './assets/Images/Sunlight.jpg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  const [countryAndCity, setCountryAndCity] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  return (
    
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <img src={Sunlight} alt="Sunlight"/>
      {/* Title with subtext */}
      <h1 style={{ marginBottom: "5px" }}>Bright Future</h1>
      <p style={{ marginTop: 0, color: "gray", fontSize: "14px" }}>
        Helping you plan your outdoor activities with confidence using NASA's weather data to predict the best times for clear skies
      </p>

      {/* First textbox */}
      <input
        type="text"
        value={countryAndCity}
        onChange={(e) => setCountryAndCity(e.target.value)}
        placeholder="Location (City, Country)"
        style={{
          padding: "8px",
          marginRight: "10px",
          marginBottom: "10px",
          fontSize: "16px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      {/* Second textbox */}
      <input
        type="text"
        value={currentDate}
        onChange={(e) => setCurrentDate(e.target.value)}
        placeholder="Date (YYYY/MM/DD)"
        style={{
          padding: "8px",
          fontSize: "16px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      {/* Second button instead of textbox */}
      <button
      onClick={() => alert("button works")}
      style={{
      padding: "8px",
      fontSize: "16px",
      borderRadius: "6px",
      border: "1px solid #ccc",
      backgroundColor: "#5047cfff",
      cursor: "pointer",
      }}
      >
      Click For Weather
      </button>

      <p>
        The NASA weather data base will be searched for: <b>{countryAndCity} on {currentDate}</b>
      </p>
    </div>
  );  
}



export default App;
